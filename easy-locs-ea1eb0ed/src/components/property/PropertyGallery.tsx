import { useState } from "react";
import { usePropertyDetailStore } from "@/stores/propertyDetailStore";
import { X, ChevronLeft, ChevronRight, ZoomIn, View } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { OptimizedImage } from "@/components/ui/OptimizedImage";

type MediaItem = { url: string; type: "image" | "video" };

interface Props {
  images?: string[];
  variant?: "card" | "hero";
  virtualTourUrl?: string;
}

export function PropertyGallery({ images, variant = "card", virtualTourUrl }: Props) {
  const listing = usePropertyDetailStore((s) => s.selectedListing);
  const [fullscreen, setFullscreen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [showTour, setShowTour] = useState(false);

  const media: MediaItem[] = images
    ? images.map(url => ({ url, type: "image" as const }))
    : (listing?.media || []);

  if (!images && !listing) {
    return (
      <div className="rounded-2xl p-6 flex flex-col items-center justify-center gap-2"
        style={{ border: "1px solid hsl(var(--border) / 0.12)", background: "hsl(var(--card))" }}>
        <span className="text-3xl">🖼️</span>
        <h3 className="text-sm font-bold text-foreground">Gallery</h3>
        <p className="text-xs text-muted-foreground">No listing selected</p>
      </div>
    );
  }

  if (media.length === 0) {
    return (
      <div className="rounded-2xl p-6 flex flex-col items-center justify-center gap-2"
        style={{ border: "1px solid hsl(var(--border) / 0.12)", background: "hsl(var(--card))" }}>
        <span className="text-3xl">📷</span>
        <h3 className="text-sm font-bold text-foreground">Gallery</h3>
        <p className="text-xs text-muted-foreground">No media uploaded</p>
      </div>
    );
  }

  const openFullscreen = (index: number) => {
    setActiveIndex(index);
    setFullscreen(true);
  };

  const prev = () => setActiveIndex((i) => (i - 1 + media.length) % media.length);
  const next = () => setActiveIndex((i) => (i + 1) % media.length);

  const renderMediaItem = (m: MediaItem, alt: string, className: string) =>
    m.type === "image"
      ? <OptimizedImage src={m.url} alt={alt} className={className} width={800} sizes="100vw" />
      : <video src={m.url} className={className} />;

  if (variant === "hero") {
    return (
      <>
        <div className="relative h-56 rounded-2xl overflow-hidden mx-4">
          {renderMediaItem(media[activeIndex], `Photo ${activeIndex + 1}`, "w-full h-full object-cover")}
          {media.length > 1 && (
            <>
              <button onClick={prev} className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 flex items-center justify-center text-white">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button onClick={next} className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 flex items-center justify-center text-white">
                <ChevronRight className="h-4 w-4" />
              </button>
            </>
          )}
          <div className="absolute bottom-2 right-2 bg-black/50 text-white text-[0.625rem] px-2 py-0.5 rounded-full font-medium">
            {activeIndex + 1}/{media.length}
          </div>
          <button onClick={() => setFullscreen(true)} className="absolute bottom-2 left-2 bg-black/40 text-white p-1.5 rounded-full">
            <ZoomIn className="h-3.5 w-3.5" />
          </button>
          {virtualTourUrl && (
            <button
              onClick={() => setShowTour(true)}
              className="absolute top-2 right-2 flex items-center gap-1.5 bg-black/60 text-white text-[0.625rem] font-semibold px-2.5 py-1.5 rounded-full backdrop-blur-sm"
            >
              <View className="h-3.5 w-3.5" />
              Virtual Tour
            </button>
          )}
        </div>

        {virtualTourUrl && showTour && (
          <VirtualTourEmbed url={virtualTourUrl} onClose={() => setShowTour(false)} />
        )}

        {media.length > 1 && (
          <div className="flex gap-1.5 mx-4 mt-2 overflow-x-auto scrollbar-none">
            {media.slice(0, 6).map((m, i) => (
              <button
                key={i}
                onClick={() => setActiveIndex(i)}
                className="shrink-0 w-14 h-10 rounded-lg overflow-hidden transition-all"
                style={{
                  border: i === activeIndex ? `2px solid hsl(var(--primary))` : "2px solid transparent",
                  opacity: i === activeIndex ? 1 : 0.6,
                }}
              >
                {renderMediaItem(m, "", "w-full h-full object-cover")}
              </button>
            ))}
            {media.length > 6 && (
              <button
                onClick={() => setFullscreen(true)}
                className="shrink-0 w-14 h-10 rounded-lg bg-muted/30 flex items-center justify-center text-[0.625rem] font-bold text-muted-foreground"
              >
                +{media.length - 6}
              </button>
            )}
          </div>
        )}

        <FullscreenOverlay
          media={media}
          activeIndex={activeIndex}
          setActiveIndex={setActiveIndex}
          fullscreen={fullscreen}
          setFullscreen={setFullscreen}
          prev={prev}
          next={next}
          renderMediaItem={renderMediaItem}
        />
      </>
    );
  }

  return (
    <>
      <div className="rounded-2xl overflow-hidden"
        style={{ border: "1px solid hsl(var(--border) / 0.12)", background: "hsl(var(--card))" }}>
        <div className="p-3 flex items-center justify-between">
          <h3 className="text-sm font-bold text-foreground">Gallery</h3>
          <span className="text-[0.6875rem] text-muted-foreground">{media.length} item{media.length !== 1 ? "s" : ""}</span>
        </div>

        {media.length === 1 ? (
          <div className="px-3 pb-3">
            <button onClick={() => openFullscreen(0)} className="relative w-full aspect-[16/10] rounded-xl overflow-hidden group">
              {renderMediaItem(media[0], "Property photo 1", "w-full h-full object-cover group-hover:scale-105 transition-transform duration-500")}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                <ZoomIn className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </button>
          </div>
        ) : media.length <= 4 ? (
          <div className="px-3 pb-3 grid grid-cols-2 gap-2">
            {media.map((m, i) => (
              <button key={m.url} onClick={() => openFullscreen(i)} className="relative aspect-square rounded-xl overflow-hidden group">
                {renderMediaItem(m, `Property photo ${i + 1}`, "w-full h-full object-cover group-hover:scale-105 transition-transform duration-500")}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                  <ZoomIn className="h-5 w-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="px-3 pb-3 space-y-2">
            <button onClick={() => openFullscreen(0)} className="relative w-full aspect-[16/10] rounded-xl overflow-hidden group">
              {renderMediaItem(media[0], "Property main photo", "w-full h-full object-cover group-hover:scale-105 transition-transform duration-500")}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
            </button>
            <div className="grid grid-cols-3 gap-2">
              {media.slice(1, 4).map((m, i) => (
                <button key={m.url} onClick={() => openFullscreen(i + 1)} className="relative aspect-square rounded-xl overflow-hidden group">
                  {renderMediaItem(m, `Property photo ${i + 2}`, "w-full h-full object-cover group-hover:scale-105 transition-transform duration-500")}
                  {i === 2 && media.length > 4 && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center backdrop-blur-sm rounded-xl">
                      <span className="text-white font-bold text-lg">+{media.length - 4}</span>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <FullscreenOverlay
        media={media}
        activeIndex={activeIndex}
        setActiveIndex={setActiveIndex}
        fullscreen={fullscreen}
        setFullscreen={setFullscreen}
        prev={prev}
        next={next}
        renderMediaItem={renderMediaItem}
      />
    </>
  );
}

function FullscreenOverlay({
  media, activeIndex, setActiveIndex, fullscreen, setFullscreen, prev, next, renderMediaItem,
}: {
  media: MediaItem[];
  activeIndex: number;
  setActiveIndex: (i: number) => void;
  fullscreen: boolean;
  setFullscreen: (v: boolean) => void;
  prev: () => void;
  next: () => void;
  renderMediaItem: (m: MediaItem, alt: string, cls: string) => React.ReactNode;
}) {
  return (
    <AnimatePresence>
      {fullscreen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-fullscreen bg-black/95 flex flex-col items-center justify-center"
          onClick={() => setFullscreen(false)}
        >
          <button
            onClick={(e) => { e.stopPropagation(); setFullscreen(false); }}
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors z-10"
          >
            <X className="h-5 w-5 text-white" />
          </button>

          <span className="absolute top-5 left-1/2 -translate-x-1/2 text-white/60 text-sm font-medium">
            {activeIndex + 1} / {media.length}
          </span>

          <div className="relative w-full max-w-4xl px-4" onClick={(e) => e.stopPropagation()}>
            {media[activeIndex].type === "image" ? (
              <OptimizedImage src={media[activeIndex].url} alt="" className="w-full max-h-[75vh] rounded-lg" width={1600} sizes="100vw" objectFit="contain" />
            ) : (
              <video src={media[activeIndex].url} controls className="w-full max-h-[75vh] object-contain rounded-lg" />
            )}
          </div>

          {media.length > 1 && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); prev(); }}
                className="absolute left-3 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
              >
                <ChevronLeft className="h-6 w-6 text-white" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); next(); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
              >
                <ChevronRight className="h-6 w-6 text-white" />
              </button>
            </>
          )}

          {media.length > 1 && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 max-w-[90%] overflow-x-auto pb-1 scrollbar-none">
              {media.map((m, i) => (
                <button
                  key={m.url}
                  onClick={(e) => { e.stopPropagation(); setActiveIndex(i); }}
                  className={`shrink-0 w-14 h-10 rounded-lg overflow-hidden border-2 transition-all ${i === activeIndex ? "border-white scale-105" : "border-transparent opacity-50 hover:opacity-75"}`}
                >
                  {renderMediaItem(m, "", "w-full h-full object-cover")}
                </button>
              ))}
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function VirtualTourEmbed({ url, onClose }: { url: string; onClose: () => void }) {
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-fullscreen bg-black/95 flex flex-col"
      >
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2 text-white">
            <View className="h-4 w-4" />
            <span className="text-sm font-semibold">Virtual Tour</span>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
          >
            <X className="h-5 w-5 text-white" />
          </button>
        </div>
        <div className="flex-1 px-2 pb-2">
          <iframe
            src={url}
            title="Virtual Tour"
            className="w-full h-full rounded-xl border-0"
            allow="accelerometer; gyroscope; fullscreen; xr-spatial-tracking"
            allowFullScreen
          />
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
