import { useSyncExternalStore } from "react";

export type DeviceClass = "mobile" | "tablet" | "desktop";
export type Orientation = "portrait" | "landscape";
export type LayoutMode = "mobile_stack" | "tablet_hybrid" | "desktop_multi";

export type Breakpoint = "xs" | "sm" | "md" | "lg" | "xl" | "2xl";

/**
 * Breakpoints aligned with Tailwind config (tailwind.config.ts theme.screens).
 * For visual responsiveness (grids, spacing, typography), use Tailwind classes.
 * This JS module handles only runtime layout decisions that CSS cannot express:
 * navigation type, panel count, modal behavior, orientation, touch, safe areas.
 */
export const BREAKPOINTS: Record<Breakpoint, number> = {
  xs: 475,
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  "2xl": 1400,
};

export interface DeviceContext {
  deviceClass: DeviceClass;
  orientation: Orientation;
  layoutMode: LayoutMode;
  breakpoint: Breakpoint;
  width: number;
  height: number;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isPortrait: boolean;
  isLandscape: boolean;
  isTouchDevice: boolean;
  pixelRatio: number;
  safeAreaInsets: { top: number; bottom: number; left: number; right: number };
}

export interface LayoutConfig {
  navType: "bottom_bar" | "sidebar" | "hybrid";
  panelCount: 1 | 2 | 3;
  modalBehavior: "fullscreen" | "dialog" | "drawer";
  listStyle: "cards" | "compact_list" | "table";
  showSidebar: boolean;
  showSplitView: boolean;
  contentMaxWidth: string;
  touchTargetMin: number;
}

function getDeviceClass(width: number): DeviceClass {
  if (width < BREAKPOINTS.md) return "mobile";
  if (width < BREAKPOINTS.lg) return "tablet";
  return "desktop";
}

function getOrientation(width: number, height: number): Orientation {
  return width >= height ? "landscape" : "portrait";
}

function getLayoutMode(device: DeviceClass): LayoutMode {
  switch (device) {
    case "mobile": return "mobile_stack";
    case "tablet": return "tablet_hybrid";
    case "desktop": return "desktop_multi";
  }
}

function getCurrentBreakpoint(width: number): Breakpoint {
  if (width >= BREAKPOINTS["2xl"]) return "2xl";
  if (width >= BREAKPOINTS.xl) return "xl";
  if (width >= BREAKPOINTS.lg) return "lg";
  if (width >= BREAKPOINTS.md) return "md";
  if (width >= BREAKPOINTS.sm) return "sm";
  return "xs";
}

function getSafeAreaInsets(): { top: number; bottom: number; left: number; right: number } {
  const el = document.documentElement;
  const parse = (prop: string) => {
    el.style.setProperty("--_sat", `env(${prop}, 0px)`);
    const val = parseInt(getComputedStyle(el).getPropertyValue("--_sat"), 10) || 0;
    el.style.removeProperty("--_sat");
    return val;
  };
  return {
    top: parse("safe-area-inset-top"),
    bottom: parse("safe-area-inset-bottom"),
    left: parse("safe-area-inset-left"),
    right: parse("safe-area-inset-right"),
  };
}

function buildDeviceContext(): DeviceContext {
  const width = window.innerWidth;
  const height = window.innerHeight;
  const deviceClass = getDeviceClass(width);
  const orientation = getOrientation(width, height);

  return {
    deviceClass,
    orientation,
    layoutMode: getLayoutMode(deviceClass),
    breakpoint: getCurrentBreakpoint(width),
    width,
    height,
    isMobile: deviceClass === "mobile",
    isTablet: deviceClass === "tablet",
    isDesktop: deviceClass === "desktop",
    isPortrait: orientation === "portrait",
    isLandscape: orientation === "landscape",
    isTouchDevice: "ontouchstart" in window || navigator.maxTouchPoints > 0,
    pixelRatio: window.devicePixelRatio,
    safeAreaInsets: getSafeAreaInsets(),
  };
}

export function getLayoutConfig(ctx: DeviceContext): LayoutConfig {
  switch (ctx.deviceClass) {
    case "mobile":
      return {
        navType: "bottom_bar",
        panelCount: 1,
        modalBehavior: "fullscreen",
        listStyle: "cards",
        showSidebar: false,
        showSplitView: false,
        contentMaxWidth: "100%",
        touchTargetMin: 44,
      };
    case "tablet":
      return {
        navType: ctx.isLandscape ? "sidebar" : "hybrid",
        panelCount: ctx.isLandscape ? 2 : 1,
        modalBehavior: "dialog",
        listStyle: "compact_list",
        showSidebar: ctx.isLandscape,
        showSplitView: ctx.isLandscape,
        contentMaxWidth: "100%",
        touchTargetMin: 44,
      };
    case "desktop":
      return {
        navType: "sidebar",
        panelCount: ctx.width >= BREAKPOINTS.xl ? 3 : 2,
        modalBehavior: "dialog",
        listStyle: "table",
        showSidebar: true,
        showSplitView: true,
        contentMaxWidth: "1400px",
        touchTargetMin: 32,
      };
  }
}

let _currentContext: DeviceContext = buildDeviceContext();
let _listeners = new Set<() => void>();

function notifyListeners(): void {
  _currentContext = buildDeviceContext();
  _listeners.forEach((fn) => fn());
}

let _resizeHandler: (() => void) | null = null;

export function installResponsiveSystem(): () => void {
  if (_resizeHandler) return () => {};

  let raf: number | null = null;
  _resizeHandler = () => {
    if (raf) cancelAnimationFrame(raf);
    raf = requestAnimationFrame(notifyListeners);
  };

  window.addEventListener("resize", _resizeHandler);
  window.addEventListener("orientationchange", _resizeHandler);

  const mql = window.matchMedia(`(min-width: ${BREAKPOINTS.lg}px)`);
  const mqlHandler = () => notifyListeners();
  mql.addEventListener("change", mqlHandler);

  notifyListeners();

  return () => {
    if (_resizeHandler) {
      window.removeEventListener("resize", _resizeHandler);
      window.removeEventListener("orientationchange", _resizeHandler);
    }
    mql.removeEventListener("change", mqlHandler);
    _resizeHandler = null;
  };
}

function subscribe(listener: () => void): () => void {
  _listeners.add(listener);
  return () => _listeners.delete(listener);
}

function getSnapshot(): DeviceContext {
  return _currentContext;
}

let _installed = false;

export function useDeviceContext(): DeviceContext {
  if (!_installed && typeof window !== "undefined") {
    _installed = true;
    installResponsiveSystem();
  }
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export function useLayoutConfig(): LayoutConfig {
  const ctx = useDeviceContext();
  return getLayoutConfig(ctx);
}
