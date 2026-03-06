
# Plan Easy-Locs — 4 chantiers majeurs

## 1. Traductions complètes (6 langues : FR, EN, ES, DE, IT, PT)

### État actuel
- i18n.tsx : ~900+ clés traduites (toutes pages principales)
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
- [x] Tenant portal (7 pages incl. reviews)
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
- [x] Dashboard admin SaaS **avec analytics avancés (retention, churn, conversion trial→paid)**
- [x] Sitemap + robots.txt + JSON-LD
- [x] Newsletter + lead capture
- [x] Widget d'embed annonces
- [x] Google Analytics avec tracking événements
- [x] CSP headers
- [x] Pagination réutilisable
- [x] Code-splitting React.lazy (40+ pages)
- [x] Suite de tests de régression (54+ tests)
- [x] **PWA avec service worker** (vite-plugin-pwa, manifest, page /install)
- [x] **Système dual-rôle bailleur/locataire** avec switcher dans la sidebar
- [x] **Système de reviews/avis locataires** (table reviews, page tenant, réponses bailleur)
- [x] **Capacitor config** pour native iOS + Android
- [x] **Stripe webhook avancé** (payment_intent.succeeded pour SEPA/récurrents)

## Correctifs appliqués
- [x] Photos publiques : fonction `get_listing_property` (security definer) pour contourner RLS
- [x] Flux de réservation : demande → approbation bailleur → envoi lien paiement → paiement → confirmé
- [x] Stripe Connect : ouverture dans nouvel onglet
- [x] Google/Apple OAuth : flux validé via @lovable.dev/cloud-auth-js
- [x] **Panel demandes de réservation** : liste complète avec actions approuver/refuser (bug nesting fix)
- [x] **allRequests panel** : maintenant toujours visible indépendamment de focusedRequest

## Prochaines priorités
1. ~~Capacitor build natif (iOS + Android) — config prête, instructions user~~ ✅
2. Channel manager OTA (Airbnb, Booking.com API)
3. Paiements SEPA récurrents automatiques
4. Dashboard analytics avancés (heatmap, cohortes)

## Derniers ajouts
- [x] Route `/tenant/requests` (demandes de documents locataire)
- [x] Triggers DB recréés (booking_request, lease_created, intervention_created, payment_received, inventory_completed, booking_created)
- [x] Edge function `export-ical` pour export iCal des réservations
- [x] Navigation locataire complétée (requests + reviews)
- [x] **Admin Dashboard Revenue tab** : KPIs (total revenue, rent collected, booking revenue, MoM growth), graphique revenus 6 mois, breakdown loyers vs réservations
- [x] **User type badges** dans la liste Recent Signups (landlord/tenant)
