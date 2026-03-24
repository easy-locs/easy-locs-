/**
 * Vertical Themes — Per-vertical visual identity for premium category pages.
 * Each vertical gets its own gradient, accent, hero image, and mood.
 */

export interface VerticalTheme {
  gradient: string;
  accentHsl: string;
  heroImage: string;
  heroOverlay: string;
  tagline: string;
  searchPlaceholder: string;
  emptyEmoji: string;
  emptyMessage: string;
  cardAccent?: string;
}

export const VERTICAL_THEMES: Record<string, VerticalTheme> = {
  food: {
    gradient: "linear-gradient(135deg, hsl(12 80% 42%) 0%, hsl(25 85% 50%) 40%, hsl(38 90% 55%) 100%)",
    accentHsl: "25 85% 50%",
    heroImage: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&q=80",
    heroOverlay: "linear-gradient(135deg, hsla(12,80%,20%,0.85) 0%, hsla(25,85%,30%,0.7) 100%)",
    tagline: "Craving something delicious?",
    searchPlaceholder: "Pizza, sushi, burger, coffee…",
    emptyEmoji: "🍽️",
    emptyMessage: "No restaurants nearby yet",
  },
  grocery: {
    gradient: "linear-gradient(135deg, hsl(142 55% 35%) 0%, hsl(152 60% 42%) 40%, hsl(165 50% 48%) 100%)",
    accentHsl: "152 60% 42%",
    heroImage: "https://images.unsplash.com/photo-1542838132-92c53300491e?w=800&q=80",
    heroOverlay: "linear-gradient(135deg, hsla(142,55%,15%,0.88) 0%, hsla(165,50%,25%,0.72) 100%)",
    tagline: "Fresh groceries, delivered fast",
    searchPlaceholder: "Fruits, dairy, organic, snacks…",
    emptyEmoji: "🛒",
    emptyMessage: "No grocery stores nearby",
  },
  shops: {
    gradient: "linear-gradient(135deg, hsl(280 50% 40%) 0%, hsl(300 45% 50%) 40%, hsl(320 50% 55%) 100%)",
    accentHsl: "300 45% 50%",
    heroImage: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800&q=80",
    heroOverlay: "linear-gradient(135deg, hsla(280,50%,18%,0.88) 0%, hsla(320,50%,30%,0.72) 100%)",
    tagline: "Shop local, discover more",
    searchPlaceholder: "Fashion, electronics, gifts…",
    emptyEmoji: "🛍️",
    emptyMessage: "No shops nearby",
  },
  services: {
    gradient: "linear-gradient(135deg, hsl(210 65% 38%) 0%, hsl(200 60% 48%) 40%, hsl(185 55% 50%) 100%)",
    accentHsl: "200 60% 48%",
    heroImage: "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=800&q=80",
    heroOverlay: "linear-gradient(135deg, hsla(210,65%,15%,0.88) 0%, hsla(185,55%,28%,0.72) 100%)",
    tagline: "Trusted services at your door",
    searchPlaceholder: "Cleaning, salon, repair, movers…",
    emptyEmoji: "🛠️",
    emptyMessage: "No services nearby",
  },
  property: {
    gradient: "linear-gradient(135deg, hsl(220 40% 18%) 0%, hsl(220 35% 28%) 40%, hsl(38 65% 56%) 100%)",
    accentHsl: "38 65% 56%",
    heroImage: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&q=80",
    heroOverlay: "linear-gradient(135deg, hsla(220,40%,10%,0.88) 0%, hsla(220,35%,20%,0.72) 100%)",
    tagline: "Find your perfect space",
    searchPlaceholder: "Apartment, villa, office…",
    emptyEmoji: "🏠",
    emptyMessage: "No properties nearby",
  },
  healthcare: {
    gradient: "linear-gradient(135deg, hsl(195 70% 35%) 0%, hsl(180 55% 42%) 40%, hsl(168 50% 48%) 100%)",
    accentHsl: "180 55% 42%",
    heroImage: "https://images.unsplash.com/photo-1631217868264-e5b90bb7e133?w=800&q=80",
    heroOverlay: "linear-gradient(135deg, hsla(195,70%,15%,0.9) 0%, hsla(168,50%,25%,0.75) 100%)",
    tagline: "Your health, our priority",
    searchPlaceholder: "Clinic, dentist, pharmacy…",
    emptyEmoji: "🏥",
    emptyMessage: "No healthcare providers nearby",
  },
  mobility: {
    gradient: "linear-gradient(135deg, hsl(240 45% 35%) 0%, hsl(260 50% 48%) 40%, hsl(280 45% 55%) 100%)",
    accentHsl: "260 50% 48%",
    heroImage: "https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?w=800&q=80",
    heroOverlay: "linear-gradient(135deg, hsla(240,45%,15%,0.88) 0%, hsla(280,45%,28%,0.72) 100%)",
    tagline: "Move smarter, go further",
    searchPlaceholder: "Ride, rental, parking…",
    emptyEmoji: "🚗",
    emptyMessage: "No mobility services nearby",
  },
  experiences: {
    gradient: "linear-gradient(135deg, hsl(340 60% 45%) 0%, hsl(355 65% 52%) 40%, hsl(15 70% 55%) 100%)",
    accentHsl: "355 65% 52%",
    heroImage: "https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=800&q=80",
    heroOverlay: "linear-gradient(135deg, hsla(340,60%,18%,0.88) 0%, hsla(15,70%,28%,0.72) 100%)",
    tagline: "Unforgettable moments await",
    searchPlaceholder: "Events, activities, tours…",
    emptyEmoji: "🎉",
    emptyMessage: "No experiences nearby",
  },
};

export function getVerticalTheme(vertical: string): VerticalTheme {
  return VERTICAL_THEMES[vertical] || VERTICAL_THEMES.food;
}
