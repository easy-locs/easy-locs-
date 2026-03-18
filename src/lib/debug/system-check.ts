/**
 * System health check — verify connectivity to core services.
 */
import { supabase } from "@/integrations/supabase/client";

export interface HealthCheckResult {
  database: boolean;
  realtime: boolean;
  auth: boolean;
  timestamp: string;
}

export async function systemHealthCheck(): Promise<HealthCheckResult> {
  const result: HealthCheckResult = {
    database: false,
    realtime: false,
    auth: false,
    timestamp: new Date().toISOString(),
  };

  // Check database
  try {
    const { error } = await supabase.from("workspaces").select("id").limit(1);
    result.database = !error;
  } catch {
    result.database = false;
  }

  // Check realtime
  try {
    const channel = supabase.channel("health-check");
    result.realtime = true;
    channel.unsubscribe();
  } catch {
    result.realtime = false;
  }

  // Check auth
  try {
    const { data } = await supabase.auth.getSession();
    result.auth = !!data.session;
  } catch {
    result.auth = false;
  }

  return result;
}
