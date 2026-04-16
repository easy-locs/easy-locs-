import { platformBus } from "@/lib/shared/platform-bus";

export type CapabilityId =
  | "camera"
  | "microphone"
  | "geolocation"
  | "push_notifications"
  | "file_upload"
  | "contact_sync"
  | "qr_scan"
  | "biometric_auth"
  | "share"
  | "clipboard"
  | "deep_links"
  | "payment_methods"
  | "vibration"
  | "orientation"
  | "network_info"
  | "haptics"
  | "keyboard"
  | "status_bar"
  | "splash_screen"
  | "nfc";

export type CapabilityStatus = "available" | "unavailable" | "prompt" | "denied" | "unknown";

export type PlatformType = "ios" | "android" | "desktop" | "unknown";
export type BrowserType = "safari" | "chrome" | "firefox" | "edge" | "samsung" | "unknown";

export interface CapabilityInfo {
  id: CapabilityId;
  status: CapabilityStatus;
  supported: boolean;
  native: boolean;
  requiresPermission: boolean;
  fallbackAvailable: boolean;
  fallbackMethod: string | null;
  lastCheckedAt: number;
}

export interface PlatformInfo {
  type: PlatformType;
  browser: BrowserType;
  isNative: boolean;
  isStandalone: boolean;
  isTouchDevice: boolean;
  isHighDPI: boolean;
  screenWidth: number;
  screenHeight: number;
  pixelRatio: number;
  prefersReducedMotion: boolean;
  prefersDarkMode: boolean;
  connectionType: string | null;
  isOnline: boolean;
  supportsWebGL: boolean;
  supportsServiceWorker: boolean;
  userAgent: string;
}

function detectPlatform(): PlatformType {
  const ua = navigator.userAgent.toLowerCase();
  if (/iphone|ipad|ipod/.test(ua)) return "ios";
  if (/android/.test(ua)) return "android";
  if (/windows|macintosh|linux/.test(ua) && !/mobile/.test(ua)) return "desktop";
  return "unknown";
}

function detectBrowser(): BrowserType {
  const ua = navigator.userAgent.toLowerCase();
  if (/samsungbrowser/.test(ua)) return "samsung";
  if (/edg/.test(ua)) return "edge";
  if (/chrome/.test(ua) && !/edg/.test(ua)) return "chrome";
  if (/safari/.test(ua) && !/chrome/.test(ua)) return "safari";
  if (/firefox/.test(ua)) return "firefox";
  return "unknown";
}

function detectConnectionType(): string | null {
  const nav = navigator as Navigator & { connection?: { effectiveType?: string } };
  return nav.connection?.effectiveType ?? null;
}

interface CapacitorWindow extends Window {
  Capacitor?: { isNativePlatform?: () => boolean };
  NDEFReader?: new () => { scan: () => Promise<void> };
}

function isNativePlatform(): boolean {
  return !!(window as unknown as CapacitorWindow).Capacitor?.isNativePlatform?.();
}

class PlatformCapabilityLayer {
  private capabilities = new Map<CapabilityId, CapabilityInfo>();
  private platformInfo: PlatformInfo | null = null;
  private nativeProbed = false;

  getPlatformInfo(): PlatformInfo {
    if (this.platformInfo) return this.platformInfo;

    const isStandalone = window.matchMedia("(display-mode: standalone)").matches
      || (window.navigator as Navigator & { standalone?: boolean }).standalone === true;

    this.platformInfo = {
      type: detectPlatform(),
      browser: detectBrowser(),
      isNative: isNativePlatform(),
      isStandalone,
      isTouchDevice: "ontouchstart" in window || navigator.maxTouchPoints > 0,
      isHighDPI: window.devicePixelRatio > 1.5,
      screenWidth: window.screen.width,
      screenHeight: window.screen.height,
      pixelRatio: window.devicePixelRatio,
      prefersReducedMotion: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
      prefersDarkMode: window.matchMedia("(prefers-color-scheme: dark)").matches,
      connectionType: detectConnectionType(),
      isOnline: navigator.onLine,
      supportsWebGL: (() => {
        try {
          const c = document.createElement("canvas");
          return !!(c.getContext("webgl") || c.getContext("experimental-webgl"));
        } catch { return false; }
      })(),
      supportsServiceWorker: "serviceWorker" in navigator,
      userAgent: navigator.userAgent,
    };

    return this.platformInfo;
  }

  isMobile(): boolean {
    const p = this.getPlatformInfo();
    return p.type === "ios" || p.type === "android";
  }

  isDesktop(): boolean {
    return this.getPlatformInfo().type === "desktop";
  }

  isIOS(): boolean {
    return this.getPlatformInfo().type === "ios";
  }

  isAndroid(): boolean {
    return this.getPlatformInfo().type === "android";
  }

  isTouchDevice(): boolean {
    return this.getPlatformInfo().isTouchDevice;
  }

  isNative(): boolean {
    return isNativePlatform();
  }

  probeAll(): Map<CapabilityId, CapabilityInfo> {
    const caps: CapabilityId[] = [
      "camera", "microphone", "geolocation", "push_notifications",
      "file_upload", "contact_sync", "qr_scan", "biometric_auth",
      "share", "clipboard", "deep_links", "payment_methods",
      "vibration", "orientation", "network_info",
      "haptics", "keyboard", "status_bar", "splash_screen", "nfc",
    ];

    const native = isNativePlatform();

    for (const id of caps) {
      this.capabilities.set(id, this.detectCapability(id, native));
    }

    if (native && !this.nativeProbed) {
      this.nativeProbed = true;
      this.probeNativePlugins();
    }

    return new Map(this.capabilities);
  }

  private async probeNativePlugins(): Promise<void> {
    const probes: Array<{ id: CapabilityId; probe: () => Promise<boolean> }> = [
      { id: "camera", probe: async () => { await import("@capacitor/camera"); return true; } },
      { id: "haptics", probe: async () => { await import("@capacitor/haptics"); return true; } },
      { id: "push_notifications", probe: async () => { await import("@capacitor/push-notifications"); return true; } },
      { id: "keyboard", probe: async () => { await import("@capacitor/keyboard"); return true; } },
      { id: "status_bar", probe: async () => { await import("@capacitor/status-bar"); return true; } },
      { id: "splash_screen", probe: async () => { await import("@capacitor/splash-screen"); return true; } },
      { id: "network_info", probe: async () => { await import("@capacitor/network"); return true; } },
      { id: "nfc", probe: async () => { await import(/* @vite-ignore */ "capacitor-nfc"); return true; } },
    ];

    for (const { id, probe } of probes) {
      try {
        const available = await probe();
        const existing = this.capabilities.get(id);
        if (existing && available) {
          existing.native = true;
          existing.supported = true;
          existing.status = existing.requiresPermission ? "prompt" : "available";
          this.capabilities.set(id, { ...existing, lastCheckedAt: Date.now() });
        }
      } catch {}
    }
  }

  probeCapability(id: CapabilityId): CapabilityInfo {
    const info = this.detectCapability(id, isNativePlatform());
    this.capabilities.set(id, info);
    return info;
  }

  getCapability(id: CapabilityId): CapabilityInfo {
    return this.capabilities.get(id) ?? this.probeCapability(id);
  }

  isAvailable(id: CapabilityId): boolean {
    return this.getCapability(id).supported;
  }

  isNativeCapability(id: CapabilityId): boolean {
    return this.getCapability(id).native;
  }

  getCapabilityResult(id: CapabilityId): { available: boolean; native: boolean } {
    const info = this.getCapability(id);
    return { available: info.supported, native: info.native };
  }

  private detectCapability(id: CapabilityId, native: boolean): CapabilityInfo {
    const base: CapabilityInfo = {
      id,
      status: "unknown",
      supported: false,
      native: false,
      requiresPermission: false,
      fallbackAvailable: false,
      fallbackMethod: null,
      lastCheckedAt: Date.now(),
    };

    switch (id) {
      case "camera":
        base.supported = !!(navigator.mediaDevices?.getUserMedia);
        base.native = native;
        base.requiresPermission = true;
        base.status = base.supported ? "prompt" : "unavailable";
        base.fallbackAvailable = true;
        base.fallbackMethod = "file_input_capture";
        break;

      case "microphone":
        base.supported = !!(navigator.mediaDevices?.getUserMedia);
        base.requiresPermission = true;
        base.status = base.supported ? "prompt" : "unavailable";
        break;

      case "geolocation":
        base.supported = "geolocation" in navigator;
        base.requiresPermission = true;
        base.status = base.supported ? "prompt" : "unavailable";
        base.fallbackAvailable = true;
        base.fallbackMethod = "ip_geolocation";
        break;

      case "push_notifications":
        base.supported = native || ("Notification" in window && "serviceWorker" in navigator);
        base.native = native;
        base.requiresPermission = true;
        if (native) {
          base.status = "prompt";
        } else {
          base.status = base.supported
            ? Notification.permission === "granted" ? "available"
              : Notification.permission === "denied" ? "denied"
                : "prompt"
            : "unavailable";
        }
        base.fallbackAvailable = true;
        base.fallbackMethod = "in_app_notifications";
        break;

      case "file_upload":
        base.supported = true;
        base.status = "available";
        break;

      case "contact_sync": {
        const navC = navigator as Navigator & { contacts?: { select: (...args: unknown[]) => Promise<Array<{ name?: string[]; tel?: string[]; email?: string[] }>> } };
        base.supported = typeof navC.contacts?.select === "function";
        base.requiresPermission = true;
        base.status = base.supported ? "prompt" : "unavailable";
        base.fallbackAvailable = true;
        base.fallbackMethod = "manual_phone_input";
        break;
      }

      case "qr_scan":
        base.supported = !!(navigator.mediaDevices?.getUserMedia);
        base.requiresPermission = true;
        base.status = base.supported ? "prompt" : "unavailable";
        base.fallbackAvailable = true;
        base.fallbackMethod = "file_upload_qr";
        break;

      case "biometric_auth":
        base.supported = !!(window.PublicKeyCredential) || native;
        base.native = native;
        base.requiresPermission = true;
        base.status = base.supported ? "prompt" : "unavailable";
        base.fallbackAvailable = true;
        base.fallbackMethod = "pin_code";
        break;

      case "share":
        base.supported = !!navigator.share;
        base.status = base.supported ? "available" : "unavailable";
        base.fallbackAvailable = true;
        base.fallbackMethod = "clipboard_copy";
        break;

      case "clipboard":
        base.supported = !!(navigator.clipboard?.writeText);
        base.status = base.supported ? "available" : "unavailable";
        break;

      case "deep_links":
        base.supported = typeof window !== "undefined" && !!window.location;
        base.native = native;
        base.status = base.supported ? "available" : "unavailable";
        base.fallbackAvailable = true;
        base.fallbackMethod = "url_params";
        break;

      case "payment_methods": {
        const hasPaymentRequest = "PaymentRequest" in window;
        base.supported = hasPaymentRequest;
        base.status = hasPaymentRequest ? "available" : "unavailable";
        base.fallbackAvailable = true;
        base.fallbackMethod = "wallet_payment";
        break;
      }

      case "vibration":
        base.supported = "vibrate" in navigator || native;
        base.native = native;
        base.status = base.supported ? "available" : "unavailable";
        break;

      case "orientation":
        base.supported = "orientation" in screen;
        base.status = base.supported ? "available" : "unavailable";
        break;

      case "network_info": {
        const nav = navigator as Navigator & { connection?: unknown };
        base.supported = !!nav.connection || native;
        base.native = native;
        base.status = base.supported ? "available" : "unavailable";
        base.fallbackAvailable = true;
        base.fallbackMethod = "online_offline_events";
        break;
      }

      case "haptics":
        base.supported = ("vibrate" in navigator) || native;
        base.native = native;
        base.status = base.supported ? "available" : "unavailable";
        base.fallbackAvailable = true;
        base.fallbackMethod = "vibration_api";
        break;

      case "keyboard":
        base.supported = native || typeof visualViewport !== "undefined";
        base.native = native;
        base.status = base.supported ? "available" : "unavailable";
        base.fallbackAvailable = true;
        base.fallbackMethod = "visual_viewport_api";
        break;

      case "status_bar":
        base.supported = native;
        base.native = native;
        base.status = native ? "available" : "unavailable";
        break;

      case "splash_screen":
        base.supported = native;
        base.native = native;
        base.status = native ? "available" : "unavailable";
        break;

      case "nfc":
        base.supported = native || "NDEFReader" in window;
        base.native = native;
        base.requiresPermission = true;
        base.status = base.supported ? "prompt" : "unavailable";
        base.fallbackAvailable = false;
        base.fallbackMethod = null;
        break;
    }

    return base;
  }

  async requestPermission(id: CapabilityId): Promise<CapabilityStatus> {
    const info = this.getCapability(id);
    if (!info.requiresPermission) return info.status;
    if (!info.supported) return "unavailable";

    try {
      switch (id) {
        case "camera":
        case "microphone": {
          if (isNativePlatform() && id === "camera") {
            try {
              const { Camera } = await import("@capacitor/camera");
              const result = await Camera.requestPermissions({ permissions: ["camera"] });
              info.status = result.camera === "granted" ? "available" : "denied";
              break;
            } catch {}
          }
          const constraints = id === "camera"
            ? { video: true }
            : { audio: true };
          const stream = await navigator.mediaDevices.getUserMedia(constraints);
          stream.getTracks().forEach((t) => t.stop());
          info.status = "available";
          break;
        }

        case "geolocation":
          await new Promise<void>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(() => resolve(), (e) => reject(e), { timeout: 5000 });
          });
          info.status = "available";
          break;

        case "push_notifications": {
          if (isNativePlatform()) {
            try {
              const { PushNotifications } = await import("@capacitor/push-notifications");
              const result = await PushNotifications.requestPermissions();
              info.status = result.receive === "granted" ? "available" : "denied";
              break;
            } catch {}
          }
          const result = await Notification.requestPermission();
          info.status = result === "granted" ? "available" : result === "denied" ? "denied" : "prompt";
          break;
        }

        case "contact_sync": {
          const navWithContacts = navigator as Navigator & { contacts?: { select: (p: string[], o: { multiple: boolean }) => Promise<unknown[]> } };
          if (navWithContacts.contacts) {
            await navWithContacts.contacts.select(["name", "tel"], { multiple: false });
            info.status = "available";
          }
          break;
        }

        case "qr_scan":
          return this.requestPermission("camera");

        case "nfc":
          if (isNativePlatform()) {
            info.status = "available";
          } else if ("NDEFReader" in window) {
            try {
              const w = window as unknown as CapacitorWindow;
              if (!w.NDEFReader) throw new Error("No NDEFReader");
              const reader = new w.NDEFReader();
              await reader.scan();
              info.status = "available";
            } catch {
              info.status = "denied";
            }
          }
          break;

        default:
          info.status = "available";
      }
    } catch {
      info.status = "denied";
    }

    this.capabilities.set(id, { ...info, lastCheckedAt: Date.now() });
    return info.status;
  }

  async executeWithFallback<T>(
    id: CapabilityId,
    primaryAction: () => Promise<T>,
    fallbackAction: () => Promise<T>
  ): Promise<{ result: T; usedFallback: boolean }> {
    const info = this.getCapability(id);

    if (info.supported && info.status !== "denied") {
      try {
        const result = await primaryAction();
        return { result, usedFallback: false };
      } catch {
        if (info.fallbackAvailable) {
          const result = await fallbackAction();
          return { result, usedFallback: true };
        }
        throw new Error(`Capability ${id} failed and no fallback available`);
      }
    }

    if (info.fallbackAvailable) {
      const result = await fallbackAction();
      return { result, usedFallback: true };
    }

    throw new Error(`Capability ${id} not supported and no fallback available`);
  }

  getSnapshot(): {
    platform: PlatformInfo;
    capabilities: Record<CapabilityId, CapabilityInfo>;
    availableCount: number;
    unavailableCount: number;
    nativeCount: number;
    permissionRequired: CapabilityId[];
  } {
    if (this.capabilities.size === 0) this.probeAll();
    const all = Array.from(this.capabilities.entries());
    const available = all.filter(([, v]) => v.supported).length;
    const nativeCount = all.filter(([, v]) => v.native).length;
    const permRequired = all.filter(([, v]) => v.requiresPermission && v.status === "prompt").map(([k]) => k);

    return {
      platform: this.getPlatformInfo(),
      capabilities: Object.fromEntries(this.capabilities) as Record<CapabilityId, CapabilityInfo>,
      availableCount: available,
      unavailableCount: all.length - available,
      nativeCount,
      permissionRequired: permRequired,
    };
  }

  onNetworkChange(callback: (online: boolean) => void): () => void {
    const onlineHandler = () => {
      if (this.platformInfo) this.platformInfo.isOnline = true;
      callback(true);
    };
    const offlineHandler = () => {
      if (this.platformInfo) this.platformInfo.isOnline = false;
      callback(false);
    };
    window.addEventListener("online", onlineHandler);
    window.addEventListener("offline", offlineHandler);
    return () => {
      window.removeEventListener("online", onlineHandler);
      window.removeEventListener("offline", offlineHandler);
    };
  }

  async hideSplashScreen(): Promise<void> {
    if (!isNativePlatform()) return;
    try {
      const { SplashScreen } = await import("@capacitor/splash-screen");
      await SplashScreen.hide({ fadeOutDuration: 300 });
    } catch {}
  }

  reset(): void {
    this.capabilities.clear();
    this.platformInfo = null;
    this.nativeProbed = false;
  }
}

export const platformCapabilities = new PlatformCapabilityLayer();
