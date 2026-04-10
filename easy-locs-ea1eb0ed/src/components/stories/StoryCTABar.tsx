import { MessageCircle, CreditCard, MapPin, Bookmark, Share2, ExternalLink } from "lucide-react";
import type { Story, StoryCTAType } from "@/lib/stories/story-types";
import { emitStoryCTA } from "@/lib/stories/story-events";

interface StoryCTABarProps {
  story: Story;
}

const CTA_ICONS: Record<string, React.ReactNode> = {
  open: <ExternalLink className="h-4 w-4" />,
  orbit: <MessageCircle className="h-4 w-4" />,
  wallet: <CreditCard className="h-4 w-4" />,
  map: <MapPin className="h-4 w-4" />,
  save: <Bookmark className="h-4 w-4" />,
  share: <Share2 className="h-4 w-4" />,
};

export default function StoryCTABar({ story }: StoryCTABarProps) {
  const handleCTA = (ctaType: StoryCTAType | undefined, ctaLabel?: string) => {
    if (!ctaType) return;
    emitStoryCTA(story, ctaType, ctaLabel);
  };

  return (
    <div
      className="absolute bottom-0 left-0 right-0 z-30 px-4 pb-6 pt-16"
      style={{
        paddingBottom: "calc(env(safe-area-inset-bottom, 20px) + 16px)",
        background: "linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.4) 60%, transparent 100%)",
      }}
    >
      <div className="mb-4">
        <h2 className="text-xl font-bold text-white leading-tight mb-1">{story.title}</h2>
        {story.subtitle && <p className="text-sm text-white/80">{story.subtitle}</p>}
        <div className="flex items-center gap-3 mt-2">
          {story.priceLabel && (
            <span className="text-sm font-bold text-amber-400">{story.priceLabel}</span>
          )}
          {story.locationLabel && (
            <span className="text-xs text-white/70 flex items-center gap-1">
              <MapPin className="h-3 w-3" /> {story.locationLabel}
            </span>
          )}
          {story.distanceLabel && (
            <span className="text-xs text-white/60">{story.distanceLabel}</span>
          )}
        </div>
        {story.statusLabel && (
          <span className="inline-block mt-2 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/90 text-white">
            {story.statusLabel}
          </span>
        )}
      </div>

      <div className="flex gap-2">
        {story.primaryCTAType && (
          <button
            onClick={() => handleCTA(story.primaryCTAType, story.primaryCTALabel)}
            className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-amber-500 text-white font-bold text-sm active:scale-[0.97] transition-transform"
          >
            {CTA_ICONS[story.primaryCTAType]}
            {story.primaryCTALabel || "Open"}
          </button>
        )}
        {story.secondaryCTAType && (
          <button
            onClick={() => handleCTA(story.secondaryCTAType, story.secondaryCTALabel)}
            className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-white/15 backdrop-blur-sm text-white font-bold text-sm border border-white/20 active:scale-[0.97] transition-transform"
          >
            {CTA_ICONS[story.secondaryCTAType]}
            {story.secondaryCTALabel || "More"}
          </button>
        )}
      </div>

      <div className="flex justify-center gap-6 mt-3">
        <button onClick={() => handleCTA("save")} className="flex flex-col items-center gap-0.5 text-white/70 active:text-white transition-colors">
          <Bookmark className="h-5 w-5" />
          <span className="text-[10px]">Save</span>
        </button>
        <button onClick={() => handleCTA("share")} className="flex flex-col items-center gap-0.5 text-white/70 active:text-white transition-colors">
          <Share2 className="h-5 w-5" />
          <span className="text-[10px]">Share</span>
        </button>
      </div>
    </div>
  );
}
