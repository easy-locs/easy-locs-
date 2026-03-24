/**
 * CONTENT FRESHNESS ENGINE
 * Generates and refreshes platform content: city pages, category pages, SEO blocks.
 * Produces refreshed metadata, intro content, seasonal copy.
 */

import { computeGlobalContext } from "@/lib/context/global-context-engine";

export interface FreshContentBlock {
  id: string;
  type: "city_intro" | "category_landing" | "trending_block" | "seasonal_copy" | "seo_meta";
  title: string;
  body: string;
  emoji: string;
  targetSlug: string;
  freshUntil: string;
}

export interface ContentFreshnessOutput {
  blocks: FreshContentBlock[];
  totalGenerated: number;
  computedAt: string;
}

export function runContentFreshnessEngine(country = "AE", city = "Dubai"): ContentFreshnessOutput {
  const ctx = computeGlobalContext({ country, city });
  const blocks: FreshContentBlock[] = [];
  const tomorrow = new Date(Date.now() + 86400000).toISOString();

  // City intro block
  blocks.push({
    id: `city-intro-${city.toLowerCase()}`,
    type: "city_intro",
    title: `Explore ${city}`,
    body: `Discover the best food, services, and experiences in ${city}. ${ctx.activeEvents.length > 0 ? `🎉 ${ctx.activeEvents[0].name} is happening now!` : `Trending: ${ctx.recommendedSegments.slice(0, 3).join(", ")}`}`,
    emoji: "🏙️",
    targetSlug: city.toLowerCase(),
    freshUntil: tomorrow,
  });

  // Time-specific blocks
  const timeBlocks: Record<string, { title: string; body: string; emoji: string }> = {
    early_morning: { title: "Morning in " + city, body: "Start your day with fresh coffee and pastries from top-rated cafes.", emoji: "☀️" },
    morning: { title: "Good Morning " + city, body: "Breakfast spots and brunch deals happening now.", emoji: "🌤️" },
    lunch: { title: "Lunch Hour", body: "Quick bites, healthy bowls, and business lunch specials.", emoji: "🍽️" },
    afternoon: { title: "Afternoon Break", body: "Coffee, desserts, and sweet treats to brighten your day.", emoji: "🍵" },
    dinner: { title: "Tonight in " + city, body: "From fine dining to family favorites — find your dinner.", emoji: "🌙" },
    late_night: { title: "Late Night " + city, body: "Still hungry? These places deliver until dawn.", emoji: "🌃" },
  };

  const tb = timeBlocks[ctx.timeSlot] || timeBlocks.lunch;
  blocks.push({
    id: `time-block-${ctx.timeSlot}`,
    type: "trending_block",
    title: tb.title,
    body: tb.body,
    emoji: tb.emoji,
    targetSlug: ctx.timeSlot,
    freshUntil: new Date(Date.now() + 3600000).toISOString(), // 1h freshness
  });

  // Category landing blocks for recommended segments
  for (const seg of ctx.recommendedSegments.slice(0, 5)) {
    blocks.push({
      id: `cat-${seg}`,
      type: "category_landing",
      title: `Best ${seg.replace(/_/g, " ")} in ${city}`,
      body: `Top-rated ${seg.replace(/_/g, " ")} places ${ctx.isWeekend ? "for your weekend" : "near you"}.`,
      emoji: "📍",
      targetSlug: seg,
      freshUntil: tomorrow,
    });
  }

  // Event seasonal copy
  for (const evt of ctx.activeEvents) {
    blocks.push({
      id: `event-copy-${evt.id}`,
      type: "seasonal_copy",
      title: `${evt.emoji} ${evt.name}`,
      body: `Special ${evt.name} offers and promotions across ${city}.`,
      emoji: evt.emoji,
      targetSlug: evt.id,
      freshUntil: tomorrow,
    });
  }

  return { blocks, totalGenerated: blocks.length, computedAt: new Date().toISOString() };
}
