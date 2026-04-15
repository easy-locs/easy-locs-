import { useMemo, useState, useEffect } from "react";
import { useLocation } from "react-router-dom";

export type LogoSection =
  | "food"
  | "taxi"
  | "hotel"
  | "commerce"
  | "services"
  | "travel"
  | "immo"
  | "orbit"
  | "default";

export type TimeOfDay = "dawn" | "day" | "dusk" | "night";

export type SpecialEvent =
  | "new_year"
  | "valentine"
  | "ramadan"
  | "christmas"
  | null;

export interface DynamicLogoContext {
  section: LogoSection;
  timeOfDay: TimeOfDay;
  specialEvent: SpecialEvent;
  gradientColors: [string, string];
  microIcon: LogoSection;
  animationIntensity: "subtle" | "medium" | "full";
}

const BROWSE_VERTICAL_MAP: Record<string, LogoSection> = {
  food: "food",
  grocery: "food",
  restaurant: "food",
  restaurants: "food",
  retail: "commerce",
  shops: "commerce",
  electronics: "commerce",
  gifts: "commerce",
  services: "services",
  healthcare: "services",
  pet_care: "services",
  experiences: "travel",
  utility: "services",
};

const SECTION_ROUTE_MAP: Array<[RegExp, LogoSection]> = [
  [/^\/food/, "food"],
  [/^\/restaurant/, "food"],
  [/^\/dining/, "food"],
  [/^\/grocery/, "food"],
  [/^\/browse\/food/, "food"],
  [/^\/browse\/grocery/, "food"],
  [/^\/browse\/restaurant/, "food"],

  [/^\/taxi/, "taxi"],
  [/^\/ride/, "taxi"],
  [/^\/mobility/, "taxi"],
  [/^\/driver/, "taxi"],
  [/^\/refund\//, "taxi"],

  [/^\/hotel/, "hotel"],
  [/^\/stay/, "hotel"],
  [/^\/accommodation/, "hotel"],
  [/^\/booking/, "hotel"],
  [/^\/travel\/stays/, "hotel"],
  [/^\/travel\/hotel/, "hotel"],
  [/^\/travel\/hotel-checkout/, "hotel"],

  [/^\/marketplace/, "commerce"],
  [/^\/shop/, "commerce"],
  [/^\/store/, "commerce"],
  [/^\/commerce/, "commerce"],
  [/^\/browse\/retail/, "commerce"],
  [/^\/browse\/shops/, "commerce"],
  [/^\/browse\/electronics/, "commerce"],
  [/^\/browse\/gifts/, "commerce"],
  [/^\/pos\//, "commerce"],
  [/^\/merchant\//, "commerce"],
  [/^\/claim-shop\//, "commerce"],
  [/^\/dashboard\/my-shop/, "commerce"],

  [/^\/services/, "services"],
  [/^\/concierge/, "services"],
  [/^\/provider/, "services"],
  [/^\/browse\/services/, "services"],
  [/^\/browse\/healthcare/, "services"],
  [/^\/browse\/utility/, "services"],
  [/^\/dashboard\/service-tracking/, "services"],

  [/^\/travel/, "travel"],
  [/^\/flight/, "travel"],
  [/^\/activities/, "travel"],
  [/^\/browse\/experiences/, "travel"],

  [/^\/property/, "immo"],
  [/^\/properties/, "immo"],
  [/^\/immo/, "immo"],
  [/^\/real-estate/, "immo"],
  [/^\/rental/, "immo"],
  [/^\/seasonal-rental/, "immo"],
  [/^\/long-term/, "immo"],
  [/^\/property-management/, "immo"],
  [/^\/property-owner/, "immo"],
  [/^\/dashboard\/real-estate/, "immo"],
  [/^\/dashboard\/property/, "immo"],
  [/^\/me\/properties/, "immo"],
  [/^\/me\/gestion-immo/, "immo"],
  [/^\/wallet\/property/, "immo"],

  [/^\/orbit/, "orbit"],
  [/^\/chat/, "orbit"],
  [/^\/messages/, "orbit"],
  [/^\/call/, "orbit"],
  [/^\/dashboard\/messages/, "orbit"],
  [/^\/settings\/orbit/, "orbit"],
];

function detectSection(pathname: string): LogoSection {
  const verticalMatch = pathname.match(/^\/browse\/([^/?]+)/);
  if (verticalMatch) {
    const vertical = verticalMatch[1];
    const mapped = BROWSE_VERTICAL_MAP[vertical];
    if (mapped) return mapped;
  }

  for (const [pattern, section] of SECTION_ROUTE_MAP) {
    if (pattern.test(pathname)) return section;
  }
  return "default";
}

function getTimeOfDay(hour?: number): TimeOfDay {
  const h = hour ?? new Date().getHours();
  if (h >= 5 && h < 8) return "dawn";
  if (h >= 8 && h < 18) return "day";
  if (h >= 18 && h < 21) return "dusk";
  return "night";
}

function getSpecialEvent(date?: Date): SpecialEvent {
  const d = date ?? new Date();
  const month = d.getMonth() + 1;
  const day = d.getDate();

  if (month === 1 && day <= 3) return "new_year";
  if (month === 12 && day >= 24) return "christmas";
  if (month === 2 && day >= 12 && day <= 15) return "valentine";

  const year = d.getFullYear();
  const ramadanDates: Record<number, [number, number, number, number]> = {
    2025: [2, 28, 3, 30],
    2026: [2, 17, 3, 19],
    2027: [2, 7, 3, 8],
    2028: [1, 27, 2, 25],
  };
  const rd = ramadanDates[year];
  if (rd) {
    const start = new Date(year, rd[0] - 1, rd[1]);
    const end = new Date(year, rd[2] - 1, rd[3]);
    if (d >= start && d <= end) return "ramadan";
  }

  return null;
}

const TIME_GRADIENTS: Record<TimeOfDay, [string, string]> = {
  dawn: ["hsl(38 85% 55%)", "hsl(168 72% 44%)"],
  day: ["hsl(168 72% 44%)", "hsl(168 78% 32%)"],
  dusk: ["hsl(168 72% 44%)", "hsl(260 60% 50%)"],
  night: ["hsl(168 72% 44%)", "hsl(220 70% 30%)"],
};

function useTimeTick() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const currentHour = now.getHours();
    const nextHour = new Date(now);
    nextHour.setHours(currentHour + 1, 0, 0, 0);
    const msUntilNextHour = nextHour.getTime() - now.getTime();

    const timeout = setTimeout(() => {
      setNow(new Date());
    }, msUntilNextHour);

    return () => clearTimeout(timeout);
  }, [now]);

  return now;
}

export function useDynamicLogo(): DynamicLogoContext {
  const location = useLocation();
  const now = useTimeTick();

  return useMemo(() => {
    const section = detectSection(location.pathname);
    const timeOfDay = getTimeOfDay(now.getHours());
    const specialEvent = getSpecialEvent(now);
    const gradientColors = TIME_GRADIENTS[timeOfDay];

    return {
      section,
      timeOfDay,
      specialEvent,
      gradientColors,
      microIcon: section,
      animationIntensity: specialEvent ? "full" : section !== "default" ? "medium" : "subtle",
    };
  }, [location.pathname, now]);
}

export { getTimeOfDay, getSpecialEvent, TIME_GRADIENTS, detectSection };
