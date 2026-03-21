import { V2AppShell as AppShell } from "@/components/shell/V2AppShell";
import { V2SystemAudit } from "@/components/debug/V2SystemAudit";
import { useLocationStore } from "@/stores/locationStore";
import { useGeolocation } from "@/hooks/useGeolocation";
import { useUiShellStore } from "@/stores/uiShellStore";
import { useCallStore } from "@/stores/callStore";

export default function V2TestPage() {
  const { requestLocation } = useGeolocation();
  const ui = useUiShellStore();
  const call = useCallStore();

  return (
    <AppShell
      header={
        <h1 className="text-sm font-bold text-foreground px-4 py-2">
          V2 Foundation Test
        </h1>
      }
      bottomNav={
        <div className="flex flex-wrap gap-2 p-2">
          <button
            className="px-3 py-1 text-xs rounded-full bg-primary text-primary-foreground"
            onClick={() => requestLocation()}
          >
            Refresh Geo
          </button>
          <button
            className="px-3 py-1 text-xs rounded-full bg-primary text-primary-foreground"
            onClick={() => ui.openCamera("qr")}
          >
            Open Camera
          </button>
          <button
            className="px-3 py-1 text-xs rounded-full bg-primary text-primary-foreground"
            onClick={() => call.startCall("orbit_peer_1", "audio")}
          >
            Start Call
          </button>
          <button
            className="px-3 py-1 text-xs rounded-full bg-secondary text-secondary-foreground"
            onClick={() => ui.setMapFullscreen(!ui.mapFullscreen)}
          >
            Toggle Map
          </button>
        </div>
      }
      mapLayer={
        <div className="flex items-center justify-center h-full bg-muted/50 text-muted-foreground text-sm">
          MAP LAYER
        </div>
      }
      callLayer={
        <div className="flex items-center justify-center h-full bg-background text-foreground text-sm">
          CALL LAYER
        </div>
      }
      cameraLayer={
        <div className="flex flex-col items-center justify-center h-full bg-background text-foreground">
          CAMERA LAYER - {ui.cameraMode}
          <button
            className="mt-2 px-3 py-1 text-xs rounded-full bg-destructive text-destructive-foreground"
            onClick={() => ui.closeCamera()}
          >
            Close
          </button>
        </div>
      }
    >
      <div className="p-4 pb-48 overflow-y-auto">
        <V2SystemAudit />
      </div>
    </AppShell>
  );
}
