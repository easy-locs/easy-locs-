/**
 * send-location-optimistic — Optimistic location send pipeline.
 * 1. Insert optimistic message with location card immediately → visible in thread
 * 2. Conversation timestamp update fire-and-forget
 * 3. Emit event for realtime reconcile
 */
import { insertMessage, updateConversationTimestamp } from "@/repositories/communication.repository";
import { platformBus } from "@/lib/shared/platform-bus";
import { buildLocationMeta } from "@/families/messages/build-metadata";
import type { SendContext } from "./send-context";
import type { LocationPayload } from "./send-location";

export async function sendLocationOptimistic(
  ctx: SendContext,
  loc: LocationPayload,
): Promise<void> {
  const mapUrl = `https://www.openstreetmap.org/?mlat=${loc.lat}&mlon=${loc.lng}#map=16/${loc.lat}/${loc.lng}`;
  const mode = loc.type === "live" ? "live" : "static";
  const msgType = mode === "live" ? "location_live" : "location_static";

  const body =
    loc.type === "live"
      ? `📡 Live location shared for ${loc.duration || 15}min\n📍 ${mapUrl}`
      : loc.type === "place"
      ? `📍 ${loc.label || "Location"}\n${loc.address || ""}\n${mapUrl}`
      : `📍 My location\n${mapUrl}`;

  const meta = buildLocationMeta(loc.lat, loc.lng, mode, {
    label: loc.label,
    address: loc.address,
    duration: loc.duration,
  });

  // Insert immediately — this makes the card appear in the thread via realtime
  await insertMessage({
    conversationId: ctx.conversationId,
    senderUserId: ctx.senderUserId,
    senderOrbitId: ctx.senderOrbitId,
    receiverOrbitId: ctx.receiverOrbitId,
    type: msgType,
    body,
    metadata: {
      ...meta,
      transport: { source: "ui", optimistic: false },
    },
  });

  // Fire-and-forget timestamp
  void updateConversationTimestamp(ctx.conversationId, body.slice(0, 120));

  platformBus.emit("orbit:message_sent", {
    conversationId: ctx.conversationId,
    type: msgType,
  }, "orbit", { userId: ctx.senderUserId, orgId: ctx.orgId || undefined });
}
