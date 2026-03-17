/**
 * UniversalEntityCard — Reusable card for any entity (user, shop, product, etc.).
 * Used by QR resolved, map pins, search results, radar cards.
 * Renders entity info + UniversalActionButtons.
 */
import { Store, User, Package, CreditCard, Radio, Wrench, MapPin } from "lucide-react";
import UniversalActionButtons from "./UniversalActionButtons";
import type { UniversalEntityType, UniversalActionType } from "@/lib/action-engine";
import type { EntityContext, PrimaryCTA } from "@/lib/action-priority";

const ENTITY_ICONS: Record<UniversalEntityType, React.ReactNode> = {
  user: <User className="h-7 w-7 text-primary" />,
  shop: <Store className="h-7 w-7 text-accent-foreground" />,
  product: <Package className="h-7 w-7 text-primary" />,
  payment_request: <CreditCard className="h-7 w-7 text-primary" />,
  live: <Radio className="h-7 w-7 text-destructive" />,
  service: <Wrench className="h-7 w-7 text-primary" />,
  chat_thread: <User className="h-7 w-7 text-primary" />,
  map_pin: <MapPin className="h-7 w-7 text-primary" />,
};

const ENTITY_BG: Record<UniversalEntityType, string> = {
  user: "bg-primary/10",
  shop: "bg-accent/20",
  product: "bg-primary/10",
  payment_request: "bg-primary/10",
  live: "bg-destructive/10",
  service: "bg-primary/10",
  chat_thread: "bg-primary/10",
  map_pin: "bg-primary/10",
};

interface Props {
  entityType: UniversalEntityType;
  entityId?: string | null;
  slug?: string | null;
  title: string;
  subtitle?: string | null;
  /** Avatar initial or emoji */
  avatar?: string | null;
  /** Logo/photo URL */
  avatarUrl?: string | null;
  amount?: number | null;
  currency?: string | null;
  recipientId?: string | null;
  recipientName?: string | null;
  metadata?: Record<string, any>;
  /** Context for CTA priority logic */
  context?: Partial<EntityContext>;
  /** Override primary CTA */
  overridePrimary?: PrimaryCTA;
  /** Compact card for inline lists */
  compact?: boolean;
  /** Extra action after CTA completes */
  onActionComplete?: (action: UniversalActionType, ok: boolean) => void;
  /** Render extra footer content */
  footer?: React.ReactNode;
}

export default function UniversalEntityCard({
  entityType,
  entityId,
  slug,
  title,
  subtitle,
  avatar,
  avatarUrl,
  amount,
  currency,
  recipientId,
  recipientName,
  metadata,
  context,
  overridePrimary,
  compact = false,
  onActionComplete,
  footer,
}: Props) {
  if (compact) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
        {/* Avatar */}
        <div className={`shrink-0 flex h-10 w-10 items-center justify-center rounded-xl ${ENTITY_BG[entityType]}`}>
          {avatarUrl ? (
            <img src={avatarUrl} alt="" className="h-10 w-10 rounded-xl object-cover" />
          ) : avatar ? (
            <span className="text-lg font-bold">{avatar}</span>
          ) : (
            ENTITY_ICONS[entityType]
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">{title}</p>
          {subtitle && (
            <p className="text-[11px] text-muted-foreground truncate">{subtitle}</p>
          )}
        </div>

        {/* Inline CTAs */}
        <div className="shrink-0">
          <UniversalActionButtons
            entityType={entityType}
            entityId={entityId}
            slug={slug}
            amount={amount}
            currency={currency}
            title={title}
            recipientId={recipientId}
            recipientName={recipientName}
            metadata={metadata}
            context={context}
            overridePrimary={overridePrimary}
            compact
            primaryOnly
            onActionComplete={onActionComplete}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[320px] space-y-4 text-center">
      {/* Entity info card */}
      <div className="rounded-2xl border border-border bg-card p-6 space-y-3">
        <div className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full ${ENTITY_BG[entityType]}`}>
          {avatarUrl ? (
            <img src={avatarUrl} alt="" className="h-16 w-16 rounded-full object-cover" />
          ) : avatar ? (
            <span className="text-2xl font-bold text-primary">{avatar}</span>
          ) : (
            ENTITY_ICONS[entityType]
          )}
        </div>
        <p className="text-lg font-bold text-foreground">{title}</p>
        {subtitle && (
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        )}
      </div>

      {/* Action buttons */}
      <UniversalActionButtons
        entityType={entityType}
        entityId={entityId}
        slug={slug}
        amount={amount}
        currency={currency}
        title={title}
        subtitle={subtitle}
        recipientId={recipientId}
        recipientName={recipientName}
        metadata={metadata}
        context={context}
        overridePrimary={overridePrimary}
        onActionComplete={onActionComplete}
      />

      {footer}
    </div>
  );
}
