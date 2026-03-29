/**
 * fx.repository — FX rate fetching via edge functions.
 */
import { supabase } from "@/integrations/supabase/client";

export async function getAuthToken() {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token || null;
}
