import { useNavigate } from "react-router-dom";
import { useCall } from "@/components/call/CallProvider";
import { resolveSmartActions, type SmartEntity, type SmartActionDef } from "@/lib/smart/smart-bridge";
import { useMemo, useState } from "react";
import { haptic } from "@/lib/haptics";
import { toast } from "sonner";
import { motion } from "framer-motion";

interface SmartEntityActionsProps {
  entity: SmartEntity;
  layout?: "row" | "grid" | "compact";
  maxActions?: number;
  className?: string;
}

export default function SmartEntityActions({
  entity,
  layout = "row",
  maxActions = 6,
  className = "",
}: SmartEntityActionsProps) {
  const navigate = useNavigate();
  const { startCall } = useCall();
  const [loading, setLoading] = useState<string | null>(null);

  const actions = useMemo(
    () => resolveSmartActions(entity, navigate, startCall),
    [entity, navigate, startCall],
  );

  const visibleActions = actions.slice(0, maxActions);

  const handleAction = async (action: SmartActionDef) => {
    if (loading) return;
    setLoading(action.action);
    haptic("medium");
    try {
      if (action.handler) {
        await action.handler();
      } else if (action.route) {
        navigate(action.route);
      }
    } catch (err: any) {
      console.error("[SmartAction]", err?.message);
      toast.error("Action failed. Please try again.");
    } finally {
      setLoading(null);
    }
  };

  if (visibleActions.length === 0) return null;

  if (layout === "compact") {
    return (
      <div className={`flex items-center gap-1 ${className}`}>
        {visibleActions.slice(0, 4).map((action, i) => (
          <motion.button
            key={action.action}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.05 }}
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleAction(action); }}
            disabled={!!loading}
            className="w-8 h-8 rounded-full flex items-center justify-center text-[14px] transition-all active:scale-90 disabled:opacity-40"
            style={{ background: "hsl(var(--primary) / 0.08)" }}
            title={action.label}
          >
            {loading === action.action ? (
              <span className="w-3 h-3 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            ) : action.icon}
          </motion.button>
        ))}
      </div>
    );
  }

  if (layout === "grid") {
    return (
      <div className={`grid grid-cols-4 gap-2 ${className}`}>
        {visibleActions.map((action, i) => (
          <motion.button
            key={action.action}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
            onClick={() => handleAction(action)}
            disabled={!!loading}
            className="flex flex-col items-center gap-1 py-2 px-1 rounded-xl transition-all active:scale-95 disabled:opacity-40"
            style={{ background: "hsl(var(--card) / 0.5)" }}
          >
            <span className="text-lg">
              {loading === action.action ? (
                <span className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin inline-block" />
              ) : action.icon}
            </span>
            <span className="text-[10px] font-medium" style={{ color: "hsl(var(--muted-foreground))" }}>
              {action.label}
            </span>
          </motion.button>
        ))}
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2 overflow-x-auto scrollbar-none ${className}`}>
      {visibleActions.map((action, i) => (
        <motion.button
          key={action.action}
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.04 }}
          onClick={() => handleAction(action)}
          disabled={!!loading}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all active:scale-95 shrink-0 disabled:opacity-40"
          style={{
            background: "hsl(var(--primary) / 0.06)",
            color: "hsl(var(--foreground))",
            border: "1px solid hsl(var(--primary) / 0.1)",
          }}
        >
          {loading === action.action ? (
            <span className="w-3 h-3 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          ) : (
            <span className="text-sm">{action.icon}</span>
          )}
          {action.label}
        </motion.button>
      ))}
    </div>
  );
}
