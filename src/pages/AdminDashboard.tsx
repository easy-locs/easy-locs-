import { useState, useEffect, useMemo, lazy, Suspense } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { checkAdminRole, fetchAdminStats } from "@/repositories/admin.repository";
import { Users, CreditCard, TrendingUp, Shield, Activity, AlertTriangle, Building2, FileText, BarChart3, Calendar, DollarSign, ArrowUpRight, ArrowDownRight, HeartPulse, UserCog, ShieldAlert } from "lucide-react";
import { useI18n } from "@/lib/i18n";

const HealthDashboard = lazy(() => import("@/components/admin/HealthDashboard"));
const OrgMemberManager = lazy(() => import("@/components/admin/OrgMemberManager"));
const ModerationPanel = lazy(() => import("@/components/admin/ModerationPanel"));

interface Stats {
  totalUsers: number;
  activeSubscriptions: number;
  totalProperties: number;
  totalDocuments: number;
  referrals: number;
  recentSignups: any[];
  signupsByMonth: { month: string; count: number }[];
  subscriptionsByPlan: { plan: string; count: number }[];
  churnedUsers: number;
  avgPropertiesPerUser: number;
  trialConversion: number;
  bookingRequests: number;
  confirmedBookings: number;
  revenueByMonth: { month: string; amount: number }[];
  totalRentCollected: number;
  totalBookingRevenue: number;
}

const AdminDashboard = () => {
  const { user } = useAuth();
  const { t } = useI18n();
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0, activeSubscriptions: 0, totalProperties: 0,
    totalDocuments: 0, referrals: 0, recentSignups: [],
    signupsByMonth: [], subscriptionsByPlan: [], churnedUsers: 0,
    avgPropertiesPerUser: 0, trialConversion: 0,
    bookingRequests: 0, confirmedBookings: 0,
    revenueByMonth: [], totalRentCollected: 0, totalBookingRevenue: 0,
  });
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "users" | "revenue" | "health" | "team" | "moderation">("overview");

  useEffect(() => {
    if (!user) return;
    checkAdminRole(user.id).then((admin) => {
      setIsAdmin(admin);
      if (!admin) { setLoading(false); return; }

      fetchAdminStats().then((raw) => {
        const allUsers = raw.users.data;
        const allSubs = raw.subs.data;
        const activeSubs = allSubs.filter(s => s.status === "active");
        const churned = allSubs.filter(s => s.status === "canceled" || s.status === "cancelled");
        const trials = allSubs.filter(s => s.status === "trialing");
        const trialConverted = trials.length > 0 
          ? Math.round((activeSubs.length / (activeSubs.length + trials.length)) * 100) 
          : 0;

        // Signups by month (last 6 months)
        const monthCounts: Record<string, number> = {};
        const now = new Date();
        for (let i = 5; i >= 0; i--) {
          const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
          monthCounts[key] = 0;
        }
        allUsers.forEach(u => {
          const key = u.created_at?.slice(0, 7);
          if (key && key in monthCounts) monthCounts[key]++;
        });
        const signupsByMonth = Object.entries(monthCounts).map(([month, count]) => ({ month, count }));

        // Subscriptions by plan
        const planCounts: Record<string, number> = {};
        activeSubs.forEach(s => {
          const plan = s.plan || "unknown";
          planCounts[plan] = (planCounts[plan] || 0) + 1;
        });
        const subscriptionsByPlan = Object.entries(planCounts).map(([plan, count]) => ({ plan, count }));

        // Revenue by month (from paid rent calls)
        const revByMonth: Record<string, number> = {};
        for (let i = 5; i >= 0; i--) {
          const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
          revByMonth[key] = 0;
        }
        const paidRentData = paidRents.data || [];
        paidRentData.forEach((r: any) => {
          const key = r.month?.slice(0, 7) || r.paid_date?.slice(0, 7);
          if (key && key in revByMonth) revByMonth[key] += Number(r.total_amount) || 0;
        });
        const confirmedResData = confirmedRes.data || [];
        confirmedResData.forEach((r: any) => {
          const key = r.created_at?.slice(0, 7);
          if (key && key in revByMonth) revByMonth[key] += Number(r.amount) || 0;
        });
        const revenueByMonth = Object.entries(revByMonth).map(([month, amount]) => ({ month, amount: Math.round(amount) }));

        const totalRentCollected = paidRentData.reduce((sum: number, r: any) => sum + (Number(r.total_amount) || 0), 0);
        const totalBookingRevenue = confirmedResData.reduce((sum: number, r: any) => sum + (Number(r.amount) || 0), 0);

        setStats({
          totalUsers: raw.users.count || allUsers.length,
          activeSubscriptions: activeSubs.length,
          totalProperties: raw.propsCount,
          totalDocuments: raw.docsCount,
          referrals: raw.refsCount,
          recentSignups: allUsers.slice(-10).reverse(),
          signupsByMonth,
          subscriptionsByPlan,
          churnedUsers: churned.length,
          avgPropertiesPerUser: allUsers.length > 0 ? (props.count || 0) / allUsers.length : 0,
          trialConversion: trialConverted,
          bookingRequests: raw.bookingReqs.count,
          confirmedBookings: confirmedResData.length,
          revenueByMonth,
          totalRentCollected: Math.round(totalRentCollected),
          totalBookingRevenue: Math.round(totalBookingRevenue),
        });
        setLoading(false);
      });
    });
  }, [user]);

  // Derive paidRents/confirmedRes from stats for revenue tab (already computed in stats)

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
    { icon: FileText, label: "Documents", value: stats.totalDocuments, color: "text-orange-500" },
    { icon: TrendingUp, label: "Referrals", value: stats.referrals, color: "text-accent" },
    { icon: AlertTriangle, label: "Churned", value: stats.churnedUsers, color: "text-destructive" },
    { icon: Calendar, label: "Booking Requests", value: stats.bookingRequests, color: "text-blue-400" },
    { icon: Calendar, label: "Confirmed Bookings", value: stats.confirmedBookings, color: "text-green-400" },
  ];

  const maxSignups = Math.max(...stats.signupsByMonth.map(s => s.count), 1);
  const maxRevenue = Math.max(...stats.revenueByMonth.map(r => r.amount), 1);

  // MRR estimation from last month revenue
  const lastMonthRev = stats.revenueByMonth.length > 0 ? stats.revenueByMonth[stats.revenueByMonth.length - 1].amount : 0;
  const prevMonthRev = stats.revenueByMonth.length > 1 ? stats.revenueByMonth[stats.revenueByMonth.length - 2].amount : 0;
  const revGrowth = prevMonthRev > 0 ? ((lastMonthRev - prevMonthRev) / prevMonthRev * 100).toFixed(1) : "—";
  const totalPlatformRevenue = stats.totalRentCollected + stats.totalBookingRevenue;

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Shield className="h-6 w-6 text-accent" />
            <div>
              <h1 className="text-2xl font-bold text-foreground">Admin Dashboard</h1>
              <p className="text-sm text-muted-foreground">Platform analytics, retention & revenue</p>
            </div>
          </div>
          <div className="flex items-center bg-muted rounded-lg p-0.5 overflow-x-auto scrollbar-none">
            {(["overview", "users", "revenue", "team", "moderation", "health"] as const).map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap shrink-0 ${activeTab === tab ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
                {tab === "overview" ? "Overview" : tab === "users" ? "Users" : tab === "revenue" ? "Revenue" : tab === "team" ? "Team" : tab === "moderation" ? "Moderation" : "Health"}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="text-center py-20 text-muted-foreground">Loading...</div>
        ) : (
          <>
            {/* Stats Grid */}
            {activeTab !== "revenue" && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                {statCards.map((s) => (
                  <div key={s.label} className="bg-card rounded-xl p-5 shadow-card border border-border/50">
                    <s.icon className={`h-5 w-5 ${s.color} mb-2`} />
                    <div className="text-2xl font-bold text-foreground">{s.value}</div>
                    <div className="text-xs text-muted-foreground">{s.label}</div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === "overview" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                {/* Signup trend chart */}
                <div className="bg-card rounded-xl p-6 shadow-card border border-border/50">
                  <h2 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-accent" /> Signups (6 months)
                  </h2>
                  <div className="flex items-end gap-2 h-32">
                    {stats.signupsByMonth.map(s => (
                      <div key={s.month} className="flex-1 flex flex-col items-center gap-1">
                        <span className="text-[10px] font-medium text-foreground">{s.count}</span>
                        <div className="w-full bg-accent/20 rounded-t" style={{ height: `${(s.count / maxSignups) * 100}%`, minHeight: 4 }}>
                          <div className="w-full h-full bg-accent rounded-t" />
                        </div>
                        <span className="text-[9px] text-muted-foreground">{s.month.slice(5)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Conversion & Health */}
                <div className="bg-card rounded-xl p-6 shadow-card border border-border/50">
                  <h2 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                    <Activity className="h-4 w-4 text-accent" /> Conversion & Health
                  </h2>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-muted-foreground">Signup → Subscription</span>
                        <span className="font-semibold text-foreground">
                          {stats.totalUsers > 0 ? Math.round((stats.activeSubscriptions / stats.totalUsers) * 100) : 0}%
                        </span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div className="bg-accent rounded-full h-2 transition-all" style={{ width: `${stats.totalUsers > 0 ? (stats.activeSubscriptions / stats.totalUsers) * 100 : 0}%` }} />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-muted-foreground">Trial → Paid</span>
                        <span className="font-semibold text-foreground">{stats.trialConversion}%</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div className="bg-green-500 rounded-full h-2 transition-all" style={{ width: `${stats.trialConversion}%` }} />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 pt-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Avg props/user</span>
                        <span className="font-semibold text-foreground">{stats.avgPropertiesPerUser.toFixed(1)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Churn rate</span>
                        <span className="font-semibold text-destructive">
                          {stats.totalUsers > 0 ? ((stats.churnedUsers / stats.totalUsers) * 100).toFixed(1) : 0}%
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Plans breakdown */}
                {stats.subscriptionsByPlan.length > 0 && (
                  <div className="bg-card rounded-xl p-6 shadow-card border border-border/50">
                    <h2 className="font-semibold text-foreground mb-4">Subscriptions by Plan</h2>
                    <div className="space-y-2">
                      {stats.subscriptionsByPlan.map(p => (
                        <div key={p.plan} className="flex items-center justify-between text-sm">
                          <span className="font-medium text-foreground capitalize">{p.plan.replace(/_/g, " ")}</span>
                          <div className="flex items-center gap-2">
                            <div className="w-24 bg-muted rounded-full h-2">
                              <div className="bg-accent rounded-full h-2" style={{ width: `${(p.count / stats.activeSubscriptions) * 100}%` }} />
                            </div>
                            <span className="text-muted-foreground w-8 text-right">{p.count}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Revenue Tab */}
            {activeTab === "revenue" && (
              <>
                {/* Revenue KPI cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                  <div className="bg-card rounded-xl p-5 shadow-card border border-border/50">
                    <DollarSign className="h-5 w-5 text-green-500 mb-2" />
                    <div className="text-2xl font-bold text-foreground">{totalPlatformRevenue.toLocaleString()}€</div>
                    <div className="text-xs text-muted-foreground">Total Revenue (platform)</div>
                  </div>
                  <div className="bg-card rounded-xl p-5 shadow-card border border-border/50">
                    <CreditCard className="h-5 w-5 text-blue-500 mb-2" />
                    <div className="text-2xl font-bold text-foreground">{stats.totalRentCollected.toLocaleString()}€</div>
                    <div className="text-xs text-muted-foreground">Rent Collected</div>
                  </div>
                  <div className="bg-card rounded-xl p-5 shadow-card border border-border/50">
                    <Calendar className="h-5 w-5 text-purple-500 mb-2" />
                    <div className="text-2xl font-bold text-foreground">{stats.totalBookingRevenue.toLocaleString()}€</div>
                    <div className="text-xs text-muted-foreground">Booking Revenue</div>
                  </div>
                  <div className="bg-card rounded-xl p-5 shadow-card border border-border/50">
                    {Number(revGrowth) >= 0 ? (
                      <ArrowUpRight className="h-5 w-5 text-green-500 mb-2" />
                    ) : (
                      <ArrowDownRight className="h-5 w-5 text-destructive mb-2" />
                    )}
                    <div className="text-2xl font-bold text-foreground">{revGrowth === "—" ? "—" : `${revGrowth}%`}</div>
                    <div className="text-xs text-muted-foreground">MoM Growth</div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                  {/* Revenue by month chart */}
                  <div className="bg-card rounded-xl p-6 shadow-card border border-border/50">
                    <h2 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                      <BarChart3 className="h-4 w-4 text-accent" /> Revenue (6 months)
                    </h2>
                    <div className="flex items-end gap-2 h-40">
                      {stats.revenueByMonth.map(r => (
                        <div key={r.month} className="flex-1 flex flex-col items-center gap-1">
                          <span className="text-[10px] font-medium text-foreground">{r.amount > 0 ? `${(r.amount / 1000).toFixed(1)}k` : "0"}</span>
                          <div className="w-full rounded-t" style={{ height: `${(r.amount / maxRevenue) * 100}%`, minHeight: 4 }}>
                            <div className="w-full h-full bg-green-500 rounded-t" />
                          </div>
                          <span className="text-[9px] text-muted-foreground">{r.month.slice(5)}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Revenue breakdown */}
                  <div className="bg-card rounded-xl p-6 shadow-card border border-border/50">
                    <h2 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-accent" /> Revenue Breakdown
                    </h2>
                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-muted-foreground">Rent payments</span>
                          <span className="font-semibold text-foreground">{stats.totalRentCollected.toLocaleString()}€</span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-3">
                          <div className="bg-blue-500 rounded-full h-3 transition-all" style={{ width: `${totalPlatformRevenue > 0 ? (stats.totalRentCollected / totalPlatformRevenue) * 100 : 0}%` }} />
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-muted-foreground">Seasonal bookings</span>
                          <span className="font-semibold text-foreground">{stats.totalBookingRevenue.toLocaleString()}€</span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-3">
                          <div className="bg-purple-500 rounded-full h-3 transition-all" style={{ width: `${totalPlatformRevenue > 0 ? (stats.totalBookingRevenue / totalPlatformRevenue) * 100 : 0}%` }} />
                        </div>
                      </div>
                      <div className="pt-3 border-t border-border">
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div>
                            <span className="text-muted-foreground">Last month</span>
                            <p className="font-semibold text-foreground text-lg">{lastMonthRev.toLocaleString()}€</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Previous month</span>
                            <p className="font-semibold text-foreground text-lg">{prevMonthRev.toLocaleString()}€</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}

            {(activeTab === "overview" || activeTab === "users") && (
              <div className="bg-card rounded-xl p-6 shadow-card border border-border/50">
                <h2 className="font-semibold text-foreground mb-4">Recent Signups</h2>
                <div className="space-y-3">
                  {stats.recentSignups.map((u: any) => (
                    <div key={u.id} className="flex items-center justify-between text-sm border-b border-border/50 pb-2 last:border-0">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center text-xs font-bold text-accent">
                          {(u.name || u.email || "?")[0].toUpperCase()}
                        </div>
                        <div>
                          <span className="font-medium text-foreground">{u.name || "—"}</span>
                          <span className="text-muted-foreground ml-2 text-xs">{u.email}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center justify-center whitespace-nowrap h-6 text-xs px-2.5 rounded-full font-medium ${u.user_type === "tenant" ? "bg-info/10 text-info" : "bg-accent/10 text-accent"}`}>
                          {u.user_type || "landlord"}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(u.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Team Tab */}
            {activeTab === "team" && (
              <Suspense fallback={<div className="text-center py-20 text-muted-foreground">Loading…</div>}>
                <OrgMemberManager />
              </Suspense>
            )}

            {/* Moderation Tab */}
            {activeTab === "moderation" && (
              <Suspense fallback={<div className="text-center py-20 text-muted-foreground">Loading…</div>}>
                <ModerationPanel />
              </Suspense>
            )}

            {/* Health Tab */}
            {activeTab === "health" && (
              <Suspense fallback={<div className="text-center py-20 text-muted-foreground">Loading health dashboard…</div>}>
                <HealthDashboard />
              </Suspense>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
};

export default AdminDashboard;
