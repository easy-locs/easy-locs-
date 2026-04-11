import { MessageCircle, CreditCard, MapPin, Bookmark, Share2, ExternalLink } from "lucide-react";
import type { Story, StoryCTAType } from "@/lib/stories/story-types";
import { emitStoryCTA } from "@/lib/stories/story-events";
import { useI18n } from "@/lib/i18n";

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
  const { t } = useI18n();

  const handleCTA = (ctaType: StoryCTAType | undefined, ctaLabel?: string) => {
    if (!ctaType) return;
    emitStoryCTA(story, ctaType, ctaLabel);
  };

  return (
    <div
      className="absolute bottom-0 left-0 right-0 z-30 px-4 pb-6 pt-20"
      style={{
        paddingBottom: "calc(env(safe-area-inset-bottom, 20px) + 16px)",
        background: "linear-gradient(to top, hsl(220 40% 18% / 0.92) 0%, hsl(220 40% 18% / 0.5) 50%, transparent 100%)",
      }}
    >
      <div className="mb-4">
        <h2 className="text-lg font-bold text-white leading-tight mb-1">{story.title}</h2>
        {story.subtitle && <p className="text-sm text-white/80 leading-snug">{story.subtitle}</p>}
        <div className="flex items-center gap-3 mt-2">
          {story.priceLabel && (
            <span className="text-sm font-bold" style={{ color: "hsl(38 65% 56%)" }}>{story.priceLabel}</span>
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
          <span
            className="inline-block mt-2 px-2.5 py-0.5 rounded-lg text-[11px] font-bold"
            style={{ background: "hsl(38 65% 56%)", color: "hsl(220 40% 18%)" }}
          >
            {story.statusLabel}
          </span>
        )}
      </div>

      <div className="flex gap-2.5">
        {story.primaryCTAType && (
          <button
            onClick={() => handleCTA(story.primaryCTAType, story.primaryCTALabel)}
            className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold text-sm active:scale-[0.97] transition-transform"
            style={{ background: "hsl(38 65% 56%)", color: "hsl(220 40% 18%)" }}
          >
            {CTA_ICONS[story.primaryCTAType]}
            {story.primaryCTALabel || t("story.open") || "Open"}
          </button>
        )}
        {story.secondaryCTAType && (
          <button
            onClick={() => handleCTA(story.secondaryCTAType, story.secondaryCTALabel)}
            className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold text-sm border active:scale-[0.97] transition-transform"
            style={{
              background: "hsl(0 0% 100% / 0.1)",
              backdropFilter: "blur(8px)",
              borderColor: "hsl(0 0% 100% / 0.2)",
              color: "white",
            }}
          >
            {CTA_ICONS[story.secondaryCTAType]}
            {story.secondaryCTALabel || t("story.more") || "More"}
          </button>
        )}
      </div>

      <div className="flex justify-center gap-8 mt-3">
        <button onClick={() => handleCTA("save")} className="flex flex-col items-center gap-0.5 text-white/60 active:text-white transition-colors">
          <Bookmark className="h-5 w-5" />
          <span className="text-[10px] font-medium">{t("story.save") || "Save"}</span>
        </button>
        <button onClick={() => handleCTA("share")} className="flex flex-col items-center gap-0.5 text-white/60 active:text-white transition-colors">
          <Share2 className="h-5 w-5" />
          <span className="text-[10px] font-medium">{t("story.share") || "Share"}</span>
        </button>
      </div>
    </div>
  );
}
