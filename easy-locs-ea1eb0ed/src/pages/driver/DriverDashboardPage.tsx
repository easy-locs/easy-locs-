import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useDriverLive } from "@/hooks/useDriverLive";
import { projectDriverDashboard } from "@/families/dashboard/dashboard.read-model";
import { toggleDriverOnline, toggleDriverAvailability } from "@/families/dashboard/dashboard.actions";
import {
  ArrowLeft, Navigation, Power, Zap, Star, TrendingUp, Clock,
  MapPin, DollarSign, CheckCircle2, BarChart3, Flame, Settings,
  ChevronRight, Shield, Brain, Activity
} from "lucide-react";
import { toast } from "sonner";
import { useMemo } from "react";
import { cn } from "@/lib/utils";

function getDriverGreeting(): { greeting: string; tip: string; icon: typeof Brain } {
  const h = new Date().getHours();
  if (h < 6) return { greeting: "Night shift", tip: "Late-night surcharges are active — maximize your earnings", icon: Flame };
  if (h < 10) return { greeting: "Good morning", tip: "Morning rush starting — airport runs are premium right now", icon: TrendingUp };
  if (h < 14) return { greeting: "Midday hustle", tip: "Lunch delivery demand is peaking — stay near restaurant zones", icon: Brain };
  if (h < 17) return { greeting: "Afternoon drive", tip: "School & office pickups rising — position near business districts", icon: MapPin };
  if (h < 21) return { greeting: "Evening mode", tip: "Dinner rush active — food delivery orders are at their highest", icon: Flame };
  return { greeting: "Night owl", tip: "Late rides pay more — stay near entertainment districts", icon: Star };
}

export default function DriverDashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: profile, refetch, isLoading: profileLoading } = useDriverLive(user?.id);

  const model = useMemo(() => projectDriverDashboard(profile), [profile]);
  const smartTip = useMemo(() => getDriverGreeting(), []);
  const SmartIcon = smartTip.icon;

  const handleToggleOnline = async () => {
    if (!user?.id) return;
    try {
      await toggleDriverOnline(user.id, model.isOnline);
      refetch();
      toast.success(model.isOnline ? "You are now offline" : "You are now online!");
    } catch (err: any) {
      toast.error("Could not update online status");
    }
  };

  const handleToggleAvailable = async () => {
    if (!user?.id) return;
    try {
      await toggleDriverAvailability(user.id, model.isAvailable);
      refetch();
    } catch (err: any) {
      toast.error("Could not update availability");
    }
  };

  const QUICK_ACTIONS = [
    { key: "missions", label: "Live Missions", icon: Navigation, path: "/driver/live-missions", color: "bg-primary text-primary-foreground", desc: "Accept jobs" },
    { key: "active", label: "Active Jobs", icon: Clock, path: "/driver/active-missions", color: "bg-emerald-600 text-white", desc: "In progress" },
    { key: "earnings", label: "Earnings", icon: DollarSign, path: "/driver/earnings", color: "bg-violet-600 text-white", desc: "Your income" },
    { key: "heatmap", label: "Demand Map", icon: Flame, path: "/driver/heatmap", color: "bg-orange-600 text-white", desc: "Hot zones" },
  ];

  const loadingPlaceholder = profileLoading ? "…" : "—";
  const todayEarnings = profile?.today_earnings != null ? `${profile.today_earnings} AED` : loadingPlaceholder;
  const todayTrips = profile?.today_trips != null ? String(profile.today_trips) : loadingPlaceholder;
  const rating = profile?.rating != null ? String(profile.rating) : loadingPlaceholder;
  const completionRate = profile?.completion_rate != null ? `${profile.completion_rate}%` : "—";

  const STATS = [
    { label: "Completion", value: completionRate, icon: CheckCircle2, color: "text-emerald-500" },
    { label: "Rating", value: rating, icon: Star, color: "text-amber-500" },
    { label: "Today", value: todayEarnings, icon: DollarSign, color: "text-primary" },
    { label: "Trips", value: todayTrips, icon: BarChart3, color: "text-violet-500" },
  ];

  return (
    <div className="app-mobile-page flex flex-col bg-background">
      <header className="flex items-center gap-3 px-4 pt-4 pb-2 shrink-0">
        <button onClick={() => navigate("/")} className="w-9 h-9 rounded-xl flex items-center justify-center bg-muted/60 active:scale-95 transition-transform">
          <ArrowLeft className="w-4.5 h-4.5" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-bold text-foreground tracking-tight">{smartTip.greeting}</h1>
          <p className="text-[11px] text-muted-foreground truncate">Driver Operations Center</p>
        </div>
        <button onClick={() => navigate("/settings")} className="w-9 h-9 rounded-xl flex items-center justify-center bg-muted/60 active:scale-95 transition-transform">
          <Settings className="w-4 h-4 text-muted-foreground" />
        </button>
      </header>

      <div className="flex-1 overflow-y-auto px-4 pb-24 space-y-4 pt-2">
        <div className={cn(
          "rounded-2xl p-4 space-y-4 border-2 transition-all",
          model.isOnline
            ? "border-emerald-500/30 bg-gradient-to-br from-emerald-500/8 to-emerald-500/3"
            : "border-border/20 bg-card"
        )}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={cn(
                "w-12 h-12 rounded-2xl flex items-center justify-center transition-colors",
                model.isOnline ? "bg-emerald-500/15" : "bg-muted"
              )}>
                <Power className={cn("w-5 h-5", model.isOnline ? "text-emerald-500" : "text-muted-foreground")} />
              </div>
              <div>
                <p className="text-sm font-bold text-foreground">{model.isOnline ? "You're Online" : "You're Offline"}</p>
                <p className="text-[11px] text-muted-foreground">{model.isOnline ? "Receiving job offers" : "Go online to receive jobs"}</p>
              </div>
            </div>
            <button
              onClick={handleToggleOnline}
              className={cn(
                "rounded-full px-5 py-2.5 text-xs font-bold transition-all active:scale-95",
                model.isOnline
                  ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/25"
                  : "bg-primary text-primary-foreground shadow-lg shadow-primary/25"
              )}
            >
              {model.isOnline ? "Go Offline" : "Go Online"}
            </button>
          </div>

          {model.isOnline && (
            <div className="flex items-center justify-between pt-2 border-t border-border/10">
              <div className="flex items-center gap-2">
                <Zap className={cn("w-4 h-4", model.isAvailable ? "text-primary" : "text-muted-foreground")} />
                <span className="text-xs font-semibold text-foreground">Availability</span>
              </div>
              <button
                onClick={handleToggleAvailable}
                className={cn(
                  "rounded-full px-4 py-1.5 text-[10px] font-bold transition-colors",
                  model.isAvailable ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                )}
              >
                {model.isAvailable ? "Available" : "Busy"}
              </button>
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-primary/15 bg-primary/5 p-3 flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
            <SmartIcon className="w-4 h-4 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold text-primary uppercase tracking-wider">AI Tip</p>
            <p className="text-xs text-foreground/80 leading-relaxed mt-0.5">{smartTip.tip}</p>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-2">
          {STATS.map(s => (
            <div key={s.label} className="rounded-2xl border border-border/15 bg-card p-3 flex flex-col items-center gap-1">
              <s.icon className={cn("w-4 h-4", s.color)} />
              <span className="text-sm font-bold text-foreground tabular-nums">{s.value}</span>
              <span className="text-[10px] text-muted-foreground font-medium">{s.label}</span>
            </div>
          ))}
        </div>

        <div>
          <p className="text-[11px] uppercase tracking-wider font-bold text-muted-foreground mb-3">Quick Actions</p>
          <div className="grid grid-cols-2 gap-2.5">
            {QUICK_ACTIONS.map(a => (
              <button
                key={a.key}
                onClick={() => navigate(a.path)}
                className={cn(
                  "rounded-2xl px-4 py-4 flex flex-col items-start gap-2 active:scale-[0.97] transition-transform shadow-sm",
                  a.color
                )}
              >
                <a.icon className="w-5 h-5" />
                <div>
                  <p className="text-sm font-bold leading-tight">{a.label}</p>
                  <p className="text-[10px] opacity-80">{a.desc}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-border/15 bg-card overflow-hidden">
          <div className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-bold text-foreground">Performance</span>
            </div>
            <button onClick={() => navigate("/driver/earnings")} className="text-[11px] font-semibold text-primary flex items-center gap-0.5">
              Details <ChevronRight className="w-3 h-3" />
            </button>
          </div>
          <div className="px-4 pb-4 space-y-3">
            {[
              {
                label: "This week",
                amount: profile?.weekly_earnings != null ? `${profile.weekly_earnings} AED` : loadingPlaceholder,
                sub: profile?.weekly_trips != null ? `${profile.weekly_trips} trips` : loadingPlaceholder,
                trend: "neutral",
              },
              {
                label: "This month",
                amount: profile?.monthly_earnings != null ? `${profile.monthly_earnings} AED` : loadingPlaceholder,
                sub: profile?.monthly_trips != null ? `${profile.monthly_trips} trips` : loadingPlaceholder,
                trend: "neutral",
              },
            ].map(row => (
              <div key={row.label} className="flex items-center justify-between py-2 border-t border-border/10 first:border-0">
                <div>
                  <p className="text-xs font-semibold text-foreground">{row.label}</p>
                  <p className="text-[10px] text-muted-foreground">{row.sub}</p>
                </div>
                <span className="text-sm font-bold text-foreground tabular-nums">{row.amount}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-border/15 bg-card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0">
            <Shield className="w-5 h-5 text-amber-500" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-foreground">Trust Score</p>
            <p className="text-[11px] text-muted-foreground">Verified driver — 5% commission only</p>
          </div>
          <div className="flex items-center gap-1 bg-emerald-500/10 rounded-full px-2.5 py-1">
            <Star className="w-3 h-3 text-emerald-500" />
            <span className="text-xs font-bold text-emerald-500">A+</span>
          </div>
        </div>
      </div>
    </div>
  );
}
