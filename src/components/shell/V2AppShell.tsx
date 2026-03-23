import type { ReactNode } from "react";
import { Z } from "@/lib/types/app";
import { useUiShellStore } from "@/stores/uiShellStore";

type Props = {
  children: ReactNode;
  header?: ReactNode;
  bottomNav?: ReactNode;
  leftPanel?: ReactNode;
  rightPanel?: ReactNode;
  overlay?: ReactNode;
  mapLayer?: ReactNode;
  callLayer?: ReactNode;
  cameraLayer?: ReactNode;
};

export function V2AppShell({
  children,
  header,
  bottomNav,
  leftPanel,
  rightPanel,
  overlay,
  mapLayer,
  callLayer,
  cameraLayer,
}: Props) {
  const mapFullscreen = useUiShellStore((s) => s.mapFullscreen);
  const callFullscreen = useUiShellStore((s) => s.callFullscreen);
  const cameraMode = useUiShellStore((s) => s.cameraMode);

  return (
    <div className="relative min-h-[100dvh] flex flex-col bg-background" style={{ zIndex: Z.base }}>
      {header && (
        <div className="sticky top-0" style={{ zIndex: Z.header }}>
          {header}
        </div>
      )}

      <div className="flex-1 overflow-y-auto">{children}</div>

      {leftPanel && (
        <div className="fixed inset-y-0 left-0 w-72" style={{ zIndex: Z.sidePanel }}>
          {leftPanel}
        </div>
      )}

      {rightPanel && (
        <div className="fixed inset-y-0 right-0 w-72" style={{ zIndex: Z.sidePanel }}>
          {rightPanel}
        </div>
      )}

      {overlay && (
        <div className="fixed inset-0" style={{ zIndex: Z.overlay }}>
          {overlay}
        </div>
      )}

      {mapLayer && (
        <div
          className="fixed inset-0"
          style={{ zIndex: Z.map, display: mapFullscreen ? "block" : "none" }}
        >
          {mapLayer}
        </div>
      )}

      {callLayer && (
        <div
          className="fixed inset-0"
          style={{ zIndex: Z.callScreen, display: callFullscreen ? "block" : "none" }}
        >
          {callLayer}
        </div>
      )}

      {cameraMode && cameraLayer && (
        <div className="fixed inset-0" style={{ zIndex: Z.cameraFullscreen }}>
          {cameraLayer}
        </div>
      )}

      {bottomNav && (
        <div className="sticky bottom-0" style={{ zIndex: Z.bottomNav }}>
          {bottomNav}
        </div>
      )}
    </div>
  );
}
