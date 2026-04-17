# Easy-Locs — Canonical Route Map

**Generated:** 2026-04-17 (task #988)
**Source of truth:** `src/routes/*.tsx` (registered through `src/app/app-route-registry.tsx`).
**Total registered route paths:** 540 (after task #988 dedup).

This document is the post-fix canonical inventory of every route the app currently serves. It is grouped by registration file (which roughly mirrors a pillar / domain). Routes marked **(redirect)** use `<Navigate replace />` and forward to a canonical path; routes marked **(legacy redirect)** are kept for bookmarks and external links.

---

## 0. Bottom-nav pillar entry points (`src/config/navigation.ts`)

| Pillar | Path | Match function (active state) |
| --- | --- | --- |
| Dashboard | `/` | `/`, `/home`, `/dashboard` |
| Radar | `/radar` | `/radar`, `/map`, `/browse/*`, `/explore/*`, `/discover/*`, `/search/*`, `/listing/*`, `/store/*`, `/shop*`, `/food*`, `/grocery*`, `/travel*`, `/property*`, `/mobility/*`, `/rider/*`, `/ride*`, `/track/*`, `/services*`, `/real-estate*`, `/geo-explorer*`, `/annonces*` |
| Orbit | `/orbit` | `/orbit*` |
| Wallet | `/wallet` | `/wallet*`, `/pay*`, `/pos`, `/pos/*`, `/checkout`, `/my-orders*`, `/orders*` |
| Me | `/me` | `/me`, `/me/*`, `/settings*`, `/merchant*`, `/seller*`, `/business*`, `/notifications*`, `/driver*`, `/favorites*` |

Bottom nav visibility is controlled by `shouldHideBottomNav(pathname)`:
- Hidden on auth flows, checkout, payment, order detail, flight booking, property booking.
- Hidden on `/orbit/<conversationId>` (chat thread) but visible on the Orbit landing and on `/orbit/{contacts,add,identity,support}` so users can always navigate to another pillar.

---

## 1. Auth (`src/routes/auth.routes.tsx`)
- `/login`, `/signup`, `/forgot-password`, `/reset-password`, `/verify-email`
- `/auth/callback`, `/auth/diagnostic` (protected)
- `/onboarding` (protected — generic role picker)
- `/install`

## 2. Onboarding wizards (`src/routes/onboarding.routes.tsx`, all protected)
- `/onboarding/hotel`, `/onboarding/taxi`, `/onboarding/service-provider`, `/onboarding/consumer`

## 3. Dashboard pillar (`src/routes/dashboard.routes.tsx`)

Root routing:
- `/` → `HomeRouter` (Index for guests, Dashboard for verified users)
- `/home` → `MarketplaceHomeRouter` (same logic)
- `/landing`, `/pricing`, `/dashboard`, `/dashboard/command-center` (canonical `DashboardCommandCenter`)
- **(legacy)** `/dashboard/command-legacy` → renders the older `CommandCenter` page (see audit §1.1)

Property / rental management:
- `/dashboard/property/add`, `/dashboard/property/:id`, `/dashboard/properties` (+ nested `units`, `tenants`, `leases`, `payments`, `documents`)
- `/dashboard/create-listing`, `/dashboard/leases`, `/dashboard/tenants`, `/dashboard/rental-management`
- `/dashboard/seasonal-rentals`, `/dashboard/buildings`, `/dashboard/calendar`, `/dashboard/dynamic-pricing`
- `/real-estate/property/:propertyId`, `/real-estate/lease/:leaseId`, `/property-management`, `/rentals`

Office / company / billing:
- `/dashboard/company`, `/dashboard/billing`, `/dashboard/settings`, `/dashboard/finances`, `/dashboard/expenses`
- `/dashboard/accounting`, `/dashboard/accounting-entries`, `/dashboard/reporting`, `/dashboard/fiscal-report`
- `/dashboard/charges-regularization`, `/dashboard/payment-notices`, `/dashboard/dunning-letters`
- `/dashboard/subscriptions`, `/dashboard/channels`, `/dashboard/rent-cockpit`, `/dashboard/furniture-inventory`

Productivity / AI / docs:
- `/dashboard/ai`, `/dashboard/ai-search`, `/dashboard/cv-generator`, `/dashboard/vault`, `/dashboard/import`
- `/dashboard/receipts`, `/dashboard/reminders`, `/dashboard/documents`, `/dashboard/tasks`
- `/dashboard/messages`, `/dashboard/communication`, `/dashboard/activities`, `/dashboard/interventions`, `/dashboard/candidates`

Misc / vertical:
- `/dashboard/profile`, `/dashboard/referrals`, `/dashboard/referral-funnel`, `/dashboard/collaboration`, `/dashboard/developer`, `/dashboard/audit`
- `/dashboard/wallet`, `/dashboard/service-tracking`, `/dashboard/prayer-times`, `/dashboard/islamic`, `/dashboard/news`
- `/dashboard/seller`, `/dashboard/driver` **(redirect → /driver/dashboard)**, `/dashboard/delivery` **(redirect → /driver/dashboard)**
- `/dashboard/my-shop` **(redirect → /dashboard/my-shops)**, `/dashboard/my-shops`, `/dashboard/ops`
- `/dashboard/country/:countryCode`, `/dashboard/boost`, `/dashboard/real-estate`
- `/developer`, `/concierge-ops`, `/customer/:customerId`

## 4. Radar pillar (`src/routes/radar.routes.tsx`, 100+ routes)

Hub & discovery:
- `/radar`, `/map`, `/discover`, `/search`, `/explore`, `/search-results`
- `/geo-explorer`, `/geo-explorer/:countryCode`, `/geo-explorer/:countryCode/:cityId`
- `/browse`, `/browse/:vertical`, `/nearby`, `/saved`, `/top-rated`, `/trending`

Verticals (food, shop, grocery, services, healthcare, experiences, etc.):
- `/food`, `/food/restaurant/:restaurantId`, `/food/r/:cuisine/:restaurantId`, `/food/:type`, `/food/:type/:cuisine`
- `/grocery`, `/services-hub`, `/shops`, `/healthcare`, `/experiences`, `/utility`, `/electronics`, `/gifts`, `/pets`
- `/shop`, `/shop/category/:categorySlug`, `/shop/subcategory/:categorySlug/:subcategorySlug`, `/shop/mall/:mallSlug`, `/shop/store/:slug`

Property / real-estate / travel:
- `/property`, `/real-estate`, `/real-estate/dubai-analytics`, `/real-estate/:listingType`, `/real-estate/:listingType/:slug`
- `/property-hub`, `/property-hub/seasonal/reservations`
- `/travel`, `/travel/flights`, `/travel/stays`, `/travel/hotels`, `/travel/hotel/:id`, `/travel/hotel-checkout`
- `/hotel/dashboard`, `/hotel/calendar`, `/hotel/rooms`, `/hotel/pricing`
- `/travel/stay/:id`, `/travel/flight/:id`, `/travel/flight-search`, `/travel/flight-results`, `/travel/flight-detail`
- `/travel/flight-passengers`, `/travel/flight-payment`, `/travel/flight-confirmation` (bottom nav hidden)
- `/property/search`, `/property/results`, `/property/detail`, `/property/booking`, `/property/payment`, `/property/confirmation` (bottom nav hidden during booking)

Mobility:
- `/mobility`, `/mobility/taxi`, `/mobility/delivery`, `/mobility/delivery/{bring,parcel,gift,errand}`
- `/rider/live`, `/ride`, `/taxi`, `/send`, `/send-package`, `/delivery`, `/track/:rideRequestId`, `/call/:threadId`
- `/driver/heatmap`, `/subscription/priority`

Listings / providers / hosts:
- `/listing/:id`, `/book/:slug`, `/store/:storeId`, `/s/:slug`, `/s/:slug/:categorySlug`
- `/host/:orgId`, `/guest/:orgId`, `/showcase/:orgId`, `/account/:orgId`
- `/provider/{availability, availability-v2, zones, bookings, services, dashboard, calendar, services-crud, earnings}`, `/provider/:providerId`

Stays / rentals / activities:
- `/rentals/:country`, `/rentals/:country/:city`
- `/stay`, `/stays`, `/stays/:country`, `/stays/:country/:city`
- `/activities`, `/properties`
- `/real-estate-listing/:slug`, `/concierge-services`, `/city-market/:citySlug`, `/menu/:shopSlug`

## 5. Orbit pillar (`src/routes/orbit.routes.tsx`)
- `/orbit` (landing — `CommunicationCenter`)
- `/orbit/:conversationId` (chat thread — bottom nav hidden)
- `/orbit/contacts`, `/orbit/add`, `/orbit/identity`, `/orbit/support`

## 6. Wallet pillar (`src/routes/wallet.routes.tsx`)

Wallet:
- `/wallet` (landing — `WalletHubPage`), `/wallet/hub` **(redirect → /wallet)**
- `/wallet/top-up`, `/wallet/transfer`, `/wallet/request`, `/wallet/forex`
- `/wallet/transaction/:txId`, `/wallet/pay/:threadId`
- `/wallet/property/*` (nested module), `/wallet/virtual-cards`, `/wallet/installments`
- `/wallet/accounts` **(redirect → /settings/wallet)**

POS / checkout / orders / payments:
- `/pos`, `/pos/:shopId`, `/checkout`
- `/checkout/{address-selector, group-order, gift-order, split-bill, party-order, share-cart}`
- `/orders` **(redirect → /my-orders)**, `/my-orders`, `/my-orders/active`, `/my-orders/archive`
- `/order/:orderId`, `/order/receipt/:orderId`, `/order/refund/:orderId`, `/order/reorder/:orderId`, `/reorder`
- `/tracking/:orderId`, `/live-tracking`, `/refund/:rideRequestId`
- `/payment/:orderId`, `/payments/stripe-elements`, `/payments/stripe-handler`
- `/guest/checkout/:cartId`

## 7. Me pillar (`src/routes/me.routes.tsx`)

Profile / activity / loyalty:
- `/me`, `/me/edit-profile`, `/me/spending-insights`, `/me/address-book`
- `/me/loyalty`, `/me/loyalty-history`, `/me/challenges`, `/me/badges`, `/me/rewards`, `/me/redeem-rewards`
- `/me/referral`, `/me/referrals`, `/me/social`, `/me/reviews`, `/me/wishlist`

Creator / commerce:
- `/me/creator`, `/me/creator/{affiliates, analytics, tips}`
- `/me/saved-cards`, `/me/saved-carts`, `/me/auto-repeat`
- `/me/delivery-notes`, `/me/payment-activity`, `/me/order-receipts`

Property / tenant view:
- `/me/gestion-immo`, `/me/gestion-immo/:propertyId`, `/me/tenant-view`, `/me/property-hub`
- `/me/properties`, `/me/properties/list`, `/me/properties/create`, `/me/properties/:propertyId`, `/me/properties/analytics`
- `/me/tenants`, `/me/leases`, `/me/leases/:leaseId`, `/me/maintenance`, `/me/maintenance/:ticketId`

System:
- `/favorites`, `/notifications`, `/location/live`, `/permissions`
- `/support/tickets`, `/support/tickets/:ticketId`
- `/team/command-center`, `/team/permissions`

Settings:
- `/settings`, `/settings/{account, orbit, business, wallet, addresses, notifications, security, preferences, support, subscription, privacy, marketing, payment-methods, notification-preferences}`

## 8. Driver / Seller / Business (`src/routes/driver.routes.tsx`)
- `/driver/dashboard`, `/driver/payout`, `/driver/earnings`, `/driver/earnings-v2` **(redirect → /driver/earnings)**, `/driver/earnings-summary`
- `/driver/missions-board`, `/driver/missions-board/:orderId`, `/driver/proof/:orderId`
- `/driver/active-missions`, `/driver/live-missions`, `/driver/completed-deliveries`
- `/driver/shift`, `/driver/availability-zones`, `/driver/fuel-costs-v2`, `/driver/breaks`
- `/driver/taxi`, `/driver/taxi/earnings`
- `/seller`, `/seller/boost`, `/business`, `/claim-shop/:merchantId`

## 9. Merchant (`src/routes/merchant.routes.tsx`)
- `/merchant/claim`, `/merchant/onboarding`
- `/merchant/dashboard`, `/merchant/dashboard/:merchantId`
- `/merchant/finance`, `/merchant/pos`, `/merchant/kitchen`, `/merchant/kitchen-display/:merchantId`
- `/merchant/orders`, `/merchant/orders/:merchantId`, `/merchant/qr/:shopId`
- Menu: `/merchant/menu`, `/merchant/menu/:merchantId`, `/merchant/menu-bulk/:merchantId`, `/merchant/menu-categories/:merchantId`, `/merchant/menu/edit/:itemId`
- Store: `/merchant/store-settings/:merchantId`, `/merchant/business-hours/:merchantId`, `/merchant/closing-mode/:merchantId`, `/merchant/auto-accept/:merchantId`, `/merchant/staff-access/:merchantId`
- Marketing: `/merchant/promos/:merchantId`, `/merchant/banner-editor/:merchantId`, `/merchant/coupons/:merchantId`
- Inventory: `/merchant/inventory/:merchantId`, `/merchant/inventory-alerts/:merchantId`, `/merchant/live/:merchantId`
- Insights: `/merchant/analytics/:merchantId`, `/merchant/customers/:merchantId`, `/merchant/customer-insights/:merchantId`, `/merchant/product-performance/:merchantId`, `/merchant/business-summary/:merchantId`, `/merchant/daily-sales/:merchantId`
- Reviews / refunds / delivery: `/merchant/reviews/:merchantId`, `/merchant/refund-requests/:merchantId`, `/merchant/delivery-zones/:merchantId`, `/merchant/returns`

## 10. Pro pillar (`src/routes/pro.routes.tsx`)
Nested under `/pro` shell with index = `ProDashboard`:
- `onboarding`, `profile`, `media`, `catalog`, `availability`, `pricing`, `orders`, `inbox`, `reviews`, `wallet`, `team`, `analytics`, `monitor`, `settings`, `compliance`

## 11. Admin (`src/routes/admin.routes.tsx`)

Builder / DevOS:
- `/builder`, `/builder/{architecture, audit, repair, memory, deploy}`

Admin home & ops:
- `/admin`, `/admin/{engines, wiring-health, ops-dashboard, fraud-detection, disputes, financial-recon, menu, support-inbox, driver-live, driver-monitor, realtime-control, loyalty-redeem, alerts, wallet-diagnostics, execution-proof, review-queue, growth-ops, qr-generate, ui-engine, marketplace-ops, pipeline, ai-control-center, support-ops, delivery-ops, merchant-health, merchant-approval-queue, payments-ops, notification-ops, seed-tools, shop-import, shop-quality, content-ops, analytics-ops, quality-ops, crm-ops, retention-ops, support-sla, source-audit, user-lookup, finance-summary, order-watch, refund-queue, system-health, firecrawl-usage, platform-health, map-errors, merge-conflict-recovery, data-quality, command-control, food-checkout, kyc, dld-backfill}`
- `/admin/delivery-proof/:orderId`, `/admin/super-dashboard` (super-admin gated)

Unified `/admin/control` shell (#861, canonical):
- `/admin/control` (admin gated)
- `/admin/control/{agents, runs, command, approvals, master}` (super-admin gated)
- `/admin/control/:section` (catch-all, admin gated)

Legacy admin redirects (#863, kept):
- `/admin/agents`, `/admin/agents/:slug/runs`, `/admin/command-center`, `/admin/approvals`, `/admin/autonomy`, `/admin/control-room`, `/admin/engine-control-room`, `/admin/master-control`

Internal labs:
- `/admin/{lab-hub, performance-lab, data-lab, security-lab, release-history, notification-lab, experiment-lab, architecture-lab, integration-health, integration-diagnostics, statement}`
- `/developer-portal/docs`

## 12. Deep-link / QR resolvers (`src/routes/deeplinks.routes.tsx`)
- `/add-contact`, `/u/:userId`, `/product/:productId`, `/p/:productId`, `/live/:liveId`
- `/pay/:payId`, `/pay/request/:requestId`, `/pay/scan`, `/pay/link-resolver`, `/pay/confirm`, `/pay/success`
- `/qr/pay/:code`, `/qr/:code`, `/sl/:code`, `/qr/entry/:targetCode`, `/qr/track`, `/qr/pickup`
- `/claim/:token`, `/go/:slug`, `/go/:slug/:category`

## 13. SEO / marketing (`src/routes/seo.routes.tsx`)
- Browse: `/browse/services`, `/browse/services/:providerId`
- Marketplace: `/marketplace`, `/marketplace/:citySlug`, `/marketplace/:citySlug/:serviceSlug`
- Marketplace C2C **(redirect)**: `/marketplace/c2c` → `/annonces`, `/marketplace/c2c/:id` → `MarketplaceC2CDetailRedirect`
- Annonces (C2C classifieds): `/annonces`, `/annonces/{publier, recherche, mes-annonces}`, `/annonces/vendeur/:id`, `/annonces/:id`
- Verticals: `/marketplace-services`, `/activities-booking`, `/seasonal-rentals-booking`, `/seasonal-rentals` **(redirect → /seasonal-rentals-booking)**, `/long-term-rentals`
- Software pages: `/property-owner-software`, `/property-management-platform`, `/rental-management-software`
- City / SEO: `/guide/:citySlug`, `/best/:serviceSlug/in/:citySlug`, `/compare/:serviceSlug/in/:citySlug`, `/services/:service/in/:city`, `/activities/:activity/in/:city`
- Services SEO: `/services` **(redirect → /browse/services)**, `/services/:categorySlug`, `/services/city/:citySlug`, `/provider/seo/:providerId`
- Locations: `/locations`, `/country/:countrySlug`, `/city/:citySlug`, `/city/:citySlug/{services, activities, concierge, :categorySlug}`

## 14. Legal (`src/routes/legal.routes.tsx`)
- `/terms`, `/privacy`, `/cookies`, `/legal`, `/about`, `/contact`, `/help`, `/vision`

## 15. Index / catch-all (`src/routes/index.tsx`)
- `/seo/*` (additional SEO sub-tree)
- `*` (404 fallback)

---

## Appendix A — Verification

Generated and verified on 2026-04-17 with:

```
grep -hE 'path="[^"]+"' src/routes/*.tsx | sed -E 's/.*path="([^"]+)".*/\1/' | sort | uniq -c | awk '$1 > 1'
```

Output: empty — no duplicate `path=` declarations remain in `src/routes/*.tsx`.
