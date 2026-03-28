/**
 * useCategorySubscriptions — Category subscription management.
 * MIGRATED: All DB ops via discovery.repository.
 */
import { useState, useEffect, useCallback } from "react";
import * as discoveryRepo from "@/repositories/discovery.repository";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface CategorySubscription {
  id: string;
  category: string;
  notify_email: boolean;
  notify_push: boolean;
  created_at: string;
}

export function useCategorySubscriptions() {
  const { user } = useAuth();
  const [subs, setSubs] = useState<CategorySubscription[]>([]);
  const [loading, setLoading] = useState(false);
  const [subscribedCategories, setSubscribedCategories] = useState<Set<string>>(new Set());

  const fetchSubs = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const items = await discoveryRepo.fetchCategorySubscriptions(user.id);
    setSubs(items as any as CategorySubscription[]);
    setSubscribedCategories(new Set((items as any[]).map((i) => i.category)));
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchSubs(); }, [fetchSubs]);

  const isSubscribed = useCallback(
    (category: string) => subscribedCategories.has(category),
    [subscribedCategories]
  );

  const toggleSubscription = useCallback(
    async (category: string) => {
      if (!user) { toast.error("Please sign in to subscribe to categories"); return; }
      if (subscribedCategories.has(category)) {
        await discoveryRepo.removeCategorySubscription(user.id, category);
        setSubscribedCategories((prev) => { const next = new Set(prev); next.delete(category); return next; });
        setSubs((prev) => prev.filter((s) => s.category !== category));
        toast.success("Unsubscribed from category");
      } else {
        await discoveryRepo.insertCategorySubscription({
          user_id: user.id, category, notify_push: true, notify_email: false,
        });
        setSubscribedCategories((prev) => new Set(prev).add(category));
        toast.success("Subscribed! You'll get notified for new listings");
        fetchSubs();
      }
    },
    [user, subscribedCategories, fetchSubs]
  );

  return { subs, loading, isSubscribed, toggleSubscription, refresh: fetchSubs };
}
