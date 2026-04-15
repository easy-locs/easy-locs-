import { useState, useEffect, useCallback } from "react";
import { checkAllProviders, getCachedProviderHealth } from "@/lib/auth/provider-health";

export interface AuthProvidersState {
  phone: boolean;
  whatsapp: boolean;
  google: boolean;
  apple: boolean;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useAuthProviders(): AuthProvidersState {
  const cached = getCachedProviderHealth();
  const [phone, setPhone] = useState(cached?.phone ?? false);
  const [whatsapp, setWhatsapp] = useState(cached?.whatsapp ?? false);
  const [google, setGoogle] = useState(cached?.google ?? false);
  const [apple, setApple] = useState(cached?.apple ?? false);
  const [loading, setLoading] = useState(!cached);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await checkAllProviders(true);
      setPhone(result.phone);
      setWhatsapp(result.whatsapp);
      setGoogle(result.google);
      setApple(result.apple);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Provider check failed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    const timer = setTimeout(async () => {
      try {
        const result = await checkAllProviders();
        if (!mounted) return;
        setPhone(result.phone);
        setWhatsapp(result.whatsapp);
        setGoogle(result.google);
        setApple(result.apple);
      } catch (err) {
        if (!mounted) return;
        setError(err instanceof Error ? err.message : "Provider check failed");
      } finally {
        if (mounted) setLoading(false);
      }
    }, 300);

    return () => {
      mounted = false;
      clearTimeout(timer);
    };
  }, []);

  return { phone, whatsapp, google, apple, loading, error, refresh };
}
