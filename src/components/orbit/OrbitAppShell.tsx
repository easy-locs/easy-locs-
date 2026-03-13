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
  { icon: Home, label: "Orbit", path: "/app/orbit", badge: null as string | null },
  { icon: MessageCircle, label: "Messages", path: "/dashboard/communication", badge: "messages" },
  { icon: Phone, label: "Appels", path: "/dashboard/communication?section=calls", badge: "calls" },
  { icon: Store, label: "Annonces", path: "/dashboard/marketplace", badge: null },
  { icon: User, label: "Profil", path: "/dashboard/settings", badge: null },
] as const;

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
        borderColor: "hsl(var(--hud-border) / 0.15)",
      }}
    >
      <Avatar className="w-8 h-8 shrink-0">
        <AvatarFallback
          className="text-xs font-bold"
          style={{
            background: "hsl(var(--hud-surface-2))",
            color: "hsl(var(--hud-cyan))",
          }}
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

      <button
        className="p-2 rounded-lg transition-colors"
        style={{ color: "hsl(var(--hud-text-dim))" }}
        onClick={() => navigate("/explore")}
      >
        <Search className="w-5 h-5" />
      </button>

      <span style={{ color: networkStatus === "online" ? "hsl(var(--hud-success))" : "hsl(var(--hud-danger))" }}>
        {networkStatus === "online" ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
      </span>

      <span
        className="w-2 h-2 rounded-full"
        style={{
          background:
            syncStatus === "synced"
              ? "hsl(var(--hud-success))"
              : syncStatus === "syncing"
              ? "hsl(var(--hud-warning))"
              : "hsl(var(--hud-danger))",
        }}
      />

      <button
        className="relative p-2 rounded-lg transition-colors"
        style={{ color: "hsl(var(--hud-text-dim))" }}
        onClick={() => navigate("/dashboard/settings")}
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
        borderColor: "hsl(var(--hud-border) / 0.15)",
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
            className="relative flex flex-col items-center justify-center gap-0.5 pt-2 pb-1 px-3 min-w-[56px] active:scale-90 transition-transform"
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
              className="w-5 h-5 transition-colors"
              style={{
                color: isActive ? "hsl(var(--hud-cyan))" : "hsl(var(--hud-text-dim))",
              }}
            />
            <span
              className="text-[10px] font-medium"
              style={{
                color: isActive ? "hsl(var(--hud-cyan))" : "hsl(var(--hud-text-dim))",
              }}
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

  useEffect(() => {
    if (!user?.id) return;
    refresh(user.id, orgId || undefined);
    const interval = setInterval(() => refresh(user.id, orgId || undefined), 30_000);
    return () => clearInterval(interval);
  }, [user?.id, orgId]);

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
    <div
      className="min-h-[100dvh] flex flex-col"
      style={{ background: "hsl(var(--hud-bg))" }}
    >
      <OrbitHeader />
      <main className="flex-1 overflow-y-auto pb-16">
        <Outlet />
      </main>
      <OrbitBottomNav />
    </div>
  );
}
