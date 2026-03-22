import { useEffect } from "react";
import { geoService } from "./geo-service";

export function GeoBoot() {
  useEffect(() => {
    geoService.start();
    return () => geoService.stop();
  }, []);
  return null;
}
