import { useState, useEffect } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Users, CreditCard, TrendingUp, Shield, Activity, AlertTriangle, Building2, FileText } from "lucide-react";
import { useI18n } from "@/lib/i18n";

interface Stats {
  totalUsers: number;
  activeSubscriptions: number;
  totalProperties: number;
  totalDocuments: number;
  referrals: number;
  recentSignups: any[];
}

const AdminDashboard = () => {
  const { user } = useAuth();
  const { t } = useI18n();
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0, activeSubscriptions: 0, totalProperties: 0,
    totalDocuments: 0, referrals: 0, recentSignups: [],
  });
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (!user) return;
    // Check admin role
    supabase.rpc("has_role", { _user_id: user.id, _role: "admin" }).then(({ data }) => {
      setIsAdmin(!!data);
      if (!data) { setLoading(false); return; }

      // Fetch stats
      Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("subscriptions").select("id", { count: "exact", head: true }).eq("status", "active"),
        supabase.from("properties").select("id", { count: "exact", head: true }),
        supabase.from("documents").select("id", { count: "exact", head: true }),
        supabase.from("referrals").select("id", { count: "exact", head: true }),
        supabase.from("profiles").select("id, email, name, created_at").order("created_at", { ascending: false }).limit(10),
      ]).then(([users, subs, props, docs, refs, recent]) => {
        setStats({
          totalUsers: users.count || 0,
          activeSubscriptions: subs.count || 0,
          totalProperties: props.count || 0,
          totalDocuments: docs.count || 0,
          referrals: refs.count || 0,
          recentSignups: recent.data || [],
        });
        setLoading(false);
      });
    });
  }, [user]);

  if (!isAdmin && !loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <Shield className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
            <h1 className="text-xl font-bold text-foreground mb-2">Access Denied</h1>
            <p className="text-muted-foreground">You need admin privileges to access this page.</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const statCards = [
    { icon: Users, label: "Total Users", value: stats.totalUsers, color: "text-blue-500" },
    { icon: CreditCard, label: "Active Subscriptions", value: stats.activeSubscriptions, color: "text-green-500" },
    { icon: Building2, label: "Properties", value: stats.totalProperties, color: "text-purple-500" },
    { icon: FileText, label: "Documents Generated", value: stats.totalDocuments, color: "text-orange-500" },
    { icon: TrendingUp, label: "Referrals", value: stats.referrals, color: "text-accent" },
  ];

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <Shield className="h-6 w-6 text-accent" />
          <div>
            <h1 className="text-2xl font-bold text-foreground">Admin Dashboard</h1>
            <p className="text-sm text-muted-foreground">Platform analytics and user management</p>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-20 text-muted-foreground">Loading...</div>
        ) : (
          <>
            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
              {statCards.map((s) => (
                <div key={s.label} className="bg-card rounded-xl p-5 shadow-card border border-border/50">
                  <s.icon className={`h-5 w-5 ${s.color} mb-2`} />
                  <div className="text-2xl font-bold text-foreground">{s.value}</div>
                  <div className="text-xs text-muted-foreground">{s.label}</div>
                </div>
              ))}
            </div>

            {/* Conversion rate */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div className="bg-card rounded-xl p-6 shadow-card border border-border/50">
                <h2 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                  <Activity className="h-4 w-4 text-accent" /> Conversion
                </h2>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Signup → Subscription</span>
                    <span className="font-semibold text-foreground">
                      {stats.totalUsers > 0 ? Math.round((stats.activeSubscriptions / stats.totalUsers) * 100) : 0}%
                    </span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div className="bg-accent rounded-full h-2 transition-all" style={{ width: `${stats.totalUsers > 0 ? (stats.activeSubscriptions / stats.totalUsers) * 100 : 0}%` }} />
                  </div>
                </div>
              </div>

              <div className="bg-card rounded-xl p-6 shadow-card border border-border/50">
                <h2 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-yellow-500" /> Platform Health
                </h2>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Avg properties/user</span>
                    <span className="font-semibold text-foreground">{stats.totalUsers > 0 ? (stats.totalProperties / stats.totalUsers).toFixed(1) : 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Avg docs/user</span>
                    <span className="font-semibold text-foreground">{stats.totalUsers > 0 ? (stats.totalDocuments / stats.totalUsers).toFixed(1) : 0}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent signups */}
            <div className="bg-card rounded-xl p-6 shadow-card border border-border/50">
              <h2 className="font-semibold text-foreground mb-4">Recent Signups</h2>
              <div className="space-y-3">
                {stats.recentSignups.map((u: any) => (
                  <div key={u.id} className="flex items-center justify-between text-sm border-b border-border/50 pb-2 last:border-0">
                    <div>
                      <span className="font-medium text-foreground">{u.name || "—"}</span>
                      <span className="text-muted-foreground ml-2">{u.email}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {new Date(u.created_at).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
};

export default AdminDashboard;
