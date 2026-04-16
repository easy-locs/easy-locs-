import { useQuery } from "@tanstack/react-query";
import { db } from "@/services/db";
import { useAuth } from "@/contexts/AuthContext";
import SubPageShell from "@/components/layout/SubPageShell";
import { MobilePageHeader } from "@/components/ui/mobile-page-header";
import { AppCard, CardContent } from "@/components/ui/AppCard";
import { DollarSign, TrendingUp, Calendar, Loader2 } from "lucide-react";

export default function ProviderEarningsPage() {
  const { user } = useAuth();

  const today = new Date().toISOString().split("T")[0];
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split("T")[0];
  const monthAgo = new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0];

  const { data: earnings, isLoading } = useQuery({
    queryKey: ["provider-earnings", user?.id],
    queryFn: async () => {
      const [todayRes, weekRes, monthRes, historyRes] = await Promise.all([
        db.from("service_bookings_v2").select("total_price").eq("provider_id", user!.id).eq("booked_date", today).eq("status", "completed"),
        db.from("service_bookings_v2").select("total_price").eq("provider_id", user!.id).gte("booked_date", weekAgo).eq("status", "completed"),
        db.from("service_bookings_v2").select("total_price").eq("provider_id", user!.id).gte("booked_date", monthAgo).eq("status", "completed"),
        db.from("service_bookings_v2").select("total_price, booked_date, service_catalog(title)").eq("provider_id", user!.id).eq("status", "completed").order("booked_date", { ascending: false }).limit(20),
      ]);

      const sum = (arr: any[]) => arr.reduce((s, b) => s + (b.total_price || 0), 0);

      return {
        todayRevenue: sum(todayRes.data || []),
        weekRevenue: sum(weekRes.data || []),
        monthRevenue: sum(monthRes.data || []),
        history: historyRes.data ?? [],
      };
    },
    enabled: !!user?.id,
  });

  return (
    <SubPageShell noContentPad>
      <MobilePageHeader title="Earnings" icon={<DollarSign className="h-5 w-5 text-green-500" />} backTo="/provider/dashboard" />
      <div className="max-w-lg mx-auto px-4 py-4 space-y-4">
        {isLoading ? (
          <div className="py-12 flex justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-3">
              <AppCard>
                <CardContent className="p-3 text-center">
                  <p className="text-[0.625rem] text-muted-foreground">Today</p>
                  <p className="text-xl font-bold text-green-600">{earnings?.todayRevenue || 0}</p>
                  <p className="text-[0.625rem] text-muted-foreground">AED</p>
                </CardContent>
              </AppCard>
              <AppCard>
                <CardContent className="p-3 text-center">
                  <p className="text-[0.625rem] text-muted-foreground">This Week</p>
                  <p className="text-xl font-bold text-blue-600">{earnings?.weekRevenue || 0}</p>
                  <p className="text-[0.625rem] text-muted-foreground">AED</p>
                </CardContent>
              </AppCard>
              <AppCard>
                <CardContent className="p-3 text-center">
                  <p className="text-[0.625rem] text-muted-foreground">This Month</p>
                  <p className="text-xl font-bold text-purple-600">{earnings?.monthRevenue || 0}</p>
                  <p className="text-[0.625rem] text-muted-foreground">AED</p>
                </CardContent>
              </AppCard>
            </div>

            <div>
              <h3 className="text-sm font-bold mb-2">Recent Completed</h3>
              <div className="space-y-1.5">
                {(earnings?.history || []).map((h: any, i: number) => (
                  <AppCard key={i}>
                    <CardContent className="p-2.5 flex items-center justify-between">
                      <div>
                        <p className="text-xs font-medium">{h.service_catalog?.title || "Service"}</p>
                        <p className="text-[0.625rem] text-muted-foreground">{new Date(h.booked_date).toLocaleDateString()}</p>
                      </div>
                      <span className="text-sm font-bold text-green-600">+{h.total_price} AED</span>
                    </CardContent>
                  </AppCard>
                ))}
                {(earnings?.history || []).length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-8">No completed bookings yet</p>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </SubPageShell>
  );
}
