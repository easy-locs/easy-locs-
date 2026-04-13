import { memo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { platformBus } from "@/lib/shared/platform-bus";
import type { QuickAction } from "./explore.view-model";

interface ExploreQuickActionsProps {
  actions: QuickAction[];
}

export const ExploreQuickActions = memo(function ExploreQuickActions({ actions }: ExploreQuickActionsProps) {
  const navigate = useNavigate();

  const handleTap = useCallback((action: QuickAction) => {
    platformBus.emit("explore:quick_action_clicked", {
      actionKey: action.key,
      intentHint: action.intentHint,
      route: action.route,
      surface: "explore",
    }, "explore");

    if (action.intentHint.startsWith("wallet_")) {
      platformBus.emit("wallet:payment_requested", {
        action: action.intentHint.replace("wallet_", ""),
        context: "explore_quick_action",
      }, "wallet");
    } else {
      navigate(action.route);
    }
  }, [navigate]);

  return (
    <div className="px-4 py-3">
      <h3 className="text-[13px] font-bold text-foreground mb-2.5 flex items-center gap-1.5">
        <span>⚡</span> Quick Actions
      </h3>
      <div className="grid grid-cols-4 gap-2">
        {actions.map((action, i) => (
          <motion.button
            key={action.key}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.03 }}
            onClick={() => handleTap(action)}
            className={`flex flex-col items-center gap-1.5 p-2.5 rounded-2xl bg-gradient-to-br ${action.color} border border-white/8 active:scale-[0.92] transition-all`}
          >
            <span className="text-xl">{action.icon}</span>
            <span className="text-[10px] font-bold text-foreground leading-tight text-center">{action.label}</span>
          </motion.button>
        ))}
      </div>
    </div>
  );
});
