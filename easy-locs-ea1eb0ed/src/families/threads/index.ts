/**
 * FAMILY: THREADS — Canonical conversation/thread resolution.
 * One pair = one thread. No duplicates. No email-based routing.
 */
export { getOrCreateCanonicalDirectConversation } from "@/lib/direct-thread";
export { orbitDb } from "@/lib/db/orbitDb";

// Threads family owns: direct thread resolver, group thread resolver,
// thread creation, deduplication, participants normalization, preview hydration
