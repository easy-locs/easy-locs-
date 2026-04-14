import { useState } from "react";
import { ChevronLeft, ChevronRight, Play } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { isVideoUrl } from "@/lib/media-utils";
import { OptimizedImage } from "@/components/ui/OptimizedImage";
import { useMediaAsset } from "@/hooks/useMediaAsset";

interface Props {
  photos: string[];
}

const ListingPhotoGallery = ({ photos }: Props) => {
  const { t } = useI18n();
  const [index, setIndex] = useState(0);
  const [videoPlaying, setVideoPlaying] = useState(false);
  const currentUrl = photos[index];
  const assetMeta = useMediaAsset(currentUrl);

  if (photos.length === 0) {
    return (
      <div className="relative w-full h-[50vh] sm:h-[60vh] bg-muted flex items-center justify-center">
        <p className="text-muted-foreground">{t("page.listing.no_photos")}</p>
      </div>
    );
  }

  const currentIsVideo = isVideoUrl(currentUrl);

  const goTo = (newIndex: number) => {
    setIndex(newIndex);
    setVideoPlaying(false);
  };

  return (
    <div className="relative w-full h-[50vh] sm:h-[60vh] bg-muted">
      {currentIsVideo ? (
        videoPlaying ? (
          <video
            src={currentUrl}
            className="w-full h-full object-contain bg-black"
            controls
            autoPlay
          />
        ) : (
          <div className="relative w-full h-full">
            <video src={currentUrl} className="w-full h-full object-cover" muted preload="metadata" />
            <button
              onClick={() => setVideoPlaying(true)}
              className="absolute inset-0 flex items-center justify-center bg-black/20 hover:bg-black/30 transition-colors"
              aria-label="Play video"
            >
              <div className="w-16 h-16 rounded-full bg-background/90 backdrop-blur flex items-center justify-center shadow-lg">
                <Play className="h-7 w-7 text-foreground ml-1" />
              </div>
            </button>
          </div>
        )
      ) : (
        <OptimizedImage src={currentUrl} alt={`Photo ${index + 1}`} className="w-full h-full" width={1600} sizes="100vw" priority={index === 0} lqip={assetMeta?.lqip ?? undefined} />
      )}

      {/* Transparent Easy-Locs watermark */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
        <span className="text-white/15 text-4xl sm:text-5xl font-black tracking-widest select-none rotate-[-15deg]">
          EASY-LOCS
        </span>
      </div>

      {photos.length > 1 && (
        <>
          <button
            onClick={() => goTo((index - 1 + photos.length) % photos.length)}
            className="absolute left-3 top-1/2 -translate-y-1/2 bg-background/80 backdrop-blur rounded-full w-11 h-11 flex items-center justify-center hover:bg-background transition-colors"
            aria-label="Previous"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            onClick={() => goTo((index + 1) % photos.length)}
            className="absolute right-3 top-1/2 -translate-y-1/2 bg-background/80 backdrop-blur rounded-full w-11 h-11 flex items-center justify-center hover:bg-background transition-colors"
            aria-label="Next"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
          {/* Thumbnail strip */}
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 max-w-[90%] overflow-x-auto pb-1">
            {photos.map((url, i) => (
              <button
                key={i}
                onClick={() => goTo(i)}
                className={`shrink-0 w-10 h-7 rounded-md overflow-hidden border-2 transition-all ${i === index ? "border-white scale-110" : "border-transparent opacity-50"}`}
                aria-label={`Media ${i + 1}`}
              >
                {isVideoUrl(url) ? (
                  <div className="w-full h-full bg-muted flex items-center justify-center">
                    <Play className="h-3 w-3 text-muted-foreground" />
                  </div>
                ) : (
                  <OptimizedImage src={url} alt={`Listing photo ${i + 1}`} className="w-full h-full" width={200} sizes="40px" />
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default ListingPhotoGallery;
