/**
 * storefrontCheckoutService — Frontend service for backend-validated storefront checkout.
 * Calls create-storefront-checkout edge function instead of inserting directly.
 */
import { db as supabase } from "@/services/db";

export interface StorefrontCheckoutInput {
  shopId: string;
  items: Array<{
    itemId: string;
    quantity: number;
    notes?: string;
  }>;
  fulfillmentType?: "delivery" | "pickup" | "dine_in";
  deliveryAddress?: string;
  deliveryLat?: number;
  deliveryLng?: number;
  notes?: string;
  idempotencyKey?: string;
  tableCode?: string;
}

export interface StorefrontCheckoutResult {
  orderId: string;
  checkoutUrl: string | null;
  alreadyExists?: boolean;
}

/**
 * Create a backend-validated storefront order + Stripe checkout session.
 * Returns the order ID and Stripe checkout URL for redirect.
 */
export async function createStorefrontCheckout(
  input: StorefrontCheckoutInput
): Promise<StorefrontCheckoutResult> {
  const { data, error } = await supabase.functions.invoke("create-storefront-checkout", {
    body: input,
  });

  if (error) throw new Error(error.message || "Checkout failed");
  if (data?.error) throw new Error(data.error);

  return {
    orderId: data.orderId,
    checkoutUrl: data.checkoutUrl || null,
    alreadyExists: data.alreadyExists || false,
  };
}
