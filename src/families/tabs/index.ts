/**
 * FAMILY: TABS — Canonical tab families index.
 * Each tab owns its own store, filters, search, and actions.
 */

export { useChatsTabStore, ChatsTab } from "./chats-tab";
export { useCallsTabStore, CallsTab } from "./calls-tab";
export { useContactsTabStore, ContactsTab } from "./contacts-tab";
export { useGroupsTabStore } from "./groups-tab";
export { useOrbitSettingsStore } from "./you-tab";

// Tabs family owns: per-tab filter, search, loading, cache, actions.
// The Orbit shell only provides: bottom nav, top header, routing, safe area.
