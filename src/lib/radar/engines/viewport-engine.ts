/**
 * RadarViewportEngine — Manages viewport state for map/radar.
 * Decoupled from rendering layer. Injectable.
 */

export interface ViewportState {
  center: { lat: number; lng: number };
  zoom: number;
  bounds: { north: number; south: number; east: number; west: number } | null;
  bearing: number;
  pitch: number;
}

export type ViewportChangeHandler = (vp: ViewportState) => void;

export class RadarViewportEngine {
  private state: ViewportState;
  private listeners: ViewportChangeHandler[] = [];

  constructor(initial?: Partial<ViewportState>) {
    this.state = {
      center: initial?.center ?? { lat: 25.2048, lng: 55.2708 }, // Dubai default
      zoom: initial?.zoom ?? 13,
      bounds: initial?.bounds ?? null,
      bearing: initial?.bearing ?? 0,
      pitch: initial?.pitch ?? 0,
    };
  }

  getState(): Readonly<ViewportState> { return this.state; }

  update(patch: Partial<ViewportState>) {
    this.state = { ...this.state, ...patch };
    this.listeners.forEach(fn => fn(this.state));
  }

  onChanged(fn: ViewportChangeHandler): () => void {
    this.listeners.push(fn);
    return () => { this.listeners = this.listeners.filter(l => l !== fn); };
  }

  isInBounds(lat: number, lng: number): boolean {
    if (!this.state.bounds) return true;
    const { north, south, east, west } = this.state.bounds;
    return lat <= north && lat >= south && lng <= east && lng >= west;
  }

  fitToPoints(points: { lat: number; lng: number }[]) {
    if (!points.length) return;
    let north = -90, south = 90, east = -180, west = 180;
    for (const p of points) {
      if (p.lat > north) north = p.lat;
      if (p.lat < south) south = p.lat;
      if (p.lng > east) east = p.lng;
      if (p.lng < west) west = p.lng;
    }
    const pad = 0.01;
    this.update({
      center: { lat: (north + south) / 2, lng: (east + west) / 2 },
      bounds: { north: north + pad, south: south - pad, east: east + pad, west: west - pad },
    });
  }
}
