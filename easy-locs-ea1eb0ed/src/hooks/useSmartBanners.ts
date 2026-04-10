/**
 * useSmartBanners — Unified hook for multi-dimensional banner resolution.
 * Combines boost campaigns + context banners with full targeting:
 * geo hierarchy, temporal, weather, taxonomy.
 */
import { useEffect, useState, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  resolveSmartBanners,
  buildTemporalContext,
  type SmartBanner,
  type SmartBannerContext,
  type WeatherContext,
} from "@/lib/boost/smart-banner-orchestrator";

interface UseSmartBannersOptions {
  surface: string;
  country: string;
  city?: string | null;
  zone?: string | null;
  vertical?: string | null;
  subcategory?: string | null;
  locale?: string;
  weather?: WeatherContext | null;
  maxResults?: number;
  enabled?: boolean;
}

export function useSmartBanners(opts: UseSmartBannersOptions) {
  const { user } = useAuth();
  const [banners, setBanners] = useState<SmartBanner[]>([]);
  const [loading, setLoading] = useState(true);
  const resolved = useRef(false);

  useEffect(() => {
    if (resolved.current || opts.enabled === false) return;
    resolved.current = true;

    const temporal = buildTemporalContext();

    const ctx: SmartBannerContext = {
      geo: {
        country: opts.country,
        city: opts.city,
        zone: opts.zone,
      },
      temporal,
      weather: opts.weather ?? null,
      taxonomy: {
        vertical: opts.vertical,
        subcategory: opts.subcategory,
      },
      locale: opts.locale || navigator.language || "en",
      userId: user?.id,
      surface: opts.surface,
    };

    resolveSmartBanners(ctx, opts.maxResults ?? 6)
      .then((results) => {
        setBanners(results);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, [opts.surface, opts.country]);

  return { banners, loading };
}
