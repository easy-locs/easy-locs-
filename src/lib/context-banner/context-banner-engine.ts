/**
 * Context Banner Engine — Dynamic contextual banners by country, time, event.
 * Drives marketing sections on Home, Shop, and discovery surfaces.
 * V2: Richer gradients, more geo events, seasonal awareness, animated backgrounds.
 */

export interface ContextBanner {
  id: string;
  title: string;
  subtitle: string;
  emoji: string;
  gradient: string;
  /** Optional shimmer/glow overlay color */
  glowColor?: string;
  cta?: string;
  route?: string;
  priority: number;
  /** Animation variant hint for renderer */
  animation?: "pulse" | "shimmer" | "float" | "none";
}

interface BannerContext {
  country?: string | null;
  city?: string | null;
  hour?: number;
  month?: number;
  day?: number;
}

function getIslamicContext(month: number, day: number): string | null {
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

const ISLAMIC_COUNTRIES = ["AE", "SA", "QA", "KW", "BH", "OM", "EG", "JO", "LB", "MA", "TN", "DZ", "IQ", "PK"];

export function resolveContextBanners(ctx: BannerContext): ContextBanner[] {
  const banners: ContextBanner[] = [];
  const hour = ctx.hour ?? new Date().getHours();
  const month = ctx.month ?? (new Date().getMonth() + 1);
  const day = ctx.day ?? new Date().getDate();
  const country = ctx.country?.toUpperCase();
  const timePeriod = getTimePeriod(hour);
  const islamicEvent = getIslamicContext(month, day);

  // ── Islamic calendar events ──
  if (islamicEvent === "ramadan" && ISLAMIC_COUNTRIES.includes(country || "")) {
    banners.push({
      id: "ramadan-iftar",
      title: hour >= 15 ? "Iftar Specials 🌙" : "Suhoor Deals 🌟",
      subtitle: hour >= 15 ? "Break your fast with the best restaurants" : "Pre-dawn meal deals delivered to you",
      emoji: "🌙",
      gradient: "linear-gradient(135deg, hsl(265 45% 18%), hsl(280 40% 25%), hsl(45 80% 45% / 0.3))",
      glowColor: "hsl(45 90% 60% / 0.15)",
      cta: "Order Now",
      route: "/food",
      priority: 100,
      animation: "shimmer",
    });
  }

  if (islamicEvent === "eid_fitr" || islamicEvent === "eid_adha") {
    banners.push({
      id: "eid-celebration",
      title: "Eid Mubarak! 🎉",
      subtitle: "Celebrate with family feasts, gifts & exclusive offers",
      emoji: "🕌",
      gradient: "linear-gradient(135deg, hsl(45 85% 50%), hsl(35 90% 55%), hsl(25 80% 50%))",
      glowColor: "hsl(45 90% 60% / 0.2)",
      cta: "Explore Offers",
      route: "/food",
      priority: 95,
      animation: "pulse",
    });
  }

  // ── Time-based banners ──
  if (timePeriod === "morning") {
    banners.push({
      id: "morning-coffee",
      title: "Good Morning ☀️",
      subtitle: "Fresh coffee, pastries & breakfast bowls near you",
      emoji: "☕",
      gradient: "linear-gradient(135deg, hsl(30 75% 50%), hsl(40 85% 60%), hsl(50 90% 70%))",
      glowColor: "hsl(40 90% 65% / 0.12)",
      cta: "Order Breakfast",
      route: "/food",
      priority: 60,
      animation: "float",
    });
  }

  if (timePeriod === "lunch") {
    banners.push({
      id: "lunch-deals",
      title: "Lunch Rush 🍽️",
      subtitle: "Quick & delicious meals — delivered in minutes",
      emoji: "🥗",
      gradient: "linear-gradient(135deg, hsl(142 55% 38%), hsl(155 50% 45%), hsl(170 45% 50%))",
      glowColor: "hsl(150 60% 50% / 0.1)",
      cta: "See Menus",
      route: "/food",
      priority: 55,
      animation: "shimmer",
    });
  }

  if (timePeriod === "afternoon") {
    banners.push({
      id: "afternoon-explore",
      title: "Explore & Discover 🔍",
      subtitle: "Shops, services & hidden gems around you",
      emoji: "🏪",
      gradient: "linear-gradient(135deg, hsl(210 65% 48%), hsl(225 60% 52%), hsl(240 55% 55%))",
      glowColor: "hsl(220 70% 55% / 0.1)",
      cta: "Explore Nearby",
      route: "/radar",
      priority: 50,
      animation: "float",
    });
  }

  if (timePeriod === "dinner") {
    banners.push({
      id: "dinner-time",
      title: "Dinner Tonight 🍷",
      subtitle: "Top restaurants delivering to your door",
      emoji: "🍣",
      gradient: "linear-gradient(135deg, hsl(280 50% 35%), hsl(310 55% 40%), hsl(340 50% 45%))",
      glowColor: "hsl(300 50% 50% / 0.1)",
      cta: "Find Dinner",
      route: "/food",
      priority: 55,
      animation: "shimmer",
    });
  }

  if (timePeriod === "late_night") {
    banners.push({
      id: "late-night",
      title: "Night Owl Mode 🌃",
      subtitle: "Still delivering — late-night eats & essentials",
      emoji: "🍕",
      gradient: "linear-gradient(135deg, hsl(240 45% 15%), hsl(260 40% 22%), hsl(280 35% 28%))",
      glowColor: "hsl(260 50% 50% / 0.12)",
      cta: "Order Now",
      route: "/food",
      priority: 50,
      animation: "pulse",
    });
  }

  // ── UAE-specific ──
  if (country === "AE") {
    if (month >= 6 && month <= 9) {
      banners.push({
        id: "uae-summer",
        title: "Beat the Heat 🧊",
        subtitle: "Cold drinks, ice cream & smoothies — delivered fast",
        emoji: "🍦",
        gradient: "linear-gradient(135deg, hsl(195 75% 50%), hsl(210 70% 55%), hsl(225 65% 58%))",
        glowColor: "hsl(200 80% 60% / 0.12)",
        cta: "Cool Down",
        route: "/food",
        priority: 40,
        animation: "shimmer",
      });
    }
    if (month === 12 && day >= 1 && day <= 3) {
      banners.push({
        id: "uae-national-day",
        title: "UAE National Day 🇦🇪",
        subtitle: "Celebrate with exclusive local offers & deals",
        emoji: "🎆",
        gradient: "linear-gradient(135deg, hsl(0 65% 45%), hsl(120 55% 35%), hsl(0 0% 95%))",
        glowColor: "hsl(120 60% 45% / 0.1)",
        cta: "Explore",
        route: "/radar",
        priority: 90,
        animation: "pulse",
      });
    }
  }

  // ── Morocco-specific ──
  if (country === "MA") {
    if (timePeriod === "lunch" || timePeriod === "dinner") {
      banners.push({
        id: "morocco-food",
        title: "Tagine & More 🫕",
        subtitle: "Authentic Moroccan cuisine — order now",
        emoji: "🍵",
        gradient: "linear-gradient(135deg, hsl(15 70% 45%), hsl(30 75% 50%), hsl(45 80% 55%))",
        glowColor: "hsl(25 75% 50% / 0.1)",
        cta: "Order",
        route: "/food",
        priority: 42,
        animation: "float",
      });
    }
  }

  // ── France-specific ──
  if (country === "FR") {
    if (month === 7 && day === 14) {
      banners.push({
        id: "france-national-day",
        title: "Bonne Fête Nationale 🇫🇷",
        subtitle: "Célébrez avec des offres spéciales",
        emoji: "🎆",
        gradient: "linear-gradient(135deg, hsl(220 70% 40%), hsl(0 0% 95%), hsl(0 65% 45%))",
        glowColor: "hsl(220 70% 50% / 0.1)",
        cta: "Découvrir",
        route: "/radar",
        priority: 88,
        animation: "pulse",
      });
    }
  }

  // ── Weekend vibes (global) ──
  const dayOfWeek = new Date().getDay();
  if (dayOfWeek === 5 || dayOfWeek === 6) {
    banners.push({
      id: "weekend-vibes",
      title: "Weekend Mode 🎉",
      subtitle: "Top restaurants, experiences & deals near you",
      emoji: "🍾",
      gradient: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--accent)))",
      glowColor: "hsl(var(--accent) / 0.1)",
      cta: "Explore",
      route: "/radar",
      priority: 35,
      animation: "float",
    });
  }

  // ── New user / first visit ──
  banners.push({
    id: "wallet-promo",
    title: "Your Wallet is Ready 💳",
    subtitle: "Send money, pay merchants & earn rewards",
    emoji: "💰",
    gradient: "linear-gradient(135deg, hsl(152 55% 38%), hsl(165 50% 42%), hsl(180 45% 45%))",
    glowColor: "hsl(155 60% 45% / 0.1)",
    cta: "Open Wallet",
    route: "/wallet/hub",
    priority: 20,
    animation: "shimmer",
  });

  return banners.sort((a, b) => b.priority - a.priority);
}

/** Get top N banners for a surface */
export function getTopBanners(ctx: BannerContext, max = 3): ContextBanner[] {
  return resolveContextBanners(ctx).slice(0, max);
}