import { usePropertyDetailStore } from "@/stores/propertyDetailStore";

export function PropertyGallery() {
  const listing = usePropertyDetailStore((s) => s.selectedListing);

  if (!listing) {
    return (
      <div className="rounded-lg border border-border p-4">
        <h3 className="text-sm font-semibold text-foreground">Gallery</h3>
        <p className="text-xs text-muted-foreground mt-2">No listing selected</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border p-4 space-y-3">
      <h3 className="text-sm font-semibold text-foreground">Gallery</h3>

      {listing.media.length === 0 ? (
        <p className="text-xs text-muted-foreground">No media uploaded</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {listing.media.map((media) => (
            <div key={media.url} className="rounded-lg overflow-hidden border border-border aspect-square">
              {media.type === "image" ? (
                <img src={media.url} alt="" className="w-full h-full object-cover" />
              ) : (
                <video src={media.url} controls className="w-full h-full object-cover" />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
