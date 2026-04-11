import type { Story } from "@/lib/stories/story-types";
import { useI18n } from "@/lib/i18n";

interface StoryPreviewCardProps {
  story: Story;
  onClick: () => void;
  size?: "small" | "medium" | "large";
}

const TYPE_BADGE_COLORS: Record<string, string> = {
  property: "hsl(160 60% 45%)",
  stay: "hsl(210 70% 50%)",
  merchant: "hsl(38 65% 56%)",
  product: "hsl(270 60% 55%)",
  deal: "hsl(0 70% 55%)",
  utility: "hsl(220 15% 50%)",
  mobility: "hsl(185 60% 45%)",
  service: "hsl(38 65% 56%)",
};

const SIZE_CONFIG = {
  small: { width: "w-[130px]", aspect: "aspect-[3/4]", titleClass: "text-xs", metaClass: "text-[10px]", priceClass: "text-xs" },
  medium: { width: "w-[148px]", aspect: "aspect-[3/4]", titleClass: "text-[13px]", metaClass: "text-[11px]", priceClass: "text-[13px]" },
  large: { width: "w-[170px]", aspect: "aspect-[3/4]", titleClass: "text-sm", metaClass: "text-xs", priceClass: "text-sm" },
};

export default function StoryPreviewCard({ story, onClick, size = "medium" }: StoryPreviewCardProps) {
  const { t } = useI18n();
  const config = SIZE_CONFIG[size];
  const badgeColor = TYPE_BADGE_COLORS[story.storyType] || "hsl(220 15% 50%)";

  return (
    <button
      onClick={onClick}
      className={`${config.width} ${config.aspect} flex-shrink-0 relative rounded-2xl overflow-hidden group active:scale-[0.97] transition-all duration-200`}
      style={{
        boxShadow: "0 2px 12px -2px hsl(220 40% 18% / 0.25), 0 1px 3px hsl(220 40% 18% / 0.1)",
      }}
    >
      <img
        src={story.mediaPosterUrl || story.mediaUrl}
        alt={story.title}
        className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
        loading="lazy"
      />

      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/15 to-black/5" />

      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{ background: "linear-gradient(to top, hsl(38 65% 56% / 0.12), transparent 50%)" }}
      />

      <div className="absolute top-2.5 left-2.5">
        <span
          className={`px-2 py-[3px] rounded-lg text-[10px] font-bold text-white uppercase tracking-wider backdrop-blur-sm ${story.storyType === "deal" ? "animate-pulse" : ""}`}
          style={{ background: badgeColor, boxShadow: `0 2px 8px ${badgeColor.replace(")", " / 0.35)")}` }}
        >
          {story.storyType === "merchant" ? story.vertical : t(`story.type.${story.storyType}`) || story.storyType}
        </span>
      </div>

      <div className="absolute bottom-0 left-0 right-0 p-3">
        {story.priceLabel && (
          <p className={`${config.priceClass} font-extrabold tracking-tight mb-0.5`}
            style={{ color: "hsl(38 65% 56%)" }}
          >
            {story.priceLabel}
          </p>
        )}
        <p className={`${config.titleClass} font-bold text-white leading-snug line-clamp-2`}
          style={{ textShadow: "0 1px 4px hsl(0 0% 0% / 0.4)" }}
        >
          {story.title}
        </p>
        {story.locationLabel && (
          <p className={`${config.metaClass} text-white/60 mt-0.5 truncate font-medium`}>
            {story.locationLabel}
          </p>
        )}
      </div>

      <div className="absolute inset-0 rounded-2xl ring-1 ring-white/10 group-hover:ring-[hsl(38_65%_56%_/_0.3)] transition-all duration-300 pointer-events-none" />
    </button>
  );
}
