/**
 * MICRON: validatePreferences — Validates user preference updates.
 */
import { isValidLanguage } from "../atoms/is-valid-language.atom";

export interface PreferencesInput {
  language: string;
  timezone?: string;
  notifications?: boolean;
}

export type PreferencesValidation = { ok: true } | { ok: false; reason: string };

export function validatePreferences(input: PreferencesInput): PreferencesValidation {
  if (!isValidLanguage(input.language)) {
    return { ok: false, reason: `Unsupported language: ${input.language}` };
  }
  return { ok: true };
}
