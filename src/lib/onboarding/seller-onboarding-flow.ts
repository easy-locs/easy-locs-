/**
 * seller-onboarding-flow — Stub for seller onboarding draft creation.
 */
import { supabase } from "@/integrations/supabase/client";

export async function createOnboardingDraft(userId: string): Promise<string> {
  const { data, error } = await (supabase as any)
    .from("storefront_pages")
    .insert({ user_id: userId, business_name: "New Business", status: "draft" })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}
