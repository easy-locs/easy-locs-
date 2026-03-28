import { create } from "zustand";
import { uploadFile } from "@/lib/storage/uploadFile";
import { requireOrbitIdentity } from "@/hooks/useOrbitIdentity";

type LeaseDocumentsStore = {
  uploading: boolean;
  uploadLeaseDocument: (leaseId: string, file: File) => Promise<string>;
};

export const useLeaseDocumentsStore = create<LeaseDocumentsStore>((set) => ({
  uploading: false,

  uploadLeaseDocument: async (leaseId, file) => {
    const orbit = requireOrbitIdentity();

    set({ uploading: true });

    const ext = file.name.split(".").pop() || "pdf";
    const path = `${orbit.orbitId}/${leaseId}/${Date.now()}.${ext}`;

    await uploadFile({
      bucket: "lease-documents",
      path,
      file,
      upsert: true,
    });

    set({ uploading: false });
    return path;
  },
}));
