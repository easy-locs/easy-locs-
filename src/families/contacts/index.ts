/**
 * FAMILY: CONTACTS — Canonical contact resolution and lookup.
 * Single source of truth for contact display, search, and reachability.
 */
export { resolveCanonicalDisplayIdentity as resolveContactIdentity } from "@/lib/orbit/canonical-helpers";

// Re-export contact-related hooks if they exist
// Contacts family owns: lookup, display model, favorites, sync state
