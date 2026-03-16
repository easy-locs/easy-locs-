import { useState, useEffect, useRef } from "react";
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
  const contextRef = useRef<string>("");

  useEffect(() => {
    if (!enabled || !context) return;

    const contextKey = JSON.stringify(context);
    // Prevent re-fetching if context hasn't actually changed
    if (contextKey === contextRef.current) return;
    contextRef.current = contextKey;

    const cacheKey = `${type}:${locale}:${contextKey}`;
    if (seoCache.has(cacheKey)) {
      setSeo(seoCache.get(cacheKey)!);
      return;
    }

    let cancelled = false;

    const generate = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase.functions.invoke("generate-seo", {
          body: { type, context, locale },
        });

        if (!error && data?.seo && !cancelled) {
          seoCache.set(cacheKey, data.seo);
          setSeo(data.seo);
        }
      } catch (e) {
        console.error("AI SEO generation failed:", e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    generate();

    return () => { cancelled = true; };
  }, [type, locale, enabled]); // eslint-disable-line react-hooks/exhaustive-deps

  return { seo, loading };
};
