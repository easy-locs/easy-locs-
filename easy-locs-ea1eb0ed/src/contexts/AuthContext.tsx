/**
 * AUTH DEPENDENCY: AuthContext.tsx — Canonical auth state provider.
 * Contact points:
 *   - useAuth() consumed by: ProtectedRoute, all protected pages, AuthDiagnosticPage
 *   - Sole listener of supabase.auth.onAuthStateChange (no other component calls it directly)
 *   - Syncs to Zustand via useAuthStore.syncFromAuth()
 *   - Calls: profile.repository (fetchUserOrgIds, fetchProfileCriticalFields, fetchDualRoleData)
 *   - Calls: ensureOrbitProfile (fire-and-forget)
 *   - Calls: session-lifecycle.initSessionLifecycle() on mount
 *   - Calls: auth-trace for structured login tracing
 * No direct supabase.auth mutation (sign-in/sign-up) — all mutations go through auth.repository
 */
import { createContext, useContext, useEffect, useState, useCallback, useRef, useMemo } from "react";
import { db as supabase } from "@/services/db";
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
import { useAuthStore } from "@/stores/auth.store";
import { useSubscriptionLoader, defaultSubscription, type SubscriptionState } from "@/hooks/useSubscription";
import { authLog, authWarn, authError, getActiveTrace } from "@/lib/auth/auth-trace";
import { structuredLogger } from "@/lib/observability/structured-logger";
import { setProfileCountry } from "@/lib/wallet/wallet-config";
import { autoDetectAndSwitchLocale } from "@/domains/i18n/pipelines/locale-switch.pipeline";

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

const AUTH_CACHE_KEY = "easylocs_auth_cache_v1";
const SESSION_RETRY_DELAYS = [500, 1_000];

function getCachedAuth(): { userId: string; email: string; userType: UserType; country: string; currency: string; onboardingCompleted: boolean; role: ActiveRole } | null {
  try {
    const raw = localStorage.getItem(AUTH_CACHE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data?.userId || Date.now() - (data.ts || 0) > 7 * 24 * 60 * 60 * 1000) return null;
    return data;
  } catch { return null; }
}

function setCachedAuth(userId: string, email: string, ut: UserType, country: string, currency: string, onboardingCompleted: boolean, role: ActiveRole) {
  try {
    localStorage.setItem(AUTH_CACHE_KEY, JSON.stringify({ userId, email, userType: ut, country, currency, onboardingCompleted, role, ts: Date.now() }));
  } catch {}
}

function clearCachedAuth() {
  try { localStorage.removeItem(AUTH_CACHE_KEY); } catch {}
}

async function getSessionWithRetry(hasCachedAuth: boolean): Promise<{ session: import("@supabase/supabase-js").Session | null }> {
  for (let attempt = 0; attempt <= SESSION_RETRY_DELAYS.length; attempt++) {
    try {
      const { data } = await supabase.auth.getSession();
      console.log(`[AuthContext] getSession attempt ${attempt + 1}: ${data.session ? "restored" : "no session"}`);
      if (data.session) return data;
      if (!hasCachedAuth) return data;
      if (attempt >= SESSION_RETRY_DELAYS.length) return data;
      console.log(`[AuthContext] Cached auth exists but session null — retrying in ${SESSION_RETRY_DELAYS[attempt]}ms`);
      await new Promise(r => setTimeout(r, SESSION_RETRY_DELAYS[attempt]));
    } catch (err) {
      console.warn(`[AuthContext] getSession attempt ${attempt + 1} failed:`, err);
      if (attempt < SESSION_RETRY_DELAYS.length) {
        await new Promise(r => setTimeout(r, SESSION_RETRY_DELAYS[attempt]));
      }
    }
  }
  console.error("[AuthContext] getSession exhausted all retries");
  return { session: null };
}

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  useEffect(() => { initSessionLifecycle(); }, []);

  const cached = getCachedAuth();
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [sessionValidating, setSessionValidating] = useState(!!cached);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [userType, setUserType] = useState<UserType>(cached?.userType ?? "landlord");
  const [userCountry, setUserCountry] = useState(cached?.country ?? "FR");
  const [userCurrency, setUserCurrency] = useState(cached?.currency ?? "EUR");
  const [onboardingCompleted, setOnboardingCompleted] = useState(cached?.onboardingCompleted ?? true);
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
      structuredLogger.error("auth", "runtime_failure", "DB health check failed during login hydration");
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
      const country = data?.country ?? "FR";
      setUserType(ut);
      setUserCountry(country);
      setUserCurrency(data?.currency ?? "EUR");
      setOnboardingCompleted(data?.onboarding_completed ?? false);
      setProfileLoaded(true);
      setProfileCountry(country);
      autoDetectAndSwitchLocale(country).catch(() => {});
      setCachedAuth(userId, "", ut, country, data?.currency ?? "EUR", data?.onboarding_completed ?? false, ut === "landlord" ? "landlord" : "client");
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

      const validRoles: ActiveRole[] = [];
      if (hasOrg) validRoles.push("landlord");
      if (hasTenant) validRoles.push("tenant");
      if (validRoles.length === 0) validRoles.push("client");

      const savedRole = (() => {
        try { return localStorage.getItem(`easylocs_active_role_${userId}`); } catch { return null; }
      })();

      if (savedRole && validRoles.includes(savedRole as ActiveRole)) {
        setActiveRole(savedRole as ActiveRole);
      } else if (hasOrg) {
        setActiveRole("landlord");
      } else if (hasTenant) {
        setActiveRole("tenant");
      } else {
        setActiveRole("client");
      }
    } catch (err) {
      console.warn("[AuthContext] DB slow → fetchDualRoleDeferred fallback safe:", err);
      setActiveRole("client");
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
      structuredLogger.warn("auth", "runtime_failure", "Auth hydration safety timeout reached (1500ms)");
      setLoading(false);
      setProfileLoaded(true);
    }, 1500);

    const hydrateAuthState = async (nextSession: Session | null) => {
      const seq = ++latestSeq;
      const { traceId } = getActiveTrace();
      const hydrateTraceId = traceId || (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function" ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now().toString(36));

      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      useAuthStore.getState().syncFromAuth(nextSession);

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
        } catch (err) {
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
            error: err instanceof Error ? err.message : "UNKNOWN", durationMs: Date.now() - hydrateStart,
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
              } catch (retryErr) {
                authWarn("LOGIN_PROFILE_HYDRATE_RESULT", {
                  traceId: hydrateTraceId, success: false,
                  error: retryErr instanceof Error ? retryErr.message : "RETRY_FAILED",
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
              } catch (deferredErr) {
                authWarn("LOGIN_PROFILE_HYDRATE_RESULT", {
                  traceId: hydrateTraceId, success: false,
                  error: deferredErr instanceof Error ? deferredErr.message : "DEFERRED_FAILED",
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

    getSessionWithRetry(!!cached).then(({ session: restoredSession }) => {
      if (!mounted) return;
      clearTimeout(safetyTimeout);
      setSessionValidating(false);
      if (!restoredSession && cached) {
        console.warn("[AuthContext] Session restore failed after retries — cache was present, marking expired");
        setSessionExpired(true);
        clearCachedAuth();
        setLoading(false);
        setProfileLoaded(true);
        return;
      }
      hydrateAuthState(restoredSession).catch((err) => {
        console.error("[AuthContext] hydrateAuthState crashed:", err);
        if (mounted) { setLoading(false); setProfileLoaded(true); }
      });
    }).catch((err) => {
      if (!mounted) return;
      clearTimeout(safetyTimeout);
      setSessionValidating(false);
      console.warn("[AuthContext] getSession failed:", err);
      if (cached) {
        setSessionExpired(true);
        clearCachedAuth();
      }
      setLoading(false);
      setProfileLoaded(true);
    });

    // Listen for subsequent auth changes (login, logout, token refresh)
    const { data: { subscription: authSub } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      // Skip INITIAL_SESSION — already handled by getSession above
      if (_event === "INITIAL_SESSION") return;

      if (_event === "SIGNED_IN" && nextSession?.user) {
        logAudit({ userId: nextSession.user.id, action: "user_login" });
        void import("@/lib/analytics/sentry").then(m => m.setUserContext(nextSession.user.id, nextSession.user.email ?? undefined, { role: activeRole, orgId: orgId ?? undefined })).catch(() => {});
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
        void import("@/lib/analytics/sentry").then(m => m.clearUserContext()).catch(() => {});
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

  const isPhoneUser = !!(user?.phone && (user.user_metadata as any)?.signup_method === "phone");
  const emailVerified = !!user?.email_confirmed_at || isPhoneUser;

  const signOut = useCallback(async () => {
    teardownSession();
    clearCachedAuth();

    await supabase.auth.signOut().catch((err) => {
      structuredLogger.warn("auth", "runtime_failure", err instanceof Error ? err.message : "Sign-out error");
    });
    setUser(null);
    setSession(null);
    setOrgId(null);
    setUserType("landlord");
    setUserCountry("FR");
    setUserCurrency("EUR");
    setOnboardingCompleted(false);
    setProfileLoaded(false);
    setProfileCountry(null);
    resetSubscription();
    setActiveRole("landlord");
    setHasDualRole(false);
  }, [resetSubscription]);

  useEffect(() => {
    if (!user?.id) return;
    void import("@/lib/analytics/sentry").then(m => {
      m.setUserContext(user.id, user.email ?? undefined, { role: activeRole, orgId: orgId ?? undefined });
    }).catch(() => {});
  }, [user?.id, user?.email, activeRole, orgId]);

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
      {sessionValidating && !user && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, zIndex: 9999,
          background: "hsl(var(--accent))", color: "#fff",
          padding: "6px 16px", fontSize: "13px", textAlign: "center",
        }}>
          Restoring your session…
        </div>
      )}
      {sessionExpired && !user && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, zIndex: 9999,
          background: "hsl(0 65% 50%)", color: "#fff",
          padding: "8px 16px", fontSize: "13px", textAlign: "center",
          display: "flex", alignItems: "center", justifyContent: "center", gap: "12px",
        }}>
          <span>Your session has expired. Please sign in again.</span>
          <button
            onClick={() => { setSessionExpired(false); window.location.hash = "#/login"; }}
            style={{
              background: "#fff", color: "hsl(0 65% 50%)",
              border: "none", borderRadius: "4px", padding: "4px 12px",
              cursor: "pointer", fontWeight: 600, fontSize: "12px",
            }}
          >
            Sign In
          </button>
        </div>
      )}
      {children}
    </AuthContext.Provider>
  );
};
