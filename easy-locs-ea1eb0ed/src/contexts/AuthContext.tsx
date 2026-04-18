/**
 * AUTH DEPENDENCY: AuthContext.tsx — Split into 3 atomic contexts for performance.
 * AuthSessionContext: session/token/loading (changes rarely)
 * AuthProfileContext: profile/role/org (changes on profile updates)
 * AuthActionsContext: actions only (stable references, never triggers re-renders)
 *
 * Backward-compatible: useAuth() still works and returns the full combined type.
 * New consumers should use useAuthSession(), useAuthProfile(), useAuthActions().
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
import { clearReferralCaches } from "@/lib/referral-cache";
import { setProfileCountry } from "@/lib/wallet/wallet-config";
import { autoDetectAndSwitchLocale } from "@/domains/i18n/pipelines/locale-switch.pipeline";
import { queryClient } from "@/lib/query-client";

type UserType = "landlord" | "tenant" | "client";
type ActiveRole = "landlord" | "tenant" | "client";

interface AuthSessionContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  profileLoaded: boolean;
  emailVerified: boolean;
}

interface AuthProfileContextType {
  orgId: string | null;
  allOrgs: { id: string; name: string; country: string; currency: string }[];
  userType: UserType;
  userCountry: string;
  userCurrency: string;
  onboardingCompleted: boolean;
  subscription: SubscriptionState;
  activeRole: ActiveRole;
  hasDualRole: boolean;
}

interface AuthActionsContextType {
  switchOrg: (orgId: string) => void;
  switchRole: (role: ActiveRole) => void;
  refreshSubscription: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
}

interface AuthContextType extends AuthSessionContextType, AuthProfileContextType, AuthActionsContextType {}

const AuthSessionContext = createContext<AuthSessionContextType>({
  user: null,
  session: null,
  loading: true,
  profileLoaded: false,
  emailVerified: false,
});

const AuthProfileContext = createContext<AuthProfileContextType>({
  orgId: null,
  allOrgs: [],
  userType: "landlord",
  userCountry: "FR",
  userCurrency: "EUR",
  onboardingCompleted: false,
  subscription: defaultSubscription,
  activeRole: "landlord",
  hasDualRole: false,
});

const AuthActionsContext = createContext<AuthActionsContextType>({
  switchOrg: () => {},
  switchRole: () => {},
  refreshSubscription: async () => {},
  refreshProfile: async () => {},
  signOut: async () => {},
});

export const useAuthSession = () => useContext(AuthSessionContext);
export const useAuthProfile = () => useContext(AuthProfileContext);
export const useAuthActions = () => useContext(AuthActionsContext);

export const useAuth = (): AuthContextType => {
  const session = useContext(AuthSessionContext);
  const profile = useContext(AuthProfileContext);
  const actions = useContext(AuthActionsContext);
  return useMemo(() => ({ ...session, ...profile, ...actions }), [session, profile, actions]);
};

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

const GET_SESSION_TIMEOUT_MS = 6000;

function getSessionWithTimeout(): Promise<{ session: import("@supabase/supabase-js").Session | null }> {
  return new Promise((resolve) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      console.warn(`[AuthContext] getSession timed out after ${GET_SESSION_TIMEOUT_MS}ms — treating as no session (network may be filtering Supabase)`);
      resolve({ session: null });
    }, GET_SESSION_TIMEOUT_MS);
    supabase.auth.getSession()
      .then((res) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve({ session: res.data.session });
      })
      .catch((err) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        console.warn("[AuthContext] getSession threw:", err);
        resolve({ session: null });
      });
  });
}

async function getSessionWithRetry(hasCachedAuth: boolean): Promise<{ session: import("@supabase/supabase-js").Session | null }> {
  for (let attempt = 0; attempt <= SESSION_RETRY_DELAYS.length; attempt++) {
    try {
      const data = await getSessionWithTimeout();
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
  const authInitRef = useRef(false);

  const AUTH_QUERY_TIMEOUT = 4_000;
  const withTimeout = useCallback(<T,>(thenable: PromiseLike<T>, label: string, customMs?: number): Promise<T> =>
    Promise.race([
      Promise.resolve(thenable),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(`${label} timed out (${customMs ?? AUTH_QUERY_TIMEOUT}ms)`)), customMs ?? AUTH_QUERY_TIMEOUT)
      ),
    ]), []);

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

  const fetchProfileCritical = useCallback(async (userId: string): Promise<{ userType: UserType; country: string; currency: string; onboardingCompleted: boolean; fromCache: boolean }> => {
    try {
      const data = await withTimeout(fetchProfileCriticalFields(userId), "fetchProfileCritical");

      const ut = (data?.user_type as UserType) ?? "landlord";
      const country = data?.country ?? "FR";
      const currency = data?.currency ?? "EUR";
      const onboardingCompleted = data?.onboarding_completed ?? false;
      setCachedAuth(userId, "", ut, country, currency, onboardingCompleted, ut === "landlord" ? "landlord" : "client");
      return { userType: ut, country, currency, onboardingCompleted, fromCache: false };
    } catch (err) {
      console.warn("[AuthContext] DB slow → fetchProfileCritical fallback safe:", err);
      const cachedAuth = getCachedAuth();
      return {
        userType: cachedAuth?.userType ?? "client",
        country: cachedAuth?.country ?? "FR",
        currency: cachedAuth?.currency ?? "EUR",
        onboardingCompleted: cachedAuth?.onboardingCompleted ?? true,
        fromCache: true,
      };
    }
  }, [withTimeout]);

  const applyProfileData = useCallback((profile: { userType: UserType; country: string; currency: string; onboardingCompleted: boolean }) => {
    setUserType(profile.userType);
    setUserCountry(profile.country);
    setUserCurrency(profile.currency);
    setOnboardingCompleted(profile.onboardingCompleted);
    setProfileLoaded(true);
    setProfileCountry(profile.country);
    autoDetectAndSwitchLocale(profile.country).catch(() => {});
  }, []);

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
      const cachedRole = (() => {
        try { return localStorage.getItem(`easylocs_active_role_${userId}`); } catch { return null; }
      })();
      const cachedAuth = getCachedAuth();
      setActiveRole((cachedRole as ActiveRole) ?? cachedAuth?.role ?? "client");
      setHasDualRole(false);
    }
  }, [onboardingCompleted, withTimeout]);

  const refreshProfile = useCallback(async () => {
    if (user) {
      await ensureOrbitProfile({
        userId: user.id,
        email: user.email ?? null,
        displayName: ((user.user_metadata as { display_name?: string; full_name?: string } | null)?.display_name)
          ?? ((user.user_metadata as { display_name?: string; full_name?: string } | null)?.full_name)
          ?? null,
        avatarUrl: (user.user_metadata as { avatar_url?: string } | null)?.avatar_url ?? null,
      });
      const orgIds = await fetchOrgIdFast(user.id);
      const [profileData] = await Promise.all([fetchProfileCritical(user.id), fetchOrgDetails(orgIds)]);
      applyProfileData(profileData);
      await fetchDualRoleDeferred(user.id);
    }
  }, [user, fetchProfileCritical, applyProfileData, fetchOrgIdFast, fetchOrgDetails, fetchDualRoleDeferred]);

  const switchRole = useCallback((role: ActiveRole) => {
    setActiveRole(role);
    if (user) {
      try {
        localStorage.setItem(`easylocs_active_role_${user.id}`, role);
      } catch {
      }
    }
  }, [user]);

  const switchOrg = useCallback((newOrgId: string) => {
    setOrgId(newOrgId);
    if (user) {
      try {
        localStorage.setItem(`easylocs_active_org_${user.id}`, newOrgId);
      } catch {
      }
    }
  }, [user]);

  const { subscription, refreshSubscription, resetSubscription } = useSubscriptionLoader(session, user?.id);
  const refreshSubRef = useCallback(() => refreshSubscription(), [refreshSubscription]);

  useEffect(() => {
    if (authInitRef.current) return;
    authInitRef.current = true;

    let mounted = true;
    let latestSeq = 0;
    // Safety timeout must be longer than getSessionWithRetry's max wait
    // (1 attempt * 6s + retries 500+1000ms = ~7.5s) so a slow Supabase response
    // does not flash route guards into their "no user" branch and bounce a
    // logged-in user to /login on a hard refresh. When we have cached auth we
    // wait the full window; without cached auth we exit faster.
    const SAFETY_TIMEOUT_MS = cached ? 9000 : 4000;
    const safetyTimeout = window.setTimeout(() => {
      if (!mounted) return;
      console.warn(`[AuthContext] safety timeout reached (${SAFETY_TIMEOUT_MS}ms) — unblocking loading state`);
      structuredLogger.warn("auth", "runtime_failure", `Auth hydration safety timeout reached (${SAFETY_TIMEOUT_MS}ms)`);
      setLoading(false);
      setProfileLoaded(true);
      setSessionValidating(false);
    }, SAFETY_TIMEOUT_MS);

    const hydrateAuthState = async (nextSession: Session | null) => {
      const seq = ++latestSeq;
      const { traceId } = getActiveTrace();
      const hydrateTraceId = traceId || (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function" ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now().toString(36));

      if (nextSession?.user) {
        const userId = nextSession.user.id;

        if (bootstrapOrbitRef.current !== userId) {
          bootstrapOrbitRef.current = userId;
          void ensureOrbitProfile({
            userId,
            email: nextSession.user.email ?? null,
            displayName: ((nextSession.user.user_metadata as { display_name?: string; full_name?: string } | null)?.display_name)
              ?? ((nextSession.user.user_metadata as { display_name?: string; full_name?: string } | null)?.full_name)
              ?? null,
            avatarUrl: (nextSession.user.user_metadata as { avatar_url?: string } | null)?.avatar_url ?? null,
          }).catch(() => { bootstrapOrbitRef.current = null; });
        }

        void checkDbHealth(hydrateTraceId);

        authLog("LOGIN_PROFILE_HYDRATE_STARTED", { traceId: hydrateTraceId, userId, phase: "critical" });
        const hydrateStart = Date.now();

        let orgIds: string[] = [];
        try {
          const [fetchedOrgIds, profileData] = await Promise.all([
            fetchOrgIdFast(userId),
            fetchProfileCritical(userId),
          ]);
          orgIds = fetchedOrgIds;
          if (seq !== latestSeq) return;

          setSession(nextSession);
          setUser(nextSession.user);
          useAuthStore.getState().syncFromAuth(nextSession);
          applyProfileData(profileData);

          authLog("LOGIN_PROFILE_HYDRATE_RESULT", {
            traceId: hydrateTraceId, success: true, error: null,
            durationMs: Date.now() - hydrateStart, phase: "critical",
          });
        } catch (err) {
          if (seq !== latestSeq) return;

          setSession(nextSession);
          setUser(nextSession.user);
          useAuthStore.getState().syncFromAuth(nextSession);

          console.warn("[AuthContext] DB slow → critical hydration fallback safe:", err);
          const cachedRole = (() => {
            try { return localStorage.getItem(`easylocs_active_role_${userId}`); } catch { return null; }
          })();
          const cachedAuth = getCachedAuth();

          setOrgId(null);
          setUserType(cachedAuth?.userType ?? "client");
          setUserCountry(cachedAuth?.country ?? "FR");
          setUserCurrency(cachedAuth?.currency ?? "EUR");
          setOnboardingCompleted(cachedAuth?.onboardingCompleted ?? false);
          setProfileLoaded(true);
          setActiveRole((cachedRole as ActiveRole) ?? cachedAuth?.role ?? "client");
          setHasDualRole(false);
          setAllOrgs([]);

          authError("LOGIN_PROFILE_HYDRATE_RESULT", {
            traceId: hydrateTraceId, success: false,
            error: err instanceof Error ? err.message : "UNKNOWN", durationMs: Date.now() - hydrateStart,
            step: "CRITICAL_HYDRATION_FALLBACK",
          });

          setTimeout(() => {
            void (async () => {
              try {
                const retryOrgIds = await fetchOrgIdFast(userId);
                const retryProfile = await fetchProfileCritical(userId);
                applyProfileData(retryProfile);
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

        if (seq === latestSeq) {
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
        setSession(null);
        setUser(null);
        useAuthStore.getState().syncFromAuth(null);
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

    const { data: { subscription: authSub } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
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
        clearReferralCaches();
      }
      // Drop any cached role/admin lookup so the next render reflects the
      // new session immediately (sign-in, sign-out, token refresh, user swap).
      if (_event === "SIGNED_IN" || _event === "SIGNED_OUT" || _event === "TOKEN_REFRESHED" || _event === "USER_UPDATED") {
        queryClient.removeQueries({ queryKey: ["auth", "is-admin"] });
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
    const interval = setInterval(() => {
      supabase.auth.getSession();
    }, 25 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Phone-OTP detection (defensive — never trap phone users on /verify-email).
  // A phone-OTP user is verified once Supabase has stamped `phone_confirmed_at`
  // (PhoneOTPFlow → verifyOtp). Historically the `signup_method === "phone"`
  // metadata flag was not written by every signup path, so relying on it alone
  // left phone-only users permanently bouncing to /verify-email. We accept any
  // of:
  //   - email_confirmed_at  → email signup verified (handled below in emailVerified)
  //   - phone_confirmed_at  → phone signup verified (Supabase native field)
  //   - explicit signup_method === "phone" tag (set by Signup.tsx — kept for
  //     backward compatibility)
  //   - user.phone present + user.email empty/null → phone-only account (defensive)
  // Narrow access through a typed view rather than `as any`. The
  // Supabase `User` type already carries `phone`/`phone_confirmed_at`
  // natively; `user_metadata` is `Record<string, unknown>`. We extract
  // only the fields we care about with safe optional chaining.
  type AuthUserView = {
    email?: string | null;
    phone?: string | null;
    phone_confirmed_at?: string | null;
    user_metadata?: { signup_method?: string | null } | null;
  };
  const u: AuthUserView | null = user ?? null;
  const hasPhone = !!u?.phone;
  const hasEmail = !!u?.email;
  const phoneConfirmed = !!u?.phone_confirmed_at;
  const explicitPhoneSignup = u?.user_metadata?.signup_method === "phone";
  // Tightened semantics: treat as phone-verified ONLY when Supabase has
  // actually stamped `phone_confirmed_at`. The legacy fallback
  // (`hasPhone && !hasEmail`) was permissive and could let unconfirmed
  // phone signups bypass /verify-account; the explicit signup_method tag
  // is still honored so historical accounts that completed verification
  // before the field was stamped don't regress.
  const isPhoneUser = phoneConfirmed || (explicitPhoneSignup && hasPhone);
  const emailVerified = !!user?.email_confirmed_at || isPhoneUser;

  const signOut = useCallback(async () => {
    teardownSession();
    clearCachedAuth();

    clearReferralCaches();

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

  const sessionValue = useMemo(() => ({
    user,
    session,
    loading,
    profileLoaded,
    emailVerified,
  }), [user, session, loading, profileLoaded, emailVerified]);

  const profileValue = useMemo(() => ({
    orgId,
    allOrgs,
    userType,
    userCountry,
    userCurrency,
    onboardingCompleted,
    subscription,
    activeRole,
    hasDualRole,
  }), [orgId, allOrgs, userType, userCountry, userCurrency, onboardingCompleted, subscription, activeRole, hasDualRole]);

  const actionsValue = useMemo(() => ({
    switchOrg,
    switchRole,
    refreshSubscription,
    refreshProfile,
    signOut,
  }), [switchOrg, switchRole, refreshSubscription, refreshProfile, signOut]);

  return (
    <AuthSessionContext.Provider value={sessionValue}>
    <AuthProfileContext.Provider value={profileValue}>
    <AuthActionsContext.Provider value={actionsValue}>
      {sessionValidating && !user && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, zIndex: 9999,
          background: "hsl(var(--accent))", color: "#fff",
          padding: "6px 16px", fontSize: "0.8125rem", textAlign: "center",
        }}>
          Restoring your session…
        </div>
      )}
      {sessionExpired && !user && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, zIndex: 9999,
          background: "hsl(0 65% 50%)", color: "#fff",
          padding: "8px 16px", fontSize: "0.8125rem", textAlign: "center",
          display: "flex", alignItems: "center", justifyContent: "center", gap: "12px",
        }}>
          <span>Your session has expired. Please sign in again.</span>
          <button
            onClick={() => { setSessionExpired(false); window.location.href = "/login"; }}
            style={{
              background: "#fff", color: "hsl(0 65% 50%)",
              border: "none", borderRadius: "4px", padding: "4px 12px",
              cursor: "pointer", fontWeight: 600, fontSize: "0.75rem",
            }}
          >
            Sign In
          </button>
        </div>
      )}
      {children}
    </AuthActionsContext.Provider>
    </AuthProfileContext.Provider>
    </AuthSessionContext.Provider>
  );
};
