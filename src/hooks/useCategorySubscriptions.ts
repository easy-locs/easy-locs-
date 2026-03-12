import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
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
    const { data } = await supabase
      .from("category_subscriptions" as any)
      .select("*")
      .eq("user_id", user.id);
    const items = (data || []) as any as CategorySubscription[];
    setSubs(items);
    setSubscribedCategories(new Set(items.map((i) => i.category)));
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchSubs(); }, [fetchSubs]);

  const isSubscribed = useCallback(
    (category: string) => subscribedCategories.has(category),
    [subscribedCategories]
  );

  const toggleSubscription = useCallback(
    async (category: string) => {
      if (!user) {
        toast.error("Please sign in to subscribe to categories");
        return;
      }
      if (subscribedCategories.has(category)) {
        await supabase
          .from("category_subscriptions" as any)
          .delete()
          .eq("user_id", user.id)
          .eq("category", category);
        setSubscribedCategories((prev) => {
          const next = new Set(prev);
          next.delete(category);
          return next;
        });
        setSubs((prev) => prev.filter((s) => s.category !== category));
        toast.success("Unsubscribed from category");
      } else {
        await supabase.from("category_subscriptions" as any).insert({
          user_id: user.id,
          category,
          notify_push: true,
          notify_email: false,
        } as any);
        setSubscribedCategories((prev) => new Set(prev).add(category));
        toast.success("Subscribed! You'll get notified for new listings");
        fetchSubs();
      }
    },
    [user, subscribedCategories, fetchSubs]
  );

  return { subs, loading, isSubscribed, toggleSubscription, refresh: fetchSubs };
}
