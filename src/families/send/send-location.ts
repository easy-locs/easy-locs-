/**
 * send.location — Canonical location (static + live) send pipeline.
 */
import { insertMessage, updateConversationTimestamp } from "@/repositories/communication.repository";
import { platformBus } from "@/lib/shared/platform-bus";
import type { SendContext } from "./send-context";

export interface LocationPayload {
  lat: number;
  lng: number;
  type: "static" | "live" | "place";
  label?: string;
  address?: string;
  duration?: number; // minutes, for live
}

export async function sendLocation(ctx: SendContext, loc: LocationPayload) {
  const mapUrl = `https://www.openstreetmap.org/?mlat=${loc.lat}&mlon=${loc.lng}#map=16/${loc.lat}/${loc.lng}`;

  const body =
    loc.type === "live"
      ? `📡 Live location shared for ${loc.duration || 15}min\n📍 ${mapUrl}`
      : loc.type === "place"
      ? `📍 ${loc.label || "Location"}\n${loc.address || ""}\n${mapUrl}`
      : `📍 My location\n${mapUrl}`;

  const data = await insertMessage({
    conversationId: ctx.conversationId,
    senderUserId: ctx.senderUserId,
    senderOrbitId: ctx.senderOrbitId,
    receiverOrbitId: ctx.receiverOrbitId,
    type: "location",
    body,
    metadata: { lat: loc.lat, lng: loc.lng, mode: loc.type, label: loc.label },
  });

  await updateConversationTimestamp(ctx.conversationId, body.slice(0, 120));

  platformBus.emit("orbit:message_sent", {
    threadId: ctx.threadId,
    conversationId: ctx.conversationId,
    type: "location",
  }, "orbit", { userId: ctx.senderUserId, orgId: ctx.orgId || undefined });

  return data;
}
