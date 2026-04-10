/**
 * send-location.pipeline — Canonical location message pipeline.
 *
 * Steps:
 * 1. Validate coords
 * 2. Build location metadata
 * 3. Build optimistic location message
 * 4. Insert into store
 */
import type { OrbitMessage } from "../../types";
import type { LocationPayload } from "../../types/media-payloads";
import { markMessageSeen, generateIdempotencyKey } from "@/lib/dedup/message-dedup";

export interface SendLocationInput {
  conversationId: string;
  senderId: string;
  senderOrbitId: string;
  lat: number;
  lng: number;
  accuracy?: number;
  label?: string | null;
  address?: string | null;
  placeId?: string | null;
  thumbnailUrl?: string | null;
  mode: "static" | "live";
  liveDurationMinutes?: number | null;
}

/**
 * Step 1: Validate location input.
 */
export function validateLocationInput(input: SendLocationInput): string | null {
  if (!input.conversationId) return "missing_conversation_id";
  if (!input.senderId) return "missing_sender_id";
  if (typeof input.lat !== "number" || typeof input.lng !== "number") return "invalid_coords";
  if (input.lat < -90 || input.lat > 90) return "lat_out_of_range";
  if (input.lng < -180 || input.lng > 180) return "lng_out_of_range";
  return null;
}

/**
 * Step 2: Build canonical location payload.
 */
export function buildLocationPayload(input: SendLocationInput): LocationPayload {
  return {
    lat: input.lat,
    lng: input.lng,
    accuracy: input.accuracy,
    label: input.label ?? null,
    address: input.address ?? null,
    placeId: input.placeId ?? null,
    thumbnailUrl: input.thumbnailUrl ?? null,
    mode: input.mode,
    expiresAt: input.mode === "live" && input.liveDurationMinutes
      ? new Date(Date.now() + input.liveDurationMinutes * 60_000).toISOString()
      : null,
    liveDurationMinutes: input.liveDurationMinutes ?? null,
  };
}

/**
 * Step 3: Build optimistic location message.
 */
export function buildOptimisticLocationMessage(
  input: SendLocationInput,
  payload: LocationPayload,
): OrbitMessage {
  const tempId = crypto.randomUUID();
  const idempotencyKey = generateIdempotencyKey(input.senderId, input.conversationId, tempId);
  markMessageSeen({ tempId, idempotencyKey });

  return {
    id: tempId,
    tempId,
    conversationId: input.conversationId,
    senderId: input.senderId,
    senderOrbitId: input.senderOrbitId,
    type: input.mode === "live" ? "location_live" : "location_static",
    text: payload.label || payload.address || `📍 ${payload.lat.toFixed(5)}, ${payload.lng.toFixed(5)}`,
    attachmentIds: [],
    replyToId: null,
    reactionSummary: null,
    createdAt: new Date().toISOString(),
    updatedAt: null,
    status: "sending",
    isDeleted: false,
    isEdited: false,
    metadata: {
      tempId,
      idempotencyKey,
      schemaVersion: 1,
      location: payload,
    },
  };
}
