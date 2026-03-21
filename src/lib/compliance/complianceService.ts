/**
 * Compliance Service — KYC / AML / Limits enforcement.
 * Single source of truth for all compliance checks before wallet operations.
 */
import { supabase } from "@/integrations/supabase/client";

/* ── KYC ─────────────────────────────────────────── */

export type KycLevel = "none" | "basic" | "verified" | "enhanced";
export type KycStatus = "not_started" | "pending" | "approved" | "rejected" | "expired";

export interface KycProfile {
  user_id: string;
  kyc_level: KycLevel;
  status: KycStatus;
  first_name: string | null;
  last_name: string | null;
  nationality: string | null;
  country_of_residence: string | null;
  risk_rating: string;
  created_at: string;
}

export async function getKycProfile(userId: string): Promise<KycProfile | null> {
  const { data } = await (supabase as any)
    .from("user_kyc_profiles")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  return data;
}

export async function upsertKycProfile(userId: string, fields: Partial<KycProfile>) {
  const { data, error } = await (supabase as any)
    .from("user_kyc_profiles")
    .upsert({ user_id: userId, ...fields }, { onConflict: "user_id" })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function submitKycForReview(userId: string, profile: {
  first_name: string;
  last_name: string;
  date_of_birth: string;
  nationality: string;
  country_of_residence: string;
  id_document_type: string;
  id_document_number: string;
}) {
  return upsertKycProfile(userId, {
    ...profile,
    status: "pending" as KycStatus,
    kyc_level: "basic" as KycLevel,
  } as any);
}

/* ── KYC Documents ───────────────────────────────── */

export async function uploadKycDocument(userId: string, doc: {
  doc_type: string;
  file_url: string;
  file_back_url?: string;
  selfie_url?: string;
}) {
  const { data, error } = await (supabase as any)
    .from("kyc_documents")
    .insert({ user_id: userId, ...doc })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function getKycDocuments(userId: string) {
  const { data } = await (supabase as any)
    .from("kyc_documents")
    .select("*")
    .eq("user_id", userId)
    .order("uploaded_at", { ascending: false });
  return data ?? [];
}

/* ── Limits ──────────────────────────────────────── */

export interface WalletLimits {
  single_tx_limit: number;
  daily_send_limit: number;
  daily_receive_limit: number;
  monthly_send_limit: number;
  monthly_receive_limit: number;
  qr_pay_limit: number;
  cashout_limit: number;
  p2p_limit: number;
}

const DEFAULT_LIMITS: WalletLimits = {
  single_tx_limit: 0,
  daily_send_limit: 0,
  daily_receive_limit: 0,
  monthly_send_limit: 0,
  monthly_receive_limit: 0,
  qr_pay_limit: 0,
  cashout_limit: 0,
  p2p_limit: 0,
};

export async function getWalletLimits(userId: string): Promise<WalletLimits> {
  const { data } = await (supabase as any)
    .from("wallet_limit_profiles")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (!data) return DEFAULT_LIMITS;
  return {
    single_tx_limit: Number(data.single_tx_limit ?? 0),
    daily_send_limit: Number(data.daily_send_limit ?? 0),
    daily_receive_limit: Number(data.daily_receive_limit ?? 0),
    monthly_send_limit: Number(data.monthly_send_limit ?? 0),
    monthly_receive_limit: Number(data.monthly_receive_limit ?? 0),
    qr_pay_limit: Number(data.qr_pay_limit ?? 0),
    cashout_limit: Number(data.cashout_limit ?? 0),
    p2p_limit: Number(data.p2p_limit ?? 0),
  };
}

/* ── AML ─────────────────────────────────────────── */

export type AmlSeverity = "low" | "medium" | "high" | "critical";
export type AmlStatus = "open" | "reviewing" | "cleared" | "escalated" | "blocked";

export async function createAmlEvent(params: {
  userId?: string;
  shopId?: string;
  eventType: string;
  severity: AmlSeverity;
  score?: number;
  metadata?: Record<string, any>;
}) {
  const { data, error } = await (supabase as any)
    .from("aml_events")
    .insert({
      user_id: params.userId ?? null,
      shop_id: params.shopId ?? null,
      event_type: params.eventType,
      severity: params.severity,
      score: params.score ?? 0,
      status: "open",
      metadata_json: params.metadata ?? {},
    })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function getAmlEvents(userId: string) {
  const { data } = await (supabase as any)
    .from("aml_events")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);
  return data ?? [];
}

/* ── Compliance Cases ────────────────────────────── */

export async function createComplianceCase(params: {
  userId?: string;
  shopId?: string;
  caseType: "kyc" | "kyb" | "aml" | "limits" | "fraud" | "sanctions";
  severity: string;
  notes?: string;
}) {
  const { data, error } = await (supabase as any)
    .from("compliance_cases")
    .insert({
      user_id: params.userId ?? null,
      shop_id: params.shopId ?? null,
      case_type: params.caseType,
      severity: params.severity,
      notes: params.notes ?? null,
      status: "open",
    })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

/* ── Business Compliance (KYB) ───────────────────── */

export async function getBusinessCompliance(shopId: string) {
  const { data } = await (supabase as any)
    .from("business_compliance_profiles")
    .select("*")
    .eq("shop_id", shopId)
    .maybeSingle();
  return data;
}

export async function upsertBusinessCompliance(shopId: string, fields: Record<string, any>) {
  const { data, error } = await (supabase as any)
    .from("business_compliance_profiles")
    .upsert({ shop_id: shopId, ...fields }, { onConflict: "shop_id" })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

/* ── Pre-transfer compliance check ───────────────── */

export interface ComplianceCheckResult {
  allowed: boolean;
  reason?: string;
  requirePin: boolean;
  require2fa: boolean;
  riskLevel: "low" | "medium" | "high" | "critical";
}

export async function preTransferComplianceCheck(params: {
  userId: string;
  amount: number;
  currency: string;
  recipientId: string;
}): Promise<ComplianceCheckResult> {
  // Get KYC profile
  const kyc = await getKycProfile(params.userId);
  const kycLevel = kyc?.kyc_level ?? "none";

  // No KYC = no transfers
  if (kycLevel === "none") {
    return { allowed: false, reason: "KYC verification required to make transfers", requirePin: false, require2fa: false, riskLevel: "high" };
  }

  if (kyc?.status === "rejected") {
    return { allowed: false, reason: "KYC verification was rejected. Please contact support.", requirePin: false, require2fa: false, riskLevel: "critical" };
  }

  // Get limits
  const limits = await getWalletLimits(params.userId);

  if (params.amount > limits.single_tx_limit && limits.single_tx_limit > 0) {
    return { allowed: false, reason: `Amount exceeds your transaction limit of ${limits.single_tx_limit} ${params.currency}`, requirePin: true, require2fa: false, riskLevel: "medium" };
  }

  // Determine risk level and auth requirements
  let riskLevel: ComplianceCheckResult["riskLevel"] = "low";
  let requirePin = true;
  let require2fa = false;

  if (params.amount > 1000) {
    riskLevel = "medium";
    requirePin = true;
  }
  if (params.amount > 5000) {
    riskLevel = "high";
    require2fa = true;
  }

  return { allowed: true, requirePin, require2fa, riskLevel };
}
