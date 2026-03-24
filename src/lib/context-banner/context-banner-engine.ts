/**
 * Context Banner Engine — Dynamic contextual banners by country, time, event.
 * Drives marketing sections on Home, Shop, and discovery surfaces.
 */

export interface ContextBanner {
  id: string;
  title: string;
  subtitle: string;
  emoji: string;
  gradient: string;
  cta?: string;
  route?: string;
  priority: number;
}

interface BannerContext {
  country?: string | null;
  city?: string | null;
  hour?: number;
  month?: number;
  day?: number;
}

function getIslamicContext(month: number, day: number): string | null {
  // Simplified — real implementation would use Hijri calendar API
  // For now, approximate common periods
  if (month === 3 && day >= 10) return "ramadan";
  if (month === 4 && day <= 21) return "ramadan";
  if (month === 4 && day >= 22 && day <= 24) return "eid_fitr";
  if (month === 6 && day >= 15 && day <= 19) return "eid_adha";
  return null;
}

function getTimePeriod(hour: number): "morning" | "lunch" | "afternoon" | "dinner" | "late_night" {
  if (hour >= 5 && hour < 11) return "morning";
  if (hour >= 11 && hour < 15) return "lunch";
  if (hour >= 15 && hour < 18) return "afternoon";
  if (hour >= 18 && hour < 23) return "dinner";
  return "late_night";
}

export function resolveContextBanners(ctx: BannerContext): ContextBanner[] {
  const banners: ContextBanner[] = [];
  const hour = ctx.hour ?? new Date().getHours();
  const month = ctx.month ?? (new Date().getMonth() + 1);
  const day = ctx.day ?? new Date().getDate();
  const country = ctx.country?.toUpperCase();
  const timePeriod = getTimePeriod(hour);
  const islamicEvent = getIslamicContext(month, day);

  // ── Islamic calendar events (UAE, SA, etc.) ──
  if (islamicEvent === "ramadan" && ["AE", "SA", "QA", "KW", "BH", "OM", "EG", "JO", "LB"].includes(country || "")) {
    banners.push({
      id: "ramadan-iftar",
      title: hour >= 15 ? "Iftar Specials" : "Suhoor Deals",
      subtitle: hour >= 15 ? "Break your fast with the best" : "Pre-dawn meal deals",
      emoji: "🌙",
      gradient: "linear-gradient(135deg, hsl(var(--primary) / 0.15), hsl(270 60% 50% / 0.1))",
      cta: "Order Now",
      route: "/food",
      priority: 100,
    });
  }

  if (islamicEvent === "eid_fitr" || islamicEvent === "eid_adha") {
    banners.push({
      id: "eid-celebration",
      title: "Eid Mubarak 🎉",
      subtitle: "Celebrate with family feasts & gifts",
      emoji: "🕌",
      gradient: "linear-gradient(135deg, hsl(45 90% 55% / 0.15), hsl(var(--primary) / 0.1))",
      cta: "Explore Offers",
      route: "/food",
      priority: 95,
    });
  }

  // ── Time-based banners ──
  if (timePeriod === "morning") {
    banners.push({
      id: "morning-coffee",
      title: "Good Morning ☀️",
      subtitle: "Start your day with fresh coffee & pastries",
      emoji: "☕",
      gradient: "linear-gradient(135deg, hsl(30 80% 55% / 0.12), hsl(45 90% 60% / 0.08))",
      cta: "Order Breakfast",
      route: "/food",
      priority: 60,
    });
  }

  if (timePeriod === "lunch") {
    banners.push({
      id: "lunch-deals",
      title: "Lunch Time 🍽️",
      subtitle: "Quick & delicious meals delivered",
      emoji: "🥗",
      gradient: "linear-gradient(135deg, hsl(140 60% 45% / 0.12), hsl(160 50% 50% / 0.08))",
      cta: "See Menus",
      route: "/food",
      priority: 55,
    });
  }

  if (timePeriod === "late_night") {
    banners.push({
      id: "late-night",
      title: "Late Night Cravings 🌃",
      subtitle: "Still delivering near you",
      emoji: "🍕",
      gradient: "linear-gradient(135deg, hsl(260 50% 30% / 0.15), hsl(280 40% 40% / 0.1))",
      cta: "Order Now",
      route: "/food",
      priority: 50,
    });
  }

  // ── UAE-specific ──
  if (country === "AE") {
    if (month >= 6 && month <= 9) {
      banners.push({
        id: "uae-summer",
        title: "Beat the Heat 🧊",
        subtitle: "Cold drinks & desserts delivered fast",
        emoji: "🍦",
        gradient: "linear-gradient(135deg, hsl(195 80% 55% / 0.12), hsl(210 70% 60% / 0.08))",
        cta: "Cool Down",
        route: "/food",
        priority: 40,
      });
    }
    if (month === 12 && day >= 1 && day <= 3) {
      banners.push({
        id: "uae-national-day",
        title: "UAE National Day 🇦🇪",
        subtitle: "Celebrate with exclusive local deals",
        emoji: "🎆",
        gradient: "linear-gradient(135deg, hsl(0 70% 50% / 0.1), hsl(120 60% 40% / 0.1))",
        cta: "Explore",
        route: "/radar",
        priority: 90,
      });
    }
  }

  // ── Weekend vibes ──
  const dayOfWeek = new Date().getDay();
  if (dayOfWeek === 5 || dayOfWeek === 6) {
    banners.push({
      id: "weekend-vibes",
      title: "Weekend Mode 🎉",
      subtitle: "Discover top-rated restaurants & experiences",
      emoji: "🍾",
      gradient: "linear-gradient(135deg, hsl(var(--primary) / 0.1), hsl(var(--accent) / 0.08))",
      cta: "Explore",
      route: "/radar",
      priority: 35,
    });
  }

  return banners.sort((a, b) => b.priority - a.priority);
}

/** Get top N banners for a surface */
export function getTopBanners(ctx: BannerContext, max = 3): ContextBanner[] {
  return resolveContextBanners(ctx).slice(0, max);
}
