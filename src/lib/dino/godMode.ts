/**
 * DINO V20 — GOD MODE Orchestrator
 * Master loop: identity + wallet + reputation + recommendations + support + loyalty.
 * One brain, one system, one product.
 */
import { supabase } from "@/integrations/supabase/client";
import { resolveUniversalIdentity, type UniversalIdentity } from "./universalIdentity";
import { recomputeReputation, applyReputationEffects } from "./reputationEngine";
import { generateRecommendations, type Recommendation } from "./recommendationBrain";
import { getActiveJourneys } from "./crossServiceJourney";
import { getUserTickets } from "./supportHub";

export interface GodModeSnapshot {
  identity: UniversalIdentity;
  reputationScore: number;
  recommendations: Recommendation[];
  activeJourneys: any[];
  openTickets: number;
  walletSummary: {
    totalBalance: number;
    accountCount: number;
    currencies: string[];
  };
  loyaltySummary: {
    points: number;
    tier: string;
  };
  nextBestAction: Recommendation | null;
}

/** Build a full GOD MODE snapshot for Orbit Ultimate dashboard */
export async function buildGodModeSnapshot(userId: string): Promise<GodModeSnapshot> {
  // Parallel data gathering — maximum efficiency
  const [identity, walletRes, loyaltyRes, journeys, tickets] = await Promise.all([
    resolveUniversalIdentity(userId),
    supabase.from("wallet_accounts").select("balance, currency, account_type").eq("owner_user_id", userId),
    (supabase as any).from("loyalty_accounts").select("points_balance, tier").eq("user_id", userId).maybeSingle(),
    getActiveJourneys(userId),
    getUserTickets(userId),
  ]);

  // Reputation (may need recompute)
  const repData = await recomputeReputation(userId);
  const reputationScore = repData?.overall_score ?? 50;

  // Apply effects (boost/alert based on score)
  await applyReputationEffects(userId, reputationScore);

  // Recommendations
  const recommendations = await generateRecommendations(userId);

  // Wallet summary
  const walletAccounts = walletRes.data ?? [];
  const walletSummary = {
    totalBalance: walletAccounts.reduce((s: number, a: any) => s + Number(a.balance ?? 0), 0),
    accountCount: walletAccounts.length,
    currencies: [...new Set(walletAccounts.map((a: any) => a.currency))],
  };

  // Loyalty summary
  const loyaltySummary = {
    points: loyaltyRes?.data?.points_balance ?? 0,
    tier: loyaltyRes?.data?.tier ?? "bronze",
  };

  // Open tickets
  const openTickets = (tickets ?? []).filter((t: any) => t.status === "open" || t.status === "pending").length;

  // Next best action — highest priority recommendation
  const nextBestAction = recommendations.length > 0 ? recommendations[0] : null;

  return {
    identity,
    reputationScore,
    recommendations,
    activeJourneys: journeys,
    openTickets,
    walletSummary,
    loyaltySummary,
    nextBestAction,
  };
}

/** Run the full V20 GOD MODE cycle for a user */
export async function runGodModeCycle(userId: string) {
  const snapshot = await buildGodModeSnapshot(userId);

  // Log the cycle
  await (supabase as any).from("dino_learning_events").insert({
    event_type: "god_mode_cycle",
    entity_id: userId,
    entity_type: "user",
    metric: "reputation",
    new_value: snapshot.reputationScore,
    previous_value: 0,
    metadata_json: {
      roles: snapshot.identity.roles,
      walletBalance: snapshot.walletSummary.totalBalance,
      loyaltyTier: snapshot.loyaltySummary.tier,
      openTickets: snapshot.openTickets,
      activeJourneys: snapshot.activeJourneys.length,
      recommendationCount: snapshot.recommendations.length,
    },
  });

  return snapshot;
}

/** Batch GOD MODE cycle for multiple users (system-level) */
export async function runGodModeBatch(limit = 50) {
  const { data: users } = await supabase
    .from("user_profiles")
    .select("id")
    .limit(limit);

  const results = [];
  for (const u of users ?? []) {
    try {
      const snapshot = await runGodModeCycle(u.id);
      results.push({ userId: u.id, score: snapshot.reputationScore, ok: true });
    } catch {
      results.push({ userId: u.id, ok: false });
    }
  }

  // Log batch run
  await (supabase as any).from("dino_learning_events").insert({
    event_type: "god_mode_batch",
    entity_id: "system",
    entity_type: "platform",
    metric: "users_processed",
    new_value: results.filter(r => r.ok).length,
    previous_value: 0,
  });

  return results;
}
