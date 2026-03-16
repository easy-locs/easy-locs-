/**
 * DeliveryNotificationHub — LLL. Notification Center.
 * Unified inbox: category filters, read/unread, quick actions, full history.
 * PASS99-LLL
 */
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bell, BellOff, Check, CheckCheck, Trash2, Filter,
  Package, Truck, AlertTriangle, CreditCard, Star,
  MessageCircle, Clock, ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { haptic } from "@/lib/haptics";

type Category = "all" | "mission" | "payment" | "alert" | "system" | "message";

interface Notification {
  id: string;
  category: Category;
  title: string;
  message: string;
  time: Date;
  read: boolean;
  actionLabel?: string;
  actionDone?: boolean;
  icon: string;
  priority: "low" | "normal" | "high" | "urgent";
}

const MOCK_NOTIFICATIONS: Notification[] = [
  { id: "n1", category: "mission", title: "Nouvelle mission assignée", message: "Livraison #2847 → Dakar Centre, 2.3 km", time: new Date(Date.now() - 60000), read: false, actionLabel: "Voir", icon: "📩", priority: "high" },
  { id: "n2", category: "payment", title: "Paiement reçu", message: "1 500 FCFA crédités pour livraison #2845", time: new Date(Date.now() - 300000), read: false, actionLabel: "Détails", icon: "💰", priority: "normal" },
  { id: "n3", category: "alert", title: "SLA en danger", message: "Zone Médina : taux SLA à 87% (seuil : 90%)", time: new Date(Date.now() - 600000), read: false, icon: "🚨", priority: "urgent" },
  { id: "n4", category: "mission", title: "Mission terminée", message: "Livraison #2845 confirmée par le client ⭐ 4.8", time: new Date(Date.now() - 1800000), read: true, icon: "✅", priority: "normal" },
  { id: "n5", category: "system", title: "Mise à jour disponible", message: "Nouvelle version de l'app disponible (v3.2.1)", time: new Date(Date.now() - 3600000), read: true, icon: "🔄", priority: "low" },
  { id: "n6", category: "message", title: "Nouveau message", message: "Mamadou K. : \"Je suis en route, 5 min\"", time: new Date(Date.now() - 900000), read: false, actionLabel: "Répondre", icon: "💬", priority: "normal" },
  { id: "n7", category: "alert", title: "Livreur hors ligne", message: "Ousmane B. est hors ligne depuis 15 min en mission active", time: new Date(Date.now() - 1200000), read: false, icon: "⚠️", priority: "high" },
  { id: "n8", category: "payment", title: "Commission prélevée", message: "Commission plateforme : 180 FCFA sur livraison #2843", time: new Date(Date.now() - 5400000), read: true, icon: "📊", priority: "low" },
  { id: "n9", category: "mission", title: "Mission annulée", message: "Livraison #2841 annulée par le vendeur", time: new Date(Date.now() - 7200000), read: true, icon: "❌", priority: "normal" },
  { id: "n10", category: "system", title: "Maintenance prévue", message: "Maintenance planifiée le 18/03 de 2h à 4h", time: new Date(Date.now() - 10800000), read: true, icon: "🔧", priority: "low" },
];

export default function DeliveryNotificationHub({ orgId, className }: { orgId: string; className?: string }) {
  const [notifications, setNotifications] = useState<Notification[]>(MOCK_NOTIFICATIONS);
  const [category, setCategory] = useState<Category>("all");
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);

  const unreadCount = notifications.filter(n => !n.read).length;
  const filtered = notifications
    .filter(n => category === "all" || n.category === category)
    .filter(n => !showUnreadOnly || !n.read);

  const markRead = (id: string) => {
    haptic("selection");
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const markAllRead = () => {
    haptic("medium");
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    toast.success("✅ Tout marqué comme lu");
  };

  const deleteNotif = (id: string) => {
    haptic("light");
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const doAction = (id: string) => {
    haptic("medium");
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, actionDone: true, read: true } : n));
    toast.success("Action effectuée");
  };

  const timeAgo = (d: Date) => {
    const diff = Date.now() - d.getTime();
    if (diff < 60000) return "à l'instant";
    if (diff < 3600000) return `${Math.floor(diff / 60000)}min`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`;
    return `${Math.floor(diff / 86400000)}j`;
  };

  const priorityBorder = (p: string) =>
    p === "urgent" ? "hsl(var(--destructive) / 0.3)" : p === "high" ? "hsl(var(--warning) / 0.2)" : "hsl(var(--border) / 0.08)";

  const categories: { key: Category; label: string; count: number }[] = [
    { key: "all", label: "Tout", count: notifications.length },
    { key: "mission", label: "🚗 Missions", count: notifications.filter(n => n.category === "mission").length },
    { key: "payment", label: "💰 Paiements", count: notifications.filter(n => n.category === "payment").length },
    { key: "alert", label: "🚨 Alertes", count: notifications.filter(n => n.category === "alert").length },
    { key: "message", label: "💬 Messages", count: notifications.filter(n => n.category === "message").length },
    { key: "system", label: "⚙️ Système", count: notifications.filter(n => n.category === "system").length },
  ];

  return (
    <div className={`space-y-3 ${className || ""}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: "hsl(var(--foreground))" }}>
          <Bell className="h-4 w-4" style={{ color: "hsl(var(--primary))" }} />
          Centre de notifications
          {unreadCount > 0 && (
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
              style={{ background: "hsl(var(--destructive) / 0.1)", color: "hsl(var(--destructive))" }}>
              {unreadCount}
            </span>
          )}
        </h3>
        <div className="flex items-center gap-1">
          <Button size="sm" variant="ghost" className="h-7 px-2 text-[9px]" onClick={() => setShowUnreadOnly(!showUnreadOnly)}
            style={{ color: showUnreadOnly ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))" }}>
            {showUnreadOnly ? <BellOff className="h-3 w-3" /> : <Filter className="h-3 w-3" />}
          </Button>
          {unreadCount > 0 && (
            <Button size="sm" variant="ghost" className="h-7 px-2 text-[9px]" onClick={markAllRead}
              style={{ color: "hsl(var(--primary))" }}>
              <CheckCheck className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex gap-1 p-1 rounded-xl overflow-x-auto" style={{ background: "hsl(var(--muted) / 0.3)" }}>
        {categories.map(c => (
          <button key={c.key} onClick={() => { setCategory(c.key); haptic("selection"); }}
            className="shrink-0 py-1.5 px-2 rounded-lg text-[9px] font-semibold flex items-center gap-1"
            style={{
              background: category === c.key ? "hsl(var(--primary) / 0.1)" : "transparent",
              color: category === c.key ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))",
            }}>
            {c.label}
            {c.key !== "all" && (
              <span className="text-[7px] px-1 rounded-full"
                style={{ background: "hsl(var(--muted) / 0.5)" }}>{c.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* Notification List */}
      <div className="space-y-1.5 max-h-[400px] overflow-y-auto">
        <AnimatePresence>
          {filtered.length === 0 ? (
            <div className="text-center py-8">
              <BellOff className="h-8 w-8 mx-auto mb-2" style={{ color: "hsl(var(--muted-foreground) / 0.2)" }} />
              <p className="text-[10px]" style={{ color: "hsl(var(--muted-foreground))" }}>Aucune notification</p>
            </div>
          ) : (
            filtered.map(n => (
              <motion.div key={n.id} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -50 }} transition={{ duration: 0.2 }}
                className="rounded-xl p-3 flex items-start gap-3 cursor-pointer"
                onClick={() => markRead(n.id)}
                style={{
                  background: n.read ? "hsl(var(--muted) / 0.1)" : "hsl(var(--muted) / 0.25)",
                  border: `1px solid ${priorityBorder(n.priority)}`,
                  opacity: n.read ? 0.75 : 1,
                }}>
                <span className="text-base mt-0.5">{n.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-[10px] font-semibold" style={{ color: "hsl(var(--foreground))" }}>
                      {n.title}
                    </p>
                    {!n.read && (
                      <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: "hsl(var(--primary))" }} />
                    )}
                  </div>
                  <p className="text-[9px] mt-0.5" style={{ color: "hsl(var(--muted-foreground))" }}>{n.message}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[8px] flex items-center gap-0.5" style={{ color: "hsl(var(--muted-foreground))" }}>
                      <Clock className="h-2.5 w-2.5" /> {timeAgo(n.time)}
                    </span>
                    {n.actionLabel && !n.actionDone && (
                      <button onClick={(e) => { e.stopPropagation(); doAction(n.id); }}
                        className="text-[8px] font-semibold flex items-center gap-0.5"
                        style={{ color: "hsl(var(--primary))" }}>
                        {n.actionLabel} <ChevronRight className="h-2.5 w-2.5" />
                      </button>
                    )}
                  </div>
                </div>
                <button onClick={(e) => { e.stopPropagation(); deleteNotif(n.id); }}
                  className="shrink-0 mt-1 opacity-30 hover:opacity-100 transition-opacity">
                  <Trash2 className="h-3 w-3" style={{ color: "hsl(var(--muted-foreground))" }} />
                </button>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>

      {/* Footer stats */}
      <div className="flex justify-between px-2 pt-1" style={{ borderTop: "1px solid hsl(var(--border) / 0.08)" }}>
        <span className="text-[8px]" style={{ color: "hsl(var(--muted-foreground))" }}>
          {filtered.length} notification{filtered.length !== 1 ? "s" : ""}
        </span>
        <span className="text-[8px]" style={{ color: "hsl(var(--muted-foreground))" }}>
          {unreadCount} non lue{unreadCount !== 1 ? "s" : ""}
        </span>
      </div>
    </div>
  );
}
