/**
 * MapTabPage — Map tab entry point with geo/auth debug overlay.
 */
import ExplorerMap from "@/components/map/ExplorerMap";
import { useAuth } from "@/contexts/AuthContext";
import { useLocationStore } from "@/stores/locationStore";
import { useState, useEffect } from "react";

export default function MapTabPage() {
  const { user, loading: authLoading, profileLoaded } = useAuth();
  const currentLocation = useLocationStore((s) => s.currentLocation);
  const permissionState = useLocationStore((s) => s.permissionState);
  const locLoading = useLocationStore((s) => s.loading);
  const isFallback = useLocationStore((s) => s.isFallback);
  const error = useLocationStore((s) => s.error);
  const [mapMounted, setMapMounted] = useState(false);

  useEffect(() => { setMapMounted(true); }, []);

  return (
    <>
      <ExplorerMap />
    </>
  );
}
