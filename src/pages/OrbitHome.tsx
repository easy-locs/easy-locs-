import { useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useOrbitEngine } from "@/stores/orbit-engine";
import OrbitOrb from "@/components/orbit/OrbitOrb";
import OrbitQuickCard from "@/components/orbit/OrbitQuickCard";
import {
  MessageCircle, Phone, Users, Store, Radar, Wallet,
  Bell, Shield, Smartphone, CloudUpload, BarChart3, Palette,
  ChevronRight,
} from "lucide-react";

/* ── Priority modules (top row, larger) ── */
const PRIORITY_CARDS = [
  { icon: MessageCircle, label: "Messages", desc: "Conversations", key: "unreadMessages" as const, to: "/dashboard/communication" },
  { icon: Phone, label: "Appels", desc: "Historique", key: "missedCalls" as const, to: "/dashboard/communication?section=calls" },
  { icon: Bell, label: "Notifications", desc: "Alertes", key: "pendingNotifications" as const, to: "/dashboard/settings" },
  { icon: Store, label: "Annonces", desc: "Marketplace", key: "activeListings" as const, to: "/dashboard/marketplace" },
];

/* ── Secondary modules ── */
const SECONDARY_CARDS = [
  { icon: Users, label: "Contacts", desc: "Répertoire", key: "activeContacts" as const, to: "/dashboard/communication?section=contacts" },
  { icon: Radar, label: "Radar", desc: "À proximité", key: "radarNearby" as const, to: "/dashboard/communication?section=nearby" },
  { icon: Wallet, label: "Paiements", desc: "Finances", key: null, to: "/dashboard/finances" },
  { icon: Shield, label: "Confidentialité", desc: null, key: null, to: "/dashboard/settings?section=privacy" },
  { icon: Smartphone, label: "Appareils", desc: null, key: null, to: "/dashboard/settings?section=security" },
  { icon: CloudUpload, label: "Sauvegarde", desc: null, key: null, to: "/dashboard/settings?section=data" },
  { icon: BarChart3, label: "Données", desc: null, key: null, to: "/dashboard/settings?section=data" },
  { icon: Palette, label: "Apparence", desc: null, key: null, to: "/dashboard/settings?section=branding" },
];

export default function OrbitHome() {
  const { user, orgId } = useAuth();
  const engine = useOrbitEngine();
  const navigate = useNavigate();

  useEffect(() => {
    if (user?.id) engine.refresh(user.id, orgId || undefined);
  }, [user?.id]);

  // Smart contextual message for the Orb
  const orbMessage = useMemo(() => {
    if (engine.syncStatus === "syncing") return "Synchronisation en cours…";
    if (engine.syncStatus === "error") return "Erreur de synchronisation";
    if (engine.networkStatus === "offline") return "Hors ligne — données locales";
    if (engine.alerts.length > 0) return engine.alerts[0].message;
    if (engine.activeListings > 0)
      return `${engine.activeListings} annonce${engine.activeListings > 1 ? "s" : ""} active${engine.activeListings > 1 ? "s" : ""}`;
    return "Tout est en ordre ✨";
  }, [engine.alerts, engine.syncStatus, engine.networkStatus, engine.activeListings]);

  const totalUrgent = engine.unreadMessages + engine.missedCalls + engine.pendingBookings + engine.newLeads;

  return (
    <div className="flex flex-col items-center px-4 pt-4 pb-8 gap-5 min-h-full">
      {/* ── Orb Section ── */}
      <div className="animate-fade-in" style={{ animationDelay: "0ms" }}>
        <OrbitOrb contextMessage={orbMessage} />
      </div>

      {/* ── Alert Banner (top priority action) ── */}
      {engine.alerts.length > 0 && (
        <button
          onClick={() => engine.alerts[0]?.link && navigate(engine.alerts[0].link)}
          className="w-full max-w-md rounded-2xl px-4 py-3 flex items-center gap-3 transition-all active:scale-[0.98]"
          style={{
            background: "linear-gradient(135deg, hsl(var(--hud-surface)), hsl(var(--hud-surface-2)))",
            border: "1px solid hsl(var(--hud-cyan) / 0.2)",
          }}
        >
          <span className="text-xl shrink-0">{engine.alerts[0].icon}</span>
          <div className="flex-1 min-w-0 text-left">
            <p className="text-xs font-bold" style={{ color: "hsl(var(--hud-text))" }}>
              {engine.alerts[0].title}
            </p>
            <p className="text-[11px] truncate" style={{ color: "hsl(var(--hud-text-dim))" }}>
              {engine.alerts[0].message}
            </p>
          </div>
          <ChevronRight className="w-4 h-4 shrink-0" style={{ color: "hsl(var(--hud-cyan))" }} />
        </button>
      )}

      {/* ── Priority Section ── */}
      <div className="w-full max-w-md">
        <div className="flex items-center justify-between mb-2 px-1">
          <h2
            className="text-[11px] font-bold uppercase tracking-widest"
            style={{ color: "hsl(var(--hud-text-dim))" }}
          >
            Priorités
          </h2>
          {totalUrgent > 0 && (
            <span
              className="text-[10px] font-bold px-2 py-0.5 rounded-full"
              style={{
                background: "hsl(var(--hud-danger) / 0.15)",
                color: "hsl(var(--hud-danger))",
              }}
            >
              {totalUrgent} action{totalUrgent > 1 ? "s" : ""}
            </span>
          )}
        </div>
        <div className="grid grid-cols-4 gap-2.5">
          {PRIORITY_CARDS.map((card) => (
            <OrbitQuickCard
              key={card.label}
              icon={card.icon}
              label={card.label}
              description={card.desc}
              counter={card.key ? (engine[card.key] as number) : undefined}
              status={card.key && (engine[card.key] as number) > 0 ? "active" : "idle"}
              to={card.to}
            />
          ))}
        </div>
      </div>

      {/* ── Secondary Section ── */}
      <div className="w-full max-w-md">
        <h2
          className="text-[11px] font-bold uppercase tracking-widest mb-2 px-1"
          style={{ color: "hsl(var(--hud-text-dim))" }}
        >
          Modules
        </h2>
        <div className="grid grid-cols-4 gap-2.5">
          {SECONDARY_CARDS.map((card) => (
            <OrbitQuickCard
              key={card.label}
              icon={card.icon}
              label={card.label}
              description={card.desc ?? undefined}
              counter={card.key ? (engine[card.key] as number) : undefined}
              status={card.key && (engine[card.key] as number) > 0 ? "active" : "idle"}
              to={card.to}
            />
          ))}
        </div>
      </div>

      {/* ── System Status Bar ── */}
      <div
        className="w-full max-w-md flex items-center justify-center gap-5 py-3 px-4 rounded-2xl mt-1"
        style={{
          background: "hsl(var(--hud-surface) / 0.6)",
          border: "1px solid hsl(var(--hud-border) / 0.08)",
        }}
      >
        {[
          {
            label: "Chiffrement",
            ok: engine.encryptionStatus === "active",
          },
          {
            label: engine.syncStatus === "synced" ? "Synchronisé" : engine.syncStatus === "syncing" ? "Sync…" : "Erreur sync",
            ok: engine.syncStatus === "synced",
          },
          {
            label: engine.networkStatus === "online" ? "En ligne" : "Hors ligne",
            ok: engine.networkStatus === "online",
          },
        ].map((item) => (
          <div key={item.label} className="flex items-center gap-1.5">
            <span
              className="w-[6px] h-[6px] rounded-full"
              style={{
                background: item.ok ? "hsl(var(--hud-success))" : "hsl(var(--hud-danger))",
                boxShadow: item.ok ? "0 0 6px hsl(var(--hud-success) / 0.5)" : "none",
              }}
            />
            <span className="text-[10px] font-medium" style={{ color: "hsl(var(--hud-text-dim))" }}>
              {item.label}
            </span>
          </div>
        ))}
      </div>

      {/* ── Last sync indicator ── */}
      {engine.lastSyncAt && (
        <p className="text-[9px]" style={{ color: "hsl(var(--hud-text-dim) / 0.6)" }}>
          Dernière sync : {new Date(engine.lastSyncAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
        </p>
      )}
    </div>
  );
}
