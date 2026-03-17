/**
 * OrbitAppShell — Persistent shell for /app/* routes.
 * PASS156: Refined header, polished bottom nav active states, smoother transitions.
 */
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  Home, MessageCircle, Store, User, Bell, Wifi, WifiOff, Search,
} from "lucide-react";
import { useOrbitEngine } from "@/stores/orbit-engine";
import { useEffect, useRef, useCallback } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";

const NAV_ITEMS = [
  { icon: Home, label: "Home", path: "/app/orbit", badge: null as string | null },
  { icon: Search, label: "Search", path: "/discover", badge: null },
  { icon: Store, label: "Shops", path: "/shops", badge: null },
  { icon: MessageCircle, label: "Orders", path: "/my-orders", badge: null },
  { icon: User, label: "Me", path: "/dashboard/settings", badge: null },
] as const;

/* ═══ Header ═══ */
function OrbitHeader() {
  const { user } = useAuth();
  const { pendingNotifications, networkStatus, syncStatus } = useOrbitEngine();
  const navigate = useNavigate();
  const displayName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Orbit";

  return (
    <header
      className="sticky top-0 z-50 flex items-center gap-3 px-4 h-14 border-b"
      style={{
        background: "hsl(var(--hud-bg))",
        borderColor: "hsl(var(--hud-border) / 0.1)",
      }}
    >
      <Avatar className="w-8 h-8 shrink-0">
        <AvatarFallback
          className="text-xs font-bold"
          style={{ background: "hsl(var(--hud-surface-2))", color: "hsl(var(--hud-cyan))" }}
        >
          {displayName[0]?.toUpperCase()}
        </AvatarFallback>
      </Avatar>

      <span
        className="font-semibold text-sm truncate"
        style={{ color: "hsl(var(--hud-text))" }}
      >
        {displayName}
      </span>

      <div className="flex-1" />

      {/* Search */}
      <button
        className="p-2 rounded-xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        onClick={() => navigate("/explore")}
        aria-label="Search"
        style={{ color: "hsl(var(--hud-text-dim) / 0.5)" }}
      >
        <Search className="w-5 h-5" />
      </button>

      {/* Network + Sync */}
      <div className="flex items-center gap-1.5">
        <span style={{ color: networkStatus === "online" ? "hsl(var(--hud-success))" : "hsl(var(--hud-danger))" }}>
          {networkStatus === "online" ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
        </span>
        <span
          className="w-[5px] h-[5px] rounded-full"
          style={{
            background:
              syncStatus === "synced"
                ? "hsl(var(--hud-success))"
                : syncStatus === "syncing"
                ? "hsl(var(--hud-warning))"
                : "hsl(var(--hud-danger))",
          }}
        />
      </div>

      {/* Notifications */}
      <button
        className="relative p-2 rounded-xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        onClick={() => navigate("/dashboard/settings")}
        aria-label="Notifications"
        style={{ color: "hsl(var(--hud-text-dim) / 0.5)" }}
      >
        <Bell className="w-5 h-5" />
        {pendingNotifications > 0 && (
          <span
            className="absolute top-1 right-1 w-4 h-4 rounded-full text-[9px] font-bold flex items-center justify-center"
            style={{ background: "hsl(var(--hud-danger))", color: "#fff" }}
          >
            {pendingNotifications > 9 ? "9+" : pendingNotifications}
          </span>
        )}
      </button>
    </header>
  );
}

/* ═══ Bottom Nav ═══ */
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
      className="fixed bottom-0 left-0 right-0 z-50 flex items-end justify-around border-t"
      style={{
        background: "hsl(var(--hud-bg))",
        borderColor: "hsl(var(--hud-border) / 0.08)",
        paddingBottom: "env(safe-area-inset-bottom, 8px)",
        height: "calc(56px + env(safe-area-inset-bottom, 8px))",
      }}
    >
      {NAV_ITEMS.map(({ icon: Icon, label, path, badge }) => {
        const isActive =
          location.pathname === path ||
          (label === "Home" && location.pathname.startsWith("/app")) ||
          (label === "Orders" && location.pathname.startsWith("/my-orders")) ||
          (label === "Shops" && location.pathname.startsWith("/shops")) ||
          (label === "Search" && location.pathname.startsWith("/discover")) ||
          (label === "Me" && location.pathname.startsWith("/dashboard/settings"));
        const counter = getCounter(badge);
        return (
          <button
            key={label}
            onClick={() => navigate(path)}
            className="relative flex flex-col items-center justify-center gap-0.5 pt-2 pb-1 px-3 min-w-[56px] active:scale-90 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg"
          >
            {counter > 0 && (
              <span
                className="absolute top-0.5 right-1 min-w-[16px] h-4 rounded-full text-[9px] font-bold flex items-center justify-center px-1"
                style={{ background: "hsl(var(--hud-danger))", color: "#fff" }}
              >
                {counter > 99 ? "99+" : counter}
              </span>
            )}
            <Icon
              className="w-5 h-5 transition-colors duration-150"
              strokeWidth={isActive ? 2.5 : 1.8}
              style={{
                color: isActive ? "hsl(var(--hud-cyan))" : "hsl(var(--hud-text-dim) / 0.45)",
              }}
            />
            <span
              className="text-[10px] transition-colors duration-150"
              style={{
                color: isActive ? "hsl(var(--hud-cyan))" : "hsl(var(--hud-text-dim) / 0.45)",
                fontWeight: isActive ? 700 : 500,
              }}
            >
              {label}
            </span>
            {/* Active indicator dot */}
            {isActive && (
              <span
                className="absolute -bottom-0.5 w-4 h-[2px] rounded-full"
                style={{ background: "hsl(var(--hud-cyan))", boxShadow: "0 0 6px hsl(var(--hud-cyan) / 0.4)" }}
              />
            )}
          </button>
        );
      })}
    </nav>
  );
}

/* ═══ Shell ═══ */
export default function OrbitAppShell() {
  const { user, orgId } = useAuth();
  const { refresh } = useOrbitEngine();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const debouncedRefresh = useCallback(() => {
    if (!user?.id) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      refresh(user.id, orgId || undefined);
    }, 1500);
  }, [user?.id, orgId, refresh]);

  // Polling fallback — 60s
  useEffect(() => {
    if (!user?.id) return;
    refresh(user.id, orgId || undefined);
    const interval = setInterval(() => refresh(user.id, orgId || undefined), 60_000);
    return () => clearInterval(interval);
  }, [user?.id, orgId]);

  // Realtime subscriptions
  useEffect(() => {
    if (!user?.id) return;
    const channels: ReturnType<typeof supabase.channel>[] = [];

    const msgChannel = supabase
      .channel("orbit-messages")
      .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, debouncedRefresh)
      .subscribe();
    channels.push(msgChannel);

    const notifChannel = supabase
      .channel("orbit-notifications")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` }, debouncedRefresh)
      .subscribe();
    channels.push(notifChannel);

    if (orgId) {
      const bookingChannel = supabase
        .channel("orbit-bookings")
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "booking_requests", filter: `org_id=eq.${orgId}` }, debouncedRefresh)
        .subscribe();
      channels.push(bookingChannel);
    }

    return () => {
      channels.forEach((ch) => supabase.removeChannel(ch));
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [user?.id, orgId, debouncedRefresh]);

  // Network status
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
    <div className="min-h-[100dvh] flex flex-col" style={{ background: "hsl(var(--hud-bg))" }}>
      <OrbitHeader />
      <main className="flex-1 overflow-y-auto pb-16">
        <Outlet />
      </main>
      <OrbitBottomNav />
    </div>
  );
}
