export interface GatewayCredentials {
  keyId: string | null;
  keySecret: string | null;
  webhookSecret: string | null;
  mode: string;
}

export interface CreatedGatewayOrder {
  providerOrderId: string;
  /** Params the client SDK needs to open checkout (public, non-secret). */
  clientParams: Record<string, unknown>;
}

export interface WebhookResult {
  providerOrderId: string | null;
  providerPaymentId: string | null;
  status: 'PAID' | 'FAILED' | 'REFUNDED' | 'IGNORED';
  raw: unknown;
}

export interface PaymentGateway {
  readonly provider: string;
  createOrder(params: {
    amountMinor: number;
    currency: string;
    orderNumber: string;
    credentials: GatewayCredentials;
  }): Promise<CreatedGatewayOrder>;
  verifyWebhook(params: {
    rawBody: Buffer | string;
    signature: string;
    credentials: GatewayCredentials;
  }): WebhookResult;
}
