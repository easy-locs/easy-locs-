/**
 * DOMAIN: CARDS — Universal Root Formula
 * INTENT → ENTRY → PIPELINE → NORMALIZER → OWNER → STATE → SELECTOR → VIEW → OUTPUT
 *
 * Single source of truth for all card projections.
 */

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
