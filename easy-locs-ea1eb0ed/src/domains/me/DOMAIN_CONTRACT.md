# Domain Contract — Identity (Me)

## Owner
Platform Identity Team

## Purpose
The Identity domain (surfaced as the `me` domain) owns authentication, user account lifecycle, profile settings, KYC/verification, permissions, and team membership. It is the root of all user context in the platform — every other domain receives a resolved `userId` from this domain.

## Canonical Invariants
- **One user record per authenticated identity**. Multiple auth providers (email, Google, phone) map to the same `userId`.
- **The `me` service layer is the only writer** to `users`, `profiles`, and `permissions` tables. No other domain may write to these tables.
- **Role assignments** are managed through `PermissionCenter` — not by ad-hoc flag mutations.
- **Session state is ephemeral** — stored in Supabase Auth, not in the application database.

## Public Interface
| Method | Direction | Description |
|---|---|---|
| `getCurrentUser` | Read | Returns the currently signed-in user record |
| `getProfile` | Read | Returns the user's profile (display name, avatar, etc.) |
| `updateProfile` | Write | Updates mutable profile fields |
| `requestKyc` | Write | Initiates KYC verification flow |
| `setRole` | Write | Admin-only: assigns a platform role to a user |
| `deactivateAccount` | Write | Soft-deletes a user account |

## Domain Events (to be formalised)
- `identity.user_registered`
- `identity.profile_updated`
- `identity.kyc_verified`
- `identity.role_assigned`
- `identity.account_deactivated`

## Anti-Corruption Layer
- Supabase Auth JWTs are decoded and normalised into platform `User` types at the auth boundary (`AuthProvider`).
- Third-party OAuth tokens (Google, Apple) are never stored — only the resolved `userId`.
- Identity must not import from Wallet, Orbit, Marketplace, or Commerce domains directly.

## UI Rule
- Profile display is read-only.
- Profile edits route through `me/service.ts`.
- No `.tsx` file may call `supabase.auth` directly — all auth interactions go through `AuthProvider` and the `me` service.

## Data Ownership
Tables: `users`, `profiles`, `user_roles`, `kyc_records`, `team_members` — owned exclusively by this domain.
Auth state: managed by Supabase Auth (external).
