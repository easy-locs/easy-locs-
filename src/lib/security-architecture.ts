/**
 * Platform Security Architecture — E2EE vs Wallet Security Separation
 * 
 * ══════════════════════════════════════════════════════════════
 * LAYER 1: Communication E2EE (orbit-crypto / orbit-double-ratchet)
 * ══════════════════════════════════════════════════════════════
 * 
 * SCOPE: All Orbit messaging, voice notes, files, location shares.
 * 
 * WHAT IS ENCRYPTED:
 *  ✅ Text messages (prefixed "e2e:" or "e2e3:")
 *  ✅ Voice messages (encrypted before upload via orbit-file-encryption)
 *  ✅ Shared files (encrypted blob + IV stored separately)
 *  ✅ Location shares (coordinates encrypted in message body)
 *  ✅ Payment confirmation messages in chat threads
 *  ✅ Ephemeral messages (encrypted until TTL expiration)
 * 
 * WHAT THE SERVER CANNOT READ:
 *  🔒 Message content (ciphertext only)
 *  🔒 File contents (encrypted blobs in storage)
 *  🔒 Voice recordings (encrypted before upload)
 * 
 * WHAT THE SERVER CAN READ:
 *  ⚠️ Metadata: sender_id, thread_id, created_at, message_type
 *  ⚠️ File metadata: size, encrypted filename
 *  ⚠️ Presence: online status, last_seen_at
 * 
 * KEY MANAGEMENT:
 *  • Identity keys: ECDH P-521, generated per device, stored in IndexedDB
 *  • Shared keys: derived via ECDH, cached in-memory per session
 *  • Ratchet keys: Double Ratchet (per-message forward secrecy)
 *  • Public keys: published to user_key_bundles table
 *  • Private keys: NEVER leave the device
 *  • Recovery: user-controlled recovery key or secure PIN
 * 
 * ALGORITHMS:
 *  • Key exchange: X3DH (Extended Triple Diffie-Hellman)
 *  • Message encryption: AES-256-GCM with per-message IV
 *  • Key rotation: Double Ratchet (Signal Protocol)
 *  • Key verification: Safety Numbers (60-digit fingerprint)
 * 
 * ══════════════════════════════════════════════════════════════
 * LAYER 2: Wallet Transaction Security (server-side integrity)
 * ══════════════════════════════════════════════════════════════
 * 
 * SCOPE: LOCS transfers, purchases, payment processing.
 * 
 * THIS IS NOT E2EE — it is server-enforced transactional integrity:
 * 
 *  ✅ Atomic transactions via PostgreSQL RPC (transfer_locs)
 *  ✅ Row-level locking (SELECT FOR UPDATE) prevents double-spend
 *  ✅ Server-side balance validation (cannot send more than you have)
 *  ✅ Anti-replay: QR payment nonces persisted + validated server-side
 *  ✅ Wallet PIN: bcrypt-hashed server-side (wallet-pin Edge Function)
 *  ✅ Brute-force protection: 5 attempts = 5min lockout
 *  ✅ Audit trail: every transaction logged with reference codes
 *  ✅ 3D Secure: enforced on all Stripe payment sessions
 *  ✅ HMAC-SHA256: QR code payloads signed server-side
 * 
 * WHY NOT E2EE FOR WALLET:
 *  The server MUST validate balances, enforce limits, and maintain
 *  the ledger. E2EE would make fraud detection impossible and prevent
 *  the platform from guaranteeing transaction integrity. Instead,
 *  wallet security relies on:
 *  1. Server-side atomicity (PostgreSQL transactions)
 *  2. Authentication (JWT + PIN gate)
 *  3. Anti-tampering (HMAC signatures, nonce validation)
 *  4. Audit logging (every mutation recorded)
 * 
 * PAYMENT CONFIRMATION IN CHAT:
 *  When a payment is made in-chat, the confirmation message IS E2EE
 *  encrypted like any other message. The server records the transaction
 *  separately in wallet_transactions (server-verified) and the chat
 *  message is encrypted end-to-end (only participants can read it).
 *  This dual-layer ensures:
 *  - Financial integrity (server-verified ledger)
 *  - Communication privacy (E2EE confirmation message)
 * 
 * ══════════════════════════════════════════════════════════════
 * LAYER 3: App Lock / Ghost Mode (device-level protection)
 * ══════════════════════════════════════════════════════════════
 * 
 * SCOPE: Physical device access protection.
 * 
 *  ✅ Main PIN: SHA-256 hashed, unlocks the real app
 *  ✅ Ghost PIN: shows a fake messaging UI, zero real components mounted
 *  ✅ Panic PIN: triggers performLocalWipe (localStorage, IndexedDB, Cache API)
 *  ✅ Auto-lock: configurable timeout
 *  ✅ Title neutralization: document.title = "Messages" in Ghost mode
 *  ✅ Memory isolation: no React components, no Supabase queries in Ghost
 * 
 * ══════════════════════════════════════════════════════════════
 */

// Re-export security utilities for convenient access
export { isCryptoAvailable } from "@/lib/orbit-crypto";
export { isE2EEncrypted, getEncryptedPreview } from "@/lib/orbit-metadata-guard";
export { encryptFileForUpload, decryptFileFromDownload } from "@/lib/orbit-file-encryption";

/**
 * Security level for a given data flow.
 * Used by UI components to display appropriate security indicators.
 */
export type SecurityScope = "e2ee" | "server_integrity" | "device_lock" | "none";

export interface FlowSecurityInfo {
  scope: SecurityScope;
  label: string;
  description: string;
  encrypted: boolean;
  serverCanRead: boolean;
}

/** Get security info for a specific data flow */
export function getFlowSecurity(flow: string): FlowSecurityInfo {
  const FLOWS: Record<string, FlowSecurityInfo> = {
    // E2EE flows
    "chat_message":      { scope: "e2ee", label: "Chiffré E2E",          description: "Message chiffré de bout en bout — seuls les participants peuvent le lire.", encrypted: true, serverCanRead: false },
    "voice_message":     { scope: "e2ee", label: "Chiffré E2E",          description: "Message vocal chiffré avant upload — le serveur ne stocke que le blob chiffré.", encrypted: true, serverCanRead: false },
    "file_share":        { scope: "e2ee", label: "Chiffré E2E",          description: "Fichier chiffré avec clé partagée — IV stocké séparément.", encrypted: true, serverCanRead: false },
    "location_share":    { scope: "e2ee", label: "Chiffré E2E",          description: "Coordonnées GPS chiffrées dans le corps du message.", encrypted: true, serverCanRead: false },
    "payment_chat_msg":  { scope: "e2ee", label: "Chiffré E2E",          description: "Message de confirmation de paiement chiffré — la transaction elle-même est vérifiée côté serveur.", encrypted: true, serverCanRead: false },

    // Server integrity flows
    "wallet_transfer":   { scope: "server_integrity", label: "Sécurisé serveur", description: "Transaction atomique PostgreSQL avec verrouillage de ligne + audit trail.", encrypted: false, serverCanRead: true },
    "wallet_purchase":   { scope: "server_integrity", label: "3D Secure",        description: "Achat via Stripe avec 3D Secure obligatoire + webhook de confirmation.", encrypted: false, serverCanRead: true },
    "qr_payment":        { scope: "server_integrity", label: "HMAC signé",       description: "Payload QR signé HMAC-SHA256 côté serveur + nonce anti-replay.", encrypted: false, serverCanRead: true },
    "wallet_pin":        { scope: "server_integrity", label: "PIN sécurisé",     description: "PIN haché bcrypt côté serveur + protection brute-force (5 essais = 5min blocage).", encrypted: false, serverCanRead: true },

    // Device lock flows
    "app_lock":          { scope: "device_lock", label: "Verrou appareil",  description: "PIN local SHA-256 avec modes Ghost et Panic.", encrypted: false, serverCanRead: false },
    "ghost_mode":        { scope: "device_lock", label: "Mode fantôme",    description: "Interface factice — aucun composant réel monté, aucune donnée en mémoire.", encrypted: false, serverCanRead: false },
  };

  return FLOWS[flow] || { scope: "none", label: "Non protégé", description: "Ce flux n'a pas de protection spécifique.", encrypted: false, serverCanRead: true };
}
