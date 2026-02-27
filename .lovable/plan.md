
# Plan Easy-Locs — 4 chantiers majeurs

## 1. Traductions complètes (6 langues : FR, EN, ES, DE, IT, PT)

### État actuel
- i18n.tsx : ~400 clés déjà traduites (onboarding + pages)
- **Problème** : Les pages utilisent encore du texte français en dur au lieu des clés i18n

### Pages à migrer vers i18n
- [x] Onboarding
- [ ] Dashboard.tsx
- [ ] Receipts.tsx, Reminders.tsx, Documents.tsx, AIAssistant.tsx
- [ ] Leases.tsx, Company.tsx, Billing.tsx, Settings.tsx
- [ ] Tenants.tsx, RentalManagement.tsx, Finances.tsx
- [ ] Interventions.tsx, Tasks.tsx, Notes.tsx, Messages.tsx
- [ ] ChargesRegularization.tsx, FiscalReport.tsx, Expenses.tsx
- [ ] Candidates.tsx, SeasonalRentals.tsx, PaymentNotices.tsx
- [ ] DunningLetters.tsx, FurnitureInventory.tsx, Buildings.tsx, Vault.tsx
- [ ] DataImport.tsx
- [ ] Tenant portal (6 pages)
- [ ] Landing + Auth pages
- [ ] DashboardLayout sidebar

## 2. Emails de notification (type Rentila)
- Nouveau locataire, bail signé, appel de loyer, relance, quittance, messages, rappels
- Service email requis (SendGrid/Resend)
- Edge function + templates brandés

## 3. Notifications in-app améliorées
- Triggers DB pour tous les événements
- Table notifications déjà en place

## 4. Wizard multi-pays documents
- Wizard étape par étape par type de document
- Templates juridiques par pays
- Tous les pays du système

## Ordre d'exécution
1. Sprint 1 : Migrer pages vers i18n
2. Sprint 2 : Service email + notifications
3. Sprint 3 : Triggers notifications in-app
4. Sprint 4 : Wizard multi-pays
