export interface OtpDispatchResult {
  sent: boolean;
  providerRef?: string;
  error?: string;
}

export interface OtpChannelAdapter {
  readonly name: string;
  send(params: { phoneE164: string; code: string; settings: Record<string, unknown> }): Promise<OtpDispatchResult>;
}
