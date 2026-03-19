/**
 * V21 — AUTO-FIX ENGINE
 * Detect → classify → patch → verify → log
 */
import { supabase } from "@/integrations/supabase/client";
import { runV20Debug } from "@/lib/dino/v20Debug";
import type { Json } from "@/integrations/supabase/types";

export type AutoFixSeverity = "low" | "medium" | "high" | "critical";
export type AutoFixStatus = "detected" | "patched" | "verified" | "failed" | "skipped";

export interface AutoFixIssue {
  id: string;
  section: string;
  severity: AutoFixSeverity;
  kind:
    | "missing_profile_name"
    | "missing_reputation_row"
    | "missing_recommendation_signals"
    | "missing_loyalty_account"
    | "missing_driver_profile"
    | "stale_visibility_override"
    | "missing_wallet_account"
    | "empty_journey_state"
    | "orphan_notification"
    | "unknown";
  message: string;
  userId?: string;
  meta?: Record<string, unknown>;
}

export interface AutoFixResult {
  issueId: string;
  status: AutoFixStatus;
  action: string;
  details?: string;
}

function uid() { return crypto.randomUUID(); }
function nowIso() { return new Date().toISOString(); }

// =============================
// 1) ISSUE DETECTION
// =============================

export async function detectAutoFixIssues(userId: string): Promise<AutoFixIssue[]> {
  const report = await runV20Debug(userId);
  const issues: AutoFixIssue[] = [];

  for (const section of report.sections) {
    if (section.ok) continue;

    const kindMap: Record<string, AutoFixIssue["kind"]> = {
      identity: "missing_profile_name",
      reputation: "missing_reputation_row",
      recommendations: "missing_recommendation_signals",
      journeys: "empty_journey_state",
      wallet: "missing_wallet_account",
      global: "missing_driver_profile",
    };

    const kind = kindMap[section.key];
    if (kind) {
      issues.push({
        id: uid(),
        section: section.key,
        severity: section.key === "wallet" ? "critical" : section.key === "identity" || section.key === "reputation" ? "high" : "medium",
        kind,
        message: section.error ?? section.message,
        userId,
      });
    }
  }

  // Stale boost cleanup
  const { data: staleBoosts } = await supabase
    .from("dino_visibility_overrides")
    .select("id, expires_at")
    .lt("expires_at", nowIso())
    .limit(100);

  for (const stale of staleBoosts ?? []) {
    issues.push({
      id: uid(),
      section: "partner",
      severity: "low",
      kind: "stale_visibility_override",
      message: "Expired visibility override should be removed",
      meta: { overrideId: stale.id },
    });
  }

  return issues;
}

// =============================
// 2) FIXERS
// =============================

async function fixMissingProfileName(userId: string): Promise<AutoFixResult> {
  const { data: profile, error } = await supabase
    .from("user_profiles").select("id, full_name").eq("id", userId).maybeSingle();

  if (error) return { issueId: uid(), status: "failed", action: "fixMissingProfileName", details: error.message };
  if (!profile) return { issueId: uid(), status: "skipped", action: "fixMissingProfileName", details: "user_profiles row not found" };
  if (profile.full_name && profile.full_name.trim().length > 0) return { issueId: uid(), status: "verified", action: "fixMissingProfileName", details: "Profile already valid" };

  const fallbackName = `User ${userId.slice(0, 6)}`;
  const { error: updateError } = await supabase.from("user_profiles").update({ full_name: fallbackName }).eq("id", userId);
  if (updateError) return { issueId: uid(), status: "failed", action: "fixMissingProfileName", details: updateError.message };

  return { issueId: uid(), status: "patched", action: "fixMissingProfileName", details: `Filled missing full_name with "${fallbackName}"` };
}

async function fixMissingReputationRow(userId: string): Promise<AutoFixResult> {
  const { error } = await supabase.from("universal_reputation_scores").upsert({
    user_id: userId,
    overall_score: 50,
    fulfillment_quality: 70,
    dispute_rate: 0,
    response_speed: 70,
    consistency: 70,
    feedback_score: 60,
    total_interactions: 0,
    last_computed_at: nowIso(),
    updated_at: nowIso(),
  }, { onConflict: "user_id" });

  if (error) return { issueId: uid(), status: "failed", action: "fixMissingReputationRow", details: error.message };
  return { issueId: uid(), status: "patched", action: "fixMissingReputationRow", details: "Created default reputation row" };
}

async function fixMissingRecommendationSignals(userId: string): Promise<AutoFixResult> {
  const { error } = await supabase.from("recommendation_signals").insert([
    { user_id: userId, signal_type: "view", service_vertical: "food", weight: 1 },
    { user_id: userId, signal_type: "view", service_vertical: "services", weight: 1 },
  ]);

  if (error) return { issueId: uid(), status: "failed", action: "fixMissingRecommendationSignals", details: error.message };
  return { issueId: uid(), status: "patched", action: "fixMissingRecommendationSignals", details: "Seeded recommendation signals" };
}

async function fixMissingWalletAccount(userId: string): Promise<AutoFixResult> {
  const { data: existing } = await supabase.from("wallet_accounts").select("id").eq("owner_user_id", userId).limit(1);
  if (existing && existing.length > 0) return { issueId: uid(), status: "verified", action: "fixMissingWalletAccount", details: "Wallet already exists" };

  const { error } = await supabase.from("wallet_accounts").insert({
    owner_user_id: userId,
    account_type: "personal",
    currency: "AED",
    balance: 0,
    status: "active",
  });

  if (error) return { issueId: uid(), status: "failed", action: "fixMissingWalletAccount", details: error.message };
  return { issueId: uid(), status: "patched", action: "fixMissingWalletAccount", details: "Created default wallet account" };
}

async function fixMissingDriverProfile(userId: string): Promise<AutoFixResult> {
  const { data: existing } = await supabase.from("driver_profiles").select("id").eq("user_id", userId).maybeSingle();
  if (existing) return { issueId: uid(), status: "verified", action: "fixMissingDriverProfile", details: "Driver profile already exists" };

  const { error } = await supabase.from("driver_profiles").insert({
    user_id: userId,
    service_mode: "delivery",
    vehicle_type: "bike",
    current_status: "offline",
    is_online: false,
    is_available: false,
    is_verified: false,
  });

  if (error) return { issueId: uid(), status: "failed", action: "fixMissingDriverProfile", details: error.message };
  return { issueId: uid(), status: "patched", action: "fixMissingDriverProfile", details: "Created default driver profile" };
}

async function fixEmptyJourneyState(userId: string): Promise<AutoFixResult> {
  const defaultSteps = [
    { vertical: "food", action: "discover", status: "active" },
    { vertical: "food", action: "order", status: "pending" },
    { vertical: "send", action: "delivery", status: "pending" },
  ];

  const { error } = await supabase.from("cross_service_journeys").insert({
    user_id: userId,
    journey_type: "food_delivery",
    status: "active",
    steps: defaultSteps as unknown as Json,
    current_step: 0,
  });

  if (error) return { issueId: uid(), status: "failed", action: "fixEmptyJourneyState", details: error.message };
  return { issueId: uid(), status: "patched", action: "fixEmptyJourneyState", details: "Created default active journey" };
}

async function fixStaleVisibilityOverride(overrideId: string): Promise<AutoFixResult> {
  const { error } = await supabase.from("dino_visibility_overrides").delete().eq("id", overrideId);
  if (error) return { issueId: uid(), status: "failed", action: "fixStaleVisibilityOverride", details: error.message };
  return { issueId: uid(), status: "patched", action: "fixStaleVisibilityOverride", details: `Deleted stale override ${overrideId}` };
}

// =============================
// 3) EXECUTOR
// =============================

export async function executeAutoFix(issue: AutoFixIssue): Promise<AutoFixResult> {
  try {
    switch (issue.kind) {
      case "missing_profile_name": return await fixMissingProfileName(issue.userId!);
      case "missing_reputation_row": return await fixMissingReputationRow(issue.userId!);
      case "missing_recommendation_signals": return await fixMissingRecommendationSignals(issue.userId!);
      case "missing_wallet_account": return await fixMissingWalletAccount(issue.userId!);
      case "missing_driver_profile": return await fixMissingDriverProfile(issue.userId!);
      case "empty_journey_state": return await fixEmptyJourneyState(issue.userId!);
      case "stale_visibility_override": return await fixStaleVisibilityOverride(String(issue.meta?.overrideId));
      default: return { issueId: issue.id, status: "skipped", action: "unknown", details: "No fixer available" };
    }
  } catch (err) {
    return { issueId: issue.id, status: "failed", action: issue.kind, details: err instanceof Error ? err.message : String(err) };
  }
}

// =============================
// 4) MAIN LOOP
// =============================

export async function runV21AutoFix(userId: string) {
  const issues = await detectAutoFixIssues(userId);
  const results: AutoFixResult[] = [];

  for (const issue of issues) {
    results.push(await executeAutoFix(issue));
  }

  await logAutoFixRun(userId, issues, results);

  return {
    detected: issues.length,
    patched: results.filter((r) => r.status === "patched").length,
    verified: results.filter((r) => r.status === "verified").length,
    failed: results.filter((r) => r.status === "failed").length,
    skipped: results.filter((r) => r.status === "skipped").length,
    issues,
    results,
  };
}

// =============================
// 5) LOGGING
// =============================

async function logAutoFixRun(userId: string, issues: AutoFixIssue[], results: AutoFixResult[]) {
  const successCount = results.filter((r) => r.status === "patched" || r.status === "verified").length;

  await supabase.from("dino_learning_events").insert({
    event_type: "v21_auto_fix_cycle",
    entity_id: userId,
    entity_type: "user",
    metric: "fix_success_count",
    metadata_json: {
      detected: issues.length,
      results,
      issueKinds: issues.map((i) => i.kind),
    } as unknown as Json,
    new_value: successCount,
    previous_value: 0,
  });
}

// =============================
// 6) QUICK FIX + RECHECK
// =============================

export async function quickFixAndRecheck(userId: string) {
  // Run debug BEFORE fix for comparison
  const beforeDebug = await runV20Debug(userId);
  const firstPass = await runV21AutoFix(userId);
  const afterDebug = await runV20Debug(userId);

  return {
    firstPass,
    beforeDebug,
    afterDebug,
    healthy: afterDebug.overallOk,
  };
}
