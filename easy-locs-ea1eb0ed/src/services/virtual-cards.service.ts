import { supabase } from "@/integrations/supabase/client";

export type CardStatus = "active" | "frozen" | "cancelled";
export type CardNetwork = "visa" | "mastercard";

export interface VirtualCard {
  id: string;
  userId: string;
  maskedNumber: string;
  last4: string;
  expiryMonth: number;
  expiryYear: number;
  network: CardNetwork;
  status: CardStatus;
  balance: number;
  spendingLimit: number;
  totalSpent: number;
  currency: string;
  label: string;
  createdAt: string;
  lastUsedAt?: string;
  stripeCardId?: string;
}

export interface RevealedCardDetails {
  cardNumber: string;
  cvv: string;
  expiryMonth: number;
  expiryYear: number;
}

export interface CardTransaction {
  id: string;
  cardId: string;
  amount: number;
  currency: string;
  merchant: string;
  category: string;
  status: "completed" | "pending" | "declined";
  createdAt: string;
}

async function getCurrentUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data?.session?.user?.id ?? null;
}

function generateCardNumber(): string {
  const prefix = "4";
  let number = prefix;
  for (let i = 1; i < 16; i++) {
    number += Math.floor(Math.random() * 10).toString();
  }
  return number;
}

function maskCardNumber(number: string): string {
  return `•••• •••• •••• ${number.slice(-4)}`;
}

function generateCvv(): string {
  return Math.floor(100 + Math.random() * 900).toString();
}

interface SecureCardVault {
  cardNumber: string;
  cvv: string;
}

const cardVault = new Map<string, SecureCardVault>();
const virtualCards = new Map<string, VirtualCard[]>();
const cardTransactions = new Map<string, CardTransaction[]>();

export async function createVirtualCard(options: {
  label?: string;
  spendingLimit?: number;
  currency?: string;
  network?: CardNetwork;
  fundFromWallet?: number;
}): Promise<{ ok: boolean; card?: VirtualCard; error?: string }> {
  const userId = await getCurrentUserId();
  if (!userId) return { ok: false, error: "Not authenticated" };

  const {
    label = "My Virtual Card",
    spendingLimit = 5000,
    currency = "USD",
    network = "visa",
    fundFromWallet = 0,
  } = options;

  const userCards = virtualCards.get(userId) || [];
  if (userCards.filter((c) => c.status !== "cancelled").length >= 5) {
    return { ok: false, error: "Maximum 5 active cards allowed" };
  }

  const cardNumber = generateCardNumber();
  const cvv = generateCvv();
  const now = new Date();
  const cardId = `vc_${crypto.randomUUID()}`;

  cardVault.set(cardId, { cardNumber, cvv });

  const card: VirtualCard = {
    id: cardId,
    userId,
    maskedNumber: maskCardNumber(cardNumber),
    last4: cardNumber.slice(-4),
    expiryMonth: now.getMonth() + 1,
    expiryYear: now.getFullYear() + 3,
    network,
    status: "active",
    balance: fundFromWallet,
    spendingLimit,
    totalSpent: 0,
    currency,
    label,
    createdAt: now.toISOString(),
  };

  userCards.push(card);
  virtualCards.set(userId, userCards);

  return { ok: true, card };
}

export async function getUserCards(): Promise<VirtualCard[]> {
  const userId = await getCurrentUserId();
  if (!userId) return [];
  return (virtualCards.get(userId) || []).filter((c) => c.status !== "cancelled");
}

export async function revealCardDetails(cardId: string): Promise<{ ok: boolean; details?: RevealedCardDetails; error?: string }> {
  const userId = await getCurrentUserId();
  if (!userId) return { ok: false, error: "Not authenticated" };

  const cards = virtualCards.get(userId) || [];
  const card = cards.find((c) => c.id === cardId);
  if (!card) return { ok: false, error: "Card not found" };

  const vault = cardVault.get(cardId);
  if (!vault) return { ok: false, error: "Card details unavailable" };

  return {
    ok: true,
    details: {
      cardNumber: vault.cardNumber,
      cvv: vault.cvv,
      expiryMonth: card.expiryMonth,
      expiryYear: card.expiryYear,
    },
  };
}

export async function freezeCard(cardId: string): Promise<{ ok: boolean; error?: string }> {
  const userId = await getCurrentUserId();
  if (!userId) return { ok: false, error: "Not authenticated" };

  const cards = virtualCards.get(userId) || [];
  const card = cards.find((c) => c.id === cardId);
  if (!card) return { ok: false, error: "Card not found" };
  if (card.status !== "active") return { ok: false, error: "Card is not active" };

  card.status = "frozen";
  return { ok: true };
}

export async function unfreezeCard(cardId: string): Promise<{ ok: boolean; error?: string }> {
  const userId = await getCurrentUserId();
  if (!userId) return { ok: false, error: "Not authenticated" };

  const cards = virtualCards.get(userId) || [];
  const card = cards.find((c) => c.id === cardId);
  if (!card) return { ok: false, error: "Card not found" };
  if (card.status !== "frozen") return { ok: false, error: "Card is not frozen" };

  card.status = "active";
  return { ok: true };
}

export async function cancelCard(cardId: string): Promise<{ ok: boolean; error?: string }> {
  const userId = await getCurrentUserId();
  if (!userId) return { ok: false, error: "Not authenticated" };

  const cards = virtualCards.get(userId) || [];
  const card = cards.find((c) => c.id === cardId);
  if (!card) return { ok: false, error: "Card not found" };

  card.status = "cancelled";
  cardVault.delete(cardId);
  return { ok: true };
}

export async function setSpendingLimit(cardId: string, limit: number): Promise<{ ok: boolean; error?: string }> {
  const userId = await getCurrentUserId();
  if (!userId) return { ok: false, error: "Not authenticated" };

  const cards = virtualCards.get(userId) || [];
  const card = cards.find((c) => c.id === cardId);
  if (!card) return { ok: false, error: "Card not found" };
  if (limit < 0) return { ok: false, error: "Invalid limit" };

  card.spendingLimit = limit;
  return { ok: true };
}

export async function fundCard(cardId: string, amount: number): Promise<{ ok: boolean; error?: string }> {
  const userId = await getCurrentUserId();
  if (!userId) return { ok: false, error: "Not authenticated" };

  const cards = virtualCards.get(userId) || [];
  const card = cards.find((c) => c.id === cardId);
  if (!card) return { ok: false, error: "Card not found" };
  if (amount <= 0) return { ok: false, error: "Invalid amount" };
  if (card.status === "cancelled") return { ok: false, error: "Card is cancelled" };

  card.balance += amount;
  return { ok: true };
}

export async function getCardTransactions(cardId: string): Promise<CardTransaction[]> {
  return cardTransactions.get(cardId) || [];
}

export async function provisionApplePay(cardId: string): Promise<{ ok: boolean; provisioningUrl?: string; error?: string }> {
  const userId = await getCurrentUserId();
  if (!userId) return { ok: false, error: "Not authenticated" };

  const cards = virtualCards.get(userId) || [];
  const card = cards.find((c) => c.id === cardId);
  if (!card || card.status !== "active") return { ok: false, error: "Card not available" };

  return { ok: true, provisioningUrl: `https://wallet.apple.com/provision/${cardId}` };
}

export async function provisionGooglePay(cardId: string): Promise<{ ok: boolean; token?: string; error?: string }> {
  const userId = await getCurrentUserId();
  if (!userId) return { ok: false, error: "Not authenticated" };

  const cards = virtualCards.get(userId) || [];
  const card = cards.find((c) => c.id === cardId);
  if (!card || card.status !== "active") return { ok: false, error: "Card not available" };

  return { ok: true, token: `gpay_token_${cardId}` };
}
