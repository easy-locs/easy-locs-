# 03 — Canonical Data Model

> Step-1 deliverable for Task #1075. One schema per entity. No shadow tables,
> no parallel identity / wallet / message stores. All field types are logical
> (Postgres equivalents shown in parentheses where relevant).

## Cardinal rules

1. **One canonical row per real-world entity.** Duplicates are reconciled via
   merge, never tolerated.
2. **Every entity has a stable `id` (UUID v4).** Surrogate keys only.
3. **Every entity has `created_at`, `updated_at` (timestamptz).** Mutations
   bump `updated_at` via trigger.
4. **Soft delete only via `deleted_at` (timestamptz, nullable).** No hard
   deletes from UI / services.
5. **All FKs reference canonical IDs.** No string joins on names/emails.
6. **RLS enforced on every table.** No bypass keys in client code.

---

## Entities

### `user_profile` (canonical identity)

The single source of truth for a person on the platform. Replaces every
parallel "users", "members", "accounts" table.

| Field | Type | Notes |
|-------|------|-------|
| `id` | uuid (PK) | canonical user id |
| `auth_user_id` | uuid (FK → auth.users) | unique, nullable for guests |
| `email` | text | unique when not null, lowercased |
| `phone_e164` | text | unique when not null |
| `display_name` | text | |
| `avatar_url` | text | |
| `locale` | text | BCP-47 |
| `roles` | text[] | e.g. `['user']`, `['merchant']`, `['super_admin']` |
| `merged_into_id` | uuid (FK → user_profile.id) | non-null on losing duplicate |
| `created_at` / `updated_at` / `deleted_at` | timestamptz | |

**Invariants:** `email`, `phone_e164`, and `auth_user_id` are unique across
the table when not null. Any read that lands on a row with `merged_into_id`
follows the link to the surviving canonical row.

### `wallet` (one per canonical user)

| Field | Type | Notes |
|-------|------|-------|
| `id` | uuid (PK) | |
| `user_id` | uuid (FK → user_profile.id) | unique |
| `default_currency` | text | ISO-4217, default `EUR` |
| `status` | enum (`active`, `frozen`, `closed`) | |
| `created_at` / `updated_at` | timestamptz | |

### `wallet_balance` (per currency)

| Field | Type | Notes |
|-------|------|-------|
| `wallet_id` | uuid (FK → wallet.id) | |
| `currency` | text | ISO-4217 |
| `available` | bigint | minor units |
| `pending` | bigint | minor units |
| `updated_at` | timestamptz | |

PK: `(wallet_id, currency)`.

### `wallet_transaction` (append-only ledger)

| Field | Type | Notes |
|-------|------|-------|
| `id` | uuid (PK) | |
| `wallet_id` | uuid (FK → wallet.id) | |
| `kind` | enum (`credit`, `debit`, `hold`, `release`, `refund`) | |
| `amount` | bigint | minor units, always positive |
| `currency` | text | ISO-4217 |
| `reference_type` | text | e.g. `order`, `payout`, `topup` |
| `reference_id` | uuid | |
| `idempotency_key` | text | unique per `(wallet_id, idempotency_key)` |
| `created_at` | timestamptz | |

**Invariants:** append-only; no updates, no deletes. The wallet service is
the only writer.

### `merchant` (single source for any business)

| Field | Type | Notes |
|-------|------|-------|
| `id` | uuid (PK) | |
| `owner_user_id` | uuid (FK → user_profile.id) | |
| `wallet_id` | uuid (FK → wallet.id) | unique |
| `name` | text | |
| `vertical` | enum (`food`, `taxi`, `services`, `retail`, `other`) | |
| `status` | enum (`provisioning`, `active`, `suspended`, `closed`) | |
| `categories` | text[] | |
| `location` | geography(Point,4326) | nullable |
| `address` | jsonb | normalized fields |
| `hours` | jsonb | structured open/close per weekday |
| `contact` | jsonb | phones, emails, urls |
| `source` | jsonb | ingestion provenance |
| `created_at` / `updated_at` / `deleted_at` | timestamptz | |

### `merchant_asset` (photos, menus, services)

| Field | Type | Notes |
|-------|------|-------|
| `id` | uuid (PK) | |
| `merchant_id` | uuid (FK → merchant.id) | |
| `kind` | enum (`photo`, `menu_item`, `service`, `document`) | |
| `payload` | jsonb | shape varies by `kind` |
| `is_real_data` | boolean | `false` only when no real data was available |
| `source_url` | text | nullable |
| `created_at` / `updated_at` | timestamptz | |

### `order` (single lifecycle, all verticals)

| Field | Type | Notes |
|-------|------|-------|
| `id` | uuid (PK) | |
| `user_id` | uuid (FK → user_profile.id) | |
| `merchant_id` | uuid (FK → merchant.id) | |
| `vertical` | enum | mirrors merchant.vertical at creation |
| `status` | enum (`draft`, `placed`, `accepted`, `in_progress`, `delivered`, `cancelled`, `refunded`) | |
| `currency` | text | |
| `total` | bigint | minor units |
| `payment_id` | uuid (FK → payment.id) | nullable |
| `meta` | jsonb | vertical-specific structured data |
| `created_at` / `updated_at` | timestamptz | |

### `order_event` (append-only state log)

| `id` | uuid (PK) |
| `order_id` | uuid (FK → order.id) |
| `from_status` / `to_status` | enum |
| `actor_user_id` | uuid (FK → user_profile.id) |
| `payload` | jsonb |
| `created_at` | timestamptz |

### `orbit_channel` (canonical comms channel)

| Field | Type | Notes |
|-------|------|-------|
| `id` | uuid (PK) | |
| `kind` | enum (`user_merchant`, `user_rider`, `user_support`, `internal`) | |
| `subject_type` | text | e.g. `order`, `merchant`, `support_ticket` |
| `subject_id` | uuid | |
| `created_at` / `updated_at` | timestamptz | |

### `orbit_participant`

| `channel_id` | uuid (FK → orbit_channel.id) |
| `user_id` | uuid (FK → user_profile.id) |
| `role` | enum (`owner`, `member`, `agent`) |
| `joined_at` | timestamptz |

PK: `(channel_id, user_id)`.

### `orbit_message`

| `id` | uuid (PK) |
| `channel_id` | uuid (FK → orbit_channel.id) |
| `author_user_id` | uuid (FK → user_profile.id) |
| `kind` | enum (`text`, `system`, `attachment`) |
| `body` | text |
| `attachments` | jsonb |
| `created_at` | timestamptz |

### `payment`

| `id` | uuid (PK) |
| `user_id` | uuid (FK → user_profile.id) |
| `wallet_id` | uuid (FK → wallet.id) |
| `provider` | text |
| `provider_ref` | text |
| `amount` | bigint |
| `currency` | text |
| `status` | enum (`pending`, `succeeded`, `failed`, `refunded`) |
| `is_sandbox` | boolean | always `true` during load tests |
| `created_at` / `updated_at` | timestamptz |

### `notification`

| `id` | uuid (PK) |
| `user_id` | uuid (FK → user_profile.id) |
| `kind` | text |
| `payload` | jsonb |
| `read_at` | timestamptz, nullable |
| `created_at` | timestamptz |

### `runtime_issue` (output of analysis engine, Phase 6)

| `id` | uuid (PK) |
| `severity` | enum (`CRITICAL`, `HIGH`, `MEDIUM`, `LOW`) |
| `route` | text |
| `module` | text |
| `profile` | text | one of the eight Playwright profiles |
| `repro_steps` | jsonb |
| `console_logs` | jsonb |
| `network_logs` | jsonb |
| `root_cause` | text |
| `proposed_fix` | text |
| `recurrence_risk` | enum (`low`, `medium`, `high`) |
| `classification` | enum (`ux`, `navigation`, `state`, `realtime`, `auth`, `performance`, `data_integrity`) |
| `status` | enum (`open`, `proposed`, `awaiting_approval`, `applied`, `retested_pass`, `retested_fail`, `dismissed`) |
| `created_at` / `updated_at` | timestamptz |

### `improvement_run` (Phase 7 loop)

| `id` | uuid (PK) |
| `triggered_by` | text |
| `started_at` / `finished_at` | timestamptz |
| `result` | jsonb | issues detected, fixes proposed/applied, retest status |
| `approved_by_user_id` | uuid (FK → user_profile.id), nullable |

---

## Reconciliation rules (Phase 1 + Phase 3)

- **Identity merge:** when two `user_profile` rows are detected as the same
  person (matching `auth_user_id`, or matching email + phone), the older row
  becomes the canonical row. The newer row's `merged_into_id` points at the
  canonical. All FKs are repointed at write time and resolved at read time.
- **Wallet merge:** balances and transactions move to the canonical wallet
  inside a single transaction; the losing wallet is closed.
- **Orbit merge:** participants are updated to the canonical user; messages
  keep their original `author_user_id` for audit, but reads resolve via the
  identity service.

## Forbidden patterns (binding)

- No table named `users` outside `auth.users`.
- No table whose only purpose is "v2" of a canonical entity above.
- No nullable FK that silently means "anonymous"; use `guest_user_profile`
  rows instead so identity is always resolvable.
- No raw SQL from UI components — only typed services.
