import { BadRequestException, HttpException, HttpStatus, Injectable } from '@nestjs/common';

class TooManyRequestsException extends HttpException {
  constructor(message: string) {
    super(message, HttpStatus.TOO_MANY_REQUESTS);
  }
}
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { randomInt } from 'node:crypto';
import { normalizePhone, OtpChannel, OtpPurpose } from '@utanstore/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { EncryptionService } from '../../common/crypto/encryption.service';
import { getRequestContext } from '../../common/context/request-context';
import { IntegrationsService } from '../integrations/integrations.service';
import { Msg91SmsChannel } from './channels/msg91-sms.channel';
import { MetaWhatsAppChannel } from './channels/meta-whatsapp.channel';
import type { Env } from '../../config/env.validation';

interface OtpConfig {
  ttlSeconds: number;
  maxRetries: number;
  resendDelaySeconds: number;
}

@Injectable()
export class OtpService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly integrations: IntegrationsService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService<Env, true>,
    private readonly sms: Msg91SmsChannel,
    private readonly whatsapp: MetaWhatsAppChannel,
  ) {}

  private tenantId(): string {
    const t = getRequestContext()?.tenantId;
    if (!t) throw new BadRequestException('No store context');
    return t;
  }

  private async loadConfig(tenantId: string): Promise<OtpConfig> {
    const s = await this.prisma.client.customerAuthSetting.findUnique({ where: { tenantId } });
    return {
      ttlSeconds: s?.otpTtlSeconds ?? this.config.get('OTP_TTL_SECONDS', { infer: true }),
      maxRetries: s?.otpMaxRetries ?? this.config.get('OTP_MAX_RETRIES', { infer: true }),
      resendDelaySeconds: s?.otpResendDelaySeconds ?? this.config.get('OTP_RESEND_DELAY_SECONDS', { infer: true }),
    };
  }

  private key(tenantId: string, purpose: OtpPurpose, digits: string): string {
    return `otp:${tenantId}:${purpose}:${digits}`;
  }

  /** Send an OTP over the store's configured channel with rate limiting. */
  async send(params: { phone: string; channel?: OtpChannel; purpose: OtpPurpose; ip?: string }): Promise<{ sent: boolean; channel: OtpChannel; expiresIn: number }> {
    const tenantId = this.tenantId();
    const { digits, e164, valid } = normalizePhone(params.phone);
    if (!valid) throw new BadRequestException('Invalid phone number');

    const cfg = await this.loadConfig(tenantId);

    // Resend delay (per phone/purpose).
    const resendKey = `otp:resend:${tenantId}:${params.purpose}:${digits}`;
    if (await this.redis.get(resendKey)) {
      throw new TooManyRequestsException('Please wait before requesting another code');
    }
    // Hourly cap (abuse protection, per phone).
    const capKey = `otp:cap:${tenantId}:${digits}`;
    const count = await this.redis.incrWithTtl(capKey, 3600);
    if (count > 10) throw new TooManyRequestsException('Too many OTP requests. Try again later.');

    // Resolve channel: explicit → SMS/WhatsApp settings availability → default SMS.
    const channel = await this.resolveChannel(tenantId, params.channel);
    const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
    const codeHash = EncryptionService.sha256(code);

    // Store hashed OTP in Redis with TTL + a fresh attempts counter.
    await this.redis.cacheJson(this.key(tenantId, params.purpose, digits), { codeHash, attempts: 0 }, cfg.ttlSeconds);
    await this.redis.setEx(resendKey, '1', cfg.resendDelaySeconds);

    // Audit record (hashed only).
    await this.prisma.client.oTPVerification.create({
      data: {
        tenantId,
        phone: digits,
        channel: channel,
        purpose: params.purpose,
        codeHash,
        status: 'SENT',
        ip: params.ip,
        expiresAt: new Date(Date.now() + cfg.ttlSeconds * 1000),
      },
    }).catch(() => undefined);

    // Dispatch.
    const dispatch = await this.dispatch(tenantId, channel, e164, code);
    if (!dispatch.sent) {
      throw new BadRequestException(dispatch.error ?? 'Failed to send OTP');
    }
    return { sent: true, channel, expiresIn: cfg.ttlSeconds };
  }

  /** Verify an OTP and, on success, return a short-lived verification token. */
  async verify(params: { phone: string; code: string; purpose: OtpPurpose }): Promise<{ verified: boolean; otpToken: string }> {
    const tenantId = this.tenantId();
    const { digits } = normalizePhone(params.phone);
    const cfg = await this.loadConfig(tenantId);
    const redisKey = this.key(tenantId, params.purpose, digits);

    const stored = await this.redis.getJson<{ codeHash: string; attempts: number }>(redisKey);
    if (!stored) throw new BadRequestException('Code expired or not found. Request a new one.');

    if (stored.attempts >= cfg.maxRetries) {
      await this.redis.del(redisKey);
      throw new TooManyRequestsException('Too many attempts. Request a new code.');
    }

    const ok = EncryptionService.safeEqual(EncryptionService.sha256(params.code), stored.codeHash);
    if (!ok) {
      stored.attempts += 1;
      await this.redis.cacheJson(redisKey, stored, cfg.ttlSeconds);
      throw new BadRequestException('Incorrect code');
    }

    await this.redis.del(redisKey);
    await this.prisma.client.oTPVerification
      .updateMany({ where: { phone: digits, purpose: params.purpose, status: 'SENT' }, data: { status: 'VERIFIED', verifiedAt: new Date() } })
      .catch(() => undefined);

    const otpToken = await this.jwt.signAsync(
      { phone: digits, purpose: params.purpose, tenantId, type: 'otp' },
      { secret: this.config.get('JWT_ACCESS_SECRET', { infer: true }), expiresIn: 900 },
    );
    return { verified: true, otpToken };
  }

  /** Validate an OTP token issued by verify() (used by checkout). */
  async validateToken(token: string, phone: string, purpose: OtpPurpose): Promise<boolean> {
    try {
      const payload = await this.jwt.verifyAsync<{ phone: string; purpose: string; tenantId: string; type: string }>(token, {
        secret: this.config.get('JWT_ACCESS_SECRET', { infer: true }),
      });
      const { digits } = normalizePhone(phone);
      return payload.type === 'otp' && payload.phone === digits && payload.purpose === purpose && payload.tenantId === this.tenantId();
    } catch {
      return false;
    }
  }

  private async resolveChannel(tenantId: string, requested?: OtpChannel): Promise<OtpChannel> {
    if (requested) return requested;
    const wa = await this.integrations.resolveWhatsApp(tenantId);
    if (wa) return OtpChannel.WHATSAPP;
    return OtpChannel.SMS;
  }

  private async dispatch(tenantId: string, channel: OtpChannel, phoneE164: string, code: string) {
    if (channel === OtpChannel.WHATSAPP) {
      const settings = await this.integrations.resolveWhatsApp(tenantId);
      return this.whatsapp.send({ phoneE164, code, settings: (settings ?? { mode: 'TEST' }) as Record<string, unknown> });
    }
    const settings = await this.integrations.resolveSms(tenantId);
    return this.sms.send({ phoneE164, code, settings: (settings ?? { mode: 'TEST' }) as Record<string, unknown> });
  }
}
