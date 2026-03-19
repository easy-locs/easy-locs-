/**
 * LocationPermissionGate — Prompts user for geolocation permission before rendering children.
 */
import { useState, useEffect, useCallback, type ReactNode } from "react";
import { MapPin, ShieldAlert } from "lucide-react";

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
      setErrorMsg("La géolocalisation n'est pas supportée sur cet appareil.");
      return;
    }

    if (navigator.permissions) {
      navigator.permissions.query({ name: "geolocation" }).then((result) => {
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
          setErrorMsg("Vous avez refusé l'accès à la localisation.");
        } else {
          setStatus("error");
          setErrorMsg(err.message || "Impossible d'obtenir la position.");
        }
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, [onGranted]);

  if (status === "granted") return <>{children}</>;

  if (status === "checking") {
    return (
      <div className="flex flex-col items-center justify-center gap-3 p-8 min-h-[200px]">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-muted-foreground">Vérification de la localisation…</p>
      </div>
    );
  }

  if (status === "denied" || status === "error") {
    return (
      <div className="flex flex-col items-center justify-center gap-4 p-8 min-h-[200px] text-center">
        <ShieldAlert className="w-10 h-10 text-destructive" />
        <p className="text-sm font-medium text-foreground">
          {errorMsg || fallbackMessage || "Accès à la localisation refusé."}
        </p>
        <p className="text-xs text-muted-foreground max-w-xs">
          Activez la localisation dans les paramètres de votre navigateur puis rechargez la page.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="bg-primary text-primary-foreground rounded-lg px-4 py-2 text-sm font-medium"
        >
          Recharger
        </button>
      </div>
    );
  }

  // prompt
  return (
    <div className="flex flex-col items-center justify-center gap-4 p-8 min-h-[200px] text-center">
      <MapPin className="w-10 h-10 text-primary" />
      <p className="text-sm font-medium text-foreground">
        {fallbackMessage || "Cette fonctionnalité nécessite votre position."}
      </p>
      <p className="text-xs text-muted-foreground max-w-xs">
        Nous utilisons votre position uniquement pour améliorer votre expérience.
      </p>
      <button
        onClick={requestPermission}
        className="bg-primary text-primary-foreground rounded-lg px-5 py-2.5 text-sm font-medium"
      >
        Autoriser la localisation
      </button>
    </div>
  );
}
