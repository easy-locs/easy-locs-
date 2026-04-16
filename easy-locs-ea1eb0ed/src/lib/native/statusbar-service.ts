export type StatusBarStyle = "dark" | "light" | "default";

export async function setStatusBarStyle(style: StatusBarStyle): Promise<void> {
  try {
    const { StatusBar, Style } = await import("@capacitor/status-bar");
    const styleMap: Record<StatusBarStyle, typeof Style.Dark | typeof Style.Light | typeof Style.Default> = {
      dark: Style.Dark,
      light: Style.Light,
      default: Style.Default,
    };
    await StatusBar.setStyle({ style: styleMap[style] });
  } catch (err) {
    console.debug("[statusbar] setStyle unavailable:", err instanceof Error ? err.message : err);
  }
}

export async function setStatusBarColor(color: string): Promise<void> {
  try {
    const { StatusBar } = await import("@capacitor/status-bar");
    await StatusBar.setBackgroundColor({ color });
  } catch (err) {
    console.debug("[statusbar] setBackgroundColor unavailable:", err instanceof Error ? err.message : err);
  }
}

export async function hideStatusBar(): Promise<void> {
  try {
    const { StatusBar } = await import("@capacitor/status-bar");
    await StatusBar.hide();
  } catch (err) {
    console.debug("[statusbar] hide unavailable:", err instanceof Error ? err.message : err);
  }
}

export async function showStatusBar(): Promise<void> {
  try {
    const { StatusBar } = await import("@capacitor/status-bar");
    await StatusBar.show();
  } catch (err) {
    console.debug("[statusbar] show unavailable:", err instanceof Error ? err.message : err);
  }
}

export async function setStatusBarOverlaysWebView(overlay: boolean): Promise<void> {
  try {
    const { StatusBar } = await import("@capacitor/status-bar");
    await StatusBar.setOverlaysWebView({ overlay });
  } catch (err) {
    console.debug("[statusbar] setOverlaysWebView unavailable:", err instanceof Error ? err.message : err);
  }
}

export async function enterImmersiveMode(): Promise<void> {
  await hideStatusBar();
  await setStatusBarOverlaysWebView(true);
}

export async function exitImmersiveMode(style: StatusBarStyle = "default"): Promise<void> {
  await showStatusBar();
  await setStatusBarOverlaysWebView(false);
  await setStatusBarStyle(style);
}

export async function matchStatusBarToTheme(isDark: boolean): Promise<void> {
  await setStatusBarStyle(isDark ? "dark" : "light");
  await setStatusBarColor(isDark ? "#111111" : "#ffffff");
}
