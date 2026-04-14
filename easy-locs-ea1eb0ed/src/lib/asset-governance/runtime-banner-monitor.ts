/**
 * RUNTIME BANNER MONITOR — Post-publish monitoring, quarantine, auto-repair
 * ==========================================================================
 * Detects bad banners appearing at runtime after publication.
 * On detection: quarantine immediately → replace with valid fallback →
 * create repair record with root cause → block recurrence.
 *
 * Integrates with refresh-storm prevention (no infinite loops).
 */

import {
  quarantineAsset,
  recordRepair,
  getPublishedAssetsForVertical,
  getRegistryStats,
  updateAssetStatus,
} from "./asset-registry";
import {
  runBannerIntegrityPipeline,
  type PipelineInput,
} from "./banner-integrity-pipeline";
import { getVerticalFallbackPath } from "./asset-governance-taxonomy";

export interface RuntimeBannerIncident {
  id: string;
  assetId: string;
  vertical: string;
  detectedAt: string;
  issue: string;
  action: "quarantined" | "replaced_with_fallback" | "blocked";
  fallbackUrl?: string;
  rootCause: string;
  resolved: boolean;
}

const _incidents: RuntimeBannerIncident[] = [];
const _suppressedAssets = new Set<string>();
const _lastCheckTime = new Map<string, number>();
const MIN_CHECK_INTERVAL_MS = 30_000;
const MAX_INCIDENTS = 500;

function generateIncidentId(): string {
  return `rmi-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function isStormProtected(assetId: string): boolean {
  return _suppressedAssets.has(assetId);
}

function isRateLimited(assetId: string): boolean {
  const last = _lastCheckTime.get(assetId);
  if (!last) return false;
  return Date.now() - last < MIN_CHECK_INTERVAL_MS;
}

function markChecked(assetId: string): void {
  _lastCheckTime.set(assetId, Date.now());
}

function addIncident(incident: RuntimeBannerIncident): void {
  _incidents.push(incident);
  if (_incidents.length > MAX_INCIDENTS) {
    _incidents.splice(0, _incidents.length - MAX_INCIDENTS);
  }
}

export async function reportRuntimeBannerIssue(
  assetId: string,
  vertical: string,
  issue: string,
  pageContext?: { vertical?: string; category?: string }
): Promise<RuntimeBannerIncident> {
  if (isStormProtected(assetId)) {
    const existing = _incidents.find((i) => i.assetId === assetId && !i.resolved);
    if (existing) return existing;
  }

  if (isRateLimited(assetId)) {
    const existing = _incidents.find((i) => i.assetId === assetId);
    if (existing) return existing;
  }

  markChecked(assetId);

  quarantineAsset(assetId, `Runtime detection: ${issue}`);

  const fallbackUrl = getVerticalFallbackPath(vertical);

  const rootCause = `Runtime banner issue detected: ${issue}${pageContext ? ` on page (${pageContext.vertical}/${pageContext.category})` : ""}`;

  recordRepair(assetId, rootCause, `Replaced with vertical-specific fallback: ${fallbackUrl}`);

  updateAssetStatus(assetId, {
    publishStatus: "blocked",
    moderationStatus: "quarantined",
    rejectionReasons: [issue],
  });

  _suppressedAssets.add(assetId);

  const incident: RuntimeBannerIncident = {
    id: generateIncidentId(),
    assetId,
    vertical,
    detectedAt: new Date().toISOString(),
    issue,
    action: "replaced_with_fallback",
    fallbackUrl,
    rootCause,
    resolved: true,
  };

  addIncident(incident);

  console.warn(`[RuntimeBannerMonitor] INCIDENT ${incident.id}: ${issue} — quarantined ${assetId}, fallback=${fallbackUrl}`);

  return incident;
}

export async function auditPublishedBannersForVertical(vertical: string): Promise<{
  vertical: string;
  total: number;
  passed: number;
  quarantined: number;
  incidents: RuntimeBannerIncident[];
}> {
  const assets = getPublishedAssetsForVertical(vertical);
  let passed = 0;
  let quarantined = 0;
  const newIncidents: RuntimeBannerIncident[] = [];

  for (const asset of assets) {
    if (isStormProtected(asset.assetId)) {
      quarantined++;
      continue;
    }
    if (isRateLimited(asset.assetId)) {
      passed++;
      continue;
    }

    markChecked(asset.assetId);

    const pipelineInput: PipelineInput = {
      assetId: asset.assetId,
      assetType: asset.assetType,
      url: asset.url,
      declaredVertical: asset.vertical,
      declaredCategory: asset.category,
      declaredSubcategory: asset.subcategory,
      altText: asset.altText,
      title: asset.title,
      source: asset.source,
      trustLevel: asset.trustLevel,
    };

    const result = await runBannerIntegrityPipeline(pipelineInput);

    if (result.blocked) {
      const incident = await reportRuntimeBannerIssue(
        asset.assetId,
        vertical,
        result.rejectionReasons.join("; "),
        { vertical }
      );
      newIncidents.push(incident);
      quarantined++;
    } else {
      passed++;
    }
  }

  return {
    vertical,
    total: assets.length,
    passed,
    quarantined,
    incidents: newIncidents,
  };
}

export function getIncidents(): RuntimeBannerIncident[] {
  return [..._incidents];
}

export function getUnresolvedIncidents(): RuntimeBannerIncident[] {
  return _incidents.filter((i) => !i.resolved);
}

export function getSuppressedAssets(): string[] {
  return [..._suppressedAssets];
}

export function resolveIncident(incidentId: string): boolean {
  const incident = _incidents.find((i) => i.id === incidentId);
  if (!incident) return false;
  incident.resolved = true;
  return true;
}

export function getRuntimeMonitorStats(): {
  totalIncidents: number;
  unresolvedIncidents: number;
  suppressedAssets: number;
  byVertical: Record<string, number>;
  registryStats: ReturnType<typeof getRegistryStats>;
} {
  const byVertical: Record<string, number> = {};
  for (const inc of _incidents) {
    byVertical[inc.vertical] = (byVertical[inc.vertical] ?? 0) + 1;
  }

  return {
    totalIncidents: _incidents.length,
    unresolvedIncidents: _incidents.filter((i) => !i.resolved).length,
    suppressedAssets: _suppressedAssets.size,
    byVertical,
    registryStats: getRegistryStats(),
  };
}
