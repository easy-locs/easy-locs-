/**
 * Global Overlay Store — SSOT for ALL overlay/modal/sheet/viewer state.
 * Single owner, single API, zero local overlay state allowed.
 */
import { create } from "zustand";

// ── Overlay payload types ──

export interface MediaViewerPayload {
  items: { url: string; kind: string }[];
  currentIndex: number;
}

export interface CallOverlayPayload {
  callId: string;
  state: string;
}

export interface ModalPayload {
  type: string;
  title?: string;
  message?: string;
  props?: Record<string, unknown>;
  onConfirm?: () => void;
  onCancel?: () => void;
}

export interface BottomSheetPayload {
  type: string;
  props?: Record<string, unknown>;
}

export interface ToastItem {
  id: string;
  message: string;
  variant?: "default" | "success" | "destructive";
  duration?: number;
}

export type OverlayType =
  | "mediaViewer"
  | "callOverlay"
  | "modal"
  | "bottomSheet"
  | "loader";

// ── State shape ──

interface OverlayState {
  mediaViewer: MediaViewerPayload | null;
  callOverlay: CallOverlayPayload | null;
  modal: ModalPayload | null;
  bottomSheet: BottomSheetPayload | null;
  loader: { message?: string } | null;
  toastQueue: ToastItem[];

  // ── API ──
  openOverlay: <T extends OverlayType>(type: T, payload: OverlayPayloadMap[T]) => void;
  closeOverlay: (type: OverlayType) => void;
  replaceOverlay: <T extends OverlayType>(type: T, payload: OverlayPayloadMap[T]) => void;
  isOverlayOpen: (type: OverlayType) => boolean;
  pushToast: (toast: Omit<ToastItem, "id">) => void;
  dismissToast: (id: string) => void;
  closeAll: () => void;
}

type OverlayPayloadMap = {
  mediaViewer: MediaViewerPayload;
  callOverlay: CallOverlayPayload;
  modal: ModalPayload;
  bottomSheet: BottomSheetPayload;
  loader: { message?: string };
};

export const useOverlayStore = create<OverlayState>((set, get) => ({
  mediaViewer: null,
  callOverlay: null,
  modal: null,
  bottomSheet: null,
  loader: null,
  toastQueue: [],

  openOverlay: (type, payload) => {
    set({ [type]: payload } as any);
  },

  closeOverlay: (type) => {
    set({ [type]: null } as any);
  },

  replaceOverlay: (type, payload) => {
    set({ [type]: payload } as any);
  },

  isOverlayOpen: (type) => {
    return get()[type] !== null;
  },

  pushToast: (toast) => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    set((s) => ({ toastQueue: [...s.toastQueue, { ...toast, id }] }));
    // Auto-dismiss
    const duration = toast.duration ?? 4000;
    setTimeout(() => {
      set((s) => ({ toastQueue: s.toastQueue.filter((t) => t.id !== id) }));
    }, duration);
  },

  dismissToast: (id) => {
    set((s) => ({ toastQueue: s.toastQueue.filter((t) => t.id !== id) }));
  },

  closeAll: () => {
    set({
      mediaViewer: null,
      callOverlay: null,
      modal: null,
      bottomSheet: null,
      loader: null,
    });
  },
}));

// ── Convenience helpers (importable anywhere) ──

export const OverlayAPI = {
  openMedia(items: { url: string; kind: string }[], startIndex = 0) {
    useOverlayStore.getState().openOverlay("mediaViewer", { items, currentIndex: startIndex });
  },
  closeMedia() {
    useOverlayStore.getState().closeOverlay("mediaViewer");
  },
  openModal(payload: ModalPayload) {
    useOverlayStore.getState().openOverlay("modal", payload);
  },
  closeModal() {
    useOverlayStore.getState().closeOverlay("modal");
  },
  openSheet(type: string, props?: Record<string, unknown>) {
    useOverlayStore.getState().openOverlay("bottomSheet", { type, props });
  },
  closeSheet() {
    useOverlayStore.getState().closeOverlay("bottomSheet");
  },
  showLoader(message?: string) {
    useOverlayStore.getState().openOverlay("loader", { message });
  },
  hideLoader() {
    useOverlayStore.getState().closeOverlay("loader");
  },
  toast(message: string, variant?: "default" | "success" | "destructive") {
    useOverlayStore.getState().pushToast({ message, variant });
  },
};
