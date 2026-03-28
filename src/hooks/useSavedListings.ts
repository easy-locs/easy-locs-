/**
 * useSavedListings — Saved listings management.
 * MIGRATED: All DB ops via discovery.repository.
 */
import { useState, useEffect, useCallback } from "react";
import * as discoveryRepo from "@/repositories/discovery.repository";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface SavedListing {
  id: string;
  listing_type: string;
  listing_id: string;
  listing_title: string | null;
  listing_image: string | null;
  listing_city: string | null;
  listing_country: string | null;
  listing_price: number | null;
  listing_currency: string | null;
  created_at: string;
}

export function useSavedListings() {
  const { user } = useAuth();
  const [saved, setSaved] = useState<SavedListing[]>([]);
  const [loading, setLoading] = useState(false);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());

  const fetchSaved = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const items = await discoveryRepo.fetchSavedListings(user.id);
    setSaved(items as any as SavedListing[]);
    setSavedIds(new Set((items as any[]).map((i) => `${i.listing_type}:${i.listing_id}`)));
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchSaved(); }, [fetchSaved]);

  const isSaved = useCallback(
    (type: string, id: string) => savedIds.has(`${type}:${id}`),
    [savedIds]
  );

  const toggleSave = useCallback(
    async (params: {
      type: string; id: string; title?: string; image?: string;
      city?: string; country?: string; price?: number; currency?: string;
    }) => {
      if (!user) { toast.error("Please sign in to save listings"); return; }
      const key = `${params.type}:${params.id}`;
      if (savedIds.has(key)) {
        await discoveryRepo.removeSavedListing(user.id, params.type, params.id);
        setSavedIds((prev) => { const next = new Set(prev); next.delete(key); return next; });
        setSaved((prev) => prev.filter((s) => `${s.listing_type}:${s.listing_id}` !== key));
        toast.success("Removed from saved");
      } else {
        await discoveryRepo.insertSavedListing({
          user_id: user.id, listing_type: params.type, listing_id: params.id,
          listing_title: params.title || null, listing_image: params.image || null,
          listing_city: params.city || null, listing_country: params.country || null,
          listing_price: params.price || null, listing_currency: params.currency || "EUR",
        });
        setSavedIds((prev) => new Set(prev).add(key));
        toast.success("Saved!");
        fetchSaved();
      }
    },
    [user, savedIds, fetchSaved]
  );

  return { saved, loading, isSaved, toggleSave, refresh: fetchSaved };
}
