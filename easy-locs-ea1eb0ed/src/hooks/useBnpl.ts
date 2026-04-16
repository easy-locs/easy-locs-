import { useState, useCallback, useEffect } from "react";
import {
  checkBnplEligibility,
  createBnplPlan,
  approveBnplPlan,
  activateBnplPlan,
  getUserBnplPlans,
  payInstallment,
  markOverdueInstallments,
  calculateInstallmentBreakdown,
  type BnplPlan,
  type BnplEligibility,
} from "@/services/bnpl.service";

export function useBnplEligibility(userId: string, orderAmount: number) {
  const [eligibility, setEligibility] = useState<BnplEligibility | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId || orderAmount <= 0) {
      setEligibility(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    checkBnplEligibility(userId, orderAmount)
      .then(setEligibility)
      .finally(() => setLoading(false));
  }, [userId, orderAmount]);

  return { eligibility, loading };
}

export function useBnplPlans() {
  const [plans, setPlans] = useState<BnplPlan[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getUserBnplPlans();
      setPlans(result);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const create = useCallback(
    async (options: {
      orderId: string;
      totalAmount: number;
      currency?: string;
      installmentCount: number;
      merchantName?: string;
    }) => {
      const result = await createBnplPlan(options);
      if (!result.ok || !result.plan) return result;

      const approveResult = await approveBnplPlan(result.plan.id);
      if (!approveResult.ok) {
        await refresh();
        return { ok: false, error: approveResult.error ?? "Failed to approve BNPL plan" };
      }

      const activateResult = await activateBnplPlan(result.plan.id);
      if (!activateResult.ok) {
        await refresh();
        return { ok: false, error: activateResult.error ?? "Failed to activate BNPL plan" };
      }

      await refresh();
      return result;
    },
    [refresh],
  );

  const pay = useCallback(
    async (planId: string, installmentId: string) => {
      const result = await payInstallment(planId, installmentId);
      if (result.ok) await refresh();
      return result;
    },
    [refresh],
  );

  const approve = useCallback(
    async (planId: string) => {
      const result = await approveBnplPlan(planId);
      if (result.ok) await refresh();
      return result;
    },
    [refresh],
  );

  const activate = useCallback(
    async (planId: string) => {
      const result = await activateBnplPlan(planId);
      if (result.ok) await refresh();
      return result;
    },
    [refresh],
  );

  const checkOverdue = useCallback(async () => {
    const result = await markOverdueInstallments();
    if (result.updated > 0) await refresh();
    return result;
  }, [refresh]);

  return { plans, loading, refresh, create, pay, approve, activate, checkOverdue };
}

export { calculateInstallmentBreakdown };
