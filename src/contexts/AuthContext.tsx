import { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { logAudit } from "@/lib/audit";
import { ensureOrbitProfile } from "@/lib/orbit/ensureOrbitProfile";
import type { User, Session } from "@supabase/supabase-js";
import { markV1AuthActive, useV2AuthStore } from "@/stores/v2AuthStore";
import { useSubscriptionLoader, defaultSubscription, type SubscriptionState } from "@/hooks/useSubscription";

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

  const fetchOrgId = useCallback(async (userId: string) => {
    const QUERY_TIMEOUT = 8_000;
    const withTimeout = <T,>(promise: Promise<T>, label: string): Promise<T> =>
      Promise.race([
        promise,
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error(`[AuthContext] ${label} timed out (${QUERY_TIMEOUT}ms)`)), QUERY_TIMEOUT)
        ),
      ]);

    try {
      const { data: memberships } = await withTimeout(
        supabase.from("org_members").select("org_id").eq("user_id", userId),
        "fetchOrgId/memberships"
      );

      if (memberships && memberships.length > 0) {
        const orgIds = memberships.map((m) => m.org_id);
        const { data: orgsData } = await withTimeout(
          supabase.from("orgs").select("id, name").in("id", orgIds),
          "fetchOrgId/orgs"
        );

        const orgs = (orgsData || []).map((o) => ({
          id: o.id,
          name: o.name || "Unnamed",
          country: "",
          currency: "EUR",
        }));
        setAllOrgs(orgs);

        const savedOrg = (() => {
          try {
            return localStorage.getItem(`easylocs_active_org_${userId}`);
          } catch {
            return null;
          }
        })();
        const selectedOrgId = savedOrg && orgs.some((o) => o.id === savedOrg) ? savedOrg : orgIds[0];
        setOrgId(selectedOrgId);
      } else {
        setOrgId(null);
        setAllOrgs([]);
      }
    } catch (err) {
      console.warn("[AuthContext] fetchOrgId failed:", err);
      setOrgId(null);
      setAllOrgs([]);
    }
  }, []);

  const fetchUserType = useCallback(async (userId: string) => {
    const QUERY_TIMEOUT = 8_000;
    const withTimeout = <T,>(promise: Promise<T>, label: string): Promise<T> =>
      Promise.race([
        promise,
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error(`[AuthContext] ${label} timed out (${QUERY_TIMEOUT}ms)`)), QUERY_TIMEOUT)
        ),
      ]);

    try {
      let data: any = null;
      const { data: d1, error: e1 } = await withTimeout(
        supabase.from("profiles").select("user_type, onboarding_completed, country, currency").eq("id", userId).maybeSingle(),
        "fetchUserType/profiles"
      );

      if (e1 || !d1) {
        await new Promise((r) => setTimeout(r, 300));
        const { data: d2 } = await withTimeout(
          supabase.from("profiles").select("user_type, onboarding_completed, country, currency").eq("id", userId).maybeSingle(),
          "fetchUserType/profiles-retry"
        );
        data = d2;
      } else {
        data = d1;
      }

      const ut = (data?.user_type as UserType) ?? "landlord";
      setUserType(ut);
      setUserCountry(data?.country ?? "FR");
      setUserCurrency(data?.currency ?? "EUR");

      let tenantLink: any = null;
      let orgLink: any = null;
      try {
        const [t, o] = await Promise.all([
          withTimeout(supabase.from("tenants").select("id").eq("tenant_user_id", userId).limit(1).maybeSingle(), "fetchUserType/tenants"),
          withTimeout(supabase.from("org_members").select("id").eq("user_id", userId).limit(1).maybeSingle(), "fetchUserType/org_members"),
        ]);
        tenantLink = t.data;
        orgLink = o.data;
      } catch (err) {
        console.warn("[AuthContext] dual-role check failed:", err);
      }

      const hasOrg = !!orgLink;
      const hasTenant = !!tenantLink;
      const dual = hasTenant && hasOrg;
      setHasDualRole(dual);

      let onboardingDone = data?.onboarding_completed ?? false;
      if (!onboardingDone && (hasOrg || hasTenant)) {
        onboardingDone = true;
        supabase.from("profiles").update({ onboarding_completed: true }).eq("id", userId).then(() => {});
      }
      setOnboardingCompleted(onboardingDone);
      setProfileLoaded(true);

      const savedRole = (() => {
        try {
          return localStorage.getItem(`easylocs_active_role_${userId}`);
        } catch {
          return null;
        }
      })();
      if (dual && savedRole && (savedRole === "landlord" || savedRole === "tenant")) {
        setActiveRole(savedRole);
      } else if (dual) {
        setActiveRole("landlord");
      } else if (hasOrg) {
        setActiveRole("landlord");
      } else if (hasTenant) {
        setActiveRole("tenant");
      } else {
        setActiveRole("client");
      }
    } catch (err) {
      console.error("[AuthContext] fetchUserType failed:", err);
      setUserType("landlord");
      setUserCountry("FR");
      setUserCurrency("EUR");
      setOnboardingCompleted(false);
      setActiveRole("landlord");
      setHasDualRole(false);
      setProfileLoaded(true);
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (user) {
      await ensureOrbitProfile({
        userId: user.id,
        email: user.email ?? null,
        displayName: (user.user_metadata as any)?.display_name ?? (user.user_metadata as any)?.full_name ?? null,
        avatarUrl: (user.user_metadata as any)?.avatar_url ?? null,
      });
      await Promise.all([fetchUserType(user.id), fetchOrgId(user.id)]);
    }
  }, [user, fetchUserType, fetchOrgId]);

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
      setLoading(false);
    }, 2500);

    markV1AuthActive();

    const hydrateAuthState = async (nextSession: Session | null) => {
      const seq = ++latestSeq;
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      useV2AuthStore.getState().syncFromV1(nextSession);

      if (nextSession?.user) {
        // ensureOrbitProfile is fire-and-forget — must never block login
        void ensureOrbitProfile({
          userId: nextSession.user.id,
          email: nextSession.user.email ?? null,
          displayName: (nextSession.user.user_metadata as any)?.display_name ?? (nextSession.user.user_metadata as any)?.full_name ?? null,
          avatarUrl: (nextSession.user.user_metadata as any)?.avatar_url ?? null,
        }).catch(() => null);
        try {
          await fetchOrgId(nextSession.user.id);
          if (seq !== latestSeq) return;
          await fetchUserType(nextSession.user.id);
          if (seq !== latestSeq) return;
        } catch (err) {
          console.error("[AuthContext] hydrateAuthState failed, scheduling retry:", err);
          // Non-blocking retry after 2s if profile load failed
          setTimeout(() => {
            void (async () => {
              try {
                await fetchOrgId(nextSession.user.id);
                await fetchUserType(nextSession.user.id);
              } catch (retryErr) {
                console.warn("[AuthContext] profile retry also failed:", retryErr);
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
