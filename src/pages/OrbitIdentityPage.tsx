import { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useOrbitIdentity } from "@/hooks/useOrbitIdentity";
import { useOrbitStore } from "@/stores/orbitStore";

/**
 * OrbitIdentityPage — displays canonical orbit profile from orbit_profiles_v2.
 * Legacy orbit_identity_profiles system has been removed.
 */
export default function OrbitIdentityPage() {
  const { user } = useAuth();
  const profile = useOrbitIdentity();
  const loading = useOrbitStore((s) => s.loading);
  const loadProfile = useOrbitStore((s) => s.loadProfile);

  useEffect(() => {
    if (user?.id && !profile) {
      void loadProfile(user.id);
    }
  }, [user?.id, profile, loadProfile]);

  return (
    <div className="app-mobile-page bg-background p-4 space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-foreground">Orbit ID</h1>
        {loading && <p className="text-muted-foreground">Loading...</p>}
        {!!profile && (
          <div className="space-y-1 text-sm text-muted-foreground">
            <p>Orbit ID: {profile.orbitId}</p>
            <p>Name: {profile.displayName ?? "—"}</p>
            <p>Role: {profile.role}</p>
            <p>Verification: Level {profile.verificationLevel}</p>
          </div>
        )}
        {!loading && !profile && (
          <p className="text-muted-foreground">No Orbit profile found. Sign in to create one.</p>
        )}
      </div>
    </div>
  );
}
