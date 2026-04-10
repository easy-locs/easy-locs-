export interface CreateCheckoutSessionInput {
  successUrl: string;
  cancelUrl: string;
  lineItems: Array<{
    name: string;
    amount: number; // minor units
    currency: string;
    quantity: number;
  }>;
  metadata?: Record<string, string>;
}
