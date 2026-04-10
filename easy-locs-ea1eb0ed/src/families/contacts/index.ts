/**
 * FAMILY: CONTACTS — Canonical contact resolution, profiles, and contact sheet.
 * Single source of truth for contact display, search, and reachability.
 */
export { resolveCanonicalDisplayIdentity as resolveContactIdentity } from "@/lib/orbit/canonical-helpers";

// ── Contact Profile Sheet ──
export { ContactProfileSheet } from "@/components/orbit/ContactProfileSheet";

// ── Contact Profile View Model ──
export { buildContactProfileVM, type ContactProfileViewModel } from "@/families/identity/contact-profile-vm";

// Contacts family owns: lookup, display model, favorites, sync state, contact sheet
