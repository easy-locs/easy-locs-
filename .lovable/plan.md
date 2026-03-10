
# Easy-Locs — Roadmap structurée avec suivi

## PHASE 1 — Stabilisation critique
| Tâche | Statut | Pages affectées | Corrections |
|-------|--------|-----------------|-------------|
| Fix communication system | ✅ Terminé | CommunicationCenter, DashboardLayout, NotificationBell, App.tsx | Sidebar nav → /dashboard/communication, NotifBell link fix, Messages redirect sans CountryGuard, Realtime activé, colonnes messages ajoutées |
| Fix in-app notifications | ✅ Terminé | NotificationBell.tsx | Lien corrigé vers /dashboard/communication, cross-portal routing OK |
| Fix rent reminders | ✅ Terminé | Reminders.tsx | Table `reminders` et `rent_calls` vérifiées dans le schéma |
| Verify message delivery & DB storage | ✅ Terminé | CommunicationCenter.tsx | Insert typé, colonnes attachment_url/message_type/property_id/delivered/conversation_status ajoutées via migration |
| Remove legacy UI components | ✅ Terminé | Messages.tsx, App.tsx | Messages.tsx = redirect, route sans CountryGuard |
| Fix layout inconsistencies | ✅ Terminé | DashboardLayout.tsx | Nav sections cohérentes, mobile sidebar OK |
| Verify mobile responsiveness | ✅ Terminé | DashboardLayout | Sidebar responsive, chat mobile back button |
| Verify payment link flow | ✅ Terminé | create-concierge-payment | Edge function validée, Stripe Connect flow intact |

## PHASE 2 — Centre de communication centralisé
| Tâche | Statut |
|-------|--------|
| Messages liés à landlord/tenant/property/lease/booking/payment/document | ✅ Terminé |
| Statuts sent/delivered/read | ✅ Terminé (colonnes en place) |
| Historique d'activité par entité (timeline agrégée) | ✅ Terminé |
| Notifications liées | ✅ Terminé |
| Filtre par propriété dans le centre de communication | ✅ Terminé |

## PHASE 3 — Conciergerie / Activités & Services
| Tâche | Statut |
|-------|--------|
| Photos multiples par service | ✅ Terminé (photo_urls jsonb) |
| Description, date, heure, guests | ✅ Terminé |
| Statut de service | ✅ Terminé (concierge_orders.status) |
| Paiement Stripe | ✅ Terminé (edge function) |
| Virement bancaire | ✅ Terminé (bank_details, payment_method) |
| Génération facture | ✅ Terminé (ConciergeInvoiceAdapter + InvoicePdfGenerator) |
| Communication client liée au booking | ✅ Terminé (BookingCommunicationThread intégré dans BookingDetailDrawer) |

## PHASE 4 — Documents de réservation
| Tâche | Statut |
|-------|--------|
| Upload passeport/ID/visa/documents par booking | ✅ Terminé (BookingDocumentsPanel partagé) |
| Documents attachés à la réservation | ✅ Terminé (booking_requests + concierge_orders) |
| Recherche dans les documents | ✅ Terminé (recherche intégrée dans le panel) |

## PHASE 5 — Géolocalisation et adresse intelligente
| Tâche | Statut |
|-------|--------|
| Détection pays/ville/langue/devise | ✅ Terminé (useGeoDetect) |
| Autocomplétion adresse mondiale | ✅ Terminé (AddressAutocomplete) |
| Rue/code postal/ville/pays/GPS | ✅ Terminé |

## PHASE 6 — Séparation stricte par pays
| Tâche | Statut |
|-------|--------|
| Devise/documents/langue/workflows/logique juridique par pays | ✅ Terminé (country-profile, country-config) |
| Dashboard global = résumés portefeuille uniquement | ✅ Terminé (CountryGuard) |

## PHASE 7 — Homepage et vitrine
| Tâche | Statut |
|-------|--------|
| Homepage complète | ✅ Terminé (Hero, Features, DashboardPreview, etc.) |
| Vitrine locations/conciergerie | ✅ Terminé (PublicListing, ConciergeShowcase) |
| Liens publics de partage | ✅ Terminé (booking slugs) |
| Partage WhatsApp/Email | ✅ Terminé (ShareButtons composant réutilisable) |

## PHASE 8 — Système de design unifié
| Tâche | Statut |
|-------|--------|
| Tokens sémantiques CSS | ✅ Terminé (index.css) |
| Composants shadcn/ui standardisés | ✅ Terminé |
| Espacement/layout mobile cohérent | ✅ Terminé |
| Audit visuel complet | ✅ Terminé (tokens sémantiques vérifiés, pas de couleurs hardcodées) |
