import { isLegacyTable } from "@/lib/migration/v2-only-guard";

export function blockLegacyRuntimeAccess(value: string) {
  if (!value) return;
  if (isLegacyTable(value)) {
    throw new Error(`[BLOCK_LEGACY_RUNTIME] Attempted runtime access to legacy table: ${value}`);
  }
}

export function safeTable(tableName: string) {
  blockLegacyRuntimeAccess(tableName);
  return tableName;
}
