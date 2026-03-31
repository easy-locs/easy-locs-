/**
 * DOMAIN: ME — Personal account, preferences, permissions, security.
 *
 * Me is the back office personnel simplifié de l'utilisateur.
 * Me contient uniquement:
 * - profile
 * - account
 * - preferences
 * - permissions
 * - security
 * - sessions / devices
 *
 * INTERDIT: mettre du business wallet / orbit / radar à l'intérieur.
 */

// ── Types ──
export type { CanonicalUserProfile, DevicePermissions, AppRole, PermissionStateValue } from "../shared/canonical-types";

// ── Hooks (canonical entry points) ──
export { useGlobalProfile } from "@/hooks/useGlobalProfile";
export type { GlobalProfile } from "@/hooks/useGlobalProfile";
export { useCanonicalMeBridge } from "@/hooks/useCanonicalMeBridge";

// ── Events ──
export { CANONICAL_EVENTS } from "../shared/canonical-events";
