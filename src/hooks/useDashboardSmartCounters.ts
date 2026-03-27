import { useEffect, useState } from "react";
import { platformBus } from "@/lib/shared/platform-bus";

export function useDashboardSmartCounters(loadCounters: () => Promise<any>) {
  const [counters, setCounters] = useState<any>(null);

  async function refresh() {
    const next = await loadCounters();
    setCounters(next);
  }

  useEffect(() => {
    void refresh();
    const off = platformBus.on("system:sync_completed", () => { void refresh(); });
    return () => { off(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { counters, refresh };
}
