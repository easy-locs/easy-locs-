/**
 * FAMILY: EPHEMERAL — Canonical disappearing/ephemeral message platform.
 * Subfamilies: policy, message, cleanup, events.
 */

export { EphemeralPolicy } from "./ephemeral-policy";
export type { DisappearTimer, EphemeralConfig } from "./ephemeral-policy";

export { EphemeralMessage } from "./ephemeral-message";

export { EphemeralCleanup } from "./ephemeral-cleanup";

export { EphemeralEvents } from "./ephemeral-events";

// Ephemeral family owns: timer policy, message marking, cleanup, system events.
