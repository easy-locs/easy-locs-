import { initKeyboardHandling } from "./keyboard-service";
import { initNetworkMonitoring } from "./network-service";
import { initSplashScreen } from "./splashscreen-service";
import { matchStatusBarToTheme } from "./statusbar-service";

let initialized = false;

export async function initNativePlugins(isDarkMode: boolean = false): Promise<void> {
  if (initialized) return;
  initialized = true;

  const isNative = isNativePlatform();

  const initPromises: Promise<void>[] = [];

  initPromises.push(
    initNetworkMonitoring().then(() => {}),
    initKeyboardHandling()
  );

  if (isNative) {
    initPromises.push(
      initSplashScreen(),
      matchStatusBarToTheme(isDarkMode)
    );
  }

  await Promise.allSettled(initPromises);
}

export function isNativePlatform(): boolean {
  const ua = navigator.userAgent || "";
  return ua.includes("EasyLocs-Native") || (window as unknown as Record<string, { isNativePlatform?: () => boolean }>).Capacitor?.isNativePlatform?.() === true;
}

export function isIOS(): boolean {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

export function isAndroid(): boolean {
  return /android/i.test(navigator.userAgent);
}

export { takePhoto, takeMultiplePhotos, checkCameraPermission } from "./camera-service";
export { triggerHaptic, vibrate } from "./haptics-service";
export { registerPushNotifications, onPushNotificationReceived, onPushNotificationAction } from "./push-service";
export { onKeyboardChange, getKeyboardHeight, isKeyboardOpen, hideKeyboard } from "./keyboard-service";
export { setStatusBarStyle, setStatusBarColor, enterImmersiveMode, exitImmersiveMode } from "./statusbar-service";
export { hideSplashScreen, showSplashScreen } from "./splashscreen-service";
export { onNetworkChange, getNetworkStatus, isOnline, isWifi } from "./network-service";
