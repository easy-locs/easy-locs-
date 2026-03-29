/**
 * listing-contact.repository — DB operations for ListingContactButtons.
 */
import { supabase } from "@/integrations/supabase/client";

export async function trackContactClick(channel: string, opts: { listingId?: string | null; serviceId?: string | null; orgId?: string | null }) {
  supabase.from("contact_clicks" as any).insert({
    channel,
    listing_id: opts.listingId || null,
    service_id: opts.serviceId || null,
    org_id: opts.orgId || null,
    referrer: typeof document !== "undefined" ? document.referrer?.slice(0, 500) : null,
  } as any).then(() => {});
}

export async function checkInquiryQuota(userId: string) {
  const { data } = await supabase.rpc("check_inquiry_quota", { _user_id: userId }) as { data: any };
  return data;
}

export async function secureRevealContact(revealType: string, opts: {
  orgId?: string | null; listingId?: string | null; serviceId?: string | null; source?: string;
}): Promise<{ value: string | null; remaining: number }> {
  const { data, error } = await supabase.functions.invoke("reveal-contact", {
    body: {
      reveal_type: revealType,
      org_id: opts.orgId || null,
      listing_id: opts.listingId || null,
      service_id: opts.serviceId || null,
      source: opts.source || "real_estate",
    },
  });
  if (error) throw error;
  if (data?.error) {
    if (data.error === "Daily reveal limit reached") {
      throw new Error(`Daily limit reached (${data.limit}/day). Try again tomorrow.`);
    }
    throw new Error(data.error);
  }
  return { value: data?.[revealType] || null, remaining: data?.remaining ?? 0 };
}

export async function findExistingConversation(contextId: string) {
  const db = supabase as any;
  const { data } = await db.from("conversations_v2").select("id")
    .eq("listing_id", contextId || "").eq("type", "inquiry").limit(1).maybeSingle();
  return data?.id || null;
}

export async function resolveOrbitId(userId: string): Promise<string> {
  const db = supabase as any;
  try {
    const { data } = await db.from("orbit_profiles_v2").select("orbit_id").eq("id", userId).maybeSingle();
    return data?.orbit_id || `orbit_${userId.slice(0, 12)}`;
  } catch { return `orbit_${userId.slice(0, 12)}`; }
}

export async function fetchOrgOwner(orgId: string) {
  const { data } = await supabase.from("orgs").select("owner_user_id").eq("id", orgId).maybeSingle();
  return data;
}

export async function createV2Conversation(params: Record<string, any>) {
  const db = supabase as any;
  const { data, error } = await db.from("conversations_v2").insert(params).select("id").single();
  if (error) throw error;
  return data?.id || null;
}

export async function insertV2ChatMessage(params: Record<string, any>) {
  const { error } = await (supabase as any).from("chat_messages_v2").insert(params);
  if (error) throw error;
}

export async function updateV2ConversationPreview(convId: string, preview: string) {
  await (supabase as any).from("conversations_v2").update({
    last_message_at: new Date().toISOString(),
    last_message_preview: preview.slice(0, 120),
    updated_at: new Date().toISOString(),
  }).eq("id", convId);
}
