import type { Story } from "@/lib/stories/story-types";

interface StoryPreviewCardProps {
  story: Story;
  onClick: () => void;
  size?: "small" | "medium" | "large";
}

const TYPE_BADGE_COLORS: Record<string, string> = {
  property: "bg-emerald-500",
  stay: "bg-blue-500",
  merchant: "bg-amber-500",
  product: "bg-violet-500",
  deal: "bg-red-500",
  utility: "bg-slate-500",
  mobility: "bg-cyan-500",
};

const TYPE_BADGE_GLOW: Record<string, string> = {
  property: "shadow-emerald-500/30",
  stay: "shadow-blue-500/30",
  merchant: "shadow-amber-500/30",
  product: "shadow-violet-500/30",
  deal: "shadow-red-500/30",
  utility: "shadow-slate-500/30",
  mobility: "shadow-cyan-500/30",
};

const SIZE_CONFIG = {
  small: { width: "w-[125px]", height: "h-[170px]", titleClass: "text-[11px]", metaClass: "text-[10px]", priceClass: "text-[11px]" },
  medium: { width: "w-[140px]", height: "h-[195px]", titleClass: "text-xs", metaClass: "text-[10px]", priceClass: "text-[11px]" },
  large: { width: "w-[165px]", height: "h-[230px]", titleClass: "text-[13px]", metaClass: "text-[11px]", priceClass: "text-xs" },
};

export default function StoryPreviewCard({ story, onClick, size = "medium" }: StoryPreviewCardProps) {
  const config = SIZE_CONFIG[size];
  const badgeColor = TYPE_BADGE_COLORS[story.storyType] || "bg-slate-500";
  const badgeGlow = TYPE_BADGE_GLOW[story.storyType] || "";

  return (
    <button
      onClick={onClick}
      className={`${config.width} ${config.height} flex-shrink-0 relative rounded-2xl overflow-hidden group active:scale-[0.97] transition-all duration-200`}
      style={{ boxShadow: "0 4px 20px -4px rgba(0,0,0,0.35)" }}
    >
      <img
        src={story.mediaPosterUrl || story.mediaUrl}
        alt={story.title}
        className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-500 ease-out"
        loading="lazy"
      />

      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-black/5" />

      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{ background: "linear-gradient(to top, hsl(38 65% 56% / 0.15), transparent 60%)" }}
      />

      <div className="absolute top-2.5 left-2.5">
        <span className={`px-2 py-[3px] rounded-lg text-[10px] font-extrabold text-white uppercase tracking-wider ${badgeColor} shadow-lg ${badgeGlow} ${story.storyType === "deal" ? "animate-pulse" : ""}`}>
          {story.storyType === "merchant" ? story.vertical : story.storyType}
        </span>
      </div>

      <div className="absolute bottom-0 left-0 right-0 p-3">
        {story.priceLabel && (
          <p className={`${config.priceClass} font-extrabold tracking-tight mb-1`}
            style={{ color: "hsl(38 65% 56%)" }}
          >
            {story.priceLabel}
          </p>
        )}
        <p className={`${config.titleClass} font-bold text-white leading-tight line-clamp-2 drop-shadow-md`}>
          {story.title}
        </p>
        {story.locationLabel && (
          <p className={`${config.metaClass} text-white/55 mt-1 truncate font-medium`}>
            {story.locationLabel}
          </p>
        )}
      </div>

      <div className="absolute inset-0 rounded-2xl ring-1 ring-white/8 group-hover:ring-amber-400/30 transition-all duration-300" />
    </button>
  );
}
