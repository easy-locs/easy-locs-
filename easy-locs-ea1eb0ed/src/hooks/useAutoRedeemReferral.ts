import { useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { referralService } from "@/services/referral.service";
import { useToast } from "@/hooks/use-toast";
import { PENDING_REF_KEY } from "@/lib/referral-cache";

const REDEEMED_KEY_PREFIX = "easylocs_ref_redeemed:";

export function useAutoRedeemReferral() {
  const { user } = useAuth();
  const { toast } = useToast();
  const attemptedForUserRef = useRef<string | null>(null);

  useEffect(() => {
    if (!user?.id) return;

    if (attemptedForUserRef.current === user.id) return;

    let pendingCode: string | null = null;
    try {
      pendingCode = sessionStorage.getItem(PENDING_REF_KEY);
    } catch {}

    if (!pendingCode) return;

    const redeemedKey = `${REDEEMED_KEY_PREFIX}${user.id}`;
    let alreadyRedeemed = false;
    try {
      alreadyRedeemed = sessionStorage.getItem(redeemedKey) === pendingCode;
    } catch {}

    if (alreadyRedeemed) return;

    attemptedForUserRef.current = user.id;

    const RETRYABLE_MESSAGES = ["Referral system not yet available"];

    referralService
      .redeemCode(pendingCode, user.id)
      .then((result) => {
        if (result.success) {
          toast({
            title: "Referral Applied",
            description: result.message,
          });
          try {
            sessionStorage.setItem(redeemedKey, pendingCode!);
            sessionStorage.removeItem(PENDING_REF_KEY);
          } catch {}
        } else if (RETRYABLE_MESSAGES.includes(result.message)) {
          attemptedForUserRef.current = null;
        } else {
          try {
            sessionStorage.setItem(redeemedKey, pendingCode!);
            sessionStorage.removeItem(PENDING_REF_KEY);
          } catch {}
        }
      })
      .catch((err) => {
        console.error("[Referral] Auto-redeem failed:", err instanceof Error ? err.message : err);
        attemptedForUserRef.current = null;
      });
  }, [user?.id, toast]);
}
