import { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { logAudit } from "@/lib/audit";
import { ensureOrbitProfile } from "@/lib/orbit/ensureOrbitProfile";
import type { User, Session } from "@supabase/supabase-js";
import { markV1AuthActive, useV2AuthStore } from "@/stores/v2AuthStore";
import { useSubscriptionLoader, defaultSubscription, type SubscriptionState } from "@/hooks/useSubscription";
import { authLog, authWarn, authError, getActiveTrace } from "@/lib/auth/auth-trace";

type UserType = "landlord" | "tenant" | "client";
type ActiveRole = "landlord" | "tenant" | "client";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  profileLoaded: boolean;
  emailVerified: boolean;
  orgId: string | null;
  allOrgs: { id: string; name: string; country: string; currency: string }[];
  switchOrg: (orgId: string) => void;
  userType: UserType;
  userCountry: string;
  userCurrency: string;
  onboardingCompleted: boolean;
  subscription: SubscriptionState;
  activeRole: ActiveRole;
  hasDualRole: boolean;
  switchRole: (role: ActiveRole) => void;
  refreshSubscription: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  profileLoaded: false,
  emailVerified: false,
  orgId: null,
  allOrgs: [],
  switchOrg: () => {},
  userType: "landlord",
  userCountry: "FR",
  userCurrency: "EUR",
  onboardingCompleted: false,
  subscription: defaultSubscription,
  activeRole: "landlord",
  hasDualRole: false,
  switchRole: () => {},
  refreshSubscription: async () => {},
  refreshProfile: async () => {},
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [userType, setUserType] = useState<UserType>("landlord");
  const [userCountry, setUserCountry] = useState("FR");
  const [userCurrency, setUserCurrency] = useState("EUR");
  const [onboardingCompleted, setOnboardingCompleted] = useState(false);
  const [activeRole, setActiveRole] = useState<ActiveRole>("landlord");
  const [hasDualRole, setHasDualRole] = useState(false);
  const [allOrgs, setAllOrgs] = useState<{ id: string; name: string; country: string; currency: string }[]>([]);
  const bootstrapOrbitRef = useRef<string | null>(null);

  // ── Critical path: minimal query for fast hydration ──
  const fetchOrgIdFast = useCallback(async (userId: string) => {
    const QUERY_TIMEOUT = 5_000;
    const withTimeout = <T,>(thenable: PromiseLike<T>, label: string): Promise<T> =>
      Promise.race([
        Promise.resolve(thenable),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error(`[AuthContext] ${label} timed out`)), QUERY_TIMEOUT)
        ),
      ]);

    try {
      const { data: memberships } = await withTimeout(
        supabase.from("org_members").select("org_id").eq("user_id", userId).limit(5),
        "fetchOrgIdFast"
      );

      if (memberships && memberships.length > 0) {
        const savedOrg = (() => {
          try { return localStorage.getItem(`easylocs_active_org_${userId}`); } catch { return null; }
        })();
        const selectedOrgId = savedOrg && memberships.some((m) => m.org_id === savedOrg) ? savedOrg : memberships[0].org_id;
        setOrgId(selectedOrgId);
        return memberships.map((m) => m.org_id);
      } else {
        setOrgId(null);
        return [];
      }
    } catch (err) {
      console.warn("[AuthContext] fetchOrgIdFast failed:", err);
      setOrgId(null);
      return [];
    }
  }, []);

  // ── Deferred: full org details (names, etc.) ──
  const fetchOrgDetails = useCallback(async (orgIds: string[]) => {
    if (orgIds.length === 0) { setAllOrgs([]); return; }
    try {
      const { data: orgsData } = await supabase.from("orgs").select("id, name").in("id", orgIds);
      setAllOrgs((orgsData || []).map((o) => ({
        id: o.id, name: o.name || "Unnamed", country: "", currency: "EUR",
      })));
    } catch (err) {
      console.warn("[AuthContext] fetchOrgDetails deferred failed:", err);
      setAllOrgs([]);
    }
  }, []);

  // ── Critical: profile basics only (1 query) ──
  const fetchProfileCritical = useCallback(async (userId: string) => {
    const QUERY_TIMEOUT = 5_000;
    const withTimeout = <T,>(thenable: PromiseLike<T>, label: string): Promise<T> =>
      Promise.race([
        Promise.resolve(thenable),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error(`[AuthContext] ${label} timed out`)), QUERY_TIMEOUT)
        ),
      ]);

    try {
      const { data: d1, error: e1 } = await withTimeout(
        supabase.from("profiles").select("user_type, onboarding_completed, country, currency").eq("id", userId).maybeSingle(),
        "fetchProfileCritical"
      );

      const data = (e1 || !d1) ? null : d1;
      const ut = (data?.user_type as UserType) ?? "landlord";
      setUserType(ut);
      setUserCountry(data?.country ?? "FR");
      setUserCurrency(data?.currency ?? "EUR");
      setOnboardingCompleted(data?.onboarding_completed ?? false);
      setProfileLoaded(true);
    } catch (err) {
      console.warn("[AuthContext] fetchProfileCritical failed:", err);
      setUserType("landlord");
      setUserCountry("FR");
      setUserCurrency("EUR");
      setOnboardingCompleted(false);
      setProfileLoaded(true);
    }
  }, []);

  // ── Deferred: dual-role detection + role resolution ──
  const fetchDualRoleDeferred = useCallback(async (userId: string) => {
    try {
      const [t, o] = await Promise.all([
        supabase.from("tenants").select("id").eq("tenant_user_id", userId).limit(1).maybeSingle(),
        supabase.from("org_members").select("id").eq("user_id", userId).limit(1).maybeSingle(),
      ]);
      const hasOrg = !!o.data;
      const hasTenant = !!t.data;
      const dual = hasTenant && hasOrg;
      setHasDualRole(dual);

      if (!onboardingCompleted && (hasOrg || hasTenant)) {
        setOnboardingCompleted(true);
        supabase.from("profiles").update({ onboarding_completed: true } as any).eq("id", userId).then(() => {});
      }

      const savedRole = (() => {
        try { return localStorage.getItem(`easylocs_active_role_${userId}`); } catch { return null; }
      })();
      if (dual && savedRole && (savedRole === "landlord" || savedRole === "tenant")) {
        setActiveRole(savedRole);
      } else if (dual || hasOrg) {
        setActiveRole("landlord");
      } else if (hasTenant) {
        setActiveRole("tenant");
      } else {
        setActiveRole("client");
      }
    } catch (err) {
      console.warn("[AuthContext] fetchDualRoleDeferred failed:", err);
      setActiveRole("landlord");
      setHasDualRole(false);
    }
  }, [onboardingCompleted]);

  const refreshProfile = useCallback(async () => {
    if (user) {
      await ensureOrbitProfile({
        userId: user.id,
        email: user.email ?? null,
        displayName: (user.user_metadata as any)?.display_name ?? (user.user_metadata as any)?.full_name ?? null,
        avatarUrl: (user.user_metadata as any)?.avatar_url ?? null,
      });
      const orgIds = await fetchOrgIdFast(user.id);
      await Promise.all([fetchProfileCritical(user.id), fetchOrgDetails(orgIds)]);
      await fetchDualRoleDeferred(user.id);
    }
  }, [user, fetchProfileCritical, fetchOrgIdFast, fetchOrgDetails, fetchDualRoleDeferred]);

  const switchRole = useCallback((role: ActiveRole) => {
    setActiveRole(role);
    if (user) {
      try {
        localStorage.setItem(`easylocs_active_role_${user.id}`, role);
      } catch {
        // ignore storage errors
      }
    }
  }, [user]);

  const switchOrg = useCallback((newOrgId: string) => {
    setOrgId(newOrgId);
    if (user) {
      try {
        localStorage.setItem(`easylocs_active_org_${user.id}`, newOrgId);
      } catch {
        // ignore storage errors
      }
    }
  }, [user]);

  const { subscription, refreshSubscription, resetSubscription } = useSubscriptionLoader(session, user?.id);
  const refreshSubRef = useCallback(() => refreshSubscription(), [refreshSubscription]);

  useEffect(() => {
    let mounted = true;
    let latestSeq = 0;
    const safetyTimeout = window.setTimeout(() => {
      if (!mounted) return;
      console.warn("[AuthContext] safety timeout reached — unblocking loading state");
      setLoading(false);
    }, 5000);

    markV1AuthActive();

    const hydrateAuthState = async (nextSession: Session | null) => {
      const seq = ++latestSeq;
      const { traceId } = getActiveTrace();
      const hydrateTraceId = traceId || crypto.randomUUID();

      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      useV2AuthStore.getState().syncFromV1(nextSession);

      if (nextSession?.user) {
        const userId = nextSession.user.id;

        // ensureOrbitProfile is fire-and-forget — must never block login
        void ensureOrbitProfile({
          userId,
          email: nextSession.user.email ?? null,
          displayName: (nextSession.user.user_metadata as any)?.display_name ?? (nextSession.user.user_metadata as any)?.full_name ?? null,
          avatarUrl: (nextSession.user.user_metadata as any)?.avatar_url ?? null,
        }).catch(() => null);

        authLog("LOGIN_PROFILE_HYDRATE_STARTED", { traceId: hydrateTraceId, userId });
        const hydrateStart = Date.now();

        try {
          await fetchOrgId(userId);
          if (seq !== latestSeq) return;
          await fetchUserType(userId);
          if (seq !== latestSeq) return;

          const hydrateDuration = Date.now() - hydrateStart;
          authLog("LOGIN_PROFILE_HYDRATE_RESULT", {
            traceId: hydrateTraceId, success: true, error: null, durationMs: hydrateDuration,
          });
        } catch (err: any) {
          const hydrateDuration = Date.now() - hydrateStart;
          authError("LOGIN_PROFILE_HYDRATE_RESULT", {
            traceId: hydrateTraceId, success: false,
            error: err?.message ?? "UNKNOWN", durationMs: hydrateDuration,
            step: "LOGIN_PROFILE_HYDRATE_RESULT",
          });
          // Non-blocking retry after 2s if profile load failed
          setTimeout(() => {
            void (async () => {
              try {
                await fetchOrgId(userId);
                await fetchUserType(userId);
              } catch (retryErr: any) {
                authWarn("LOGIN_PROFILE_HYDRATE_RESULT", {
                  traceId: hydrateTraceId, success: false,
                  error: retryErr?.message ?? "RETRY_FAILED",
                  durationMs: Date.now() - hydrateStart, retryAttempt: true,
                });
              }
            })();
          }, 2000);
        }
        setTimeout(() => {
          void refreshSubRef();
        }, 500);
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
        bootstrapOrbitRef.current = null;
      }

      if (mounted && seq === latestSeq) setLoading(false);
    };

    const { data: { subscription: authSub } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (_event === "SIGNED_IN" && nextSession?.user) {
        logAudit({ userId: nextSession.user.id, action: "user_login" });
        // ensureOrbitProfile is already called inside hydrateAuthState — no duplicate here
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
    });

    return () => {
      mounted = false;
      window.clearTimeout(safetyTimeout);
      authSub.unsubscribe();
    };
  }, [fetchOrgId, fetchUserType, refreshSubRef, resetSubscription]);

  useEffect(() => {
    if (!user?.id || bootstrapOrbitRef.current === user.id) return;
    bootstrapOrbitRef.current = user.id;
    void ensureOrbitProfile({
      userId: user.id,
      email: user.email ?? null,
      displayName: (user.user_metadata as any)?.display_name ?? (user.user_metadata as any)?.full_name ?? null,
      avatarUrl: (user.user_metadata as any)?.avatar_url ?? null,
    }).catch((err) => {
      console.error("[AuthContext] orbit bootstrap failed:", err);
      bootstrapOrbitRef.current = null;
    });
  }, [user]);

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
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        profileLoaded,
        emailVerified,
        orgId,
        allOrgs,
        switchOrg,
        userType,
        userCountry,
        userCurrency,
        onboardingCompleted,
        subscription,
        activeRole,
        hasDualRole,
        switchRole,
        refreshSubscription,
        refreshProfile,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
