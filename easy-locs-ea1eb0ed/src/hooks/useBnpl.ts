import { useState, useCallback, useEffect } from "react";
import {
  checkBnplEligibility,
  createBnplPlan,
  getUserBnplPlans,
  payInstallment,
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
      if (result.ok) await refresh();
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

  return { plans, loading, refresh, create, pay };
}

export { calculateInstallmentBreakdown };
