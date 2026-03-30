/**
 * send.location — Canonical location (static + live) send pipeline.
 */
import { insertMessage, updateConversationTimestamp } from "@/repositories/communication.repository";
import { platformBus } from "@/lib/shared/platform-bus";
import { buildLocationMeta } from "@/families/messages/build-metadata";
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
  const mode = loc.type === "live" ? "live" : "static";
  const msgType = mode === "live" ? "location_live" : "location_static";

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
    type: msgType,
    body,
    metadata: buildLocationMeta(loc.lat, loc.lng, mode, {
      label: loc.label,
      address: loc.address,
      duration: loc.duration,
    }),
  });

  await updateConversationTimestamp(ctx.conversationId, body.slice(0, 120));

  platformBus.emit("orbit:message_sent", {
    conversationId: ctx.conversationId,
    type: msgType,
  }, "orbit", { userId: ctx.senderUserId, orgId: ctx.orgId || undefined });

  return data;
}
