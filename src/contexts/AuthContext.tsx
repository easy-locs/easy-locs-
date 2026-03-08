import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

type UserType = "landlord" | "tenant";
type ActiveRole = "landlord" | "tenant";

interface SubscriptionState {
  subscribed: boolean;
  plan: string;
  subscriptionEnd: string | null;
  loading: boolean;
  isTrial: boolean;
  trialDaysLeft: number | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
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

const defaultSubscription: SubscriptionState = {
  subscribed: true,
  plan: "unlimited",
  subscriptionEnd: null,
  loading: false,
  isTrial: false,
  trialDaysLeft: null,
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
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
  const [orgId, setOrgId] = useState<string | null>(null);
  const [userType, setUserType] = useState<UserType>("landlord");
  const [userCountry, setUserCountry] = useState("FR");
  const [userCurrency, setUserCurrency] = useState("EUR");
  const [onboardingCompleted, setOnboardingCompleted] = useState(false);
  const [subscription, setSubscription] = useState<SubscriptionState>(defaultSubscription);
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
          .select("id, name, country, currency")
          .in("id", orgIds);

        const orgs = (orgsData || []).map(o => ({
          id: o.id,
          name: o.name || "Unnamed",
          country: (o as any).country || "",
          currency: (o as any).currency || "EUR",
        }));
        setAllOrgs(orgs);

        // Restore saved org preference or use first
        const savedOrg = localStorage.getItem(`easylocs_active_org_${userId}`);
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
      // Profile may not exist yet (trigger race) — retry once after short delay
      let data: any = null;
      const { data: d1, error: e1 } = await supabase
        .from("profiles")
        .select("user_type, onboarding_completed, country, currency")
        .eq("id", userId)
        .maybeSingle();

      if (e1 || !d1) {
        // Wait for trigger to create profile row
        await new Promise(r => setTimeout(r, 1500));
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
        const [t, o] = await Promise.all([
          supabase.from("tenants").select("id").eq("tenant_user_id", userId).limit(1).maybeSingle(),
          supabase.from("org_members").select("id").eq("user_id", userId).limit(1).maybeSingle(),
        ]);
        tenantLink = t.data;
        orgLink = o.data;
      } catch (err) {
        console.warn("[AuthContext] dual-role check failed:", err);
      }

      const dual = !!tenantLink && !!orgLink;
      setHasDualRole(dual);

      // Auto-complete onboarding for existing accounts that already have org data or tenant link
      let onboardingDone = data?.onboarding_completed ?? false;
      if (!onboardingDone && (!!orgLink || !!tenantLink)) {
        onboardingDone = true;
        supabase.from("profiles").update({ onboarding_completed: true }).eq("id", userId).then(() => {});
      }
      setOnboardingCompleted(onboardingDone);

      // Restore saved role preference, default to landlord for dual-role
      const savedRole = localStorage.getItem(`easylocs_active_role_${userId}`);
      if (dual && savedRole && (savedRole === "landlord" || savedRole === "tenant")) {
        setActiveRole(savedRole);
      } else if (dual) {
        setActiveRole("landlord");
      } else {
        setActiveRole(ut === "tenant" ? "tenant" : "landlord");
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
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (user) await fetchUserType(user.id);
  }, [user, fetchUserType]);

  const switchRole = useCallback((role: ActiveRole) => {
    setActiveRole(role);
    if (user) localStorage.setItem(`easylocs_active_role_${user.id}`, role);
  }, [user]);

  const refreshSubscription = useCallback(async () => {
    if (!session?.access_token) return;
    setSubscription((prev) => ({ ...prev, loading: true }));
    try {
      const { data, error } = await supabase.functions.invoke("check-subscription");
      if (error) throw error;
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
    } catch (err) {
      console.error("[AuthContext] check-subscription error:", err);
      setSubscription((prev) => ({ ...prev, loading: false }));
    }
  }, [session?.access_token]);

  useEffect(() => {
    let mounted = true;

    const hydrateAuthState = async (nextSession: Session | null) => {
      setSession(nextSession);
      setUser(nextSession?.user ?? null);

      if (nextSession?.user) {
        try {
          await Promise.all([
            fetchOrgId(nextSession.user.id),
            fetchUserType(nextSession.user.id),
          ]);
        } catch (err) {
          console.error("[AuthContext] hydrateAuthState failed:", err);
          // Safe defaults already set by individual catch blocks
        }
        void refreshSubscription();
      } else {
        setOrgId(null);
        setUserType("landlord");
        setUserCountry("FR");
        setUserCurrency("EUR");
        setOnboardingCompleted(false);
        setSubscription({ ...defaultSubscription, loading: false });
        setActiveRole("landlord");
        setHasDualRole(false);
      }

      if (mounted) setLoading(false);
    };

    const { data: { subscription: authSub } } = supabase.auth.onAuthStateChange(
      (_event, nextSession) => {
        void hydrateAuthState(nextSession);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      void hydrateAuthState(session);
    });

    return () => {
      mounted = false;
      authSub.unsubscribe();
    };
  }, [fetchOrgId, fetchUserType, refreshSubscription]);

  useEffect(() => {
    if (!user) return;
    const interval = setInterval(refreshSubscription, 60_000);
    return () => clearInterval(interval);
  }, [user, refreshSubscription]);

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
    setSubscription({ ...defaultSubscription, loading: false });
    setActiveRole("landlord");
    setHasDualRole(false);
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, emailVerified, orgId, userType, userCountry, userCurrency, onboardingCompleted, subscription, activeRole, hasDualRole, switchRole, refreshSubscription, refreshProfile, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};
