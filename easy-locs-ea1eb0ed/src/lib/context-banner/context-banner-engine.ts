/**
 * Context Banner Engine — Dynamic contextual banners.
 * STRICT DISCIPLINE — ZERO TOLERANCE:
 * - Country by country, city by city, neighborhood by neighborhood
 * - Hour by hour, time by time
 * - Weather by weather, season by season
 * - Canonical taxonomy, unified ordering
 *
 * V3: Full geo cascade, extended country coverage, seasonal + weather awareness,
 * video-ready decorations, strict priority scoring.
 */

export interface ContextBanner {
  id: string;
  title: string;
  subtitle: string;
  emoji: string;
  gradient: string;
  glowColor?: string;
  cta?: string;
  route?: string;
  priority: number;
  animation?: "pulse" | "shimmer" | "float" | "none";
  vertical?: string;
  videoUrl?: string | null;
  country?: string;
  city?: string;
}

interface BannerContext {
  country?: string | null;
  city?: string | null;
  zone?: string | null;
  hour?: number;
  month?: number;
  day?: number;
  weather?: string | null;
  temperature?: number | null;
}

function getIslamicContext(month: number, day: number): string | null {
  if (month === 3 && day >= 10) return "ramadan";
  if (month === 4 && day <= 21) return "ramadan";
  if (month === 4 && day >= 22 && day <= 24) return "eid_fitr";
  if (month === 6 && day >= 15 && day <= 19) return "eid_adha";
  return null;
}

function getTimePeriod(hour: number): "dawn" | "morning" | "lunch" | "afternoon" | "golden_hour" | "dinner" | "evening" | "late_night" {
  if (hour >= 4 && hour < 6) return "dawn";
  if (hour >= 6 && hour < 11) return "morning";
  if (hour >= 11 && hour < 14) return "lunch";
  if (hour >= 14 && hour < 17) return "afternoon";
  if (hour >= 17 && hour < 19) return "golden_hour";
  if (hour >= 19 && hour < 22) return "dinner";
  if (hour >= 22) return "evening";
  return "late_night";
}

const ISLAMIC_COUNTRIES = ["AE", "SA", "QA", "KW", "BH", "OM", "EG", "JO", "LB", "MA", "TN", "DZ", "IQ", "PK", "TR", "ID", "MY", "BD"];
const GCC_COUNTRIES = ["AE", "SA", "QA", "KW", "BH", "OM"];
const MAGHREB_COUNTRIES = ["MA", "TN", "DZ", "LY"];
const EU_COUNTRIES = ["FR", "DE", "ES", "IT", "PT", "NL", "BE", "AT", "CH", "LU", "IE", "GR", "PL", "CZ", "SE", "DK", "FI", "NO"];
const FRANCOPHONE_COUNTRIES = ["FR", "BE", "CH", "LU", "MA", "TN", "DZ", "SN", "CI", "CM", "CD", "MG", "ML", "BF", "NE", "TD", "GA", "CG", "DJ", "KM"];
const SUBSAHARAN_COUNTRIES = ["SN", "CI", "CM", "CD", "MG", "ML", "BF", "NE", "TD", "GA", "CG", "GH", "NG", "KE", "TZ", "ET", "ZA", "RW", "UG"];

export function resolveContextBanners(ctx: BannerContext): ContextBanner[] {
  const banners: ContextBanner[] = [];
  const hour = ctx.hour ?? new Date().getHours();
  const month = ctx.month ?? (new Date().getMonth() + 1);
  const day = ctx.day ?? new Date().getDate();
  const country = ctx.country?.toUpperCase() || "";
  const city = ctx.city?.toLowerCase() || "";
  const timePeriod = getTimePeriod(hour);
  const islamicEvent = getIslamicContext(month, day);
  const dayOfWeek = new Date().getDay();
  const weather = ctx.weather?.toLowerCase() || "";
  const temp = ctx.temperature ?? null;

  // ═══════════════════════════════════════════════════
  //  ISLAMIC CALENDAR — All Muslim countries
  // ═══════════════════════════════════════════════════
  if (islamicEvent === "ramadan" && ISLAMIC_COUNTRIES.includes(country)) {
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
      vertical: "food",
      country,
    });
  }

  if ((islamicEvent === "eid_fitr" || islamicEvent === "eid_adha") && ISLAMIC_COUNTRIES.includes(country)) {
    banners.push({
      id: `eid-${islamicEvent}`,
      title: islamicEvent === "eid_fitr" ? "Eid Al-Fitr Mubarak! 🎉" : "Eid Al-Adha Mubarak! 🐑",
      subtitle: "Celebrate with family feasts, gifts & exclusive offers",
      emoji: "🕌",
      gradient: "linear-gradient(135deg, hsl(45 85% 50%), hsl(35 90% 55%), hsl(25 80% 50%))",
      glowColor: "hsl(45 90% 60% / 0.2)",
      cta: "Explore Offers",
      route: "/food",
      priority: 98,
      animation: "pulse",
      vertical: "food",
      country,
    });
  }

  // ═══════════════════════════════════════════════════
  //  WEATHER-DRIVEN BANNERS — Real-time adaptation
  // ═══════════════════════════════════════════════════
  if (weather.includes("rain") || weather.includes("storm")) {
    banners.push({
      id: "weather-rain-delivery",
      title: "Rainy Day? We Deliver 🌧️",
      subtitle: "Stay warm — your favorites arrive at your door",
      emoji: "🌧️",
      gradient: "linear-gradient(135deg, hsl(210 50% 25%), hsl(220 45% 32%), hsl(200 55% 40%))",
      glowColor: "hsl(210 60% 50% / 0.15)",
      cta: "Order Now",
      route: "/food",
      priority: 80,
      animation: "shimmer",
      vertical: "food",
      country,
      city: ctx.city || undefined,
    });
  }

  if (weather.includes("heat") || (temp !== null && temp > 38)) {
    banners.push({
      id: "weather-heat-cool",
      title: "Beat the Heat 🧊",
      subtitle: "Cold drinks, ice cream & smoothies — delivered fast",
      emoji: "🍦",
      gradient: "linear-gradient(135deg, hsl(195 75% 50%), hsl(210 70% 55%), hsl(225 65% 58%))",
      glowColor: "hsl(200 80% 60% / 0.12)",
      cta: "Cool Down",
      route: "/food",
      priority: 75,
      animation: "shimmer",
      vertical: "food",
      country,
      city: ctx.city || undefined,
    });
  }

  if (weather.includes("snow")) {
    banners.push({
      id: "weather-snow-cozy",
      title: "Snowy Day Comfort ❄️",
      subtitle: "Hot soups, warm drinks & cozy meals delivered",
      emoji: "❄️",
      gradient: "linear-gradient(135deg, hsl(200 30% 85%), hsl(210 35% 78%), hsl(220 40% 70%))",
      glowColor: "hsl(210 40% 80% / 0.2)",
      cta: "Warm Up",
      route: "/food",
      priority: 78,
      animation: "float",
      vertical: "food",
      country,
      city: ctx.city || undefined,
    });
  }

  // ═══════════════════════════════════════════════════
  //  TIME-OF-DAY BANNERS — Hour by hour
  // ═══════════════════════════════════════════════════
  if (timePeriod === "dawn") {
    banners.push({
      id: "time-dawn",
      title: "Early Riser? 🌅",
      subtitle: "Fresh bakeries, pharmacies & essentials opening now",
      emoji: "🌅",
      gradient: "linear-gradient(135deg, hsl(35 60% 45%), hsl(25 65% 50%), hsl(15 70% 55%))",
      glowColor: "hsl(30 70% 55% / 0.1)",
      cta: "Start Your Day",
      route: "/grocery",
      priority: 45,
      animation: "float",
      vertical: "grocery",
    });
  }

  if (timePeriod === "morning") {
    banners.push({
      id: "time-morning",
      title: "Good Morning ☀️",
      subtitle: "Fresh coffee, pastries & breakfast bowls near you",
      emoji: "☕",
      gradient: "linear-gradient(135deg, hsl(30 75% 50%), hsl(40 85% 60%), hsl(50 90% 70%))",
      glowColor: "hsl(40 90% 65% / 0.12)",
      cta: "Order Breakfast",
      route: "/food",
      priority: 60,
      animation: "float",
      vertical: "food",
    });
  }

  if (timePeriod === "lunch") {
    banners.push({
      id: "time-lunch",
      title: "Lunch Rush 🍽️",
      subtitle: "Quick & delicious meals — delivered in minutes",
      emoji: "🥗",
      gradient: "linear-gradient(135deg, hsl(142 55% 38%), hsl(155 50% 45%), hsl(170 45% 50%))",
      glowColor: "hsl(150 60% 50% / 0.1)",
      cta: "See Menus",
      route: "/food",
      priority: 62,
      animation: "shimmer",
      vertical: "food",
    });
  }

  if (timePeriod === "afternoon") {
    banners.push({
      id: "time-afternoon",
      title: "Explore & Discover 🔍",
      subtitle: "Shops, services & hidden gems around you",
      emoji: "🏪",
      gradient: "linear-gradient(135deg, hsl(210 65% 48%), hsl(225 60% 52%), hsl(240 55% 55%))",
      glowColor: "hsl(220 70% 55% / 0.1)",
      cta: "Explore Nearby",
      route: "/radar",
      priority: 50,
      animation: "float",
      vertical: "shops",
    });
  }

  if (timePeriod === "golden_hour") {
    banners.push({
      id: "time-golden",
      title: "Golden Hour ✨",
      subtitle: "Book dinner, plan your evening, discover events",
      emoji: "✨",
      gradient: "linear-gradient(135deg, hsl(35 80% 50%), hsl(25 85% 55%), hsl(15 75% 48%))",
      glowColor: "hsl(30 85% 55% / 0.12)",
      cta: "Plan Tonight",
      route: "/food",
      priority: 55,
      animation: "shimmer",
      vertical: "food",
    });
  }

  if (timePeriod === "dinner") {
    banners.push({
      id: "time-dinner",
      title: "Dinner Tonight 🍷",
      subtitle: "Top restaurants delivering to your door",
      emoji: "🍣",
      gradient: "linear-gradient(135deg, hsl(280 50% 35%), hsl(310 55% 40%), hsl(340 50% 45%))",
      glowColor: "hsl(300 50% 50% / 0.1)",
      cta: "Find Dinner",
      route: "/food",
      priority: 60,
      animation: "shimmer",
      vertical: "food",
    });
  }

  if (timePeriod === "evening") {
    banners.push({
      id: "time-evening",
      title: "Evening Plans 🌃",
      subtitle: "Late dining, events & nightlife near you",
      emoji: "🌃",
      gradient: "linear-gradient(135deg, hsl(250 40% 20%), hsl(270 35% 28%), hsl(290 30% 32%))",
      glowColor: "hsl(260 45% 40% / 0.12)",
      cta: "Discover",
      route: "/radar",
      priority: 48,
      animation: "pulse",
      vertical: "experiences",
    });
  }

  if (timePeriod === "late_night") {
    banners.push({
      id: "time-late-night",
      title: "Night Owl Mode 🦉",
      subtitle: "Still delivering — late-night eats & essentials",
      emoji: "🍕",
      gradient: "linear-gradient(135deg, hsl(240 45% 15%), hsl(260 40% 22%), hsl(280 35% 28%))",
      glowColor: "hsl(260 50% 50% / 0.12)",
      cta: "Order Now",
      route: "/food",
      priority: 50,
      animation: "pulse",
      vertical: "food",
    });
  }

  // ═══════════════════════════════════════════════════
  //  COUNTRY-SPECIFIC — Strict per-country discipline
  // ═══════════════════════════════════════════════════

  // GCC Summer (June-September)
  if (GCC_COUNTRIES.includes(country) && month >= 6 && month <= 9) {
    banners.push({
      id: `${country.toLowerCase()}-summer-survival`,
      title: "Summer Survival Kit 🌡️",
      subtitle: "Indoor activities, cold delivery & AC services",
      emoji: "🧊",
      gradient: "linear-gradient(135deg, hsl(195 75% 50%), hsl(210 70% 55%), hsl(225 65% 58%))",
      glowColor: "hsl(200 80% 60% / 0.12)",
      cta: "Stay Cool",
      route: "/food",
      priority: 42,
      animation: "shimmer",
      vertical: "food",
      country,
    });
  }

  // UAE National Day (Dec 2-3)
  if (country === "AE" && month === 12 && day >= 1 && day <= 3) {
    banners.push({
      id: "uae-national-day",
      title: "UAE National Day 🇦🇪",
      subtitle: "Celebrate with exclusive local offers & deals",
      emoji: "🎆",
      gradient: "linear-gradient(135deg, hsl(0 65% 45%), hsl(120 55% 35%), hsl(0 0% 95%))",
      glowColor: "hsl(120 60% 45% / 0.1)",
      cta: "Explore",
      route: "/radar",
      priority: 92,
      animation: "pulse",
      country: "AE",
    });
  }

  // Saudi National Day (Sep 23)
  if (country === "SA" && month === 9 && day >= 22 && day <= 24) {
    banners.push({
      id: "saudi-national-day",
      title: "Saudi National Day 🇸🇦",
      subtitle: "Celebrate the Kingdom with exclusive deals",
      emoji: "🇸🇦",
      gradient: "linear-gradient(135deg, hsl(120 60% 30%), hsl(130 55% 35%), hsl(0 0% 95%))",
      glowColor: "hsl(120 65% 40% / 0.1)",
      cta: "Discover",
      route: "/radar",
      priority: 90,
      animation: "pulse",
      country: "SA",
    });
  }

  // Morocco — Throne Day (Jul 30), Independence (Nov 18)
  if (country === "MA") {
    if (month === 7 && day >= 29 && day <= 31) {
      banners.push({
        id: "morocco-throne-day",
        title: "Fête du Trône 🇲🇦",
        subtitle: "Offres spéciales pour célébrer avec la famille",
        emoji: "🇲🇦",
        gradient: "linear-gradient(135deg, hsl(0 70% 45%), hsl(120 55% 35%))",
        cta: "Découvrir",
        route: "/food",
        priority: 88,
        animation: "pulse",
        country: "MA",
      });
    }
    if ((timePeriod === "lunch" || timePeriod === "dinner")) {
      banners.push({
        id: "morocco-cuisine",
        title: "Tagine & More 🫕",
        subtitle: "Authentic Moroccan cuisine — order now",
        emoji: "🍵",
        gradient: "linear-gradient(135deg, hsl(15 70% 45%), hsl(30 75% 50%), hsl(45 80% 55%))",
        glowColor: "hsl(25 75% 50% / 0.1)",
        cta: "Commander",
        route: "/food",
        priority: 42,
        animation: "float",
        vertical: "food",
        country: "MA",
      });
    }
  }

  // France — Bastille Day (Jul 14), Christmas
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
        country: "FR",
      });
    }
  }

  // Turkey
  if (country === "TR") {
    if (month === 10 && day === 29) {
      banners.push({
        id: "turkey-republic-day",
        title: "Cumhuriyet Bayramı 🇹🇷",
        subtitle: "Republic Day — special offers celebrating Turkey",
        emoji: "🇹🇷",
        gradient: "linear-gradient(135deg, hsl(0 70% 45%), hsl(0 0% 95%))",
        cta: "Keşfet",
        route: "/radar",
        priority: 88,
        animation: "pulse",
        country: "TR",
      });
    }
  }

  // Sub-Saharan Africa — market days
  if (SUBSAHARAN_COUNTRIES.includes(country)) {
    if (timePeriod === "morning" && (dayOfWeek === 0 || dayOfWeek === 3 || dayOfWeek === 6)) {
      banners.push({
        id: `${country.toLowerCase()}-market-day`,
        title: "Market Day 🛒",
        subtitle: "Fresh produce, local goods & artisan finds",
        emoji: "🥬",
        gradient: "linear-gradient(135deg, hsl(85 55% 40%), hsl(100 50% 45%), hsl(120 45% 48%))",
        glowColor: "hsl(100 60% 45% / 0.1)",
        cta: "Shop Now",
        route: "/grocery",
        priority: 52,
        animation: "float",
        vertical: "grocery",
        country,
      });
    }
  }

  // Francophone — Locale-aware greeting
  if (FRANCOPHONE_COUNTRIES.includes(country) && timePeriod === "morning") {
    banners.push({
      id: "francophone-bonjour",
      title: "Bonjour ! ☀️",
      subtitle: "Commandez votre petit-déjeuner préféré",
      emoji: "🥐",
      gradient: "linear-gradient(135deg, hsl(30 75% 50%), hsl(40 85% 60%))",
      glowColor: "hsl(35 80% 58% / 0.1)",
      cta: "Commander",
      route: "/food",
      priority: 48,
      animation: "float",
      vertical: "food",
      country,
    });
  }

  // EU Christmas season (Dec)
  if (EU_COUNTRIES.includes(country) && month === 12) {
    banners.push({
      id: "eu-christmas",
      title: "Holiday Season 🎄",
      subtitle: "Gifts, feasts & festive experiences",
      emoji: "🎁",
      gradient: "linear-gradient(135deg, hsl(0 60% 35%), hsl(120 50% 30%), hsl(45 80% 45% / 0.3))",
      glowColor: "hsl(0 60% 45% / 0.12)",
      cta: "Shop Gifts",
      route: "/radar",
      priority: 65,
      animation: "shimmer",
      country,
    });
  }

  // ═══════════════════════════════════════════════════
  //  WEEKEND — Global
  // ═══════════════════════════════════════════════════
  if (dayOfWeek === 5 || dayOfWeek === 6 || dayOfWeek === 0) {
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
      vertical: "experiences",
    });
  }

  // Friday in GCC/MENA = Weekend start
  if (GCC_COUNTRIES.includes(country) && dayOfWeek === 5) {
    banners.push({
      id: "gcc-friday",
      title: "Jummah Mubarak 🤲",
      subtitle: "Friday family meals & weekend plans",
      emoji: "🕌",
      gradient: "linear-gradient(135deg, hsl(155 50% 35%), hsl(170 45% 40%), hsl(180 40% 45%))",
      glowColor: "hsl(165 55% 40% / 0.1)",
      cta: "Order",
      route: "/food",
      priority: 55,
      animation: "float",
      vertical: "food",
      country,
    });
  }

  // ═══════════════════════════════════════════════════
  //  ALWAYS — Wallet promo (low priority)
  // ═══════════════════════════════════════════════════
  banners.push({
    id: "wallet-promo",
    title: "Your Wallet is Ready 💳",
    subtitle: "Send money, pay merchants & earn rewards",
    emoji: "💰",
    gradient: "linear-gradient(135deg, hsl(152 55% 38%), hsl(165 50% 42%), hsl(180 45% 45%))",
    glowColor: "hsl(155 60% 45% / 0.1)",
    cta: "Open Wallet",
    route: "/wallet",
    priority: 20,
    animation: "shimmer",
  });

  return banners.sort((a, b) => b.priority - a.priority);
}

export function getTopBanners(ctx: BannerContext, max = 3): ContextBanner[] {
  return resolveContextBanners(ctx).slice(0, max);
}
