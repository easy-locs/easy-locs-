/**
 * Orbit Stores — Canonical exports.
 * NOTE: useOrbitMessagingStore is the ONLY canonical export for messaging state.
 * useOrbitStore from this module is deprecated — use useOrbitMessagingStore explicitly.
 * For profile state, use useOrbitProfileStore from @/stores/orbitStore.
 */
export { useOrbitMessagingStore } from "./orbit.store";
