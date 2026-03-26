import { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { logAudit } from "@/lib/audit";
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

// defaultSubscription imported from useSubscription

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
  // Subscription state managed by extracted hook (L2.6)
  const [activeRole, setActiveRole] = useState<ActiveRole>("landlord");
  const [hasDualRole, setHasDualRole] = useState(false);
  const [allOrgs, setAllOrgs] = useState<{ id: string; name: string; country: string; currency: string }[]>([]);

  const fetchOrgId = useCallback(async (userId: string) => {
    try {
      // Fetch all orgs for this user
      const { data: memberships } = await supabase
        .from("org_members")
        .select("org_id")
        .eq("user_id", userId);

      if (memberships && memberships.length > 0) {
        const orgIds = memberships.map(m => m.org_id);
        const { data: orgsData } = await supabase
          .from("orgs")
          .select("id, name")
          .in("id", orgIds);

        const orgs = (orgsData || []).map(o => ({
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
        const selectedOrgId = savedOrg && orgs.some(o => o.id === savedOrg) ? savedOrg : orgIds[0];
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
    try {
      // Profile may not exist yet (trigger race) — retry with short backoff
      let data: any = null;
      const { data: d1, error: e1 } = await supabase
        .from("profiles")
        .select("user_type, onboarding_completed, country, currency")
        .eq("id", userId)
        .maybeSingle();

      if (e1 || !d1) {
        // Quick retry (300ms instead of 1500ms) — profile trigger is fast
        await new Promise(r => setTimeout(r, 300));
        const { data: d2 } = await supabase
          .from("profiles")
          .select("user_type, onboarding_completed, country, currency")
          .eq("id", userId)
          .maybeSingle();
        data = d2;
      } else {
        data = d1;
      }

      const ut = (data?.user_type as UserType) ?? "landlord";
      setUserType(ut);
      setUserCountry(data?.country ?? "FR");
      setUserCurrency(data?.currency ?? "EUR");

      // Check dual-role: user has both org membership (landlord) and tenant link
      let tenantLink: any = null;
      let orgLink: any = null;
      try {
        // Sequential to avoid auth lock contention
        const t = await supabase.from("tenants").select("id").eq("tenant_user_id", userId).limit(1).maybeSingle();
        tenantLink = t.data;
        const o = await supabase.from("org_members").select("id").eq("user_id", userId).limit(1).maybeSingle();
        orgLink = o.data;
      } catch (err) {
        console.warn("[AuthContext] dual-role check failed:", err);
      }

      const hasOrg = !!orgLink;
      const hasTenant = !!tenantLink;
      const dual = hasTenant && hasOrg;
      setHasDualRole(dual);

      // Auto-complete onboarding for existing accounts that already have org data or tenant link
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
        // No org, no tenant link → client account
        setActiveRole("client");
      }
    } catch (err) {
      console.error("[AuthContext] fetchUserType failed:", err);
      // Safe defaults — app won't crash
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
      await Promise.all([
        fetchUserType(user.id),
        fetchOrgId(user.id),
      ]);
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

  const { subscription, refreshSubscription, resetSubscription, setSubscription } = useSubscriptionLoader(session, user?.id);

  // Store refreshSubscription in a ref to avoid re-triggering the auth effect
  const refreshSubRef = useCallback(() => refreshSubscription(), [refreshSubscription]);

  useEffect(() => {
    let mounted = true;
    let latestSeq = 0;
    const safetyTimeout = window.setTimeout(() => {
      if (!mounted) return;
      setLoading(false);
    }, 2500);

    // Mark V1 auth as active — prevents v2AuthStore from registering a second listener
    markV1AuthActive();

    const hydrateAuthState = async (nextSession: Session | null) => {
      // Use a monotonic sequence so only the latest event wins (no dropped events)
      const seq = ++latestSeq;

      setSession(nextSession);
      setUser(nextSession?.user ?? null);

      // Sync v2AuthStore without triggering another onAuthStateChange
      useV2AuthStore.getState().syncFromV1(nextSession);

      if (nextSession?.user) {
        try {
          // SEQUENTIAL — prevents auth token lock contention from parallel queries
          await fetchOrgId(nextSession.user.id);
          if (seq !== latestSeq) return; // superseded by newer event
          await fetchUserType(nextSession.user.id);
          if (seq !== latestSeq) return;
        } catch (err) {
          console.error("[AuthContext] hydrateAuthState failed:", err);
        }
        // Defer subscription check — don't block initial render
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

    // Single source of truth: onAuthStateChange fires INITIAL_SESSION on setup,
    // then SIGNED_IN / SIGNED_OUT / TOKEN_REFRESHED as needed.
    // We do NOT call getSession() separately — that caused a race where
    // getSession() resolved with null before onAuthStateChange delivered the
    // restored session, leading to a premature redirect to /login.
    const { data: { subscription: authSub } } = supabase.auth.onAuthStateChange(
      (_event, nextSession) => {
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
