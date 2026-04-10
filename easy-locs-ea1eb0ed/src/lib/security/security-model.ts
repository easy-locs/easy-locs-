/**
 * Security Model — Defines trust boundaries for the Easy-Locs platform.
 * Each domain enforces E2EE with server-visible metadata only.
 */

export type SecurityDomain =
  | "identity"
  | "messaging"
  | "calling"
  | "wallet"
  | "ghost";

export interface SecurityBoundary {
  domain: SecurityDomain;
  canAccessCleartext: boolean;
  serverVisibleMetadata: string[];
}

export const SECURITY_BOUNDARIES: SecurityBoundary[] = [
  {
    domain: "identity",
    canAccessCleartext: false,
    serverVisibleMetadata: ["public_identity_key", "device_id", "key_version"],
  },
  {
    domain: "messaging",
    canAccessCleartext: false,
    serverVisibleMetadata: ["sender_id", "recipient_id", "message_id", "sent_at"],
  },
  {
    domain: "calling",
    canAccessCleartext: false,
    serverVisibleMetadata: ["call_id", "participant_ids", "session_state"],
  },
  {
    domain: "wallet",
    canAccessCleartext: false,
    serverVisibleMetadata: ["wallet_id", "transaction_id", "amount", "currency", "status"],
  },
  {
    domain: "ghost",
    canAccessCleartext: false,
    serverVisibleMetadata: ["ghost_session_id", "expires_at"],
  },
];
