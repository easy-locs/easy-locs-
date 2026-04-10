/**
 * seller-onboarding-flow — Stub for seller onboarding draft creation.
 */
import { db } from "@/services/db";

export async function createOnboardingDraft(userId: string | { userId: string }): Promise<string> {
  const uid = typeof userId === "string" ? userId : userId.userId;
  const { data, error } = await db
    .from("storefront_pages")
    .insert({ user_id: uid, name: "New Business", slug: `shop-${uid.slice(0, 8)}`, entity_type: "fixed_store", org_id: uid })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}
