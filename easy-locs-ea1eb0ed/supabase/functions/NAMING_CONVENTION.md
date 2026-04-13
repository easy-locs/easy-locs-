# Edge Function Naming Convention

## Rule
All edge functions MUST be prefixed with the owning domain or integration layer.

```
<domain>-<action>[-<noun>]
```

### Approved Domain Prefixes

| Prefix | Domain | Examples |
|---|---|---|
| `wallet-` | Wallet & payments | `wallet-transfer`, `wallet-pin`, `wallet-ops` |
| `orbit-` | Social & identity | `orbit-payment` |
| `rent-` | Property / rent lifecycle | `rent-payment`, `rent-lifecycle-cron`, `rent-reminders` |
| `booking-` | Marketplace bookings | `booking-create`, `booking-approve`, `booking-lifecycle` |
| `food-` | Food & restaurant vertical | `food-publish`, `food-normalizer`, `food-audit` |
| `admin-` | Back-office admin | `admin-payout-approve`, `admin-payout-reject` |
| `ai-` | AI / ML services | `ai-assistant`, `ai-entity-enrichment`, `ai-shopping-chat` |
| `send-` | Notification dispatch | `send-email`, `send-otp`, `send-push` |
| `stripe-` | Stripe integration | `stripe-webhook` |
| `deliveroo-` | Deliveroo integration | `deliveroo-dubai-food` |
| `refund-` | Refund flows | `refund-process-booking`, `refund-request-booking` |

## Compliant Functions (already named correctly)

```
admin-payout-approve       admin-payout-reject
ai-assistant               ai-entity-enrichment       ai-shopping-chat
booking-approve            booking-complete            booking-create
booking-lifecycle          booking-reject
deliveroo-dubai-food
food-audit                 food-menu-builder           food-normalizer
food-publish               food-rescrape-monitor       food-visibility-gate
food-visual-clean
orbit-payment
refund-process-booking     refund-request-booking
rent-lifecycle-cron        rent-payment                rent-reminders
send-email                 send-notification-email     send-otp
send-push
stripe-webhook
wallet-ops                 wallet-pin                  wallet-transfer
```

## Non-Compliant Functions (pending migration)

The functions below predate this policy. They MUST be migrated to the naming
convention in the next governance sprint. No new functions may use generic names.

| Current Name | Target Name | Domain | Priority |
|---|---|---|---|
| `check-connect-status` | `stripe-check-connect-status` | stripe | medium |
| `check-subscription` | `wallet-check-subscription` | wallet | medium |
| `cleanup-expired-media` | `media-cleanup-expired` | infra | low |
| `cleanup-expired-messages` | `orbit-cleanup-expired-messages` | orbit | low |
| `collect-sepa-rents` | `rent-collect-sepa` | rent | high |
| `commission-split` | `wallet-commission-split` | wallet | high |
| `create-booking-payment` | `booking-create-payment` | booking | high |
| `create-checkout` | `commerce-create-checkout` | commerce | medium |
| `create-checkout-session` | `commerce-create-checkout-session` | commerce | medium |
| `create-concierge-payment` | `booking-create-concierge-payment` | booking | medium |
| `create-connect-account` | `stripe-create-connect-account` | stripe | medium |
| `create-guest-checkout` | `commerce-create-guest-checkout` | commerce | medium |
| `create-legal-notice-payment` | `rent-create-legal-notice-payment` | rent | medium |
| `create-listing-checkout` | `marketplace-create-listing-checkout` | marketplace | medium |
| `create-storefront-checkout` | `marketplace-create-storefront-checkout` | marketplace | medium |
| `create-stripe-intent` | `stripe-create-intent` | stripe | medium |
| `create-wallet-topup` | `wallet-create-topup` | wallet | high |
| `customer-portal` | `stripe-customer-portal` | stripe | medium |
| `deep-scrape-build` | `food-deep-scrape-build` | food | low |
| `disconnect-stripe` | `stripe-disconnect` | stripe | medium |
| `dispatch-delivery` | `logistics-dispatch-delivery` | logistics | medium |
| `dispatch-ride` | `logistics-dispatch-ride` | logistics | medium |
| `dispatch-webhook` | `logistics-dispatch-webhook` | logistics | medium |
| `email-enqueue` | `send-email-enqueue` | send | medium |
| `email-queue-process` | `send-email-queue-process` | send | medium |
| `engine-cron-server` | `infra-engine-cron-server` | infra | low |
| `expire-listings` | `marketplace-expire-listings` | marketplace | medium |
| `export-ical` | `booking-export-ical` | booking | low |
| `fx-rates` | `wallet-fx-rates` | wallet | medium |
| `generate-cv` | `me-generate-cv` | identity | low |
| `generate-pdf` | `infra-generate-pdf` | infra | low |
| `generate-rent-receipt` | `rent-generate-receipt` | rent | high |
| `generate-seo` | `seo-generate` | seo | low |
| `get-turn-credentials` | `webrtc-get-turn-credentials` | infra | low |
| `health-check` | `infra-health-check` | infra | low |
| `lease-workflow` | `rent-lease-workflow` | rent | high |
| `master-runtime-qa-engine` | `infra-runtime-qa` | infra | low |
| `notify-booking` | `booking-notify` | booking | medium |
| `ops-ai-chat` | `admin-ops-ai-chat` | admin | medium |
| `order-manage` | `commerce-order-manage` | commerce | high |
| `payment-notification` | `wallet-payment-notification` | wallet | medium |
| `payout-request-create` | `wallet-payout-request-create` | wallet | high |
| `pipeline-worker` | `infra-pipeline-worker` | infra | low |
| `platform-recovery` | `infra-platform-recovery` | infra | low |
| `process-refund` | `wallet-process-refund` | wallet | high |
| `public-api` | `infra-public-api` | infra | low |
| `purchase-locs` | `wallet-purchase-locs` | wallet | high |
| `qr-payment-session` | `wallet-qr-payment-session` | wallet | medium |
| `receive-email` | `send-receive-email` | send | low |
| `reveal-contact` | `orbit-reveal-contact` | orbit | medium |
| `run-engine-cron` | `infra-run-engine-cron` | infra | low |
| `run-ingestion-pipeline` | `food-run-ingestion-pipeline` | food | low |
| `run-scheduled-audit` | `infra-run-scheduled-audit` | infra | low |
| `shop-import-processor` | `marketplace-shop-import-processor` | marketplace | medium |
| `sync-ical` | `booking-sync-ical` | booking | low |
| `tenant-signup` | `rent-tenant-signup` | rent | high |
| `translate-message` | `orbit-translate-message` | orbit | low |
| `uae-scrape-onboard` | `marketplace-uae-scrape-onboard` | marketplace | low |
| `verify-guest-payment` | `commerce-verify-guest-payment` | commerce | medium |
| `auto-onboarding-cron` | `admin-auto-onboarding-cron` | admin | low |
| `auto-source-scrape` | `food-auto-source-scrape` | food | low |
| `browser-user-repair-engine` | `infra-browser-user-repair` | infra | low |
| `repair-worker` | `infra-repair-worker` | infra | low |

## Enforcement

- **New functions**: MUST use the naming convention or the PR will be blocked.
- **Existing non-compliant functions**: Scheduled for migration; HIGH priority items
  must be renamed before the next major release.
- **Migration steps**: Rename directory + update all callers in src/ + update any
  edge-to-edge function calls + update this document.
