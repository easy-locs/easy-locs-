import { useGeoStore, type GeoPermission } from "./geo-store";

class GeoService {
  private _retryTimer: ReturnType<typeof setTimeout> | null = null;

  start() {
    const state = useGeoStore.getState();
    if (state.tracking) return;

    if (!("geolocation" in navigator)) {
      useGeoStore.getState().setStatePartial({
        error: "Geolocation not supported",
        ready: true,
        loading: false,
      });
      return;
    }

    useGeoStore.getState().setStatePartial({
      loading: true,
      error: null,
    });

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        useGeoStore.getState().setStatePartial({
          ready: true,
          loading: false,
          permission: "granted",
          tracking: true,
          point: {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: pos.coords.accuracy ?? null,
            heading: pos.coords.heading ?? null,
            speed: pos.coords.speed ?? null,
            timestamp: pos.timestamp,
          },
          error: null,
        });
        // Clear any pending retry
        if (this._retryTimer) {
          clearTimeout(this._retryTimer);
          this._retryTimer = null;
        }
      },
      (err) => {
        let permission: GeoPermission = "unknown";
        if (err.code === 1) permission = "denied";

        const current = useGeoStore.getState();
        // Don't regress if we already have a valid point
        if (current.point && current.permission === "granted") {
          console.warn("[GeoService] transient error ignored — valid point exists");
          return;
        }

        useGeoStore.getState().setStatePartial({
          ready: true,
          loading: false,
          tracking: false,
          permission,
          error: err.message || "Location error",
        });

        // Auto-retry after 3s for non-denial errors
        if (err.code !== 1 && !this._retryTimer) {
          this._retryTimer = setTimeout(() => {
            this._retryTimer = null;
            this.forceRetry();
          }, 3000);
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 3000,
      }
    );

    useGeoStore.getState().setStatePartial({
      watchId,
      tracking: true,
    });
  }

  stop() {
    const { watchId } = useGeoStore.getState();
    if (watchId !== null) navigator.geolocation.clearWatch(watchId);
    if (this._retryTimer) {
      clearTimeout(this._retryTimer);
      this._retryTimer = null;
    }
    useGeoStore.getState().setStatePartial({
      watchId: null,
      tracking: false,
    });
  }

  /** Force a fresh GPS attempt — stops current watch and restarts */
  forceRetry() {
    this.stop();
    useGeoStore.getState().setStatePartial({
      error: null,
      permission: "unknown",
    });
    this.start();
  }

  getCurrent() {
    return useGeoStore.getState().point;
  }
}

export const geoService = new GeoService();
