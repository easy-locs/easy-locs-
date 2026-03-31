/**
 * E2E Test Helpers — Spies, fakes, and utilities for domain E2E tests.
 */
import { vi } from "vitest";

/** Create a spy on platformBus.emit */
export function createPlatformBusSpy() {
  const calls: Array<{ event: string; payload: any; source: string }> = [];
  const spy = vi.fn((event: string, payload: any, source: string) => {
    calls.push({ event, payload, source });
  });
  return { spy, calls };
}

/** Fake navigate spy that records navigation requests */
export function createNavigateSpy() {
  const navigations: string[] = [];
  return {
    navigate: (path: string) => navigations.push(path),
    navigations,
  };
}

/** Fake QR payloads for testing */
export const fakeQrPayloads = {
  conversation: "https://app.easy-locs.com/orbit/550e8400-e29b-41d4-a716-446655440000",
  entity: "https://app.easy-locs.com/entity/660e8400-e29b-41d4-a716-446655440001",
  joinGroup: "https://app.easy-locs.com/group/join/770e8400-e29b-41d4-a716-446655440002",
  location: "https://app.easy-locs.com/location/25.2048,55.2708",
  pay: "https://app.easy-locs.com/pay/880e8400-e29b-41d4-a716-446655440003",
  invalid: "random-garbage-string-not-a-qr",
  emptyJson: "{}",
  jsonConversation: JSON.stringify({ type: "open_conversation", id: "990e8400-e29b-41d4-a716-446655440004" }),
};

/** Fake call peer */
export const fakeCallPeer = {
  userId: "user-001",
  orbitId: "orbit-001",
  name: "Test Peer",
  avatarUrl: null,
};

/** Fake card entities */
export const fakeCardEntities = {
  storefront: { id: "card-001", entityType: "storefront", title: "Test Shop" },
  listing: { id: "card-002", entityType: "listing", title: "Test Listing" },
};
