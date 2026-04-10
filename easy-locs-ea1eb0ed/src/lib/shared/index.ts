/**
 * Barrel export for the shared architecture modules.
 */
export * from "./types";
export * from "./routes";
export * from "./notification-engine";
export * from "./communication-pipeline";
export * from "./deep-link";
export * from "./payment-request";
export * from "./sync-engine";
export { platformBus, installPlatformReactions } from "./platform-bus";
