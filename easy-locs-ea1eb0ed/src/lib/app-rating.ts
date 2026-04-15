const STORAGE_KEY = "easylocs_rating_state";
const SESSION_THRESHOLD = 5;

interface RatingState {
  sessionCount: number;
  lastPromptDate: string | null;
  dismissed: boolean;
  rated: boolean;
}

function getState(): RatingState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { sessionCount: 0, lastPromptDate: null, dismissed: false, rated: false };
}

function saveState(state: RatingState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {}
}

export function incrementSession(): void {
  const state = getState();
  state.sessionCount += 1;
  saveState(state);
}

export function recordPositiveEvent(): void {
  const state = getState();
  state.sessionCount += 2;
  saveState(state);
}

export function shouldShowRatingPrompt(): boolean {
  const state = getState();
  if (state.rated || state.dismissed) return false;
  if (state.sessionCount < SESSION_THRESHOLD) return false;
  if (state.lastPromptDate) {
    const lastDate = new Date(state.lastPromptDate);
    const daysSince = (Date.now() - lastDate.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSince < 14) return false;
  }
  return true;
}

export function markPromptShown(): void {
  const state = getState();
  state.lastPromptDate = new Date().toISOString();
  saveState(state);
}

export function markRated(): void {
  const state = getState();
  state.rated = true;
  saveState(state);
}

export function markDismissed(): void {
  const state = getState();
  state.dismissed = true;
  saveState(state);
}

export function markLater(): void {
  const state = getState();
  state.lastPromptDate = new Date().toISOString();
  state.sessionCount = 0;
  saveState(state);
}

export function getStoreUrl(): string {
  const ua = navigator.userAgent.toLowerCase();
  if (/iphone|ipad|ipod/.test(ua)) {
    const appStoreId = (typeof import.meta !== "undefined" && import.meta.env?.VITE_APP_STORE_ID) || "";
    if (appStoreId) {
      return `https://apps.apple.com/app/easy-locs/id${appStoreId}`;
    }
    return "https://apps.apple.com/app/easy-locs";
  }
  return "https://play.google.com/store/apps/details?id=com.easylocs.app";
}
