/**
 * Card Store — Single owner for all card entities and projections.
 * OWNER in Universal Root Formula.
 */
import { create } from "zustand";
import type { CardViewModel } from "./selectors";

interface CardState {
  entities: Record<string, any>;
  cards: Record<string, CardViewModel>;

  // Mutations (only from pipeline)
  setEntity: (id: string, entity: any) => void;
  setCard: (id: string, card: CardViewModel) => void;
  setBatch: (entries: Array<{ id: string; entity: any; card: CardViewModel }>) => void;
  invalidate: (id: string) => void;
  clear: () => void;
}

export const useCardStore = create<CardState>((set) => ({
  entities: {},
  cards: {},

  setEntity: (id, entity) =>
    set((s) => ({ entities: { ...s.entities, [id]: entity } })),

  setCard: (id, card) =>
    set((s) => ({ cards: { ...s.cards, [id]: card } })),

  setBatch: (entries) =>
    set((s) => {
      const entities = { ...s.entities };
      const cards = { ...s.cards };
      for (const e of entries) {
        entities[e.id] = e.entity;
        cards[e.id] = e.card;
      }
      return { entities, cards };
    }),

  invalidate: (id) =>
    set((s) => {
      const { [id]: _e, ...entities } = s.entities;
      const { [id]: _c, ...cards } = s.cards;
      return { entities, cards };
    }),

  clear: () => set({ entities: {}, cards: {} }),
}));
