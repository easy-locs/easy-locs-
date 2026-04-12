import type {
  CanonicalGlobalFeedItem,
  CanonicalLocalListing,
  CanonicalLocalIntent,
  CanonicalLocalMatch,
  CanonicalModerationState,
  CountryProfile,
  CityProfile,
  GlobalFeedCategory,
  LocalListingStatus,
  MatchStatus,
  ModerationStatus,
} from "@/domains/shared/canonical-types";

import {
  LISTING_MACHINE,
  MATCH_MACHINE,
  MODERATION_MACHINE,
  transitionListing,
  transitionMatch,
} from "@/domains/shared/state-machines";

type ValidationResult = { valid: true } | { valid: false; errors: string[] };

export function validateGlobalFeedItem(item: CanonicalGlobalFeedItem): ValidationResult {
  const errors: string[] = [];
  if (!item.id) errors.push("id is required");
  if (!item.sourceId) errors.push("sourceId is required");
  if (!item.category) errors.push("category is required");
  if (!item.title) errors.push("title is required");
  if (!item.country) errors.push("country is required");
  if (item.relevanceScore < 0 || item.relevanceScore > 1) errors.push("relevanceScore must be 0..1");
  if (item.freshnessScore < 0 || item.freshnessScore > 1) errors.push("freshnessScore must be 0..1");
  if (item.sourceTrust < 0 || item.sourceTrust > 1) errors.push("sourceTrust must be 0..1");
  if (!item.contentHash) errors.push("contentHash is required");
  if (!item.publishedAt) errors.push("publishedAt is required");
  if (!item.expiresAt) errors.push("expiresAt is required");
  return errors.length === 0 ? { valid: true } : { valid: false, errors };
}

export function validateLocalListing(listing: CanonicalLocalListing): ValidationResult {
  const errors: string[] = [];
  if (!listing.id) errors.push("id is required");
  if (!listing.sellerId) errors.push("sellerId is required");
  if (!listing.title) errors.push("title is required");
  if (!listing.city) errors.push("city is required");
  if (!listing.country) errors.push("country is required");
  if (!listing.currency) errors.push("currency is required");
  if (listing.qualityScore < 0 || listing.qualityScore > 1) errors.push("qualityScore must be 0..1");
  if (listing.trustScore < 0 || listing.trustScore > 1) errors.push("trustScore must be 0..1");
  if (listing.price !== null && listing.price < 0) errors.push("price must be non-negative");
  if (!listing.createdAt) errors.push("createdAt is required");
  if (!listing.expiresAt) errors.push("expiresAt is required");
  return errors.length === 0 ? { valid: true } : { valid: false, errors };
}

export function validateLocalIntent(intent: CanonicalLocalIntent): ValidationResult {
  const errors: string[] = [];
  if (!intent.id) errors.push("id is required");
  if (!intent.userId) errors.push("userId is required");
  if (!intent.category) errors.push("category is required");
  if (!intent.country) errors.push("country is required");
  if (!intent.city) errors.push("city is required");
  if (intent.confidenceScore < 0 || intent.confidenceScore > 1) errors.push("confidenceScore must be 0..1");
  if (intent.radiusKm <= 0) errors.push("radiusKm must be positive");
  if (!intent.createdAt) errors.push("createdAt is required");
  if (!intent.expiresAt) errors.push("expiresAt is required");
  return errors.length === 0 ? { valid: true } : { valid: false, errors };
}

export function validateLocalMatch(match: CanonicalLocalMatch): ValidationResult {
  const errors: string[] = [];
  if (!match.id) errors.push("id is required");
  if (!match.listingId) errors.push("listingId is required");
  if (!match.buyerId) errors.push("buyerId is required");
  if (!match.sellerId) errors.push("sellerId is required");
  if (match.combinedScore < 0 || match.combinedScore > 1) errors.push("combinedScore must be 0..1");
  if (match.distanceKm < 0) errors.push("distanceKm must be non-negative");
  if (!match.createdAt) errors.push("createdAt is required");
  if (!match.expiresAt) errors.push("expiresAt is required");
  return errors.length === 0 ? { valid: true } : { valid: false, errors };
}

export function validateCountryProfile(profile: CountryProfile): ValidationResult {
  const errors: string[] = [];
  if (!profile.code || profile.code.length !== 2) errors.push("code must be 2-letter ISO");
  if (!profile.defaultLanguage) errors.push("defaultLanguage is required");
  if (!profile.defaultCurrency) errors.push("defaultCurrency is required");
  if (!profile.timezones || profile.timezones.length === 0) errors.push("at least one timezone required");
  if (!profile.supportedLanguages || profile.supportedLanguages.length === 0) errors.push("at least one supportedLanguage required");
  return errors.length === 0 ? { valid: true } : { valid: false, errors };
}

export function validateListingTransition(current: LocalListingStatus, event: string): { valid: boolean; nextState: LocalListingStatus | null } {
  const next = transitionListing(current, event as any);
  return { valid: next !== null, nextState: next };
}

export function validateMatchTransition(current: MatchStatus, event: string): { valid: boolean; nextState: MatchStatus | null } {
  const next = transitionMatch(current, event as any);
  return { valid: next !== null, nextState: next };
}

export function getListingMachineStates(): LocalListingStatus[] {
  return Object.keys(LISTING_MACHINE) as LocalListingStatus[];
}

export function getMatchMachineStates(): MatchStatus[] {
  return Object.keys(MATCH_MACHINE) as MatchStatus[];
}

export function getModerationMachineStates(): ModerationStatus[] {
  return Object.keys(MODERATION_MACHINE) as ModerationStatus[];
}

export interface ShadowValidationReport {
  valid: boolean;
  totalItems: number;
  passedItems: number;
  failedItems: number;
  errors: ShadowValidationError[];
  warnings: ShadowValidationWarning[];
  validatedAt: string;
}

interface ShadowValidationError {
  itemId: string;
  check: string;
  message: string;
}

interface ShadowValidationWarning {
  itemId: string;
  check: string;
  message: string;
}

const VALID_PRIORITIES: Set<string> = new Set(["P0", "P1", "P2", "P3", "P4"]);

function isValidISODate(value: string): boolean {
  const d = new Date(value);
  return !isNaN(d.getTime());
}

function validateShadowItem(
  item: CanonicalGlobalFeedItem,
  seenHashes: Set<string>,
): { errors: ShadowValidationError[]; warnings: ShadowValidationWarning[] } {
  const errors: ShadowValidationError[] = [];
  const warnings: ShadowValidationWarning[] = [];
  const id = item.id || "(empty)";

  if (!item.id) errors.push({ itemId: id, check: "id_format", message: "id is empty" });
  if (!item.sourceId) errors.push({ itemId: id, check: "schema_completeness", message: "sourceId is missing" });
  if (!item.sourceName) errors.push({ itemId: id, check: "schema_completeness", message: "sourceName is missing" });
  if (!item.title) errors.push({ itemId: id, check: "schema_completeness", message: "title is missing" });
  if (!item.summary) errors.push({ itemId: id, check: "schema_completeness", message: "summary is missing" });
  if (!item.country) errors.push({ itemId: id, check: "schema_completeness", message: "country is missing" });
  if (!item.contentHash) errors.push({ itemId: id, check: "schema_completeness", message: "contentHash is missing" });

  if (item.sourceTrust < 0 || item.sourceTrust > 1) {
    errors.push({ itemId: id, check: "score_ranges", message: `sourceTrust ${item.sourceTrust} out of [0,1]` });
  }
  if (item.relevanceScore < 0 || item.relevanceScore > 1) {
    errors.push({ itemId: id, check: "score_ranges", message: `relevanceScore ${item.relevanceScore} out of [0,1]` });
  }
  if (item.freshnessScore < 0 || item.freshnessScore > 1) {
    errors.push({ itemId: id, check: "score_ranges", message: `freshnessScore ${item.freshnessScore} out of [0,1]` });
  }
  if (item.personalRelevance < 0 || item.personalRelevance > 1) {
    errors.push({ itemId: id, check: "score_ranges", message: `personalRelevance ${item.personalRelevance} out of [0,1]` });
  }

  if (!isValidISODate(item.expiresAt)) {
    errors.push({ itemId: id, check: "expiry_validity", message: "expiresAt is not valid ISO 8601" });
  } else if (new Date(item.expiresAt).getTime() <= Date.now()) {
    warnings.push({ itemId: id, check: "expiry_validity", message: "expiresAt is in the past" });
  }

  if (!isValidISODate(item.publishedAt)) {
    errors.push({ itemId: id, check: "timestamp_order", message: "publishedAt is not valid ISO 8601" });
  }
  if (!isValidISODate(item.fetchedAt)) {
    errors.push({ itemId: id, check: "timestamp_order", message: "fetchedAt is not valid ISO 8601" });
  }
  if (isValidISODate(item.publishedAt) && isValidISODate(item.fetchedAt) && isValidISODate(item.expiresAt)) {
    const pub = new Date(item.publishedAt).getTime();
    const fet = new Date(item.fetchedAt).getTime();
    const exp = new Date(item.expiresAt).getTime();
    if (pub > fet) warnings.push({ itemId: id, check: "timestamp_order", message: "publishedAt > fetchedAt" });
    if (fet > exp) warnings.push({ itemId: id, check: "timestamp_order", message: "fetchedAt > expiresAt" });
  }

  if (!VALID_PRIORITIES.has(item.priority)) {
    errors.push({ itemId: id, check: "priority_validity", message: `priority "${item.priority}" is invalid` });
  }

  if (item.contentHash && seenHashes.has(item.contentHash)) {
    errors.push({ itemId: id, check: "content_hash_uniqueness", message: `duplicate contentHash: ${item.contentHash}` });
  }
  if (item.contentHash) seenHashes.add(item.contentHash);

  return { errors, warnings };
}

export function runShadowValidation(items: CanonicalGlobalFeedItem[]): ShadowValidationReport {
  const allErrors: ShadowValidationError[] = [];
  const allWarnings: ShadowValidationWarning[] = [];
  const seenHashes = new Set<string>();
  let passedItems = 0;

  for (const item of items) {
    const result = validateShadowItem(item, seenHashes);
    allErrors.push(...result.errors);
    allWarnings.push(...result.warnings);
    if (result.errors.length === 0) passedItems++;
  }

  return {
    valid: allErrors.length === 0,
    totalItems: items.length,
    passedItems,
    failedItems: items.length - passedItems,
    errors: allErrors,
    warnings: allWarnings,
    validatedAt: new Date().toISOString(),
  };
}
