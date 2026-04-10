import { db } from "@/services/db";
import { assertNotLegacyTable } from "@/lib/migration/v2-only-guard";

export const v2db = {
  from(tableName: string) {
    assertNotLegacyTable(tableName);
    return db(tableName);
  },
};
