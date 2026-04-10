import { db } from "@/services/db";
import { assertNoLegacyTableInCore } from "@/lib/shared/assert-no-legacy-core";

export function guardedTable(tableName: string, filePath?: string) {
  assertNoLegacyTableInCore(tableName, filePath);
  return db(tableName);
}
