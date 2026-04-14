import { db } from "@/services/db";
import { assertNoLegacyTableInCore } from "@/lib/shared/assert-no-legacy-core";
import { killLegacyAccess } from "@/lib/shared/kill-legacy";

export function guardedTable(tableName: string, filePath?: string) {
  killLegacyAccess(tableName);
  assertNoLegacyTableInCore(tableName, filePath);
  return db(tableName);
}
