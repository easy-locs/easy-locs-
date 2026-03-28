/**
 * usePublicServiceBookingData — Extracted data loading for PublicServiceBooking.
 * Loads service from concierge or marketplace tables by slug.
 */
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export function usePublicServiceBookingData(slug: string | undefined) {
  const [service, setService] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      if (!slug) { if (mounted) setLoading(false); return; }
      const normalizedSlug = decodeURIComponent(slug).trim();

      // Try concierge exact match
      const { data: exactMatch } = await supabase
        .from("concierge_services_public" as any).select("*")
        .eq("booking_slug", normalizedSlug).order("updated_at", { ascending: false }).limit(1).maybeSingle();
      let resolved: any = exactMatch ? { ...(exactMatch as any), _source: "concierge" } : null;

      // Try concierge ilike
      if (!resolved) {
        const { data: fallback } = await supabase
          .from("concierge_services_public" as any).select("*")
          .ilike("booking_slug", normalizedSlug).order("updated_at", { ascending: false }).limit(1).maybeSingle();
        if (fallback) resolved = { ...(fallback as any), _source: "concierge" };
      }

      // Try marketplace exact
      if (!resolved) {
        const { data: mpExact } = await supabase
          .from("marketplace_services_public" as any).select("*")
          .eq("booking_slug", normalizedSlug).limit(1).maybeSingle();
        if (mpExact) resolved = { ...(mpExact as any), _source: "marketplace" };
      }

      // Try marketplace ilike
      if (!resolved) {
        const { data: mpFallback } = await supabase
          .from("marketplace_services_public" as any).select("*")
          .ilike("booking_slug", normalizedSlug).limit(1).maybeSingle();
        if (mpFallback) resolved = { ...(mpFallback as any), _source: "marketplace" };
      }

      if (!mounted) return;
      setService(resolved ?? null);
      setLoading(false);
    };
    load();
    return () => { mounted = false; };
  }, [slug]);

  const photos: string[] = service
    ? (Array.isArray(service.photo_urls) ? service.photo_urls : service.photo_url ? [service.photo_url] : [])
    : [];

  return { service, loading, photos };
}
