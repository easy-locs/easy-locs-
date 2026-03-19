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
    setEvents(loadDebugEvents());
    return subscribeDebugEvents(setEvents);
  }, []);

  return {
    events,
    clear: clearDebugEvents,
  };
}
