import { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useOrbitIdentity, useOrbitLoading, loadOrbitProfile } from "@/hooks/useOrbitIdentity";
import { useUiEngine } from "@/hooks/useUiEngine";

export default function OrbitIdentityPage() {
  useUiEngine("orbit-identity");
  const { user } = useAuth();
  const identity = useOrbitIdentity();
  const loading = useOrbitLoading();

  useEffect(() => {
    if (user?.id && !identity) {
      void loadOrbitProfile(user.id);
    }
  }, [user?.id, identity]);

  return (
    <div className="app-mobile-page bg-background p-4 space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-foreground">Orbit ID</h1>
        {loading && <p className="text-muted-foreground">Loading...</p>}
        {!!identity && (
          <div className="space-y-1 text-sm text-muted-foreground">
            <p>Orbit ID: {identity.orbitId}</p>
            <p>Name: {identity.displayName ?? "—"}</p>
            <p>Role: {identity.role}</p>
          </div>
        )}
        {!loading && !identity && (
          <p className="text-muted-foreground">No Orbit profile found. Sign in to create one.</p>
        )}
      </div>
    </div>
  );
}
