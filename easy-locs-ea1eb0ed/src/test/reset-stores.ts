import { useCallStore } from "@/stores/orbit/call.store";
import { useOrbitThreadStore } from "@/stores/orbit/thread.store";
import { useOrbitSelectionStore } from "@/stores/orbit/selection.store";
import { useOrbitComposerStore } from "@/stores/orbit/composer.store";
import { useThreadSelectionStore } from "@/stores/orbit/thread-selection.store";
import { useTaxiFlowStore } from "@/stores/taxiFlowStore";
import { useCustomerMobilityStore } from "@/stores/customerMobilityStore";
import { useCartStore } from "@/stores/cartStore";
import { useUnifiedSearchStore } from "@/lib/search-engine/search-store";
import { useOverlayStore } from "@/stores/overlay.store";
import { useAudioRouteStore } from "@/families/calls/call-audio-route";

const stores = [
  useCallStore,
  useOrbitThreadStore,
  useOrbitSelectionStore,
  useOrbitComposerStore,
  useThreadSelectionStore,
  useTaxiFlowStore,
  useCustomerMobilityStore,
  useCartStore,
  useUnifiedSearchStore,
  useOverlayStore,
  useAudioRouteStore,
] as Array<{ getState: () => unknown; setState: (s: unknown) => void; getInitialState?: () => unknown }>;

export function resetAllStores() {
  for (const store of stores) {
    if (typeof store.getInitialState === "function") {
      store.setState(store.getInitialState(), true);
    }
  }
}
