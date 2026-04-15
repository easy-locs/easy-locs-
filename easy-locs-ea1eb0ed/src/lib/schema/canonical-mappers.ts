/**
 * canonical-mappers.ts
 *
 * Thin DB↔domain mapper functions for entities that have dual definitions:
 *   - canonical-schemas.ts  → DB layer (snake_case, 1:1 with PostgreSQL columns)
 *   - canonical-types.ts    → Domain layer (camelCase, used in UI / business logic)
 *
 * Naming convention:
 *   toDb<Entity>(domain)   → converts domain object to DB row shape
 *   fromDb<Entity>(row)    → converts DB row to domain object shape
 *
 * These mappers are the bridge between the two layers. Neither layer is "wrong" —
 * they serve different purposes. DB types mirror the schema exactly; domain types
 * are ergonomic for TypeScript consumers.
 */

import type {
  DbMessage,
  DbWalletAccount,
  DbAddress,
  DbMedia,
  DbPresence,
  DbLedgerEntry,
} from "./canonical-schemas";

import type {
  CanonicalMessage as DomainMessage,
  CanonicalWalletState as DomainWalletState,
  CanonicalAddress as DomainAddress,
  CanonicalMediaAsset as DomainMediaAsset,
  CanonicalPresence as DomainPresence,
  CanonicalLedgerEntry as DomainLedgerEntry,
} from "@/domains/shared/canonical-types";

export function fromDbMessage(row: DbMessage): DomainMessage {
  return {
    id: row.message_id,
    threadId: row.conversation_id,
    senderUserId: row.sender_id,
    type: mapDbMessageType(row.message_type),
    body: row.body,
    mediaUrl: null,
    replyToId: row.reply_to_message_id,
    context: null,
    status: mapDbMessageStatus(row.status),
    metadata: row.metadata_json ?? {},
    createdAt: row.sent_at,
  };
}

export function toDbMessage(domain: DomainMessage): Partial<DbMessage> {
  return {
    message_id: domain.id,
    conversation_id: domain.threadId,
    sender_id: domain.senderUserId,
    message_type: mapDomainMessageTypeToDb(domain.type),
    body: domain.body,
    reply_to_message_id: domain.replyToId,
    status: mapDomainMessageStatusToDb(domain.status),
    metadata_json: domain.metadata,
    sent_at: domain.createdAt,
  };
}

export function fromDbWalletAccount(row: DbWalletAccount): DomainWalletState {
  return {
    walletId: row.id ?? row.wallet_account_id,
    ownerUserId: row.owner_user_id,
    currency: row.currency as DomainWalletState["currency"],
    availableBalance: row.available_balance,
    escrowBalance: 0,
    pendingBalance: row.pending_balance,
    status: mapDbWalletStatus(row.status),
    lastUpdatedAt: row.updated_at,
  };
}

export function toDbWalletAccount(domain: DomainWalletState): Partial<DbWalletAccount> {
  return {
    wallet_account_id: domain.walletId,
    owner_user_id: domain.ownerUserId,
    currency: domain.currency,
    available_balance: domain.availableBalance,
    pending_balance: domain.pendingBalance,
    status: domain.status === "active" ? "active" : domain.status === "frozen" ? "suspended" : "archived",
  };
}

export function fromDbAddress(row: DbAddress): DomainAddress {
  return {
    line1: row.street_1,
    line2: row.street_2,
    city: row.city,
    state: row.state_region,
    postalCode: row.postal_code,
    country: row.country,
    countryCode: row.country,
    position: row.lat != null && row.lng != null
      ? { lat: row.lat, lng: row.lng, accuracy: null, updatedAt: null }
      : null,
    formattedAddress: row.formatted_address,
    placeId: row.place_source,
  };
}

export function toDbAddress(domain: DomainAddress): Partial<DbAddress> {
  return {
    street_1: domain.line1,
    street_2: domain.line2,
    city: domain.city,
    state_region: domain.state,
    postal_code: domain.postalCode,
    country: domain.countryCode || domain.country,
    lat: domain.position?.lat ?? null,
    lng: domain.position?.lng ?? null,
    formatted_address: domain.formattedAddress,
    place_source: domain.placeId,
  };
}

export function fromDbMedia(row: DbMedia): DomainMediaAsset {
  return {
    id: row.media_id,
    ownerId: row.owner_id,
    type: mapDbMediaKindToAssetType(row.media_kind),
    url: row.url,
    thumbnailUrl: null,
    fileName: row.storage_key,
    mimeType: row.mime_type,
    sizeBytes: 0,
    width: row.width,
    height: row.height,
    durationMs: row.duration_ms,
    contextType: row.owner_type,
    contextId: row.owner_id,
    metadata: {},
    createdAt: row.created_at,
  };
}

export function toDbMedia(domain: DomainMediaAsset): Partial<DbMedia> {
  return {
    media_id: domain.id,
    owner_type: domain.contextType ?? "entity",
    owner_id: domain.ownerId,
    media_kind: mapDomainAssetTypeToDbKind(domain.type),
    url: domain.url,
    storage_key: domain.fileName,
    mime_type: domain.mimeType,
    width: domain.width,
    height: domain.height,
    duration_ms: domain.durationMs,
  };
}

export function fromDbPresence(row: DbPresence): DomainPresence {
  return {
    userId: row.user_id,
    status: row.online ? "online" : "offline",
    lastSeenAt: row.last_seen_at,
    currentPosition: null,
    activeModule: null,
    deviceType: row.device_type as DomainPresence["deviceType"],
    metadata: {},
  };
}

export function toDbPresence(domain: DomainPresence): Partial<DbPresence> {
  return {
    user_id: domain.userId,
    online: domain.status === "online",
    last_seen_at: domain.lastSeenAt,
    device_type: domain.deviceType ?? "unknown",
  };
}

export function fromDbLedgerEntry(row: DbLedgerEntry): DomainLedgerEntry {
  return {
    id: row.ledger_entry_id,
    transactionId: row.reference_id,
    walletId: row.wallet_account_id,
    type: row.direction === "debit" ? "debit" : "credit",
    amount: row.amount,
    currency: row.currency as DomainLedgerEntry["currency"],
    balanceBefore: row.balance_before,
    balanceAfter: row.balance_after,
    description: row.description ?? "",
    counterpartyWalletId: null,
    metadata: {},
    createdAt: row.created_at,
  };
}

export function toDbLedgerEntry(domain: DomainLedgerEntry): Partial<DbLedgerEntry> {
  return {
    ledger_entry_id: domain.id,
    wallet_account_id: domain.walletId,
    direction: domain.type === "debit" ? "debit" : "credit",
    amount: domain.amount,
    currency: domain.currency,
    balance_before: domain.balanceBefore,
    balance_after: domain.balanceAfter,
    description: domain.description,
    reference_id: domain.transactionId,
  };
}

function mapDbMessageType(dbType: string): DomainMessage["type"] {
  const map: Record<string, DomainMessage["type"]> = {
    text: "text",
    image: "image",
    video: "video",
    audio: "audio",
    file: "file",
    location_static: "location",
    location_live: "location",
    system: "system",
    payment_receipt: "payment_receipt",
    booking_card: "booking_card",
    contact_card: "system",
  };
  return map[dbType] ?? "text";
}

function mapDomainMessageTypeToDb(domainType: DomainMessage["type"]): DbMessage["message_type"] {
  const map: Record<string, DbMessage["message_type"]> = {
    text: "text",
    image: "image",
    video: "video",
    audio: "audio",
    file: "file",
    location: "location_static",
    system: "system",
    payment_receipt: "payment_receipt",
    booking_card: "booking_card",
  };
  return map[domainType] ?? "text";
}

function mapDbMessageStatus(dbStatus: string): DomainMessage["status"] {
  return (dbStatus as DomainMessage["status"]) ?? "sent";
}

function mapDomainMessageStatusToDb(domainStatus: DomainMessage["status"]): DbMessage["status"] {
  return (domainStatus as DbMessage["status"]) ?? "sent";
}

function mapDbWalletStatus(dbStatus: string): DomainWalletState["status"] {
  if (dbStatus === "active") return "active";
  if (dbStatus === "suspended" || dbStatus === "frozen") return "frozen";
  return "closed";
}

function mapDbMediaKindToAssetType(kind: string): DomainMediaAsset["type"] {
  if (kind === "video") return "video";
  if (kind === "document") return "document";
  return "image";
}

function mapDomainAssetTypeToDbKind(assetType: DomainMediaAsset["type"]): DbMedia["media_kind"] {
  if (assetType === "video") return "video";
  if (assetType === "document") return "document";
  return "photo";
}
