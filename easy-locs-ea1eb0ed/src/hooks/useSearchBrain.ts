/**
 * useSearchBrain — React hook consuming Search Brain.
 * Replaces useAddressSearch for all search surfaces.
 * 
 * Search Brain owns search ordering truth.
 * Geo Brain owns location truth.
 * UI owns display only.
 */
import { useState, useEffect, useRef } from "react";
import { searchBrain, type SearchBrainResult, type SearchBrainContext } from "@/lib/search/search-brain";

interface UseSearchBrainOpts {
  debounceMs?: number;
  enabled?: boolean;
  contextType?: string;
  vertical?: string;
}

export function useSearchBrain(query: string, opts?: UseSearchBrainOpts) {
  const [results, setResults] = useState<SearchBrainResult[]>([]);
  const [loading, setLoading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  const enabled = opts?.enabled !== false;
  const debounce = opts?.debounceMs ?? 300;

  useEffect(() => {
    if (!enabled || query.trim().length < 2) {
      setResults([]);
      return;
    }

    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await searchBrain({
          query,
          contextType: opts?.contextType,
          vertical: opts?.vertical,
        });
        setResults(res);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, debounce);

    return () => clearTimeout(timerRef.current);
  }, [query, enabled, debounce, opts?.contextType, opts?.vertical]);

  return { results, loading };
}
