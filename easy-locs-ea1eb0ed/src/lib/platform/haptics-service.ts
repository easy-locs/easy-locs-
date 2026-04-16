import type { ImpactStyle as CapImpactStyle, NotificationType as CapNotificationType } from "@capacitor/haptics";

export type ImpactStyle = "light" | "medium" | "heavy";
export type NotificationType = "success" | "warning" | "error";

interface CapacitorWindow extends Window {
  Capacitor?: { isNativePlatform?: () => boolean };
}

function isNative(): boolean {
  return !!(window as unknown as CapacitorWindow).Capacitor?.isNativePlatform?.();
}

let hapticsEnabled = true;
let hapticsModule: typeof import("@capacitor/haptics") | null = null;

async function getHaptics(): Promise<typeof import("@capacitor/haptics") | null> {
  if (!hapticsEnabled) return null;
  if (!isNative()) return null;
  if (hapticsModule) return hapticsModule;

  try {
    hapticsModule = await import("@capacitor/haptics");
    return hapticsModule;
  } catch {
    return null;
  }
}

function vibrateWeb(pattern: number | number[]): void {
  if (!hapticsEnabled) return;
  try {
    navigator?.vibrate?.(pattern);
  } catch {}
}

export function setHapticsEnabled(enabled: boolean): void {
  hapticsEnabled = enabled;
}

export function isHapticsEnabled(): boolean {
  return hapticsEnabled;
}

export async function impact(style: ImpactStyle = "medium"): Promise<void> {
  const mod = await getHaptics();
  if (mod) {
    await mod.Haptics.impact({ style: mod.ImpactStyle[capitalize(style) as keyof typeof mod.ImpactStyle] as CapImpactStyle });
    return;
  }

  const durMap: Record<ImpactStyle, number> = { light: 10, medium: 20, heavy: 40 };
  vibrateWeb(durMap[style]);
}

export async function notification(type: NotificationType): Promise<void> {
  const mod = await getHaptics();
  if (mod) {
    await mod.Haptics.notification({ type: mod.NotificationType[capitalize(type) as keyof typeof mod.NotificationType] as CapNotificationType });
    return;
  }

  const patterns: Record<NotificationType, number[]> = {
    success: [10, 50, 10],
    warning: [20, 40, 20, 40, 20],
    error: [50, 100, 50],
  };
  vibrateWeb(patterns[type]);
}

export async function selection(): Promise<void> {
  const mod = await getHaptics();
  if (mod) {
    await mod.Haptics.selectionStart();
    await mod.Haptics.selectionChanged();
    await mod.Haptics.selectionEnd();
    return;
  }
  vibrateWeb(5);
}

export async function vibrate(duration: number = 300): Promise<void> {
  const mod = await getHaptics();
  if (mod) {
    await mod.Haptics.vibrate({ duration });
    return;
  }
  vibrateWeb(duration);
}

export async function success(): Promise<void> {
  return notification("success");
}

export async function error(): Promise<void> {
  return notification("error");
}

export async function warning(): Promise<void> {
  return notification("warning");
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export const haptics = {
  impact,
  notification,
  selection,
  vibrate,
  success,
  error,
  warning,
  setEnabled: setHapticsEnabled,
  isEnabled: isHapticsEnabled,
};
