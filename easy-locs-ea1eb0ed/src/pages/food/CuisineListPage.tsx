import { heroCover, bannerCover } from "@/lib/image/category-covers";
import { useUiEngine } from "@/hooks/useUiEngine";
/**
 * CuisineListPage — Restaurant list for a cuisine
 * Route: /food/:type/:cuisine
 * Premium hero with 4K video + auto-sliding cuisine carousel.
 */
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useRef, useEffect, useCallback } from "react";
import { storefrontService } from "@/services";
import { governStorefrontQuery } from "@/lib/discovery/query-governance";
import UniversePageShell from "@/components/universe/UniversePageShell";
import { UniverseCard } from "@/components/cards/UniverseCard";
import { UtensilsCrossed } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { CATEGORY_TREE } from "@/lib/taxonomy/category-tree";

const CUISINE_VIDEO_MAP: Record<string, string> = {
  arabic: "https://videos.pexels.com/video-files/3195394/3195394-uhd_2560_1440_25fps.mp4",
  indian: "https://videos.pexels.com/video-files/3298062/3298062-uhd_2560_1440_25fps.mp4",
  italian: "https://videos.pexels.com/video-files/3196730/3196730-uhd_2560_1440_25fps.mp4",
  japanese: "https://videos.pexels.com/video-files/2836200/2836200-uhd_2560_1440_24fps.mp4",
  chinese: "https://videos.pexels.com/video-files/3298062/3298062-uhd_2560_1440_25fps.mp4",
  thai: "https://videos.pexels.com/video-files/3195394/3195394-uhd_2560_1440_25fps.mp4",
  mexican: "https://videos.pexels.com/video-files/3196730/3196730-uhd_2560_1440_25fps.mp4",
  burger: "https://videos.pexels.com/video-files/3298062/3298062-uhd_2560_1440_25fps.mp4",
  pizza: "https://videos.pexels.com/video-files/3196730/3196730-uhd_2560_1440_25fps.mp4",
  seafood: "https://videos.pexels.com/video-files/2836200/2836200-uhd_2560_1440_24fps.mp4",
  korean: "https://videos.pexels.com/video-files/3298062/3298062-uhd_2560_1440_25fps.mp4",
  lebanese: "https://videos.pexels.com/video-files/3195394/3195394-uhd_2560_1440_25fps.mp4",
  healthy: "https://videos.pexels.com/video-files/3195394/3195394-uhd_2560_1440_25fps.mp4",
  desserts: "https://videos.pexels.com/video-files/3196730/3196730-uhd_2560_1440_25fps.mp4",
  cafe: "https://videos.pexels.com/video-files/2836200/2836200-uhd_2560_1440_24fps.mp4",
  sushi: "https://videos.pexels.com/video-files/2836200/2836200-uhd_2560_1440_24fps.mp4",
  african: "https://videos.pexels.com/video-files/3195394/3195394-uhd_2560_1440_25fps.mp4",
  asian: "https://videos.pexels.com/video-files/3298062/3298062-uhd_2560_1440_25fps.mp4",
  bbq: "https://videos.pexels.com/video-files/3298062/3298062-uhd_2560_1440_25fps.mp4",
  bakery: "https://videos.pexels.com/video-files/3196730/3196730-uhd_2560_1440_25fps.mp4",
};

const CUISINE_TAGLINE_MAP: Record<string, string> = {
  arabic: "Authentic flavors from the Middle East",
  indian: "Rich spices, bold curries, unforgettable taste",
  italian: "From wood-fired pizza to handmade pasta",
  japanese: "Precision, freshness, and artistry",
  chinese: "Wok-fired favorites & dim sum delights",
  thai: "Sweet, sour, spicy perfection",
  mexican: "Bold tacos, fresh guacamole, fiesta flavors",
  burger: "Juicy, stacked, and irresistible",
  pizza: "Crispy crust, melting cheese, pure love",
  seafood: "Ocean-fresh, grilled to perfection",
  korean: "BBQ, kimchi, and K-food magic",
  lebanese: "Mezze, shawarma, and Mediterranean warmth",
  healthy: "Clean eating, fresh bowls, guilt-free",
  desserts: "Sweet treats to end the day right",
  cafe: "Coffee, pastries, and cozy vibes",
  sushi: "Fresh rolls, crafted to perfection",
  african: "Bold stews, spiced grains, soulful cooking",
  asian: "Pan-Asian favorites from noodles to dumplings",
  bbq: "Flame-kissed, smoky, perfectly charred",
  bakery: "Freshly baked, golden, and warm",
};

const CUISINE_CLUSTERS = new Set(["cuisine", "fast_food", "cafe", "bakery", "desserts"]);
const foodCategory = CATEGORY_TREE.find(c => c.key === "food");
const DEFAULT_VIDEO = "https://videos.pexels.com/video-files/3195394/3195394-uhd_2560_1440_25fps.mp4";

const ALL_CUISINES = (foodCategory?.subcategories ?? [])
  .filter(sub => CUISINE_CLUSTERS.has(sub.cluster) || CUISINE_VIDEO_MAP[sub.value])
  .map(sub => ({
    slug: sub.value,
    emoji: sub.emoji,
    label: sub.label,
    videoUrl: CUISINE_VIDEO_MAP[sub.value] ?? DEFAULT_VIDEO,
    bannerUrl: heroCover("food"),
    tagline: CUISINE_TAGLINE_MAP[sub.value] ?? "Discover the best restaurants near you",
  }));

const DEFAULT_HERO = {
  videoUrl: "https://videos.pexels.com/video-files/3195394/3195394-uhd_2560_1440_25fps.mp4",
  bannerUrl: heroCover("food"),
  emoji: "🍽️",
  tagline: "Discover the best restaurants near you",
};

/** ── Cuisine Slider ── auto-scrolling horizontal chips */
function CuisineSlider({ currentSlug, type }: { currentSlug: string; type: string }) {
  const navigate = useNavigate();
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to active chip on mount
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const active = el.querySelector("[data-active='true']") as HTMLElement | null;
    if (active) {
      active.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
    }
  }, [currentSlug]);

  return (
    <div
      ref={scrollRef}
      className="flex gap-2 overflow-x-auto no-scrollbar px-4 py-2"
    >
      {ALL_CUISINES.map((c, i) => {
        const isActive = c.slug === currentSlug;
        return (
          <motion.button
            key={c.slug}
            data-active={isActive}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.02 }}
            onClick={() => navigate(`/food/${type}/${c.slug}`, { replace: true })}
            className={cn(
              "flex items-center gap-1.5 px-3.5 py-2 rounded-full whitespace-nowrap shrink-0 text-xs font-bold transition-all active:scale-95",
              isActive
                ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                : "bg-card/80 text-foreground border border-border/30 backdrop-blur-sm",
            )}
          >
            <span className="text-sm leading-none">{c.emoji}</span>
            <span>{c.label}</span>
          </motion.button>
        );
      })}
    </div>
  );
}

export default function CuisineListPage() {
  useUiEngine("food-cuisine");
  const { type, cuisine } = useParams<{ type: string; cuisine: string }>();
  const navigate = useNavigate();

  const { data: restaurants = [], isLoading } = useQuery({
    queryKey: ["cuisine-restaurants", cuisine],
    queryFn: async () => {
      const data = await storefrontService.fetchCuisineRestaurants((q: any) => governStorefrontQuery(q, "discover"), 30);
      const all = (data || []) as any[];
      if (!cuisine) return all;
      const filtered = all.filter((r: any) =>
        (r.subcategory || "").toLowerCase().includes(cuisine!) ||
        (r.description || "").toLowerCase().includes(cuisine!) ||
        (r.name || "").toLowerCase().includes(cuisine!)
      );
      return filtered.length > 0 ? filtered : all.slice(0, 10);
    },
    staleTime: 120_000,
    placeholderData: (prev: any) => prev,
  });

  const label = cuisine ? cuisine.charAt(0).toUpperCase() + cuisine.slice(1) : "All";
  const found = cuisine ? ALL_CUISINES.find(c => c.slug === cuisine.toLowerCase()) : null;
  const hero = found || DEFAULT_HERO;

  return (
    <UniversePageShell
      title={`${label} Restaurants`}
      subtitle={`${type === "pickup" ? "Pickup" : "Delivery"} · ${restaurants.length} places near you`}
      icon={<UtensilsCrossed className="h-5 w-5 text-white" />}
      loading={isLoading}
      isEmpty={restaurants.length === 0}
      emptyMessage="No restaurants found for this cuisine"
      heroVideoUrl={hero.videoUrl}
      heroBannerUrl={hero.bannerUrl}
      heroEmoji={hero.emoji}
      tagline={hero.tagline}
      seoTitle={`${label} Restaurants – Delivery & Pickup`}
      seoDescription={hero.tagline}
      backTo="/"
      heroSlot={<CuisineSlider currentSlug={cuisine?.toLowerCase() || ""} type={type || "delivery"} />}
    >
      <div className="space-y-2">
        {restaurants.map((r: any, i: number) => (
          <UniverseCard
            key={r.id}
            to={cuisine ? `/food/r/${cuisine}/${r.slug || r.id}` : `/s/${r.slug || r.id}`}
            title={r.name || "Restaurant"}
            subtitle={r.city || r.subcategory || ""}
            rating={r.rating ?? 4.2}
            index={i}
            variant="horizontal"
          />
        ))}
      </div>
    </UniversePageShell>
  );
}
