/**
 * LocationPermissionGate — Non-blocking wrapper that reads from canonical locationStore.
 * Never blocks UI — always renders children. Shows subtle inline status only.
 */
import { type ReactNode } from "react";
import { useLocationStore } from "@/stores/locationStore";

interface Props {
  children: ReactNode;
  fallbackMessage?: string;
  allowApproximate?: boolean;
  onGranted?: (position: GeolocationPosition) => void;
  onFallback?: () => void;
}

export default function LocationPermissionGate({ children }: Props) {
  // Non-blocking: always render children. locationStore is initialized by GeoBootstrap at app root.
  return <>{children}</>;
}
