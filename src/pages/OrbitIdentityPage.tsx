import { useEffect, useState } from "react";
import { generateOrbitKeyPair, saveOrbitPrivateKey } from "@/lib/orbit/device-crypto";
import { getOrCreateOrbitIdentity, registerOrbitDeviceKey, updateOrbitPrivacy } from "@/lib/orbit/orbit-id";
import { useAuth } from "@/contexts/AuthContext";

export default function OrbitIdentityPage() {
  const { user } = useAuth();
  const [identity, setIdentity] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    getOrCreateOrbitIdentity({ userId: user.id, displayName: "Orbit User" })
      .then(setIdentity)
      .finally(() => setLoading(false));
  }, [user?.id]);

  const enableGhost = async () => {
    if (!identity) return;
    const updated = await updateOrbitPrivacy({
      identityId: identity.id,
      anonymityMode: true,
      discoverable: false,
      displayName: "Ghost",
    });
    setIdentity(updated);
  };

  const generateKeys = async () => {
    if (!identity) return;
    const { publicKey, privateKey } = await generateOrbitKeyPair();
    saveOrbitPrivateKey(identity.id, privateKey);
    await registerOrbitDeviceKey({
      identityId: identity.id,
      deviceLabel: navigator.userAgent.slice(0, 60),
      publicKey: JSON.stringify(publicKey),
      algo: "ECDH-P256",
    });
  };

  return (
    <div className="min-h-screen bg-background p-4 space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-foreground">Orbit ID</h1>
        {loading && <p className="text-muted-foreground">Loading...</p>}
        {!!identity && (
          <div className="space-y-1 text-sm text-muted-foreground">
            <p>handle: {identity.public_handle}</p>
            <p>name: {identity.display_name}</p>
            <p>ghost mode: {identity.anonymity_mode ? "on" : "off"}</p>
            <p>discoverable: {identity.discoverable ? "yes" : "no"}</p>
            <p>verification: {identity.verification_level}</p>
          </div>
        )}
      </div>

      <div className="flex gap-3">
        <button onClick={generateKeys} className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
          Generate device key
        </button>
        <button onClick={enableGhost} className="rounded-xl border border-border bg-background px-4 py-2 text-sm font-semibold text-foreground">
          Enable Ghost mode
        </button>
      </div>
    </div>
  );
}
