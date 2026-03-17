/**
 * UniversalActionButtons — Reusable CTA buttons wired to the Universal Action Engine.
 * Renders a primary CTA + optional secondary CTAs for any entity.
 */
import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, MessageCircle, Send, ExternalLink, Heart, UserPlus, QrCode, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUnifiedPayment } from "@/payments/UnifiedPaymentSystem";
import { useAuth } from "@/contexts/AuthContext";
import {
  executeUniversalAction,
  type UniversalEntityType,
  type UniversalActionType,
  type UniversalActionInput,
} from "@/lib/action-engine";
import {
  getPrimaryActionForEntity,
  getSecondaryActions,
  type EntityContext,
  type PrimaryCTA,
} from "@/lib/action-priority";

const ACTION_ICONS: Record<string, React.ReactNode> = {
  open: <ExternalLink className="h-4 w-4" />,
  chat: <MessageCircle className="h-4 w-4" />,
  pay: <Send className="h-4 w-4" />,
  follow: <Heart className="h-4 w-4" />,
  add_contact: <UserPlus className="h-4 w-4" />,
  request: <ArrowRight className="h-4 w-4" />,
  scan: <QrCode className="h-4 w-4" />,
};

interface Props {
  entityType: UniversalEntityType;
  entityId?: string | null;
  slug?: string | null;
  amount?: number | null;
  currency?: string | null;
  title?: string | null;
  subtitle?: string | null;
  recipientId?: string | null;
  recipientName?: string | null;
  metadata?: Record<string, any>;
  /** Entity context for CTA priority */
  context?: Partial<EntityContext>;
  /** Compact mode — smaller buttons, inline layout */
  compact?: boolean;
  /** Hide secondary actions */
  primaryOnly?: boolean;
  /** Override primary action */
  overridePrimary?: PrimaryCTA;
  /** Called after any action completes */
  onActionComplete?: (action: UniversalActionType, ok: boolean) => void;
}

export default function UniversalActionButtons({
  entityType,
  entityId,
  slug,
  amount,
  currency,
  title,
  subtitle,
  recipientId,
  recipientName,
  metadata,
  context = {},
  compact = false,
  primaryOnly = false,
  overridePrimary,
  onActionComplete,
}: Props) {
  const navigate = useNavigate();
  const { openPayment } = useUnifiedPayment();
  const { user, orgId } = useAuth();
  const [busyAction, setBusyAction] = useState<string | null>(null);

  const entityCtx: EntityContext = {
    entityType,
    hasAmount: (amount ?? 0) > 0,
    ...context,
  };

  const primary = overridePrimary || getPrimaryActionForEntity(entityCtx);
  const secondaries = primaryOnly ? [] : getSecondaryActions(entityCtx, primary);

  const executeAction = useCallback(
    async (actionType: UniversalActionType) => {
      setBusyAction(actionType);

      const input: UniversalActionInput = {
        entityType,
        action: actionType,
        entityId,
        slug,
        amount,
        currency,
        title,
        subtitle,
        recipientId,
        recipientName,
        metadata,
      };

      const result = await executeUniversalAction(input, {
        navigate,
        openPayment,
        currentUserId: user?.id,
        currentOrgId: orgId,
      });

      setBusyAction(null);
      onActionComplete?.(actionType, result.ok);
    },
    [entityType, entityId, slug, amount, currency, title, subtitle, recipientId, recipientName, metadata, navigate, openPayment, user?.id, orgId, onActionComplete],
  );

  if (compact) {
    return (
      <div className="flex gap-2">
        <Button
          size="sm"
          className="flex-1 gap-1.5 font-semibold"
          onClick={() => executeAction(primary.action)}
          disabled={!!busyAction}
        >
          {busyAction === primary.action ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            ACTION_ICONS[primary.icon]
          )}
          {primary.label}
        </Button>
        {secondaries.slice(0, 2).map((s) => (
          <Button
            key={s.action}
            size="sm"
            variant="outline"
            className="gap-1"
            onClick={() => executeAction(s.action)}
            disabled={!!busyAction}
          >
            {busyAction === s.action ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              ACTION_ICONS[s.icon]
            )}
            {s.label}
          </Button>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Primary CTA — full width, large */}
      <Button
        className="w-full h-12 text-base gap-2 font-semibold"
        onClick={() => executeAction(primary.action)}
        disabled={!!busyAction}
      >
        {busyAction === primary.action ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          ACTION_ICONS[primary.icon]
        )}
        {busyAction === primary.action ? "Processing..." : primary.label}
      </Button>

      {/* Secondary CTAs */}
      {secondaries.length > 0 && (
        <div className={`grid gap-2 ${secondaries.length >= 3 ? "grid-cols-3" : "grid-cols-2"}`}>
          {secondaries.map((s) => (
            <Button
              key={s.action}
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => executeAction(s.action)}
              disabled={!!busyAction}
            >
              {busyAction === s.action ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                ACTION_ICONS[s.icon]
              )}
              {busyAction === s.action ? "..." : s.label}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}
