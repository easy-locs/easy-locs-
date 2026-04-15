import { useCallback, useEffect, useRef, useState } from "react";
import { db } from "@/services/db";
import { useAuth } from "@/contexts/AuthContext";
import { createRealtimeChannel, removeRealtimeChannel, createHardenedChannel, removeHardenedChannel, trackRealtimeEvent } from "@/lib/realtime";
import { registerSubscription } from "@/lib/realtime/subscription-registry";
import { platformBus } from "@/lib/shared/platform-bus";
import { APP_EVENTS } from "@/lib/platform/events";
import { invalidateOnMutation, cacheKey } from "@/lib/infrastructure/cache-layer";

export function useMeRealtimeSync() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const prevPrefsRef = useRef<{ currency?: string; theme?: string; language?: string }>({});

  const loadProfile = useCallback(async () => {
    if (!user?.id) {
      setProfile(null);
      setLoading(false);
      return;
    }

    setLoading(true);

    const { data } = await db("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();

    setProfile(data ?? null);
    setLoading(false);

    if (data) {
      const prev = prevPrefsRef.current;
      const currency = data.preferred_currency ?? data.currency;
      const theme = data.theme ?? data.preferred_theme;
      const language = data.preferred_language ?? data.language ?? data.locale;

      if (currency && currency !== prev.currency) {
        platformBus.emit("system:currency_changed", { currency, userId: user.id }, "system");
        prevPrefsRef.current = { ...prevPrefsRef.current, currency };
      }

      if (theme && theme !== prev.theme) {
        platformBus.emit("system:sync_completed", { domain: "theme", theme, userId: user.id }, "system");
        prevPrefsRef.current = { ...prevPrefsRef.current, theme };
      }

      if (language && language !== prev.language) {
        platformBus.emit("system:sync_completed", { domain: "language", language, userId: user.id }, "system");
        prevPrefsRef.current = { ...prevPrefsRef.current, language };
      }
    }
  }, [user?.id]);

  useEffect(() => {
    void loadProfile();

    if (!user?.id) return;

    const channelName = `me-profile:${user.id}`;
    const unsubRegistry = registerSubscription(`me.profile:${user.id}`, () => {
      createHardenedChannel(channelName, "me-realtime-sync", (ch) =>
        ch.on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "identity",
            table: "profiles",
            filter: `id=eq.${user.id}`,
          },
          () => {
            trackRealtimeEvent(channelName);
            invalidateOnMutation("profiles", cacheKey("profile", user.id));
            invalidateOnMutation("profiles", cacheKey("profile-critical", user.id));
            void loadProfile();
          }
        )
      );
      return () => removeHardenedChannel(channelName);
    });

    const unsub1 = platformBus.on(APP_EVENTS.ME_REFRESH, () => {
      void loadProfile();
    });

    const unsub2 = platformBus.on(APP_EVENTS.WALLET_BALANCE_UPDATED, () => {
      void loadProfile();
    });

    const unsub3 = platformBus.on("orbit:profile_updated", () => {
      void loadProfile();
    });

    const unsub4 = platformBus.on(APP_EVENTS.IDENTITY_ACTIVATED, () => {
      void loadProfile();
    });

    const unsub5 = platformBus.on(APP_EVENTS.CONTACTS_SYNCED, () => {
      void loadProfile();
    });

    return () => {
      unsubRegistry();
      unsub1();
      unsub2();
      unsub3();
      unsub4();
      unsub5();
    };
  }, [loadProfile, user?.id]);

  return {
    meProfile: profile,
    meLoading: loading,
    refreshMe: loadProfile,
  };
}
