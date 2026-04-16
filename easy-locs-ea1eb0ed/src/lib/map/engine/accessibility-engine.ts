/**
 * Map accessibility engine — Adds keyboard navigation, ARIA semantics and
 * reduced-motion handling to a MapLibre instance and its container.
 *
 * Keyboard:
 *   ArrowKeys → pan; +/- → zoom; PageUp/Down → tilt; Q/E → bearing.
 *
 * ARIA:
 *   role="application", aria-label, live region for announcements.
 *
 * Reduced motion:
 *   Respects prefers-reduced-motion and disables animations + cuts duration
 *   on easeTo/flyTo calls when active.
 */
import type maplibregl from "maplibre-gl";

const A11Y_ATTACHED = new WeakSet<maplibregl.Map>();
const PAN_STEP_PX = 80;
const ZOOM_STEP = 0.5;
const PITCH_STEP = 10;
const BEARING_STEP = 15;

export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

interface A11yOptions {
  label?: string;
  liveRegionId?: string;
  /** Override reduced-motion detection. */
  reducedMotion?: boolean;
}

export interface A11yHandle {
  detach: () => void;
  announce: (msg: string) => void;
  setLabel: (label: string) => void;
}

export function attachAccessibility(
  map: maplibregl.Map,
  container: HTMLElement,
  opts: A11yOptions = {},
): A11yHandle {
  if (A11Y_ATTACHED.has(map)) {
    return { detach: () => {}, announce: () => {}, setLabel: () => {} };
  }
  A11Y_ATTACHED.add(map);

  container.setAttribute("role", "application");
  container.setAttribute("aria-label", opts.label ?? "Interactive map");
  container.setAttribute("tabindex", "0");

  const liveRegion = document.createElement("div");
  liveRegion.setAttribute("aria-live", "polite");
  liveRegion.setAttribute("aria-atomic", "true");
  liveRegion.style.cssText =
    "position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0";
  if (opts.liveRegionId) liveRegion.id = opts.liveRegionId;
  container.appendChild(liveRegion);

  const reducedMotion = opts.reducedMotion ?? prefersReducedMotion();
  const easeOpts = (extra: maplibregl.AnimationOptions = {}): maplibregl.AnimationOptions => ({
    duration: reducedMotion ? 0 : 250,
    ...extra,
  });

  const onKey = (ev: KeyboardEvent) => {
    if (ev.target !== container) return;
    let handled = true;
    switch (ev.key) {
      case "ArrowUp":     map.panBy([0, -PAN_STEP_PX], easeOpts()); break;
      case "ArrowDown":   map.panBy([0, PAN_STEP_PX], easeOpts()); break;
      case "ArrowLeft":   map.panBy([-PAN_STEP_PX, 0], easeOpts()); break;
      case "ArrowRight":  map.panBy([PAN_STEP_PX, 0], easeOpts()); break;
      case "+": case "=": map.easeTo({ zoom: map.getZoom() + ZOOM_STEP, ...easeOpts() }); break;
      case "-": case "_": map.easeTo({ zoom: map.getZoom() - ZOOM_STEP, ...easeOpts() }); break;
      case "PageUp":      map.easeTo({ pitch: Math.min(60, map.getPitch() + PITCH_STEP), ...easeOpts() }); break;
      case "PageDown":    map.easeTo({ pitch: Math.max(0, map.getPitch() - PITCH_STEP), ...easeOpts() }); break;
      case "q": case "Q": map.easeTo({ bearing: map.getBearing() - BEARING_STEP, ...easeOpts() }); break;
      case "e": case "E": map.easeTo({ bearing: map.getBearing() + BEARING_STEP, ...easeOpts() }); break;
      case "Home":        map.easeTo({ bearing: 0, pitch: 0, ...easeOpts() }); break;
      default: handled = false;
    }
    if (handled) ev.preventDefault();
  };
  container.addEventListener("keydown", onKey);

  const onMoveEnd = () => {
    const c = map.getCenter();
    liveRegion.textContent = `Map centered at ${c.lat.toFixed(3)}, ${c.lng.toFixed(3)}, zoom ${map.getZoom().toFixed(1)}`;
  };
  map.on("moveend", onMoveEnd);

  if (reducedMotion) {
    container.dataset.reducedMotion = "true";
  }

  return {
    detach: () => {
      A11Y_ATTACHED.delete(map);
      container.removeEventListener("keydown", onKey);
      map.off("moveend", onMoveEnd);
      try { liveRegion.remove(); } catch {}
    },
    announce: (msg: string) => { liveRegion.textContent = msg; },
    setLabel: (label: string) => container.setAttribute("aria-label", label),
  };
}
