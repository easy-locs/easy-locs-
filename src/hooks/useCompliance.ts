/**
 * useCompliance — React hooks for KYC/AML/limits compliance.
 */
import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  getKycProfile,
  getWalletLimits,
  type KycProfile,
  type WalletLimits,
} from "@/lib/compliance/complianceService";

export function useKycProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<KycProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user?.id) { setLoading(false); return; }
    setLoading(true);
    const data = await getKycProfile(user.id);
    setProfile(data);
    setLoading(false);
  }, [user?.id]);

  useEffect(() => { load(); }, [load]);

  return { profile, loading, reload: load };
}

export function useWalletLimits() {
  const { user } = useAuth();
  const [limits, setLimits] = useState<WalletLimits | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) { setLoading(false); return; }
    getWalletLimits(user.id).then((data) => {
      setLimits(data);
      setLoading(false);
    });
  }, [user?.id]);

  return { limits, loading };
}
