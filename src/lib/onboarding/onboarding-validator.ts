/**
 * onboarding-validator — Atomic unit: validate onboarding step completeness.
 * Single responsibility: check which onboarding steps are complete.
 */
import { supabase } from "@/integrations/supabase/client";
import { reportHealth } from "@/lib/runtime/health-aggregator";

const trace = (step: string, phase: "input" | "output" | "error", payload?: Record<string, unknown>) => {
  const logger = phase === "error" ? console.error : console.log;
  logger(`[ONBOARDING][${step}] ${phase}:`, payload ?? {});
};

export interface OnboardingStatus {
  profileComplete: boolean;
  walletReady: boolean;
  orbitReady: boolean;
  hasOrg: boolean;
  hasListing: boolean;
  completionPercent: number;
}

export async function checkOnboardingStatus(userId: string): Promise<OnboardingStatus> {
  trace("check", "input", { userId });
  const start = Date.now();

  const [profileRes, walletRes, orbitRes, orgRes] = await Promise.all([
    supabase.from("profiles").select("id, first_name, last_name, email").eq("id", userId).maybeSingle(),
    (supabase as any).from("wallet_accounts").select("id").eq("user_id", userId).maybeSingle(),
    (supabase as any).from("orbit_profiles_v2").select("id").eq("id", userId).maybeSingle(),
    (supabase as any).from("org_members").select("org_id").eq("user_id", userId).limit(1),
  ]);

  const profile = profileRes.data;
  const profileComplete = !!(profile?.first_name && profile?.last_name && profile?.email);
  const walletReady = !!walletRes.data;
  const orbitReady = !!orbitRes.data;
  const hasOrg = !!(orgRes.data?.length);

  const steps = [profileComplete, walletReady, orbitReady, hasOrg];
  const completionPercent = Math.round((steps.filter(Boolean).length / steps.length) * 100);

  const status: OnboardingStatus = {
    profileComplete, walletReady, orbitReady, hasOrg,
    hasListing: false, completionPercent,
  };

  const latency = Date.now() - start;
  trace("check", "output", { ...status, latency });
  reportHealth("onboarding", "ok", latency);
  return status;
}
