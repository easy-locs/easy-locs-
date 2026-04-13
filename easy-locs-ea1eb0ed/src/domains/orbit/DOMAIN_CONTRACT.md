# Domain Contract — Orbit

## Owner
Orbit / Social Graph Team

## Purpose
Orbit is the user-activity and social-presence layer: it tracks feeds, follows, live presence, location streams, stories, voice notes, and the canonical user profile enrichment that sits above the raw auth identity. Orbit does **not** own authentication — it owns the enriched profile and the social graph around it.

## Canonical Invariants
- **One canonical profile per user** — `CanonicalOrbitProfile` (see `src/stores/orbit-profile.internal.ts`). All reads go through `src/repositories/orbit-profile.repository`.
- **No second identity store**. Components must not maintain their own orbit profile state; they must subscribe to the `orbit-profile.repository` store.
- **Location data is ephemeral** — stored for at most 24 hours in the realtime layer, not in the primary database.

## Public Interface (ports)
See `ports.ts`. Key ports:
| Port | Direction | Description |
|---|---|---|
| `getOrbitProfile` | Read | Returns `CanonicalOrbitProfile` for a given userId |
| `updatePresence` | Write | Updates live presence (online/busy/away) |
| `followUser` | Write | Creates a follow edge in the social graph |
| `unfollowUser` | Write | Removes a follow edge |
| `streamLocation` | Write | Publishes ephemeral location ping |
| `getFeed` | Read | Returns paginated Orbit feed for a user |

## Domain Events (events.ts)
- `orbit.profile_updated`
- `orbit.user_followed`
- `orbit.user_unfollowed`
- `orbit.location_updated`
- `orbit.presence_changed`

## Guards & Flow Gate
`flow-gate/` and `guards/` enforce that Orbit actions require an authenticated session and that profile mutations are owner-only.

## Anti-Corruption Layer
- `adapters/` normalise Supabase realtime payloads and third-party social data before entering domain models.
- Orbit must not import from Wallet, Commerce, or Marketplace directly.

## UI Rule
- Profile display components are read-only — no direct Supabase calls from `.tsx` files.
- Presence and location updates are routed through `orbit/service.ts`.

## Data Ownership
Tables: `orbit_profiles`, `orbit_follows`, `orbit_feed_items` — owned exclusively by this domain.
Realtime channel: `orbit-presence-{userId}`.
