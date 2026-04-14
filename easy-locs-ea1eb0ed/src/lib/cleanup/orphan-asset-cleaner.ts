import { quarantineEntity } from "@/services/quarantine/quarantine-system";

export interface MediaAssetRecord {
  id: string;
  url: string;
  entityId: string | null;
  uploadedAt: string;
  status: "active" | "pending" | "processing" | "deleted" | "orphan" | "quarantined";
  fileSize: number;
  mimeType: string;
  bucket: string;
  path: string;
  cdnUrl?: string | null;
  thumbnailUrl?: string | null;
}

export interface OrphanScanResult {
  totalAssets: number;
  unreferencedImages: OrphanRecord[];
  abandonedUploads: OrphanRecord[];
  disconnectedMedia: OrphanRecord[];
  brokenCdnRefs: OrphanRecord[];
  totalOrphans: number;
  totalCleanedBytes: number;
  durationMs: number;
  timestamp: string;
}

export interface OrphanRecord {
  assetId: string;
  url: string;
  reason: "unreferenced" | "abandoned_upload" | "disconnected" | "broken_cdn";
  fileSize: number;
  uploadedAt: string;
  action: "quarantined" | "flagged" | "deleted";
  details: string;
}

const ABANDONED_UPLOAD_THRESHOLD_MS = 24 * 60 * 60 * 1000;
const ORPHAN_GRACE_PERIOD_MS = 7 * 24 * 60 * 60 * 1000;

function isAbandonedUpload(asset: MediaAssetRecord): boolean {
  if (asset.status !== "pending" && asset.status !== "processing") return false;
  const uploadedAt = new Date(asset.uploadedAt).getTime();
  return Date.now() - uploadedAt > ABANDONED_UPLOAD_THRESHOLD_MS;
}

function isBrokenCdnRef(asset: MediaAssetRecord): boolean {
  if (!asset.cdnUrl) return false;
  try {
    const url = new URL(asset.cdnUrl);
    if (!url.hostname || url.hostname === "localhost") return true;
    if (!url.pathname || url.pathname === "/") return true;
    return false;
  } catch {
    return true;
  }
}

function isWithinGracePeriod(asset: MediaAssetRecord): boolean {
  const uploadedAt = new Date(asset.uploadedAt).getTime();
  return Date.now() - uploadedAt < ORPHAN_GRACE_PERIOD_MS;
}

export function scanForOrphans(
  assets: MediaAssetRecord[],
  referencedEntityIds: Set<string>,
): OrphanScanResult {
  const startTime = Date.now();
  const unreferencedImages: OrphanRecord[] = [];
  const abandonedUploads: OrphanRecord[] = [];
  const disconnectedMedia: OrphanRecord[] = [];
  const brokenCdnRefs: OrphanRecord[] = [];

  for (const asset of assets) {
    if (asset.status === "deleted" || asset.status === "quarantined") continue;

    if (isAbandonedUpload(asset)) {
      const record: OrphanRecord = {
        assetId: asset.id,
        url: asset.url,
        reason: "abandoned_upload",
        fileSize: asset.fileSize,
        uploadedAt: asset.uploadedAt,
        action: "quarantined",
        details: `Upload in "${asset.status}" state for >24h since ${asset.uploadedAt}`,
      };
      abandonedUploads.push(record);

      quarantineEntity({
        entityId: asset.id,
        entityType: "media",
        reason: "DATA_INTEGRITY_FAILURE",
        details: record.details,
        source: "orphan-asset-cleaner",
        metadata: { bucket: asset.bucket, path: asset.path, mimeType: asset.mimeType },
      });
      continue;
    }

    if (isBrokenCdnRef(asset)) {
      const record: OrphanRecord = {
        assetId: asset.id,
        url: asset.url,
        reason: "broken_cdn",
        fileSize: asset.fileSize,
        uploadedAt: asset.uploadedAt,
        action: "flagged",
        details: `CDN URL "${asset.cdnUrl}" is invalid or unreachable`,
      };
      brokenCdnRefs.push(record);
      continue;
    }

    if (!asset.entityId || !referencedEntityIds.has(asset.entityId)) {
      if (isWithinGracePeriod(asset)) continue;

      if (!asset.entityId) {
        const record: OrphanRecord = {
          assetId: asset.id,
          url: asset.url,
          reason: "disconnected",
          fileSize: asset.fileSize,
          uploadedAt: asset.uploadedAt,
          action: "quarantined",
          details: `Media asset has no entityId reference`,
        };
        disconnectedMedia.push(record);

        quarantineEntity({
          entityId: asset.id,
          entityType: "media",
          reason: "DATA_INTEGRITY_FAILURE",
          details: record.details,
          source: "orphan-asset-cleaner",
          metadata: { bucket: asset.bucket, path: asset.path },
        });
      } else {
        const record: OrphanRecord = {
          assetId: asset.id,
          url: asset.url,
          reason: "unreferenced",
          fileSize: asset.fileSize,
          uploadedAt: asset.uploadedAt,
          action: "quarantined",
          details: `Referenced entity "${asset.entityId}" no longer exists`,
        };
        unreferencedImages.push(record);

        quarantineEntity({
          entityId: asset.id,
          entityType: "media",
          reason: "DATA_INTEGRITY_FAILURE",
          details: record.details,
          source: "orphan-asset-cleaner",
          metadata: { bucket: asset.bucket, path: asset.path, orphanedEntityId: asset.entityId },
        });
      }
    }
  }

  const allOrphans = [...unreferencedImages, ...abandonedUploads, ...disconnectedMedia, ...brokenCdnRefs];
  const totalCleanedBytes = allOrphans
    .filter(o => o.action === "quarantined" || o.action === "deleted")
    .reduce((sum, o) => sum + o.fileSize, 0);

  return {
    totalAssets: assets.length,
    unreferencedImages,
    abandonedUploads,
    disconnectedMedia,
    brokenCdnRefs,
    totalOrphans: allOrphans.length,
    totalCleanedBytes,
    durationMs: Date.now() - startTime,
    timestamp: new Date().toISOString(),
  };
}

export function getOrphanCleanupSummary(result: OrphanScanResult): string {
  const mb = (bytes: number) => (bytes / (1024 * 1024)).toFixed(2);
  const lines = [
    `=== ORPHAN ASSET CLEANUP REPORT ===`,
    `Timestamp: ${result.timestamp}`,
    `Duration: ${result.durationMs}ms`,
    ``,
    `Total assets scanned: ${result.totalAssets}`,
    `Total orphans found: ${result.totalOrphans}`,
    `Total cleaned: ${mb(result.totalCleanedBytes)} MB`,
    ``,
    `--- Breakdown ---`,
    `Unreferenced images: ${result.unreferencedImages.length}`,
    `Abandoned uploads: ${result.abandonedUploads.length}`,
    `Disconnected media: ${result.disconnectedMedia.length}`,
    `Broken CDN refs: ${result.brokenCdnRefs.length}`,
    ``,
  ];

  const allOrphans = [
    ...result.unreferencedImages,
    ...result.abandonedUploads,
    ...result.disconnectedMedia,
    ...result.brokenCdnRefs,
  ];

  if (allOrphans.length > 0) {
    lines.push(`--- Sample Records ---`);
    for (const o of allOrphans.slice(0, 15)) {
      lines.push(`  [${o.action}] ${o.assetId} (${o.reason}): ${o.details}`);
    }
    if (allOrphans.length > 15) {
      lines.push(`  ... and ${allOrphans.length - 15} more`);
    }
  }

  return lines.join("\n");
}
