import { BaseEngine, type EngineTickResult } from "../core/base-engine";

export class LocationIntegrityEngine extends BaseEngine {
  private lastPosition: { lat: number; lng: number; ts: number } | null = null;

  constructor() {
    super({
      id: "radar-location-integrity",
      name: "Location Integrity Engine",
      category: "radar",
      intervalMs: 30_000,
    });
  }

  async tick(): Promise<EngineTickResult> {
    const findings: string[] = [];

    const mapEls = document.querySelectorAll("[data-lat][data-lng]");
    const positions: Array<{ lat: number; lng: number }> = [];
    mapEls.forEach(el => {
      const lat = parseFloat(el.getAttribute("data-lat") || "");
      const lng = parseFloat(el.getAttribute("data-lng") || "");
      if (!isNaN(lat) && !isNaN(lng)) positions.push({ lat, lng });
    });

    for (const pos of positions) {
      if (pos.lat < -90 || pos.lat > 90 || pos.lng < -180 || pos.lng > 180) {
        findings.push(`Invalid coordinates: ${pos.lat}, ${pos.lng}`);
      }
      if (pos.lat === 0 && pos.lng === 0) {
        findings.push("Null Island coordinates detected (0,0)");
      }
    }

    if (this.lastPosition && positions.length > 0) {
      const current = positions[0];
      const distance = this.haversine(this.lastPosition.lat, this.lastPosition.lng, current.lat, current.lng);
      const timeDiff = (Date.now() - this.lastPosition.ts) / 1000;
      if (timeDiff > 0 && distance / timeDiff > 100) {
        findings.push(`Teleportation detected: ${Math.round(distance)}m in ${Math.round(timeDiff)}s`);
      }
    }

    if (positions.length > 0) {
      this.lastPosition = { ...positions[0], ts: Date.now() };
    }

    return { level: findings.length > 0 ? "detect" : "observe", findings: findings.length, actions: [], duration: 0 };
  }

  private haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371e3;
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }
}
