/**
 * useShopTranslation — Buyer-side hook to load and apply shop translations.
 * Loads from storefront_translations table, returns translated fields.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface TranslatedShopFields {
  name?: string;
  description?: string;
  tagline?: string;
  [key: string]: string | undefined;
}

function getBrowserLocale(): string {
  const lang = navigator.language?.split("-")[0] || "en";
  return ["en", "fr", "ar", "es", "zh"].includes(lang) ? lang : "en";
}

export function useShopTranslation(shopId: string | undefined) {
  const locale = getBrowserLocale();

  const { data: translations } = useQuery({
    queryKey: ["shop-translations-buyer", shopId, locale],
    queryFn: async () => {
      if (!shopId) return {};
      const { data } = await (supabase as any)
        .from("storefront_translations")
        .select("field_name, field_value")
        .eq("shop_id", shopId)
        .eq("locale", locale);

      if (!data || data.length === 0) return {};

      const map: TranslatedShopFields = {};
      for (const row of data) {
        map[row.field_name] = row.field_value;
      }
      return map;
    },
    enabled: !!shopId,
    staleTime: 5 * 60 * 1000, // Cache 5 min
  });

  /**
   * Returns the translated value if available, otherwise the original.
   * Usage: t("name", shop.name)
   */
  const t = (field: string, fallback?: string): string => {
    return translations?.[field] || fallback || "";
  };

  return { t, locale, translations: translations || {} };
}
