/**
 * input.raw.capture — Captures and normalizes raw user input.
 * ONE thing: accept raw string + optional hints, produce RawInput.
 */
import type { RawInput } from "../contracts";
import type { Vertical } from "../../types";

export function captureRawInput(params: {
  raw: string;
  vertical?: Vertical;
  city?: string;
  district?: string;
  country?: string;
  phone?: string;
  language?: string;
  timezone?: string;
  currency?: string;
}): RawInput {
  return {
    raw: (params.raw ?? "").trim(),
    vertical: params.vertical,
    city: params.city?.trim() || undefined,
    district: params.district?.trim() || undefined,
    country: params.country?.trim() || undefined,
    phone: params.phone?.trim() || undefined,
    language: params.language?.trim() || undefined,
    timezone: params.timezone?.trim() || undefined,
    currency: params.currency?.trim() || undefined,
  };
}
