/**
 * React hook for platform feature flags — loads on mount, auto-refreshes.
 */
import { useState, useEffect, useCallback } from "react";
import {
  loadPlatformFlags,
  getAllPlatformFlags,
  togglePlatformFlag,
  type PlatformFlag,
} from "@/lib/growth/feature-flag-registry";

export function usePlatformFlags() {
  const [flags, setFlags] = useState(getAllPlatformFlags());
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    await loadPlatformFlags();
    setFlags(getAllPlatformFlags());
    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const toggle = useCallback(async (key: PlatformFlag, enabled: boolean) => {
    await togglePlatformFlag(key, enabled);
    setFlags(getAllPlatformFlags());
  }, []);

  return { flags, loading, toggle, refresh };
}
