import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { computeUserTrustScore, getDefaultSignals, type TrustSignals, type UserTrustProfile } from "@/lib/trust/user-trust-engine";
import { getKycLevel, isKycCompleted, type KycStatus } from "@/lib/trust/kyc-light";
import { db } from "@/services/db";

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

      const [profileData, trustData, walletTxData] = await Promise.all([
        db.from("profiles").select("kyc_status, device_bound, contacts_synced").eq("id", user.id).maybeSingle(),
        db.from("user_trust_graph").select("disputes_count, cancellations_count, moderation_flags, reported_by_count").eq("user_id", user.id).maybeSingle(),
        db.from("wallet_transactions").select("id, status").eq("sender_id", user.id).limit(200),
      ]);

      if (profileData.data) {
        const p = profileData.data as Record<string, unknown>;
        const kycStatus = (p.kyc_status as KycStatus) || "not_started";
        signals.kycLevel = getKycLevel(kycStatus);
        signals.kycCompleted = isKycCompleted(kycStatus);
        signals.deviceStable = !!p.device_bound;
        signals.contactsSynced = !!p.contacts_synced;
      }

      if (trustData.data) {
        const t = trustData.data as Record<string, unknown>;
        signals.disputesCount = (t.disputes_count as number) || 0;
        signals.cancellationsCount = (t.cancellations_count as number) || 0;
        signals.moderationFlags = (t.moderation_flags as number) || 0;
        signals.reportedByOthers = (t.reported_by_count as number) || 0;
      }

      if (walletTxData.data) {
        const txs = walletTxData.data as Array<{ id: string; status: string }>;
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
