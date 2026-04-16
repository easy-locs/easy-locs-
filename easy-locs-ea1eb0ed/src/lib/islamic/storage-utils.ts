export const STORAGE_QUOTA_WARNING_PERCENT = 80;

export function formatStorageSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `~${(bytes / 1024).toFixed(1)} KB`;
  return `~${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function isStorageQuotaWarning(percentUsed: number): boolean {
  return percentUsed >= STORAGE_QUOTA_WARNING_PERCENT;
}
