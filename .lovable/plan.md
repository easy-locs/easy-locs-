
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

---

## PHASE 9 — Smart Deal Room (PLANNED — NOT YET IMPLEMENTED)

### Overview
Transform conversation threads linked to listings/services into transaction workspaces where users negotiate, send offers, track payment, and close deals — all within the chat UI.

### Status Lifecycle
```
inquiry → negotiation → offer_sent → accepted → payment_pending → confirmed → completed → cancelled/expired
```

### Database Schema: `deals` table
| Column | Type | Description |
|--------|------|-------------|
| id | uuid PK | |
| thread_id | uuid FK → conversation_threads | Links deal to chat thread |
| context_id | text | Same context_id as the thread |
| org_id | uuid FK → orgs | Provider's org |
| buyer_id | uuid | User making the purchase |
| seller_id | uuid | User selling/providing |
| listing_id | uuid? | Optional link to listing/service |
| listing_type | text | `real_estate_listing` / `marketplace_service` / `concierge_service` / `public_listing` |
| status | text | Current deal status (see lifecycle) |
| offer_amount | numeric | Current offer price |
| currency | text | e.g. EUR, USD, AED |
| counter_offers | jsonb[] | History: `[{amount, by, at, note}]` |
| payment_link_url | text? | Stripe/bank payment link |
| payment_status | text | `pending` / `paid` / `refunded` |
| documents | jsonb[] | `[{name, url, uploaded_by, at}]` |
| notes | text? | Internal notes |
| accepted_at / paid_at / completed_at | timestamptz? | |
| created_at / updated_at | timestamptz | |

### UI Components
1. **DealRoomPanel** — Right sidebar/drawer in chat: status stepper, offer form, payment link, document upload, action buttons
2. **DealStatusBubble** — Inline system messages: "Offer sent: €250,000", "Offer accepted"
3. **DealContextHeader** — Top bar in chat: listing thumbnail, price, status badge, quick actions

### Integration Points
- Deal events logged as `message_type: "deal_event"` system messages
- Uses existing `dispatchSyncEvent` for notifications
- Stripe payment link reused from concierge/marketplace infra

### Deal Flow (Confirmed)
```
Conversation → Offer → Counter offer → Accepted → Payment → Confirmed
```

### Implementation Phases
| Phase | Scope | Status |
|-------|-------|--------|
| 9a | Schema + DealStatusBubble + "Start Deal" button (MVP) | ✅ Done |
| 9b | Negotiation flow: counter-offer history, offer expiration, documents & visits | ✅ Done |
| 9c | Payment integration (Stripe link generation + tracking) | ✅ Done |
| 9d | Analytics & deal conversion metrics | 📋 Planned |

## PASS56 — Orbit Communication Hardening (Block A)
| Issue | Fix | Status |
|-------|-----|--------|
| platformBus.emit("orbit:message_sent") never called | Added to text send, file upload, voice send, location share, forward, bulk delete | ✅ Fixed |
| useUnreadMessages subscribed to ALL messages globally (noisy) | Scoped to org_id + event types (INSERT/UPDATE only) + platform bus listener | ✅ Fixed |
| Forward flow missing platform bus emission | Added platformBus.emit after successful forward insert | ✅ Fixed |
| Bulk delete (for me / for all) missing platform bus emission | Added to MessageMultiSelect handlers | ✅ Fixed |
| useThreadActions missing platform bus import | Added platformBus import and orgId from auth | ✅ Fixed |
| Cross-module unread badge refresh slow | Added platformBus.on("orbit:message_sent") with 500ms debounce in useUnreadMessages | ✅ Fixed |

| Issue | Fix | Status |
|-------|-----|--------|
| channel.subscribe() not awaited — signals sent before channel ready | Await subscribe with SUBSCRIBED callback + timeout | ✅ Fixed |
| ICE candidates received before remoteDescription set → addIceCandidate fails | Queue pending candidates, flush after setRemoteDescription | ✅ Fixed |
| audio.play() blocked on Safari — no sound | Handle play() promise, retry on user gesture (touch/click) | ✅ Fixed |
| _startTime never reset between calls → wrong elapsed timer | Reset in cleanup() | ✅ Fixed |
| Relay retry creates new PC but doesn't re-negotiate with peer | Send new offer after relay-only PC creation | ✅ Fixed |
| Double cleanup crash on repeated endCall() | Added _cleaned guard flag | ✅ Fixed |
| InAppCallDialog state not reset between calls | Added useEffect reset on open | ✅ Fixed |
| Missing i18n keys (common.property, nav.explore) | Fallbacks already in place, non-breaking | ⚠️ Cosmetic |
| Audit log cascade failure (network) | Monitoring errors are fire-and-forget, non-blocking | ⚠️ Cosmetic |

### Key Design Decisions
- Deals live inside threads — the thread IS the deal room
- One active deal per thread
- Reuses existing Stripe, notification, and media infrastructure
- Progressive disclosure — deal panel only appears when active

## PASS57 — Orbit Communities / Channels / Broadcast (Block B)
| Feature | Implementation | Status |
|---------|---------------|--------|
| group_type column (group/channel/community) | Migration: `groups.group_type text default 'group'` | ✅ Done |
| posting_permission column | Migration: `groups.posting_permission text default 'everyone'` | ✅ Done |
| Pinned messages | Migration: `group_messages.is_pinned`, `pinned_at`, `pinned_by` | ✅ Done |
| Channel creation with auto admins_only | Create dialog with type selector, channels default to admins_only | ✅ Done |
| Community creation | Create dialog supports community type | ✅ Done |
| Viewer role support | Members can be assigned viewer role — cannot post | ✅ Done |
| Admin role management | Admins can change member roles (admin/member/viewer) inline | ✅ Done |
| Broadcast mode toggle | Admins can toggle posting_permission at runtime | ✅ Done |
| Pinned messages bar | Collapsible pinned bar at top of chat, pin/unpin on hover | ✅ Done |
| Type badges in list | Icons + labels for channel/community in group list | ✅ Done |
| Broadcast indicator | Megaphone icon in header and list for admins_only spaces | ✅ Done |
| Posting restriction enforcement | Non-admins see "Only admins can post" message in broadcast mode | ✅ Done |
| Viewer posting block | Viewers see "View only" message, cannot compose | ✅ Done |
| Realtime messages | Preserved existing postgres_changes subscription | ✅ Done |
| 44px min touch targets | Back button, send button sized for mobile | ✅ Done |

## PASS58 — Wallet / Payments Hardening (Block D)
| Feature | Implementation | Status |
|---------|---------------|--------|
| platformBus emit on requestMoney | Added `wallet:payment_requested` event after insert | ✅ Done |
| New bus event type registered | Added `wallet:payment_requested` to PlatformEventType union | ✅ Done |
| Scoped realtime subscriptions | Channel per user_id, INSERT on wallet_transactions, UPDATE on wallet_balances | ✅ Done |
| Debounced realtime refresh | 500ms debounce on realtime wallet reload to prevent cascading | ✅ Done |
| Platform bus listener for cross-module refresh | Listens to `wallet:transfer_sent` with 600ms debounce | ✅ Done |
| sendMoney RPC pass-through enhanced | Added qrNonce, referenceType, referenceId params | ✅ Done |
| Manual refresh exposed | `refresh` alias added to useWallet, exposed to WalletHub | ✅ Done |
| Balance card refresh button | Added refresh button with loading spinner on WalletBalanceCard | ✅ Done |
| Bank connection section | Added bank connection card with backend-routed messaging on WalletHub home | ✅ Done |
| FX preview cleanup | Removed unused first supabase.functions.invoke call in getConversionPreview | ✅ Done |

## PASS59 — Smart Deal Engine 9c: Payment Integration (Block F)
| Feature | Implementation | Status |
|---------|---------------|--------|
| deal_checkout action | Edge function action generates Stripe Checkout for accepted deals | ✅ Done |
| deal_verify_payment action | Edge function verifies Stripe session payment status | ✅ Done |
| Stripe Connect routing | Payment routed to org's Stripe account if connected | ✅ Done |
| 3DS enforcement | request_three_d_secure: "any" on deal checkout sessions | ✅ Done |
| Pay Now button (buyer) | DealRoomPanel shows CreditCard Pay Now for accepted/payment_pending deals | ✅ Done |
| Verify Payment button (seller) | Org members can manually verify payment status | ✅ Done |
| Payment link display | External link shown in actions when payment_link_url exists | ✅ Done |
| Auto-verify on return | useEffect detects ?payment=success&deal=X and auto-verifies | ✅ Done |
| Deal status lifecycle | accepted → payment_pending → confirmed via Stripe | ✅ Done |
| Payment events in timeline | stripe_checkout_created, payment_confirmed events rendered | ✅ Done |
| Audit trail | deal_payment_checkout_created logged to audit_logs | ✅ Done |

## PASS60 — Security / Ghost Mode Hardening (Block C)
| Feature | Implementation | Status |
|---------|---------------|--------|
| Ghost mode session state | `isGhostModeActive()` / `activateGhostMode()` / `deactivateGhostMode()` in app-security.ts | ✅ Done |
| Ghost presence suppression | usePresence reports "offline" when ghost active — invisible on radar | ✅ Done |
| Ghost heartbeat bypass | Heartbeat interval skipped entirely in ghost mode | ✅ Done |
| Ghost financial masking | useGhostMask hook — masks amounts, names, sensitive data with "••••••" | ✅ Done |
| WalletBalanceCard masking | Balance, purchased, spent, frozen all masked with Ghost indicator | ✅ Done |
| Secure media cleanup edge fn | cleanup-expired-media: deletes storage files for expired/view-once messages | ✅ Done |
| Expired message row cleanup | Calls existing cleanup_expired_messages() RPC | ✅ Done |
| Nonce cleanup | Calls cleanup_expired_nonces() RPC for anti-replay hygiene | ✅ Done |
| Cleanup audit trail | Logs cleanup results (messages, files, nonces deleted) to audit_logs | ✅ Done |
| Existing security verified | App Lock, PIN (main/ghost/panic), auto-lock, view-once, disappearing messages, anti-screenshot blur — all functional | ✅ Verified |

## PASS61 — Wallet Payments Hardening v2 (Block D)
| Feature | Implementation | Status |
|---------|---------------|--------|
| Daily transfer limits | wallet-limits.ts: 5K default / 20K verified / 100K premium, client-side enforcement in sendMoney | ✅ Done |
| Large transaction warning | OrbitSmartPayment: confirm dialog for transfers ≥ 500 LOCS before PIN gate | ✅ Done |
| Today's spent tracking | useWallet: todaySpent memo from transactions, exposed to components | ✅ Done |
| Transaction CSV export | wallet-export.ts: exportTransactionsCSV with BOM for Excel compat | ✅ Done |
| Transaction receipt generator | wallet-export.ts: printable receipt with reference code, FX details | ✅ Done |
| Wallet security dashboard | WalletSecurityPanel: PIN status, atomic transfer status, daily limit progress bar, export button | ✅ Done |
| WalletHub settings upgraded | Settings view replaced with full WalletSecurityPanel | ✅ Done |

## PASS55 Block E — Seller / Video / Live
| Feature | Implementation | Status |
|---------|---------------|--------|
| Seller Dashboard panel | SellerDashboardPanel: stats grid, quick actions, live indicator | ✅ Done |
| Video showcase component | VideoShowcase: YouTube/Vimeo embed + direct mp4/webm, play overlay | ✅ Done |
| video_url column | Migration: marketplace_services.video_url text | ✅ Done |
| Live status columns | Migration: marketplace_providers.is_live bool + live_since timestamptz | ✅ Done |
| LiveBadge component | Pulsing red LIVE badge, sm/md sizes | ✅ Done |
| Storefront live badge | LiveBadge integrated in ProviderStorefront hero header | ✅ Done |
| ServiceCard video indicator | Play badge on service cards with video_url | ✅ Done |

## PASS55 Block 9d — Deal Analytics
| Feature | Implementation | Status |
|---------|---------------|--------|
| useDealAnalytics hook | Aggregates deal_rooms: funnel, conversion rate, avg value, avg close time, revenue | ✅ Done |
| DealAnalyticsDashboard | KPI cards, revenue summary, animated funnel bars, recent deals list | ✅ Done |
| DealAnalyticsPage | /dashboard/deals route with DashboardLayout wrapper | ✅ Done |
| Sidebar nav entry | BarChart3 "Deal Analytics" under Orbit section | ✅ Done |

## PASS55 Block G — Radar / Service Tracking
| Feature | Implementation | Status |
|---------|---------------|--------|
| tracking_sessions table | DB migration: status lifecycle, GPS coords, ETA, destination, context, RLS, realtime | ✅ Done |
| tracking_positions table | Position history with speed, heading, accuracy for replay/audit | ✅ Done |
| useServiceTracking hook | useTrackingObserver (realtime sub), useTrackingStreamer (GPS watchPosition + auto-status), useOrgTrackingSessions | ✅ Done |
| ServiceTrackingMap | Leaflet dark map: tracker pulse marker, destination pin, dashed route line, auto-fit bounds | ✅ Done |
| TrackingStatusBar | 5-step stepper (pending→completed), ETA badge, distance info, action buttons (Démarrer/Arrivé/Terminer) | ✅ Done |
| TrackingDashboard | Org-wide active sessions list with expandable map+status detail panels | ✅ Done |
| ServiceTrackingPage | /dashboard/tracking route with DashboardLayout wrapper | ✅ Done |
| Sidebar nav entry | Compass "Live Tracking" under Orbit section | ✅ Done |
| Auto-nearby detection | 300m threshold auto-transitions en_route→nearby | ✅ Done |
| Platform bus integration | tracking:position_updated event emitted on position stream | ✅ Done |
