/**
 * Input Validator — Validates and sanitizes pipeline input.
 * ONE responsibility: ensure input is well-formed before pipeline starts.
 */
import type { PipelineInput, InputValidationResult } from "./pipeline.types";
import type { Vertical } from "../types";

const VALID_VERTICALS: Vertical[] = ["food", "grocery", "hotel", "services", "property"];

export function validatePipelineInput(input: PipelineInput): InputValidationResult {
  const errors: string[] = [];

  if (!input.vertical) {
    errors.push("vertical is required");
  } else if (!VALID_VERTICALS.includes(input.vertical)) {
    errors.push(`invalid vertical: ${input.vertical}`);
  }

  if (!input.name && !input.query && !input.website) {
    errors.push("at least one of name, query, or website is required");
  }

  const sanitizedInput: PipelineInput = {
    vertical: input.vertical,
    name: input.name?.trim() || undefined,
    city: input.city?.trim() || undefined,
    district: input.district?.trim() || undefined,
    country: input.country?.trim() || undefined,
    website: input.website?.trim() || undefined,
    phone: input.phone?.trim() || undefined,
    query: input.query?.trim() || undefined,
  };

  return {
    valid: errors.length === 0,
    errors,
    sanitizedInput,
  };
}
