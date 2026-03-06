
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

## Détails Sprint 7

### Auto-génération quittances
- [x] Trigger `trg_auto_generate_receipt` : insère automatiquement un document `rent-receipt` quand un `rent_call` est marqué payé
- [x] Données JSON incluses : mois, montants, locataire, propriété, date de paiement

### Developer Portal
- [x] Table `api_keys` avec RLS (org owners uniquement)
- [x] Fonction `create_api_key` (security definer) — génère `el_xxx` + stocke hash MD5
- [x] Page `/dashboard/developers` : gestion clés, documentation endpoints, exemples code (cURL, JS, Python)
- [x] 10 endpoints REST documentés

### White-label Branding
- [x] Colonnes `brand_name`, `brand_primary_color`, `brand_accent_color`, `brand_favicon_url`, `custom_domain` sur `orgs`
- [x] Section branding dans Settings avec color picker et aperçu live

### DB Triggers actifs (8 total)
1. `trg_notify_booking_request` → booking_requests INSERT
2. `trg_notify_booking_created` → seasonal_bookings INSERT
3. `trg_notify_lease_created` → leases INSERT
4. `trg_notify_intervention_created` → interventions INSERT
5. `trg_notify_payment_received` → rent_calls UPDATE
6. `trg_notify_inventory_completed` → inventory_reports UPDATE
7. `trg_auto_generate_receipt` → rent_calls UPDATE (auto-quittance)

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

## Prochaines priorités
1. MFA/2FA authentication
2. Webhooks sortants (events → URL client)
3. Rapports PDF automatiques mensuels
4. Mobile app stores (Capacitor build)
5. Multi-currency conversion automatique
