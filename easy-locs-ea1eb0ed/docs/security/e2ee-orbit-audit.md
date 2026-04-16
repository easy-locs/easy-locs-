# Orbit E2EE — Audit

Audit of the end-to-end encryption stack backing Orbit messaging.

## Files in scope

| File | Responsibility |
| --- | --- |
| `src/lib/orbit-crypto.ts` | ECDH / AES-GCM / HKDF primitives (P-521) |
| `src/lib/orbit-double-ratchet.ts` | Signal-style DH + symmetric ratchet (P-256) |
| `src/lib/orbit-x3dh.ts` | X3DH preKey bundles (IK / SPK / OPK) |
| `src/lib/orbit-keystore.ts` | IndexedDB private-key store |
| `src/lib/orbit-session-manager.ts` | Per-conversation session lifecycle |
| `src/lib/orbit-file-encryption.ts` | AES-GCM chunked file encryption |
| `src/lib/e2ee/x3dh-prekey.ts` | Publishing / fetching prekey bundles |
| `src/lib/e2ee/message-e2ee.ts` | High-level encrypt / decrypt API |

## Primitive review

| Primitive | Value | Verdict |
| --- | --- | --- |
| Key agreement | ECDH P-521 (identity) · ECDH P-256 (ratchet) | OK — P-521 strongest NIST curve for identity; P-256 acceptable for ratchet. |
| AEAD | AES-256-GCM | OK — 96-bit random IV, 128-bit tag. |
| KDF | HKDF-SHA-512 with domain-separated `info` strings | OK. |
| RNG | `crypto.getRandomValues` | OK — Web Crypto CSPRNG. |
| Key wrapping | IndexedDB stores `CryptoKey` objects, non-extractable when the primitive allows | OK — private keys never hit JS heap in cleartext when possible. |
| Protocol version byte | Present (`PROTOCOL_VERSION = 2`) | OK — enables forwards-compatible upgrades. |

## Security properties

- **Forward secrecy** — ECDH ratchet in the double-ratchet module rotates DH
  pairs per epoch; compromise of current state does not reveal past
  messages.
- **Future secrecy (post-compromise recovery)** — each message derives a
  fresh chain key; compromise of a single key does not leak future
  messages beyond the current chain.
- **Replay resistance** — message counter per chain; `MAX_SKIP = 256` cache
  bounds skipped-key memory.
- **Tamper detection** — GCM auth tag rejects any ciphertext modification.
- **Safety numbers** — double SHA-512 of both parties' identity keys,
  compared in constant time — used for user-facing verification.
- **Offline messaging** — X3DH preKey bundles (10 OPKs per device) enable
  first-message-to-offline-user without online handshake.

## Gaps found

| ID | Severity | Finding | Recommendation |
| --- | --- | --- | --- |
| O-1 | Medium | No Vitest suite asserts tamper detection, replay rejection, out-of-order delivery within `MAX_SKIP`, and exhaustion beyond `MAX_SKIP`. | Add `src/lib/__tests__/orbit-e2ee.test.ts` with deterministic seeded tests. |
| O-2 | Medium | Device-recovery flow exists but is undocumented for end users. | Add a recovery guide to `docs/orbit/`, plus a UI prompt for safety-number re-verification whenever a peer's identity key changes. |
| O-3 | Low | `PREKEY_COUNT = 10` may be too low for busy users — once exhausted, future senders fall back to SPK-only (still secure, but reduced one-shot OPK benefit). | Track OPK consumption in telemetry and auto-top-up when < 3 remain. |
| O-4 | Low | `MAX_SKIP = 256` — a malicious peer can force a recipient to store up to 256 message keys per chain. | Acceptable for messaging UX; document the constant as a security parameter. |
| O-5 | Low | File encryption (`orbit-file-encryption.ts`) is AES-GCM with random IV per chunk — confirm chunk-size and associated-data binding prevent chunk re-order attacks. | Add a test that reorders chunks and asserts failure. |

## Recovery & key management

- **Lost device** — user re-enrols → new identity key → peers see a
  safety-number change prompt → explicit re-verification required.
- **Backup** — `orbit-keystore.ts` exposes encrypted export/import for
  backup restore. Encryption key is user-derived (password) — ensure we use
  Argon2id / PBKDF2 with a strong iteration count. TODO: audit the KDF
  parameters for backup encryption specifically.

## Pass / fail gate

The Orbit E2EE stack **passes** the audit for design and primitives. It
**requires follow-up work** to close the test-coverage and UX-recovery gaps
before it can be declared "Big Tech grade".
