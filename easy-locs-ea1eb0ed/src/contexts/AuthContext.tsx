import { createContext, useContext, useEffect, useState, useCallback, useRef, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { initSessionLifecycle, teardownSession } from "@/lib/lifecycle/session-lifecycle";
import {
  probeDbHealth,
  fetchUserOrgIds,
  fetchOrgsByIds,
  fetchProfileCriticalFields,
  fetchDualRoleData,
  markOnboardingCompleted,
} from "@/repositories/profile.repository";
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
  // ── Initialize session lifecycle hooks (online recovery, etc.) ──
  useEffect(() => { initSessionLifecycle(); }, []);

  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [userType, setUserType] = useState<UserType>("landlord");
  const [userCountry, setUserCountry] = useState("FR");
  const [userCurrency, setUserCurrency] = useState("EUR");
  const [onboardingCompleted, setOnboardingCompleted] = useState(true);
  const [activeRole, setActiveRole] = useState<ActiveRole>("landlord");
  const [hasDualRole, setHasDualRole] = useState(false);
  const [allOrgs, setAllOrgs] = useState<{ id: string; name: string; country: string; currency: string }[]>([]);
  const bootstrapOrbitRef = useRef<string | null>(null);

  // ── Shared timeout helper ──
  const AUTH_QUERY_TIMEOUT = 4_000;
  const withTimeout = useCallback(<T,>(thenable: PromiseLike<T>, label: string, customMs?: number): Promise<T> =>
    Promise.race([
      Promise.resolve(thenable),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(`${label} timed out (${customMs ?? AUTH_QUERY_TIMEOUT}ms)`)), customMs ?? AUTH_QUERY_TIMEOUT)
      ),
    ]), []);

  // ── DB Health Check — fire-and-forget probe ──
  const checkDbHealth = useCallback(async (traceId: string) => {
    try {
      const start = Date.now();
      const isUp = await withTimeout(probeDbHealth(), "DB_HEALTH_CHECK");
      authLog("LOGIN_PROFILE_HYDRATE_RESULT", {
        traceId, step: "DB_HEALTH", status: isUp ? "UP" : "DOWN", durationMs: Date.now() - start,
      });
      return isUp;
    } catch {
      authWarn("LOGIN_PROFILE_HYDRATE_RESULT", {
        traceId, step: "DB_HEALTH", status: "DOWN",
      });
      return false;
    }
  }, [withTimeout]);

  // ── Critical path: minimal query for fast hydration ──
  const fetchOrgIdFast = useCallback(async (userId: string) => {
    try {
      const orgIds = await withTimeout(fetchUserOrgIds(userId), "fetchOrgIdFast");

      if (orgIds.length > 0) {
        const savedOrg = (() => {
          try { return localStorage.getItem(`easylocs_active_org_${userId}`); } catch { return null; }
        })();
        const selectedOrgId = savedOrg && orgIds.includes(savedOrg) ? savedOrg : orgIds[0];
        setOrgId(selectedOrgId);
        return orgIds;
      } else {
        setOrgId(null);
        return [];
      }
    } catch (err) {
      console.warn("[AuthContext] DB slow → fetchOrgIdFast fallback safe:", err);
      setOrgId(null);
      return [];
    }
  }, [withTimeout]);

  // ── Deferred: full org details (names, etc.) ──
  const fetchOrgDetails = useCallback(async (orgIds: string[]) => {
    if (orgIds.length === 0) { setAllOrgs([]); return; }
    try {
      const orgsData = await withTimeout(fetchOrgsByIds(orgIds), "fetchOrgDetails");
      setAllOrgs((orgsData || []).map((o) => ({
        id: o.id, name: o.name || "Unnamed", country: "", currency: "EUR",
      })));
    } catch (err) {
      console.warn("[AuthContext] DB slow → fetchOrgDetails fallback safe:", err);
      setAllOrgs([]);
    }
  }, [withTimeout]);

  // ── Critical: profile basics only (1 query) ──
  const fetchProfileCritical = useCallback(async (userId: string) => {
    try {
      const data = await withTimeout(fetchProfileCriticalFields(userId), "fetchProfileCritical");

      const ut = (data?.user_type as UserType) ?? "landlord";
      setUserType(ut);
      setUserCountry(data?.country ?? "FR");
      setUserCurrency(data?.currency ?? "EUR");
      setOnboardingCompleted(data?.onboarding_completed ?? false);
      setProfileLoaded(true);
    } catch (err) {
      console.warn("[AuthContext] DB slow → fetchProfileCritical fallback safe:", err);
      setUserType("client");
      setUserCountry("FR");
      setUserCurrency("EUR");
      setOnboardingCompleted(true);
      setProfileLoaded(true);
    }
  }, [withTimeout]);

  // ── Deferred: dual-role detection + role resolution ──
  const fetchDualRoleDeferred = useCallback(async (userId: string) => {
    try {
      const { hasTenant, hasOrg } = await withTimeout(fetchDualRoleData(userId), "fetchDualRole");
      const dual = hasTenant && hasOrg;
      setHasDualRole(dual);

      if (!onboardingCompleted && (hasOrg || hasTenant)) {
        setOnboardingCompleted(true);
        markOnboardingCompleted(userId);
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
      console.warn("[AuthContext] DB slow → fetchDualRoleDeferred fallback safe:", err);
      setActiveRole("landlord");
      setHasDualRole(false);
    }
  }, [onboardingCompleted, withTimeout]);

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
      setProfileLoaded(true);
    }, 2500);

    markV1AuthActive();

    const hydrateAuthState = async (nextSession: Session | null) => {
      const seq = ++latestSeq;
      const { traceId } = getActiveTrace();
      const hydrateTraceId = traceId || (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function" ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now().toString(36));

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

        // DB health probe (non-blocking, just logs)
        void checkDbHealth(hydrateTraceId);

        authLog("LOGIN_PROFILE_HYDRATE_STARTED", { traceId: hydrateTraceId, userId, phase: "critical" });
        const hydrateStart = Date.now();

        // CRITICAL PATH: orgId + profile basics in parallel, with guaranteed fallback
        let orgIds: string[] = [];
        try {
          const [fetchedOrgIds] = await Promise.all([
            fetchOrgIdFast(userId),
            fetchProfileCritical(userId),
          ]);
          orgIds = fetchedOrgIds;
          if (seq !== latestSeq) return;

          authLog("LOGIN_PROFILE_HYDRATE_RESULT", {
            traceId: hydrateTraceId, success: true, error: null,
            durationMs: Date.now() - hydrateStart, phase: "critical",
          });
        } catch (err: any) {
          // DB is down — apply safe defaults, NEVER block navigation
          console.warn("[AuthContext] DB slow → critical hydration fallback safe:", err);
          setOrgId(null);
          setUserType("client");
          setUserCountry("FR");
          setUserCurrency("EUR");
          setOnboardingCompleted(false);
          setProfileLoaded(true);
          setActiveRole("client");
          setHasDualRole(false);
          setAllOrgs([]);

          authError("LOGIN_PROFILE_HYDRATE_RESULT", {
            traceId: hydrateTraceId, success: false,
            error: err?.message ?? "UNKNOWN", durationMs: Date.now() - hydrateStart,
            step: "CRITICAL_HYDRATION_FALLBACK",
          });

          // Schedule background retry
          setTimeout(() => {
            void (async () => {
              try {
                const retryOrgIds = await fetchOrgIdFast(userId);
                await fetchProfileCritical(userId);
                await fetchOrgDetails(retryOrgIds);
                await fetchDualRoleDeferred(userId);
              } catch (retryErr: any) {
                authWarn("LOGIN_PROFILE_HYDRATE_RESULT", {
                  traceId: hydrateTraceId, success: false,
                  error: retryErr?.message ?? "RETRY_FAILED",
                  retryAttempt: true,
                });
              }
            })();
          }, 3000);
        }

        // DEFERRED: org details, dual-role, subscription — always non-blocking
        if (orgIds.length > 0 || seq === latestSeq) {
          setTimeout(() => {
            void (async () => {
              try {
                await fetchOrgDetails(orgIds);
                await fetchDualRoleDeferred(userId);
              } catch (deferredErr: any) {
                authWarn("LOGIN_PROFILE_HYDRATE_RESULT", {
                  traceId: hydrateTraceId, success: false,
                  error: deferredErr?.message ?? "DEFERRED_FAILED",
                  phase: "deferred",
                });
              }
            })();
          }, 100);
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
        setProfileLoaded(true);
        resetSubscription();
        setActiveRole("landlord");
        setHasDualRole(false);
        setAllOrgs([]);
        bootstrapOrbitRef.current = null;
      }

      // GUARANTEE: loading ALWAYS set to false — navigation NEVER blocked
      if (mounted && seq === latestSeq) setLoading(false);
    };

    supabase.auth.getSession().then(({ data: { session: restoredSession } }) => {
      if (!mounted) return;
      clearTimeout(safetyTimeout);
      hydrateAuthState(restoredSession).catch((err) => {
        console.error("[AuthContext] hydrateAuthState crashed:", err);
        if (mounted) { setLoading(false); setProfileLoaded(true); }
      });
    }).catch((err) => {
      if (!mounted) return;
      clearTimeout(safetyTimeout);
      console.warn("[AuthContext] getSession failed:", err);
      setLoading(false);
      setProfileLoaded(true);
    });

    // Listen for subsequent auth changes (login, logout, token refresh)
    const { data: { subscription: authSub } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      // Skip INITIAL_SESSION — already handled by getSession above
      if (_event === "INITIAL_SESSION") return;

      if (_event === "SIGNED_IN" && nextSession?.user) {
        logAudit({ userId: nextSession.user.id, action: "user_login" });
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
  }, [fetchOrgIdFast, fetchProfileCritical, fetchOrgDetails, fetchDualRoleDeferred, checkDbHealth, refreshSubRef, resetSubscription]);

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

  const signOut = useCallback(async () => {
    teardownSession();

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
  }, [resetSubscription]);

  const contextValue = useMemo(() => ({
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
  }), [
    user, session, loading, profileLoaded, emailVerified, orgId, allOrgs,
    switchOrg, userType, userCountry, userCurrency, onboardingCompleted,
    subscription, activeRole, hasDualRole, switchRole, refreshSubscription,
    refreshProfile, signOut,
  ]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};
