import { useEffect, useMemo, useState } from "react";
import { getMyProfile } from "@/lib/auth/profile";
import { getMyWorkspaces } from "@/lib/workspace/workspace-core";

export function useActiveWorkspace() {
  const [profile, setProfile] = useState<any | null>(null);
  const [memberships, setMemberships] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    Promise.all([getMyProfile(), getMyWorkspaces()])
      .then(([p, ws]) => {
        if (!mounted) return;
        setProfile(p);
        setMemberships(ws);
      })
      .catch(() => {})
      .finally(() => {
        if (!mounted) return;
        setLoading(false);
      });

    return () => { mounted = false; };
  }, []);

  const activeWorkspace = useMemo(() => {
    if (!memberships.length) return null;
    const defaultId = profile?.default_workspace_id;
    return (
      memberships.find((m) => m.workspaces?.id === defaultId)?.workspaces ??
      memberships[0]?.workspaces ??
      null
    );
  }, [memberships, profile]);

  const activeRole = useMemo(() => {
    if (!activeWorkspace) return null;
    return memberships.find((m) => m.workspaces?.id === activeWorkspace.id)?.role ?? null;
  }, [memberships, activeWorkspace]);

  return { loading, profile, memberships, activeWorkspace, activeRole };
}
