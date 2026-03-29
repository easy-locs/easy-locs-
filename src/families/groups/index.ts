/**
 * FAMILY: GROUPS — Canonical group communication platform.
 * Subfamilies: create, members, settings, thread, events.
 */

export { GroupCreate } from "./group-create";
export type { GroupPayload } from "./group-create";

export { GroupMembers } from "./group-members";
export type { GroupMember, GroupRole } from "./group-members";

export { GroupSettings } from "./group-settings";
export type { GroupConfig } from "./group-settings";

export { GroupEvents } from "./group-events";
export type { GroupEventType } from "./group-events";

// Groups family owns: creation, members, roles, settings, thread resolution, events.
// No other module may manage group lifecycle directly.
