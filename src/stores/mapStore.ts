import { create } from "zustand";
import type { MapMarkerRecord } from "@/lib/types/map";
import { useListingStore } from "@/stores/listingStore";

type MapStore = {
  markers: MapMarkerRecord[];
  selectedMarkerId: string | null;
  viewport: {
    centerLat: number;
    centerLng: number;
    zoom: number;
  };

  buildListingMarkers: () => void;
  setMarkers: (markers: MapMarkerRecord[]) => void;
  selectMarker: (markerId: string | null) => void;
  setViewport: (input: Partial<MapStore["viewport"]>) => void;
  getSelectedMarker: () => MapMarkerRecord | null;
};

export const useMapStore = create<MapStore>((set, get) => ({
  markers: [],
  selectedMarkerId: null,
  viewport: {
    centerLat: 25.2048,
    centerLng: 55.2708,
    zoom: 11,
  },

  buildListingMarkers: () => {
    const listings = useListingStore.getState().getPublishedListings();

    const markers: MapMarkerRecord[] = listings.map((listing) => ({
      id: `marker_${listing.id}`,
      type: "listing",
      lat: listing.location.lat,
      lng: listing.location.lng,
      title: listing.title,
      subtitle: listing.location.address,
      listingId: listing.id,
      orbitId: listing.ownerOrbitId,
      selected: false,
    }));

    set({ markers });
  },

  setMarkers: (markers) => set({ markers }),

  selectMarker: (markerId) => {
    set((state) => ({
      selectedMarkerId: markerId,
      markers: state.markers.map((m) => ({
        ...m,
        selected: m.id === markerId,
      })),
    }));
  },

  setViewport: (input) =>
    set((state) => ({
      viewport: {
        ...state.viewport,
        ...input,
      },
    })),

  getSelectedMarker: () => {
    const state = get();
    return state.markers.find((m) => m.id === state.selectedMarkerId) ?? null;
  },
}));
