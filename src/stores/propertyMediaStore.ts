import { create } from "zustand";
import { uploadFile, getPublicFileUrl } from "@/lib/storage/uploadFile";
import { requireOrbitIdentity } from "@/hooks/useOrbitIdentity";
import { useListingStore } from "@/stores/listingStore";

type PropertyMediaStore = {
  uploading: boolean;
  uploadListingImage: (listingId: string, file: File) => Promise<string>;
};

export const usePropertyMediaStore = create<PropertyMediaStore>((set) => ({
  uploading: false,

  uploadListingImage: async (listingId, file) => {
    const orbit = requireOrbitIdentity();
    const listing = useListingStore.getState().getListingById(listingId);
    if (!listing) throw new Error("Missing listing");
    if (listing.ownerOrbitId !== orbit.orbitId) throw new Error("Not allowed");

    set({ uploading: true });

    const ext = file.name.split(".").pop() || "jpg";
    const path = `${orbit.orbitId}/${listingId}/${Date.now()}.${ext}`;

    await uploadFile({
      bucket: "property-media",
      path,
      file,
      upsert: true,
    });

    const publicUrl = getPublicFileUrl("property-media", path);

    await useListingStore.getState().updateListing(listingId, {
      media: [
        ...listing.media,
        {
          id: `media_${Math.random().toString(36).slice(2, 11)}`,
          type: "image",
          url: publicUrl,
          cover: listing.media.length === 0,
        },
      ],
    });

    set({ uploading: false });
    return publicUrl;
  },
}));
