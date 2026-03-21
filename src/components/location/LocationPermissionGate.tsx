/**
 * LocationPermissionGate — Prompts user for geolocation permission before rendering children.
 * Enhanced with explicit accuracy classification and retry/fallback UX.
 */
import { useState, useEffect, useCallback, type ReactNode } from "react";
import { MapPin, ShieldAlert, RefreshCw, Search } from "lucide-react";
import { PageLoadingState } from "@/components/page-states";
import { useLocationStore, classifyAccuracy, type AccuracyLevel } from "@/stores/locationStore";

type PermissionStatus = "prompt" | "granted" | "denied" | "checking" | "error" | "timeout";

interface Props {
  children: ReactNode;
  fallbackMessage?: string;
  /** Allow approximate/fallback locations to pass through */
  allowApproximate?: boolean;
  onGranted?: (position: GeolocationPosition) => void;
  onFallback?: () => void;
}

export default function LocationPermissionGate({
  children,
  fallbackMessage,
  allowApproximate = true,
  onGranted,
  onFallback,
}: Props) {
  const [status, setStatus] = useState<PermissionStatus>("checking");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [accuracy, setAccuracy] = useState<AccuracyLevel>("fallback");
  const setCurrentLocation = useLocationStore((s) => s.setCurrentLocation);
  const setPermissionState = useLocationStore((s) => s.setPermissionState);

  useEffect(() => {
    if (!navigator.geolocation) {
      setStatus("error");
      setErrorMsg("Geolocation is not supported on this device.");
      return;
    }

    if (navigator.permissions) {
      navigator.permissions.query({ name: "geolocation" as PermissionName }).then((result) => {
        setStatus(result.state as PermissionStatus);
        result.onchange = () => setStatus(result.state as PermissionStatus);
      }).catch(() => setStatus("prompt"));
    } else {
      setStatus("prompt");
    }
  }, []);

  const requestPermission = useCallback(() => {
    setStatus("checking");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const acc = classifyAccuracy(pos.coords.accuracy);
        setAccuracy(acc);
        setStatus("granted");
        setCurrentLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          timestamp: new Date().toISOString(),
        });
        setPermissionState("granted");
        onGranted?.(pos);
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setStatus("denied");
          setErrorMsg("Location access was denied.");
          setPermissionState("denied");
        } else if (err.code === err.TIMEOUT) {
          setStatus("timeout");
          setErrorMsg("Location request timed out. Try again.");
          setPermissionState("timeout");
        } else {
          setStatus("error");
          setErrorMsg(err.message || "Unable to get your location.");
          setPermissionState("unavailable");
        }
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, [onGranted, setCurrentLocation, setPermissionState]);

  if (status === "granted") return <>{children}</>;

  if (status === "checking") {
    return <PageLoadingState title="Checking location…" />;
  }

  if (status === "denied" || status === "error" || status === "timeout") {
    return (
      <div className="flex flex-col items-center justify-center gap-4 p-8 min-h-[200px] text-center">
        <ShieldAlert className="w-10 h-10 text-destructive" />
        <p className="text-sm font-medium text-foreground">
          {errorMsg || fallbackMessage || "Location access denied."}
        </p>
        <p className="text-xs text-muted-foreground max-w-xs">
          {status === "timeout"
            ? "Your location request timed out. Check your connection and try again."
            : "Enable location in your browser settings or search manually."
          }
        </p>
        <div className="flex gap-2">
          {status === "timeout" && (
            <button
              onClick={requestPermission}
              className="flex items-center gap-1.5 bg-primary text-primary-foreground rounded-lg px-4 py-2 text-sm font-medium"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Retry
            </button>
          )}
          {allowApproximate && (
            <button
              onClick={() => {
                setStatus("granted");
                onFallback?.();
              }}
              className="flex items-center gap-1.5 bg-secondary text-secondary-foreground rounded-lg px-4 py-2 text-sm font-medium"
            >
              <Search className="h-3.5 w-3.5" />
              Search manually
            </button>
          )}
          {status !== "timeout" && (
            <button
              onClick={() => window.location.reload()}
              className="bg-primary text-primary-foreground rounded-lg px-4 py-2 text-sm font-medium"
            >
              Reload
            </button>
          )}
        </div>
      </div>
    );
  }

  // prompt
  return (
    <div className="flex flex-col items-center justify-center gap-4 p-8 min-h-[200px] text-center">
      <MapPin className="w-10 h-10 text-primary" />
      <p className="text-sm font-medium text-foreground">Allow location</p>
      <p className="text-xs text-muted-foreground max-w-xs">
        {fallbackMessage || "This feature requires your location for the best experience."}
      </p>
      <div className="flex gap-2">
        <button
          onClick={requestPermission}
          className="bg-primary text-primary-foreground rounded-lg px-5 py-2.5 text-sm font-medium"
        >
          Allow Location
        </button>
        {allowApproximate && (
          <button
            onClick={() => {
              setStatus("granted");
              onFallback?.();
            }}
            className="bg-secondary text-secondary-foreground rounded-lg px-5 py-2.5 text-sm font-medium"
          >
            Skip
          </button>
        )}
      </div>
    </div>
  );
}
