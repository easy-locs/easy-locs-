/**
 * useSubscription — extracted from AuthContext to reduce context complexity.
 * Manages subscription state checking via edge function.
 * L2.6: Auth context split.
 */
import { useState, useCallback, useEffect } from "react";
import { invokeCheckSubscription } from "@/repositories/ai.repository";
import type { Session } from "@supabase/supabase-js";

export interface SubscriptionState {
  subscribed: boolean;
  plan: string;
  subscriptionEnd: string | null;
  loading: boolean;
  isTrial: boolean;
  trialDaysLeft: number | null;
}

export const defaultSubscription: SubscriptionState = {
  subscribed: false,
  plan: "free",
  subscriptionEnd: null,
  loading: true,
  isTrial: false,
  trialDaysLeft: null,
};

export function useSubscriptionLoader(session: Session | null, userId: string | undefined) {
  const [subscription, setSubscription] = useState<SubscriptionState>(defaultSubscription);

  const refreshSubscription = useCallback(async () => {
    if (!session?.access_token) return;
    setSubscription((prev) => ({ ...prev, loading: true }));
    try {
      const data = await invokeCheckSubscription();
      if (data) {
        const isTrial = data.plan === "trial";
        const trialDaysLeft = isTrial && data.subscription_end
          ? Math.max(0, Math.ceil((new Date(data.subscription_end).getTime() - Date.now()) / 86400000))
          : null;
        setSubscription({
          subscribed: !!data.subscribed,
          plan: data.plan || "free",
          subscriptionEnd: data.subscription_end || null,
          loading: false,
          isTrial,
          trialDaysLeft,
        });
      }
    } catch (err: any) {
      // Suppress noisy network errors (e.g. during page reload / HMR)
      const msg = err?.message || "";
      if (!msg.includes("Load failed") && !msg.includes("Failed to send")) {
        console.error("[useSubscription] check-subscription error:", err);
      }
      setSubscription((prev) => ({ ...prev, loading: false, subscribed: false, plan: "free" }));
    }
  }, [session?.access_token]);

  const resetSubscription = useCallback(() => {
    setSubscription({ ...defaultSubscription, loading: false });
  }, []);

  // Auto-refresh every 60s
  useEffect(() => {
    if (!userId) return;
    const interval = setInterval(refreshSubscription, 60_000);
    return () => clearInterval(interval);
  }, [userId, refreshSubscription]);

  return { subscription, refreshSubscription, resetSubscription, setSubscription };
}
