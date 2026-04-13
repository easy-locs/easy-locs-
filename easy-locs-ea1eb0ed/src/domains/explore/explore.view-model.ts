import { useMemo, useState, useCallback } from "react";
import { useLocationStore } from "@/stores/locationStore";
import { useHomeSections, type HomeShopPreview } from "@/hooks/useHomeSections";
import { useStoryFeed } from "@/hooks/useStoryFeed";
import { platformBus } from "@/lib/shared/platform-bus";
import { getIntelligenceOrchestrator } from "@/lib/intelligence/intelligence-orchestrator";
import type { Story } from "@/lib/stories/story-types";

export interface ExploreSection {
  key: string;
  title: string;
  icon: string;
  items: any[];
  feedKey: string;
  seeAllRoute: string;
  vertical?: string;
}

export interface QuickAction {
  key: string;
  label: string;
  icon: string;
  intentHint: string;
  route: string;
  color: string;
}

export interface ContinueItem {
  id: string;
  title: string;
  subtitle: string;
  vertical: string;
  route: string;
  image?: string;
  timestamp: number;
}

export interface ExploreViewModel {
  locationLabel: string;
  currentLocation: { lat: number; lng: number } | null;
  timeOfDay: string;
  greeting: string;

  storyFeeds: {
    forYou: Story[];
    food: Story[];
    property: Story[];
    stay: Story[];
    trending: Story[];
  };

  forYouItems: HomeShopPreview[];
  nearYouItems: HomeShopPreview[];
  trendingItems: HomeShopPreview[];
  quickActions: QuickAction[];
  continueItems: ContinueItem[];
  aiSuggestions: { text: string; route: string; vertical: string }[];

  sections: ExploreSection[];
  addressSheetOpen: boolean;
  onLocationTap: () => void;
  onAddressSheetChange: (open: boolean) => void;
  emitExploreEvent: (event: string, payload: Record<string, unknown>) => void;
}

const QUICK_ACTIONS: QuickAction[] = [
  { key: "send_money", label: "Send Money", icon: "💸", intentHint: "wallet_transfer", route: "/wallet/transfer", color: "from-emerald-500/15 to-green-500/8" },
  { key: "book_ride", label: "Book Ride", icon: "🚕", intentHint: "ride_request", route: "/mobility/taxi", color: "from-yellow-500/15 to-amber-500/8" },
  { key: "order_food", label: "Order Food", icon: "🍕", intentHint: "food_order", route: "/browse/food", color: "from-red-500/15 to-orange-500/8" },
  { key: "find_service", label: "Find Service", icon: "🔧", intentHint: "service_request", route: "/browse/services", color: "from-blue-500/15 to-cyan-500/8" },
  { key: "book_stay", label: "Book Stay", icon: "🏨", intentHint: "stay_booking", route: "/stay", color: "from-violet-500/15 to-purple-500/8" },
  { key: "buy_property", label: "Buy Property", icon: "🏠", intentHint: "buy_property", route: "/property?tab=buy", color: "from-teal-500/15 to-emerald-500/8" },
  { key: "nearby_atm", label: "Nearby ATM", icon: "🏧", intentHint: "utility_lookup", route: "/radar?vertical=utility&sub=atm", color: "from-sky-500/15 to-blue-500/8" },
  { key: "grocery", label: "Grocery", icon: "🛒", intentHint: "grocery_order", route: "/browse/grocery", color: "from-lime-500/15 to-green-500/8" },
];

export function useExploreViewModel(): ExploreViewModel {
  const currentLocation = useLocationStore((s) => s.currentLocation);
  const selectedLocation = useLocationStore((s) => s.selectedLocation);
  const cityLabel = selectedLocation?.city ?? selectedLocation?.label ?? "your area";
  const [addressSheetOpen, setAddressSheetOpen] = useState(false);

  const hour = new Date().getHours();
  const timeOfDay = hour >= 5 && hour < 12 ? "morning" : hour >= 12 && hour < 17 ? "afternoon" : hour >= 17 && hour < 21 ? "evening" : "night";
  const greeting = timeOfDay === "morning" ? "Good morning" : timeOfDay === "afternoon" ? "Good afternoon" : timeOfDay === "evening" ? "Good evening" : "Good night";

  const { data: forYouStories = [] } = useStoryFeed("dashboard_for_you");
  const { data: trendingStories = [] } = useStoryFeed("dashboard_trending");
  const { data: foodStories = [] } = useStoryFeed("food_nearby");
  const { data: propertyStories = [] } = useStoryFeed("property_buy");
  const { data: stayStories = [] } = useStoryFeed("stay_trending");

  const { data: homeSections } = useHomeSections();

  const forYouItems = useMemo(() => {
    const all = [...(homeSections?.trending ?? []), ...(homeSections?.bestRated ?? [])];
    const seen = new Set<string>();
    return all.filter((item) => {
      if (seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    }).slice(0, 12);
  }, [homeSections]);

  const nearYouItems = useMemo(() => {
    return (homeSections?.nearYou ?? []).slice(0, 12);
  }, [homeSections]);

  const trendingItems = useMemo(() => {
    return (homeSections?.trending ?? []).slice(0, 12);
  }, [homeSections]);

  const [continueItems] = useState<ContinueItem[]>(() => {
    try {
      const raw = localStorage.getItem("explore_continue");
      return raw ? JSON.parse(raw).slice(0, 6) : [];
    } catch {
      return [];
    }
  });

  const aiSuggestions = useMemo(() => {
    const suggestions: { text: string; route: string; vertical: string }[] = [];
    try {
      const orchestrator = getIntelligenceOrchestrator();
      const ctx = orchestrator.getContext();
      if (ctx.recentSearches?.length) {
        suggestions.push({
          text: `Because you searched "${ctx.recentSearches[0]}"`,
          route: `/radar?q=${encodeURIComponent(ctx.recentSearches[0])}`,
          vertical: ctx.recentVerticals?.[0] ?? "food",
        });
      }
      if (ctx.recentVerticals?.length) {
        const v = ctx.recentVerticals[0];
        suggestions.push({
          text: `Continue exploring ${v}`,
          route: `/browse/${v}`,
          vertical: v,
        });
      }
    } catch {}

    if (timeOfDay === "morning") {
      suggestions.push({ text: "Start your day with fresh coffee nearby", route: "/browse/food?sub=cafe", vertical: "food" });
    } else if (timeOfDay === "evening") {
      suggestions.push({ text: "Dinner spots trending near you", route: "/browse/food?sort=trending", vertical: "food" });
    } else if (timeOfDay === "night") {
      suggestions.push({ text: "Late night delivery available now", route: "/browse/food?filter=open_now", vertical: "food" });
    }

    suggestions.push({ text: "Properties matching your profile", route: "/property", vertical: "property" });
    suggestions.push({ text: "Best-rated services near you", route: "/browse/services?sort=rating", vertical: "services" });

    return suggestions.slice(0, 5);
  }, [timeOfDay]);

  const sections = useMemo<ExploreSection[]>(() => [
    { key: "forYou", title: "For You", icon: "✨", items: forYouItems, feedKey: "explore_for_you", seeAllRoute: "/radar?sort=for_you" },
    { key: "nearYou", title: "Near You", icon: "📍", items: nearYouItems, feedKey: "explore_near_you", seeAllRoute: "/radar?sort=distance", vertical: "nearby" },
    { key: "trending", title: "Trending", icon: "🔥", items: trendingItems, feedKey: "explore_trending", seeAllRoute: "/radar?sort=trending" },
  ], [forYouItems, nearYouItems, trendingItems]);

  const emitExploreEvent = useCallback((event: string, payload: Record<string, unknown>) => {
    platformBus.emit(event as any, payload, "explore");
  }, []);

  const onLocationTap = useCallback(() => setAddressSheetOpen(true), []);
  const onAddressSheetChange = useCallback((open: boolean) => setAddressSheetOpen(open), []);

  return {
    locationLabel: cityLabel,
    currentLocation: currentLocation ? { lat: currentLocation.lat, lng: currentLocation.lng } : null,
    timeOfDay,
    greeting,
    storyFeeds: {
      forYou: forYouStories,
      food: foodStories,
      property: propertyStories,
      stay: stayStories,
      trending: trendingStories,
    },
    forYouItems,
    nearYouItems,
    trendingItems,
    quickActions: QUICK_ACTIONS,
    continueItems,
    aiSuggestions,
    sections,
    addressSheetOpen,
    onLocationTap,
    onAddressSheetChange,
    emitExploreEvent,
  };
}
