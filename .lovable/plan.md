
# Plan Easy-Locs — 4 chantiers majeurs

## 1. Traductions complètes (6 langues : FR, EN, ES, DE, IT, PT)

### État actuel
- i18n.tsx : ~800+ clés traduites (toutes pages principales)
- **Toutes les pages dashboard utilisent des clés i18n**

### Pages migrées vers i18n
- [x] Onboarding
- [x] Dashboard.tsx
- [x] Receipts.tsx, Reminders.tsx, Documents.tsx, AIAssistant.tsx
- [x] Leases.tsx, Company.tsx, Billing.tsx, Settings.tsx
- [x] Tenants.tsx (redirect), RentalManagement.tsx, Finances.tsx
- [x] Interventions.tsx, Tasks.tsx, Messages.tsx
- [x] ChargesRegularization.tsx, FiscalReport.tsx, Expenses.tsx
- [x] Candidates.tsx, SeasonalRentals.tsx, PaymentNotices.tsx
- [x] DunningLetters.tsx, FurnitureInventory.tsx, Buildings.tsx, Vault.tsx
- [x] DataImport.tsx
- [x] Tenant portal (6 pages)
- [x] Landing + Auth pages
- [x] DashboardLayout sidebar

## 2. Emails de notification ✅
- [x] Edge function `send-notification-email` avec templates multilingues (8 événements)
- [x] Templates brandés Easy-Locs® avec interpolation dynamique
- [x] Événements : new_tenant, rent_due, payment_received, receipt_ready, lease_signed, intervention, booking_request, dunning
- [x] 6 langues supportées (FR, EN, ES, DE, IT, PT)
- [x] Audit logging automatique
- [x] Mode dry-run si pas de clé SendGrid

## 3. Notifications in-app ✅
- [x] Triggers DB pour leases (lease_created)
- [x] Triggers DB pour interventions (intervention_created)
- [x] Triggers DB pour booking_requests (booking_request)
- [x] Triggers DB pour rent_calls (payment_received)
- [x] Triggers DB pour inventory_reports (inventory_completed)
- [x] Fonctions notify_event, notify_payment_received, notify_inventory_completed

## 4. Wizard multi-pays documents
- [x] Templates juridiques par pays (30+ pays)
- [x] DocumentBuilder avec formulaires dynamiques
- [x] Validation juridique par template
- [x] Pré-remplissage depuis locataires existants

## Infrastructure complétée
- [x] SSO Google + Apple
- [x] Système de parrainage avec trigger PostgreSQL
- [x] Pages SEO multi-pays
- [x] Profils publics bailleurs (/landlord/:slug)
- [x] Dashboard admin SaaS
- [x] Sitemap + robots.txt + JSON-LD
- [x] Newsletter + lead capture
- [x] Widget d'embed annonces
- [x] Google Analytics avec tracking événements
- [x] CSP headers
- [x] Pagination réutilisable
- [x] Code-splitting React.lazy (40+ pages)
- [x] Suite de tests de régression (54+ tests)

## Prochaines priorités
1. Capacitor native mobile (iOS + Android)
2. PWA avec service worker
3. Webhooks Stripe avancés (paiements récurrents)
4. Dashboard analytics avancé (rétention, churn)
