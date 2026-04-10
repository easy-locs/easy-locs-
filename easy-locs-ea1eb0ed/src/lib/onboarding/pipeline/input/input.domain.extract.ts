/**
 * input.domain.extract — Extracts domain intelligence from a URL.
 * ONE thing: identify brand name, TLD, aggregator status.
 */
import type { DomainExtraction } from "../contracts";
import type { SourceName } from "../../types";

const AGGREGATOR_DOMAINS: Record<string, SourceName> = {
  "deliveroo.ae": "deliveroo", "deliveroo.com": "deliveroo",
  "talabat.com": "talabat",
  "careem.com": "careem",
  "noon.com": "noon",
  "booking.com": "booking",
  "expedia.com": "expedia", "expedia.ae": "expedia",
  "govoyages.com": "govoyage",
};

const COUNTRY_TLDS: Record<string, string> = {
  ae: "AE", sa: "SA", eg: "EG", ma: "MA", fr: "FR",
  uk: "GB", "co.uk": "GB", tr: "TR", qa: "QA",
  om: "OM", kw: "KW", bh: "BH", jo: "JO",
  lb: "LB", tn: "TN", dz: "DZ", iq: "IQ",
};

export function extractDomain(hostname: string): DomainExtraction {
  const parts = hostname.toLowerCase().replace(/^www\./, "").split(".");
  const tld = parts.length >= 2 ? parts.slice(-1).join(".") : "";
  const domain = parts.slice(0, -1).join(".");

  // Check if aggregator
  const fullDomain = parts.join(".");
  let aggregatorName: SourceName | null = null;
  let isAggregator = false;
  for (const [pattern, name] of Object.entries(AGGREGATOR_DOMAINS)) {
    if (fullDomain.includes(pattern)) {
      aggregatorName = name;
      isAggregator = true;
      break;
    }
  }

  // Brand name from domain
  const brandName = domain
    .split(".")
    .filter((p) => p.length > 2 && !["www", "com", "net", "org"].includes(p))[0] ?? domain;

  // Country hint from TLD
  const countryHint = COUNTRY_TLDS[tld] ?? null;

  return {
    domain: fullDomain,
    tld,
    brandName: brandName.charAt(0).toUpperCase() + brandName.slice(1),
    isAggregator,
    aggregatorName,
    countryHint,
  };
}
