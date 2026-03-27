import { useEffect, useState } from "react";
import { platformBus } from "@/lib/shared/platform-bus";
import { PLATFORM_EVENTS_V2 } from "@/lib/shared/platform-events-v2";

export function useDashboardSmartCounters(loadCounters: () => Promise<any>) {
  const [counters, setCounters] = useState<any>(null);

  async function refresh() {
    const next = await loadCounters();
    setCounters(next);
  }

  useEffect(() => {
    void refresh();
    const unsubs = [
      platformBus.on(PLATFORM_EVENTS_V2.DASHBOARD_REFRESH, () => { void refresh(); }),
      platformBus.on(PLATFORM_EVENTS_V2.DASHBOARD_COUNTERS_REFRESH, () => { void refresh(); }),
      platformBus.on("system:sync_completed", () => { void refresh(); }),
    ];
    return () => { unsubs.forEach((u) => u()); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { counters, refresh };
}
