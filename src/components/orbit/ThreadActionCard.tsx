/**
 * ThreadActionCard — Inline action cards rendered inside Orbit chat threads.
 * 
 * These cards transform threads from passive chat into active business interfaces.
 * Each card type maps to a ThreadActionType and renders contextual CTAs
 * (Pay, Confirm, Sign, Track, View Receipt, etc.)
 */
import { motion } from "framer-motion";
import {
  CreditCard, CheckCircle, XCircle, FileSignature,
  MapPin, Receipt, Star, AlertTriangle, RefreshCw,
  Calendar, ExternalLink, Truck, Phone, Video,
  Shield, Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useI18n } from "@/lib/i18n";
import { useGhostMask } from "@/hooks/useGhostMask";
import type { ThreadActionPayload, ThreadActionType } from "@/lib/orbit/context-thread-factory";

/* ═══════════════════════════════════════════════════
   ACTION CARD CONFIG
   ═══════════════════════════════════════════════════ */

const ACTION_ICONS: Record<ThreadActionType, typeof CreditCard> = {
  pay: CreditCard,
  confirm: CheckCircle,
  cancel: XCircle,
  sign: FileSignature,
  track: Truck,
  view_receipt: Receipt,
  view_document: ExternalLink,
  rate: Star,
  dispute: AlertTriangle,
  refund: RefreshCw,
  schedule: Calendar,
  share_location: MapPin,
  call: Phone,
  video_call: Video,
};

const VARIANT_STYLES: Record<string, { bg: string; border: string; iconColor: string }> = {
  primary: {
    bg: "bg-primary/5",
    border: "border-primary/15",
    iconColor: "text-primary",
  },
  secondary: {
    bg: "bg-muted/50",
    border: "border-border",
    iconColor: "text-muted-foreground",
  },
  destructive: {
    bg: "bg-destructive/5",
    border: "border-destructive/15",
    iconColor: "text-destructive",
  },
  success: {
    bg: "bg-emerald-500/5",
    border: "border-emerald-500/15",
    iconColor: "text-emerald-600",
  },
};

/* ═══════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════ */

interface ThreadActionCardProps {
  payload: ThreadActionPayload;
  /** Optional text context above the card */
  contextText?: string;
  /** Callback when action is triggered */
  onAction?: (payload: ThreadActionPayload) => void;
  /** Whether the action is currently processing */
  processing?: boolean;
  /** Ghost mode — masks amounts */
  ghostMode?: boolean;
}

export default function ThreadActionCard({
  payload,
  contextText,
  onAction,
  processing = false,
  ghostMode = false,
}: ThreadActionCardProps) {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { maskAmount } = useGhostMask();

  const Icon = ACTION_ICONS[payload.type] || CreditCard;
  const variant = payload.variant || "primary";
  const styles = VARIANT_STYLES[variant] || VARIANT_STYLES.primary;
  const isCompleted = payload.completed;

  const handleClick = () => {
    if (isCompleted || processing) return;

    if (onAction) {
      onAction(payload);
      return;
    }

    // Default navigation behavior
    if (payload.route) {
      navigate(payload.route);
    }
  };

  const displayAmount = payload.amount
    ? ghostMode
      ? maskAmount(payload.amount, payload.currency)
      : new Intl.NumberFormat(undefined, {
          style: "currency",
          currency: payload.currency || "EUR",
          minimumFractionDigits: 0,
          maximumFractionDigits: 2,
        }).format(payload.amount)
    : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 4, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.2 }}
      className={`rounded-2xl border ${styles.border} ${styles.bg} overflow-hidden`}
    >
      {/* Context text */}
      {contextText && (
        <p className="px-4 pt-3 text-xs text-muted-foreground">{contextText}</p>
      )}

      <div className="p-4 flex items-center gap-3">
        {/* Icon */}
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
          isCompleted ? "bg-emerald-500/10" : `${styles.bg}`
        }`}>
          {isCompleted ? (
            <CheckCircle className="w-5 h-5 text-emerald-600" />
          ) : (
            <Icon className={`w-5 h-5 ${styles.iconColor}`} />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-semibold ${isCompleted ? "text-muted-foreground line-through" : "text-foreground"}`}>
            {payload.label}
          </p>
          {displayAmount && (
            <p className={`text-lg font-black ${isCompleted ? "text-muted-foreground" : "text-foreground"} leading-tight`}>
              {displayAmount}
            </p>
          )}
        </div>

        {/* Action button */}
        {!isCompleted && (
          <Button
            size="sm"
            variant={variant === "destructive" ? "destructive" : "default"}
            className="rounded-xl shrink-0 gap-1.5 min-h-[36px]"
            onClick={handleClick}
            disabled={processing}
          >
            {processing ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Icon className="w-3.5 h-3.5" />
            )}
            <span className="text-xs font-bold">
              {getActionLabel(payload.type, t)}
            </span>
          </Button>
        )}

        {isCompleted && (
          <span className="text-[10px] font-bold text-emerald-600 bg-emerald-500/10 px-2.5 py-1 rounded-full">
            ✓ {t("orbit.done") || "Done"}
          </span>
        )}
      </div>

      {/* Ghost mode indicator */}
      {ghostMode && (
        <div className="px-4 pb-2 flex items-center gap-1.5">
          <Lock className="w-3 h-3 text-muted-foreground/40" />
          <span className="text-[9px] text-muted-foreground/40 font-medium">
            {t("orbit.ghost_protected") || "Ghost protected"}
          </span>
        </div>
      )}
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════════ */

function getActionLabel(type: ThreadActionType, t: (k: string) => string | undefined): string {
  const labels: Record<ThreadActionType, string> = {
    pay: t("orbit.pay") || "Pay",
    confirm: t("orbit.confirm") || "Confirm",
    cancel: t("orbit.cancel") || "Cancel",
    sign: t("orbit.sign") || "Sign",
    track: t("orbit.track") || "Track",
    view_receipt: t("orbit.receipt") || "Receipt",
    view_document: t("orbit.document") || "View",
    rate: t("orbit.rate") || "Rate",
    dispute: t("orbit.dispute") || "Dispute",
    refund: t("orbit.refund") || "Refund",
    schedule: t("orbit.schedule") || "Schedule",
    share_location: t("orbit.share_location") || "Share",
    call: t("orbit.call") || "Call",
    video_call: t("orbit.video_call") || "Video",
  };
  return labels[type] || type;
}

/* ═══════════════════════════════════════════════════
   PARSER — Extract action payload from message content
   ═══════════════════════════════════════════════════ */

/**
 * Try to parse a system message's content for an embedded action payload.
 * Returns null if the message is plain text.
 */
export function parseActionFromMessage(content: string): {
  text: string;
  action: ThreadActionPayload;
} | null {
  try {
    const parsed = JSON.parse(content);
    if (parsed && typeof parsed === "object" && parsed.text && parsed.action) {
      return { text: parsed.text, action: parsed.action };
    }
  } catch {
    // Not JSON — plain text system message
  }
  return null;
}
