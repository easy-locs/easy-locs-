import type { NativeSecureStoreAdapter } from "./types";

const memoryFallback = new Map<string, string>();

export class BrowserSecureStoreAdapter implements NativeSecureStoreAdapter {
  async isAvailable(): Promise<boolean> {
    return true;
  }

  async get(key: string): Promise<string | null> {
    try {
      return localStorage.getItem(key);
    } catch {
      return memoryFallback.get(key) ?? null;
    }
  }

  async set(key: string, value: string): Promise<void> {
    try {
      localStorage.setItem(key, value);
    } catch {
      memoryFallback.set(key, value);
    }
  }

  async remove(key: string): Promise<void> {
    try {
      localStorage.removeItem(key);
    } catch {
      memoryFallback.delete(key);
    }
  }
}

export const secureStore: NativeSecureStoreAdapter = new BrowserSecureStoreAdapter();
