import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { computeUserTrustScore, getDefaultSignals, type TrustSignals, type UserTrustProfile } from "@/lib/trust/user-trust-engine";
import { getKycLevel, isKycCompleted, type KycStatus } from "@/lib/trust/kyc-light";
import { fetchUserProfile } from "@/services/domain/me.service";
import { fetchWalletTransactions } from "@/services/domain/wallet.service";

function getDefaultProfile(): UserTrustProfile {
  return computeUserTrustScore(getDefaultSignals());
}

export function useTrustScore() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserTrustProfile>(getDefaultProfile);
  const [loading, setLoading] = useState(true);

  const computeScore = useCallback(async () => {
    if (!user?.id) {
      setProfile(getDefaultProfile());
      setLoading(false);
      return;
    }

    try {
      const signals = getDefaultSignals();

      signals.phoneVerified = !!user.phone;

      if (user.created_at) {
        const createdAt = new Date(user.created_at).getTime();
        signals.accountAgeDays = Math.floor((Date.now() - createdAt) / 86400000);
      }

      const { fetchUserTrustGraph } = await import("@/services/domain/me.service");

      const [profileData, trustData, walletTxData] = await Promise.all([
        fetchUserProfile(user.id),
        fetchUserTrustGraph(user.id),
        fetchWalletTransactions(user.id, 200),
      ]);

      if (profileData) {
        const p = profileData as Record<string, unknown>;
        const kycStatus = (p.kyc_status as KycStatus) || "not_started";
        signals.kycLevel = getKycLevel(kycStatus);
        signals.kycCompleted = isKycCompleted(kycStatus);
        signals.deviceStable = !!p.device_bound;
        signals.contactsSynced = !!p.contacts_synced;
      }

      if (trustData) {
        const t = trustData as Record<string, unknown>;
        signals.disputesCount = (t.disputes_count as number) || 0;
        signals.cancellationsCount = (t.cancellations_count as number) || 0;
        signals.moderationFlags = (t.moderation_flags as number) || 0;
        signals.reportedByOthers = (t.reported_by_count as number) || 0;
      }

      if (walletTxData) {
        const txs = walletTxData as Array<{ id: string; status: string }>;
        signals.completedPayments = txs.filter(tx => tx.status === "completed").length;
        signals.failedPayments = txs.filter(tx => tx.status === "failed").length;
      }

      const result = computeUserTrustScore(signals);
      setProfile(result);
    } catch (err) {
      console.warn("[useTrustScore] computation error:", err);
      const signals = getDefaultSignals();
      signals.phoneVerified = !!user.phone;
      setProfile(computeUserTrustScore(signals));
    } finally {
      setLoading(false);
    }
  }, [user?.id, user?.phone, user?.created_at]);

  useEffect(() => {
    computeScore();
  }, [computeScore]);

  return {
    ...profile,
    loading,
    refresh: computeScore,
  };
}
