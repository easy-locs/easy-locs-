import { useEffect } from "react";
// debugCommsStore removed (Batch A purge)
import { useOrbitStore } from "@/stores/orbitStore";
import { useLocationStore } from "@/stores/locationStore";
import { cn } from "@/lib/utils";

function StatusDot({ ok }: { ok: boolean }) {
  return (
    <span
      className={cn(
        "inline-block h-2 w-2 rounded-full shrink-0",
        ok ? "bg-emerald-500" : "bg-destructive/60"
      )}
    />
  );
}

function Row({ label, value }: { label: string; value: any }) {
  const display =
    value === null || value === undefined || value === ""
      ? "—"
      : String(value);
  const isOk =
    value === true ||
    (typeof value === "string" && !["new", "denied", "—"].includes(value));

  return (
    <div className="flex items-center justify-between py-1.5 border-b border-border/10 last:border-0">
      <span className="text-[11px] text-muted-foreground font-medium">{label}</span>
      <span className="flex items-center gap-1.5 text-[11px] font-semibold text-foreground tabular-nums">
        <StatusDot ok={isOk} />
        {display}
      </span>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-3">
      <p className="text-[10px] uppercase tracking-wider font-bold text-primary/70 mb-1">{title}</p>
      <div className="rounded-xl bg-card border border-border/20 px-3 py-1">
        {children}
      </div>
    </div>
  );
}

export function CommsDiagnosticPanel() {
  const orbit = useOrbitStore((s) => s.profile);
  const currentLocation = useLocationStore((s) => s.currentLocation);
  const permissionState = useLocationStore((s) => s.permissionState);
  const debug = useDebugCommsStore();

  useEffect(() => {
    debug.setIdentity({
      orbitId: orbit?.orbitId ?? null,
      email: (orbit as any)?.email ?? null,
    });
    debug.setGeo({
      geoPermission: permissionState ?? null,
      geoLat: currentLocation?.lat ?? null,
      geoLng: currentLocation?.lng ?? null,
    });
  }, [orbit?.orbitId, (orbit as any)?.email, currentLocation?.lat, currentLocation?.lng, permissionState]);

  return (
    <div className="p-4 max-w-md mx-auto">
      <h2 className="text-sm font-bold text-foreground mb-4">🔍 Comms Diagnostic</h2>

      <Section title="Identity">
        <Row label="Orbit ID" value={debug.orbitId} />
        <Row label="Email" value={debug.email} />
      </Section>

      <Section title="Conversation">
        <Row label="Conversation" value={debug.conversationId} />
        <Row label="Peer Orbit" value={debug.peerOrbitId} />
      </Section>

      <Section title="Last Message">
        <Row label="ID" value={debug.lastMessageId} />
        <Row label="Body" value={debug.lastMessageBody} />
        <Row label="At" value={debug.lastMessageCreatedAt} />
      </Section>

      <Section title="Last Call">
        <Row label="Session" value={debug.lastCallSessionId} />
        <Row label="Status" value={debug.lastCallStatus} />
        <Row label="Type" value={debug.lastCallType} />
      </Section>

      <Section title="Realtime">
        <Row label="Messages" value={debug.realtimeMessagesReady} />
        <Row label="Calls" value={debug.realtimeCallsReady} />
        <Row label="Signals" value={debug.realtimeSignalsReady} />
      </Section>

      <Section title="WebRTC">
        <Row label="Connection" value={debug.webrtcConnectionState} />
        <Row label="ICE Connection" value={debug.webrtcIceConnectionState} />
        <Row label="ICE Gathering" value={debug.webrtcIceGatheringState} />
        <Row label="Relay (TURN)" value={debug.hasRelayCandidate} />
      </Section>

      <Section title="TURN">
        <Row label="Fetched" value={debug.turnFetched} />
        <Row label="Servers" value={debug.turnServerCount} />
      </Section>

      <Section title="Geolocation">
        <Row label="Permission" value={debug.geoPermission} />
        <Row label="Lat" value={debug.geoLat?.toFixed(5)} />
        <Row label="Lng" value={debug.geoLng?.toFixed(5)} />
      </Section>
    </div>
  );
}
