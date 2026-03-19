import { useEffect, useState } from "react";
import {
  clearDebugEvents,
  loadDebugEvents,
  subscribeDebugEvents,
  type DebugEventItem,
} from "@/lib/debug/runtime-debug-bus";

export function useRuntimeDebug() {
  const [events, setEvents] = useState<DebugEventItem[]>([]);

  useEffect(() => {
    const unsub = subscribeDebugEvents(setEvents);
    return () => { unsub(); };
  }, []);

  return {
    events,
    clear: clearDebugEvents,
  };
}
