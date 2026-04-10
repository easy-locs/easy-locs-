import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { usePropertyDetailStore } from "@/stores/propertyDetailStore";
import { useListingStore } from "@/stores/listingStore";
import { useAnalyticsStore } from "@/stores/analyticsStore";

export function usePropertyQuerySync() {
  const [searchParams, setSearchParams] = useSearchParams();
  const openListing = usePropertyDetailStore((s) => s.openListing);
  const closeListing = usePropertyDetailStore((s) => s.closeListing);
  const getListingById = useListingStore((s) => s.getListingById);
  const trackListingView = useAnalyticsStore((s) => s.trackListingView);

  useEffect(() => {
    const listingId = searchParams.get("listing");
    if (!listingId) {
      closeListing();
      return;
    }

    const listing = getListingById(listingId);
    if (!listing) return;

    openListing(listingId);
    void trackListingView(listingId, "share_link");
  }, [searchParams, openListing, closeListing, getListingById, trackListingView]);

  const setListingInUrl = (listingId: string | null) => {
    const next = new URLSearchParams(searchParams);
    if (listingId) next.set("listing", listingId);
    else next.delete("listing");
    setSearchParams(next, { replace: true });
  };

  return { setListingInUrl };
}
