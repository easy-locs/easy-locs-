/**
 * CAMPAIGN & BANNER ENGINE
 * Orchestrates all banner slots: organic, sponsored, event, urgency, category.
 * Decides what banner to show, where, to whom, based on context.
 */

import { computeGlobalContext } from "@/lib/context/global-context-engine";
import { supabase } from "@/integrations/supabase/client";

export interface CampaignBanner {
  id: string;
  title: string;
  subtitle: string;
  emoji: string;
  gradient: string;
  cta: string;
  route: string;
  priority: number;
  type: "organic" | "sponsored" | "event" | "urgency" | "category";
  targetVertical?: string;
  targetCity?: string;
  validFrom?: string;
  validUntil?: string;
}

export interface CampaignBannerOutput {
  heroBanners: CampaignBanner[];
  sectionBanners: CampaignBanner[];
  urgencyBanners: CampaignBanner[];
  totalActive: number;
  computedAt: string;
}

export async function runCampaignBannerEngine(country = "AE", city?: string): Promise<CampaignBannerOutput> {
  const ctx = computeGlobalContext({ country, city });
  const banners: CampaignBanner[] = [];

  // 1. Event-driven banners (from context engine)
  for (const evt of ctx.activeEvents) {
    banners.push({
      id: `evt-${evt.id}`,
      title: `${evt.emoji} ${evt.name} Specials`,
      subtitle: `Discover the best ${evt.name} deals`,
      emoji: evt.emoji,
      gradient: evt.accentGradient || "linear-gradient(135deg, hsl(var(--primary) / 0.1), hsl(var(--accent) / 0.05))",
      cta: "Explore",
      route: `/search?event=${evt.id}`,
      priority: 95,
      type: "event",
    });
  }

  // 2. Time-based organic banners
  const timeLabels: Record<string, { title: string; emoji: string; sub: string }> = {
    early_morning: { title: "Good Morning!", emoji: "☀️", sub: "Start your day with the best coffee & breakfast" },
    morning: { title: "Morning Picks", emoji: "🌤️", sub: "Fresh breakfast & brunch options" },
    lunch: { title: "Lunch Time!", emoji: "🍽️", sub: "Quick & delicious lunch deals" },
    afternoon: { title: "Afternoon Treats", emoji: "🍵", sub: "Coffee, desserts & snacks" },
    dinner: { title: "Dinner Plans?", emoji: "🌙", sub: "Explore tonight's best restaurants" },
    late_night: { title: "Late Night Cravings", emoji: "🌃", sub: "Still open & delivering" },
  };

  const timeInfo = timeLabels[ctx.timeSlot] || timeLabels.lunch;
  banners.push({
    id: `time-${ctx.timeSlot}`,
    title: timeInfo.title,
    subtitle: timeInfo.sub,
    emoji: timeInfo.emoji,
    gradient: "linear-gradient(135deg, hsl(var(--primary) / 0.08), hsl(var(--secondary) / 0.04))",
    cta: "Order Now",
    route: "/search",
    priority: 70,
    type: "organic",
  });

  // 3. Weekend banner
  if (ctx.isWeekend) {
    banners.push({
      id: "weekend-vibes",
      title: "Weekend Vibes 🎉",
      subtitle: "Premium dining, brunch & family meals",
      emoji: "🎉",
      gradient: "linear-gradient(135deg, hsl(280 60% 50% / 0.08), hsl(320 70% 50% / 0.05))",
      cta: "Explore",
      route: "/search?filter=premium",
      priority: 65,
      type: "organic",
    });
  }

  // 4. DB-sourced sponsored campaigns
  try {
    const { data: campaigns } = await (supabase as any)
      .from("boost_campaigns")
      .select("id, entity_id, objective, status, daily_budget, country, city")
      .eq("status", "active")
      .limit(10);

    if (campaigns?.length) {
      for (const camp of campaigns) {
        banners.push({
          id: `boost-${camp.id}`,
          title: "Sponsored",
          subtitle: camp.objective || "Featured business",
          emoji: "⭐",
          gradient: "linear-gradient(135deg, hsl(45 80% 55% / 0.08), hsl(30 60% 50% / 0.04))",
          cta: "View",
          route: `/shop/${camp.entity_id}`,
          priority: 85,
          type: "sponsored",
          targetCity: camp.city,
        });
      }
    }
  } catch {}

  // Sort and categorize
  banners.sort((a, b) => b.priority - a.priority);

  return {
    heroBanners: banners.filter(b => b.type === "event" || b.type === "sponsored").slice(0, 3),
    sectionBanners: banners.filter(b => b.type === "organic" || b.type === "category").slice(0, 5),
    urgencyBanners: banners.filter(b => b.type === "urgency"),
    totalActive: banners.length,
    computedAt: new Date().toISOString(),
  };
}
