import { useState } from "react";
import { usePropertyMediaStore } from "@/stores/propertyMediaStore";

export function ListingImageUploader(props: { listingId: string }) {
  const [file, setFile] = useState<File | null>(null);
  const uploadListingImage = usePropertyMediaStore((s) => s.uploadListingImage);
  const uploading = usePropertyMediaStore((s) => s.uploading);

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      <h3 className="text-sm font-semibold text-foreground">Upload Listing Image</h3>
      <input
        type="file"
        accept="image/*"
        className="text-xs text-muted-foreground"
        onChange={(e) => setFile(e.target.files?.[0] ?? null)}
      />
      <button
        disabled={!file || uploading}
        className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
        onClick={async () => {
          if (!file) return;
          await uploadListingImage(props.listingId, file);
          setFile(null);
        }}
      >
        {uploading ? "Uploading..." : "Upload"}
      </button>
    </div>
  );
}
