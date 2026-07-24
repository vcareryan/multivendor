import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import {
  CheckoutChannel,
  CheckoutMode,
  OtpPurpose,
  type CreateOrderInput,
} from '@utanstore/shared';
import { OrdersService } from '../orders/orders.service';
import { OtpService } from '../otp/otp.service';
import { StoresService } from '../stores/stores.service';
import { PaymentsService } from '../payments/payments.service';
import { CustomerAuthService } from '../customer-auth/customer-auth.service';

@Injectable()
export class CheckoutService {
  constructor(
    private readonly orders: OrdersService,
    private readonly otp: OtpService,
    private readonly stores: StoresService,
    private readonly payments: PaymentsService,
    private readonly customerAuth: CustomerAuthService,
  ) {}

  /** Price preview + which checkout channels the store allows. */
  async start(input: { channel: CheckoutChannel; items: { productId: string; variantId?: string | null; quantity: number; addonIds?: string[] }[]; couponCode?: string | null }) {
    const settings = await this.stores.getCheckoutSettings();
    this.assertChannelAllowed(settings.mode as CheckoutMode, input.channel);
    const quote = await this.orders.priceCart(input.items, { couponCode: input.couponCode });
    return {
      quote,
      settings,
    };
  }

  sendOtp(input: { phone: string; channel?: never; purpose?: OtpPurpose }, ip?: string) {
    return this.otp.send({ phone: input.phone, purpose: input.purpose ?? OtpPurpose.CHECKOUT, ip });
  }

  verifyOtp(input: { phone: string; code: string; purpose?: OtpPurpose }) {
    return this.otp.verify({ phone: input.phone, code: input.code, purpose: input.purpose ?? OtpPurpose.CHECKOUT });
  }

  /**
   * Create the order. Order is ALWAYS persisted before any redirect/payment.
   *  • WHATSAPP  → returns wa.me link.
   *  • PAY_NOW   → returns payment client params.
   * OTP is enforced ONLY when the store's "Require OTP before entering address"
   * setting is on — mirroring the admin toggle, regardless of channel.
   */
  async createOrder(input: CreateOrderInput) {
    const settings = await this.stores.getCheckoutSettings();
    this.assertChannelAllowed(settings.mode as CheckoutMode, input.channel);

    // When the store requires customer login, a valid customer session is
    // mandatory to place an order.
    if (settings.requireLogin) {
      const session = input.customerToken ? await this.customerAuth.validateSession(input.customerToken) : null;
      if (!session) throw new ForbiddenException('Please sign in to place your order');
    }

    const needsOtp = settings.requireOtpBeforeAddress;

    let phoneVerified = false;
    if (needsOtp) {
      if (!input.otpToken) throw new ForbiddenException('OTP verification required before placing this order');
      const ok = await this.otp.validateToken(input.otpToken, input.customerPhone, OtpPurpose.CHECKOUT);
      if (!ok) throw new ForbiddenException('Invalid or expired verification. Please verify your phone again.');
      phoneVerified = true;
    }

    if (input.channel === CheckoutChannel.PAY_NOW && !input.deliveryAddress) {
      throw new BadRequestException('Delivery address is required');
    }

    const { order, waLink } = await this.orders.createOrder(input, { phoneVerified });

    if (input.channel === CheckoutChannel.WHATSAPP) {
      return { order, channel: CheckoutChannel.WHATSAPP, waLink };
    }

    // PAY_NOW → initiate payment and return client params.
    const payment = await this.payments.initiate(order.id);
    return { order, channel: CheckoutChannel.PAY_NOW, payment };
  }

  private assertChannelAllowed(mode: CheckoutMode, channel: CheckoutChannel): void {
    if (mode === CheckoutMode.WHATSAPP_ONLY && channel !== CheckoutChannel.WHATSAPP) {
      throw new BadRequestException('This store only accepts WhatsApp orders');
    }
    if (mode === CheckoutMode.PAYMENT_ONLY && channel !== CheckoutChannel.PAY_NOW) {
      throw new BadRequestException('This store only accepts online payment');
    }
  }
}
