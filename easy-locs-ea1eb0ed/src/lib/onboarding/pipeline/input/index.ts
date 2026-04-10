/**
 * Input Layer barrel — Composes all 5 atomic input units into one layer output.
 */
import type { InputLayerOutput, RawInput } from "../contracts";
import type { Vertical } from "../../types";
import { captureRawInput } from "./input.raw.capture";
import { validateUrl } from "./input.url.validate";
import { normalizeUrl } from "./input.url.normalize";
import { classifyQuery } from "./input.query.classify";
import { extractDomain } from "./input.domain.extract";

export { captureRawInput } from "./input.raw.capture";
export { validateUrl } from "./input.url.validate";
export { normalizeUrl } from "./input.url.normalize";
export { classifyQuery } from "./input.query.classify";
export { extractDomain } from "./input.domain.extract";

export function runInputLayer(params: {
  raw: string;
  vertical?: Vertical;
  city?: string;
  district?: string;
  country?: string;
  phone?: string;
  language?: string;
  timezone?: string;
  currency?: string;
}): InputLayerOutput {
  const rawInput = captureRawInput(params);
  const urlCheck = validateUrl(rawInput.raw);
  const url = urlCheck.isUrl && urlCheck.isValid ? normalizeUrl(rawInput.raw) : null;
  const classification = classifyQuery(rawInput.raw, rawInput.vertical);
  const domain = url ? extractDomain(url.hostname) : null;

  const vertical: Vertical =
    rawInput.vertical ??
    classification.detectedVertical ??
    "food"; // default vertical

  return {
    raw: rawInput,
    url,
    classification,
    domain,
    vertical,
    geoHints: {
      city: rawInput.city ?? classification.detectedCity ?? undefined,
      country: rawInput.country ?? classification.detectedCountry ?? domain?.countryHint ?? undefined,
      district: rawInput.district,
      timezone: rawInput.timezone,
      currency: rawInput.currency,
    },
  };
}
