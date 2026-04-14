import { useState } from "react";
import { usePropertyDetailStore } from "@/stores/propertyDetailStore";
import { X, ChevronLeft, ChevronRight, ZoomIn } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const GOLD = "hsl(var(--accent))";

export function PropertyGallery() {
  const listing = usePropertyDetailStore((s) => s.selectedListing);
  const [fullscreen, setFullscreen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  if (!listing) {
    return (
      <div className="rounded-2xl p-6 flex flex-col items-center justify-center gap-2"
        style={{ border: "1px solid hsl(var(--border) / 0.12)", background: "hsl(var(--card))" }}>
        <span className="text-3xl">🖼️</span>
        <h3 className="text-sm font-bold text-foreground">Gallery</h3>
        <p className="text-xs text-muted-foreground">No listing selected</p>
      </div>
    );
  }

  const media = listing.media || [];

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

  return (
    <>
      <div className="rounded-2xl overflow-hidden"
        style={{ border: "1px solid hsl(var(--border) / 0.12)", background: "hsl(var(--card))" }}>
        <div className="p-3 flex items-center justify-between">
          <h3 className="text-sm font-bold text-foreground">Gallery</h3>
          <span className="text-[11px] text-muted-foreground">{media.length} item{media.length !== 1 ? "s" : ""}</span>
        </div>

        {media.length === 1 ? (
          <div className="px-3 pb-3">
            <button onClick={() => openFullscreen(0)} className="relative w-full aspect-[16/10] rounded-xl overflow-hidden group">
              {media[0].type === "image" ? (
                <img src={media[0].url} alt="Property photo 1" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
              ) : (
                <video src={media[0].url} className="w-full h-full object-cover" />
              )}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                <ZoomIn className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </button>
          </div>
        ) : media.length <= 4 ? (
          <div className="px-3 pb-3 grid grid-cols-2 gap-2">
            {media.map((m, i) => (
              <button key={m.url} onClick={() => openFullscreen(i)} className="relative aspect-square rounded-xl overflow-hidden group">
                {m.type === "image" ? (
                  <img src={m.url} alt={`Property photo ${i + 1}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
                ) : (
                  <video src={m.url} className="w-full h-full object-cover" />
                )}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                  <ZoomIn className="h-5 w-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="px-3 pb-3 space-y-2">
            <button onClick={() => openFullscreen(0)} className="relative w-full aspect-[16/10] rounded-xl overflow-hidden group">
              {media[0].type === "image" ? (
                <img src={media[0].url} alt="Property main photo" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
              ) : (
                <video src={media[0].url} className="w-full h-full object-cover" />
              )}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
            </button>
            <div className="grid grid-cols-3 gap-2">
              {media.slice(1, 4).map((m, i) => (
                <button key={m.url} onClick={() => openFullscreen(i + 1)} className="relative aspect-square rounded-xl overflow-hidden group">
                  {m.type === "image" ? (
                    <img src={m.url} alt={`Property photo ${i + 2}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
                  ) : (
                    <video src={m.url} className="w-full h-full object-cover" />
                  )}
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

      <AnimatePresence>
        {fullscreen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] bg-black/95 flex flex-col items-center justify-center"
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
                <img src={media[activeIndex].url} alt="" className="w-full max-h-[75vh] object-contain rounded-lg" />
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
                    {m.type === "image" ? (
                      <img src={m.url} alt="" className="w-full h-full object-cover" loading="lazy" />
                    ) : (
                      <div className="w-full h-full bg-white/20 flex items-center justify-center text-[10px] text-white">▶</div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
