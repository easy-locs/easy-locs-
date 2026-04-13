# Domain Contract — Marketplace

## Owner
Marketplace & Merchant Team

## Purpose
The Marketplace domain owns the shop/merchant catalogue, product listings, search & discovery, pricing, reviews, and the shop-approval lifecycle. It is the entry point for all "browse and buy" flows. Order fulfilment and payment are handled by the Commerce domain.

## Canonical Invariants
- **A shop belongs to exactly one merchant account**. Multi-account shop sharing is not permitted.
- **All shop mutations** (create, update, approve, suspend) go through `service.ts` — never direct DB calls from UI.
- **Pricing is always stored in base currency** (AED cents). Currency conversion is presentation-layer only.
- **Product availability** is the authoritative field on the product record — the UI must not infer it from stock counts.

## Public Interface (ports)
See `ports.ts`. Key ports:
| Port | Direction | Description |
|---|---|---|
| `searchShops` | Read | Full-text + geo search of active shops |
| `getShopDetail` | Read | Returns complete shop + product catalogue |
| `submitShopForApproval` | Write | Merchant submits new or updated shop |
| `approveShop` | Write | Admin approves a pending shop |
| `suspendShop` | Write | Admin suspends an active shop |
| `updateProduct` | Write | Merchant updates a product in their catalogue |

## Domain Events (events.ts)
- `marketplace.shop_submitted`
- `marketplace.shop_approved`
- `marketplace.shop_suspended`
- `marketplace.product_updated`
- `marketplace.review_posted`

## Anti-Corruption Layer
- `adapters/` translate external catalogue imports (CSV, URL scrape) into the canonical `Shop` and `Product` types before writing to the domain.
- Marketplace must not import from Wallet or Orbit directly.

## UI Rule
- Search and catalogue views are read-only — they query via the service layer.
- Shop approval actions from the admin panel route through `service.ts`.

## Data Ownership
Tables: `shops`, `products`, `shop_reviews`, `shop_approval_queue` — owned exclusively by this domain.
