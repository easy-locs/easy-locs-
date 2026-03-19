import { slugify } from "@/lib/growth/helpers";
import type { CitySeoPageInput } from "@/lib/growth/types";

const CITY_TITLES: Record<string, Record<string, string>> = {
  en: {
    food: "Food Delivery",
    hotel: "Hotels",
    retail: "Shops",
    services: "Local Services",
  },
  ar: {
    food: "توصيل الطعام",
    hotel: "الفنادق",
    retail: "المتاجر",
    services: "الخدمات المحلية",
  },
};

export function buildCitySeoContent(input: CitySeoPageInput) {
  const locale = input.locale ?? "en";
  const citySlug = slugify(input.city);
  const verticalLabel = CITY_TITLES[locale]?.[input.vertical] ?? input.vertical;

  const title =
    locale === "ar"
      ? `${verticalLabel} في ${input.city} | Easy-Locs`
      : `${verticalLabel} in ${input.city} | Easy-Locs`;

  const description =
    locale === "ar"
      ? `اكتشف ${verticalLabel} في ${input.city}. اطلب، تتبع، وفعّل المتاجر بسرعة عبر Easy-Locs.`
      : `Discover ${verticalLabel} in ${input.city}. Order, track, and activate local merchants faster with Easy-Locs.`;

  const h1 =
    locale === "ar"
      ? `${verticalLabel} في ${input.city}`
      : `${verticalLabel} in ${input.city}`;

  const intro =
    locale === "ar"
      ? `منصة Easy-Locs تعرض أفضل ${verticalLabel} في ${input.city} مع صفحات متاجر جاهزة للتفعيل الفوري.`
      : `Easy-Locs showcases the best ${verticalLabel} in ${input.city} with ready-to-activate merchant pages.`;

  return {
    slug: `city/${input.countryCode.toLowerCase()}/${citySlug}/${input.vertical}/${locale}`,
    title,
    description,
    h1,
    intro,
    locale,
    citySlug,
  };
}
