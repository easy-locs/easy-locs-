/**
 * CuisineListPage — Restaurant list for a cuisine
 * Route: /food/:type/:cuisine
 * Premium hero with 4K video + auto-sliding cuisine carousel.
 */
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useRef, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { governStorefrontQuery } from "@/lib/discovery/query-governance";
import UniversePageShell from "@/components/universe/UniversePageShell";
import UniverseCard from "@/components/universe/UniverseCard";
import { UtensilsCrossed } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

/** All cuisines with hero data */
const ALL_CUISINES = [
  { slug: "arabic", emoji: "🥙", label: "Arabic", videoUrl: "https://videos.pexels.com/video-files/3195394/3195394-uhd_2560_1440_25fps.mp4", bannerUrl: "https://images.unsplash.com/photo-1547573854-74d2a71d0826?w=800&q=80", tagline: "Authentic flavors from the Middle East" },
  { slug: "indian", emoji: "🍛", label: "Indian", videoUrl: "https://videos.pexels.com/video-files/3298062/3298062-uhd_2560_1440_25fps.mp4", bannerUrl: "https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=800&q=80", tagline: "Rich spices, bold curries, unforgettable taste" },
  { slug: "italian", emoji: "🍝", label: "Italian", videoUrl: "https://videos.pexels.com/video-files/3196730/3196730-uhd_2560_1440_25fps.mp4", bannerUrl: "https://images.unsplash.com/photo-1498579150354-977475b7ea0b?w=800&q=80", tagline: "From wood-fired pizza to handmade pasta" },
  { slug: "japanese", emoji: "🍣", label: "Japanese", videoUrl: "https://videos.pexels.com/video-files/2836200/2836200-uhd_2560_1440_24fps.mp4", bannerUrl: "https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=800&q=80", tagline: "Precision, freshness, and artistry" },
  { slug: "chinese", emoji: "🥡", label: "Chinese", videoUrl: "https://videos.pexels.com/video-files/3298062/3298062-uhd_2560_1440_25fps.mp4", bannerUrl: "https://images.unsplash.com/photo-1563245372-f21724e3856d?w=800&q=80", tagline: "Wok-fired favorites & dim sum delights" },
  { slug: "thai", emoji: "🍜", label: "Thai", videoUrl: "https://videos.pexels.com/video-files/3195394/3195394-uhd_2560_1440_25fps.mp4", bannerUrl: "https://images.unsplash.com/photo-1562565652-a0d8f0c59eb4?w=800&q=80", tagline: "Sweet, sour, spicy perfection" },
  { slug: "mexican", emoji: "🌮", label: "Mexican", videoUrl: "https://videos.pexels.com/video-files/3196730/3196730-uhd_2560_1440_25fps.mp4", bannerUrl: "https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=800&q=80", tagline: "Bold tacos, fresh guacamole, fiesta flavors" },
  { slug: "burger", emoji: "🍔", label: "Burger", videoUrl: "https://videos.pexels.com/video-files/3298062/3298062-uhd_2560_1440_25fps.mp4", bannerUrl: "https://images.unsplash.com/photo-1571091718767-18b5b1457add?w=800&q=80", tagline: "Juicy, stacked, and irresistible" },
  { slug: "pizza", emoji: "🍕", label: "Pizza", videoUrl: "https://videos.pexels.com/video-files/3196730/3196730-uhd_2560_1440_25fps.mp4", bannerUrl: "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=800&q=80", tagline: "Crispy crust, melting cheese, pure love" },
  { slug: "seafood", emoji: "🦐", label: "Seafood", videoUrl: "https://videos.pexels.com/video-files/2836200/2836200-uhd_2560_1440_24fps.mp4", bannerUrl: "https://images.unsplash.com/photo-1615141982883-c7ad0e69fd62?w=800&q=80", tagline: "Ocean-fresh, grilled to perfection" },
  { slug: "korean", emoji: "🥘", label: "Korean", videoUrl: "https://videos.pexels.com/video-files/3298062/3298062-uhd_2560_1440_25fps.mp4", bannerUrl: "https://images.unsplash.com/photo-1590301157890-4810ed352733?w=800&q=80", tagline: "BBQ, kimchi, and K-food magic" },
  { slug: "lebanese", emoji: "🧆", label: "Lebanese", videoUrl: "https://videos.pexels.com/video-files/3195394/3195394-uhd_2560_1440_25fps.mp4", bannerUrl: "https://images.unsplash.com/photo-1547573854-74d2a71d0826?w=800&q=80", tagline: "Mezze, shawarma, and Mediterranean warmth" },
  { slug: "healthy", emoji: "🥗", label: "Healthy", videoUrl: "https://videos.pexels.com/video-files/3195394/3195394-uhd_2560_1440_25fps.mp4", bannerUrl: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800&q=80", tagline: "Clean eating, fresh bowls, guilt-free" },
  { slug: "dessert", emoji: "🍰", label: "Dessert", videoUrl: "https://videos.pexels.com/video-files/3196730/3196730-uhd_2560_1440_25fps.mp4", bannerUrl: "https://images.unsplash.com/photo-1551024506-0bccd828d307?w=800&q=80", tagline: "Sweet treats to end the day right" },
  { slug: "cafe", emoji: "☕", label: "Café", videoUrl: "https://videos.pexels.com/video-files/2836200/2836200-uhd_2560_1440_24fps.mp4", bannerUrl: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=800&q=80", tagline: "Coffee, pastries, and cozy vibes" },
  { slug: "sushi", emoji: "🍣", label: "Sushi", videoUrl: "https://videos.pexels.com/video-files/2836200/2836200-uhd_2560_1440_24fps.mp4", bannerUrl: "https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=800&q=80", tagline: "Fresh rolls, crafted to perfection" },
  { slug: "african", emoji: "🍲", label: "African", videoUrl: "https://videos.pexels.com/video-files/3195394/3195394-uhd_2560_1440_25fps.mp4", bannerUrl: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&q=80", tagline: "Bold stews, spiced grains, soulful cooking" },
  { slug: "asian", emoji: "🍜", label: "Asian", videoUrl: "https://videos.pexels.com/video-files/3298062/3298062-uhd_2560_1440_25fps.mp4", bannerUrl: "https://images.unsplash.com/photo-1562565652-a0d8f0c59eb4?w=800&q=80", tagline: "Pan-Asian favorites from noodles to dumplings" },
  { slug: "grill", emoji: "🥩", label: "Grill", videoUrl: "https://videos.pexels.com/video-files/3298062/3298062-uhd_2560_1440_25fps.mp4", bannerUrl: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&q=80", tagline: "Flame-kissed, smoky, perfectly charred" },
  { slug: "bakery", emoji: "🥐", label: "Bakery", videoUrl: "https://videos.pexels.com/video-files/3196730/3196730-uhd_2560_1440_25fps.mp4", bannerUrl: "https://images.unsplash.com/photo-1551024506-0bccd828d307?w=800&q=80", tagline: "Freshly baked, golden, and warm" },
];

const DEFAULT_HERO = {
  videoUrl: "https://videos.pexels.com/video-files/3195394/3195394-uhd_2560_1440_25fps.mp4",
  bannerUrl: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&q=80",
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
  const { type, cuisine } = useParams<{ type: string; cuisine: string }>();
  const navigate = useNavigate();

  const { data: restaurants = [], isLoading } = useQuery({
    queryKey: ["cuisine-restaurants", cuisine],
    queryFn: async () => {
      let q = (supabase as any)
        .from("storefront_pages")
        .select("id, name, slug, city, vertical, subcategory, description, latitude, longitude, rating, display_priority")
        .order("display_priority", { ascending: false, nullsFirst: false })
        .limit(30);
      q = governStorefrontQuery(q, "discover");
      const { data } = await q;
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
            to={`/s/${r.slug || r.id}`}
            title={r.name || "Restaurant"}
            subtitle={r.city || r.subcategory || ""}
            rating={r.rating ?? 4.2}
            index={i}
          />
        ))}
      </div>
    </UniversePageShell>
  );
}
