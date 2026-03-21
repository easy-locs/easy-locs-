import { useEffect } from "react";
import { useLocationStore } from "@/stores/locationStore";
import { useOrbitStore } from "@/stores/orbitStore";
import { useWalletStore } from "@/stores/walletStore";
import { usePermissionStore } from "@/stores/permissionStore";
import { useUiShellStore } from "@/stores/uiShellStore";

export function V2SystemAudit() {
  const currentLocation = useLocationStore((s) => s.currentLocation);
  const permissionState = useLocationStore((s) => s.permissionState);
  const accuracyLevel = useLocationStore((s) => s.accuracyLevel);
  const isFallback = useLocationStore((s) => s.isFallback);
  const orbit = useOrbitStore();
  const wallet = useWalletStore();
  const permissions = usePermissionStore();
  const ui = useUiShellStore();

  useEffect(() => {
    void permissions.checkGeolocationPermission();
  }, [permissions]);

  const sections = [
    { title: "Orbit", data: orbit.profile },
    { title: "Wallet", data: wallet.wallet },
    {
      title: "Geo",
      data: {
        permission: permissionState,
        currentLocation,
        accuracyLevel,
        isFallback,
      },
    },
    {
      title: "Permissions",
      data: {
        camera: permissions.camera,
        microphone: permissions.microphone,
        geolocation: permissions.geolocation,
        contacts: permissions.contacts,
        notifications: permissions.notifications,
      },
    },
    {
      title: "UI Shell",
      data: {
        leftPanel: ui.leftPanel,
        rightPanel: ui.rightPanel,
        cameraMode: ui.cameraMode,
        callFullscreen: ui.callFullscreen,
        mapFullscreen: ui.mapFullscreen,
      },
    },
  ];

  return (
    <div className="space-y-4 p-4">
      {sections.map((s) => (
        <div key={s.title} className="rounded-2xl border border-border/30 bg-card p-4">
          <h3 className="text-sm font-bold text-foreground mb-2">{s.title}</h3>
          <pre className="text-[11px] text-muted-foreground whitespace-pre-wrap overflow-x-auto">
            {JSON.stringify(s.data, null, 2)}
          </pre>
        </div>
      ))}
    </div>
  );
}