import { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useOrbitIdentity } from "@/hooks/useOrbitIdentity";
import { useOrbitProfileStore } from "@/stores/orbit-profile.internal";

export default function OrbitIdentityPage() {
  const { user } = useAuth();
  const identity = useOrbitIdentity();
  const loading = useOrbitProfileStore((s) => s.loading);
  const loadProfile = useOrbitProfileStore((s) => s.loadProfile);

  useEffect(() => {
    if (user?.id && !identity) {
      void loadProfile(user.id);
    }
  }, [user?.id, identity, loadProfile]);

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
