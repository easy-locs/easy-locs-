import { type TrustSignals } from "@/lib/trust/user-trust-engine";

export interface DeviceProfile {
  deviceId: string;
  fingerprint: string;
  isPrimary: boolean;
  firstSeenAt: number;
  lastSeenAt: number;
  trustStatus: "trusted" | "known" | "new" | "suspect";
  platform: string;
  browser: string;
}

export interface DeviceTrustResult {
  currentDevice: DeviceProfile;
  knownDevices: DeviceProfile[];
  isNewDevice: boolean;
  isSuspicious: boolean;
  deviceChangesRecent: number;
  requiresVerification: boolean;
  trustSignalUpdates: Partial<TrustSignals>;
}

const DEVICE_STORAGE_KEY = "el-device-id";
const DEVICE_HISTORY_KEY = "el-device-history";
const DEVICE_SUSPECT_THRESHOLD = 3;
const RECENT_WINDOW_DAYS = 30;

function getDeviceId(): string {
  let id = localStorage.getItem(DEVICE_STORAGE_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(DEVICE_STORAGE_KEY, id);
  }
  return id;
}

function computeFingerprint(): string {
  const parts = [
    navigator.userAgent,
    navigator.language,
    screen.width + "x" + screen.height,
    screen.colorDepth,
    new Date().getTimezoneOffset(),
    navigator.hardwareConcurrency || 0,
  ];
  return parts.join("|");
}

function detectPlatform(): string {
  const ua = navigator.userAgent.toLowerCase();
  if (ua.includes("android")) return "android";
  if (ua.includes("iphone") || ua.includes("ipad")) return "ios";
  if (ua.includes("windows")) return "windows";
  if (ua.includes("mac")) return "macos";
  if (ua.includes("linux")) return "linux";
  return "unknown";
}

function detectBrowser(): string {
  const ua = navigator.userAgent.toLowerCase();
  if (ua.includes("firefox")) return "firefox";
  if (ua.includes("edg/")) return "edge";
  if (ua.includes("chrome")) return "chrome";
  if (ua.includes("safari")) return "safari";
  return "unknown";
}

function getDeviceHistory(): DeviceProfile[] {
  try {
    const stored = localStorage.getItem(DEVICE_HISTORY_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveDeviceHistory(history: DeviceProfile[]): void {
  try {
    localStorage.setItem(DEVICE_HISTORY_KEY, JSON.stringify(history.slice(-20)));
  } catch {
    /* storage full — ignore */
  }
}

export function evaluateDeviceTrust(): DeviceTrustResult {
  const deviceId = getDeviceId();
  const fingerprint = computeFingerprint();
  const now = Date.now();
  const recentWindowMs = RECENT_WINDOW_DAYS * 86400_000;

  let history = getDeviceHistory();
  let existing = history.find(d => d.deviceId === deviceId);
  let isNewDevice = false;

  if (!existing) {
    existing = {
      deviceId,
      fingerprint,
      isPrimary: history.length === 0,
      firstSeenAt: now,
      lastSeenAt: now,
      trustStatus: history.length === 0 ? "trusted" : "new",
      platform: detectPlatform(),
      browser: detectBrowser(),
    };
    history.push(existing);
    isNewDevice = true;
  } else {
    const fingerprintChanged = existing.fingerprint !== fingerprint;
    existing.lastSeenAt = now;
    existing.fingerprint = fingerprint;

    if (fingerprintChanged && existing.trustStatus === "trusted") {
      existing.trustStatus = "known";
    }

    if (now - existing.firstSeenAt > 7 * 86400_000 && existing.trustStatus === "new") {
      existing.trustStatus = "known";
    }
    if (now - existing.firstSeenAt > 30 * 86400_000 && existing.trustStatus !== "suspect") {
      existing.trustStatus = "trusted";
    }
  }

  const recentDevices = history.filter(d => now - d.lastSeenAt < recentWindowMs);
  const deviceChangesRecent = recentDevices.length - 1;

  const isSuspicious =
    deviceChangesRecent >= DEVICE_SUSPECT_THRESHOLD ||
    navigator.webdriver === true ||
    (isNewDevice && history.length > 3);

  if (isSuspicious && existing.trustStatus !== "suspect") {
    existing.trustStatus = "suspect";
  }

  const requiresVerification = isNewDevice || isSuspicious || existing.trustStatus === "suspect";

  saveDeviceHistory(history);

  return {
    currentDevice: existing,
    knownDevices: history,
    isNewDevice,
    isSuspicious,
    deviceChangesRecent,
    requiresVerification,
    trustSignalUpdates: {
      deviceStable: !isNewDevice && existing.trustStatus === "trusted",
      deviceChanges30d: deviceChangesRecent,
    },
  };
}

export function markDeviceTrusted(deviceId: string): void {
  const history = getDeviceHistory();
  const device = history.find(d => d.deviceId === deviceId);
  if (device) {
    device.trustStatus = "trusted";
    saveDeviceHistory(history);
  }
}

export function revokeDeviceTrust(deviceId: string): void {
  const history = getDeviceHistory();
  const device = history.find(d => d.deviceId === deviceId);
  if (device) {
    device.trustStatus = "suspect";
    saveDeviceHistory(history);
  }
}

export function clearAllDevices(): void {
  localStorage.removeItem(DEVICE_HISTORY_KEY);
}

export function getPrimaryDevice(): DeviceProfile | null {
  const history = getDeviceHistory();
  return history.find(d => d.isPrimary) ?? null;
}

export function getActiveDeviceCount(): number {
  const history = getDeviceHistory();
  const now = Date.now();
  return history.filter(d => now - d.lastSeenAt < 7 * 86400_000).length;
}
