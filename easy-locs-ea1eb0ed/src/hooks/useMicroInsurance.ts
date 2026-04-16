import { useState, useCallback, useEffect } from "react";
import {
  getInsuranceOffer,
  purchaseInsurance,
  getUserPolicies,
  fileClaim,
  type InsuranceOffer,
  type InsurancePolicy,
  type InsuranceType,
} from "@/services/micro-insurance.service";

export function useInsuranceOffer(type: InsuranceType, orderAmount?: number) {
  const [offer, setOffer] = useState<InsuranceOffer | null>(null);

  useEffect(() => {
    const result = getInsuranceOffer(type, orderAmount);
    setOffer(result);
  }, [type, orderAmount]);

  return offer;
}

export function useInsurancePolicies() {
  const [policies, setPolicies] = useState<InsurancePolicy[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getUserPolicies();
      setPolicies(result);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const purchase = useCallback(
    async (options: {
      orderId: string;
      type: InsuranceType;
      premium: number;
      coverageAmount: number;
      currency?: string;
    }) => {
      const result = await purchaseInsurance(options);
      if (result.ok) await refresh();
      return result;
    },
    [refresh],
  );

  const submitClaim = useCallback(
    async (policyId: string, reason: string, description: string) => {
      const result = await fileClaim({ policyId, reason, description });
      if (result.ok) await refresh();
      return result;
    },
    [refresh],
  );

  return { policies, loading, refresh, purchase, submitClaim };
}
