# Route Inventory

> Generated: 2026-04-24T01:51:32.082Z
> Total routes: **553**

## Summary

| Auth Level | Count |
|---|---|
| 🔵 protected | 318 |
| 🟢 public | 139 |
| 🔴 admin | 12 |
| 🟡 driver | 19 |
| 🟠 merchant | 37 |
| 🟣 pro | 28 |

---

## Dashboard Routes

| Path | Auth Level | Component | Redirect | Notes |
|---|---|---|---|---|
| `/` | 🔵 protected | unknown | - | Requires authenticated session; redirects to /login otherwise |
| `/concierge-ops` | 🔵 protected | unknown | - | Requires authenticated session; redirects to /login otherwise |
| `/customer/:customerId` | 🔵 protected | unknown | - | Requires authenticated session; redirects to /login otherwise |
| `/dashboard` | 🔵 protected | unknown | - | Requires authenticated session; redirects to /login otherwise |
| `/dashboard/accounting` | 🔵 protected | unknown | - | Requires authenticated session; redirects to /login otherwise |
| `/dashboard/accounting-entries` | 🔵 protected | unknown | - | Requires authenticated session; redirects to /login otherwise |
| `/dashboard/activities` | 🔵 protected | unknown | → /activities | Redirects to /activities |
| `/dashboard/ai` | 🔵 protected | unknown | - | Requires authenticated session; redirects to /login otherwise |
| `/dashboard/ai-search` | 🔵 protected | unknown | - | Requires authenticated session; redirects to /login otherwise |
| `/dashboard/army` | 🔵 protected | unknown | - | Requires authenticated session; redirects to /login otherwise |
| `/dashboard/audit` | 🔵 protected | unknown | → /wallet | Redirects to /wallet |
| `/dashboard/billing` | 🔵 protected | unknown | - | Requires authenticated session; redirects to /login otherwise |
| `/dashboard/boost` | 🔵 protected | unknown | - | Requires authenticated session; redirects to /login otherwise |
| `/dashboard/buildings` | 🔵 protected | unknown | - | Requires authenticated session; redirects to /login otherwise |
| `/dashboard/calendar` | 🔵 protected | unknown | - | Requires authenticated session; redirects to /login otherwise |
| `/dashboard/candidates` | 🔵 protected | unknown | → /property-hub?section=seasonal | Redirects to /property-hub?section=seasonal |
| `/dashboard/channels` | 🔵 protected | unknown | - | Requires authenticated session; redirects to /login otherwise |
| `/dashboard/charges-regularization` | 🔵 protected | unknown | - | Requires authenticated session; redirects to /login otherwise |
| `/dashboard/collaboration` | 🔵 protected | unknown | - | Requires authenticated session; redirects to /login otherwise |
| `/dashboard/command-center` | 🔵 protected | unknown | - | Requires authenticated session; redirects to /login otherwise |
| `/dashboard/command-legacy` | 🔵 protected | unknown | - | Requires authenticated session; redirects to /login otherwise |
| `/dashboard/communication` | 🔵 protected | unknown | - | Requires authenticated session; redirects to /login otherwise |
| `/dashboard/company` | 🔵 protected | unknown | - | Requires authenticated session; redirects to /login otherwise |
| `/dashboard/country/:countryCode` | 🔵 protected | unknown | - | Requires authenticated session; redirects to /login otherwise |
| `/dashboard/create-listing` | 🔵 protected | unknown | - | Requires authenticated session; redirects to /login otherwise |
| `/dashboard/cv-generator` | 🔵 protected | unknown | - | Requires authenticated session; redirects to /login otherwise |
| `/dashboard/delivery` | 🔵 protected | unknown | → /driver/dashboard | Redirects to /driver/dashboard |
| `/dashboard/developer` | 🔵 protected | unknown | - | Requires authenticated session; redirects to /login otherwise |
| `/dashboard/documents` | 🔵 protected | unknown | - | Requires authenticated session; redirects to /login otherwise |
| `/dashboard/driver` | 🔵 protected | unknown | → /driver/dashboard | Redirects to /driver/dashboard |
| `/dashboard/dunning-letters` | 🔵 protected | unknown | - | Requires authenticated session; redirects to /login otherwise |
| `/dashboard/dynamic-pricing` | 🔵 protected | unknown | - | Requires authenticated session; redirects to /login otherwise |
| `/dashboard/expenses` | 🔵 protected | unknown | - | Requires authenticated session; redirects to /login otherwise |
| `/dashboard/finances` | 🔵 protected | unknown | - | Requires authenticated session; redirects to /login otherwise |
| `/dashboard/fiscal-report` | 🔵 protected | unknown | - | Requires authenticated session; redirects to /login otherwise |
| `/dashboard/furniture-inventory` | 🔵 protected | unknown | - | Requires authenticated session; redirects to /login otherwise |
| `/dashboard/import` | 🔵 protected | unknown | - | Requires authenticated session; redirects to /login otherwise |
| `/dashboard/interventions` | 🔵 protected | unknown | - | Requires authenticated session; redirects to /login otherwise |
| `/dashboard/islamic` | 🔵 protected | unknown | - | Requires authenticated session; redirects to /login otherwise |
| `/dashboard/leases` | 🔵 protected | unknown | - | Requires authenticated session; redirects to /login otherwise |
| `/dashboard/messages` | 🔵 protected | unknown | → /orbit | Redirects to /orbit |
| `/dashboard/my-shop` | 🔵 protected | unknown | → /dashboard/my-shops | Redirects to /dashboard/my-shops |
| `/dashboard/my-shops` | 🔵 protected | unknown | - | Requires authenticated session; redirects to /login otherwise |
| `/dashboard/news` | 🔵 protected | unknown | → /seller | Redirects to /seller |
| `/dashboard/ops` | 🔵 protected | unknown | - | Requires authenticated session; redirects to /login otherwise |
| `/dashboard/payment-notices` | 🔵 protected | unknown | - | Requires authenticated session; redirects to /login otherwise |
| `/dashboard/prayer-times` | 🔵 protected | unknown | → /dashboard/islamic | Redirects to /dashboard/islamic |
| `/dashboard/profile` | 🔵 protected | unknown | - | Requires authenticated session; redirects to /login otherwise |
| `/dashboard/properties` | 🔵 protected | unknown | - | Requires authenticated session; redirects to /login otherwise |
| `/dashboard/property/:id` | 🔵 protected | unknown | - | Requires authenticated session; redirects to /login otherwise |
| `/dashboard/property/add` | 🔵 protected | unknown | - | Requires authenticated session; redirects to /login otherwise |
| `/dashboard/real-estate` | 🔵 protected | unknown | - | Requires authenticated session; redirects to /login otherwise |
| `/dashboard/receipts` | 🔵 protected | unknown | - | Requires authenticated session; redirects to /login otherwise |
| `/dashboard/referral-funnel` | 🔵 protected | unknown | - | Requires authenticated session; redirects to /login otherwise |
| `/dashboard/referrals` | 🔵 protected | unknown | - | Requires authenticated session; redirects to /login otherwise |
| `/dashboard/reminders` | 🔵 protected | unknown | - | Requires authenticated session; redirects to /login otherwise |
| `/dashboard/rent-cockpit` | 🔵 protected | unknown | - | Requires authenticated session; redirects to /login otherwise |
| `/dashboard/rental-management` | 🔵 protected | unknown | - | Requires authenticated session; redirects to /login otherwise |
| `/dashboard/reporting` | 🔵 protected | unknown | - | Requires authenticated session; redirects to /login otherwise |
| `/dashboard/seasonal-rentals` | 🔵 protected | unknown | → /property-hub?section=seasonal | Redirects to /property-hub?section=seasonal |
| `/dashboard/seller` | 🔵 protected | unknown | → /seller | Redirects to /seller |
| `/dashboard/service-tracking` | 🔵 protected | unknown | → /dashboard/islamic | Redirects to /dashboard/islamic |
| `/dashboard/settings` | 🔵 protected | unknown | - | Requires authenticated session; redirects to /login otherwise |
| `/dashboard/subscriptions` | 🔵 protected | unknown | - | Requires authenticated session; redirects to /login otherwise |
| `/dashboard/tasks` | 🔵 protected | unknown | → /orbit | Redirects to /orbit |
| `/dashboard/tenants` | 🔵 protected | unknown | - | Requires authenticated session; redirects to /login otherwise |
| `/dashboard/vault` | 🔵 protected | unknown | - | Requires authenticated session; redirects to /login otherwise |
| `/dashboard/wallet` | 🔵 protected | unknown | → /wallet | Redirects to /wallet |
| `/developer` | 🔵 protected | unknown | → /dashboard/developer | Redirects to /dashboard/developer |
| `/home` | 🔵 protected | unknown | - | Requires authenticated session; redirects to /login otherwise |
| `/landing` | 🔵 protected | unknown | - | Requires authenticated session; redirects to /login otherwise |
| `/pricing` | 🔵 protected | unknown | - | Requires authenticated session; redirects to /login otherwise |
| `/property-management` | 🟣 pro | unknown | → /dashboard/real-estate | Redirects to /dashboard/real-estate |
| `/real-estate/lease/:leaseId` | 🔵 protected | unknown | → /dashboard/real-estate | Redirects to /dashboard/real-estate |
| `/real-estate/property/:propertyId` | 🟢 public | unknown | - | Renders without auth |
| `/rentals` | 🔵 protected | unknown | → /dashboard/rental-management | Redirects to /dashboard/rental-management |
| `documents` | 🟢 public | REDocumentsPage | - | Renders without auth |
| `leases` | 🔵 protected | RELeasesPage | - | Requires authenticated session; redirects to /login otherwise |
| `payments` | 🟢 public | REPaymentsPage | - | Renders without auth |
| `tenants` | 🔵 protected | RETenantsPage | - | Requires authenticated session; redirects to /login otherwise |
| `units` | 🔵 protected | REUnitsPage | - | Requires authenticated session; redirects to /login otherwise |

## Legal Routes

| Path | Auth Level | Component | Redirect | Notes |
|---|---|---|---|---|
| `/about` | 🟢 public | unknown | - | Renders without auth |
| `/contact` | 🟢 public | unknown | - | Renders without auth |
| `/cookies` | 🟢 public | unknown | - | Renders without auth |
| `/help` | 🟢 public | unknown | - | Renders without auth |
| `/legal` | 🟢 public | unknown | - | Renders without auth |
| `/privacy` | 🟢 public | unknown | - | Renders without auth |
| `/terms` | 🟢 public | unknown | - | Renders without auth |
| `/vision` | 🟢 public | unknown | - | Renders without auth |

## Deeplinks Routes

| Path | Auth Level | Component | Redirect | Notes |
|---|---|---|---|---|
| `/account` | 🟢 public | unknown | → /me | Redirects to /me |
| `/add-contact` | 🟢 public | unknown | - | Renders without auth |
| `/claim/:token` | 🟢 public | unknown | - | Renders without auth |
| `/driver/missions` | 🟡 driver | unknown | → /driver/missions-board | Redirects to /driver/missions-board |
| `/go/:slug` | 🟢 public | unknown | - | Renders without auth |
| `/go/:slug/:category` | 🟢 public | unknown | - | Renders without auth |
| `/inbox` | 🟢 public | unknown | → /notifications | Redirects to /notifications |
| `/live/:liveId` | 🟢 public | unknown | - | Renders without auth |
| `/messages` | 🟢 public | unknown | → /orbit | Redirects to /orbit |
| `/p/:productId` | 🟢 public | unknown | - | Renders without auth |
| `/pay/:payId` | 🟢 public | unknown | - | Renders without auth |
| `/pay/confirm` | 🟢 public | unknown | - | Renders without auth |
| `/pay/link-resolver` | 🟢 public | unknown | - | Renders without auth |
| `/pay/request/:requestId` | 🟢 public | unknown | - | Renders without auth |
| `/pay/scan` | 🟢 public | unknown | - | Renders without auth |
| `/pay/success` | 🟢 public | unknown | - | Renders without auth |
| `/product/:productId` | 🟣 pro | unknown | - | Requires pro session |
| `/profile` | 🟣 pro | unknown | → /me | Redirects to /me |
| `/qr/:code` | 🟢 public | unknown | - | Renders without auth |
| `/qr/entry/:targetCode` | 🟢 public | unknown | - | Renders without auth |
| `/qr/pay/:code` | 🟢 public | unknown | - | Renders without auth |
| `/qr/pickup` | 🟢 public | unknown | - | Renders without auth |
| `/qr/track` | 🟢 public | unknown | - | Renders without auth |
| `/sl/:code` | 🟢 public | unknown | - | Renders without auth |
| `/u/:userId` | 🟢 public | unknown | - | Renders without auth |

## Radar Routes

| Path | Auth Level | Component | Redirect | Notes |
|---|---|---|---|---|
| `/account/:orgId` | 🟢 public | unknown | - | Renders without auth |
| `/activities` | 🔵 protected | unknown | - | Requires authenticated session; redirects to /login otherwise |
| `/book/:slug` | 🔵 protected | unknown | - | Requires authenticated session; redirects to /login otherwise |
| `/browse` | 🟢 public | unknown | - | Renders without auth |
| `/browse/:vertical` | 🟢 public | unknown | → /browse/food | Redirects to /browse/food |
| `/call/:threadId` | 🔵 protected | unknown | - | Requires authenticated session; redirects to /login otherwise |
| `/city-market/:citySlug` | 🟢 public | unknown | - | Renders without auth |
| `/concierge-services` | 🟢 public | unknown | - | Renders without auth |
| `/delivery` | 🔵 protected | unknown | → /mobility/delivery | Redirects to /mobility/delivery |
| `/discover` | 🟢 public | unknown | → /radar | Redirects to /radar |
| `/driver/heatmap` | 🟡 driver | unknown | - | Requires driver session |
| `/electronics` | 🟢 public | unknown | → /browse/shops?sub=electronics | Redirects to /browse/shops?sub=electronics |
| `/experiences` | 🟢 public | unknown | → /browse/experiences | Redirects to /browse/experiences |
| `/explore` | 🟢 public | unknown | - | Renders without auth |
| `/food` | 🟢 public | unknown | → /browse/food | Redirects to /browse/food |
| `/food/:type` | 🟢 public | unknown | - | Renders without auth |
| `/food/:type/:cuisine` | 🟢 public | unknown | - | Renders without auth |
| `/food/r/:cuisine/:restaurantId` | 🟢 public | unknown | - | Renders without auth |
| `/food/restaurant/:restaurantId` | 🟢 public | unknown | - | Renders without auth |
| `/geo-explorer` | 🟢 public | unknown | - | Renders without auth |
| `/geo-explorer/:countryCode` | 🟢 public | unknown | - | Renders without auth |
| `/geo-explorer/:countryCode/:cityId` | 🟢 public | unknown | - | Renders without auth |
| `/gifts` | 🟢 public | unknown | → /browse/shops?sub=gifts | Redirects to /browse/shops?sub=gifts |
| `/grocery` | 🟢 public | unknown | → /browse/grocery | Redirects to /browse/grocery |
| `/guest/:orgId` | 🔵 protected | unknown | - | Requires authenticated session; redirects to /login otherwise |
| `/healthcare` | 🟢 public | unknown | → /browse/healthcare | Redirects to /browse/healthcare |
| `/host/:orgId` | 🔵 protected | unknown | - | Requires authenticated session; redirects to /login otherwise |
| `/hotel/calendar` | 🔵 protected | unknown | - | Requires authenticated session; redirects to /login otherwise |
| `/hotel/dashboard` | 🔵 protected | unknown | - | Requires authenticated session; redirects to /login otherwise |
| `/hotel/pricing` | 🔵 protected | unknown | - | Requires authenticated session; redirects to /login otherwise |
| `/hotel/rooms` | 🔵 protected | unknown | - | Requires authenticated session; redirects to /login otherwise |
| `/listing/:id` | 🔵 protected | unknown | - | Requires authenticated session; redirects to /login otherwise |
| `/map` | 🟢 public | unknown | → /radar | Redirects to /radar |
| `/menu/:shopSlug` | 🟢 public | unknown | - | Renders without auth |
| `/mobility` | 🔵 protected | unknown | - | Requires authenticated session; redirects to /login otherwise |
| `/mobility/delivery` | 🟢 public | unknown | - | Renders without auth |
| `/mobility/delivery/bring` | 🟢 public | unknown | - | Renders without auth |
| `/mobility/delivery/errand` | 🔵 protected | unknown | - | Requires authenticated session; redirects to /login otherwise |
| `/mobility/delivery/gift` | 🔵 protected | unknown | - | Requires authenticated session; redirects to /login otherwise |
| `/mobility/delivery/parcel` | 🔵 protected | unknown | - | Requires authenticated session; redirects to /login otherwise |
| `/mobility/taxi` | 🔵 protected | unknown | - | Requires authenticated session; redirects to /login otherwise |
| `/nearby` | 🟢 public | unknown | - | Renders without auth |
| `/pets` | 🟢 public | unknown | → /browse/services?sub=pet_care | Redirects to /browse/services?sub=pet_care |
| `/properties` | 🟣 pro | unknown | - | Requires pro session |
| `/property` | 🟣 pro | unknown | → /property | Redirects to /property |
| `/property-hub` | 🟣 pro | unknown | - | Requires pro session |
| `/property-hub/seasonal/reservations` | 🟣 pro | unknown | - | Requires pro session |
| `/property/booking` | 🟣 pro | unknown | - | Requires pro session |
| `/property/confirmation` | 🟣 pro | unknown | - | Requires pro session |
| `/property/detail` | 🟣 pro | unknown | - | Requires pro session |
| `/property/payment` | 🟣 pro | unknown | - | Requires pro session |
| `/property/results` | 🟣 pro | unknown | - | Requires pro session |
| `/property/search` | 🟣 pro | unknown | - | Requires pro session |
| `/provider/:providerId` | 🟣 pro | unknown | - | Requires pro session |
| `/provider/availability` | 🟣 pro | unknown | - | Requires pro session |
| `/provider/availability-v2` | 🟣 pro | unknown | - | Requires pro session |
| `/provider/bookings` | 🟣 pro | unknown | - | Requires pro session |
| `/provider/calendar` | 🟣 pro | unknown | - | Requires pro session |
| `/provider/dashboard` | 🟣 pro | unknown | - | Requires pro session |
| `/provider/earnings` | 🟣 pro | unknown | - | Requires pro session |
| `/provider/services` | 🟣 pro | unknown | - | Requires pro session |
| `/provider/services-crud` | 🟣 pro | unknown | - | Requires pro session |
| `/provider/zones` | 🟣 pro | unknown | - | Requires pro session |
| `/radar` | 🟢 public | unknown | → /radar | Redirects to /radar |
| `/real-estate` | 🟢 public | unknown | → /property | Redirects to /property |
| `/real-estate-listing/:slug` | 🟢 public | unknown | - | Renders without auth |
| `/real-estate/:listingType` | 🔵 protected | unknown | → /property | Redirects to /property |
| `/real-estate/:listingType/:slug` | 🔵 protected | unknown | - | Requires authenticated session; redirects to /login otherwise |
| `/real-estate/dubai-analytics` | 🟢 public | unknown | → /property | Redirects to /property |
| `/rentals/:country` | 🟢 public | unknown | - | Renders without auth |
| `/rentals/:country/:city` | 🟢 public | unknown | - | Renders without auth |
| `/ride` | 🔵 protected | unknown | → /mobility/taxi | Redirects to /mobility/taxi |
| `/rider/live` | 🔵 protected | unknown | → /mobility/taxi | Redirects to /mobility/taxi |
| `/s/:slug` | 🟢 public | unknown | - | Renders without auth |
| `/s/:slug/:categorySlug` | 🟢 public | unknown | → /favorites | Redirects to /favorites |
| `/saved` | 🟢 public | unknown | → /favorites | Redirects to /favorites |
| `/search` | 🟢 public | unknown | → /radar | Redirects to /radar |
| `/search-results` | 🟢 public | unknown | - | Renders without auth |
| `/send` | 🔵 protected | unknown | → /mobility/delivery | Redirects to /mobility/delivery |
| `/send-package` | 🔵 protected | unknown | → /mobility/delivery | Redirects to /mobility/delivery |
| `/services-hub` | 🟢 public | unknown | → /browse/services | Redirects to /browse/services |
| `/shop` | 🟢 public | unknown | - | Renders without auth |
| `/shop/category/:categorySlug` | 🟢 public | unknown | - | Renders without auth |
| `/shop/mall/:mallSlug` | 🟢 public | unknown | - | Renders without auth |
| `/shop/store/:slug` | 🟢 public | unknown | - | Renders without auth |
| `/shop/subcategory/:categorySlug/:subcategorySlug` | 🟢 public | unknown | - | Renders without auth |
| `/shops` | 🟢 public | unknown | → /browse/retail | Redirects to /browse/retail |
| `/showcase/:orgId` | 🟢 public | unknown | - | Renders without auth |
| `/stay` | 🟢 public | unknown | → /stay | Redirects to /stay |
| `/stays` | 🟢 public | unknown | → /stay | Redirects to /stay |
| `/stays/:country` | 🟢 public | unknown | → /stay | Redirects to /stay |
| `/stays/:country/:city` | 🔵 protected | unknown | → /stay | Redirects to /stay |
| `/store/:storeId` | 🔵 protected | unknown | - | Requires authenticated session; redirects to /login otherwise |
| `/subscription/priority` | 🔵 protected | unknown | - | Requires authenticated session; redirects to /login otherwise |
| `/taxi` | 🔵 protected | unknown | → /mobility/taxi | Redirects to /mobility/taxi |
| `/top-rated` | 🟢 public | unknown | - | Renders without auth |
| `/track/:rideRequestId` | 🔵 protected | unknown | - | Requires authenticated session; redirects to /login otherwise |
| `/travel` | 🔵 protected | unknown | - | Requires authenticated session; redirects to /login otherwise |
| `/travel/flight-confirmation` | 🔵 protected | unknown | - | Requires authenticated session; redirects to /login otherwise |
| `/travel/flight-detail` | 🔵 protected | unknown | - | Requires authenticated session; redirects to /login otherwise |
| `/travel/flight-passengers` | 🔵 protected | unknown | - | Requires authenticated session; redirects to /login otherwise |
| `/travel/flight-payment` | 🔵 protected | unknown | - | Requires authenticated session; redirects to /login otherwise |
| `/travel/flight-results` | 🔵 protected | unknown | - | Requires authenticated session; redirects to /login otherwise |
| `/travel/flight-search` | 🔵 protected | unknown | - | Requires authenticated session; redirects to /login otherwise |
| `/travel/flight/:id` | 🔵 protected | unknown | - | Requires authenticated session; redirects to /login otherwise |
| `/travel/flights` | 🔵 protected | unknown | - | Requires authenticated session; redirects to /login otherwise |
| `/travel/hotel-checkout` | 🔵 protected | unknown | - | Requires authenticated session; redirects to /login otherwise |
| `/travel/hotel/:id` | 🔵 protected | unknown | - | Requires authenticated session; redirects to /login otherwise |
| `/travel/hotels` | 🔵 protected | unknown | → /travel/stays | Redirects to /travel/stays |
| `/travel/stay/:id` | 🔵 protected | unknown | - | Requires authenticated session; redirects to /login otherwise |
| `/travel/stays` | 🔵 protected | unknown | → /travel/stays | Redirects to /travel/stays |
| `/trending` | 🟢 public | unknown | - | Renders without auth |
| `/utility` | 🟢 public | unknown | → /browse/utility | Redirects to /browse/utility |

## Seo Routes

| Path | Auth Level | Component | Redirect | Notes |
|---|---|---|---|---|
| `/activities-booking` | 🟢 public | unknown | - | Renders without auth |
| `/activities/:activity/in/:city` | 🟢 public | unknown | → /browse/services | Redirects to /browse/services |
| `/annonces` | 🟢 public | unknown | - | Renders without auth |
| `/annonces/:id` | 🟢 public | unknown | - | Renders without auth |
| `/annonces/mes-annonces` | 🟢 public | unknown | - | Renders without auth |
| `/annonces/publier` | 🟢 public | unknown | - | Renders without auth |
| `/annonces/recherche` | 🟢 public | unknown | - | Renders without auth |
| `/annonces/vendeur/:id` | 🟢 public | unknown | - | Renders without auth |
| `/best/:serviceSlug/in/:citySlug` | 🟢 public | unknown | - | Renders without auth |
| `/browse/services` | 🟢 public | unknown | - | Renders without auth |
| `/browse/services/:providerId` | 🟢 public | unknown | - | Renders without auth |
| `/city/:citySlug` | 🟢 public | unknown | - | Renders without auth |
| `/city/:citySlug/:categorySlug` | 🟢 public | unknown | - | Renders without auth |
| `/city/:citySlug/activities` | 🟢 public | unknown | - | Renders without auth |
| `/city/:citySlug/concierge` | 🟢 public | unknown | - | Renders without auth |
| `/city/:citySlug/services` | 🟢 public | unknown | - | Renders without auth |
| `/compare/:serviceSlug/in/:citySlug` | 🟢 public | unknown | - | Renders without auth |
| `/country/:countrySlug` | 🟢 public | unknown | - | Renders without auth |
| `/guide/:citySlug` | 🟢 public | unknown | - | Renders without auth |
| `/locations` | 🟢 public | unknown | - | Renders without auth |
| `/long-term-rentals` | 🟢 public | unknown | - | Renders without auth |
| `/marketplace` | 🟢 public | unknown | → /annonces | Redirects to /annonces |
| `/marketplace-services` | 🟢 public | unknown | - | Renders without auth |
| `/marketplace/:citySlug` | 🟢 public | unknown | - | Renders without auth |
| `/marketplace/:citySlug/:serviceSlug` | 🟢 public | unknown | - | Renders without auth |
| `/marketplace/c2c` | 🟢 public | unknown | → /annonces | Redirects to /annonces |
| `/marketplace/c2c/:id` | 🟢 public | unknown | - | Renders without auth |
| `/property-management-platform` | 🟣 pro | unknown | - | Requires pro session |
| `/property-owner-software` | 🟣 pro | unknown | - | Requires pro session |
| `/provider/seo/:providerId` | 🟣 pro | unknown | - | Requires pro session |
| `/rental-management-software` | 🟢 public | unknown | - | Renders without auth |
| `/seasonal-rentals` | 🟢 public | unknown | → /seasonal-rentals-booking | Redirects to /seasonal-rentals-booking |
| `/seasonal-rentals-booking` | 🟢 public | unknown | → /seasonal-rentals-booking | Redirects to /seasonal-rentals-booking |
| `/services` | 🟢 public | unknown | → /browse/services | Redirects to /browse/services |
| `/services/:categorySlug` | 🟢 public | unknown | - | Renders without auth |
| `/services/:service/in/:city` | 🟢 public | unknown | - | Renders without auth |
| `/services/city/:citySlug` | 🟢 public | unknown | - | Renders without auth |

## Admin Routes

| Path | Auth Level | Component | Redirect | Notes |
|---|---|---|---|---|
| `/admin` | 🔵 protected | unknown | - | Requires authenticated session; redirects to /login otherwise |
| `/admin/agents` | 🟢 public | unknown | - | Renders without auth |
| `/admin/agents/:slug/runs` | 🟢 public | unknown | - | Renders without auth |
| `/admin/ai-control-center` | 🔵 protected | unknown | - | Requires authenticated session; redirects to /login otherwise |
| `/admin/alerts` | 🔵 protected | unknown | - | Requires authenticated session; redirects to /login otherwise |
| `/admin/analytics-ops` | 🔵 protected | unknown | - | Requires authenticated session; redirects to /login otherwise |
| `/admin/approvals` | 🟢 public | unknown | - | Renders without auth |
| `/admin/architecture-lab` | 🔵 protected | unknown | - | Requires authenticated session; redirects to /login otherwise |
| `/admin/autonomy` | 🔵 protected | unknown | - | Requires authenticated session; redirects to /login otherwise |
| `/admin/command-center` | 🟢 public | unknown | - | Renders without auth |
| `/admin/command-control` | 🔵 protected | unknown | - | Requires authenticated session; redirects to /login otherwise |
| `/admin/content-ops` | 🔵 protected | unknown | - | Requires authenticated session; redirects to /login otherwise |
| `/admin/control` | 🔴 admin | unknown | - | Requires admin role; redirects or 403 otherwise |
| `/admin/control-room` | 🔵 protected | unknown | - | Requires authenticated session; redirects to /login otherwise |
| `/admin/control/:section` | 🔵 protected | unknown | - | Requires authenticated session; redirects to /login otherwise |
| `/admin/control/agents` | 🔴 admin | unknown | - | Requires admin role; redirects or 403 otherwise |
| `/admin/control/approvals` | 🔴 admin | unknown | - | Requires admin role; redirects or 403 otherwise |
| `/admin/control/command` | 🔴 admin | unknown | - | Requires admin role; redirects or 403 otherwise |
| `/admin/control/master` | 🔴 admin | unknown | - | Requires admin role; redirects or 403 otherwise |
| `/admin/control/proof` | 🔴 admin | unknown | - | Requires admin role; redirects or 403 otherwise |
| `/admin/control/runs` | 🔴 admin | unknown | - | Requires admin role; redirects or 403 otherwise |
| `/admin/control/tasks` | 🔴 admin | unknown | - | Requires admin role; redirects or 403 otherwise |
| `/admin/control/watchdog` | 🔴 admin | unknown | - | Requires admin role; redirects or 403 otherwise |
| `/admin/control/wiring` | 🔴 admin | unknown | - | Requires admin role; redirects or 403 otherwise |
| `/admin/crm-ops` | 🔵 protected | unknown | - | Requires authenticated session; redirects to /login otherwise |
| `/admin/data-lab` | 🔵 protected | unknown | - | Requires authenticated session; redirects to /login otherwise |
| `/admin/data-quality` | 🔵 protected | unknown | - | Requires authenticated session; redirects to /login otherwise |
| `/admin/delivery-ops` | 🔵 protected | unknown | - | Requires authenticated session; redirects to /login otherwise |
| `/admin/delivery-proof/:orderId` | 🔵 protected | unknown | - | Requires authenticated session; redirects to /login otherwise |
| `/admin/disputes` | 🔵 protected | unknown | - | Requires authenticated session; redirects to /login otherwise |
| `/admin/dld-backfill` | 🔴 admin | unknown | - | Requires admin role; redirects or 403 otherwise |
| `/admin/driver-live` | 🔵 protected | unknown | - | Requires authenticated session; redirects to /login otherwise |
| `/admin/driver-monitor` | 🔵 protected | unknown | - | Requires authenticated session; redirects to /login otherwise |
| `/admin/engine-control-room` | 🔵 protected | unknown | - | Requires authenticated session; redirects to /login otherwise |
| `/admin/engines` | 🔵 protected | unknown | - | Requires authenticated session; redirects to /login otherwise |
| `/admin/execution-proof` | 🔵 protected | unknown | - | Requires authenticated session; redirects to /login otherwise |
| `/admin/experiment-lab` | 🔵 protected | unknown | - | Requires authenticated session; redirects to /login otherwise |
| `/admin/finance-summary` | 🔵 protected | unknown | - | Requires authenticated session; redirects to /login otherwise |
| `/admin/financial-recon` | 🔵 protected | unknown | - | Requires authenticated session; redirects to /login otherwise |
| `/admin/firecrawl-usage` | 🔵 protected | unknown | - | Requires authenticated session; redirects to /login otherwise |
| `/admin/food-checkout` | 🔵 protected | unknown | - | Requires authenticated session; redirects to /login otherwise |
| `/admin/fraud-detection` | 🔵 protected | unknown | - | Requires authenticated session; redirects to /login otherwise |
| `/admin/growth-ops` | 🔵 protected | unknown | - | Requires authenticated session; redirects to /login otherwise |
| `/admin/integration-diagnostics` | 🔵 protected | unknown | - | Requires authenticated session; redirects to /login otherwise |
| `/admin/integration-health` | 🔵 protected | unknown | - | Requires authenticated session; redirects to /login otherwise |
| `/admin/kyc` | 🔵 protected | unknown | - | Requires authenticated session; redirects to /login otherwise |
| `/admin/lab-hub` | 🔵 protected | unknown | - | Requires authenticated session; redirects to /login otherwise |
| `/admin/loyalty-redeem` | 🔵 protected | unknown | - | Requires authenticated session; redirects to /login otherwise |
| `/admin/map-errors` | 🔵 protected | unknown | - | Requires authenticated session; redirects to /login otherwise |
| `/admin/marketplace-ops` | 🔵 protected | unknown | - | Requires authenticated session; redirects to /login otherwise |
| `/admin/master-control` | 🔵 protected | unknown | - | Requires authenticated session; redirects to /login otherwise |
| `/admin/menu` | 🔵 protected | unknown | - | Requires authenticated session; redirects to /login otherwise |
| `/admin/merchant-approval-queue` | 🔵 protected | unknown | - | Requires authenticated session; redirects to /login otherwise |
| `/admin/merchant-health` | 🔵 protected | unknown | - | Requires authenticated session; redirects to /login otherwise |
| `/admin/merge-conflict-recovery` | 🔵 protected | unknown | - | Requires authenticated session; redirects to /login otherwise |
| `/admin/notification-lab` | 🔵 protected | unknown | - | Requires authenticated session; redirects to /login otherwise |
| `/admin/notification-ops` | 🔵 protected | unknown | - | Requires authenticated session; redirects to /login otherwise |
| `/admin/ops-dashboard` | 🔵 protected | unknown | - | Requires authenticated session; redirects to /login otherwise |
| `/admin/order-watch` | 🔵 protected | unknown | - | Requires authenticated session; redirects to /login otherwise |
| `/admin/payments-ops` | 🔵 protected | unknown | - | Requires authenticated session; redirects to /login otherwise |
| `/admin/performance-lab` | 🔵 protected | unknown | - | Requires authenticated session; redirects to /login otherwise |
| `/admin/pipeline` | 🔵 protected | unknown | - | Requires authenticated session; redirects to /login otherwise |
| `/admin/platform-health` | 🔵 protected | unknown | - | Requires authenticated session; redirects to /login otherwise |
| `/admin/qr-generate` | 🔵 protected | unknown | - | Requires authenticated session; redirects to /login otherwise |
| `/admin/quality-ops` | 🔵 protected | unknown | - | Requires authenticated session; redirects to /login otherwise |
| `/admin/realtime-control` | 🔵 protected | unknown | - | Requires authenticated session; redirects to /login otherwise |
| `/admin/refund-queue` | 🔵 protected | unknown | - | Requires authenticated session; redirects to /login otherwise |
| `/admin/release-history` | 🔵 protected | unknown | - | Requires authenticated session; redirects to /login otherwise |
| `/admin/retention-ops` | 🔵 protected | unknown | - | Requires authenticated session; redirects to /login otherwise |
| `/admin/review-queue` | 🔵 protected | unknown | - | Requires authenticated session; redirects to /login otherwise |
| `/admin/security-lab` | 🔵 protected | unknown | - | Requires authenticated session; redirects to /login otherwise |
| `/admin/seed-tools` | 🔵 protected | unknown | - | Requires authenticated session; redirects to /login otherwise |
| `/admin/shop-import` | 🔵 protected | unknown | - | Requires authenticated session; redirects to /login otherwise |
| `/admin/shop-quality` | 🔵 protected | unknown | - | Requires authenticated session; redirects to /login otherwise |
| `/admin/source-audit` | 🔵 protected | unknown | - | Requires authenticated session; redirects to /login otherwise |
| `/admin/statement` | 🔵 protected | unknown | - | Requires authenticated session; redirects to /login otherwise |
| `/admin/super-dashboard` | 🔴 admin | unknown | - | Requires admin role; redirects or 403 otherwise |
| `/admin/support-inbox` | 🔵 protected | unknown | - | Requires authenticated session; redirects to /login otherwise |
| `/admin/support-ops` | 🔵 protected | unknown | - | Requires authenticated session; redirects to /login otherwise |
| `/admin/support-sla` | 🔵 protected | unknown | - | Requires authenticated session; redirects to /login otherwise |
| `/admin/system-health` | 🔵 protected | unknown | - | Requires authenticated session; redirects to /login otherwise |
| `/admin/ui-engine` | 🔵 protected | unknown | - | Requires authenticated session; redirects to /login otherwise |
| `/admin/user-lookup` | 🔵 protected | unknown | - | Requires authenticated session; redirects to /login otherwise |
| `/admin/wallet-diagnostics` | 🔵 protected | unknown | - | Requires authenticated session; redirects to /login otherwise |
| `/admin/watchdog` | 🔵 protected | unknown | - | Requires authenticated session; redirects to /login otherwise |
| `/admin/wiring-health` | 🔵 protected | unknown | - | Requires authenticated session; redirects to /login otherwise |
| `/builder` | 🔵 protected | unknown | - | Requires authenticated session; redirects to /login otherwise |
| `/builder/architecture` | 🔵 protected | unknown | - | Requires authenticated session; redirects to /login otherwise |
| `/builder/audit` | 🔵 protected | unknown | - | Requires authenticated session; redirects to /login otherwise |
| `/builder/deploy` | 🔵 protected | unknown | - | Requires authenticated session; redirects to /login otherwise |
| `/builder/evolution` | 🔵 protected | unknown | - | Requires authenticated session; redirects to /login otherwise |
| `/builder/memory` | 🔵 protected | unknown | - | Requires authenticated session; redirects to /login otherwise |
| `/builder/repair` | 🔵 protected | unknown | - | Requires authenticated session; redirects to /login otherwise |
| `/developer-portal/docs` | 🔵 protected | unknown | - | Requires authenticated session; redirects to /login otherwise |

## Auth Routes

| Path | Auth Level | Component | Redirect | Notes |
|---|---|---|---|---|
| `/auth/callback` | 🔵 protected | unknown | - | Requires authenticated session; redirects to /login otherwise |
| `/auth/diagnostic` | 🔵 protected | unknown | - | Requires authenticated session; redirects to /login otherwise |
| `/forgot-password` | 🟢 public | unknown | - | Renders without auth |
| `/install` | 🔵 protected | unknown | - | Requires authenticated session; redirects to /login otherwise |
| `/login` | 🟢 public | unknown | - | Renders without auth |
| `/onboarding` | 🔵 protected | unknown | - | Requires authenticated session; redirects to /login otherwise |
| `/reset-password` | 🟢 public | unknown | - | Renders without auth |
| `/signup` | 🟢 public | unknown | - | Renders without auth |
| `/verify-account` | 🟢 public | unknown | - | Renders without auth |
| `/verify-email` | 🔵 protected | unknown | - | Requires authenticated session; redirects to /login otherwise |

## Driver Routes

| Path | Auth Level | Component | Redirect | Notes |
|---|---|---|---|---|
| `/business` | 🔵 protected | unknown | - | Requires authenticated session; redirects to /login otherwise |
| `/claim-shop/:merchantId` | 🔵 protected | unknown | - | Requires authenticated session; redirects to /login otherwise |
| `/driver/active-missions` | 🟡 driver | unknown | - | Requires driver session |
| `/driver/availability-zones` | 🟡 driver | unknown | - | Requires driver session |
| `/driver/breaks` | 🟡 driver | unknown | - | Requires driver session |
| `/driver/completed-deliveries` | 🟡 driver | unknown | - | Requires driver session |
| `/driver/dashboard` | 🟡 driver | unknown | - | Requires driver session |
| `/driver/earnings` | 🟡 driver | unknown | → /driver/earnings | Redirects to /driver/earnings |
| `/driver/earnings-summary` | 🟡 driver | unknown | - | Requires driver session |
| `/driver/earnings-v2` | 🟡 driver | unknown | → /driver/earnings | Redirects to /driver/earnings |
| `/driver/fuel-costs-v2` | 🟡 driver | unknown | - | Requires driver session |
| `/driver/live-missions` | 🟡 driver | unknown | - | Requires driver session |
| `/driver/missions-board` | 🟡 driver | unknown | - | Requires driver session |
| `/driver/missions-board/:orderId` | 🟡 driver | unknown | - | Requires driver session |
| `/driver/payout` | 🟡 driver | unknown | - | Requires driver session |
| `/driver/proof/:orderId` | 🟡 driver | unknown | - | Requires driver session |
| `/driver/shift` | 🟡 driver | unknown | - | Requires driver session |
| `/driver/taxi` | 🟡 driver | unknown | - | Requires driver session |
| `/driver/taxi/earnings` | 🟡 driver | unknown | - | Requires driver session |
| `/seller` | 🔵 protected | unknown | - | Requires authenticated session; redirects to /login otherwise |
| `/seller/boost` | 🔵 protected | unknown | - | Requires authenticated session; redirects to /login otherwise |

## Wallet Routes

| Path | Auth Level | Component | Redirect | Notes |
|---|---|---|---|---|
| `/checkout` | 🔵 protected | unknown | - | Requires authenticated session; redirects to /login otherwise |
| `/checkout/address-selector` | 🔵 protected | unknown | - | Requires authenticated session; redirects to /login otherwise |
| `/checkout/gift-order` | 🔵 protected | unknown | - | Requires authenticated session; redirects to /login otherwise |
| `/checkout/group-order` | 🔵 protected | unknown | - | Requires authenticated session; redirects to /login otherwise |
| `/checkout/party-order` | 🔵 protected | unknown | - | Requires authenticated session; redirects to /login otherwise |
| `/checkout/share-cart` | 🔵 protected | unknown | → /my-orders | Redirects to /my-orders |
| `/checkout/split-bill` | 🔵 protected | unknown | - | Requires authenticated session; redirects to /login otherwise |
| `/guest/checkout/:cartId` | 🔵 protected | GuestCheckoutPage | - | Requires authenticated session; redirects to /login otherwise |
| `/live-tracking` | 🔵 protected | unknown | - | Requires authenticated session; redirects to /login otherwise |
| `/my-orders` | 🔵 protected | unknown | - | Requires authenticated session; redirects to /login otherwise |
| `/my-orders/active` | 🔵 protected | unknown | - | Requires authenticated session; redirects to /login otherwise |
| `/my-orders/archive` | 🔵 protected | unknown | - | Requires authenticated session; redirects to /login otherwise |
| `/order/:orderId` | 🔵 protected | unknown | - | Requires authenticated session; redirects to /login otherwise |
| `/order/receipt/:orderId` | 🔵 protected | unknown | - | Requires authenticated session; redirects to /login otherwise |
| `/order/refund/:orderId` | 🔵 protected | unknown | - | Requires authenticated session; redirects to /login otherwise |
| `/order/reorder/:orderId` | 🔵 protected | unknown | - | Requires authenticated session; redirects to /login otherwise |
| `/orders` | 🔵 protected | unknown | → /my-orders | Redirects to /my-orders |
| `/payment/:orderId` | 🔵 protected | unknown | - | Requires authenticated session; redirects to /login otherwise |
| `/payments/stripe-elements` | 🔵 protected | unknown | - | Requires authenticated session; redirects to /login otherwise |
| `/payments/stripe-handler` | 🔵 protected | unknown | - | Requires authenticated session; redirects to /login otherwise |
| `/pos` | 🔵 protected | unknown | - | Requires authenticated session; redirects to /login otherwise |
| `/pos/:shopId` | 🔵 protected | unknown | - | Requires authenticated session; redirects to /login otherwise |
| `/refund/:rideRequestId` | 🔵 protected | unknown | - | Requires authenticated session; redirects to /login otherwise |
| `/reorder` | 🔵 protected | unknown | - | Requires authenticated session; redirects to /login otherwise |
| `/tracking/:orderId` | 🔵 protected | unknown | - | Requires authenticated session; redirects to /login otherwise |
| `/wallet` | 🔵 protected | unknown | → /wallet | Redirects to /wallet |
| `/wallet/accounts` | 🔵 protected | unknown | → /settings/wallet | Redirects to /settings/wallet |
| `/wallet/forex` | 🔵 protected | unknown | - | Requires authenticated session; redirects to /login otherwise |
| `/wallet/hub` | 🔵 protected | unknown | → /wallet | Redirects to /wallet |
| `/wallet/installments` | 🔵 protected | unknown | → /settings/wallet | Redirects to /settings/wallet |
| `/wallet/pay/:threadId` | 🔵 protected | unknown | - | Requires authenticated session; redirects to /login otherwise |
| `/wallet/property/*` | 🔵 protected | unknown | - | Requires authenticated session; redirects to /login otherwise |
| `/wallet/request` | 🔵 protected | unknown | - | Requires authenticated session; redirects to /login otherwise |
| `/wallet/security` | 🔵 protected | unknown | → /settings/wallet | Redirects to /settings/wallet |
| `/wallet/top-up` | 🔵 protected | unknown | - | Requires authenticated session; redirects to /login otherwise |
| `/wallet/transaction/:txId` | 🔵 protected | unknown | - | Requires authenticated session; redirects to /login otherwise |
| `/wallet/transfer` | 🔵 protected | unknown | - | Requires authenticated session; redirects to /login otherwise |
| `/wallet/virtual-cards` | 🔵 protected | unknown | - | Requires authenticated session; redirects to /login otherwise |

## Me Routes

| Path | Auth Level | Component | Redirect | Notes |
|---|---|---|---|---|
| `/favorites` | 🔵 protected | unknown | - | Requires authenticated session; redirects to /login otherwise |
| `/location/live` | 🔵 protected | unknown | - | Requires authenticated session; redirects to /login otherwise |
| `/me` | 🔵 protected | unknown | - | Requires authenticated session; redirects to /login otherwise |
| `/me/address-book` | 🔵 protected | unknown | - | Requires authenticated session; redirects to /login otherwise |
| `/me/auto-repeat` | 🔵 protected | unknown | - | Requires authenticated session; redirects to /login otherwise |
| `/me/badges` | 🔵 protected | unknown | - | Requires authenticated session; redirects to /login otherwise |
| `/me/challenges` | 🔵 protected | unknown | - | Requires authenticated session; redirects to /login otherwise |
| `/me/creator` | 🔵 protected | unknown | - | Requires authenticated session; redirects to /login otherwise |
| `/me/creator/affiliates` | 🔵 protected | unknown | - | Requires authenticated session; redirects to /login otherwise |
| `/me/creator/analytics` | 🔵 protected | unknown | - | Requires authenticated session; redirects to /login otherwise |
| `/me/creator/tips` | 🔵 protected | unknown | - | Requires authenticated session; redirects to /login otherwise |
| `/me/delivery-notes` | 🔵 protected | unknown | - | Requires authenticated session; redirects to /login otherwise |
| `/me/edit-profile` | 🔵 protected | unknown | - | Requires authenticated session; redirects to /login otherwise |
| `/me/gestion-immo` | 🔵 protected | unknown | → /property-hub | Redirects to /property-hub |
| `/me/gestion-immo/:propertyId` | 🔵 protected | unknown | - | Requires authenticated session; redirects to /login otherwise |
| `/me/leases` | 🔵 protected | unknown | - | Requires authenticated session; redirects to /login otherwise |
| `/me/leases/:leaseId` | 🔵 protected | unknown | - | Requires authenticated session; redirects to /login otherwise |
| `/me/loyalty` | 🔵 protected | unknown | - | Requires authenticated session; redirects to /login otherwise |
| `/me/loyalty-history` | 🔵 protected | unknown | - | Requires authenticated session; redirects to /login otherwise |
| `/me/maintenance` | 🔵 protected | unknown | - | Requires authenticated session; redirects to /login otherwise |
| `/me/maintenance/:ticketId` | 🔵 protected | unknown | - | Requires authenticated session; redirects to /login otherwise |
| `/me/order-receipts` | 🔵 protected | unknown | → /property-hub | Redirects to /property-hub |
| `/me/payment-activity` | 🔵 protected | unknown | - | Requires authenticated session; redirects to /login otherwise |
| `/me/properties` | 🔵 protected | unknown | - | Requires authenticated session; redirects to /login otherwise |
| `/me/properties/:propertyId` | 🔵 protected | unknown | - | Requires authenticated session; redirects to /login otherwise |
| `/me/properties/analytics` | 🔵 protected | unknown | - | Requires authenticated session; redirects to /login otherwise |
| `/me/properties/create` | 🔵 protected | unknown | - | Requires authenticated session; redirects to /login otherwise |
| `/me/properties/list` | 🔵 protected | unknown | - | Requires authenticated session; redirects to /login otherwise |
| `/me/property-hub` | 🔵 protected | unknown | → /property-hub | Redirects to /property-hub |
| `/me/redeem-rewards` | 🔵 protected | unknown | - | Requires authenticated session; redirects to /login otherwise |
| `/me/referral` | 🔵 protected | unknown | - | Requires authenticated session; redirects to /login otherwise |
| `/me/referrals` | 🔵 protected | unknown | - | Requires authenticated session; redirects to /login otherwise |
| `/me/reviews` | 🔵 protected | unknown | - | Requires authenticated session; redirects to /login otherwise |
| `/me/rewards` | 🔵 protected | unknown | - | Requires authenticated session; redirects to /login otherwise |
| `/me/saved-cards` | 🔵 protected | unknown | - | Requires authenticated session; redirects to /login otherwise |
| `/me/saved-carts` | 🔵 protected | unknown | - | Requires authenticated session; redirects to /login otherwise |
| `/me/social` | 🔵 protected | unknown | - | Requires authenticated session; redirects to /login otherwise |
| `/me/spending-insights` | 🔵 protected | unknown | - | Requires authenticated session; redirects to /login otherwise |
| `/me/tenant-view` | 🔵 protected | unknown | → /property-hub | Redirects to /property-hub |
| `/me/tenants` | 🔵 protected | unknown | - | Requires authenticated session; redirects to /login otherwise |
| `/me/wishlist` | 🔵 protected | unknown | - | Requires authenticated session; redirects to /login otherwise |
| `/notifications` | 🔵 protected | unknown | - | Requires authenticated session; redirects to /login otherwise |
| `/permissions` | 🔵 protected | unknown | - | Requires authenticated session; redirects to /login otherwise |
| `/profile/:userId` | 🟣 pro | unknown | → /me | Redirects to /me |
| `/settings` | 🔵 protected | unknown | → /me | Redirects to /me |
| `/settings/account` | 🔵 protected | unknown | - | Requires authenticated session; redirects to /login otherwise |
| `/settings/addresses` | 🔵 protected | unknown | - | Requires authenticated session; redirects to /login otherwise |
| `/settings/business` | 🔵 protected | unknown | - | Requires authenticated session; redirects to /login otherwise |
| `/settings/marketing` | 🔵 protected | unknown | → /wallet | Redirects to /wallet |
| `/settings/notification-preferences` | 🔵 protected | unknown | → /settings/notifications | Redirects to /settings/notifications |
| `/settings/notifications` | 🔵 protected | unknown | - | Requires authenticated session; redirects to /login otherwise |
| `/settings/orbit` | 🔵 protected | unknown | - | Requires authenticated session; redirects to /login otherwise |
| `/settings/payment-methods` | 🔵 protected | unknown | → /wallet | Redirects to /wallet |
| `/settings/preferences` | 🔵 protected | unknown | - | Requires authenticated session; redirects to /login otherwise |
| `/settings/privacy` | 🔵 protected | unknown | - | Requires authenticated session; redirects to /login otherwise |
| `/settings/security` | 🔵 protected | unknown | - | Requires authenticated session; redirects to /login otherwise |
| `/settings/subscription` | 🔵 protected | unknown | - | Requires authenticated session; redirects to /login otherwise |
| `/settings/support` | 🔵 protected | unknown | - | Requires authenticated session; redirects to /login otherwise |
| `/settings/wallet` | 🔵 protected | unknown | - | Requires authenticated session; redirects to /login otherwise |
| `/support/tickets` | 🔵 protected | unknown | - | Requires authenticated session; redirects to /login otherwise |
| `/support/tickets/:ticketId` | 🔵 protected | unknown | - | Requires authenticated session; redirects to /login otherwise |
| `/team/command-center` | 🔵 protected | unknown | - | Requires authenticated session; redirects to /login otherwise |
| `/team/permissions` | 🔵 protected | unknown | → /me | Redirects to /me |

## Merchant Routes

| Path | Auth Level | Component | Redirect | Notes |
|---|---|---|---|---|
| `/merchant/analytics/:merchantId` | 🟠 merchant | unknown | - | Requires merchant session |
| `/merchant/auto-accept/:merchantId` | 🟠 merchant | unknown | - | Requires merchant session |
| `/merchant/banner-editor/:merchantId` | 🟠 merchant | unknown | - | Requires merchant session |
| `/merchant/business-hours/:merchantId` | 🟠 merchant | unknown | - | Requires merchant session |
| `/merchant/business-summary/:merchantId` | 🟠 merchant | unknown | - | Requires merchant session |
| `/merchant/claim` | 🟠 merchant | unknown | - | Requires merchant session |
| `/merchant/closing-mode/:merchantId` | 🟠 merchant | unknown | - | Requires merchant session |
| `/merchant/coupons/:merchantId` | 🟠 merchant | unknown | - | Requires merchant session |
| `/merchant/customer-insights/:merchantId` | 🟠 merchant | unknown | - | Requires merchant session |
| `/merchant/customers/:merchantId` | 🟠 merchant | unknown | - | Requires merchant session |
| `/merchant/daily-sales/:merchantId` | 🟠 merchant | unknown | - | Requires merchant session |
| `/merchant/dashboard` | 🟠 merchant | unknown | - | Requires merchant session |
| `/merchant/dashboard/:merchantId` | 🟠 merchant | unknown | - | Requires merchant session |
| `/merchant/delivery-zones/:merchantId` | 🟠 merchant | unknown | - | Requires merchant session |
| `/merchant/finance` | 🟠 merchant | unknown | - | Requires merchant session |
| `/merchant/inventory-alerts/:merchantId` | 🟠 merchant | unknown | - | Requires merchant session |
| `/merchant/inventory/:merchantId` | 🟠 merchant | unknown | - | Requires merchant session |
| `/merchant/kitchen` | 🟠 merchant | unknown | - | Requires merchant session |
| `/merchant/kitchen-display/:merchantId` | 🟠 merchant | unknown | - | Requires merchant session |
| `/merchant/live/:merchantId` | 🟠 merchant | unknown | - | Requires merchant session |
| `/merchant/menu` | 🟠 merchant | unknown | - | Requires merchant session |
| `/merchant/menu-bulk/:merchantId` | 🟠 merchant | unknown | - | Requires merchant session |
| `/merchant/menu-categories/:merchantId` | 🟠 merchant | unknown | - | Requires merchant session |
| `/merchant/menu/:merchantId` | 🟠 merchant | unknown | - | Requires merchant session |
| `/merchant/menu/edit/:itemId` | 🟠 merchant | unknown | - | Requires merchant session |
| `/merchant/onboarding` | 🟠 merchant | unknown | - | Requires merchant session |
| `/merchant/orders` | 🟠 merchant | unknown | - | Requires merchant session |
| `/merchant/orders/:merchantId` | 🟠 merchant | unknown | - | Requires merchant session |
| `/merchant/pos` | 🟠 merchant | unknown | - | Requires merchant session |
| `/merchant/product-performance/:merchantId` | 🟠 merchant | unknown | - | Requires merchant session |
| `/merchant/promos/:merchantId` | 🟠 merchant | unknown | - | Requires merchant session |
| `/merchant/qr/:shopId` | 🟠 merchant | unknown | - | Requires merchant session |
| `/merchant/refund-requests/:merchantId` | 🟠 merchant | unknown | - | Requires merchant session |
| `/merchant/returns` | 🟠 merchant | unknown | - | Requires merchant session |
| `/merchant/reviews/:merchantId` | 🟠 merchant | unknown | - | Requires merchant session |
| `/merchant/staff-access/:merchantId` | 🟠 merchant | unknown | - | Requires merchant session |
| `/merchant/store-settings/:merchantId` | 🟠 merchant | unknown | - | Requires merchant session |

## Onboarding Routes

| Path | Auth Level | Component | Redirect | Notes |
|---|---|---|---|---|
| `/onboarding/consumer` | 🔵 protected | unknown | - | Requires authenticated session; redirects to /login otherwise |
| `/onboarding/hotel` | 🔵 protected | unknown | - | Requires authenticated session; redirects to /login otherwise |
| `/onboarding/service-provider` | 🔵 protected | unknown | - | Requires authenticated session; redirects to /login otherwise |
| `/onboarding/taxi` | 🔵 protected | unknown | - | Requires authenticated session; redirects to /login otherwise |

## Orbit Routes

| Path | Auth Level | Component | Redirect | Notes |
|---|---|---|---|---|
| `/orbit` | 🔵 protected | unknown | - | Requires authenticated session; redirects to /login otherwise |
| `/orbit/:conversationId` | 🔵 protected | unknown | - | Requires authenticated session; redirects to /login otherwise |
| `/orbit/add` | 🔵 protected | unknown | - | Requires authenticated session; redirects to /login otherwise |
| `/orbit/contacts` | 🔵 protected | unknown | - | Requires authenticated session; redirects to /login otherwise |
| `/orbit/identity` | 🔵 protected | unknown | - | Requires authenticated session; redirects to /login otherwise |
| `/orbit/support` | 🔵 protected | unknown | - | Requires authenticated session; redirects to /login otherwise |

## Pro Routes

| Path | Auth Level | Component | Redirect | Notes |
|---|---|---|---|---|
| `/pro` | 🟣 pro | unknown | - | Requires pro session |
| `analytics` | 🟢 public | unknown | - | Renders without auth |
| `availability` | 🟢 public | unknown | - | Renders without auth |
| `catalog` | 🟢 public | unknown | - | Renders without auth |
| `compliance` | 🟢 public | unknown | - | Renders without auth |
| `inbox` | 🟢 public | unknown | - | Renders without auth |
| `media` | 🔵 protected | unknown | - | Requires authenticated session; redirects to /login otherwise |
| `monitor` | 🟢 public | unknown | - | Renders without auth |
| `onboarding` | 🔵 protected | unknown | - | Requires authenticated session; redirects to /login otherwise |
| `orders` | 🟢 public | unknown | - | Renders without auth |
| `pricing` | 🟢 public | unknown | - | Renders without auth |
| `profile` | 🔵 protected | unknown | - | Requires authenticated session; redirects to /login otherwise |
| `reviews` | 🟢 public | unknown | - | Renders without auth |
| `settings` | 🟢 public | unknown | - | Renders without auth |
| `team` | 🟢 public | unknown | - | Renders without auth |
| `wallet` | 🟢 public | unknown | - | Renders without auth |

## Atomic Acceptance Criteria

For every route in this inventory:

- [ ] Direct navigation loads without black screen
- [ ] Hard refresh returns 200 (not CF 404)
- [ ] body.scrollHeight > 0
- [ ] Splash disappears within 8 seconds
- [ ] `window.__EASYLOCS_REACT_MOUNTED__ === true` (when applicable)
- [ ] No uncaught JS exception in console
- [ ] No failed JS/CSS asset requests
- [ ] No CSP violation
- [ ] Protected routes redirect to /login when unauthenticated
- [ ] Admin routes redirect or show 403 for non-admins
- [ ] No infinite spinner
- [ ] No unrendered error boundary
