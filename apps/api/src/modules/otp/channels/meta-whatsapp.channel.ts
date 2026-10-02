import { Injectable, Logger } from '@nestjs/common';
import type { OtpChannelAdapter, OtpDispatchResult } from './otp-channel.interface';

/**
 * Meta WhatsApp Cloud API OTP adapter. Sends a templated authentication
 * message with the OTP as the body parameter. In TEST mode it logs the code.
 */
@Injectable()
export class MetaWhatsAppChannel implements OtpChannelAdapter {
  readonly name = 'META_CLOUD';
  private readonly logger = new Logger(MetaWhatsAppChannel.name);

  async send(params: { phoneE164: string; code: string; settings: Record<string, unknown> }): Promise<OtpDispatchResult> {
    const { apiToken, phoneNumberId, otpTemplateName, languageCode, mode } = params.settings as {
      apiToken?: string;
      phoneNumberId?: string;
      otpTemplateName?: string;
      languageCode?: string;
      mode?: string;
    };

    if (mode !== 'LIVE' || !apiToken || !phoneNumberId) {
      this.logger.warn(`[TEST] WhatsApp OTP to ${params.phoneE164}: ${params.code}`);
      return { sent: true, providerRef: 'test-mode' };
    }

    const to = params.phoneE164.replace('+', '');
    const payload = {
      messaging_product: 'whatsapp',
      to,
      type: 'template',
      template: {
        name: otpTemplateName ?? 'otp_verification',
        language: { code: languageCode ?? 'en' },
        components: [
          { type: 'body', parameters: [{ type: 'text', text: params.code }] },
          { type: 'button', sub_type: 'url', index: '0', parameters: [{ type: 'text', text: params.code }] },
        ],
      },
    };

    try {
      const res = await fetch(`https://graph.facebook.com/v20.0/${phoneNumberId}/messages`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const body = (await res.json().catch(() => ({}))) as { messages?: { id: string }[]; error?: { message: string } };
      if (!res.ok || body.error) {
        return { sent: false, error: body.error?.message ?? `Meta HTTP ${res.status}` };
      }
      return { sent: true, providerRef: body.messages?.[0]?.id };
    } catch (e) {
      return { sent: false, error: (e as Error).message };
    }
  }
}
