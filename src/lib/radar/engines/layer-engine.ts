/**
 * RadarLayerEngine — Manages visual layer registration, visibility, ordering.
 * Decoupled from map library. Injectable.
 */

export interface RadarLayer {
  key: string;
  label: string;
  visible: boolean;
  zIndex: number;
  opacity: number;
  clusterable: boolean;
  iconSet?: string;
  colorScheme?: string;
}

export type LayerChangeHandler = (layers: RadarLayer[]) => void;

export class RadarLayerEngine {
  private layers = new Map<string, RadarLayer>();
  private listeners: LayerChangeHandler[] = [];

  register(layer: RadarLayer) {
    this.layers.set(layer.key, layer);
    this.notify();
  }

  unregister(key: string) {
    this.layers.delete(key);
    this.notify();
  }

  setVisible(key: string, visible: boolean) {
    const l = this.layers.get(key);
    if (l) { l.visible = visible; this.notify(); }
  }

  setOpacity(key: string, opacity: number) {
    const l = this.layers.get(key);
    if (l) { l.opacity = Math.max(0, Math.min(1, opacity)); this.notify(); }
  }

  reorder(key: string, zIndex: number) {
    const l = this.layers.get(key);
    if (l) { l.zIndex = zIndex; this.notify(); }
  }

  getAll(): RadarLayer[] {
    return [...this.layers.values()].sort((a, b) => a.zIndex - b.zIndex);
  }

  getVisible(): RadarLayer[] {
    return this.getAll().filter(l => l.visible);
  }

  get(key: string): RadarLayer | undefined {
    return this.layers.get(key);
  }

  onChanged(fn: LayerChangeHandler): () => void {
    this.listeners.push(fn);
    return () => { this.listeners = this.listeners.filter(l => l !== fn); };
  }

  private notify() {
    const all = this.getAll();
    this.listeners.forEach(fn => fn(all));
  }

  toggleAll(visible: boolean) {
    this.layers.forEach(l => { l.visible = visible; });
    this.notify();
  }

  destroy() {
    this.layers.clear();
    this.listeners = [];
  }
}
