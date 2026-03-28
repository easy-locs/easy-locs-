/**
 * usePostalCodeLookup — Atomic: French postal code → city resolver.
 */
import { useState, useCallback } from "react";

export function usePostalCodeLookup() {
  const [suggestions, setSuggestions] = useState<{ city: string; code: string }[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const lookup = useCallback(async (value: string, country: string) => {
    if (country === "FR" && value.length === 5) {
      try {
        const res = await fetch(`https://geo.api.gouv.fr/communes?codePostal=${value}&fields=nom,codesPostaux&limit=10`);
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setSuggestions(data.map((c: any) => ({ city: c.nom, code: value })));
          setShowSuggestions(true);
          return;
        }
      } catch { /* ignore */ }
    }
    setShowSuggestions(false);
  }, []);

  const selectSuggestion = useCallback((city: string) => {
    setShowSuggestions(false);
    return city;
  }, []);

  return { suggestions, showSuggestions, setShowSuggestions, lookup, selectSuggestion };
}
