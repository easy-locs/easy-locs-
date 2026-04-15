import { useState, useCallback, useRef } from "react";
import { trackMapError, type MapErrorContext } from "@/lib/analytics/map-error-analytics";

export interface MapErrorHandler {
  mapError: string | null;
  handleMapError: (message: string, context?: Partial<Omit<MapErrorContext, "component" | "errorMessage">>) => void;
  clearMapError: () => void;
}

export function useMapErrorHandler(component: string): MapErrorHandler {
  const [mapError, setMapError] = useState<string | null>(null);
  const componentRef = useRef(component);
  componentRef.current = component;

  const handleMapError = useCallback(
    (message: string, context?: Partial<Omit<MapErrorContext, "component" | "errorMessage">>) => {
      trackMapError({
        component: componentRef.current,
        errorMessage: message,
        ...context,
      });
      setMapError(message);
    },
    [],
  );

  const clearMapError = useCallback(() => {
    setMapError(null);
  }, []);

  return { mapError, handleMapError, clearMapError };
}
