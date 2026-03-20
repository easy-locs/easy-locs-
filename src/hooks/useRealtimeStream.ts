import { useEffect, useState } from "react";
import { subscribeToTable, unsubscribeFromTable } from "@/lib/realtime/realtimeEngine";

export function useRealtimeStream(key: string, table: string) {
  const [events, setEvents] = useState<any[]>([]);

  useEffect(() => {
    subscribeToTable(key, table, (payload) => {
      setEvents((prev) => [payload, ...prev].slice(0, 50));
    });

    return () => unsubscribeFromTable(key);
  }, [key, table]);

  return events;
}
