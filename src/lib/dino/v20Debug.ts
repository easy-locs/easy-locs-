/**
 * V20 DEBUG PANEL — LIVE SYSTEM INSPECTOR
 * Debug all major engines in one place
 */
import { supabase } from "@/integrations/supabase/client";

export interface DebugSection {
  key: string;
  ok: boolean;
  count?: number;
  message: string;
  sample?: unknown;
  error?: string | null;
}

export interface DebugReport {
  generatedAt: string;
  overallOk: boolean;
  sections: DebugSection[];
}

function sectionOk(key: string, message: string, count?: number, sample?: unknown): DebugSection {
  return { key, ok: true, message, count, sample, error: null };
}

function sectionFail(key: string, message: string, error?: unknown): DebugSection {
  return {
    key,
    ok: false,
    message,
    error: error instanceof Error ? error.message : String(error ?? "Unknown error"),
  };
}

export async function debugUniversalIdentity(userId: string): Promise<DebugSection> {
  try {
    const [profileRes, serviceRes, driverRes, orgRes, orbitRes] = await Promise.all([
      supabase.from("user_profiles").select("id, full_name, avatar_url").eq("id", userId).maybeSingle(),
      supabase.from("service_profiles").select("id, user_id, profile_type").eq("user_id", userId),
      supabase.from("driver_profiles").select("id, user_id, service_mode").eq("user_id", userId),
      supabase.from("org_members").select("org_id, role").eq("user_id", userId),
      supabase.from("orbit_identity_profiles").select("user_id, public_handle").eq("user_id", userId).maybeSingle(),
    ]);

    if (profileRes.error) throw profileRes.error;
    if (serviceRes.error) throw serviceRes.error;
    if (driverRes.error) throw driverRes.error;
    if (orgRes.error) throw orgRes.error;
    if (orbitRes.error) throw orbitRes.error;

    return sectionOk("identity", "Universal identity sources loaded", 1, {
      profile: profileRes.data,
      services: serviceRes.data?.length ?? 0,
      drivers: driverRes.data?.length ?? 0,
      orgMemberships: orgRes.data?.length ?? 0,
      orbit: orbitRes.data,
    });
  } catch (error) {
    return sectionFail("identity", "Universal identity failed", error);
  }
}

export async function debugReputation(userId: string): Promise<DebugSection> {
  try {
    const [repRes, trustRes, ticketRes] = await Promise.all([
      supabase.from("universal_reputation_scores").select("*").eq("user_id", userId).maybeSingle(),
      supabase.from("storefront_trust_scores").select("*").limit(3),
      supabase.from("support_tickets").select("id, status, ticket_type", { count: "exact" }).eq("requester_user_id", userId),
    ]);

    if (repRes.error) throw repRes.error;
    if (trustRes.error) throw trustRes.error;
    if (ticketRes.error) throw ticketRes.error;

    return sectionOk("reputation", "Reputation sources loaded", ticketRes.count ?? 0, {
      universal: repRes.data,
      trustSamples: trustRes.data,
      ticketCount: ticketRes.count ?? 0,
    });
  } catch (error) {
    return sectionFail("reputation", "Reputation debug failed", error);
  }
}

export async function debugRecommendations(userId: string): Promise<DebugSection> {
  try {
    const { data, error, count } = await supabase
      .from("recommendation_signals")
      .select("id, signal_type, service_vertical, weight, created_at", { count: "exact" })
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(10);

    if (error) throw error;
    return sectionOk("recommendations", "Recommendation signals loaded", count ?? 0, data);
  } catch (error) {
    return sectionFail("recommendations", "Recommendation debug failed", error);
  }
}

export async function debugJourneys(userId: string): Promise<DebugSection> {
  try {
    const { data, error, count } = await supabase
      .from("cross_service_journeys")
      .select("*", { count: "exact" })
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(10);

    if (error) throw error;
    return sectionOk("journeys", "Cross-service journeys loaded", count ?? 0, data?.[0] ?? null);
  } catch (error) {
    return sectionFail("journeys", "Journey debug failed", error);
  }
}

export async function debugWallet(userId: string): Promise<DebugSection> {
  try {
    const [walletRes, ledgerRes, splitRes] = await Promise.all([
      supabase.from("wallet_accounts").select("id, owner_user_id, balance, currency, account_type").eq("owner_user_id", userId),
      supabase.from("wallet_ledger_entries").select("id, amount, currency, direction, entry_type, created_at").order("created_at", { ascending: false }).limit(10),
      supabase.from("wallet_order_splits").select("id, order_id, split_party_type, gross_amount, net_amount, split_status").order("created_at", { ascending: false }).limit(10),
    ]);

    if (walletRes.error) throw walletRes.error;
    if (ledgerRes.error) throw ledgerRes.error;
    if (splitRes.error) throw splitRes.error;

    const totalBalance = (walletRes.data ?? []).reduce((sum, row) => sum + Number(row.balance ?? 0), 0);

    return sectionOk("wallet", "Wallet system loaded", walletRes.data?.length ?? 0, {
      accounts: walletRes.data,
      totalBalance,
      recentLedger: ledgerRes.data,
      recentSplits: splitRes.data,
    });
  } catch (error) {
    return sectionFail("wallet", "Wallet debug failed", error);
  }
}

export async function debugGrowth(): Promise<DebugSection> {
  try {
    const [churnRes, abandonedRes, notifRes, referralRes] = await Promise.all([
      supabase.from("churn_risk_profiles").select("entity_id, risk_band, churn_score").eq("entity_type", "user").limit(20),
      supabase.from("abandoned_cart_events").select("id, customer_user_id, status, subtotal").eq("status", "abandoned").limit(20),
      supabase.from("dino_notifications").select("id, actor_type, channel, template_key, status, created_at").order("created_at", { ascending: false }).limit(20),
      supabase.from("referrals").select("id, referral_code, converted_at").limit(20),
    ]);

    if (churnRes.error) throw churnRes.error;
    if (abandonedRes.error) throw abandonedRes.error;
    if (notifRes.error) throw notifRes.error;
    if (referralRes.error) throw referralRes.error;

    return sectionOk("growth", "Growth engine sources loaded", notifRes.data?.length ?? 0, {
      churnProfiles: churnRes.data?.length ?? 0,
      abandonedCarts: abandonedRes.data?.length ?? 0,
      notifications: notifRes.data?.length ?? 0,
      referrals: referralRes.data?.length ?? 0,
    });
  } catch (error) {
    return sectionFail("growth", "Growth debug failed", error);
  }
}

export async function debugGlobal(): Promise<DebugSection> {
  try {
    const [marketRes, expansionRes, driverRes] = await Promise.all([
      supabase.from("dino_market_balance").select("category_name, location_key, demand_signal, listing_count, avg_quality").order("demand_signal", { ascending: false }).limit(20),
      supabase.from("dino_expansion_opportunities").select("*").order("created_at", { ascending: false }).limit(20),
      supabase.from("driver_profiles").select("id, user_id, city, is_online, is_available, current_status").limit(20),
    ]);

    if (marketRes.error) throw marketRes.error;
    if (expansionRes.error) throw expansionRes.error;
    if (driverRes.error) throw driverRes.error;

    return sectionOk("global", "Global expansion sources loaded", marketRes.data?.length ?? 0, {
      marketBalance: marketRes.data,
      expansionOps: expansionRes.data,
      drivers: driverRes.data?.length ?? 0,
    });
  } catch (error) {
    return sectionFail("global", "Global debug failed", error);
  }
}

export async function debugPartner(): Promise<DebugSection> {
  try {
    const [proPerfRes, boostRes] = await Promise.all([
      supabase.from("dino_pro_performance").select("pro_id, overall_score, tier, completion_rate, conversion_rate").order("overall_score", { ascending: false }).limit(20),
      supabase.from("dino_visibility_overrides").select("entity_id, entity_type, boost_multiplier, reason, expires_at").order("created_at", { ascending: false }).limit(20),
    ]);

    if (proPerfRes.error) throw proPerfRes.error;
    if (boostRes.error) throw boostRes.error;

    return sectionOk("partner", "Partner engine loaded", proPerfRes.data?.length ?? 0, {
      topPros: proPerfRes.data,
      activeBoosts: boostRes.data,
    });
  } catch (error) {
    return sectionFail("partner", "Partner debug failed", error);
  }
}

export async function debugCEO(): Promise<DebugSection> {
  try {
    const { data, error } = await supabase
      .from("dino_learning_events")
      .select("event_type, entity_id, entity_type, metric, new_value, created_at")
      .in("event_type", [
        "v19_ceo_decision", "v18_partner_cycle", "v17_global_cycle",
        "v16_growth_cycle", "god_mode_cycle", "god_mode_batch",
      ])
      .order("created_at", { ascending: false })
      .limit(30);

    if (error) throw error;
    return sectionOk("ceo", "CEO / God mode logs loaded", data?.length ?? 0, data);
  } catch (error) {
    return sectionFail("ceo", "CEO debug failed", error);
  }
}

export async function debugOrdersDeliveryEscrow(): Promise<DebugSection> {
  try {
    const [orderRes, ledgerRes, driverJobsRes, ticketRes] = await Promise.all([
      supabase.from("orders").select("id, status, customer_user_id, driver_id, created_at").order("created_at", { ascending: false }).limit(20),
      supabase.from("wallet_ledger_entries").select("id, entry_type, reference_id, reference_type, amount, direction, created_at").in("entry_type", ["escrow_hold", "escrow_release", "order_payment", "order_revenue"]).order("created_at", { ascending: false }).limit(30),
      supabase.from("dino_learning_events").select("event_type, entity_id, metadata_json, new_value, created_at").eq("event_type", "delivery_assigned").order("created_at", { ascending: false }).limit(20),
      supabase.from("support_tickets").select("id, status, ticket_type, created_at").in("ticket_type", ["dispute", "delivery_problem", "order_issue"]).order("created_at", { ascending: false }).limit(20),
    ]);

    if (orderRes.error) throw orderRes.error;
    if (ledgerRes.error) throw ledgerRes.error;
    if (driverJobsRes.error) throw driverJobsRes.error;
    if (ticketRes.error) throw ticketRes.error;

    return sectionOk("orders_delivery_escrow", "Orders / delivery / escrow sources loaded", orderRes.data?.length ?? 0, {
      orders: orderRes.data,
      ledger: ledgerRes.data,
      deliveryAssignments: driverJobsRes.data,
      disputes: ticketRes.data,
    });
  } catch (error) {
    return sectionFail("orders_delivery_escrow", "Orders / delivery / escrow debug failed", error);
  }
}

export async function runV20Debug(userId: string): Promise<DebugReport> {
  const sections = await Promise.all([
    debugUniversalIdentity(userId),
    debugReputation(userId),
    debugRecommendations(userId),
    debugJourneys(userId),
    debugWallet(userId),
    debugGrowth(),
    debugGlobal(),
    debugPartner(),
    debugCEO(),
    debugOrdersDeliveryEscrow(),
  ]);

  return {
    generatedAt: new Date().toISOString(),
    overallOk: sections.every((s) => s.ok),
    sections,
  };
}

export function printV20DebugReport(report: DebugReport) {
  console.group(`V20 DEBUG REPORT — ${report.generatedAt}`);
  console.log("overallOk:", report.overallOk);
  for (const section of report.sections) {
    if (section.ok) {
      console.log(`✅ [${section.key}] ${section.message}`, { count: section.count, sample: section.sample });
    } else {
      console.error(`❌ [${section.key}] ${section.message}`, { error: section.error });
    }
  }
  console.groupEnd();
}
