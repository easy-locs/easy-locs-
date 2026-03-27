/**
 * ChatEmptyState — Empty state when no thread is selected.
 */
import { Shield, Lock } from "lucide-react";
import { motion } from "framer-motion";
import { trackOrbitEvent } from "@/lib/orbit/orbitTelemetry";
import { useEffect } from "react";

interface Props {
  t: (key: string) => string;
}

export default function ChatEmptyState({ t }: Props) {
  useEffect(() => {
    trackOrbitEvent("orbit.conversation.opened", {
      screen: "chat", component: "ChatEmptyState", action: "no_thread_selected",
      result: "skipped",
    });
  }, []);

  return (
    <div className="flex-1 flex items-center justify-center" style={{ background: "hsl(var(--hud-bg))" }}>
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center max-w-md px-6">
        <div className="relative w-28 h-28 mx-auto mb-8">
          <div className="absolute inset-0 rounded-full" style={{
            background: "radial-gradient(circle, hsl(var(--hud-cyan) / 0.15) 0%, transparent 70%)",
          }} />
          <div className="absolute inset-4 rounded-full flex items-center justify-center" style={{
            background: "hsl(var(--hud-surface))",
            border: "1px solid hsl(var(--hud-border) / 0.2)",
            boxShadow: "var(--hud-glow), inset 0 0 20px hsl(var(--hud-cyan) / 0.05)",
          }}>
            <Shield className="h-8 w-8" style={{ color: "hsl(var(--hud-cyan) / 0.6)" }} />
          </div>
          <motion.div
            className="absolute w-2 h-2 rounded-full"
            style={{ background: "hsl(var(--hud-cyan))", boxShadow: "0 0 8px hsl(var(--hud-cyan) / 0.5)", transformOrigin: "4px 56px" }}
            animate={{ rotate: 360 }}
            transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
          />
        </div>
        <h3 className="text-lg font-bold mb-2" style={{ color: "hsl(var(--hud-text))" }}>
          {t("orbit.command_center") || "Command Center"}
        </h3>
        <p className="text-sm mb-1" style={{ color: "hsl(var(--hud-text-dim))" }}>
          {t("orbit.secure_hub") || "Secure business communication hub"}
        </p>
        <div className="flex items-center justify-center gap-2 mt-3 mb-6">
          <Lock className="h-3 w-3" style={{ color: "hsl(var(--hud-success) / 0.5)" }} />
          <span className="text-[10px] font-medium uppercase tracking-widest" style={{ color: "hsl(var(--hud-success) / 0.5)" }}>
            {t("orbit.e2e_channel") || "End-to-end encrypted channel"}
          </span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {[
            { icon: "💬", label: "Chat" },
            { icon: "📞", label: "Calls" },
            { icon: "📁", label: "Files" },
            { icon: "💳", label: "Payments" },
            { icon: "🤝", label: "Deals" },
            { icon: "🏠", label: "Properties" },
          ].map(p => (
            <div key={p.label} className="px-3 py-2.5 rounded-lg text-center" style={{
              background: "hsl(var(--hud-surface))",
              border: "1px solid hsl(var(--hud-border) / 0.1)",
            }}>
              <span className="text-base">{p.icon}</span>
              <p className="text-[10px] font-medium mt-1" style={{ color: "hsl(var(--hud-text-dim))" }}>{p.label}</p>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
