/**
 * createCheckoutSession — DEPRECATED. Redirects to canonical create-stripe-intent.
 * All payment flows now use PaymentIntents via create-stripe-intent.
 * Kept as adapter for existing callers during migration.
 */
import { supabase } from "@/integrations/supabase/client";
import type { CreateCheckoutSessionInput } from "@/lib/types/stripe";

export async function createCheckoutSession(input: CreateCheckoutSessionInput): Promise<string> {
  // Canonical path: create-stripe-intent (PaymentIntent, not Checkout Session)
  const firstItem = input.lineItems[0];
  if (!firstItem) throw new Error("No line items provided");

  const { data, error } = await supabase.functions.invoke("create-stripe-intent", {
    body: {
      amount: firstItem.amount / 100, // create-stripe-intent expects major units
      currency: firstItem.currency,
      metadata: {
        ...input.metadata,
        item_name: firstItem.name,
        legacy_checkout_redirect: "true",
      },
    },
  });

  if (error) throw error;
  if (!data?.clientSecret) throw new Error("No client secret returned");

  // Return a Stripe-hosted payment URL using the client secret
  // Callers that used window.location.href will now need to use Stripe Elements
  // For backward compatibility, return a pseudo-URL that the caller can detect
  return `stripe-intent://${data.paymentIntentId}?client_secret=${data.clientSecret}`;
}
