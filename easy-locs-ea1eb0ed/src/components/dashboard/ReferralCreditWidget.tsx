import { memo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { db } from "@/services/db";
import { useAuth } from "@/contexts/AuthContext";
import { Users, Gift, ChevronRight, Loader2 } from "lucide-react";

interface ReferralRewardRow {
  status: string;
  points_awarded: number | null;
}

interface ReferralStats {
  totalReferred: number;
  pendingReferred: number;
  creditsEarned: number;
}

async function fetchReferralStats(userId: string): Promise<ReferralStats> {
  const { data, error } = await db
    .from("referral_rewards")
    .select("status, points_awarded")
    .eq("referrer_id", userId);

  if (error) throw error;

  const rows = (data || []) as ReferralRewardRow[];
  return {
    totalReferred: rows.filter(r => r.status === "credited").length,
    pendingReferred: rows.filter(r => r.status === "pending").length,
    creditsEarned: rows.reduce((sum, r) => sum + (r.points_awarded || 0), 0),
  };
}

const ReferralCreditWidget = memo(function ReferralCreditWidget() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: stats, isLoading } = useQuery({
    queryKey: ["referral-credit-stats", user?.id],
    queryFn: () => fetchReferralStats(user!.id),
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });

  if (!user) return null;

  if (isLoading) {
    return (
      <div className="px-4" style={{ marginBottom: "var(--section-gap)" }}>
        <div className="rounded-2xl p-4 animate-pulse bg-card border border-border">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 rounded-lg bg-muted/30" />
            <div className="h-4 w-28 rounded bg-muted/30" />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="h-14 rounded-xl bg-muted/20" />
            <div className="h-14 rounded-xl bg-muted/20" />
            <div className="h-14 rounded-xl bg-muted/20" />
          </div>
        </div>
      </div>
    );
  }

  if (!stats || (stats.totalReferred === 0 && stats.pendingReferred === 0)) {
    return (
      <div className="px-4" style={{ marginBottom: "var(--section-gap)" }}>
        <button
          onClick={() => navigate("/referrals")}
          className="w-full rounded-2xl p-4 flex items-center gap-3 text-left transition-transform active:scale-[0.98] bg-card border border-border"
        >
          <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-accent/10">
            <Gift className="h-5 w-5 text-accent" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold text-foreground">Invite friends, earn credits</p>
            <p className="text-xs text-muted-foreground">Share your referral code to get rewards</p>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>
    );
  }

  return (
    <div className="px-4" style={{ marginBottom: "var(--section-gap)" }}>
      <button
        onClick={() => navigate("/referrals")}
        className="w-full text-left rounded-2xl overflow-hidden transition-transform active:scale-[0.98] bg-card border border-border"
      >
        <div className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-accent/15">
                <Users size={14} className="text-accent" />
              </div>
              <p className="text-[0.8125rem] font-bold text-foreground">Referral Credits</p>
            </div>
            <div className="flex items-center gap-1 text-[0.6875rem] font-semibold text-accent">
              Details <ChevronRight size={12} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="p-2.5 rounded-xl bg-muted/10 text-center">
              <p className="text-base font-extrabold text-foreground">{stats.totalReferred}</p>
              <p className="text-[0.5625rem] text-muted-foreground uppercase tracking-wider mt-0.5">Referred</p>
            </div>
            <div className="p-2.5 rounded-xl bg-muted/10 text-center">
              <p className="text-base font-extrabold text-foreground">{stats.pendingReferred}</p>
              <p className="text-[0.5625rem] text-muted-foreground uppercase tracking-wider mt-0.5">Pending</p>
            </div>
            <div className="p-2.5 rounded-xl bg-accent/8 text-center">
              <p className="text-base font-extrabold text-accent">{stats.creditsEarned}</p>
              <p className="text-[0.5625rem] text-muted-foreground uppercase tracking-wider mt-0.5">Credits</p>
            </div>
          </div>
        </div>
      </button>
    </div>
  );
});

export default ReferralCreditWidget;
