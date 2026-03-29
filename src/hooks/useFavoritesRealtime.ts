import { useEffect } from "react";
import { createRealtimeChannel, removeRealtimeChannel } from "@/lib/realtime";
import { useV2AuthStore } from "@/stores/v2AuthStore";
import { useFavoritesStore } from "@/stores/favoritesStore";

export function useFavoritesRealtime() {
  const user = useV2AuthStore((s) => s.user);

  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`favorite_listings_${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "favorite_listings",
        },
        async (payload: any) => {
          const row = payload?.new ?? payload?.old;
          if (!row || row.user_id !== user.id) return;
          await useFavoritesStore.getState().hydrate();
        }
      )
      .subscribe();

    return () => {
      void removeRealtimeChannel(channel);
    };
  }, [user?.id]);
}
