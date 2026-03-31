/**
 * MOLECULE: buildPreferencesUpdate — Validates and builds a preferences update payload.
 */
import { validatePreferences, type PreferencesInput } from "../microns/validate-preferences.micron";

export interface PreferencesUpdate {
  language: string;
  timezone: string;
  notifications: boolean;
  updatedAt: string;
}

export function buildPreferencesUpdate(input: PreferencesInput & { timezone: string }): PreferencesUpdate {
  const validation = validatePreferences(input);
  if (!validation.ok) throw new Error((validation as { ok: false; reason: string }).reason);

  return {
    language: input.language,
    timezone: input.timezone,
    notifications: input.notifications ?? true,
    updatedAt: new Date().toISOString(),
  };
}
