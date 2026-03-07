import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useI18n } from "@/lib/i18n";

interface Props {
  photos: string[];
}

const ListingPhotoGallery = ({ photos }: Props) => {
  const { t } = useI18n();
  const [index, setIndex] = useState(0);

  if (photos.length === 0) {
    return (
      <div className="relative w-full h-[50vh] sm:h-[60vh] bg-muted flex items-center justify-center">
        <p className="text-muted-foreground">{t("page.listing.no_photos")}</p>
      </div>
    );
  }

  return (
    <div className="relative w-full h-[50vh] sm:h-[60vh] bg-muted">
      <img src={photos[index]} alt="" className="w-full h-full object-cover" />
      {photos.length > 1 && (
        <>
          <button
            onClick={() => setIndex(i => (i - 1 + photos.length) % photos.length)}
            className="absolute left-3 top-1/2 -translate-y-1/2 bg-background/80 backdrop-blur rounded-full p-2 hover:bg-background transition-colors"
            aria-label="Previous"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            onClick={() => setIndex(i => (i + 1) % photos.length)}
            className="absolute right-3 top-1/2 -translate-y-1/2 bg-background/80 backdrop-blur rounded-full p-2 hover:bg-background transition-colors"
            aria-label="Next"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
            {photos.map((_, i) => (
              <button
                key={i}
                onClick={() => setIndex(i)}
                className={`w-2 h-2 rounded-full transition-colors ${i === index ? "bg-white" : "bg-white/40"}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default ListingPhotoGallery;
