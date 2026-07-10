import { Injectable, Logger } from '@nestjs/common';
import type { OtpChannelAdapter, OtpDispatchResult } from './otp-channel.interface';

/**
 * MSG91 SMS OTP adapter (India-first). Uses MSG91's OTP send endpoint.
 * In TEST mode (no live credentials) it logs the code instead of sending.
 */
@Injectable()
export class Msg91SmsChannel implements OtpChannelAdapter {
  readonly name = 'MSG91';
  private readonly logger = new Logger(Msg91SmsChannel.name);

  async send(params: { phoneE164: string; code: string; settings: Record<string, unknown> }): Promise<OtpDispatchResult> {
    const { apiKey, senderId, templateId, mode } = params.settings as {
      apiKey?: string;
      senderId?: string;
      templateId?: string;
      mode?: string;
    };

    if (mode !== 'LIVE' || !apiKey) {
      this.logger.warn(`[TEST] SMS OTP to ${params.phoneE164}: ${params.code}`);
      return { sent: true, providerRef: 'test-mode' };
    }

    const mobile = params.phoneE164.replace('+', '');
    const url = new URL('https://control.msg91.com/api/v5/otp');
    url.searchParams.set('mobile', mobile);
    url.searchParams.set('otp', params.code);
    if (templateId) url.searchParams.set('template_id', templateId);
    if (senderId) url.searchParams.set('sender', senderId);

    try {
      const res = await fetch(url.toString(), {
        method: 'POST',
        headers: { authkey: apiKey, 'Content-Type': 'application/json' },
      });
      const body = (await res.json().catch(() => ({}))) as { type?: string; request_id?: string; message?: string };
      if (!res.ok || body.type === 'error') {
        return { sent: false, error: body.message ?? `MSG91 HTTP ${res.status}` };
      }
      return { sent: true, providerRef: body.request_id };
    } catch (e) {
      return { sent: false, error: (e as Error).message };
    }
  }
}
