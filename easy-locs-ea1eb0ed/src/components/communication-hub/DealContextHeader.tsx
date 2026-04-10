/**
 * DealContextHeader — Top bar in chat showing deal status, price, and quick actions.
 * Only visible when an active deal exists for the current thread.
 */
import { memo } from "react";
import { useQuery } from "@tanstack/react-query";
import { db } from "@/services/db";
import {
  Handshake, DollarSign, CheckCircle2, XCircle, Clock,
  ArrowRightLeft, TrendingUp, CalendarCheck, ChevronRight, Timer,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { formatDistanceToNow, isPast } from "date-fns";
import { useI18n } from "@/lib/i18n";

type DealStatus =
  | "inquiry" | "negotiation" | "offer_sent" | "counter_offer"
  | "accepted" | "payment_pending" | "confirmed" | "completed" | "cancelled";

const STATUS_ICON: Record<DealStatus, any> = {
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

const STATUS_STYLE: Record<DealStatus, { bg: string; text: string; border: string }> = {
  inquiry:         { bg: "hsl(var(--primary) / 0.08)", text: "hsl(var(--primary))", border: "hsl(var(--primary) / 0.15)" },
  negotiation:     { bg: "hsl(40 80% 55% / 0.08)", text: "hsl(40 80% 55%)", border: "hsl(40 80% 55% / 0.15)" },
  offer_sent:      { bg: "hsl(var(--primary) / 0.08)", text: "hsl(var(--primary))", border: "hsl(var(--primary) / 0.15)" },
  counter_offer:   { bg: "hsl(280 60% 50% / 0.08)", text: "hsl(280 60% 60%)", border: "hsl(280 60% 50% / 0.15)" },
  accepted:        { bg: "hsl(var(--hud-success) / 0.08)", text: "hsl(var(--hud-success))", border: "hsl(var(--hud-success) / 0.15)" },
  payment_pending: { bg: "hsl(40 80% 55% / 0.08)", text: "hsl(40 80% 55%)", border: "hsl(40 80% 55% / 0.15)" },
  confirmed:       { bg: "hsl(var(--hud-success) / 0.08)", text: "hsl(var(--hud-success))", border: "hsl(var(--hud-success) / 0.15)" },
  completed:       { bg: "hsl(var(--card) / 0.6)", text: "hsl(var(--muted-foreground))", border: "hsl(var(--border) / 0.1)" },
  cancelled:       { bg: "hsl(var(--hud-danger) / 0.08)", text: "hsl(var(--hud-danger))", border: "hsl(var(--hud-danger) / 0.15)" },
};

const STATUS_KEY: Record<DealStatus, string> = {
  inquiry: "orbit.deal.inquiry",
  negotiation: "orbit.deal.negotiation",
  offer_sent: "orbit.deal.offer_sent",
  counter_offer: "orbit.deal.counter",
  accepted: "orbit.deal.accepted",
  payment_pending: "orbit.deal.payment",
  confirmed: "orbit.deal.confirmed",
  completed: "orbit.deal.completed",
  cancelled: "orbit.deal.cancelled",
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

interface DealContextHeaderProps {
  dealId?: string;
  contextType?: string;
  contextId?: string;
  onToggleContext?: () => void;
}

const DealContextHeader = memo(function DealContextHeader({
  dealId,
  contextType,
  contextId,
  onToggleContext,
}: DealContextHeaderProps) {
  const { t } = useI18n();
  const { data: deal } = useQuery({
    queryKey: ["deal-context-header", dealId, contextType, contextId],
    queryFn: async () => {
      if (dealId) {
        const { data } = await db
          .from("deal_rooms")
          .select("*")
          .eq("id", dealId)
          .maybeSingle();
        return data;
      }
      if (contextType && contextId) {
        const { data } = await db
          .from("deal_rooms")
          .select("*")
          .eq("context_type", contextType)
          .eq("context_id", contextId)
          .neq("status", "cancelled" as any)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        return data;
      }
      return null;
    },
    enabled: !!(dealId || (contextType && contextId)),
    staleTime: 10_000,
  });

  const dealData = deal as any;
  if (!dealData) return null;

  const status = dealData.status as DealStatus;
  const style = STATUS_STYLE[status];
  if (!style) return null;

  const Icon = STATUS_ICON[status];
  const displayAmount = dealData.accepted_amount || dealData.counter_offer_amount || dealData.current_offer_amount;
  const currency = dealData.current_offer_currency || "EUR";
  const offerExpiresAt = dealData.offer_expires_at ? new Date(dealData.offer_expires_at) : null;
  const expired = offerExpiresAt ? isPast(offerExpiresAt) : false;
  const expiryText = offerExpiresAt
    ? expired ? t("orbit.deal.expired") : formatDistanceToNow(offerExpiresAt, { addSuffix: true })
    : null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: "auto", opacity: 1 }}
        exit={{ height: 0, opacity: 0 }}
        transition={{ type: "spring", stiffness: 400, damping: 30 }}
        className="shrink-0 overflow-hidden"
      >
        <button
          onClick={onToggleContext}
          className="w-full flex items-center gap-2.5 px-3 sm:px-4 py-2 transition-colors hover:brightness-110"
          style={{
            background: style.bg,
            borderBottom: `1px solid ${style.border}`,
          }}
        >
          <div
            className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: style.border }}
          >
            <Icon className="h-4 w-4" style={{ color: style.text }} />
          </div>

          <div className="min-w-0 flex-1 text-left">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] font-bold" style={{ color: style.text }}>
                🤝 {t("orbit.deal.deal_room")}
              </span>
              <span
                className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold"
                style={{ background: style.border, color: style.text }}
              >
                {t(STATUS_KEY[status])}
              </span>
              {dealData.negotiation_round > 0 && (
                <span className="text-[10px] px-1 py-0.5 rounded-full" style={{ background: "hsl(var(--card))", color: "hsl(var(--muted-foreground))" }}>
                  R{dealData.negotiation_round}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              {dealData.context_title && (
                <p className="text-[10px] line-clamp-1 break-words" style={{ color: "hsl(var(--muted-foreground))" }}>
                  {dealData.context_title}
                </p>
              )}
              {expiryText && (
                <span className="text-[10px] flex items-center gap-0.5 shrink-0" style={{ color: expired ? "hsl(var(--hud-danger))" : "hsl(40 80% 55%)" }}>
                  <Timer className="h-2.5 w-2.5" />
                  {expiryText}
                </span>
              )}
            </div>
          </div>

          {displayAmount && displayAmount > 0 && (
            <span className="text-sm font-bold shrink-0" style={{ color: style.text }}>
              {fmtCurrency(displayAmount, currency)}
            </span>
          )}

          <ChevronRight className="h-3.5 w-3.5 shrink-0" style={{ color: "hsl(var(--muted-foreground) / 0.4)" }} />
        </button>
      </motion.div>
    </AnimatePresence>
  );
});

export default DealContextHeader;
