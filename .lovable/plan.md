
# Plan Easy-Locs — Roadmap complète

## 1. Traductions complètes (6 langues) ✅
## 2. Emails de notification ✅
## 3. Notifications in-app ✅
## 4. Wizard multi-pays documents ✅
## 5. Channel Manager OTA ✅
## 6. Comptabilité Pro ✅
## 7. Tarification Dynamique ✅
## 8. Service Marketplace ✅
## 9. Multi-tenant Collaboration ✅
## 10. Developer Portal / API ✅
## 11. White-label Branding ✅
## 12. Auto-génération quittances ✅
## 13. Webhooks sortants ✅
## 14. SSO Google + Apple (re-configuré) ✅

## Détails Sprint 8

### Webhooks sortants
- [x] Tables `webhooks` + `webhook_deliveries` avec RLS
- [x] Edge function `dispatch-webhook` — dispatch HMAC-SHA256 signé avec logs de livraison
- [x] UI Webhooks intégrée au Developer Portal (création, activation, logs)
- [x] 7 types d'événements supportés (payment, lease, tenant, intervention, booking, document, inventory)

### DB Triggers restaurés (7 total)
1. `trg_notify_booking_request` → booking_requests INSERT
2. `trg_notify_booking_created` → seasonal_bookings INSERT
3. `trg_notify_lease_created` → leases INSERT
4. `trg_notify_intervention_created` → interventions INSERT
5. `trg_notify_payment_received` → rent_calls UPDATE
6. `trg_notify_inventory_completed` → inventory_reports UPDATE
7. `trg_auto_generate_receipt` → rent_calls UPDATE (auto-quittance)

### Sécurité
- [x] Politique deny-all sur `internal_config` (service role only)
- [x] Social auth Google + Apple re-configuré via Lovable Cloud

## Infrastructure complétée
- [x] SSO Google + Apple
- [x] Système de parrainage
- [x] Pages SEO multi-pays
- [x] Dashboard admin SaaS
- [x] PWA + Capacitor
- [x] Système dual-rôle
- [x] Stripe Connect + SEPA
- [x] Suite de tests (54+)
- [x] Code-splitting (47+ pages)
- [x] OTA SELECT RLS corrigée
- [x] Webhooks sortants avec HMAC signing

## Prochaines priorités
1. MFA/2FA authentication
2. Rapports PDF automatiques mensuels
3. Mobile app stores (Capacitor build)
4. Multi-currency conversion automatique
