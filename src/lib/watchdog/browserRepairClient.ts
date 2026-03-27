import { supabase } from "@/integrations/supabase/client";
import { platformBus } from "@/lib/shared/platform-bus";
import { APP_EVENTS } from "@/lib/platform/events";

export async function triggerBrowserRepairRun(scope: string = "full") {
  const { data, error } = await supabase.functions.invoke(
    "browser-user-repair-engine",
    {
      body: {
        scope,
        dryRun: false,
      },
    }
  );

  if (error) throw error;

  platformBus.emit(
    APP_EVENTS.BROWSER_REPAIR_RUN_COMPLETED,
    { scope, result: data },
    "browser_repair"
  );

  platformBus.emit(APP_EVENTS.DASHBOARD_REFRESH, { scope }, "browser_repair");
  platformBus.emit(APP_EVENTS.NOTIFICATIONS_REFRESH, { scope }, "browser_repair");

  return data;
}
