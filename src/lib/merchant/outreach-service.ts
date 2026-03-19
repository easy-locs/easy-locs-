/**
 * Merchant outreach tracking service.
 * Creates campaigns, generates activation links, and tracks funnel metrics.
 */
import { supabase } from "@/integrations/supabase/client";

export interface OutreachRecord {
  id: string;
  merchant_profile_id: string;
  channel: string;
  activation_token: string;
  activation_link: string | null;
  sent_at: string | null;
  delivered_at: string | null;
  opened_at: string | null;
  clicked_at: string | null;
  claimed_at: string | null;
  activated_at: string | null;
  status: string;
  created_at: string;
}

export interface OutreachMetrics {
  total: number;
  sent: number;
  delivered: number;
  opened: number;
  clicked: number;
  claimed: number;
  activated: number;
}

/** Create an outreach campaign for a merchant */
export async function createOutreachCampaign(params: {
  merchantProfileId: string;
  channel: "whatsapp" | "sms" | "email";
}) {
  const { data, error } = await (supabase as any)
    .from("merchant_outreach_campaigns")
    .insert({
      merchant_profile_id: params.merchantProfileId,
      channel: params.channel,
      status: "pending",
    })
    .select("*")
    .single();

  if (error) throw error;

  // Generate activation link
  const baseUrl = window.location.origin;
  const link = `${baseUrl}/#/merchant/claim?token=${data.activation_token}`;

  await (supabase as any)
    .from("merchant_outreach_campaigns")
    .update({ activation_link: link })
    .eq("id", data.id);

  return { ...data, activation_link: link };
}

/** Bulk create outreach for multiple merchants */
export async function bulkCreateOutreach(params: {
  merchantProfileIds: string[];
  channel: "whatsapp" | "sms" | "email";
}) {
  const baseUrl = window.location.origin;
  const rows = params.merchantProfileIds.map((id) => ({
    merchant_profile_id: id,
    channel: params.channel,
    status: "pending",
  }));

  const { data, error } = await (supabase as any)
    .from("merchant_outreach_campaigns")
    .insert(rows)
    .select("*");

  if (error) throw error;

  // Update activation links
  for (const row of data ?? []) {
    const link = `${baseUrl}/#/merchant/claim?token=${row.activation_token}`;
    await (supabase as any)
      .from("merchant_outreach_campaigns")
      .update({ activation_link: link })
      .eq("id", row.id);
  }

  return data;
}

/** Mark outreach as sent */
export async function markOutreachSent(campaignId: string) {
  await (supabase as any)
    .from("merchant_outreach_campaigns")
    .update({ sent_at: new Date().toISOString(), status: "sent" })
    .eq("id", campaignId);
}

/** Track outreach event */
export async function trackOutreachEvent(token: string, event: "delivered" | "opened" | "clicked") {
  const field = `${event}_at`;
  await (supabase as any)
    .from("merchant_outreach_campaigns")
    .update({ [field]: new Date().toISOString() })
    .eq("activation_token", token);
}

/** Get funnel metrics for admin dashboard */
export async function getOutreachMetrics(): Promise<OutreachMetrics> {
  const { data, error } = await (supabase as any)
    .from("merchant_outreach_campaigns")
    .select("status, sent_at, delivered_at, opened_at, clicked_at, claimed_at, activated_at");

  if (error) throw error;
  const rows = data ?? [];

  return {
    total: rows.length,
    sent: rows.filter((r: any) => r.sent_at).length,
    delivered: rows.filter((r: any) => r.delivered_at).length,
    opened: rows.filter((r: any) => r.opened_at).length,
    clicked: rows.filter((r: any) => r.clicked_at).length,
    claimed: rows.filter((r: any) => r.claimed_at).length,
    activated: rows.filter((r: any) => r.activated_at).length,
  };
}

/** Get all outreach records with merchant details */
export async function getOutreachRecords() {
  const { data, error } = await (supabase as any)
    .from("merchant_outreach_campaigns")
    .select("*, merchant_onboarding_profiles(merchant_name, cuisine_type, area, phone, email)")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}
