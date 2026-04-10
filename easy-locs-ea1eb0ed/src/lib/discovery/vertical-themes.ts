import { heroCover } from "@/lib/image/category-covers";

export interface VerticalTheme {
  gradient: string;
  accentHsl: string;
  heroImage: string;
  heroVideo?: string;
  heroOverlay: string;
  tagline: string;
  searchPlaceholder: string;
  emptyEmoji: string;
  emptyMessage: string;
  cardAccent?: string;
}

export const VERTICAL_THEMES: Record<string, VerticalTheme> = {
  food: {
    gradient: "linear-gradient(135deg, hsl(8 75% 38%) 0%, hsl(20 85% 48%) 40%, hsl(35 90% 52%) 100%)",
    accentHsl: "20 85% 48%",
    heroImage: heroCover("food"),
    heroVideo: "https://cdn.pixabay.com/video/2016/02/29/2339-157269920_large.mp4",
    heroOverlay: "linear-gradient(135deg, hsla(8,75%,15%,0.55) 0%, hsla(20,85%,25%,0.4) 100%)",
    tagline: "Craving something delicious?",
    searchPlaceholder: "Pizza, sushi, burger, coffee…",
    emptyEmoji: "🍽️",
    emptyMessage: "No restaurants nearby yet",
  },
  grocery: {
    gradient: "linear-gradient(135deg, hsl(145 55% 30%) 0%, hsl(155 60% 38%) 40%, hsl(168 50% 44%) 100%)",
    accentHsl: "155 60% 38%",
    heroImage: heroCover("grocery"),
    heroVideo: "https://cdn.pixabay.com/video/2020/04/02/34777-427589406_large.mp4",
    heroOverlay: "linear-gradient(135deg, hsla(145,55%,12%,0.55) 0%, hsla(168,50%,22%,0.4) 100%)",
    tagline: "Fresh groceries, delivered fast",
    searchPlaceholder: "Fruits, dairy, organic, snacks…",
    emptyEmoji: "🛒",
    emptyMessage: "No grocery stores nearby",
  },
  shops: {
    gradient: "linear-gradient(135deg, hsl(275 45% 35%) 0%, hsl(295 50% 45%) 40%, hsl(315 55% 52%) 100%)",
    accentHsl: "295 50% 45%",
    heroImage: heroCover("shops"),
    heroVideo: "https://cdn.pixabay.com/video/2016/11/06/6289-190551167_large.mp4",
    heroOverlay: "linear-gradient(135deg, hsla(275,45%,14%,0.55) 0%, hsla(315,55%,26%,0.4) 100%)",
    tagline: "Shop local, discover more",
    searchPlaceholder: "Fashion, electronics, gifts…",
    emptyEmoji: "🛍️",
    emptyMessage: "No shops nearby",
  },
  services: {
    gradient: "linear-gradient(135deg, hsl(210 60% 32%) 0%, hsl(198 55% 42%) 40%, hsl(185 50% 46%) 100%)",
    accentHsl: "198 55% 42%",
    heroImage: heroCover("services"),
    heroVideo: "https://cdn.pixabay.com/video/2016/12/14/6775-195763534_large.mp4",
    heroOverlay: "linear-gradient(135deg, hsla(210,60%,12%,0.55) 0%, hsla(185,50%,24%,0.4) 100%)",
    tagline: "Trusted services at your door",
    searchPlaceholder: "Cleaning, salon, repair, movers…",
    emptyEmoji: "🛠️",
    emptyMessage: "No services nearby",
  },
  property: {
    gradient: "linear-gradient(135deg, hsl(220 42% 15%) 0%, hsl(220 38% 24%) 40%, hsl(38 68% 52%) 100%)",
    accentHsl: "38 68% 52%",
    heroImage: heroCover("property"),
    heroVideo: "https://cdn.pixabay.com/video/2016/12/14/6775-195763534_large.mp4",
    heroOverlay: "linear-gradient(135deg, hsla(220,42%,8%,0.55) 0%, hsla(220,38%,16%,0.4) 100%)",
    tagline: "Find your perfect space",
    searchPlaceholder: "Apartment, villa, office…",
    emptyEmoji: "🏠",
    emptyMessage: "No properties nearby",
  },
  healthcare: {
    gradient: "linear-gradient(135deg, hsl(195 65% 30%) 0%, hsl(180 50% 38%) 40%, hsl(168 45% 42%) 100%)",
    accentHsl: "180 50% 38%",
    heroImage: heroCover("healthcare"),
    heroVideo: "https://cdn.pixabay.com/video/2020/06/01/40856-427729171_large.mp4",
    heroOverlay: "linear-gradient(135deg, hsla(195,65%,12%,0.55) 0%, hsla(168,45%,22%,0.4) 100%)",
    tagline: "Your health, our priority",
    searchPlaceholder: "Clinic, dentist, pharmacy…",
    emptyEmoji: "🏥",
    emptyMessage: "No healthcare providers nearby",
  },
  mobility: {
    gradient: "linear-gradient(135deg, hsl(238 42% 30%) 0%, hsl(258 48% 42%) 40%, hsl(278 44% 50%) 100%)",
    accentHsl: "258 48% 42%",
    heroImage: heroCover("mobility"),
    heroVideo: "https://cdn.pixabay.com/video/2016/02/14/2165-155327596_large.mp4",
    heroOverlay: "linear-gradient(135deg, hsla(238,42%,12%,0.55) 0%, hsla(278,44%,24%,0.4) 100%)",
    tagline: "Move smarter, go further",
    searchPlaceholder: "Ride, rental, parking…",
    emptyEmoji: "🚗",
    emptyMessage: "No mobility services nearby",
  },
  experiences: {
    gradient: "linear-gradient(135deg, hsl(338 58% 40%) 0%, hsl(352 62% 48%) 40%, hsl(12 68% 52%) 100%)",
    accentHsl: "352 62% 48%",
    heroImage: heroCover("experiences"),
    heroVideo: "https://cdn.pixabay.com/video/2015/12/19/1702-149530478_large.mp4",
    heroOverlay: "linear-gradient(135deg, hsla(338,58%,15%,0.55) 0%, hsla(12,68%,24%,0.4) 100%)",
    tagline: "Unforgettable moments await",
    searchPlaceholder: "Events, activities, tours…",
    emptyEmoji: "🎉",
    emptyMessage: "No experiences nearby",
  },
  utility: {
    gradient: "linear-gradient(135deg, hsl(220 45% 28%) 0%, hsl(200 50% 36%) 40%, hsl(180 42% 42%) 100%)",
    accentHsl: "200 50% 36%",
    heroImage: heroCover("utility"),
    heroVideo: "https://cdn.pixabay.com/video/2016/12/14/6775-195763534_large.mp4",
    heroOverlay: "linear-gradient(135deg, hsla(220,45%,10%,0.55) 0%, hsla(180,42%,20%,0.4) 100%)",
    tagline: "Nearby essentials, always close",
    searchPlaceholder: "ATM, fuel, parking, post office…",
    emptyEmoji: "🏧",
    emptyMessage: "No utility services nearby",
  },
  stay: {
    gradient: "linear-gradient(135deg, hsl(220 40% 18%) 0%, hsl(215 35% 28%) 40%, hsl(38 60% 50%) 100%)",
    accentHsl: "38 60% 50%",
    heroImage: heroCover("stay"),
    heroVideo: "https://cdn.pixabay.com/video/2019/08/10/25905-354651343_large.mp4",
    heroOverlay: "linear-gradient(135deg, hsla(220,40%,8%,0.55) 0%, hsla(38,60%,18%,0.4) 100%)",
    tagline: "Your perfect stay awaits",
    searchPlaceholder: "Hotel, resort, apartment…",
    emptyEmoji: "🏨",
    emptyMessage: "No stays nearby",
  },
};

export function getVerticalTheme(vertical: string): VerticalTheme {
  return VERTICAL_THEMES[vertical] || VERTICAL_THEMES.food;
}
