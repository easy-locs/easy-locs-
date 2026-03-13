/**
 * usePresenceStatus — Fetches live presence status for a list of user IDs.
 * Returns a map of userId -> status for rendering indicators.
 */
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface PresenceInfo {
  status: string;
  last_seen_at: string | null;
  display_name: string | null;
  avatar_url: string | null;
  verified: boolean;
}

export function usePresenceStatus(userIds: string[]) {
  const [presenceMap, setPresenceMap] = useState<Record<string, PresenceInfo>>({});

  const load = useCallback(async () => {
    if (!userIds.length) return;
    const uniqueIds = [...new Set(userIds)];
    const { data } = await supabase
      .from("user_presence")
      .select("user_id, status, last_seen_at, display_name, avatar_url, verified")
      .in("user_id", uniqueIds);
    if (data) {
      const map: Record<string, PresenceInfo> = {};
      data.forEach((d: any) => {
        map[d.user_id] = {
          status: d.status,
          last_seen_at: d.last_seen_at,
          display_name: d.display_name,
          avatar_url: d.avatar_url,
          verified: d.verified,
        };
      });
      setPresenceMap(map);
    }
  }, [userIds.join(",")]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!userIds.length) return;
    const iv = setInterval(load, 30_000);
    return () => clearInterval(iv);
  }, [load, userIds.length]);

  return presenceMap;
}

/** Small presence dot component */
export function PresenceDot({ status, size = 8 }: { status?: string; size?: number }) {
  if (!status) return null;
  const colors: Record<string, string> = {
    online: "hsl(142, 70%, 50%)",
    away: "hsl(45, 90%, 55%)",
    busy: "hsl(0, 70%, 60%)",
    in_call: "hsl(270, 80%, 65%)",
    dnd: "hsl(0, 70%, 50%)",
    offline: "hsl(0 0% 50% / 0.25)",
  };
  const color = colors[status] || colors.offline;
  return (
    <span
      className="rounded-full inline-block shrink-0"
      style={{
        width: size,
        height: size,
        background: color,
        boxShadow: status === "online" ? `0 0 6px ${color}` : undefined,
        border: "1.5px solid hsl(var(--hud-bg))",
      }}
    />
  );
}

export function presenceLabel(status?: string): string {
  if (!status) return "";
  const labels: Record<string, string> = {
    online: "Online",
    away: "Away",
    busy: "Busy",
    in_call: "In Call",
    dnd: "Do Not Disturb",
    offline: "Offline",
  };
  return labels[status] || status;
}
