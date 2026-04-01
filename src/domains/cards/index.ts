/**
 * DOMAIN: CARDS — Universal Root Formula
 * INTENT → ENTRY → PIPELINE → NORMALIZER → OWNER → STATE → SELECTOR → VIEW → OUTPUT
 *
 * Single source of truth for all card projections.
 */

// ── Contract (strict uniform interface) ──
export { buildCardContract } from "./card-contract";
export type { CardContract, CardStatus, CardDomain, CardAction, CardRegistryEntry } from "./card-contract";

// ── Registry (central manifest) ──
export { CARD_REGISTRY, getRegistryForSurface, getRegistryForDomain, getCardsByConnectionStatus, getCardAuditSummary } from "./card-registry";

// ── Shell (uniform rendering) ──
export { CardShell } from "./CardShell";

// ── Entry (single public gate) ──
export { cardDispatch } from "./card-dispatch";
export type { CardCommand, CardCommandResult } from "./card-dispatch";

// ── Store (owner) ──
export { useCardStore } from "./card.store";

// ── Normalizer ──
export { normalizeEntity } from "./normalizers";

// ── Selectors / ViewModels ──
export { selectCardModel, selectCardsByCategory } from "./selectors";
export type { CardViewModel } from "./selectors";

// ── Pipeline ──
export { cardBuildPipeline } from "./pipelines/card-build.pipeline";

// ── Adapters (per-domain hooks) ──
export {
  useHeroBannerCard,
  useCategoryGridCard,
  useTrendingSectionCard,
  useBestRatedSectionCard,
  useContextBannersCard,
  useLiveMapCard,
} from "./adapters/home-card-adapters";
