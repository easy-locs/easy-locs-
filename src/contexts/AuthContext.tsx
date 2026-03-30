import { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { logAudit } from "@/lib/audit";
import { ensureOrbitProfile } from "@/lib/orbit/ensureOrbitProfile";
import type { User, Session } from "@supabase/supabase-js";
import { markV1AuthActive, useV2AuthStore } from "@/stores/v2AuthStore";
import { useSubscriptionLoader, defaultSubscription, type SubscriptionState } from "@/hooks/useSubscription";
...
    const hydrateAuthState = async (nextSession: Session | null) => {
      const seq = ++latestSeq;

      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      useV2AuthStore.getState().syncFromV1(nextSession);

      if (nextSession?.user) {
        try {
          await ensureOrbitProfile({
            userId: nextSession.user.id,
            email: nextSession.user.email ?? null,
            displayName: (nextSession.user.user_metadata as any)?.display_name ?? (nextSession.user.user_metadata as any)?.full_name ?? null,
            avatarUrl: (nextSession.user.user_metadata as any)?.avatar_url ?? null,
          });
          if (seq !== latestSeq) return;
          await fetchOrgId(nextSession.user.id);
          if (seq !== latestSeq) return;
          await fetchUserType(nextSession.user.id);
          if (seq !== latestSeq) return;
        } catch (err) {
          console.error("[AuthContext] hydrateAuthState failed:", err);
        }
        setTimeout(() => { void refreshSubRef(); }, 500);
      } else {
        setOrgId(null);
        setUserType("landlord");
        setUserCountry("FR");
        setUserCurrency("EUR");
        setOnboardingCompleted(false);
        setProfileLoaded(false);
        resetSubscription();
        setActiveRole("landlord");
        setHasDualRole(false);
        setAllOrgs([]);
      }

      if (mounted && seq === latestSeq) setLoading(false);
    };

    const { data: { subscription: authSub } } = supabase.auth.onAuthStateChange(
      (_event, nextSession) => {
        if (_event === "SIGNED_IN" && nextSession?.user) {
          logAudit({ userId: nextSession.user.id, action: "user_login" });
          void ensureOrbitProfile({
            userId: nextSession.user.id,
            email: nextSession.user.email ?? null,
            displayName: (nextSession.user.user_metadata as any)?.display_name ?? (nextSession.user.user_metadata as any)?.full_name ?? null,
            avatarUrl: (nextSession.user.user_metadata as any)?.avatar_url ?? null,
          }).catch(() => null);
          void import("@/lib/auth/profile")
            .then((m) => m.ensureUserProfile(nextSession.user.id, {
              fullName: nextSession.user.user_metadata?.full_name,
              phone: nextSession.user.phone ?? undefined,
            }))
            .catch(() => null);
          setTimeout(() => {
            void import("@/lib/notif-alert-prefs")
              .then((m) => m?.requestNotificationPermission?.())
              .catch(() => null);
          }, 3000);
        }
        if (_event === "SIGNED_OUT") {
          logAudit({ action: "user_logout" });
        }
        void hydrateAuthState(nextSession);
      }
    );

    return () => {
      mounted = false;
      window.clearTimeout(safetyTimeout);
      authSub.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchOrgId, fetchUserType]);

  // Keep session alive — Supabase SDK auto-refreshes tokens, so we only need
  // a very gentle heartbeat (every 25 min) instead of aggressive 10-min refresh
  // that caused additional lock contention
  useEffect(() => {
    const interval = setInterval(() => {
      supabase.auth.getSession();
    }, 25 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const emailVerified = !!user?.email_confirmed_at;

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setOrgId(null);
    setUserType("landlord");
    setUserCountry("FR");
    setUserCurrency("EUR");
    setOnboardingCompleted(false);
    setProfileLoaded(false);
    resetSubscription();
    setActiveRole("landlord");
    setHasDualRole(false);
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, profileLoaded, emailVerified, orgId, allOrgs, switchOrg, userType, userCountry, userCurrency, onboardingCompleted, subscription, activeRole, hasDualRole, switchRole, refreshSubscription, refreshProfile, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};
