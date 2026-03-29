/**
 * FAMILY: SEND — Canonical send pipeline split by payload type.
 * Single source of truth for ALL message insertion paths in Orbit.
 * Every send type flows through: validate → resolve → insert → update preview → emit event.
 */

export { sendText } from "./send-text";
export { sendVoice } from "./send-voice";
export { sendMedia } from "./send-media";
export { sendLocation } from "./send-location";
export { sendSystemEvent } from "./send-system-event";
export type { SendContext } from "./send-context";

// Send family owns: text, voice, media, location, payment, system-event message insertion.
// No other module may insert into chat_messages_v2 directly.
