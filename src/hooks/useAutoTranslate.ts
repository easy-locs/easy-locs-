import { useState, useEffect, useCallback } from "react";
import * as aiRepo from "@/repositories/ai.repository";

/**
 * Automatically translates text content based on the visitor's browser language.
 * Uses the translate-message edge function (AI-powered).
 * Falls back to original text if translation fails.
 */
export function useAutoTranslate(originalText: string | null | undefined, sourceLocale?: string) {
  const [translated, setTranslated] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const browserLang = navigator.language?.split("-")[0] || "en";
  const srcLang = sourceLocale || "en";
  const needsTranslation = !!originalText && browserLang !== srcLang && originalText.length > 2;

  useEffect(() => {
    if (!needsTranslation || !originalText) {
      setTranslated(null);
      return;
    }

    let cancelled = false;
    const doTranslate = async () => {
      setLoading(true);
      try {
        const data = await aiRepo.invokeTranslateMessage({
          text: originalText, from_locale: srcLang, to_locale: browserLang,
        });
        if (!cancelled && data?.translated) {
          setTranslated(data.translated);
        }
      } catch {
        // Silently fail — show original
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    doTranslate();
    return () => { cancelled = true; };
  }, [originalText, browserLang, needsTranslation]);

  return {
    text: translated || originalText || "",
    isTranslated: !!translated,
    loading,
    browserLang,
  };
}

/**
 * Batch translation for multiple fields at once.
 */
export function useAutoTranslateBatch(
  fields: Record<string, string | null | undefined>,
  sourceLocale?: string
) {
  const [translations, setTranslations] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const browserLang = navigator.language?.split("-")[0] || "en";
  const srcLang = sourceLocale || "en";
  const needsTranslation = browserLang !== srcLang;

  useEffect(() => {
    if (!needsTranslation) {
      setTranslations({});
      return;
    }

    const entries = Object.entries(fields).filter(([_, v]) => v && v.length > 2);
    if (entries.length === 0) return;

    let cancelled = false;
    const doTranslate = async () => {
      setLoading(true);
      const results: Record<string, string> = {};

      // Translate fields in parallel (max 3 concurrent)
      const chunks = [];
      for (let i = 0; i < entries.length; i += 3) {
        chunks.push(entries.slice(i, i + 3));
      }

      for (const chunk of chunks) {
        await Promise.all(
          chunk.map(async ([key, text]) => {
            try {
              const data = await aiRepo.invokeTranslateMessage({
                text, from_locale: srcLang, to_locale: browserLang,
              });
              if (!cancelled && data?.translated) {
                results[key] = data.translated;
              }
            } catch { /* ignore */ }
          })
        );
      }

      if (!cancelled) {
        setTranslations(results);
        setLoading(false);
      }
    };

    doTranslate();
    return () => { cancelled = true; };
  }, [JSON.stringify(fields), browserLang, needsTranslation]);

  const get = useCallback(
    (key: string) => translations[key] || fields[key] || "",
    [translations, fields]
  );

  return { get, loading, isTranslated: Object.keys(translations).length > 0, browserLang };
}
