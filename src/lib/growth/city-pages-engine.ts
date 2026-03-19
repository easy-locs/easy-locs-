import { supabase } from "@/integrations/supabase/client";
import { buildCitySeoContent } from "@/lib/growth/city-seo";
import type { CitySeoPageInput } from "@/lib/growth/types";

export async function upsertCitySeoPage(input: CitySeoPageInput) {
  const seo = buildCitySeoContent(input);

  const payload = {
    page_type: "city_vertical",
    slug: seo.slug,
    locale: seo.locale,
    country_code: input.countryCode,
    city: input.city,
    vertical: input.vertical,
    title: seo.title,
    h1: seo.h1,
    description: seo.description,
    intro_text: seo.intro,
    is_published: true,
  };

  const { data, error } = await (supabase as any)
    .from("growth_city_pages")
    .upsert(payload, { onConflict: "slug" })
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function generateCitySeoPack(params: {
  countryCode: string;
  city: string;
  verticals: Array<"food" | "hotel" | "retail" | "services">;
}) {
  const rows = [];
  for (const vertical of params.verticals) {
    rows.push(
      await upsertCitySeoPage({ countryCode: params.countryCode, city: params.city, vertical, locale: "en" })
    );
    rows.push(
      await upsertCitySeoPage({ countryCode: params.countryCode, city: params.city, vertical, locale: "ar" })
    );
  }
  return rows;
}
