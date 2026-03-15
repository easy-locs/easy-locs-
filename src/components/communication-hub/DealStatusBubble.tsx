/**
 * DealStatusBubble — Inline system-style message bubble for deal events in chat.
 * Renders as centered rich cards showing offer amounts, status transitions, and payment events.
 */
import { memo } from "react";
import {
  DollarSign, ArrowRightLeft, CheckCircle2, XCircle,
  Clock, TrendingUp, FileText, CalendarCheck, Handshake,
} from "lucide-react";
import { format } from "date-fns";
import { motion } from "framer-motion";

type DealEventType =
  | "status_change" | "offer" | "counter_offer"
  | "document" | "payment" | "visit_scheduled";

interface DealStatusBubbleProps {
  eventType: DealEventType;
  data: Record<string, any>;
  createdAt: string;
  actorRole?: string;
}

const EVENT_CONFIG: Record<string, {
  icon: any;
  bg: string;
  border: string;
  text: string;
  glow: string;
}> = {
  offer: {
    icon: DollarSign,
    bg: "hsl(var(--hud-cyan) / 0.08)",
    border: "hsl(var(--hud-cyan) / 0.15)",
    text: "hsl(var(--hud-cyan))",
    glow: "0 0 12px hsl(var(--hud-cyan) / 0.1)",
  },
  counter_offer: {
    icon: TrendingUp,
    bg: "hsl(280 60% 50% / 0.08)",
    border: "hsl(280 60% 50% / 0.15)",
    text: "hsl(280 60% 60%)",
    glow: "0 0 12px hsl(280 60% 50% / 0.1)",
  },
  status_change: {
    icon: ArrowRightLeft,
    bg: "hsl(var(--hud-surface) / 0.6)",
    border: "hsl(var(--hud-border) / 0.1)",
    text: "hsl(var(--hud-text-dim))",
    glow: "none",
  },
  payment: {
    icon: DollarSign,
    bg: "hsl(var(--hud-success) / 0.08)",
    border: "hsl(var(--hud-success) / 0.15)",
    text: "hsl(var(--hud-success))",
    glow: "0 0 12px hsl(var(--hud-success) / 0.1)",
  },
  document: {
    icon: FileText,
    bg: "hsl(210 80% 55% / 0.08)",
    border: "hsl(210 80% 55% / 0.15)",
    text: "hsl(210 80% 60%)",
    glow: "none",
  },
  visit_scheduled: {
    icon: CalendarCheck,
    bg: "hsl(200 80% 50% / 0.08)",
    border: "hsl(200 80% 50% / 0.15)",
    text: "hsl(200 80% 60%)",
    glow: "none",
  },
};

const STATUS_LABELS: Record<string, { label: string; icon: any; color: string }> = {
  inquiry:         { label: "Deal started", icon: Handshake, color: "hsl(var(--hud-cyan))" },
  negotiation:     { label: "Negotiation", icon: ArrowRightLeft, color: "hsl(40 80% 55%)" },
  offer_sent:      { label: "Offer sent", icon: DollarSign, color: "hsl(var(--hud-cyan))" },
  counter_offer:   { label: "Counter-offer", icon: TrendingUp, color: "hsl(280 60% 60%)" },
  accepted:        { label: "Deal accepted", icon: CheckCircle2, color: "hsl(var(--hud-success))" },
  payment_pending: { label: "Payment pending", icon: Clock, color: "hsl(40 80% 55%)" },
  confirmed:       { label: "Deal confirmed", icon: CalendarCheck, color: "hsl(var(--hud-success))" },
  completed:       { label: "Deal completed", icon: CheckCircle2, color: "hsl(var(--hud-text-dim))" },
  cancelled:       { label: "Deal cancelled", icon: XCircle, color: "hsl(var(--hud-danger))" },
};

import { formatDistanceToNow, isPast } from "date-fns";

function fmtCurrency(amount: number, currency: string = "EUR") {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: (currency || "EUR").toUpperCase(),
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${amount} ${currency}`;
  }
}

function getEventContent(eventType: string, data: Record<string, any>, actorRole?: string): { title: string; subtitle?: string; expiry?: string } {
  const role = actorRole === "seller" ? "Seller" : "Buyer";
  const round = data.round ? ` (R${data.round})` : "";

  switch (eventType) {
    case "offer":
      return {
        title: `💰 Offer${round}: ${fmtCurrency(data.amount, data.currency)}`,
        subtitle: data.message || `${role} sent an offer`,
        expiry: data.expires_at && !isPast(new Date(data.expires_at))
          ? `Expires ${formatDistanceToNow(new Date(data.expires_at), { addSuffix: true })}`
          : data.expires_at && isPast(new Date(data.expires_at))
          ? "⏳ Expired"
          : undefined,
      };
    case "counter_offer":
      return {
        title: `🔄 Counter${round}: ${fmtCurrency(data.amount, data.currency)}`,
        subtitle: data.message || `${role} made a counter-offer`,
        expiry: data.expires_at && !isPast(new Date(data.expires_at))
          ? `Expires ${formatDistanceToNow(new Date(data.expires_at), { addSuffix: true })}`
          : undefined,
      };
    case "status_change": {
      const newStatus = data.new_status;
      const config = STATUS_LABELS[newStatus];
      if (data.reason === "offer_expired") {
        return {
          title: "⏳ Offer expired",
          subtitle: "The offer deadline has passed — back to negotiation",
        };
      }
      if (data.action === "accepted" && data.accepted_amount) {
        return {
          title: `✅ Accepted: ${fmtCurrency(data.accepted_amount, data.currency)}`,
          subtitle: "Deal terms agreed",
        };
      }
      return {
        title: config?.label || `Status: ${newStatus}`,
        subtitle: data.old_status ? `${STATUS_LABELS[data.old_status]?.label || data.old_status} → ${config?.label || newStatus}` : undefined,
      };
    }
    case "payment":
      return {
        title: `💳 ${data.action === "payment_request_sent" ? "Payment requested" : "Payment event"}`,
        subtitle: data.amount ? fmtCurrency(data.amount, data.currency) : undefined,
      };
    case "document":
      return {
        title: "📄 Document shared",
        subtitle: data.name || undefined,
      };
    case "visit_scheduled":
      return {
        title: "📅 Visit scheduled",
        subtitle: data.date ? `${data.date}${data.note ? ` — ${data.note}` : ""}` : undefined,
      };
    default:
      return { title: `Deal event: ${eventType}` };
  }
}

const DealStatusBubble = memo(function DealStatusBubble({
  eventType,
  data,
  createdAt,
  actorRole,
}: DealStatusBubbleProps) {
  const config = EVENT_CONFIG[eventType] || EVENT_CONFIG.status_change;
  const Icon = config.icon;
  const { title, subtitle, expiry } = getEventContent(eventType, data, actorRole);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
      className="flex justify-center my-3"
    >
      <div
        className="flex items-center gap-2.5 px-4 py-2 rounded-xl max-w-[85%]"
        style={{
          background: config.bg,
          border: `1px solid ${config.border}`,
          boxShadow: config.glow,
        }}
      >
        <div
          className="h-7 w-7 rounded-full flex items-center justify-center shrink-0"
          style={{ background: config.border }}
        >
          <Icon className="h-3.5 w-3.5" style={{ color: config.text }} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold leading-tight" style={{ color: config.text }}>
            {title}
          </p>
          {subtitle && (
            <p className="text-[10px] mt-0.5 leading-tight break-words" style={{ color: `${config.text}80` }}>
              {subtitle}
            </p>
          )}
        </div>
        <span className="text-[9px] shrink-0 self-end" style={{ color: "hsl(var(--hud-text-dim) / 0.5)" }}>
          {format(new Date(createdAt), "HH:mm")}
        </span>
      </div>
    </motion.div>
  );
});

export default DealStatusBubble;
export type { DealEventType };
