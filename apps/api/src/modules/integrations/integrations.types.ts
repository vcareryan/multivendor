import type { z } from 'zod';
import {
  googleAuthSettingsSchema,
  paymentSettingsSchema,
  smsProviderSettingsSchema,
  whatsappBusinessSettingsSchema,
} from '@utanstore/shared';

export type PaymentSettingsInput = z.infer<typeof paymentSettingsSchema>;
export type GoogleAuthSettingsInput = z.infer<typeof googleAuthSettingsSchema>;
export type WhatsAppBusinessSettingsInput = z.infer<typeof whatsappBusinessSettingsSchema>;
export type SmsProviderSettingsInput = z.infer<typeof smsProviderSettingsSchema>;
