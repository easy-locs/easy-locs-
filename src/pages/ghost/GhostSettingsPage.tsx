/**
 * GhostSettingsPage — Ghost profile, alias, devices, tier management.
 */
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Shield, ArrowLeft, RotateCw, Smartphone, Trash2, ArrowUpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import {
  getOrCreateGhostProfile,
  rotateGhostAlias,
  upgradeToV3,
  getGhostDevices,
  revokeDevice,
  clearLocalGhostSession,
  type GhostTier,
} from "@/lib/ghost";
import { getGhostPolicy } from "@/lib/ghost/ghost-policy";
import { PageLoadingState } from "@/components/page-states";

export default function GhostSettingsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [devices, setDevices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      try {
        const p = await getOrCreateGhostProfile(user.id);
        setProfile(p);
        const d = await getGhostDevices(p.id);
        setDevices(d);
      } catch (e) {
        console.error("[ghost] settings_load_failed", e);
      } finally {
        setLoading(false);
      }
    })();
  }, [user?.id]);

  const handleRotateAlias = async () => {
    if (!profile) return;
    const updated = await rotateGhostAlias(profile.id);
    setProfile(updated);
  };

  const handleUpgrade = async () => {
    if (!profile) return;
    const updated = await upgradeToV3(profile.id);
    setProfile(updated);
  };

  const handleRevokeDevice = async (deviceId: string) => {
    if (!profile) return;
    await revokeDevice(deviceId, profile.id);
    setDevices(prev => prev.filter(d => d.id !== deviceId));
  };

  const handleLogout = () => {
    clearLocalGhostSession();
    navigate("/ghost/inbox");
  };

  if (loading) return <PageLoadingState title="Loading ghost settings..." />;

  const policy = profile ? getGhostPolicy(profile.tier as GhostTier) : null;

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-30 flex items-center gap-2 px-4 py-3 border-b border-border/40 bg-card/95 backdrop-blur-sm">
        <Button variant="ghost" size="icon" onClick={() => navigate("/ghost/inbox")}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <Shield className="w-5 h-5 text-primary" />
        <h1 className="text-lg font-bold text-foreground">Ghost Settings</h1>
      </div>

      <div className="p-4 space-y-6">
        {/* Profile */}
        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-foreground">Identity</h2>
          <div className="p-3 rounded-lg bg-card border border-border/30 space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground">Ghost ID</span>
              <span className="font-mono text-xs text-foreground">{profile?.ghost_id}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground">Alias</span>
              <span className="font-mono text-xs text-primary">{profile?.current_alias}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground">Version</span>
              <span className="text-xs text-foreground">v{profile?.alias_version}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground">Tier</span>
              <span className="text-xs font-bold text-primary uppercase">{profile?.tier}</span>
            </div>
            <Button variant="outline" size="sm" className="w-full mt-2" onClick={handleRotateAlias}>
              <RotateCw className="w-3 h-3 mr-1" /> Rotate Alias
            </Button>
          </div>
        </section>

        {/* Upgrade */}
        {profile?.tier === "v2" && (
          <section>
            <Button variant="default" className="w-full" onClick={handleUpgrade}>
              <ArrowUpCircle className="w-4 h-4 mr-2" /> Upgrade to Ghost V3
            </Button>
            <p className="text-[10px] text-muted-foreground mt-1">
              Shorter sessions, aggressive rotation, burn-after-read, device trust required
            </p>
          </section>
        )}

        {/* Policy info */}
        {policy && (
          <section className="space-y-2">
            <h2 className="text-sm font-semibold text-foreground">Active Policy</h2>
            <div className="p-3 rounded-lg bg-card border border-border/30 space-y-1 text-xs text-muted-foreground">
              <p>Session TTL: {Math.round(policy.sessionTtlMs / 60000)}m</p>
              <p>Message TTL: {policy.messageTtlSeconds ? `${policy.messageTtlSeconds}s` : "none"}</p>
              <p>Burn after read: {policy.burnAfterRead ? "yes" : "no"}</p>
              <p>Device trust: {policy.deviceTrustRequired ? "required" : "optional"}</p>
              <p>Max devices: {policy.maxActiveDevices}</p>
              <p>Anti-replay window: {Math.round(policy.antiReplayWindowMs / 1000)}s</p>
            </div>
          </section>
        )}

        {/* Devices */}
        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-foreground">Trusted Devices ({devices.length})</h2>
          {devices.map(d => (
            <div key={d.id} className="p-3 rounded-lg bg-card border border-border/30 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="text-xs font-mono text-foreground">{d.device_id.slice(0, 12)}...</p>
                  <p className="text-[10px] text-muted-foreground">
                    {d.trusted ? "✅ Trusted" : "⏳ Pending"} · Key v{d.key_version}
                  </p>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => handleRevokeDevice(d.id)}>
                <Trash2 className="w-3 h-3 text-destructive" />
              </Button>
            </div>
          ))}
        </section>

        {/* Session */}
        <section>
          <Button variant="destructive" size="sm" className="w-full" onClick={handleLogout}>
            End Ghost Session
          </Button>
        </section>
      </div>
    </div>
  );
}
