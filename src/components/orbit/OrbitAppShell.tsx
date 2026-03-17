/**
 * OrbitAppShell — Persistent shell for /app/* routes.
 * Includes header, bottom nav, and main content area.
 * Phase 3: Realtime subscriptions for instant signal updates.
 */
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  Home,
  MessageCircle,
  Phone,
  Store,
  User,
  Bell,
  Wifi,
  WifiOff,
  Search,
} from "lucide-react";
import { useOrbitEngine } from "@/stores/orbit-engine";
import { useEffect, useRef, useCallback } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";

const NAV_ITEMS = [
  { icon: Home, label: "Home", path: "/app/orbit", badge: null as string | null },
  { icon: Search, label: "Search", path: "/explore", badge: null },
  { icon: Store, label: "Shops", path: "/dashboard/marketplace", badge: null },
  { icon: MessageCircle, label: "Orders", path: "/dashboard/operations", badge: null },
  { icon: User, label: "Profile", path: "/dashboard/settings", badge: null },
] as const;

function OrbitHeader() {
  const { user } = useAuth();
  const { pendingNotifications, networkStatus, syncStatus } = useOrbitEngine();
  const navigate = useNavigate();
  const displayName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Orbit";

  return (
    <header className="sticky top-0 z-50 flex items-center gap-3 px-4 h-14 border-b bg-hud-bg border-hud-border/15">
      <Avatar className="w-8 h-8 shrink-0">
        <AvatarFallback className="text-xs font-bold bg-hud-surface-2 text-hud-cyan">
          {displayName[0]?.toUpperCase()}
        </AvatarFallback>
      </Avatar>

      <span className="font-semibold text-sm truncate text-hud-text">
        {displayName}
      </span>

      <div className="flex-1" />

      <button
        className="p-2 rounded-lg transition-colors text-hud-text-dim hover:text-hud-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        onClick={() => navigate("/explore")}
        aria-label="Search"
      >
        <Search className="w-5 h-5" />
      </button>

      <span className={networkStatus === "online" ? "text-hud-success" : "text-hud-danger"}>
        {networkStatus === "online" ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
      </span>

      <span
        className={`w-2 h-2 rounded-full ${
          syncStatus === "synced"
            ? "bg-hud-success"
            : syncStatus === "syncing"
            ? "bg-hud-warning"
            : "bg-hud-danger"
        }`}
      />

      <button
        className="relative p-2 rounded-lg transition-colors text-hud-text-dim hover:text-hud-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        onClick={() => navigate("/dashboard/settings")}
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5" />
        {pendingNotifications > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 rounded-full text-[9px] font-bold flex items-center justify-center bg-hud-danger text-white">
            {pendingNotifications > 9 ? "9+" : pendingNotifications}
          </span>
        )}
      </button>
    </header>
  );
}

function OrbitBottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const { unreadMessages, missedCalls } = useOrbitEngine();

  const getCounter = (badge: string | null) => {
    if (badge === "messages") return unreadMessages;
    if (badge === "calls") return missedCalls;
    return 0;
  };

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 flex items-end justify-around border-t bg-hud-bg border-hud-border/15"
      style={{
        paddingBottom: "env(safe-area-inset-bottom, 8px)",
        height: "calc(56px + env(safe-area-inset-bottom, 8px))",
      }}
    >
      {NAV_ITEMS.map(({ icon: Icon, label, path, badge }) => {
        const isActive = location.pathname === path || (label === "Orbit" && location.pathname.startsWith("/app"));
        const counter = getCounter(badge);
        return (
          <button
            key={label}
            onClick={() => navigate(path)}
            className="relative flex flex-col items-center justify-center gap-0.5 pt-2 pb-1 px-3 min-w-[56px] active:scale-90 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg"
          >
            {counter > 0 && (
              <span className="absolute top-0.5 right-1 min-w-[16px] h-4 rounded-full text-[9px] font-bold flex items-center justify-center px-1 bg-hud-danger text-white">
                {counter > 99 ? "99+" : counter}
              </span>
            )}
            <Icon
              className={`w-5 h-5 transition-colors ${isActive ? "text-hud-cyan" : "text-hud-text-dim"}`}
            />
            <span
              className={`text-2xs font-medium ${isActive ? "text-hud-cyan" : "text-hud-text-dim"}`}
            >
              {label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}

export default function OrbitAppShell() {
  const { user, orgId } = useAuth();
  const { refresh } = useOrbitEngine();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced refresh to avoid duplicate calls from multiple realtime events
  const debouncedRefresh = useCallback(() => {
    if (!user?.id) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      refresh(user.id, orgId || undefined);
    }, 1500);
  }, [user?.id, orgId, refresh]);

  // Polling fallback — 60s (reduced from 30s thanks to realtime)
  useEffect(() => {
    if (!user?.id) return;
    refresh(user.id, orgId || undefined);
    const interval = setInterval(() => refresh(user.id, orgId || undefined), 60_000);
    return () => clearInterval(interval);
  }, [user?.id, orgId]);

  // Realtime subscriptions for instant signal updates
  useEffect(() => {
    if (!user?.id) return;

    const channels: ReturnType<typeof supabase.channel>[] = [];

    // Messages — instant unread count
    const msgChannel = supabase
      .channel("orbit-messages")
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "messages",
      }, debouncedRefresh)
      .subscribe();
    channels.push(msgChannel);

    // Notifications — instant badge
    const notifChannel = supabase
      .channel("orbit-notifications")
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "notifications",
        filter: `user_id=eq.${user.id}`,
      }, debouncedRefresh)
      .subscribe();
    channels.push(notifChannel);

    // Booking requests — instant alert
    if (orgId) {
      const bookingChannel = supabase
        .channel("orbit-bookings")
        .on("postgres_changes", {
          event: "INSERT",
          schema: "public",
          table: "booking_requests",
          filter: `org_id=eq.${orgId}`,
        }, debouncedRefresh)
        .subscribe();
      channels.push(bookingChannel);
    }

    return () => {
      channels.forEach((ch) => supabase.removeChannel(ch));
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [user?.id, orgId, debouncedRefresh]);

  // Network status listener
  useEffect(() => {
    const { setNetworkStatus } = useOrbitEngine.getState();
    const onOnline = () => setNetworkStatus("online");
    const onOffline = () => setNetworkStatus("offline");
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    if (!navigator.onLine) setNetworkStatus("offline");
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  return (
    <div className="min-h-[100dvh] flex flex-col bg-hud-bg">
      <OrbitHeader />
      <main className="flex-1 overflow-y-auto pb-16">
        <Outlet />
      </main>
      <OrbitBottomNav />
    </div>
  );
}
