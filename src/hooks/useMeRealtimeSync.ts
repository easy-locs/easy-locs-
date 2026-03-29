import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { createRealtimeChannel, removeRealtimeChannel } from "@/lib/realtime";
import { platformBus } from "@/lib/shared/platform-bus";
import { APP_EVENTS } from "@/lib/platform/events";

export function useMeRealtimeSync() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async () => {
    if (!user?.id) {
      setProfile(null);
      setLoading(false);
      return;
    }

    setLoading(true);

    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();

    setProfile(data ?? null);
    setLoading(false);
  }, [user?.id]);

  useEffect(() => {
    void loadProfile();

    if (!user?.id) return;

    const channel = supabase
      .channel(`me-profile:${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "profiles",
          filter: `id=eq.${user.id}`,
        },
        () => void loadProfile()
      )
      .subscribe();

    const unsub1 = platformBus.on(APP_EVENTS.ME_REFRESH, () => {
      void loadProfile();
    });

    const unsub2 = platformBus.on(APP_EVENTS.WALLET_BALANCE_UPDATED, () => {
      void loadProfile();
    });

    return () => {
      removeRealtimeChannel(channel);
      unsub1();
      unsub2();
    };
  }, [loadProfile, user?.id]);

  return {
    meProfile: profile,
    meLoading: loading,
    refreshMe: loadProfile,
  };
}
