import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
  timingSafeEqual,
} from 'node:crypto';
import type { Env } from '../../config/env.validation';

/**
 * Envelope encryption for tenant secrets (payment keys, OTP provider tokens,
 * Google client secrets, webhook secrets). Format stored in DB:
 *   v1:<ivB64>:<tagB64>:<cipherB64>
 * The master key comes from ENCRYPTION_KEY (32 bytes; hex64 or base64 or raw).
 */
@Injectable()
export class EncryptionService {
  private readonly key: Buffer;
  private static readonly ALGO = 'aes-256-gcm';

  constructor(config: ConfigService<Env, true>) {
    const raw = config.get('ENCRYPTION_KEY', { infer: true });
    this.key = EncryptionService.deriveKey(raw);
  }

  private static deriveKey(raw: string): Buffer {
    // Accept hex (64), base64, or arbitrary string (hashed to 32 bytes).
    if (/^[0-9a-fA-F]{64}$/.test(raw)) return Buffer.from(raw, 'hex');
    try {
      const b = Buffer.from(raw, 'base64');
      if (b.length === 32) return b;
    } catch {
      /* fall through */
    }
    return createHash('sha256').update(raw).digest();
  }

  encrypt(plain: string): string {
    const iv = randomBytes(12);
    const cipher = createCipheriv(EncryptionService.ALGO, this.key, iv);
    const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return `v1:${iv.toString('base64')}:${tag.toString('base64')}:${enc.toString('base64')}`;
  }

  decrypt(payload: string | null | undefined): string | null {
    if (!payload) return null;
    const parts = payload.split(':');
    if (parts.length !== 4 || parts[0] !== 'v1') return null;
    const [, ivB64, tagB64, dataB64] = parts;
    const decipher = createDecipheriv(EncryptionService.ALGO, this.key, Buffer.from(ivB64, 'base64'));
    decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
    const dec = Buffer.concat([decipher.update(Buffer.from(dataB64, 'base64')), decipher.final()]);
    return dec.toString('utf8');
  }

  /** Optionally encrypt: returns null for empty input (leaves value unchanged upstream). */
  encryptOptional(plain?: string | null): string | null {
    if (plain === undefined || plain === null || plain === '') return null;
    return this.encrypt(plain);
  }

  /** Mask a secret for safe display (last 4 chars). */
  static mask(plain?: string | null): string | null {
    if (!plain) return null;
    if (plain.length <= 4) return '••••';
    return `••••${plain.slice(-4)}`;
  }

  /** SHA-256 hex (used for OTP hashing + refresh-token hashing). */
  static sha256(value: string): string {
    return createHash('sha256').update(value).digest('hex');
  }

  /** Constant-time comparison of two hex/utf8 strings. */
  static safeEqual(a: string, b: string): boolean {
    const ab = Buffer.from(a);
    const bb = Buffer.from(b);
    if (ab.length !== bb.length) return false;
    return timingSafeEqual(ab, bb);
  }
}
