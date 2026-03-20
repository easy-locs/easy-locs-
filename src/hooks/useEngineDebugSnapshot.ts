import { useEffect, useState } from "react";
import { getEngineRegistry } from "@/lib/engine/centralEngineRuntime";

export function useEngineDebugSnapshot(pollMs = 2000) {
  const [rows, setRows] = useState(getEngineRegistry());

  useEffect(() => {
    const run = () => setRows(getEngineRegistry());
    run();
    const timer = setInterval(run, pollMs);
    return () => clearInterval(timer);
  }, [pollMs]);

  return rows;
}
