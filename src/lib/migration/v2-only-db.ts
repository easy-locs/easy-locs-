import { supabase } from "@/integrations/supabase/client";
import { assertNotLegacyTable } from "@/lib/migration/v2-only-guard";

export const v2db = {
  from(tableName: string) {
    assertNotLegacyTable(tableName);
    return (supabase as any).from(tableName);
  },
};
