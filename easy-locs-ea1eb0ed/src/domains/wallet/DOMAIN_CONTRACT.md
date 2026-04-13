# Domain Contract — Wallet

## Owner
Platform Finance Team

## Purpose
Manages all user balance, transaction ledger, top-up, withdrawal, and payment-method operations for the Easy-Locs platform. Wallet is the single source of truth for monetary state that does not belong to a specific commerce order.

## Canonical Invariants
- **A user has exactly one wallet** per account. No duplicate wallet records are permitted.
- **All balance mutations are immutable ledger entries** (insert-only). The current balance is derived by summing the ledger — never stored as a mutable field.
- **No wallet operation may be initiated from the UI layer directly**. All mutations flow through `wallet/service.ts` → edge functions or RPC.

## Public Interface (ports)
See `ports.ts` for the full typed contract. Key ports:
| Port | Direction | Description |
|---|---|---|
| `getBalance` | Read | Returns current spendable + pending balance for a wallet ID |
| `topUp` | Write | Initiates a top-up via a payment provider |
| `transfer` | Write | Peer-to-peer or platform-fee transfer between wallets |
| `withdraw` | Write | Withdrawal request to bank / payout provider |
| `listTransactions` | Read | Paginated ledger query |

## Domain Events (events.ts)
- `wallet.topped_up`
- `wallet.transferred`
- `wallet.withdrawn`
- `wallet.frozen`
- `wallet.unfrozen`

## Anti-Corruption Layer
- All external payment provider responses (Stripe, UAE payment rail) are normalised by `adapters/` before entering the domain model.
- The Wallet domain **must not** import from Commerce, Orbit, or Marketplace domains directly. It may emit events that those domains subscribe to.

## UI Rule
- Dashboard views of balances are **read-only** — they call `getBalance` only.
- Top-up and withdrawal flows must go through the wallet service layer; no direct Supabase calls from `.tsx` files.

## Data Ownership
Table: `wallets`, `wallet_transactions` — owned exclusively by this domain.
