import { supabase } from "@/integrations/supabase/client";
import { db } from "@/services/db";
import { checkKycLevelForUser } from "@/lib/kyc/kyc-gate-service";

export type BnplStatus = "created" | "approved" | "active" | "completed" | "overdue" | "defaulted";

export interface BnplPlan {
  id: string;
  userId: string;
  orderId: string;
  totalAmount: number;
  currency: string;
  installmentCount: number;
  installments: BnplInstallment[];
  status: BnplStatus;
  createdAt: string;
  merchantName?: string;
}

export interface BnplInstallment {
  id: string;
  planId: string;
  number: number;
  amount: number;
  dueDate: string;
  paidAt?: string;
  status: "pending" | "paid" | "overdue";
}

export interface BnplEligibility {
  eligible: boolean;
  maxAmount: number;
  availableInstallments: number[];
  reason?: string;
}

const MIN_BNPL_AMOUNT = 50;
const MAX_BNPL_AMOUNT = 5000;
const ALLOWED_INSTALLMENTS = [3, 4, 6];

async function getCurrentUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data?.session?.user?.id ?? null;
}

interface BnplPlanRow {
  id: string;
  user_id: string;
  order_id: string;
  total_amount: number;
  currency: string;
  installment_count: number;
  installments: BnplInstallment[];
  status: string;
  merchant_name: string | null;
  created_at: string;
}

function rowToPlan(row: BnplPlanRow): BnplPlan {
  return {
    id: row.id,
    userId: row.user_id,
    orderId: row.order_id,
    totalAmount: row.total_amount,
    currency: row.currency,
    installmentCount: row.installment_count,
    installments: row.installments,
    status: row.status as BnplStatus,
    createdAt: row.created_at,
    merchantName: row.merchant_name ?? undefined,
  };
}

export async function checkBnplEligibility(
  userId: string,
  orderAmount: number,
): Promise<BnplEligibility> {
  if (orderAmount < MIN_BNPL_AMOUNT) {
    return {
      eligible: false,
      maxAmount: 0,
      availableInstallments: [],
      reason: `Minimum order amount for BNPL is ${MIN_BNPL_AMOUNT}`,
    };
  }

  const kycResult = await checkKycLevelForUser(userId, "basic");
  if (!kycResult.allowed) {
    return {
      eligible: false,
      maxAmount: 0,
      availableInstallments: [],
      reason: "KYC verification required for BNPL",
    };
  }

  const { data: rows } = await db
    .from("bnpl_plans")
    .select("*")
    .eq("user_id", userId)
    .eq("status", "active");

  const activePlans = (rows ?? []).map(rowToPlan);

  if (activePlans.length >= 3) {
    return {
      eligible: false,
      maxAmount: 0,
      availableInstallments: [],
      reason: "Maximum active BNPL plans reached",
    };
  }

  const totalOutstanding = activePlans.reduce(
    (sum, p) => sum + p.installments.filter((i) => i.status !== "paid").reduce((s, i) => s + i.amount, 0),
    0,
  );

  const maxAllowed = Math.min(MAX_BNPL_AMOUNT - totalOutstanding, orderAmount);

  if (maxAllowed < MIN_BNPL_AMOUNT) {
    return {
      eligible: false,
      maxAmount: 0,
      availableInstallments: [],
      reason: "Outstanding balance too high for additional BNPL",
    };
  }

  return {
    eligible: true,
    maxAmount: maxAllowed,
    availableInstallments: ALLOWED_INSTALLMENTS,
  };
}

export async function createBnplPlan(options: {
  orderId: string;
  totalAmount: number;
  currency?: string;
  installmentCount: number;
  merchantName?: string;
}): Promise<{ ok: boolean; plan?: BnplPlan; error?: string }> {
  const userId = await getCurrentUserId();
  if (!userId) return { ok: false, error: "Not authenticated" };

  const { orderId, totalAmount, currency = "USD", installmentCount, merchantName } = options;

  if (!ALLOWED_INSTALLMENTS.includes(installmentCount)) {
    return { ok: false, error: `Installment count must be one of: ${ALLOWED_INSTALLMENTS.join(", ")}` };
  }

  const eligibility = await checkBnplEligibility(userId, totalAmount);
  if (!eligibility.eligible) {
    return { ok: false, error: eligibility.reason };
  }

  const installmentAmount = Math.ceil((totalAmount / installmentCount) * 100) / 100;
  const now = new Date();
  const planId = `bnpl_${crypto.randomUUID()}`;

  const installments: BnplInstallment[] = [];
  for (let i = 0; i < installmentCount; i++) {
    const dueDate = new Date(now);
    dueDate.setDate(dueDate.getDate() + (i + 1) * 30);

    installments.push({
      id: `inst_${crypto.randomUUID()}`,
      planId,
      number: i + 1,
      amount: i === installmentCount - 1
        ? Math.round((totalAmount - installmentAmount * (installmentCount - 1)) * 100) / 100
        : installmentAmount,
      dueDate: dueDate.toISOString(),
      status: "pending",
    });
  }

  const { data, error } = await db
    .from("bnpl_plans")
    .insert({
      id: planId,
      user_id: userId,
      order_id: orderId,
      total_amount: totalAmount,
      currency,
      installment_count: installmentCount,
      installments: installments as unknown as Record<string, unknown>,
      status: "created",
      merchant_name: merchantName ?? null,
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    })
    .select()
    .single();

  if (error || !data) {
    return { ok: false, error: "Failed to create BNPL plan" };
  }

  return { ok: true, plan: rowToPlan(data as unknown as BnplPlanRow) };
}

export async function getUserBnplPlans(): Promise<BnplPlan[]> {
  const userId = await getCurrentUserId();
  if (!userId) return [];

  const { data } = await db
    .from("bnpl_plans")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  return (data ?? []).map((row: unknown) => rowToPlan(row as BnplPlanRow));
}

export async function payInstallment(
  planId: string,
  installmentId: string,
): Promise<{ ok: boolean; error?: string }> {
  const userId = await getCurrentUserId();
  if (!userId) return { ok: false, error: "Not authenticated" };

  const { data: row, error: fetchError } = await db
    .from("bnpl_plans")
    .select("*")
    .eq("id", planId)
    .eq("user_id", userId)
    .single();

  if (fetchError || !row) return { ok: false, error: "Plan not found" };

  const plan = rowToPlan(row as unknown as BnplPlanRow);

  if (plan.status !== "active" && plan.status !== "overdue") {
    return { ok: false, error: `Cannot pay installment on a plan in '${plan.status}' status. Plan must be active.` };
  }

  const installment = plan.installments.find((i) => i.id === installmentId);
  if (!installment) return { ok: false, error: "Installment not found" };
  if (installment.status === "paid") return { ok: false, error: "Already paid" };

  installment.status = "paid";
  installment.paidAt = new Date().toISOString();

  const allPaid = plan.installments.every((i) => i.status === "paid");
  const newStatus = allPaid ? "completed" : plan.status;

  const { error: updateError } = await db
    .from("bnpl_plans")
    .update({
      installments: plan.installments as unknown as Record<string, unknown>,
      status: newStatus,
      updated_at: new Date().toISOString(),
    })
    .eq("id", planId)
    .eq("user_id", userId);

  if (updateError) return { ok: false, error: "Failed to update installment" };

  return { ok: true };
}

export async function approveBnplPlan(
  planId: string,
): Promise<{ ok: boolean; error?: string }> {
  const userId = await getCurrentUserId();
  if (!userId) return { ok: false, error: "Not authenticated" };

  const { data: row, error: fetchError } = await db
    .from("bnpl_plans")
    .select("*")
    .eq("id", planId)
    .eq("user_id", userId)
    .single();

  if (fetchError || !row) return { ok: false, error: "Plan not found" };

  const plan = rowToPlan(row as unknown as BnplPlanRow);
  if (plan.status !== "created") {
    return { ok: false, error: `Cannot approve plan in '${plan.status}' status` };
  }

  const { error: updateError } = await db
    .from("bnpl_plans")
    .update({ status: "approved", updated_at: new Date().toISOString() })
    .eq("id", planId)
    .eq("user_id", userId);

  if (updateError) return { ok: false, error: "Failed to approve BNPL plan" };
  return { ok: true };
}

export async function activateBnplPlan(
  planId: string,
): Promise<{ ok: boolean; error?: string }> {
  const userId = await getCurrentUserId();
  if (!userId) return { ok: false, error: "Not authenticated" };

  const { data: row, error: fetchError } = await db
    .from("bnpl_plans")
    .select("*")
    .eq("id", planId)
    .eq("user_id", userId)
    .single();

  if (fetchError || !row) return { ok: false, error: "Plan not found" };

  const plan = rowToPlan(row as unknown as BnplPlanRow);
  if (plan.status !== "approved") {
    return { ok: false, error: `Cannot activate plan in '${plan.status}' status` };
  }

  const { error: updateError } = await db
    .from("bnpl_plans")
    .update({ status: "active", updated_at: new Date().toISOString() })
    .eq("id", planId)
    .eq("user_id", userId);

  if (updateError) return { ok: false, error: "Failed to activate BNPL plan" };
  return { ok: true };
}

export async function markOverdueInstallments(): Promise<{ updated: number }> {
  const userId = await getCurrentUserId();
  if (!userId) return { updated: 0 };

  const { data: rows } = await db
    .from("bnpl_plans")
    .select("*")
    .eq("user_id", userId)
    .eq("status", "active");

  if (!rows?.length) return { updated: 0 };

  const now = new Date();
  let updated = 0;

  for (const row of rows) {
    const plan = rowToPlan(row as unknown as BnplPlanRow);
    let changed = false;

    for (const inst of plan.installments) {
      if (inst.status === "pending" && new Date(inst.dueDate) < now) {
        inst.status = "overdue";
        changed = true;
      }
    }

    if (changed) {
      const hasOverdue = plan.installments.some((i) => i.status === "overdue");
      const newStatus = hasOverdue ? "overdue" : plan.status;

      await db
        .from("bnpl_plans")
        .update({
          installments: plan.installments as unknown as Record<string, unknown>,
          status: newStatus,
          updated_at: now.toISOString(),
        })
        .eq("id", plan.id)
        .eq("user_id", userId);

      updated++;
    }
  }

  return { updated };
}

export function calculateInstallmentBreakdown(
  totalAmount: number,
  installmentCount: number,
): { perInstallment: number; total: number; fee: number } {
  const fee = 0;
  const total = totalAmount + fee;
  const perInstallment = Math.ceil((total / installmentCount) * 100) / 100;
  return { perInstallment, total, fee };
}
