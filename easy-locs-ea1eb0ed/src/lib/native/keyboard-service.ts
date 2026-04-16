export interface KeyboardInfo {
  keyboardHeight: number;
  isVisible: boolean;
}

type KeyboardCallback = (info: KeyboardInfo) => void;

let keyboardCallbacks: KeyboardCallback[] = [];
let currentKeyboardHeight = 0;
let isKeyboardVisible = false;

export async function initKeyboardHandling(): Promise<void> {
  try {
    const { Keyboard } = await import("@capacitor/keyboard");

    Keyboard.addListener("keyboardWillShow", (info) => {
      currentKeyboardHeight = info.keyboardHeight;
      isKeyboardVisible = true;
      notifyCallbacks();
      adjustScrollForInput(info.keyboardHeight);
    });

    Keyboard.addListener("keyboardWillHide", () => {
      currentKeyboardHeight = 0;
      isKeyboardVisible = false;
      notifyCallbacks();
      resetScroll();
    });

    Keyboard.addListener("keyboardDidShow", (info) => {
      currentKeyboardHeight = info.keyboardHeight;
      isKeyboardVisible = true;
      notifyCallbacks();
    });

    Keyboard.addListener("keyboardDidHide", () => {
      currentKeyboardHeight = 0;
      isKeyboardVisible = false;
      notifyCallbacks();
    });
  } catch (err) {
    console.debug("[keyboard] Capacitor keyboard unavailable, using web detection:", err instanceof Error ? err.message : err);
    initWebKeyboardDetection();
  }
}

function initWebKeyboardDetection(): void {
  if (typeof visualViewport === "undefined") return;

  visualViewport.addEventListener("resize", () => {
    const heightDiff = window.innerHeight - (visualViewport?.height ?? window.innerHeight);
    const visible = heightDiff > 100;

    if (visible !== isKeyboardVisible || heightDiff !== currentKeyboardHeight) {
      currentKeyboardHeight = visible ? heightDiff : 0;
      isKeyboardVisible = visible;
      notifyCallbacks();
    }
  });
}

function notifyCallbacks(): void {
  const info: KeyboardInfo = {
    keyboardHeight: currentKeyboardHeight,
    isVisible: isKeyboardVisible,
  };
  keyboardCallbacks.forEach((cb) => cb(info));
}

function adjustScrollForInput(keyboardHeight: number): void {
  const activeElement = document.activeElement;
  if (!activeElement || !(activeElement instanceof HTMLElement)) return;

  const rect = activeElement.getBoundingClientRect();
  const viewportHeight = window.innerHeight - keyboardHeight;

  if (rect.bottom > viewportHeight) {
    const scrollAmount = rect.bottom - viewportHeight + 20;
    activeElement.scrollIntoView({ behavior: "smooth", block: "center" });
  }
}

function resetScroll(): void {
  // no-op
}

export function onKeyboardChange(callback: KeyboardCallback): () => void {
  keyboardCallbacks.push(callback);
  return () => {
    keyboardCallbacks = keyboardCallbacks.filter((cb) => cb !== callback);
  };
}

export function getKeyboardHeight(): number {
  return currentKeyboardHeight;
}

export function isKeyboardOpen(): boolean {
  return isKeyboardVisible;
}

export async function hideKeyboard(): Promise<void> {
  try {
    const { Keyboard } = await import("@capacitor/keyboard");
    await Keyboard.hide();
  } catch (err) {
    console.debug("[keyboard] hide fallback to blur:", err instanceof Error ? err.message : err);
    (document.activeElement as HTMLElement)?.blur();
  }
}

export async function showKeyboard(): Promise<void> {
  try {
    const { Keyboard } = await import("@capacitor/keyboard");
    await Keyboard.show();
  } catch (err) {
    console.debug("[keyboard] show unavailable:", err instanceof Error ? err.message : err);
  }
}

export async function setKeyboardAccessoryBarVisible(visible: boolean): Promise<void> {
  try {
    const { Keyboard } = await import("@capacitor/keyboard");
    await Keyboard.setAccessoryBarVisible({ isVisible: visible });
  } catch (err) {
    console.debug("[keyboard] setAccessoryBarVisible unavailable:", err instanceof Error ? err.message : err);
  }
}

export async function setKeyboardScroll(enabled: boolean): Promise<void> {
  try {
    const { Keyboard } = await import("@capacitor/keyboard");
    await Keyboard.setScroll({ isDisabled: !enabled });
  } catch (err) {
    console.debug("[keyboard] setScroll unavailable:", err instanceof Error ? err.message : err);
  }
}
