# Mondikat Super-App Roadmap — P0 → P3

## Vue d'Ensemble

Ce roadmap structure l'implémentation des 7 piliers stratégiques identifiés dans l'analyse comparative WeChat/Grab/Mondikat. Les phases sont ordonnées par priorité (Impact × Faisabilité) avec les dépendances inter-piliers et les prérequis techniques.

---

## Diagramme de Dépendances

```
P0: Loyalty & Gamification ──────────────────────────┐
         │                                            │
         ▼                                            ▼
P0: Travel Completion ───► P1: FinTech Layer    P1: Creator Economy
         │                       │                    │
         ▼                       ▼                    ▼
    P2: Cross-Border ◄──── P2: Mini Apps Platform ────┘
                                 │
                                 ▼
                          P3: Enterprise/B2B
```

**Légende :**
- Loyalty est la fondation — les points universels sont consommés par tous les piliers
- Travel fournit les cas d'usage pour l'assurance (FinTech) et le cross-sell
- Mini Apps Platform est le multiplicateur qui amplifie tous les piliers précédents
- Enterprise/B2B est le capstone qui exploite l'ensemble de l'écosystème

---

## Phase P0 — Fondations Immédiates (Mois 1-6)

### P0.1 — Loyalty & Gamification Engine

**Objectif :** Créer le système de rétention cross-pilier qui sera la colonne vertébrale de l'engagement.

**Prérequis techniques identifiés :**
- Wallet existant (Stripe intégré) — pour le cashback et la gestion des points
- Trust Engine existant (`src/lib/trust-engine/`) — comme base pour les niveaux utilisateur
- Cross-app reactions (`src/lib/shared/cross-app-reactions.ts`) — pour les notifications de progression
- Platform Bus (`src/lib/platform-bus/index.ts`) — pour la propagation d'événements entre domaines

**Composants à implémenter :**

| Composant | Description | Dépendance |
|---|---|---|
| Points Engine | Calcul et attribution des points cross-piliers | Wallet, Platform Bus |
| Tier System | 5 niveaux (Bronze → Diamond) avec avantages | Trust Engine, Points Engine |
| Challenge System | Défis quotidiens/hebdomadaires avec récompenses | Points Engine |
| Cashback Engine | Cashback dynamique basé sur le comportement | Wallet, Tier System |
| Referral Multiplier | Bonus de parrainage avec multiplicateur par niveau | Points Engine, Tier System |
| Loyalty Dashboard | UI de suivi progression, badges, historique | Tous les composants ci-dessus |

**Livrables :**
- Service de points avec API interne
- Système de niveaux avec calcul automatique
- Dashboard utilisateur dans le profil
- Intégration avec les domaines existants (food, ride, property)

**Risques :**
- Équilibrage économique des points (inflation/déflation)
- Performance du calcul en temps réel sur Platform Bus

---

### P0.2 — Travel & Mobility Completion

**Objectif :** Activer les UI existantes avec des données réelles pour générer des revenus directs.

**Prérequis techniques identifiés :**
- Pages universe existantes (`src/pages/universe/`) — UI stub à connecter
- Module Registry (`src/lib/core/module-registry.ts`) — pour l'enregistrement des modules travel
- Wallet — pour le paiement intégré des réservations

**Composants à implémenter :**

| Composant | Description | Dépendance |
|---|---|---|
| GDS Integration | Connexion Amadeus/Sabre pour vols temps réel | API keys, Module Registry |
| Hotel Booking Engine | Agrégateur hôtelier (Booking.com/Expedia API) | API keys, Wallet |
| Car Rental Service | Connexion aux flottes locales | Module Registry |
| Multi-modal Transport | Train/bus/ferry par région | Partenariats locaux |
| Package Builder | Vol + hôtel + activités combinés | Tous les composants travel |
| Travel Loyalty Integration | Points sur chaque réservation | P0.1 Points Engine |

**Livrables :**
- Recherche et réservation de vols fonctionnelle
- Booking hôtelier avec disponibilité temps réel
- Location de voiture opérationnelle
- Intégration Loyalty sur chaque transaction travel

**Risques :**
- Coûts des API GDS (volume minimum requis)
- Compliance PCI-DSS pour les paiements travel
- Latence des API tierces (caching nécessaire)

---

## Phase P1 — Network Effects (Mois 4-12)

*Début chevauchant P0 pour les travaux préparatoires*

### P1.1 — Creator Economy & Social Commerce

**Objectif :** Transformer le contenu en moteur d'engagement et de revenus.

**Prérequis techniques identifiés :**
- Stories infrastructure (`src/lib/stories/story-types.ts`) — base pour le contenu monétisé
- Explore feed (`src/domains/explore/ExploreScreen.tsx`) — surface de découverte existante
- Merchant claim service (`src/lib/merchant/claim-service.ts`) — base pour Official Accounts
- Wallet — pour les tips, paiements en live, commissions affiliate

**Dépendances inter-piliers :**
- **P0.1 Loyalty** — les créateurs gagnent des points, les acheteurs aussi
- **P0.2 Travel** — travel content comme verticale créateur (guides de voyage achetables)

**Composants à implémenter :**

| Composant | Description | Dépendance |
|---|---|---|
| Story Monetization | Tips, sponsored content sur les Stories | Stories types, Wallet |
| Official Accounts | Comptes vérifiés avec analytics | Merchant claim service |
| Live Shopping | Stream + panier + paiement temps réel | Stories, Wallet |
| Affiliate System | Tracking et commissions sur les ventes | Marketplace, Wallet |
| UGC Commerce | Collections/guides achetables par les utilisateurs | Explore feed, Marketplace |
| Creator Dashboard | Analytics, revenus, audience | Tous les composants ci-dessus |

**Livrables :**
- Système de tips sur Stories
- Programme Official Accounts avec onboarding
- Live shopping MVP (stream + 1-click buy)
- Système d'affiliation fonctionnel
- Dashboard créateur avec analytics de base

**Risques :**
- Modération du contenu à grande échelle
- Fraude sur les tips et commissions
- Cold start problem (attirer les premiers créateurs)

---

### P1.2 — FinTech Layer

**Objectif :** Ajouter les services financiers qui créent le lock-in et les revenus récurrents.

**Prérequis techniques identifiés :**
- Wallet existant — comme fondation pour tous les produits fintech
- Trust Engine — pour le scoring de crédit interne
- KYC/AML — à implémenter ou renforcer selon les juridictions

**Dépendances inter-piliers :**
- **P0.1 Loyalty** — le niveau de fidélité influence les taux de prêt et les offres d'assurance
- **P0.2 Travel** — assurance voyage comme premier produit d'assurance
- **P1.1 Creator** — BNPL pour les achats social commerce

**Composants à implémenter :**

| Composant | Description | Dépendance |
|---|---|---|
| Credit Scoring | Score interne basé sur Trust Engine + historique wallet | Trust Engine, Wallet |
| Micro-Loans Engine | Prêts contextuels avec offres personnalisées | Credit Scoring, Wallet |
| Insurance Service | Assurance voyage, location, livraison | Partenaires assureurs, Travel |
| Savings Goals | Épargne programmée avec objectifs visuels | Wallet |
| BNPL Engine | Buy Now Pay Later pour le marketplace | Credit Scoring, Marketplace |
| FinTech Compliance | KYC/AML renforcé, reporting réglementaire | Juridique par pays |

**Livrables :**
- Scoring de crédit interne opérationnel
- Micro-prêts MVP dans 2-3 marchés pilotes
- Assurance voyage intégrée au flow de réservation
- Épargne programmée dans le wallet
- BNPL disponible sur le marketplace

**Risques :**
- **Régulation** — licences bancaires requises par juridiction (risque majeur)
- Taux de défaut sur les micro-prêts
- Partenariats assureurs à négocier par marché
- Coût de compliance KYC/AML

---

## Phase P2 — Expansion de Plateforme (Mois 9-18)

*Début chevauchant P1 pour les travaux réglementaires et techniques*

### P2.1 — Cross-Border Payment Network

**Objectif :** Devenir le réseau de transfert international le moins cher et le plus sécurisé.

**Prérequis techniques identifiés :**
- Wallet multi-devise (extension du wallet existant)
- Platform Bus — pour le routing des transactions cross-border
- E2EE — pour la confidentialité des métadonnées de transfert

**Dépendances inter-piliers :**
- **P0.1 Loyalty** — points sur les transferts internationaux
- **P1.2 FinTech** — compliance KYC/AML partagée, infrastructure de scoring
- **Forex planifié (Task #61)** — taux de change en temps réel

**Composants à implémenter :**

| Composant | Description | Dépendance |
|---|---|---|
| Corridor Engine | Routage intelligent des transferts par corridor | Wallet, partenaires locaux |
| FX Rate Service | Taux de change temps réel avec marge transparente | API Forex, Wallet |
| Local Payment Rails | Intégration M-Pesa, UPI, PIX, SEPA | Partenariats par région |
| Multi-Currency Wallet | Poches par devise avec conversion instantanée | Wallet existant |
| Remittance Flow | UX optimisée pour les transferts récurrents | Corridor Engine, Wallet |
| Compliance Gateway | KYC/AML cross-border, sanctions screening | FinTech compliance |

**Livrables :**
- 5 corridors majeurs actifs (ex: Afrique→Europe, SEA→Moyen-Orient)
- Wallet multi-devise fonctionnel
- Frais < 3% sur tous les corridors
- Flow de remittance récurrente

**Risques :**
- **Licensing** — money transmitter licenses par pays (12-18 mois d'obtention)
- Volatilité des taux de change (risque de marge)
- Sanctions compliance (OFAC, EU sanctions lists)
- Partenariats avec les rails de paiement locaux

---

### P2.2 — Mini Apps Platform

**Objectif :** Ouvrir Mondikat aux développeurs tiers pour créer un effet de plateforme exponentiel.

**Prérequis techniques identifiés :**
- Platform Bus (`src/lib/platform-bus/index.ts`) — backbone pour la communication Mini App ↔ Mondikat
- Module Registry (`src/lib/core/module-registry.ts`) — pour l'enregistrement dynamique des Mini Apps
- Trust Engine — pour le système de review et de confiance des Mini Apps

**Dépendances inter-piliers :**
- **P0.1 Loyalty** — les Mini Apps peuvent émettre/consommer des points
- **P1.1 Creator** — les créateurs peuvent publier des Mini Apps
- **P1.2 FinTech** — paiement intégré dans les Mini Apps via le Wallet

**Composants à implémenter :**

| Composant | Description | Dépendance |
|---|---|---|
| Mini App Runtime | Sandbox d'exécution sécurisée (WebView ou WASM) | Platform Bus |
| Developer SDK | Kit de développement avec APIs Mondikat | Module Registry, documentation |
| App Marketplace | Store de Mini Apps avec search et catégories | Trust Engine (reviews) |
| Review & Trust System | Vérification automatique + review humaine | Trust Engine |
| Revenue Sharing Engine | Partage de revenus développeur/Mondikat | Wallet |
| Developer Portal | Dashboard développeur, analytics, documentation | SDK, Marketplace |

**Livrables :**
- Runtime Mini App sécurisé et performant
- SDK v1 avec documentation complète
- Marketplace avec 50+ Mini Apps au lancement
- Portal développeur avec analytics
- Système de revenue sharing opérationnel

**Risques :**
- Sécurité du runtime (sandboxing, data isolation)
- Cold start problem (attirer les premiers développeurs)
- Qualité des Mini Apps tierces
- Performance (impact sur l'app principale)

---

## Phase P3 — Capstone (Mois 15-24)

### P3.1 — Enterprise / B2B Suite

**Objectif :** Capturer le marché B2B avec une suite intégrée privacy-first.

**Prérequis techniques identifiés :**
- Orbit messaging — base pour la communication d'entreprise
- E2EE — différenciateur majeur vs WeCom (pas de E2EE)
- Wallet — pour la facturation B2B
- Module Registry — pour les modules business

**Dépendances inter-piliers :**
- **P0.1 Loyalty** — programme corporate pour les entreprises
- **P1.2 FinTech** — facturation, comptabilité, prêts entreprise
- **P2.2 Mini Apps** — les entreprises peuvent créer des Mini Apps internes
- **P2.1 Cross-Border** — paiements B2B internationaux

**Composants à implémenter :**

| Composant | Description | Dépendance |
|---|---|---|
| Business Orbit Space | Communication d'entreprise E2EE séparée | Orbit messaging |
| Team Management | Planning, tâches, approbations | Business Orbit |
| Merchant CRM | Historique client, analytics vente | Orbit conversations, Wallet |
| B2B Invoicing | Facturation et comptabilité via Wallet | Wallet, FinTech |
| Webhook APIs | Intégration ERP/CRM tiers (Salesforce, SAP) | Platform Bus |
| Admin Console | Gestion des accès, rôles, permissions | Business Orbit |

**Livrables :**
- Espace Business Orbit fonctionnel
- Outils de gestion d'équipe basiques
- CRM intégré pour les marchands
- Facturation B2B via Wallet
- 3+ intégrations ERP/CRM

**Risques :**
- Cycle de vente B2B long (6-12 mois)
- Attentes élevées en termes de SLA et support
- Compétition avec des solutions B2B établies (Slack, Teams, Salesforce)
- Complexité des intégrations ERP

---

## Synergies Cross-Piliers

Le tableau ci-dessous montre comment chaque pilier renforce les autres :

| | Loyalty | Travel | Creator | FinTech | Cross-Border | Mini Apps | B2B |
|---|---|---|---|---|---|---|---|
| **Loyalty** | — | Points/réservation | Points/contenu | Taux préférentiels | Points/transfert | Points/Mini App | Programme corporate |
| **Travel** | Fidélisation voyageurs | — | Guides voyage | Assurance voyage | Paiement multi-devise | Mini Apps voyage | Travel corporate |
| **Creator** | Créateurs fidèles | Travel content | — | BNPL achats | Créateurs internationaux | Créateurs = développeurs | Brand accounts |
| **FinTech** | Taux par niveau | Assurance | BNPL social | — | Forex/remittance | Paiement in-app | Facturation |
| **Cross-Border** | Points transfert | Réservations internationales | Audience mondiale | Infrastructure partagée | — | Mini Apps locales | Paiements B2B |
| **Mini Apps** | Émission points | Apps voyage | Distribution | APIs paiement | Apps par corridor | — | Apps internes |
| **B2B** | Fidélité corporate | Travel d'affaires | Marketing B2B | Facturation | International B2B | Apps métier | — |

---

## Timeline Consolidée

```
Mois   1  2  3  4  5  6  7  8  9  10 11 12 13 14 15 16 17 18 19 20 21 22 23 24
       ├──────────────────────┤
       P0.1 Loyalty & Gamification
       ├─────────────────────────────┤
       P0.2 Travel Completion
                  ├──────────────────────────────┤
                  P1.1 Creator Economy
                  ├───────────────────────────────────────┤
                  P1.2 FinTech Layer
                              ├───────────────────────────────────────┤
                              P2.1 Cross-Border Payments
                              ├───────────────────────────────────────┤
                              P2.2 Mini Apps Platform
                                                   ├─────────────────────────┤
                                                   P3.1 Enterprise/B2B
```

---

## Prérequis Techniques Transversaux

Ces éléments du codebase existant sont des fondations partagées par plusieurs piliers :

| Composant Existant | Utilisé par | Action requise |
|---|---|---|
| Platform Bus (`src/lib/platform-bus/`) | Loyalty, Mini Apps, B2B | Étendre pour supporter les événements des nouveaux piliers |
| Trust Engine (`src/lib/trust-engine/`) | Loyalty, FinTech, Mini Apps | Enrichir avec scoring financier et reviews Mini Apps |
| Module Registry (`src/lib/core/module-registry.ts`) | Travel, Mini Apps, B2B | Adapter pour l'enregistrement dynamique de modules tiers |
| Wallet / Stripe | Tous les piliers | Étendre multi-devise, ajouter cashback, BNPL |
| Stories infrastructure (`src/lib/stories/`) | Creator Economy, Live Shopping | Ajouter monétisation, live streaming |
| Explore feed (`src/domains/explore/`) | Creator Economy, Mini Apps | Intégrer contenu créateur et Mini Apps |
| Merchant claim service | Creator (Official Accounts) | Étendre pour les comptes créateurs non-marchands |
| Cross-app reactions | Loyalty (notifications) | Étendre pour les événements de progression |
| Orbit messaging | B2B (Business space) | Créer un mode "Business" séparé |
| Pages universe (`src/pages/universe/`) | Travel | Connecter aux APIs réelles (GDS, hôtels) |

---

## KPIs Globaux de Succès

| Métrique | Cible 12 mois | Cible 24 mois |
|---|---|---|
| DAU / MAU ratio | > 40% | > 55% |
| Services utilisés par user | 2.5 | 4+ |
| Rétention M3 | 45% | 60% |
| Revenus par utilisateur (ARPU) | $8/mois | $15/mois |
| NPS global | > 35 | > 50 |
| Créateurs actifs | 10 000 | 100 000 |
| Mini Apps disponibles | — | 1 000+ |
| Corridors cross-border | — | 20+ |
| Entreprises B2B | — | 500+ |
