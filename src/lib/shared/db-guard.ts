import { supabase } from "@/integrations/supabase/client";
import { assertNoLegacyTableInCore } from "@/lib/shared/assert-no-legacy-core";

export function guardedTable(tableName: string, filePath?: string) {
  assertNoLegacyTableInCore(tableName, filePath);
  return (supabase as any).from(tableName);
}
