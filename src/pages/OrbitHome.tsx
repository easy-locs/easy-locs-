import { useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useOrbitEngine } from "@/stores/orbit-engine";
import { useOrbitDashboard } from "@/hooks/useOrbitDashboard";
// useOrbitCallSync removed — centralized in RealtimeHubGuard
import OrbitOrb from "@/components/orbit/OrbitOrb";
import OrbitQuickCard from "@/components/orbit/OrbitQuickCard";
import OrbitSmartActions from "@/components/orbit/OrbitSmartActions";
import OrbitPermissionsDiag from "@/components/orbit/OrbitPermissionsDiag";
import {
  MessageCircle, Phone, Users, Store, Radar, Wallet,
  Bell, Shield, Lock, FileDown, Palette,
  ChevronRight, CalendarCheck, ShoppingBag, Building2,
  TrendingUp, CreditCard, Fingerprint, History, Star,
} from "lucide-react";
import OrbitWalletCard from "@/components/orbit/OrbitWalletCard";

/* ══════ ORBIT = Infrastructure layer ══════ */

/* ── Priority modules (top row) — communication core ── */
const PRIORITY_CARDS = [
  { icon: MessageCircle, label: "Messages", desc: "Conversations", key: "unreadMessages" as const, to: "/dashboard/communication" },
  { icon: Phone, label: "Appels", desc: "Historique", key: "missedCalls" as const, to: "/dashboard/communication?section=calls" },
  { icon: Bell, label: "Alertes", desc: "Notifications", key: "pendingNotifications" as const, to: "/dashboard/settings?section=notifications" },
  { icon: Users, label: "Contacts", desc: "Répertoire", key: "activeContacts" as const, to: "/dashboard/communication?section=contacts" },
];

/* ── Orbit Infrastructure — Wallet, Payments, Security, Identity ── */
const ORBIT_INFRA_CARDS = [
  { icon: Wallet, label: "Wallet", desc: "Solde", key: null, to: "/dashboard/wallet" },
  { icon: CreditCard, label: "Paiements", desc: "Transactions", key: null, to: "/dashboard/wallet?action=history" },
  { icon: History, label: "Historique", desc: "Activité", key: null, to: "/dashboard/wallet?action=history" },
  { icon: Shield, label: "Sécurité", desc: "MFA / 2FA", key: null, to: "/dashboard/settings?section=security" },
  { icon: Fingerprint, label: "Identité", desc: "Profil", key: null, to: "/dashboard/settings" },
  { icon: Lock, label: "Privé", desc: "Données", key: null, to: "/dashboard/settings?section=privacy" },
];

/* ══════ MARKETPLACE = Commerce layer ══════ */

/* ── Marketplace Commerce — Services, Bookings, Listings ── */
const MARKETPLACE_CARDS = [
  { icon: Store, label: "Annonces", desc: "Mes services", key: "activeListings" as const, to: "/dashboard/marketplace" },
  { icon: ShoppingBag, label: "Bookings", desc: "Commandes", key: "pendingOrders" as const, to: "/dashboard/marketplace" },
  { icon: Star, label: "Avis", desc: "Reviews", key: null, to: "/dashboard/marketplace" },
  { icon: TrendingUp, label: "Leads", desc: "Prospects", key: "newLeads" as const, to: "/dashboard/communication" },
];

/* ── Platform Modules — role-aware shortcuts ── */
const MODULE_CARDS = [
  { icon: Building2, label: "Gestion", desc: "Immobilier", key: null, to: "/dashboard/rental", roles: ["landlord"] },
  { icon: CalendarCheck, label: "Saisonnier", desc: "Bookings", key: "pendingBookings" as const, to: "/dashboard/seasonal", roles: ["landlord"] },
  { icon: Radar, label: "Radar", desc: "À proximité", key: "radarNearby" as const, to: "/dashboard/communication?section=nearby" },
  { icon: Palette, label: "Réglages", desc: "Global", key: null, to: "/dashboard/settings" },
];

export default function OrbitHome() {
  const { user, orgId } = useAuth();
  const engine = useOrbitEngine();
  const { smartActions, loading: dashLoading } = useOrbitDashboard();
  useOrbitCallSync();
  const navigate = useNavigate();

  // Initial load + periodic refresh every 60s
  useEffect(() => {
    if (!user?.id) return;
    engine.refresh(user.id, orgId || undefined);
    const interval = setInterval(() => {
      engine.refresh(user.id, orgId || undefined);
    }, 60000);
    return () => clearInterval(interval);
  }, [user?.id, orgId]);

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

  // Activity summary for smart widget
  const activityItems = useMemo(() => {
    const items: { icon: string; label: string; value: number; link: string }[] = [];
    if (engine.pendingBookings > 0) items.push({ icon: "📩", label: "Réservations en attente", value: engine.pendingBookings, link: "/dashboard/seasonal" });
    if (engine.pendingOrders > 0) items.push({ icon: "🎯", label: "Commandes marketplace", value: engine.pendingOrders, link: "/dashboard/activities" });
    if (engine.newLeads > 0) items.push({ icon: "🔥", label: "Nouveaux prospects", value: engine.newLeads, link: "/dashboard/communication" });
    if (engine.activeListings > 0) items.push({ icon: "📊", label: "Annonces actives", value: engine.activeListings, link: "/dashboard/marketplace" });
    return items;
  }, [engine.pendingBookings, engine.pendingOrders, engine.newLeads, engine.activeListings]);

  return (
    <div className="flex flex-col items-center px-4 pt-4 pb-8 gap-5 min-h-full">
      {/* ── Orb Section ── */}
      <div className="animate-fade-in" style={{ animationDelay: "0ms" }}>
        <OrbitOrb contextMessage={orbMessage} />
      </div>

      {/* ── Alert Banner (top priority action) ── */}
      {engine.alerts.length > 0 && (
        <div className="w-full max-w-md animate-fade-in" style={{ animationDelay: "80ms" }}>
          <button
            onClick={() => engine.alerts[0]?.link && navigate(engine.alerts[0].link)}
            className="w-full rounded-2xl px-4 py-3 flex items-center gap-3 transition-all active:scale-[0.98]"
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
              <p className="text-[11px] line-clamp-2 break-words" style={{ color: "hsl(var(--hud-text-dim))" }}>
                {engine.alerts[0].message}
              </p>
            </div>
            <ChevronRight className="w-4 h-4 shrink-0" style={{ color: "hsl(var(--hud-cyan))" }} />
          </button>
        </div>
      )}

      {/* ── Smart Actions (Phase 5) ── */}
      <div className="w-full max-w-md animate-fade-in" style={{ animationDelay: "100ms" }}>
        <OrbitSmartActions actions={smartActions} loading={dashLoading} />
      </div>

      {/* ── Wallet Card (prominently visible) ── */}
      <div className="w-full max-w-md animate-fade-in" style={{ animationDelay: "130ms" }}>
        <h2
          className="text-[11px] font-bold uppercase tracking-widest mb-2 px-1"
          style={{ color: "hsl(var(--hud-text-dim))" }}
        >
          Wallet
        </h2>
        <OrbitWalletCard />
      </div>
      <div className="w-full max-w-md animate-fade-in" style={{ animationDelay: "160ms" }}>
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
        <div className="grid grid-cols-4 gap-2">
          {PRIORITY_CARDS.map((card, i) => (
            <div key={card.label} className="animate-fade-in" style={{ animationDelay: `${150 + i * 50}ms` }}>
              <OrbitQuickCard
                icon={card.icon}
                label={card.label}
                description={card.desc}
                counter={card.key ? (engine[card.key] as number) : undefined}
                status={card.key && (engine[card.key] as number) > 0 ? "active" : "idle"}
                to={card.to}
              />
            </div>
          ))}
        </div>
      </div>

      {/* ── Activity Widget (contextual smart summary) ── */}
      {activityItems.length > 0 && (
        <div className="w-full max-w-md animate-fade-in" style={{ animationDelay: "250ms" }}>
          <h2
            className="text-[11px] font-bold uppercase tracking-widest mb-2 px-1"
            style={{ color: "hsl(var(--hud-text-dim))" }}
          >
            Activité
          </h2>
          <div
            className="rounded-2xl overflow-hidden"
            style={{
              background: "hsl(var(--hud-surface))",
              border: "1px solid hsl(var(--hud-border) / 0.12)",
            }}
          >
            {activityItems.slice(0, 4).map((item) => (
              <button
                key={item.label}
                onClick={() => navigate(item.link)}
                className="w-full flex items-center gap-3 px-4 py-2.5 transition-all active:scale-[0.98]"
                style={{ borderColor: "hsl(var(--hud-border) / 0.08)" }}
              >
                <span className="text-base shrink-0">{item.icon}</span>
                <span className="flex-1 text-left text-[12px] font-medium" style={{ color: "hsl(var(--hud-text))" }}>
                  {item.label}
                </span>
                <span
                  className="text-[12px] font-bold px-2 py-0.5 rounded-full"
                  style={{
                    background: "hsl(var(--hud-cyan) / 0.1)",
                    color: "hsl(var(--hud-cyan))",
                  }}
                >
                  {item.value}
                </span>
                <ChevronRight className="w-3.5 h-3.5 shrink-0" style={{ color: "hsl(var(--hud-text-dim))" }} />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Orbit Infrastructure (Wallet, Payments, Security) ── */}
      <div className="w-full max-w-md animate-fade-in" style={{ animationDelay: "300ms" }}>
        <h2
          className="text-[11px] font-bold uppercase tracking-widest mb-2 px-1"
          style={{ color: "hsl(var(--hud-text-dim))" }}
        >
          Orbit — Infrastructure
        </h2>
        <div className="grid grid-cols-3 gap-2">
          {ORBIT_INFRA_CARDS.map((card, i) => (
            <div key={card.label} className="animate-fade-in" style={{ animationDelay: `${320 + i * 40}ms` }}>
              <OrbitQuickCard
                icon={card.icon}
                label={card.label}
                description={card.desc}
                counter={card.key ? (engine[card.key] as number) : undefined}
                status={card.key && (engine[card.key] as number) > 0 ? "active" : "idle"}
                to={card.to}
              />
            </div>
          ))}
        </div>
      </div>

      {/* ── Marketplace Commerce (Services, Bookings, Reviews) ── */}
      <div className="w-full max-w-md animate-fade-in" style={{ animationDelay: "420ms" }}>
        <h2
          className="text-[11px] font-bold uppercase tracking-widest mb-2 px-1"
          style={{ color: "hsl(var(--hud-text-dim))" }}
        >
          Marketplace — Commerce
        </h2>
        <div className="grid grid-cols-4 gap-2">
          {MARKETPLACE_CARDS.map((card, i) => (
            <div key={card.label} className="animate-fade-in" style={{ animationDelay: `${450 + i * 35}ms` }}>
              <OrbitQuickCard
                icon={card.icon}
                label={card.label}
                description={card.desc ?? undefined}
                counter={card.key ? (engine[card.key] as number) : undefined}
                status={card.key && (engine[card.key] as number) > 0 ? "active" : "idle"}
                to={card.to}
              />
            </div>
          ))}
        </div>
      </div>

      {/* ── Platform Modules ── */}
      <div className="w-full max-w-md animate-fade-in" style={{ animationDelay: "520ms" }}>
        <h2
          className="text-[11px] font-bold uppercase tracking-widest mb-2 px-1"
          style={{ color: "hsl(var(--hud-text-dim))" }}
        >
          Modules
        </h2>
        <div className="grid grid-cols-4 gap-2">
          {MODULE_CARDS.map((card, i) => (
            <div key={card.label} className="animate-fade-in" style={{ animationDelay: `${540 + i * 35}ms` }}>
              <OrbitQuickCard
                icon={card.icon}
                label={card.label}
                description={card.desc}
                counter={card.key ? (engine[card.key] as number) : undefined}
                status={card.key && (engine[card.key] as number) > 0 ? "active" : "idle"}
                to={card.to}
              />
            </div>
          ))}
        </div>
      </div>

      {/* ── Permissions Diagnostic ── */}
      <div className="w-full max-w-md animate-fade-in" style={{ animationDelay: "520ms" }}>
        <OrbitPermissionsDiag />
      </div>

      {/* ── System Status Bar ── */}
      <div
        className="w-full max-w-md flex items-center justify-center gap-5 py-3 px-4 rounded-2xl mt-1 animate-fade-in"
        style={{
          animationDelay: "550ms",
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
