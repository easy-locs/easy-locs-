import { useGeoStore, type GeoPermission } from "./geo-store";
import { getIPLocation } from "./ip-fallback";
import { platformBus } from "@/lib/shared/platform-bus";

class GeoService {
  private _retryTimer: ReturnType<typeof setTimeout> | null = null;
  private _fallbackApplied = false;

  private async probePermission(): Promise<GeoPermission | null> {
    try {
      if (!navigator.permissions?.query) return null;
      const result = await navigator.permissions.query({ name: "geolocation" as PermissionName });
      if (result.state === "granted") return "granted";
      if (result.state === "denied") return "denied";
      return "prompt";
    } catch {
      return null;
    }
  }

  /** Apply IP-based fallback location */
  private async applyFallback(reason: string) {
    if (this._fallbackApplied) return;
    this._fallbackApplied = true;

    try {
      const ip = await getIPLocation();
      const current = useGeoStore.getState();
      // Don't overwrite a real GPS fix
      if (current.point && current.source === "gps") return;

      useGeoStore.getState().setStatePartial({
        ready: true,
        loading: false,
        point: {
          lat: ip.lat,
          lng: ip.lng,
          accuracy: null,
          heading: null,
          speed: null,
          timestamp: Date.now(),
        },
        source: ip.source,
        city: ip.city,
        country: ip.country,
        error: reason,
      });

      platformBus.emit("geo.position.updated", {
        lat: ip.lat,
        lng: ip.lng,
        source: "ip",
        city: ip.city,
        country: ip.country,
      }, "geo-service");
    } catch {
      // Even IP failed — use hardcoded default
      const { getDefaultFallback } = await import("./ip-fallback");
      const fb = getDefaultFallback();
      useGeoStore.getState().setStatePartial({
        ready: true,
        loading: false,
        point: {
          lat: fb.lat,
          lng: fb.lng,
          accuracy: null,
          heading: null,
          speed: null,
          timestamp: Date.now(),
        },
        source: "fallback",
        city: fb.city,
        country: fb.country,
        error: reason,
      });
    }
  }

  async start(allowPrompt = false) {
    const state = useGeoStore.getState();
    if (state.tracking) return;

    if (!("geolocation" in navigator)) {
      useGeoStore.getState().setStatePartial({
        error: "Geolocation not supported",
        ready: true,
        loading: false,
      });
      await this.applyFallback("Geolocation not supported");
      return;
    }

    const permission = await this.probePermission();
    if (!allowPrompt && permission && permission !== "granted") {
      useGeoStore.getState().setStatePartial({
        ready: true,
        loading: false,
        tracking: false,
        permission,
        error: permission === "denied" ? "Location access denied" : null,
      });

      platformBus.emit("geo.permission.changed", { permission }, "geo-service");

      if (permission === "denied") {
        await this.applyFallback("Location access denied");
      }
      return;
    }

    useGeoStore.getState().setStatePartial({
      loading: true,
      error: null,
    });

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        this._fallbackApplied = false; // GPS recovered
        useGeoStore.getState().setStatePartial({
          ready: true,
          loading: false,
          permission: "granted",
          tracking: true,
          source: "gps",
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

        platformBus.emit("geo.position.updated", {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          source: "gps",
        }, "geo-service");
        platformBus.emit("geo.permission.changed", { permission: "granted" }, "geo-service");

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

        platformBus.emit("geo.permission.changed", { permission }, "geo-service");

        // Apply fallback for denied or timeout
        void this.applyFallback(err.message || "Location error");

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
  forceRetry(allowPrompt = true) {
    this.stop();
    this._fallbackApplied = false;
    const current = useGeoStore.getState();
    // Only reset permission if not already granted (avoid losing valid state)
    if (current.permission !== "granted") {
      useGeoStore.getState().setStatePartial({
        error: null,
        permission: "unknown",
      });
    } else {
      useGeoStore.getState().setStatePartial({ error: null });
    }
    void this.start(allowPrompt);
  }

  getCurrent() {
    return useGeoStore.getState().point;
  }

  getSource() {
    return useGeoStore.getState().source;
  }
}

export const geoService = new GeoService();
