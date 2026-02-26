import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

interface SubscriptionState {
  subscribed: boolean;
  plan: string;
  subscriptionEnd: string | null;
  loading: boolean;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  emailVerified: boolean;
  orgId: string | null;
  subscription: SubscriptionState;
  refreshSubscription: () => Promise<void>;
  signOut: () => Promise<void>;
}

const defaultSubscription: SubscriptionState = {
  subscribed: false,
  plan: "free",
  subscriptionEnd: null,
  loading: true,
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  emailVerified: false,
  orgId: null,
  subscription: defaultSubscription,
  refreshSubscription: async () => {},
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [subscription, setSubscription] = useState<SubscriptionState>(defaultSubscription);

  const fetchOrgId = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from("org_members")
      .select("org_id")
      .eq("user_id", userId)
      .limit(1)
      .single();
    setOrgId(data?.org_id ?? null);
  }, []);

  const refreshSubscription = useCallback(async () => {
    try {
      const { data, error } = await supabase.functions.invoke("check-subscription");
      if (error) throw error;
      setSubscription({
        subscribed: data.subscribed ?? false,
        plan: data.plan ?? "free",
        subscriptionEnd: data.subscription_end ?? null,
        loading: false,
      });
    } catch {
      setSubscription((prev) => ({ ...prev, loading: false }));
    }
  }, []);

  useEffect(() => {
    const { data: { subscription: authSub } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          setTimeout(() => fetchOrgId(session.user.id), 0);
          setTimeout(() => refreshSubscription(), 0);
        } else {
          setOrgId(null);
          setSubscription({ ...defaultSubscription, loading: false });
        }
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchOrgId(session.user.id);
        refreshSubscription();
      } else {
        setSubscription((prev) => ({ ...prev, loading: false }));
      }
      setLoading(false);
    });

    return () => authSub.unsubscribe();
  }, [fetchOrgId, refreshSubscription]);

  // Auto-refresh subscription every 60s
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
    setSubscription({ ...defaultSubscription, loading: false });
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, emailVerified, orgId, subscription, refreshSubscription, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};
