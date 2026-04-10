/**
 * FAMILY: BROADCAST — Canonical broadcast list platform.
 * Subfamilies: create, recipients, send, preview, execution.
 */

export { BroadcastCreate } from "./broadcast-create";
export type { BroadcastListPayload } from "./broadcast-create";

export { BroadcastRecipients } from "./broadcast-recipients";

export { BroadcastSend } from "./broadcast-send";
export type { BroadcastResult, BroadcastDelivery } from "./broadcast-send";

// Broadcast family owns: list creation, recipients, fan-out send, preview, execution.
// Broadcast ≠ Group. Recipients never see each other.
