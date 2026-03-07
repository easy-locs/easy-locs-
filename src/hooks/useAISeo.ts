import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface SEOData {
  title?: string;
  description?: string;
  keywords?: string;
  jsonLd?: Record<string, unknown>;
  h1?: string;
  intro?: string;
}

const seoCache = new Map<string, SEOData>();

export const useAISeo = (
  type: "listing" | "catalog" | "country_page" | "host_profile",
  context: Record<string, unknown>,
  locale: string = "en",
  enabled: boolean = true
) => {
  const [seo, setSeo] = useState<SEOData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!enabled || !context) return;

    const cacheKey = `${type}:${locale}:${JSON.stringify(context)}`;
    if (seoCache.has(cacheKey)) {
      setSeo(seoCache.get(cacheKey)!);
      return;
    }

    const generate = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase.functions.invoke("generate-seo", {
          body: { type, context, locale },
        });

        if (!error && data?.seo) {
          seoCache.set(cacheKey, data.seo);
          setSeo(data.seo);
        }
      } catch (e) {
        console.error("AI SEO generation failed:", e);
      } finally {
        setLoading(false);
      }
    };

    generate();
  }, [type, JSON.stringify(context), locale, enabled]);

  return { seo, loading };
};
