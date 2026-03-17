import { useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useOrbitEngine } from "@/stores/orbit-engine";
import { useOrbitDashboard } from "@/hooks/useOrbitDashboard";
import OrbitOrb from "@/components/orbit/OrbitOrb";
import OrbitQuickCard from "@/components/orbit/OrbitQuickCard";
import OrbitSmartActions from "@/components/orbit/OrbitSmartActions";
import OrbitPermissionsDiag from "@/components/orbit/OrbitPermissionsDiag";
import {
  MessageCircle, Phone, Users, Store, Radar, Wallet,
  Bell, Shield, Lock, Palette,
  ChevronRight, CalendarCheck, ShoppingBag, Building2,
  TrendingUp, CreditCard, Fingerprint, History, Star,
} from "lucide-react";
import OrbitWalletCard from "@/components/orbit/OrbitWalletCard";

/* ══════ Section Header ══════ */
function SectionLabel({ title, badge }: { title: string; badge?: number }) {
  return (
    <div className="flex items-center justify-between mb-2.5 px-0.5">
      <h2
        className="text-[11px] font-bold uppercase tracking-[0.12em]"
        style={{ color: "hsl(var(--hud-text-dim) / 0.7)" }}
      >
        {title}
      </h2>
      {badge != null && badge > 0 && (
        <span
          className="text-[10px] font-bold px-2 py-0.5 rounded-full"
          style={{
            background: "hsl(var(--hud-danger) / 0.12)",
            color: "hsl(var(--hud-danger))",
          }}
        >
          {badge}
        </span>
      )}
    </div>
  );
}

/* ── Priority modules (top row) — communication core ── */
const PRIORITY_CARDS = [
  { icon: MessageCircle, label: "Messages", desc: "Inbox", key: "unreadMessages" as const, to: "/dashboard/communication" },
  { icon: Phone, label: "Appels", desc: "Récents", key: "missedCalls" as const, to: "/dashboard/communication?section=calls" },
  { icon: Bell, label: "Alertes", desc: "Notifs", key: "pendingNotifications" as const, to: "/dashboard/settings?section=notifications" },
  { icon: Users, label: "Contacts", desc: "Réseau", key: "activeContacts" as const, to: "/dashboard/communication?section=contacts" },
];

/* ── Orbit Infrastructure ── */
const ORBIT_INFRA_CARDS = [
  { icon: Wallet, label: "Wallet", desc: "Solde", key: null, to: "/dashboard/wallet" },
  { icon: CreditCard, label: "Paiements", desc: "Envois", key: null, to: "/dashboard/wallet?action=history" },
  { icon: History, label: "Historique", desc: "Activité", key: null, to: "/dashboard/wallet?action=history" },
  { icon: Shield, label: "Sécurité", desc: "2FA", key: null, to: "/dashboard/settings?section=security" },
  { icon: Fingerprint, label: "Identité", desc: "Profil", key: null, to: "/dashboard/settings" },
  { icon: Lock, label: "Privé", desc: "Data", key: null, to: "/dashboard/settings?section=privacy" },
];

/* ── Marketplace Commerce ── */
const MARKETPLACE_CARDS = [
  { icon: Store, label: "Annonces", desc: "Services", key: "activeListings" as const, to: "/dashboard/my-shop" },
  { icon: ShoppingBag, label: "Bookings", desc: "Commandes", key: "pendingOrders" as const, to: "/dashboard/my-shop" },
  { icon: Star, label: "Avis", desc: "Reviews", key: null, to: "/dashboard/my-shop" },
  { icon: TrendingUp, label: "Leads", desc: "Prospects", key: "newLeads" as const, to: "/dashboard/communication" },
];

/* ── Platform Modules ── */
const MODULE_CARDS = [
  { icon: Building2, label: "Gestion", desc: "Immo", key: null, to: "/dashboard/rental", roles: ["landlord"] },
  { icon: CalendarCheck, label: "Saisonnier", desc: "Bookings", key: "pendingBookings" as const, to: "/dashboard/seasonal", roles: ["landlord"] },
  { icon: Radar, label: "Radar", desc: "Nearby", key: "radarNearby" as const, to: "/dashboard/communication?section=nearby" },
  { icon: Palette, label: "Réglages", desc: "Config", key: null, to: "/dashboard/settings" },
];

export default function OrbitHome() {
  const { user, orgId } = useAuth();
  const engine = useOrbitEngine();
  const { smartActions, loading: dashLoading } = useOrbitDashboard();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user?.id) return;
    engine.refresh(user.id, orgId || undefined);
    const interval = setInterval(() => {
      engine.refresh(user.id, orgId || undefined);
    }, 60000);
    return () => clearInterval(interval);
  }, [user?.id, orgId]);

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

  const activityItems = useMemo(() => {
    const items: { icon: string; label: string; value: number; link: string }[] = [];
    if (engine.pendingBookings > 0) items.push({ icon: "📩", label: "Réservations en attente", value: engine.pendingBookings, link: "/dashboard/seasonal" });
    if (engine.pendingOrders > 0) items.push({ icon: "🎯", label: "Commandes marketplace", value: engine.pendingOrders, link: "/dashboard/activities" });
    if (engine.newLeads > 0) items.push({ icon: "🔥", label: "Nouveaux prospects", value: engine.newLeads, link: "/dashboard/communication" });
    if (engine.activeListings > 0) items.push({ icon: "📊", label: "Annonces actives", value: engine.activeListings, link: "/dashboard/my-shop" });
    return items;
  }, [engine.pendingBookings, engine.pendingOrders, engine.newLeads, engine.activeListings]);

  return (
    <div className="flex flex-col items-center px-4 pt-3 pb-10 gap-6 min-h-full">
      {/* ── Orb ── */}
      <OrbitOrb contextMessage={orbMessage} />

      {/* ── Alert Banner ── */}
      {engine.alerts.length > 0 && (
        <button
          onClick={() => engine.alerts[0]?.link && navigate(engine.alerts[0].link)}
          className="w-full max-w-md rounded-2xl px-4 py-3.5 flex items-center gap-3 transition-all active:scale-[0.98]"
          style={{
            background: "linear-gradient(135deg, hsl(var(--hud-surface)), hsl(var(--hud-surface-2)))",
            border: "1px solid hsl(var(--hud-cyan) / 0.18)",
          }}
        >
          <span className="text-xl shrink-0">{engine.alerts[0].icon}</span>
          <div className="flex-1 min-w-0 text-left">
            <p className="text-xs font-bold leading-snug" style={{ color: "hsl(var(--hud-text))" }}>
              {engine.alerts[0].title}
            </p>
            <p className="text-[11px] line-clamp-1" style={{ color: "hsl(var(--hud-text-dim))" }}>
              {engine.alerts[0].message}
            </p>
          </div>
          <ChevronRight className="w-4 h-4 shrink-0" style={{ color: "hsl(var(--hud-cyan))" }} />
        </button>
      )}

      {/* ── Smart Actions ── */}
      <div className="w-full max-w-md">
        <OrbitSmartActions actions={smartActions} loading={dashLoading} />
      </div>

      {/* ── Wallet ── */}
      <div className="w-full max-w-md">
        <SectionLabel title="Wallet" />
        <OrbitWalletCard />
      </div>

      {/* ── Priorités ── */}
      <div className="w-full max-w-md">
        <SectionLabel title="Priorités" badge={totalUrgent || undefined} />
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

      {/* ── Activity Widget ── */}
      {activityItems.length > 0 && (
        <div className="w-full max-w-md">
          <SectionLabel title="Activité" />
          <div
            className="rounded-2xl overflow-hidden divide-y"
            style={{
              background: "hsl(var(--hud-surface))",
              border: "1px solid hsl(var(--hud-border) / 0.1)",
            }}
          >
            {activityItems.slice(0, 4).map((item) => (
              <button
                key={item.label}
                onClick={() => navigate(item.link)}
                className="w-full flex items-center gap-3 px-4 py-3 transition-all active:scale-[0.98]"
              >
                <span className="text-base shrink-0">{item.icon}</span>
                <span className="flex-1 text-left text-[12px] font-medium" style={{ color: "hsl(var(--hud-text))" }}>
                  {item.label}
                </span>
                <span
                  className="text-[11px] font-bold tabular-nums px-2 py-0.5 rounded-full"
                  style={{ background: "hsl(var(--hud-cyan) / 0.1)", color: "hsl(var(--hud-cyan))" }}
                >
                  {item.value}
                </span>
                <ChevronRight className="w-3.5 h-3.5 shrink-0" style={{ color: "hsl(var(--hud-text-dim) / 0.4)" }} />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Orbit Infrastructure ── */}
      <div className="w-full max-w-md">
        <SectionLabel title="Infrastructure" />
        <div className="grid grid-cols-3 gap-2.5">
          {ORBIT_INFRA_CARDS.map((card) => (
            <OrbitQuickCard
              key={card.label}
              icon={card.icon}
              label={card.label}
              description={card.desc}
              to={card.to}
            />
          ))}
        </div>
      </div>

      {/* ── Marketplace ── */}
      <div className="w-full max-w-md">
        <SectionLabel title="Marketplace" />
        <div className="grid grid-cols-4 gap-2.5">
          {MARKETPLACE_CARDS.map((card) => (
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

      {/* ── Modules ── */}
      <div className="w-full max-w-md">
        <SectionLabel title="Modules" />
        <div className="grid grid-cols-4 gap-2.5">
          {MODULE_CARDS.map((card) => (
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

      {/* ── Permissions ── */}
      <div className="w-full max-w-md">
        <OrbitPermissionsDiag />
      </div>

      {/* ── System Status ── */}
      <div
        className="w-full max-w-md flex items-center justify-center gap-6 py-3.5 px-4 rounded-2xl"
        style={{
          background: "hsl(var(--hud-surface) / 0.5)",
          border: "1px solid hsl(var(--hud-border) / 0.06)",
        }}
      >
        {[
          { label: "Chiffrement", ok: engine.encryptionStatus === "active" },
          { label: engine.syncStatus === "synced" ? "Synchronisé" : engine.syncStatus === "syncing" ? "Sync…" : "Erreur", ok: engine.syncStatus === "synced" },
          { label: engine.networkStatus === "online" ? "En ligne" : "Hors ligne", ok: engine.networkStatus === "online" },
        ].map((item) => (
          <div key={item.label} className="flex items-center gap-1.5">
            <span
              className="w-[6px] h-[6px] rounded-full"
              style={{
                background: item.ok ? "hsl(var(--hud-success))" : "hsl(var(--hud-danger))",
                boxShadow: item.ok ? "0 0 6px hsl(var(--hud-success) / 0.5)" : "none",
              }}
            />
            <span className="text-[10px] font-medium" style={{ color: "hsl(var(--hud-text-dim) / 0.6)" }}>
              {item.label}
            </span>
          </div>
        ))}
      </div>

      {/* ── Last sync ── */}
      {engine.lastSyncAt && (
        <p className="text-[9px]" style={{ color: "hsl(var(--hud-text-dim) / 0.4)" }}>
          Sync : {new Date(engine.lastSyncAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
        </p>
      )}
    </div>
  );
}
