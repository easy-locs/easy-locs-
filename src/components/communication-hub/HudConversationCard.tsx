/**
 * HudConversationCard — Premium dark-glass conversation card
 * for the Command Center Communication Hub.
 */
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { Shield, Star, Zap, User } from "lucide-react";
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
  const config = CONV_TYPE_CONFIG[thread.conversationType];
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

      {/* Scan line animation on hover */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[hsl(var(--hud-cyan)/0.3)] to-transparent" />
      </div>

      <div className="px-3.5 py-3">
        {/* Top row: badges + time */}
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-1.5">
            <span className="text-xs" style={{ color: "hsl(var(--hud-cyan))" }}>
              {TYPE_ICONS[thread.conversationType]}
            </span>
            <Badge
              variant="outline"
              className="text-[9px] px-1.5 py-0 font-medium border-[hsl(var(--hud-border)/0.2)] bg-[hsl(var(--hud-surface)/0.5)]"
              style={{ color: "hsl(var(--hud-cyan-dim))" }}
            >
              {moduleConfig.label}
            </Badge>
            {thread.bookingStatus && (
              <Badge variant="outline" className={`text-[9px] px-1.5 py-0 ${STATUS_COLORS[thread.bookingStatus] || ""}`}>
                {STATUS_LABELS[thread.bookingStatus] || thread.bookingStatus}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            {ref && (
              <span className="text-[9px] font-mono" style={{ color: "hsl(var(--hud-text-dim))" }}>
                #{ref}
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

        {/* Main row: avatar + name */}
        <div className="flex items-start gap-2.5">
          <div
            className="h-9 w-9 rounded-lg flex items-center justify-center shrink-0"
            style={{
              background: "hsl(var(--hud-surface-2))",
              border: "1px solid hsl(var(--hud-border) / 0.15)",
            }}
          >
            <User className="h-3.5 w-3.5" style={{ color: "hsl(var(--hud-cyan-dim))" }} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <p
                className={`text-sm truncate ${thread.unreadCount > 0 ? "font-bold" : "font-medium"}`}
                style={{ color: "hsl(var(--hud-text))" }}
              >
                {thread.name}
              </p>
              <Shield className="h-3 w-3 shrink-0" style={{ color: "hsl(var(--hud-cyan-dim) / 0.4)" }} />
            </div>
            <p className="text-[11px] truncate mt-0.5" style={{ color: "hsl(var(--hud-text-dim))" }}>
              {thread.serviceTitle || thread.listingTitle || thread.propertyLabel || thread.email || "—"}
            </p>
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0">
            {thread.lastMessageTime && (
              <span className="text-[10px] tabular-nums" style={{ color: "hsl(var(--hud-text-dim))" }}>
                {formatDistanceToNow(new Date(thread.lastMessageTime), { addSuffix: false })}
              </span>
            )}
            {thread.totalPrice != null && thread.totalPrice > 0 && (
              <span className="text-[11px] font-bold tabular-nums" style={{ color: "hsl(var(--hud-cyan))" }}>
                {thread.totalPrice.toFixed(0)} {(thread.currency || "€").toUpperCase()}
              </span>
            )}
          </div>
        </div>

        {/* Last message preview */}
        {thread.lastMessage && (
          <p
            className={`text-[11px] truncate mt-2 pl-[46px] ${thread.unreadCount > 0 ? "font-medium" : ""}`}
            style={{ color: thread.unreadCount > 0 ? "hsl(var(--hud-text))" : "hsl(var(--hud-text-dim) / 0.6)" }}
          >
            {thread.lastMessage.slice(0, 80)}
          </p>
        )}
      </div>
    </motion.button>
  );
}
