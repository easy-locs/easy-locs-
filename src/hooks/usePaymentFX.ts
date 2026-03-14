/**
 * usePaymentFX — Live FX conversion hook for Orbit Payments
 */
import { useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { FXPreview } from "@/lib/orbit-payments/types";

export function usePaymentFX() {
  const [preview, setPreview] = useState<FXPreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [allRates, setAllRates] = useState<Record<string, number> | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  /** Fetch all rates (cached) */
  const fetchRates = useCallback(async () => {
    if (allRates) return allRates;
    try {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/fx-rates?action=rates`,
        {
          headers: {
            Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
        }
      );
      if (!res.ok) return null;
      const data = await res.json();
      setAllRates(data.rates);
      return data.rates as Record<string, number>;
    } catch {
      return null;
    }
  }, [allRates]);

  /** Convert amount from currency → LOCS equivalent (debounced) */
  const convert = useCallback(
    (amount: number, currency: string) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (!amount || amount <= 0) {
        setPreview(null);
        return;
      }

      debounceRef.current = setTimeout(async () => {
        setLoading(true);
        try {
          const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
          const res = await fetch(
            `https://${projectId}.supabase.co/functions/v1/fx-rates?action=convert&from=${currency}&amount=${amount}`,
            {
              headers: {
                Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
                apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
              },
            }
          );
          if (!res.ok) throw new Error("FX error");
          const data: FXPreview = await res.json();
          setPreview(data);
        } catch {
          setPreview(null);
        } finally {
          setLoading(false);
        }
      }, 400);
    },
    []
  );

  /** Quick inline conversion (no debounce, uses cached rates) */
  const quickConvert = useCallback(
    (amount: number, from: string, to: string) => {
      if (!allRates || !amount) return null;
      const fromRate = allRates[from] || 1;
      const toRate = allRates[to] || 1;
      return Math.round((amount / fromRate) * toRate * 100) / 100;
    },
    [allRates]
  );

  return { preview, loading, convert, fetchRates, quickConvert, allRates };
}
