/**
 * CuisineListPage — Step 3: Restaurant list for a cuisine
 * Route: /food/:type/:cuisine
 * Premium hero banner with 4K looping video per cuisine category.
 * Uses canonical query-governance for visibility/route filtering.
 */
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { governStorefrontQuery } from "@/lib/discovery/query-governance";
import UniversePageShell from "@/components/universe/UniversePageShell";
import UniverseCard from "@/components/universe/UniverseCard";
import { UtensilsCrossed } from "lucide-react";

/** Cuisine-specific hero content: video, fallback banner, emoji, tagline */
const CUISINE_HEROES: Record<string, {
  videoUrl: string;
  bannerUrl: string;
  emoji: string;
  tagline: string;
}> = {
  arabic: {
    videoUrl: "https://videos.pexels.com/video-files/3195394/3195394-uhd_2560_1440_25fps.mp4",
    bannerUrl: "https://images.unsplash.com/photo-1547573854-74d2a71d0826?w=800&q=80",
    emoji: "🥙",
    tagline: "Authentic flavors from the Middle East",
  },
  indian: {
    videoUrl: "https://videos.pexels.com/video-files/3298062/3298062-uhd_2560_1440_25fps.mp4",
    bannerUrl: "https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=800&q=80",
    emoji: "🍛",
    tagline: "Rich spices, bold curries, unforgettable taste",
  },
  italian: {
    videoUrl: "https://videos.pexels.com/video-files/3196730/3196730-uhd_2560_1440_25fps.mp4",
    bannerUrl: "https://images.unsplash.com/photo-1498579150354-977475b7ea0b?w=800&q=80",
    emoji: "🍝",
    tagline: "From wood-fired pizza to handmade pasta",
  },
  japanese: {
    videoUrl: "https://videos.pexels.com/video-files/2836200/2836200-uhd_2560_1440_24fps.mp4",
    bannerUrl: "https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=800&q=80",
    emoji: "🍣",
    tagline: "Precision, freshness, and artistry",
  },
  chinese: {
    videoUrl: "https://videos.pexels.com/video-files/3298062/3298062-uhd_2560_1440_25fps.mp4",
    bannerUrl: "https://images.unsplash.com/photo-1563245372-f21724e3856d?w=800&q=80",
    emoji: "🥡",
    tagline: "Wok-fired favorites & dim sum delights",
  },
  thai: {
    videoUrl: "https://videos.pexels.com/video-files/3195394/3195394-uhd_2560_1440_25fps.mp4",
    bannerUrl: "https://images.unsplash.com/photo-1562565652-a0d8f0c59eb4?w=800&q=80",
    emoji: "🍜",
    tagline: "Sweet, sour, spicy perfection",
  },
  mexican: {
    videoUrl: "https://videos.pexels.com/video-files/3196730/3196730-uhd_2560_1440_25fps.mp4",
    bannerUrl: "https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=800&q=80",
    emoji: "🌮",
    tagline: "Bold tacos, fresh guacamole, fiesta flavors",
  },
  burger: {
    videoUrl: "https://videos.pexels.com/video-files/3298062/3298062-uhd_2560_1440_25fps.mp4",
    bannerUrl: "https://images.unsplash.com/photo-1571091718767-18b5b1457add?w=800&q=80",
    emoji: "🍔",
    tagline: "Juicy, stacked, and irresistible",
  },
  pizza: {
    videoUrl: "https://videos.pexels.com/video-files/3196730/3196730-uhd_2560_1440_25fps.mp4",
    bannerUrl: "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=800&q=80",
    emoji: "🍕",
    tagline: "Crispy crust, melting cheese, pure love",
  },
  seafood: {
    videoUrl: "https://videos.pexels.com/video-files/2836200/2836200-uhd_2560_1440_24fps.mp4",
    bannerUrl: "https://images.unsplash.com/photo-1615141982883-c7ad0e69fd62?w=800&q=80",
    emoji: "🦐",
    tagline: "Ocean-fresh, grilled to perfection",
  },
  korean: {
    videoUrl: "https://videos.pexels.com/video-files/3298062/3298062-uhd_2560_1440_25fps.mp4",
    bannerUrl: "https://images.unsplash.com/photo-1590301157890-4810ed352733?w=800&q=80",
    emoji: "🥘",
    tagline: "BBQ, kimchi, and K-food magic",
  },
  lebanese: {
    videoUrl: "https://videos.pexels.com/video-files/3195394/3195394-uhd_2560_1440_25fps.mp4",
    bannerUrl: "https://images.unsplash.com/photo-1547573854-74d2a71d0826?w=800&q=80",
    emoji: "🧆",
    tagline: "Mezze, shawarma, and Mediterranean warmth",
  },
  healthy: {
    videoUrl: "https://videos.pexels.com/video-files/3195394/3195394-uhd_2560_1440_25fps.mp4",
    bannerUrl: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800&q=80",
    emoji: "🥗",
    tagline: "Clean eating, fresh bowls, guilt-free",
  },
  dessert: {
    videoUrl: "https://videos.pexels.com/video-files/3196730/3196730-uhd_2560_1440_25fps.mp4",
    bannerUrl: "https://images.unsplash.com/photo-1551024506-0bccd828d307?w=800&q=80",
    emoji: "🍰",
    tagline: "Sweet treats to end the day right",
  },
  breakfast: {
    videoUrl: "https://videos.pexels.com/video-files/3298062/3298062-uhd_2560_1440_25fps.mp4",
    bannerUrl: "https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?w=800&q=80",
    emoji: "🥞",
    tagline: "Start your morning right",
  },
  cafe: {
    videoUrl: "https://videos.pexels.com/video-files/2836200/2836200-uhd_2560_1440_24fps.mp4",
    bannerUrl: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=800&q=80",
    emoji: "☕",
    tagline: "Coffee, pastries, and cozy vibes",
  },
};

/** Fallback for unknown cuisines */
const DEFAULT_HERO = {
  videoUrl: "https://videos.pexels.com/video-files/3195394/3195394-uhd_2560_1440_25fps.mp4",
  bannerUrl: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&q=80",
  emoji: "🍽️",
  tagline: "Discover the best restaurants near you",
};

export default function CuisineListPage() {
  const { type, cuisine } = useParams<{ type: string; cuisine: string }>();

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
  const hero = (cuisine && CUISINE_HEROES[cuisine.toLowerCase()]) || DEFAULT_HERO;

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
