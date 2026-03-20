import { supabase } from "@/integrations/supabase/client";
import type { CreateCheckoutSessionInput } from "@/lib/types/stripe";

export async function createCheckoutSession(input: CreateCheckoutSessionInput): Promise<string> {
  const { data, error } = await supabase.functions.invoke("create-checkout-session", {
    body: input,
  });

  if (error) throw error;
  return data.url as string;
}
