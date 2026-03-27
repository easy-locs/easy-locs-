import { supabase } from "@/integrations/supabase/client";
import { killLegacyAccess } from "./kill-legacy";

/**
 * V2-enforced DB accessor. Use instead of `supabase.from()` in all core code.
 * Blocks access to legacy tables when APP_MODE is V2_ONLY.
 */
export function v2db(table: string) {
  killLegacyAccess(table);
  return (supabase as any).from(table);
}
