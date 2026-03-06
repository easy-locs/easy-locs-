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

  const fetchOrgId = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from("org_members")
      .select("org_id")
      .eq("user_id", userId)
      .limit(1)
      .single();
    setOrgId(data?.org_id ?? null);
  }, []);

  const fetchUserType = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("user_type, onboarding_completed, country, currency")
      .eq("id", userId)
      .single();
    const ut = (data?.user_type as UserType) ?? "landlord";
    setUserType(ut);
    setOnboardingCompleted(data?.onboarding_completed ?? false);
    setUserCountry(data?.country ?? "FR");
    setUserCurrency(data?.currency ?? "EUR");

    // Check dual-role: user has both org membership (landlord) and tenant link
    const [{ data: tenantLink }, { data: orgLink }] = await Promise.all([
      supabase.from("tenants").select("id").eq("tenant_user_id", userId).limit(1).maybeSingle(),
      supabase.from("org_members").select("id").eq("user_id", userId).limit(1).maybeSingle(),
    ]);

    const dual = !!tenantLink && !!orgLink;
    setHasDualRole(dual);

    // Restore saved role preference
    const savedRole = localStorage.getItem(`easylocs_active_role_${userId}`);
    if (dual && savedRole && (savedRole === "landlord" || savedRole === "tenant")) {
      setActiveRole(savedRole);
    } else {
      setActiveRole(ut === "tenant" ? "tenant" : "landlord");
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
    const { data: { subscription: authSub } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          setTimeout(() => fetchOrgId(session.user.id), 0);
          setTimeout(() => fetchUserType(session.user.id), 0);
          setTimeout(() => refreshSubscription(), 0);
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
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchOrgId(session.user.id);
        fetchUserType(session.user.id);
        refreshSubscription();
      } else {
        setSubscription((prev) => ({ ...prev, loading: false }));
      }
      setLoading(false);
    });

    return () => authSub.unsubscribe();
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
