/**
 * Card Selectors — Read-only projections from cardStore.
 * UI reads ONLY through these selectors.
 */
import { useCardStore } from "./card.store";

export interface CardViewModel {
  id: string;
  entityType: string;
  title: string;
  subtitle: string;
  imageUrl: string | null;
  badges: string[];
  rating: string | null;
  reviewCount: number;
  priceLabel: string | null;
  distanceLabel: string | null;
  etaLabel: string | null;
  status: string;
  category: string | null;
}

export function selectCardModel(entityId: string): CardViewModel | null {
  return useCardStore.getState().cards[entityId] ?? null;
}

export function selectCardsByCategory(category: string): CardViewModel[] {
  const cards = useCardStore.getState().cards;
  return Object.values(cards).filter((c) => c.category === category);
}
