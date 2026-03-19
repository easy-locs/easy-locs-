/**
 * GodModeInsightsBar — Shows God Mode live data on Orbit Home:
 * role, wallet, loyalty, recommendations, journeys, tickets.
 * All fields mapped from GodModeSnapshot → Recommendation interface.
 */
import { memo } from "react";
import { useNavigate } from "react-router-dom";
import type { GodModeSnapshot } from "@/lib/dino/godMode";
import type { Recommendation } from "@/lib/dino/recommendationBrain";
import {
  Wallet, Star, Route, HeadphonesIcon, Sparkles, Shield,
  ChevronRight,
} from "lucide-react";
import { motion } from "framer-motion";

interface Props {
  snapshot: GodModeSnapshot;
}

export default memo(function GodModeInsightsBar({ snapshot }: Props) {
  const navigate = useNavigate();
  const {
    identity,
    walletSummary,
    loyaltySummary,
    recommendations,
    activeJourneys,
    openTickets,
    nextBestAction,
    reputationScore,
  } = snapshot;

  return (
    <div className="space-y-3">
      {/* Active Role + Trust */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20">
          <Shield className="w-3.5 h-3.5 text-primary" />
          <span className="text-[11px] font-bold text-primary capitalize">{identity.activeRole}</span>
        </div>
        <div className="flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-accent/30 border border-accent/20">
          <span className="text-[10px] font-bold text-accent-foreground">Trust {reputationScore}</span>
        </div>
        {identity.roles.length > 1 && (
          <span className="text-[10px] text-muted-foreground">
            +{identity.roles.length - 1} role{identity.roles.length > 2 ? "s" : ""}
          </span>
        )}
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-2">
        <StatCard
          icon={Wallet}
          label="Wallet"
          value={`${walletSummary.totalBalance.toFixed(0)} ${walletSummary.currencies[0] || "AED"}`}
          color="hsl(var(--primary))"
          onClick={() => navigate("/wallet/hub")}
        />
        <StatCard
          icon={Star}
          label="Loyalty"
          value={`${loyaltySummary.points} pts`}
          sub={loyaltySummary.tier}
          color="hsl(var(--primary))"
        />
        <StatCard
          icon={HeadphonesIcon}
          label="Tickets"
          value={`${openTickets} open`}
          color="hsl(var(--primary))"
        />
      </div>

      {/* Active Journeys */}
      {activeJourneys.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2.5 p-3 rounded-2xl border border-border/10 bg-card/60"
        >
          <Route className="w-4.5 h-4.5 text-primary shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-foreground">
              {activeJourneys.length} active journey{activeJourneys.length > 1 ? "s" : ""}
            </p>
            <p className="text-[10px] text-muted-foreground truncate">
              {(activeJourneys[0] as any)?.journey_type?.replace(/_/g, " ") || "In progress"}
            </p>
          </div>
          <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/40 shrink-0" />
        </motion.div>
      )}

      {/* Next Best Action — navigates to actionRoute */}
      {nextBestAction && (
        <motion.button
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => navigate(nextBestAction.actionRoute)}
          className="w-full flex items-center gap-2.5 p-3 rounded-2xl border border-primary/20 bg-primary/5"
        >
          <Sparkles className="w-4.5 h-4.5 text-primary shrink-0" />
          <div className="flex-1 min-w-0 text-left">
            <p className="text-xs font-bold text-foreground">{nextBestAction.title}</p>
            <p className="text-[10px] text-muted-foreground truncate">
              {nextBestAction.reason}
            </p>
          </div>
          <ChevronRight className="w-3.5 h-3.5 text-primary/40 shrink-0" />
        </motion.button>
      )}

      {/* Recommendations pills — clickable, navigate to actionRoute */}
      {recommendations.length > 0 && (
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide -mx-1 px-1">
          {recommendations.slice(0, 4).map((rec: Recommendation, i: number) => (
            <button
              key={i}
              onClick={() => navigate(rec.actionRoute)}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-accent/40 text-[10px] font-medium text-foreground whitespace-nowrap shrink-0 active:scale-95 transition-transform"
            >
              {rec.vertical} — {rec.title}
            </button>
          ))}
        </div>
      )}
    </div>
  );
});

function StatCard({ icon: Icon, label, value, sub, color, onClick }: {
  icon: React.ElementType; label: string; value: string; sub?: string; color: string; onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-1 py-2.5 rounded-2xl border border-border/10 bg-card/60 active:scale-95 transition-transform"
    >
      <Icon className="w-4 h-4 text-primary" />
      <span className="text-[11px] font-bold text-foreground">{value}</span>
      <span className="text-[9px] text-muted-foreground">{sub || label}</span>
    </button>
  );
}
