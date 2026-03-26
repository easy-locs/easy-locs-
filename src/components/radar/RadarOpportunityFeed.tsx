/**
 * RadarOpportunityFeed — Phase 1 Radar Home opportunity cards.
 *
 * Renders scored opportunities with routing to Marketplace / Orbit / Wallet.
 * Reuses SmartActionCard pattern for visual consistency.
 */
import { useRadarOpportunities } from "@/hooks/useRadarOpportunities";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  Flame, Store, MessageCircle, Wallet, Zap, MapPin, TrendingUp,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { RouteModule } from "@/lib/radar/opportunity-scorer";

const ICON_MAP: Record<string, React.ElementType> = {
  flame: Flame,
  store: Store,
  "message-circle": MessageCircle,
  wallet: Wallet,
  zap: Zap,
  "map-pin": MapPin,
  "trending-up": TrendingUp,
};

const MODULE_COLORS: Record<RouteModule, string> = {
  marketplace: "bg-primary/10 text-primary border-primary/20",
  orbit: "bg-accent/10 text-accent border-accent/20",
  wallet: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
};

const MODULE_LABELS: Record<RouteModule, string> = {
  marketplace: "Marketplace",
  orbit: "Orbit",
  wallet: "Wallet",
};

export function RadarOpportunityFeed({ className }: { className?: string }) {
  const { data: opportunities, isLoading } = useRadarOpportunities();
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className={cn("space-y-3", className)}>
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 rounded-xl bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  if (!opportunities || opportunities.length === 0) {
    return (
      <div className={cn("text-center py-8 text-muted-foreground text-sm", className)}>
        No active opportunities right now — check back soon.
      </div>
    );
  }

  return (
    <div className={cn("space-y-2.5", className)}>
      <AnimatePresence mode="popLayout">
        {opportunities.map((opp, idx) => {
          const Icon = ICON_MAP[opp.icon_key ?? "zap"] ?? Zap;
          const routeModule = (opp.route_module ?? "marketplace") as RouteModule;
          const moduleColor = MODULE_COLORS[routeModule];

          return (
            <motion.button
              key={opp.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ delay: idx * 0.05 }}
              onClick={() => navigate(opp.route_path)}
              className={cn(
                "w-full flex items-start gap-3 p-3.5 rounded-xl border bg-card",
                "shadow-card hover:shadow-card-hover hover:-translate-y-0.5",
                "transition-all duration-200 text-left group",
              )}
            >
              {/* Icon */}
              <div className={cn(
                "shrink-0 w-9 h-9 rounded-lg flex items-center justify-center",
                moduleColor,
              )}>
                <Icon className="w-4.5 h-4.5" />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-foreground truncate">
                    {opp.title}
                  </span>
                  {opp.score >= 0.7 && (
                    <span className="shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-destructive/10 text-destructive">
                      HOT
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                  {opp.description}
                </p>
                <div className="flex items-center gap-2 mt-1.5">
                  <span className={cn(
                    "text-[10px] font-medium px-1.5 py-0.5 rounded-full border",
                    moduleColor,
                  )}>
                    {MODULE_LABELS[routeModule]}
                  </span>
                  {opp.zone_key && (
                    <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                      <MapPin className="w-3 h-3" />
                      {opp.city || opp.zone_key}
                    </span>
                  )}
                  <span className="text-[10px] text-muted-foreground tabular-nums ml-auto">
                    {Math.round((opp.score ?? 0) * 100)}%
                  </span>
                </div>
              </div>
            </motion.button>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
