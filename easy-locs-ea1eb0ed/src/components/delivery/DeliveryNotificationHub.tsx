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
import { useDeliveryNotifications, useUpdateMutation } from "@/hooks/useDeliveryData";

type Category = "all" | "mission" | "payment" | "alert" | "system" | "message";

export default function DeliveryNotificationHub({ orgId, className }: { orgId: string; className?: string }) {
  const { data: notifications = [], isLoading } = useDeliveryNotifications(orgId);
  const updateNotif = useUpdateMutation("storefront_notification_log");
  const [category, setCategory] = useState<Category>("all");
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);

  if (isLoading) return <div style={{ padding: "2rem", textAlign: "center", color: "#888" }}>Loading...</div>;

  const unreadCount = notifications.filter((n: any) => !n.read).length;
  const filtered = notifications
    .filter((n: any) => category === "all" || n.category === category)
    .filter((n: any) => !showUnreadOnly || !n.read);

  const markRead = (id: string) => {
    haptic("selection");
    updateNotif.mutate({ id, read: true });
  };

  const markAllRead = () => {
    haptic("medium");
    notifications.filter((n: any) => !n.read).forEach((n: any) => {
      updateNotif.mutate({ id: n.id, read: true });
    });
    toast.success("✅ Tout marqué comme lu");
  };

  const deleteNotif = (id: string) => {
    haptic("light");
    updateNotif.mutate({ id, deleted_at: new Date().toISOString() });
  };

  const doAction = (id: string) => {
    haptic("medium");
    updateNotif.mutate({ id, action_done: true, read: true });
    toast.success("Action effectuée");
  };

  const timeAgo = (d: string | Date) => {
    const date = typeof d === "string" ? new Date(d) : d;
    const diff = Date.now() - date.getTime();
    if (diff < 60000) return "à l'instant";
    if (diff < 3600000) return `${Math.floor(diff / 60000)}min`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`;
    return `${Math.floor(diff / 86400000)}j`;
  };

  const priorityBorder = (p: string) =>
    p === "urgent" ? "hsl(var(--destructive) / 0.3)" : p === "high" ? "hsl(var(--warning) / 0.2)" : "hsl(var(--border) / 0.08)";

  const categories: { key: Category; label: string; count: number }[] = [
    { key: "all", label: "Tout", count: notifications.length },
    { key: "mission", label: "🚗 Missions", count: notifications.filter((n: any) => n.category === "mission").length },
    { key: "payment", label: "💰 Paiements", count: notifications.filter((n: any) => n.category === "payment").length },
    { key: "alert", label: "🚨 Alertes", count: notifications.filter((n: any) => n.category === "alert").length },
    { key: "message", label: "💬 Messages", count: notifications.filter((n: any) => n.category === "message").length },
    { key: "system", label: "⚙️ Système", count: notifications.filter((n: any) => n.category === "system").length },
  ];

  return (
    <div className={`space-y-3 ${className || ""}`}>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: "hsl(var(--foreground))" }}>
          <Bell className="h-4 w-4" style={{ color: "hsl(var(--primary))" }} />
          Centre de notifications
          {unreadCount > 0 && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
              style={{ background: "hsl(var(--destructive) / 0.1)", color: "hsl(var(--destructive))" }}>
              {unreadCount}
            </span>
          )}
        </h3>
        <div className="flex items-center gap-1">
          <Button size="sm" variant="ghost" className="h-7 px-2 text-[10px]" onClick={() => setShowUnreadOnly(!showUnreadOnly)}
            style={{ color: showUnreadOnly ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))" }}>
            {showUnreadOnly ? <BellOff className="h-3 w-3" /> : <Filter className="h-3 w-3" />}
          </Button>
          {unreadCount > 0 && (
            <Button size="sm" variant="ghost" className="h-7 px-2 text-[10px]" onClick={markAllRead}
              style={{ color: "hsl(var(--primary))" }}>
              <CheckCheck className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>

      <div className="flex gap-1 p-1 rounded-xl overflow-x-auto" style={{ background: "hsl(var(--muted) / 0.3)" }}>
        {categories.map(c => (
          <button key={c.key} onClick={() => { setCategory(c.key); haptic("selection"); }}
            className="shrink-0 py-1.5 px-2 rounded-lg text-[10px] font-semibold flex items-center gap-1"
            style={{
              background: category === c.key ? "hsl(var(--primary) / 0.1)" : "transparent",
              color: category === c.key ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))",
            }}>
            {c.label}
            {c.key !== "all" && (
              <span className="text-[10px] px-1 rounded-full"
                style={{ background: "hsl(var(--muted) / 0.5)" }}>{c.count}</span>
            )}
          </button>
        ))}
      </div>

      <div className="space-y-1.5 max-h-[400px] overflow-y-auto">
        <AnimatePresence>
          {filtered.length === 0 ? (
            <div className="text-center py-8">
              <BellOff className="h-8 w-8 mx-auto mb-2" style={{ color: "hsl(var(--muted-foreground) / 0.2)" }} />
              <p className="text-[10px]" style={{ color: "hsl(var(--muted-foreground))" }}>Aucune notification</p>
            </div>
          ) : (
            filtered.map((n: any) => (
              <motion.div key={n.id} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -50 }} transition={{ duration: 0.2 }}
                className="rounded-xl p-3 flex items-start gap-3 cursor-pointer"
                onClick={() => markRead(n.id)}
                style={{
                  background: n.read ? "hsl(var(--muted) / 0.1)" : "hsl(var(--muted) / 0.25)",
                  border: `1px solid ${priorityBorder(n.priority || "normal")}`,
                  opacity: n.read ? 0.75 : 1,
                }}>
                <span className="text-base mt-0.5">{n.icon || "📩"}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-[10px] font-semibold" style={{ color: "hsl(var(--foreground))" }}>
                      {n.title || "Notification"}
                    </p>
                    {!n.read && (
                      <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: "hsl(var(--primary))" }} />
                    )}
                  </div>
                  <p className="text-[10px] mt-0.5" style={{ color: "hsl(var(--muted-foreground))" }}>{n.message || n.body || "—"}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] flex items-center gap-0.5" style={{ color: "hsl(var(--muted-foreground))" }}>
                      <Clock className="h-2.5 w-2.5" /> {n.created_at ? timeAgo(n.created_at) : "—"}
                    </span>
                    {n.action_label && !n.action_done && (
                      <button onClick={(e) => { e.stopPropagation(); doAction(n.id); }}
                        className="text-[10px] font-semibold flex items-center gap-0.5"
                        style={{ color: "hsl(var(--primary))" }}>
                        {n.action_label} <ChevronRight className="h-2.5 w-2.5" />
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

      <div className="flex justify-between px-2 pt-1" style={{ borderTop: "1px solid hsl(var(--border) / 0.08)" }}>
        <span className="text-[10px]" style={{ color: "hsl(var(--muted-foreground))" }}>
          {filtered.length} notification{filtered.length !== 1 ? "s" : ""}
        </span>
        <span className="text-[10px]" style={{ color: "hsl(var(--muted-foreground))" }}>
          {unreadCount} non lue{unreadCount !== 1 ? "s" : ""}
        </span>
      </div>
    </div>
  );
}
