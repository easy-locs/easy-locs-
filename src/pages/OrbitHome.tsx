/**
 * OrbitHome — The central control center of the entire platform.
 * Fullscreen dashboard with animated Orb and quick-access module cards.
 */
import { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useOrbitEngine } from "@/stores/orbit-engine";
import OrbitOrb from "@/components/orbit/OrbitOrb";
import OrbitQuickCard from "@/components/orbit/OrbitQuickCard";
import {
  MessageCircle,
  Phone,
  Users,
  Store,
  Radar,
  Wallet,
  Bell,
  Shield,
  Smartphone,
  CloudUpload,
  BarChart3,
  Palette,
} from "lucide-react";

const MODULE_CARDS = [
  {
    icon: MessageCircle,
    label: "Messages",
    key: "unreadMessages" as const,
    to: "/dashboard/communication",
    status: "active" as const,
  },
  {
    icon: Phone,
    label: "Calls",
    key: "missedCalls" as const,
    to: "/dashboard/communication",
    status: "active" as const,
  },
  {
    icon: Users,
    label: "Contacts",
    key: "activeContacts" as const,
    to: "/dashboard/communication",
    status: "idle" as const,
  },
  {
    icon: Store,
    label: "Listings",
    key: "activeListings" as const,
    to: "/dashboard/marketplace",
    status: "active" as const,
  },
  {
    icon: Radar,
    label: "Radar",
    key: "radarNearby" as const,
    to: "/dashboard/communication",
    status: "idle" as const,
  },
  {
    icon: Wallet,
    label: "Wallet",
    key: "walletBalance" as const,
    to: "/dashboard/finances",
    status: "idle" as const,
  },
  {
    icon: Bell,
    label: "Notifications",
    key: "pendingNotifications" as const,
    to: "/dashboard/settings",
    status: "active" as const,
  },
  {
    icon: Shield,
    label: "Privacy",
    key: null,
    to: "/dashboard/settings",
    status: "idle" as const,
  },
  {
    icon: Smartphone,
    label: "Devices",
    key: null,
    to: "/dashboard/settings",
    status: "idle" as const,
  },
  {
    icon: CloudUpload,
    label: "Backup",
    key: null,
    to: "/dashboard/settings",
    status: "idle" as const,
  },
  {
    icon: BarChart3,
    label: "Data Usage",
    key: null,
    to: "/dashboard/settings",
    status: "idle" as const,
  },
  {
    icon: Palette,
    label: "Appearance",
    key: null,
    to: "/dashboard/settings",
    status: "idle" as const,
  },
];

export default function OrbitHome() {
  const { user, profile } = useAuth();
  const engine = useOrbitEngine();

  useEffect(() => {
    if (user?.id) {
      engine.refresh(user.id, (profile as any)?.org_id);
    }
  }, [user?.id]);

  // Build contextual message for Orb
  const orbMessage = engine.alerts.length > 0
    ? engine.alerts[0].message
    : engine.syncStatus === "syncing"
    ? "Synchronizing..."
    : "All systems operational ✨";

  return (
    <div className="flex flex-col items-center px-4 py-6 gap-6 animate-fade-in">
      {/* Hero: Animated Orb */}
      <OrbitOrb contextMessage={orbMessage} />

      {/* Alert banner (top priority) */}
      {engine.alerts.length > 1 && (
        <div
          className="w-full max-w-md rounded-xl px-4 py-3 flex items-center gap-3"
          style={{
            background: "hsl(var(--hud-surface))",
            borderLeft: "3px solid hsl(var(--hud-cyan))",
          }}
        >
          <span className="text-lg">{engine.alerts[1]?.icon}</span>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold" style={{ color: "hsl(var(--hud-text))" }}>
              {engine.alerts[1]?.title}
            </p>
            <p className="text-[11px]" style={{ color: "hsl(var(--hud-text-dim))" }}>
              {engine.alerts[1]?.message}
            </p>
          </div>
        </div>
      )}

      {/* Quick Access Grid */}
      <div className="w-full max-w-md">
        <h2
          className="text-xs font-bold uppercase tracking-wider mb-3 px-1"
          style={{ color: "hsl(var(--hud-text-dim))" }}
        >
          Quick Access
        </h2>
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
          {MODULE_CARDS.map((card) => (
            <OrbitQuickCard
              key={card.label}
              icon={card.icon}
              label={card.label}
              counter={card.key ? (engine[card.key] as number) : undefined}
              status={
                card.key && (engine[card.key] as number) > 0
                  ? "active"
                  : card.status
              }
              to={card.to}
            />
          ))}
        </div>
      </div>

      {/* System status footer */}
      <div className="flex items-center gap-4 mt-4">
        <div className="flex items-center gap-1.5">
          <span
            className="w-2 h-2 rounded-full"
            style={{
              background:
                engine.encryptionStatus === "active"
                  ? "hsl(var(--hud-success))"
                  : "hsl(var(--hud-warning))",
            }}
          />
          <span className="text-[10px]" style={{ color: "hsl(var(--hud-text-dim))" }}>
            E2E Encryption
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span
            className="w-2 h-2 rounded-full"
            style={{
              background:
                engine.syncStatus === "synced"
                  ? "hsl(var(--hud-success))"
                  : "hsl(var(--hud-warning))",
            }}
          />
          <span className="text-[10px]" style={{ color: "hsl(var(--hud-text-dim))" }}>
            {engine.syncStatus === "synced"
              ? "Synced"
              : engine.syncStatus === "syncing"
              ? "Syncing..."
              : "Sync error"}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span
            className="w-2 h-2 rounded-full"
            style={{
              background:
                engine.networkStatus === "online"
                  ? "hsl(var(--hud-success))"
                  : "hsl(var(--hud-danger))",
            }}
          />
          <span className="text-[10px]" style={{ color: "hsl(var(--hud-text-dim))" }}>
            {engine.networkStatus === "online" ? "Online" : "Offline"}
          </span>
        </div>
      </div>
    </div>
  );
}
