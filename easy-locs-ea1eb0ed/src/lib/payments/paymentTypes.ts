export type PaymentProvider = "stripe";
export type PaymentMethodType = "card" | "apple_pay" | "google_pay" | "wallet" | "cash";
export type PaymentIntentStatus =
  | "requires_payment_method"
  | "requires_confirmation"
  | "processing"
  | "requires_capture"
  | "succeeded"
  | "canceled"
  | "failed";

export interface CreateCheckoutPaymentInput {
  orderId: string;
  amount: number;
  currency: string;
  customerUserId: string;
  merchantId?: string | null;
  paymentMethodType: PaymentMethodType;
  successUrl?: string;
  cancelUrl?: string;
}

export interface CapturePaymentInput {
  paymentIntentId: string;
  orderId: string;
  amount?: number;
}

export interface RefundPaymentInput {
  paymentIntentId: string;
  orderId: string;
  amount?: number;
  reason?: string;
}
