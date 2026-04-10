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
import { formatDistanceToNow, isPast } from "date-fns";
import { useI18n } from "@/lib/i18n";

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
    bg: "hsl(var(--primary) / 0.08)",
    border: "hsl(var(--primary) / 0.15)",
    text: "hsl(var(--primary))",
    glow: "0 0 12px hsl(var(--primary) / 0.1)",
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
    bg: "hsl(var(--card) / 0.6)",
    border: "hsl(var(--border) / 0.1)",
    text: "hsl(var(--muted-foreground))",
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

const STATUS_ICON_MAP: Record<string, any> = {
  inquiry: Handshake,
  negotiation: ArrowRightLeft,
  offer_sent: DollarSign,
  counter_offer: TrendingUp,
  accepted: CheckCircle2,
  payment_pending: Clock,
  confirmed: CalendarCheck,
  completed: CheckCircle2,
  cancelled: XCircle,
};

const STATUS_COLOR_MAP: Record<string, string> = {
  inquiry: "hsl(var(--primary))",
  negotiation: "hsl(40 80% 55%)",
  offer_sent: "hsl(var(--primary))",
  counter_offer: "hsl(280 60% 60%)",
  accepted: "hsl(var(--hud-success))",
  payment_pending: "hsl(40 80% 55%)",
  confirmed: "hsl(var(--hud-success))",
  completed: "hsl(var(--muted-foreground))",
  cancelled: "hsl(var(--hud-danger))",
};

const STATUS_LABEL_KEY: Record<string, string> = {
  inquiry: "orbit.deal.deal_started",
  negotiation: "orbit.deal.negotiation",
  offer_sent: "orbit.deal.offer_sent_label",
  counter_offer: "orbit.deal.counter_offer",
  accepted: "orbit.deal.deal_accepted",
  payment_pending: "orbit.deal.payment_pending",
  confirmed: "orbit.deal.deal_confirmed",
  completed: "orbit.deal.deal_completed",
  cancelled: "orbit.deal.deal_cancelled",
};

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

function useEventContent(eventType: string, data: Record<string, any>, actorRole?: string): { title: string; subtitle?: string; expiry?: string } {
  const { t } = useI18n();
  const role = actorRole === "seller" ? t("orbit.deal.seller") : t("orbit.deal.buyer");
  const round = data.round ? ` (R${data.round})` : "";

  switch (eventType) {
    case "offer":
      return {
        title: `💰 ${t("orbit.deal.offer")}${round}: ${fmtCurrency(data.amount, data.currency)}`,
        subtitle: data.message || `${role} ${t("orbit.deal.sent_offer")}`,
        expiry: data.expires_at && !isPast(new Date(data.expires_at))
          ? `${t("orbit.deal.expires")} ${formatDistanceToNow(new Date(data.expires_at), { addSuffix: true })}`
          : data.expires_at && isPast(new Date(data.expires_at))
          ? `⏳ ${t("orbit.deal.expired")}`
          : undefined,
      };
    case "counter_offer":
      return {
        title: `🔄 ${t("orbit.deal.counter_label")}${round}: ${fmtCurrency(data.amount, data.currency)}`,
        subtitle: data.message || `${role} ${t("orbit.deal.made_counter")}`,
        expiry: data.expires_at && !isPast(new Date(data.expires_at))
          ? `${t("orbit.deal.expires")} ${formatDistanceToNow(new Date(data.expires_at), { addSuffix: true })}`
          : undefined,
      };
    case "status_change": {
      const newStatus = data.new_status;
      const labelKey = STATUS_LABEL_KEY[newStatus];
      if (data.reason === "offer_expired") {
        return {
          title: `⏳ ${t("orbit.deal.offer_expired")}`,
          subtitle: t("orbit.deal.offer_expired_desc"),
        };
      }
      if (data.action === "accepted" && data.accepted_amount) {
        return {
          title: `✅ ${t("orbit.deal.accepted")}: ${fmtCurrency(data.accepted_amount, data.currency)}`,
          subtitle: t("orbit.deal.terms_agreed"),
        };
      }
      const statusLabel = labelKey ? t(labelKey) : newStatus;
      return {
        title: statusLabel,
        subtitle: data.old_status ? `${STATUS_LABEL_KEY[data.old_status] ? t(STATUS_LABEL_KEY[data.old_status]) : data.old_status} → ${statusLabel}` : undefined,
      };
    }
    case "payment":
      return {
        title: `💳 ${data.action === "payment_request_sent" ? t("orbit.deal.payment_requested") : t("orbit.deal.payment_event")}`,
        subtitle: data.amount ? fmtCurrency(data.amount, data.currency) : undefined,
      };
    case "document":
      return {
        title: `📄 ${t("orbit.deal.document_shared")}`,
        subtitle: data.name || undefined,
      };
    case "visit_scheduled":
      return {
        title: `📅 ${t("orbit.deal.visit_scheduled")}`,
        subtitle: data.date ? `${data.date}${data.note ? ` — ${data.note}` : ""}` : undefined,
      };
    default:
      return { title: `${t("orbit.deal.deal_event")}: ${eventType}` };
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
  const { title, subtitle, expiry } = useEventContent(eventType, data, actorRole);

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
          {expiry && (
            <p className="text-[10px] mt-0.5 leading-tight" style={{ color: "hsl(40 80% 55%)" }}>
              ⏱ {expiry}
            </p>
          )}
        </div>
        <span className="text-[10px] shrink-0 self-end" style={{ color: "hsl(var(--muted-foreground) / 0.5)" }}>
          {format(new Date(createdAt), "HH:mm")}
        </span>
      </div>
    </motion.div>
  );
});

export default DealStatusBubble;
export type { DealEventType };
