export interface SplashScreenConfig {
  autoHide?: boolean;
  fadeInDuration?: number;
  fadeOutDuration?: number;
  showDuration?: number;
  backgroundColor?: string;
}

export async function hideSplashScreen(fadeOutDuration: number = 300): Promise<void> {
  try {
    const { SplashScreen } = await import("@capacitor/splash-screen");
    await SplashScreen.hide({ fadeOutDuration });
  } catch (err) {
    console.debug("[splash] hide unavailable:", err instanceof Error ? err.message : err);
  }
}

export async function showSplashScreen(config?: SplashScreenConfig): Promise<void> {
  try {
    const { SplashScreen } = await import("@capacitor/splash-screen");
    await SplashScreen.show({
      autoHide: config?.autoHide ?? false,
      fadeInDuration: config?.fadeInDuration ?? 200,
      fadeOutDuration: config?.fadeOutDuration ?? 300,
      showDuration: config?.showDuration ?? 2000,
    });
  } catch (err) {
    console.debug("[splash] show unavailable:", err instanceof Error ? err.message : err);
  }
}

export async function initSplashScreen(): Promise<void> {
  try {
    const { SplashScreen } = await import("@capacitor/splash-screen");
    await SplashScreen.show({
      autoHide: false,
      fadeInDuration: 200,
      showDuration: 0,
    });

    setTimeout(async () => {
      try {
        await SplashScreen.hide({ fadeOutDuration: 400 });
      } catch (hideErr) {
        console.debug("[splash] delayed hide failed:", hideErr instanceof Error ? hideErr.message : hideErr);
      }
    }, 1500);
  } catch (err) {
    console.debug("[splash] init unavailable:", err instanceof Error ? err.message : err);
  }
}
