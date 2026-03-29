/**
 * lease-workflow.repository — Edge function calls for lease workflow.
 */
import { supabase } from "@/integrations/supabase/client";

export async function invokeLeaseWorkflow(body: Record<string, any>) {
  const { data, error } = await supabase.functions.invoke("lease-workflow", { body });
  if (error) throw error;
  return data;
}
