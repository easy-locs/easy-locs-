/**
 * Canonical identity domain entry point (Phase 1).
 *
 * This module is the single import surface for identity across the platform.
 * It does not reimplement anything — it converges the existing canonical
 * sources behind one re-export so downstream callers stop reaching into
 * scattered files.
 *
 * Rules (binding):
 *   - All new code reading or writing user identity MUST import from
 *     `@/domains/identity` (this file), not from the underlying modules.
 *   - This file MUST NOT add new identity logic. It only re-exports.
 *   - When a duplicate identity source is identified, its replacement path
 *     is to be re-exported here (and the duplicate marked deprecated in a
 *     follow-up phase). Do not delete duplicates inside Phase 1 — that
 *     belongs to the Retroactive Data Normalization track.
 */

// Canonical identity types (single source of truth for the user shape).
export type {
  CanonicalUserProfile,
  CanonicalOrbitProfile,
  AppRole,
  ServiceLinks,
  DevicePermissions,
  PermissionStateValue,
} from "@/domains/shared/canonical-types";

// Canonical user service (the only sanctioned read/write surface for the
// `profiles` table from application code).
export { userService } from "@/services/user.service";
export type { ProfileRow, NotificationPrefRow } from "@/services/user.service";

// Profile repository — lower-level helpers used by the service layer.
// Re-exported here so future consolidation only changes one path.
export {
  fetchBaseProfile,
  fetchOwnerProfile,
  fetchTenantProfile,
  updateProfile,
  upsertOwnerProfile,
  fetchProfileCriticalFields,
  fetchDualRoleData,
  markOnboardingCompleted,
} from "@/repositories/profile.repository";

// Orbit-side identity resolver (reads the canonical orbit profile view).
export { getOrbitProfile, updateOrbitProfileRole } from "@/repositories/orbit-profile.repository";
