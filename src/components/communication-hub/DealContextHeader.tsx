/**
 * DealContextHeader — Top bar in chat showing deal status, price, and quick actions.
 * Only visible when an active deal exists for the current thread.
 */
import { memo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Handshake, DollarSign, CheckCircle2, XCircle, Clock,
  ArrowRightLeft, TrendingUp, CalendarCheck, ChevronRight,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type DealStatus =
  | "inquiry" | "negotiation" | "offer_sent" | "counter_offer"
  | "accepted" | "payment_pending" | "confirmed" | "completed" | "cancelled";

const STATUS_CONFIG: Record<DealStatus, { label: string; icon: any; bg: string; text: string; border: string }> = {
  inquiry:         { label: "Inquiry",     icon: Handshake,      bg: "hsl(var(--hud-cyan) / 0.08)", text: "hsl(var(--hud-cyan))", border: "hsl(var(--hud-cyan) / 0.15)" },
  negotiation:     { label: "Negotiation", icon: ArrowRightLeft, bg: "hsl(40 80% 55% / 0.08)", text: "hsl(40 80% 55%)", border: "hsl(40 80% 55% / 0.15)" },
  offer_sent:      { label: "Offer Sent",  icon: DollarSign,     bg: "hsl(var(--hud-cyan) / 0.08)", text: "hsl(var(--hud-cyan))", border: "hsl(var(--hud-cyan) / 0.15)" },
  counter_offer:   { label: "Counter",     icon: TrendingUp,     bg: "hsl(280 60% 50% / 0.08)", text: "hsl(280 60% 60%)", border: "hsl(280 60% 50% / 0.15)" },
  accepted:        { label: "Accepted",    icon: CheckCircle2,   bg: "hsl(var(--hud-success) / 0.08)", text: "hsl(var(--hud-success))", border: "hsl(var(--hud-success) / 0.15)" },
  payment_pending: { label: "Payment",     icon: Clock,          bg: "hsl(40 80% 55% / 0.08)", text: "hsl(40 80% 55%)", border: "hsl(40 80% 55% / 0.15)" },
  confirmed:       { label: "Confirmed",   icon: CalendarCheck,  bg: "hsl(var(--hud-success) / 0.08)", text: "hsl(var(--hud-success))", border: "hsl(var(--hud-success) / 0.15)" },
  completed:       { label: "Completed",   icon: CheckCircle2,   bg: "hsl(var(--hud-surface) / 0.6)", text: "hsl(var(--hud-text-dim))", border: "hsl(var(--hud-border) / 0.1)" },
  cancelled:       { label: "Cancelled",   icon: XCircle,        bg: "hsl(var(--hud-danger) / 0.08)", text: "hsl(var(--hud-danger))", border: "hsl(var(--hud-danger) / 0.15)" },
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
  const { data: deal } = useQuery({
    queryKey: ["deal-context-header", dealId, contextType, contextId],
    queryFn: async () => {
      if (dealId) {
        const { data } = await supabase
          .from("deal_rooms")
          .select("*")
          .eq("id", dealId)
          .maybeSingle();
        return data;
      }
      if (contextType && contextId) {
        const { data } = await supabase
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
  const config = STATUS_CONFIG[status];
  if (!config) return null;

  const Icon = config.icon;
  const displayAmount = dealData.accepted_amount || dealData.counter_offer_amount || dealData.current_offer_amount;
  const currency = dealData.current_offer_currency || "EUR";

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
            background: config.bg,
            borderBottom: `1px solid ${config.border}`,
          }}
        >
          {/* Status icon */}
          <div
            className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: config.border }}
          >
            <Icon className="h-4 w-4" style={{ color: config.text }} />
          </div>

          {/* Info */}
          <div className="min-w-0 flex-1 text-left">
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-bold" style={{ color: config.text }}>
                🤝 Deal Room
              </span>
              <span
                className="text-[9px] px-1.5 py-0.5 rounded-full font-semibold"
                style={{ background: config.border, color: config.text }}
              >
                {config.label}
              </span>
            </div>
            {dealData.context_title && (
              <p className="text-[10px] truncate mt-0.5" style={{ color: "hsl(var(--hud-text-dim))" }}>
                {dealData.context_title}
              </p>
            )}
          </div>

          {/* Price */}
          {displayAmount && displayAmount > 0 && (
            <span className="text-sm font-bold shrink-0" style={{ color: config.text }}>
              {fmtCurrency(displayAmount, currency)}
            </span>
          )}

          <ChevronRight className="h-3.5 w-3.5 shrink-0" style={{ color: "hsl(var(--hud-text-dim) / 0.4)" }} />
        </button>
      </motion.div>
    </AnimatePresence>
  );
});

export default DealContextHeader;
