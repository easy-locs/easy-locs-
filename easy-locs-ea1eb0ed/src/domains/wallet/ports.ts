/**
 * Wallet Domain — Port interfaces (hexagonal architecture).
 */
import type { Money, DomainResult } from "../shared/types";

// ── Aggregates ──
export interface WalletAccount {
  id: string;
  ownerUserId: string;
  currency: string;
  availableBalance: number;
  escrowBalance: number;
  pendingBalance: number;
  status: "active" | "frozen" | "closed";
}

export interface LedgerEntry {
  id: string;
  walletAccountId: string;
  type: "credit" | "debit";
  amount: number;
  currency: string;
  reference: string;
  description?: string;
  createdAt: string;
}

export interface TransferIntent {
  fromUserId: string;
  toUserId: string;
  amount: Money;
  reference?: string;
  pin: string;
}

// ── Inbound Ports ──
export interface WalletUseCases {
  getBalance(userId: string): Promise<DomainResult<WalletAccount>>;
  topUp(userId: string, amount: Money, paymentMethodId: string): Promise<DomainResult<LedgerEntry>>;
  transfer(intent: TransferIntent): Promise<DomainResult<LedgerEntry>>;
  getActivity(userId: string, limit?: number): Promise<DomainResult<LedgerEntry[]>>;
  verifyPin(userId: string, pin: string): Promise<DomainResult<boolean>>;
}

// ── Outbound Ports ──
export interface WalletRepository {
  findByOwner(userId: string): Promise<WalletAccount | null>;
  ensureAccount(userId: string, currency: string): Promise<WalletAccount>;
  updateBalance(accountId: string, available: number, escrow: number): Promise<void>;
}

export interface LedgerRepository {
  findByAccount(accountId: string, limit?: number): Promise<LedgerEntry[]>;
  append(entry: Omit<LedgerEntry, "id" | "createdAt">): Promise<LedgerEntry>;
}

export interface PaymentGatewayPort {
  createTopUpIntent(amount: Money, userId: string): Promise<{ clientSecret: string }>;
  confirmPayment(intentId: string): Promise<boolean>;
}

export interface WalletSecurityPort {
  validatePin(userId: string, pin: string): Promise<boolean>;
  assessRisk(userId: string, amount: number): Promise<{ score: number; requireMfa: boolean }>;
}

export interface WalletEventPort {
  balanceUpdated(account: WalletAccount): void;
  transferCompleted(from: string, to: string, amount: Money): void;
  topUpCompleted(userId: string, amount: Money): void;
  securityAlert(userId: string, reason: string): void;
}
