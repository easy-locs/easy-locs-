import { db } from "@/services/db";
import { platformBus } from "@/lib/shared/platform-bus";
import type { GovernanceViolation, GovernanceViolationType, GovernanceSeverity } from "@/domains/shared/canonical-types";

export interface CatalogEntry {
  name: string;
  price: number | null;
  price_range?: string | null;
}

export interface GateResult {
  shopId: string;
  shopName: string;
  passed: boolean;
  failures: string[];
  persisted: boolean;
}

export interface GateBatchReport {
  status: "completed";
  results: GateResult[];
  passed: number;
  failed: number;
}

export interface CatalogValidationConfig {
  emptyFailure: string;
  minCount?: number;
  minCountFailure?: string;
  priceFailure?: string;
  allowPriceRange?: boolean;
}

export function parseCatalogEntries(raw: unknown): CatalogEntry[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((r: Record<string, unknown>) => ({
    name: String(r.name ?? ""),
    price: r.price != null ? Number(r.price) : null,
    price_range: r.price_range != null ? String(r.price_range) : null,
  }));
}

export function validateBasicMerchantInfo(
  m: Record<string, unknown>,
  options?: { requireDescription?: boolean }
): string[] {
  const failures: string[] = [];
  if (!m.name || (m.name as string).trim().length < 2) failures.push("missing_name");
  if (!m.address) failures.push("missing_address");
  if (!m.phone) failures.push("missing_phone");
  if (!m.cover_image_url) failures.push("missing_cover_image");
  if (options?.requireDescription) {
    const desc = m.description as string | undefined;
    if (!desc || desc.length < 10) failures.push("weak_description");
  }
  return failures;
}

export function validateCatalogIntegrity(
  items: CatalogEntry[],
  config: CatalogValidationConfig
): string[] {
  const failures: string[] = [];

  if (items.length === 0) {
    failures.push(config.emptyFailure);
    return failures;
  }

  if (config.minCount !== undefined && config.minCountFailure && items.length < config.minCount) {
    failures.push(config.minCountFailure);
  }

  if (config.priceFailure) {
    const hasValidPrices = items.every((item) => {
      if (config.allowPriceRange) {
        return (item.price != null && item.price > 0) || item.price_range != null;
      }
      return item.price != null && item.price > 0;
    });
    if (!hasValidPrices) failures.push(config.priceFailure);
  }

  return failures;
}

export type VerticalValidator = (m: Record<string, unknown>) => string[];

export async function runPublishGateBatch(
  vertical: string,
  selectFields: string,
  catalogField: string,
  validator: VerticalValidator,
  batchSize = 100
): Promise<GateBatchReport> {
  const { data: merchants } = await db
    .from("seed_merchants")
    .select(selectFields)
    .eq("vertical", vertical)
    .limit(batchSize);

  if (!merchants || merchants.length === 0) {
    return { status: "completed", results: [], passed: 0, failed: 0 };
  }

  const results: GateResult[] = [];
  let passed = 0;
  let failed = 0;

  for (const m of merchants) {
    const failures = validator(m as Record<string, unknown>);
    const ok = failures.length === 0;
    const gateStatus = ok ? "passed" : "failed";
    const blockingReason = ok ? null : failures.join(", ");

    let persisted = false;
    try {
      const { error } = await db
        .from("seed_merchants")
        .update({ gate_status: gateStatus, blocking_reason: blockingReason })
        .eq("id", (m as Record<string, unknown>).id);
      persisted = !error;
    } catch {
      persisted = false;
    }

    const record = m as Record<string, unknown>;
    results.push({
      shopId: record.id as string,
      shopName: (record.name as string | undefined) ?? "",
      passed: ok,
      failures,
      persisted,
    });
    if (ok) passed++;
    else failed++;
  }

  for (const r of results) {
    platformBus.emit(r.passed ? "PUBLISH_GATE_PASSED" : "PUBLISH_GATE_BLOCKED", {
      shopId: r.shopId,
      vertical,
      failures: r.failures,
    }, "engine");
  }

  storePublishGateViolations(vertical, results);

  return { status: "completed", results, passed, failed };
}

const FAILURE_TO_GOVERNANCE_TYPE: Record<string, GovernanceViolationType> = {
  missing_name: "missing_canonical_field",
  missing_address: "missing_canonical_field",
  missing_phone: "missing_canonical_field",
  missing_cover_image: "invalid_media",
  weak_description: "text_integrity",
  empty_menu: "missing_canonical_field",
  menu_too_small: "missing_canonical_field",
  invalid_menu_prices: "missing_canonical_field",
  empty_catalog: "missing_canonical_field",
  catalog_too_small: "missing_canonical_field",
  invalid_prices: "missing_canonical_field",
  missing_prices: "missing_canonical_field",
};

const FAILURE_TO_SEVERITY: Record<string, GovernanceSeverity> = {
  missing_name: "error",
  missing_address: "warning",
  missing_phone: "warning",
  missing_cover_image: "warning",
  weak_description: "warning",
  empty_menu: "error",
  menu_too_small: "warning",
  invalid_menu_prices: "error",
  empty_catalog: "error",
  catalog_too_small: "warning",
  invalid_prices: "error",
  missing_prices: "warning",
};

const publishGateViolationCache: Map<string, GovernanceViolation[]> = new Map();

function storePublishGateViolations(vertical: string, results: GateResult[]): void {
  const violations: GovernanceViolation[] = [];
  const now = new Date().toISOString();

  for (const r of results) {
    if (r.passed) continue;
    for (const failure of r.failures) {
      const type = FAILURE_TO_GOVERNANCE_TYPE[failure] ?? "missing_canonical_field";
      const severity = FAILURE_TO_SEVERITY[failure] ?? "warning";
      violations.push({
        id: `pgate:${vertical}:${r.shopId}:${failure}:${Date.now()}`,
        type,
        severity,
        source: `publish-gate:${vertical}`,
        target: r.shopId,
        message: `[${vertical}] ${r.shopName}: ${failure}`,
        ownerDomain: vertical,
        vertical: vertical as "food" | "grocery" | "services" | "platform",
        detectedAt: now,
        resolvedAt: null,
        autoRemediated: false,
        metadata: { shopId: r.shopId, shopName: r.shopName, failure },
        engine: `publish-gate-${vertical}`,
      });
    }
  }

  publishGateViolationCache.set(vertical, violations);
}

export function getPublishGateGovernanceViolations(): GovernanceViolation[] {
  const all: GovernanceViolation[] = [];
  for (const violations of publishGateViolationCache.values()) {
    all.push(...violations);
  }
  return all;
}
