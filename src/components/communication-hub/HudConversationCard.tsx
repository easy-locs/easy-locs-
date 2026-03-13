/**
 * HudConversationCard — Premium dark-glass conversation card
 * with improved message preview readability and cleaner layout.
 */
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { Shield, User } from "lucide-react";
import type { ConversationThread, ConversationType } from "./types";
import { CONV_TYPE_CONFIG, SOURCE_MODULE_CONFIG, STATUS_COLORS, STATUS_LABELS } from "./types";

interface Props {
  thread: ConversationThread;
  isActive: boolean;
  index: number;
  onClick: () => void;
}

const TYPE_ICONS: Record<ConversationType, string> = {
  direct: "💬", business: "🏢", listing: "🏷️",
  booking: "📅", deal: "🤝", property: "🏠", team: "👥",
};

export default function HudConversationCard({ thread, isActive, index, onClick }: Props) {
  const moduleConfig = SOURCE_MODULE_CONFIG[thread.sourceModule];
  const ref = thread.bookingId?.slice(0, 8) || thread.leadId?.slice(0, 8) || thread.dealId?.slice(0, 8);

  return (
    <motion.button
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: Math.min(index * 0.02, 0.3), duration: 0.3 }}
      onClick={onClick}
      className={`w-full text-left rounded-xl transition-all duration-200 group relative overflow-hidden ${
        isActive
          ? "ring-1 ring-[hsl(var(--hud-border)/0.5)] shadow-[var(--hud-glow)]"
          : "hover:ring-1 hover:ring-[hsl(var(--hud-border)/0.2)]"
      }`}
      style={{
        background: isActive
          ? "linear-gradient(135deg, hsl(220 50% 10% / 0.95), hsl(220 45% 14% / 0.9))"
          : "hsl(220 50% 8% / 0.6)",
        backdropFilter: "blur(12px)",
      }}
    >
      {/* Active indicator line */}
      {isActive && (
        <motion.div
          layoutId="active-thread"
          className="absolute left-0 top-2 bottom-2 w-0.5 rounded-full"
          style={{ background: "hsl(var(--hud-cyan))" }}
        />
      )}

      {/* Scan line on hover */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[hsl(var(--hud-cyan)/0.3)] to-transparent" />
      </div>

      <div className="px-3.5 py-3">
        {/* Row 1: avatar + name + time */}
        <div className="flex items-start gap-2.5">
          <div
            className="h-10 w-10 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
            style={{
              background: "hsl(var(--hud-surface-2))",
              border: "1px solid hsl(var(--hud-border) / 0.15)",
            }}
          >
            <User className="h-4 w-4" style={{ color: "hsl(var(--hud-cyan-dim))" }} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 min-w-0">
                <p
                  className={`text-sm truncate ${thread.unreadCount > 0 ? "font-bold" : "font-medium"}`}
                  style={{ color: "hsl(var(--hud-text))" }}
                >
                  {thread.name}
                </p>
                <Shield className="h-3 w-3 shrink-0" style={{ color: "hsl(var(--hud-cyan-dim) / 0.4)" }} />
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {thread.lastMessageTime && (
                  <span className="text-[10px] tabular-nums" style={{ color: "hsl(var(--hud-text-dim))" }}>
                    {formatDistanceToNow(new Date(thread.lastMessageTime), { addSuffix: false })}
                  </span>
                )}
                {thread.unreadCount > 0 && (
                  <span
                    className="text-[10px] font-bold rounded-full h-[18px] min-w-[18px] flex items-center justify-center px-1"
                    style={{
                      background: "hsl(var(--hud-cyan))",
                      color: "hsl(var(--hud-bg))",
                      boxShadow: "0 0 8px hsl(var(--hud-cyan) / 0.4)",
                    }}
                  >
                    {thread.unreadCount}
                  </span>
                )}
              </div>
            </div>

            {/* Context line */}
            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
              <Badge
                variant="outline"
                className="text-[9px] px-1.5 py-0 font-medium border-[hsl(var(--hud-border)/0.2)] bg-[hsl(var(--hud-surface)/0.5)]"
                style={{ color: "hsl(var(--hud-cyan-dim))" }}
              >
                {TYPE_ICONS[thread.conversationType]} {moduleConfig.label}
              </Badge>
              {thread.bookingStatus && (
                <Badge variant="outline" className={`text-[9px] px-1.5 py-0 ${STATUS_COLORS[thread.bookingStatus] || ""}`}>
                  {STATUS_LABELS[thread.bookingStatus] || thread.bookingStatus}
                </Badge>
              )}
              {ref && (
                <span className="text-[9px] font-mono" style={{ color: "hsl(var(--hud-text-dim))" }}>
                  #{ref}
                </span>
              )}
              {thread.totalPrice != null && thread.totalPrice > 0 && (
                <span className="text-[10px] font-bold tabular-nums ml-auto" style={{ color: "hsl(var(--hud-cyan))" }}>
                  {thread.totalPrice.toFixed(0)} {(thread.currency || "€").toUpperCase()}
                </span>
              )}
            </div>

            {/* Message preview — improved: 2 lines, no clipping */}
            {thread.lastMessage && (
              <p
                className={`text-[12px] leading-[1.4] mt-1.5 line-clamp-2 ${thread.unreadCount > 0 ? "font-medium" : ""}`}
                style={{ color: thread.unreadCount > 0 ? "hsl(var(--hud-text) / 0.85)" : "hsl(var(--hud-text-dim) / 0.55)" }}
              >
                {thread.lastMessage}
              </p>
            )}
          </div>
        </div>
      </div>
    </motion.button>
  );
}
