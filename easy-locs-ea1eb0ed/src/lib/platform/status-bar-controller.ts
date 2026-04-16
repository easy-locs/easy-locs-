import { StatusBar, Style } from "@capacitor/status-bar";

export type StatusBarTheme = "light" | "dark" | "auto";

export interface StatusBarConfig {
  color?: string;
  style?: StatusBarTheme;
  visible?: boolean;
  overlay?: boolean;
}

interface CapacitorWindow extends Window {
  Capacitor?: { isNativePlatform?: () => boolean };
}

function isNative(): boolean {
  return !!(window as unknown as CapacitorWindow).Capacitor?.isNativePlatform?.();
}

function isDarkMode(): boolean {
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

class StatusBarController {
  private currentConfig: StatusBarConfig = { style: "auto", visible: true };
  private initialized = false;

  async init(): Promise<void> {
    if (this.initialized || !isNative()) return;
    this.initialized = true;

    try {
      await this.applyTheme();

      const mql = window.matchMedia("(prefers-color-scheme: dark)");
      mql.addEventListener("change", () => {
        if (this.currentConfig.style === "auto") {
          this.applyTheme();
        }
      });
    } catch (e) {
      console.warn("[status-bar] Init failed:", e);
    }
  }

  private async applyTheme(): Promise<void> {
    if (!isNative()) return;
    try {
      const resolvedStyle =
        this.currentConfig.style === "auto"
          ? isDarkMode() ? "dark" : "light"
          : this.currentConfig.style;

      await StatusBar.setStyle({
        style: resolvedStyle === "dark" ? Style.Dark : Style.Light,
      });

      if (this.currentConfig.color) {
        await StatusBar.setBackgroundColor({ color: this.currentConfig.color });
      }
    } catch {}
  }

  async setStyle(style: StatusBarTheme): Promise<void> {
    this.currentConfig.style = style;
    await this.applyTheme();
  }

  async setColor(color: string): Promise<void> {
    this.currentConfig.color = color;
    if (!isNative()) return;
    try {
      await StatusBar.setBackgroundColor({ color });
    } catch {}
  }

  async show(): Promise<void> {
    this.currentConfig.visible = true;
    if (!isNative()) return;
    try {
      await StatusBar.show();
    } catch {}
  }

  async hide(): Promise<void> {
    this.currentConfig.visible = false;
    if (!isNative()) return;
    try {
      await StatusBar.hide();
    } catch {}
  }

  async setOverlay(overlay: boolean): Promise<void> {
    this.currentConfig.overlay = overlay;
    if (!isNative()) return;
    try {
      await StatusBar.setOverlaysWebView({ overlay });
    } catch {}
  }

  async enterImmersive(): Promise<void> {
    await this.hide();
    await this.setOverlay(true);
  }

  async exitImmersive(): Promise<void> {
    await this.show();
    await this.setOverlay(false);
    await this.applyTheme();
  }

  async setForPage(options: {
    immersive?: boolean;
    theme?: StatusBarTheme;
    color?: string;
  }): Promise<void> {
    if (options.immersive) {
      await this.enterImmersive();
      return;
    }

    await this.exitImmersive();

    if (options.theme) {
      await this.setStyle(options.theme);
    }

    if (options.color) {
      await this.setColor(options.color);
    }
  }

  getConfig(): StatusBarConfig {
    return { ...this.currentConfig };
  }
}

export const statusBarController = new StatusBarController();
