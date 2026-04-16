import { useState, useCallback, useEffect } from "react";
import {
  createVirtualCard,
  getUserCards,
  freezeCard,
  unfreezeCard,
  cancelCard,
  setSpendingLimit,
  fundCard,
  getCardTransactions,
  revealCardDetails,
  type VirtualCard,
  type CardTransaction,
  type CardNetwork,
  type RevealedCardDetails,
} from "@/services/virtual-cards.service";

export function useVirtualCards() {
  const [cards, setCards] = useState<VirtualCard[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getUserCards();
      setCards(result);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const create = useCallback(
    async (options: {
      label?: string;
      spendingLimit?: number;
      currency?: string;
      network?: CardNetwork;
      fundFromWallet?: number;
    }) => {
      const result = await createVirtualCard(options);
      if (result.ok) await refresh();
      return result;
    },
    [refresh],
  );

  const freeze = useCallback(
    async (cardId: string) => {
      const result = await freezeCard(cardId);
      if (result.ok) await refresh();
      return result;
    },
    [refresh],
  );

  const unfreeze = useCallback(
    async (cardId: string) => {
      const result = await unfreezeCard(cardId);
      if (result.ok) await refresh();
      return result;
    },
    [refresh],
  );

  const cancel = useCallback(
    async (cardId: string) => {
      const result = await cancelCard(cardId);
      if (result.ok) await refresh();
      return result;
    },
    [refresh],
  );

  const updateLimit = useCallback(
    async (cardId: string, limit: number) => {
      const result = await setSpendingLimit(cardId, limit);
      if (result.ok) await refresh();
      return result;
    },
    [refresh],
  );

  const fund = useCallback(
    async (cardId: string, amount: number) => {
      const result = await fundCard(cardId, amount);
      if (result.ok) await refresh();
      return result;
    },
    [refresh],
  );

  const reveal = useCallback(
    async (cardId: string): Promise<RevealedCardDetails | null> => {
      const result = await revealCardDetails(cardId);
      return result.ok ? result.details ?? null : null;
    },
    [],
  );

  return { cards, loading, refresh, create, freeze, unfreeze, cancel, updateLimit, fund, reveal };
}

export function useCardTransactions(cardId: string) {
  const [transactions, setTransactions] = useState<CardTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!cardId) return;
    setLoading(true);
    getCardTransactions(cardId)
      .then(setTransactions)
      .finally(() => setLoading(false));
  }, [cardId]);

  return { transactions, loading };
}
