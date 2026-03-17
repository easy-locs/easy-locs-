/**
 * OrbitHeader — Top header for Orbit shell.
 * PASS 164: Extracted from OrbitAppShell for maintainability.
 */
import { useNavigate } from "react-router-dom";
import { Bell, Wifi, WifiOff, Search } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useOrbitEngine } from "@/stores/orbit-engine";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export default function OrbitHeader() {
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

      <button
        className="p-2 rounded-xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring min-w-[44px] min-h-[44px] flex items-center justify-center"
        onClick={() => navigate("/explore")}
        aria-label="Search"
        style={{ color: "hsl(var(--hud-text-dim) / 0.5)" }}
      >
        <Search className="w-5 h-5" />
      </button>

      <div className="flex items-center gap-1.5" role="status" aria-label={networkStatus === "online" ? "Online" : "Offline"}>
        <span style={{ color: networkStatus === "online" ? "hsl(var(--hud-success))" : "hsl(var(--hud-danger))" }}>
          {networkStatus === "online" ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
        </span>
        <span
          className="w-[5px] h-[5px] rounded-full"
          aria-label={`Sync: ${syncStatus}`}
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

      <button
        className="relative p-2 rounded-xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring min-w-[44px] min-h-[44px] flex items-center justify-center"
        onClick={() => navigate("/dashboard/settings")}
        aria-label={`Notifications${pendingNotifications > 0 ? ` (${pendingNotifications})` : ""}`}
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
