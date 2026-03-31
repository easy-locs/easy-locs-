/**
 * DOMAIN: ME — Personal account, preferences, permissions, security.
 *
 * SOLE source of truth for: profile, account, preferences, permissions, security, sessions.
 * INTERDIT: wallet / orbit / radar business logic inside.
 */

// ── Canonical Types ──
export type { CanonicalUserProfile, DevicePermissions, AppRole, PermissionStateValue } from "../shared/canonical-types";

// ── Atoms ──
export { isValidLanguage, normalizeEmail, isValidPhone } from "./atoms/is-valid-language.atom";
export type { SupportedLanguage } from "./atoms/is-valid-language.atom";

// ── Microns ──
export { validatePreferences } from "./microns/validate-preferences.micron";
export type { PreferencesInput, PreferencesValidation } from "./microns/validate-preferences.micron";

// ── Molecules ──
export { buildPreferencesUpdate } from "./molecules/build-preferences-update.molecule";
export type { PreferencesUpdate } from "./molecules/build-preferences-update.molecule";

// ── Hooks (canonical entry points) ──
export { useGlobalProfile } from "@/hooks/useGlobalProfile";
export type { GlobalProfile } from "@/hooks/useGlobalProfile";
export { useCanonicalMeBridge } from "@/hooks/useCanonicalMeBridge";

// ── Events ──
export { CANONICAL_EVENTS } from "../shared/canonical-events";
