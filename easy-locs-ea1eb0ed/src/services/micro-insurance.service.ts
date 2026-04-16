import { supabase } from "@/integrations/supabase/client";

export type InsuranceType = "package_protection" | "trip_protection";
export type InsurancePolicyStatus = "active" | "claimed" | "expired" | "cancelled";

export interface InsuranceOffer {
  id: string;
  type: InsuranceType;
  title: string;
  description: string;
  premium: number;
  currency: string;
  coverageAmount: number;
  coverageItems: string[];
  termsUrl?: string;
}

export interface InsurancePolicy {
  id: string;
  userId: string;
  orderId: string;
  type: InsuranceType;
  premium: number;
  coverageAmount: number;
  currency: string;
  status: InsurancePolicyStatus;
  createdAt: string;
  expiresAt: string;
  claimId?: string;
}

export interface InsuranceClaim {
  id: string;
  policyId: string;
  reason: string;
  description: string;
  status: "submitted" | "reviewing" | "approved" | "denied";
  amount?: number;
  submittedAt: string;
  resolvedAt?: string;
}

const PACKAGE_PROTECTION: InsuranceOffer = {
  id: "ins_pkg_standard",
  type: "package_protection",
  title: "Package Protection",
  description: "Cover your delivery against loss, damage, or theft",
  premium: 1.99,
  currency: "USD",
  coverageAmount: 500,
  coverageItems: [
    "Loss during transit",
    "Damage from handling",
    "Theft before delivery",
    "Wrong item delivered",
  ],
};

const TRIP_PROTECTION: InsuranceOffer = {
  id: "ins_trip_standard",
  type: "trip_protection",
  title: "Trip Protection",
  description: "Cover your ride against cancellation and delays",
  premium: 0.99,
  currency: "USD",
  coverageAmount: 200,
  coverageItems: [
    "Driver cancellation refund",
    "Excessive delay compensation",
    "Route deviation coverage",
    "Lost items in vehicle",
  ],
};

const policies = new Map<string, InsurancePolicy[]>();
const claims = new Map<string, InsuranceClaim[]>();

async function getCurrentUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data?.session?.user?.id ?? null;
}

export function getInsuranceOffer(
  type: InsuranceType,
  orderAmount?: number,
): InsuranceOffer {
  const base = type === "package_protection" ? PACKAGE_PROTECTION : TRIP_PROTECTION;

  if (orderAmount && orderAmount > 100 && type === "package_protection") {
    return {
      ...base,
      premium: Math.round(orderAmount * 0.02 * 100) / 100,
      coverageAmount: Math.min(orderAmount * 1.5, 2000),
    };
  }

  return base;
}

export async function purchaseInsurance(options: {
  orderId: string;
  type: InsuranceType;
  premium: number;
  coverageAmount: number;
  currency?: string;
}): Promise<{ ok: boolean; policy?: InsurancePolicy; error?: string }> {
  const userId = await getCurrentUserId();
  if (!userId) return { ok: false, error: "Not authenticated" };

  const { orderId, type, premium, coverageAmount, currency = "USD" } = options;

  const now = new Date();
  const expiresAt = new Date(now);
  expiresAt.setDate(expiresAt.getDate() + (type === "package_protection" ? 30 : 1));

  const policy: InsurancePolicy = {
    id: `pol_${crypto.randomUUID()}`,
    userId,
    orderId,
    type,
    premium,
    coverageAmount,
    currency,
    status: "active",
    createdAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
  };

  const userPolicies = policies.get(userId) || [];
  userPolicies.push(policy);
  policies.set(userId, userPolicies);

  return { ok: true, policy };
}

export async function getUserPolicies(): Promise<InsurancePolicy[]> {
  const userId = await getCurrentUserId();
  if (!userId) return [];
  return policies.get(userId) || [];
}

export async function fileClaim(options: {
  policyId: string;
  reason: string;
  description: string;
}): Promise<{ ok: boolean; claim?: InsuranceClaim; error?: string }> {
  const userId = await getCurrentUserId();
  if (!userId) return { ok: false, error: "Not authenticated" };

  const userPolicies = policies.get(userId) || [];
  const policy = userPolicies.find((p) => p.id === options.policyId);
  if (!policy) return { ok: false, error: "Policy not found" };
  if (policy.status !== "active") return { ok: false, error: "Policy is not active" };

  const now = new Date();
  if (new Date(policy.expiresAt) < now) {
    policy.status = "expired";
    return { ok: false, error: "Policy has expired" };
  }

  const claim: InsuranceClaim = {
    id: `clm_${crypto.randomUUID()}`,
    policyId: policy.id,
    reason: options.reason,
    description: options.description,
    status: "submitted",
    submittedAt: now.toISOString(),
  };

  const policyClaims = claims.get(policy.id) || [];
  policyClaims.push(claim);
  claims.set(policy.id, policyClaims);

  policy.claimId = claim.id;
  policy.status = "claimed";

  return { ok: true, claim };
}

export async function getPolicyClaims(policyId: string): Promise<InsuranceClaim[]> {
  return claims.get(policyId) || [];
}
