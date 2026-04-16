import { Keyboard } from "@capacitor/keyboard";

export interface KeyboardInfo {
  isVisible: boolean;
  keyboardHeight: number;
}

type KeyboardListener = (info: KeyboardInfo) => void;

interface CapacitorWindow extends Window {
  Capacitor?: { isNativePlatform?: () => boolean };
}

function isNative(): boolean {
  return !!(window as unknown as CapacitorWindow).Capacitor?.isNativePlatform?.();
}

export type KeyboardShowListener = (info: KeyboardInfo) => void;
export type KeyboardHideListener = () => void;

class KeyboardManager {
  private listeners = new Set<KeyboardListener>();
  private showListeners = new Set<KeyboardShowListener>();
  private hideListeners = new Set<KeyboardHideListener>();
  private state: KeyboardInfo = { isVisible: false, keyboardHeight: 0 };
  private initialized = false;
  private cleanupFns: (() => void)[] = [];

  async init(): Promise<void> {
    if (this.initialized) return;
    this.initialized = true;

    if (isNative()) {
      await this.initNative();
    } else {
      this.initWeb();
    }
  }

  private async initNative(): Promise<void> {
    try {
      await Keyboard.setScroll({ isDisabled: false });

      try {
        await Keyboard.setAccessoryBarVisible({ isVisible: true });
      } catch {}

      const showHandle = await Keyboard.addListener("keyboardWillShow", (info) => {
        this.state = { isVisible: true, keyboardHeight: info.keyboardHeight };
        this.notify();
        this.scrollFocusedInputIntoView();
      });

      const hideHandle = await Keyboard.addListener("keyboardWillHide", () => {
        this.state = { isVisible: false, keyboardHeight: 0 };
        this.notify();
      });

      this.cleanupFns.push(
        () => showHandle.remove(),
        () => hideHandle.remove()
      );
    } catch (e) {
      console.warn("[keyboard-manager] Native keyboard init failed, using web fallback:", e);
      this.initWeb();
    }
  }

  private initWeb(): void {
    if (typeof visualViewport === "undefined") return;

    const handler = () => {
      const fullHeight = window.innerHeight;
      const viewportHeight = visualViewport!.height;
      const kbHeight = Math.max(0, fullHeight - viewportHeight);
      const isVisible = kbHeight > 50;

      if (isVisible !== this.state.isVisible || kbHeight !== this.state.keyboardHeight) {
        this.state = { isVisible, keyboardHeight: kbHeight };
        this.notify();
        if (isVisible) {
          this.scrollFocusedInputIntoView();
        }
      }
    };

    visualViewport!.addEventListener("resize", handler);
    this.cleanupFns.push(() => visualViewport!.removeEventListener("resize", handler));
  }

  private scrollFocusedInputIntoView(): void {
    requestAnimationFrame(() => {
      const active = document.activeElement;
      if (
        active &&
        (active instanceof HTMLInputElement ||
          active instanceof HTMLTextAreaElement ||
          active instanceof HTMLSelectElement)
      ) {
        active.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    });
  }

  private notify(): void {
    for (const fn of this.listeners) {
      try { fn(this.state); } catch {}
    }

    if (this.state.isVisible) {
      for (const fn of this.showListeners) {
        try { fn(this.state); } catch {}
      }
    } else {
      for (const fn of this.hideListeners) {
        try { fn(); } catch {}
      }
    }
  }

  getState(): KeyboardInfo {
    return { ...this.state };
  }

  isVisible(): boolean {
    return this.state.isVisible;
  }

  getHeight(): number {
    return this.state.keyboardHeight;
  }

  subscribe(fn: KeyboardListener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  onShow(fn: KeyboardShowListener): () => void {
    this.showListeners.add(fn);
    return () => this.showListeners.delete(fn);
  }

  onHide(fn: KeyboardHideListener): () => void {
    this.hideListeners.add(fn);
    return () => this.hideListeners.delete(fn);
  }

  async show(): Promise<void> {
    if (!isNative()) return;
    try {
      await Keyboard.show();
    } catch {}
  }

  async hide(): Promise<void> {
    if (!isNative()) {
      (document.activeElement as HTMLElement)?.blur?.();
      return;
    }
    try {
      await Keyboard.hide();
    } catch {}
  }

  async setAccessoryBarVisible(visible: boolean): Promise<void> {
    if (!isNative()) return;
    try {
      await Keyboard.setAccessoryBarVisible({ isVisible: visible });
    } catch {}
  }

  destroy(): void {
    for (const fn of this.cleanupFns) {
      try { fn(); } catch {}
    }
    this.cleanupFns = [];
    this.listeners.clear();
    this.showListeners.clear();
    this.hideListeners.clear();
    this.initialized = false;
  }
}

export const keyboardManager = new KeyboardManager();
