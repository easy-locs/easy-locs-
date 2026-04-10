/**
 * Card Contract — Strict uniform interface for every card in the app.
 * Every visible card MUST conform to this contract.
 * No card may exist without a real data source, a real status, and a real action.
 */

/** Card lifecycle states — no card may render without one of these */
export type CardStatus = "live" | "loading" | "empty" | "error" | "disabled";

/** Card classification — separates real business cards from utility/navigation */
export type CardClassification =
  | "business_data_card"         // Real business data with live pipeline
  | "utility_navigation_card"    // Navigation shortcuts, no deep business data
  | "on_demand_orchestration_card" // Triggers an action on demand, not continuous
  | "local_only_temporary_card"  // State is local/ephemeral, not persisted
  | "delegated_pipeline_card";   // Data pipeline owned by another renderer

/** Action classification — distinguishes navigation from real business actions */
export type CardActionType = "navigation" | "business" | "mutation" | "orchestration";

/** Strict contract every card adapter must produce */
export interface CardContract<T = unknown> {
  /** Unique card identifier matching CARD_REGISTRY key */
  id: string;
  /** Domain this card belongs to */
  domain: CardDomain;
  /** Human-readable title */
  title: string;
  /** Current lifecycle status */
  status: CardStatus;
  /** Real data payload — null when loading/empty/error/disabled */
  data: T | null;
  /** Primary CTA — must do something real or be absent */
  primaryAction?: CardAction;
  /** Secondary CTA */
  secondaryAction?: CardAction;
  /** Deep link route for "see more" / tap-through */
  deepLink?: string;
  /** Error message when status === "error" */
  errorMessage?: string | null;
  /** ISO timestamp of last real data update */
  lastUpdatedAt?: string | null;
  /** Why this card is disabled (when status === "disabled") */
  disabledReason?: string | null;
}

export interface CardAction {
  label: string;
  /** What kind of action this is — for audit truth */
  actionType: CardActionType;
  run: () => void | Promise<void>;
}

/** All recognized domains — a card MUST belong to exactly one */
export type CardDomain =
  | "auth"
  | "profile"
  | "wallet"
  | "orbit"
  | "marketplace"
  | "property"
  | "radar"
  | "notifications"
  | "analytics"
  | "onboarding"
  | "support"
  | "delivery"
  | "boost"
  | "geo";

/** Registry entry for a single card */
export interface CardRegistryEntry {
  /** Unique key matching CardContract.id */
  key: string;
  /** Domain ownership */
  domain: CardDomain;
  /** Card classification — what kind of card this is */
  classification: CardClassification;
  /** Route this card links to */
  route: string;
  /** Required capability for this card to be active */
  requiredCapability: string;
  /** Source pipeline for the data */
  sourceType: "view-model" | "query" | "store" | "static";
  /** Source key (hook name / query key) */
  sourceKey: string;
  /** Surface where this card renders */
  surface: "home" | "admin-ops" | "admin-super" | "driver" | "seller" | "global";
  /** Connection status — NEVER set manually, computed by audit */
  connectionStatus?: "connected" | "partial" | "broken" | "orphan" | "mocked";
  /** Delegation target — who owns the real pipeline when classification=delegated */
  delegationOwner?: string;
  /** Justification for non-business classification */
  classificationJustification?: string;
}

/**
 * Helper to build a CardContract from raw data + status logic.
 * Enforces that no field is fabricated.
 *
 * STRICT: data:null + no error + no disabled = "loading", NOT "live".
 * A card cannot be LIVE without real non-null data.
 */
export function buildCardContract<T>(
  partial: Omit<CardContract<T>, "status"> & {
    data: T | null;
    error?: string | null;
    disabled?: boolean;
    disabledReason?: string;
  },
): CardContract<T> {
  let status: CardStatus;
  if (partial.disabled) {
    status = "disabled";
  } else if (partial.error) {
    status = "error";
  } else if (partial.data === null || partial.data === undefined) {
    // STRICT: null data is ALWAYS loading, never live
    status = "loading";
  } else if (
    (Array.isArray(partial.data) && partial.data.length === 0) ||
    (typeof partial.data === "object" && partial.data !== null && Object.keys(partial.data).length === 0)
  ) {
    status = "empty";
  } else {
    status = "live";
  }

  return {
    id: partial.id,
    domain: partial.domain,
    title: partial.title,
    status,
    data: partial.data,
    primaryAction: partial.primaryAction,
    secondaryAction: partial.secondaryAction,
    deepLink: partial.deepLink,
    errorMessage: partial.error || null,
    lastUpdatedAt: partial.lastUpdatedAt || null,
    disabledReason: partial.disabledReason || null,
  };
}
