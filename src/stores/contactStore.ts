import { create } from "zustand";
import { platformBus } from "@/app/events/platform-bus";
import { useUiShellStore } from "@/stores/uiShellStore";
import { useCallStore } from "@/stores/callStore";

type ContactState = {
  activeOrbitId: string | null;
  activeListingId: string | null;
  activeBookingId: string | null;

  openContact: (input: {
    orbitId: string;
    listingId?: string;
    bookingId?: string;
  }) => void;

  openChatPanel: () => void;
  startAudioCall: () => void;
  startVideoCall: () => void;
  clear: () => void;
};

export const useContactStore = create<ContactState>((set, get) => ({
  activeOrbitId: null,
  activeListingId: null,
  activeBookingId: null,

  openContact: ({ orbitId, listingId, bookingId }) => {
    set({
      activeOrbitId: orbitId,
      activeListingId: listingId ?? null,
      activeBookingId: bookingId ?? null,
    });

    useUiShellStore.getState().setPanels({
      rightPanel: "contact",
    });

    platformBus.emit({
      type: "contact.opened",
      payload: {
        orbitId,
        listingId,
        bookingId,
      },
    });
  },

  openChatPanel: () => {
    useUiShellStore.getState().setPanels({
      rightPanel: "chat",
    });
  },

  startAudioCall: () => {
    const orbitId = get().activeOrbitId;
    if (!orbitId) return;
    useCallStore.getState().startCall(orbitId, "audio");
    useUiShellStore.getState().setCallFullscreen(true);
  },

  startVideoCall: () => {
    const orbitId = get().activeOrbitId;
    if (!orbitId) return;
    useCallStore.getState().startCall(orbitId, "video");
    useUiShellStore.getState().setCallFullscreen(true);
  },

  clear: () => {
    set({
      activeOrbitId: null,
      activeListingId: null,
      activeBookingId: null,
    });
  },
}));
