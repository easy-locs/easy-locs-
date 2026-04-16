import { supabase } from "@/integrations/supabase/client";
import { checkKycLevelForUser } from "@/lib/kyc/kyc-gate-service";

export type BnplStatus = "active" | "completed" | "overdue" | "defaulted";

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

const bnplPlans = new Map<string, BnplPlan[]>();

async function getCurrentUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data?.session?.user?.id ?? null;
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

  const activePlans = (bnplPlans.get(userId) || []).filter((p) => p.status === "active");
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

  const installments: BnplInstallment[] = [];
  for (let i = 0; i < installmentCount; i++) {
    const dueDate = new Date(now);
    dueDate.setDate(dueDate.getDate() + (i + 1) * 30);

    installments.push({
      id: `inst_${crypto.randomUUID()}`,
      planId: "",
      number: i + 1,
      amount: i === installmentCount - 1
        ? Math.round((totalAmount - installmentAmount * (installmentCount - 1)) * 100) / 100
        : installmentAmount,
      dueDate: dueDate.toISOString(),
      status: i === 0 ? "paid" : "pending",
      paidAt: i === 0 ? now.toISOString() : undefined,
    });
  }

  const plan: BnplPlan = {
    id: `bnpl_${crypto.randomUUID()}`,
    userId,
    orderId,
    totalAmount,
    currency,
    installmentCount,
    installments,
    status: "active",
    createdAt: now.toISOString(),
    merchantName,
  };

  installments.forEach((i) => (i.planId = plan.id));

  const userPlans = bnplPlans.get(userId) || [];
  userPlans.push(plan);
  bnplPlans.set(userId, userPlans);

  return { ok: true, plan };
}

export async function getUserBnplPlans(): Promise<BnplPlan[]> {
  const userId = await getCurrentUserId();
  if (!userId) return [];
  return bnplPlans.get(userId) || [];
}

export async function payInstallment(
  planId: string,
  installmentId: string,
): Promise<{ ok: boolean; error?: string }> {
  const userId = await getCurrentUserId();
  if (!userId) return { ok: false, error: "Not authenticated" };

  const plans = bnplPlans.get(userId) || [];
  const plan = plans.find((p) => p.id === planId);
  if (!plan) return { ok: false, error: "Plan not found" };

  const installment = plan.installments.find((i) => i.id === installmentId);
  if (!installment) return { ok: false, error: "Installment not found" };
  if (installment.status === "paid") return { ok: false, error: "Already paid" };

  installment.status = "paid";
  installment.paidAt = new Date().toISOString();

  const allPaid = plan.installments.every((i) => i.status === "paid");
  if (allPaid) plan.status = "completed";

  return { ok: true };
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
