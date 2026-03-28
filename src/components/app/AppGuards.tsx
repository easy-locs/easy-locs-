/**
 * AppGuards — Extracted inline guard components from App.tsx.
 * Single responsibility: boot-time session/realtime/notification wiring.
 */
import { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useOrbitSessionInit } from "@/hooks/useOrbitSessionInit";
import { useRealtimeHub } from "@/hooks/useRealtimeHub";
import { useAppHealthCheck } from "@/hooks/useAppHealthCheck";
import { SystemHealthBanner } from "@/components/system/SystemHealthBanner";
import { useNotificationV2Store } from "@/stores/notificationV2Store";

/** Registers device session + suspicious login detection */
export const OrbitSessionGuard = () => { useOrbitSessionInit(); return null; };

/** Centralized realtime: replaces usePresence, useOrbitCallSync, RealtimeMessageToast */
export const RealtimeHubGuard = () => { useRealtimeHub(); return null; };

/** Canonical notification realtime — starts listener for current user */
export const NotificationsRealtimeGuard = () => {
  const { user } = useAuth();
  useEffect(() => {
    if (!user?.id) return;
    const store = useNotificationV2Store.getState();
    store.hydrate(user.id);
    store.startRealtime(user.id);
    return () => store.stopRealtime();
  }, [user?.id]);
  return null;
};

/** System health check banner */
export const AppHealthGuard = () => {
  const health = useAppHealthCheck();
  return <SystemHealthBanner db={health.db} auth={health.auth} realtime={health.realtime} checked={health.checked} />;
};
