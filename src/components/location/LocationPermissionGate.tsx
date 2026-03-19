/**
 * LocationPermissionGate — Prompts user for geolocation permission before rendering children.
 */
import { useState, useEffect, useCallback, type ReactNode } from "react";
import { MapPin, ShieldAlert } from "lucide-react";
import { PageLoadingState } from "@/components/page-states";

type PermissionStatus = "prompt" | "granted" | "denied" | "checking" | "error";

interface Props {
  children: ReactNode;
  fallbackMessage?: string;
  onGranted?: (position: GeolocationPosition) => void;
}

export default function LocationPermissionGate({ children, fallbackMessage, onGranted }: Props) {
  const [status, setStatus] = useState<PermissionStatus>("checking");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

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
        setStatus("granted");
        onGranted?.(pos);
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setStatus("denied");
          setErrorMsg("Location access was denied.");
        } else {
          setStatus("error");
          setErrorMsg(err.message || "Unable to get your location.");
        }
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, [onGranted]);

  if (status === "granted") return <>{children}</>;

  if (status === "checking") {
    return <PageLoadingState title="Checking location…" />;
  }

  if (status === "denied" || status === "error") {
    return (
      <div className="flex flex-col items-center justify-center gap-4 p-8 min-h-[200px] text-center">
        <ShieldAlert className="w-10 h-10 text-destructive" />
        <p className="text-sm font-medium text-foreground">
          {errorMsg || fallbackMessage || "Location access denied."}
        </p>
        <p className="text-xs text-muted-foreground max-w-xs">
          Enable location in your browser settings then reload the page.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="bg-primary text-primary-foreground rounded-lg px-4 py-2 text-sm font-medium"
        >
          Reload
        </button>
      </div>
    );
  }

  // prompt
  return (
    <div className="flex flex-col items-center justify-center gap-4 p-8 min-h-[200px] text-center">
      <MapPin className="w-10 h-10 text-primary" />
      <p className="text-sm font-medium text-foreground">Allow location</p>
      <p className="text-xs text-muted-foreground max-w-xs">
        {fallbackMessage || "This feature requires your location."}
      </p>
      <button
        onClick={requestPermission}
        className="bg-primary text-primary-foreground rounded-lg px-5 py-2.5 text-sm font-medium"
      >
        Allow Location
      </button>
    </div>
  );
}
