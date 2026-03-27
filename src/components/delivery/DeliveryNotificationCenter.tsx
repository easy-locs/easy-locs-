/**
 * DeliveryNotificationCenter — VVV. Unified notification hub for all delivery actors.
 * Real-time alerts, preferences, history, and quick actions.
 * PASS95-VVV
 */
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bell, BellOff, CheckCircle2, Truck, Package, AlertTriangle,
  Clock, Filter, Trash2, Eye, Settings, Loader2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { haptic } from "@/lib/haptics";

interface Props {
  orgId: string;
  className?: string;
}

interface DeliveryNotif {
  id: string;
  category: string;
  title: string;
  body: string | null;
  read_at: string | null;
  dismissed_at: string | null;
  route: string | null;
  metadata: Record<string, any> | null;
  created_at: string;
}

const NOTIF_ICONS: Record<string, { icon: typeof Bell; color: string }> = {
  info: { icon: Bell, color: "--hud-cyan" },
  payment: { icon: CheckCircle2, color: "--success" },
  warning: { icon: AlertTriangle, color: "--warning" },
  delivery: { icon: Truck, color: "--info" },
};

const CATEGORIES = [
  { id: "all", label: "Tout" },
  { id: "new", label: "Nouvelles" },
  { id: "delivery", label: "Livraisons" },
  { id: "payment", label: "Paiements" },
] as const;

export default function DeliveryNotificationCenter({ orgId, className }: Props) {
  const { user } = useAuth();
  const [notifs, setNotifs] = useState<DeliveryNotif[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState<string>("all");
  const [showPrefs, setShowPrefs] = useState(false);
  const [prefs, setPrefs] = useState({ pushEnabled: true, emailEnabled: true, soundEnabled: true });

  useEffect(() => {
    if (!user) return;
    const fetchNotifs = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("app_notifications")
        .select("id, category, title, body, read_at, dismissed_at, route, metadata, created_at")
        .eq("user_id", user.id)
        .is("dismissed_at", null)
        .order("created_at", { ascending: false })
        .limit(50);
      setNotifs((data || []) as DeliveryNotif[]);
      setLoading(false);
    };
    fetchNotifs();
  }, [user]);

  const filtered = notifs.filter(n => {
    if (category === "new") return !n.read_at;
    if (category === "delivery") return n.title?.toLowerCase().includes("livr") || n.title?.includes("mission");
    if (category === "payment") return n.category === "payment";
    return true;
  });

  const unreadCount = notifs.filter(n => !n.read_at).length;

  const markRead = async (id: string) => {
    haptic("light");
    await (supabase as any).from("app_notifications").update({ read_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", id);
    setNotifs(p => p.map(n => n.id === id ? { ...n, read_at: new Date().toISOString() } : n));
  };

  const markAllRead = async () => {
    haptic("medium");
    const ids = notifs.filter(n => !n.read_at).map(n => n.id);
    if (ids.length === 0) return;
    await (supabase as any).from("app_notifications").update({ read_at: new Date().toISOString(), updated_at: new Date().toISOString() }).in("id", ids);
    setNotifs(p => p.map(n => ({ ...n, read_at: new Date().toISOString() })));
    toast.success(`${ids.length} notifications marquées comme lues`);
  };

  const deleteNotif = async (id: string) => {
    haptic("light");
    await (supabase as any).from("app_notifications").update({ dismissed_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", id);
    setNotifs(p => p.filter(n => n.id !== id));
  };

  const timeAgo = (d: string) => {
    const mins = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
    if (mins < 1) return "à l'instant";
    if (mins < 60) return `il y a ${mins}m`;
    if (mins < 1440) return `il y a ${Math.floor(mins / 60)}h`;
    return `il y a ${Math.floor(mins / 1440)}j`;
  };

  return (
    <div className={`space-y-3 ${className || ""}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell className="h-4 w-4" style={{ color: "hsl(var(--hud-cyan))" }} />
          <h3 className="text-sm font-bold" style={{ color: "hsl(var(--hud-text))" }}>Centre de notifications</h3>
          {unreadCount > 0 && (
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
              style={{ background: "hsl(var(--destructive))", color: "#fff" }}>
              {unreadCount}
            </span>
          )}
        </div>
        <div className="flex gap-1">
          <Button size="sm" variant="ghost" className="h-7 px-2 text-[10px]" onClick={markAllRead}
            style={{ color: "hsl(var(--hud-text-dim) / 0.5)" }}>
            <Eye className="h-3 w-3 mr-1" /> Tout lire
          </Button>
          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setShowPrefs(!showPrefs)}
            style={{ color: "hsl(var(--hud-text-dim) / 0.4)" }}>
            <Settings className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Preferences */}
      <AnimatePresence>
        {showPrefs && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden">
            <div className="rounded-xl p-3 space-y-2" style={{ background: "hsl(var(--hud-surface))", border: "1px solid hsl(var(--hud-border) / 0.1)" }}>
              <p className="text-[10px] font-semibold" style={{ color: "hsl(var(--hud-text-dim))" }}>Préférences</p>
              {[
                { key: "pushEnabled", label: "Notifications push", icon: Bell },
                { key: "emailEnabled", label: "Notifications email", icon: Bell },
                { key: "soundEnabled", label: "Sons d'alerte", icon: Bell },
              ].map(pref => (
                <label key={pref.key} className="flex items-center justify-between cursor-pointer">
                  <span className="text-[10px]" style={{ color: "hsl(var(--hud-text))" }}>{pref.label}</span>
                  <input type="checkbox" checked={prefs[pref.key as keyof typeof prefs]}
                    onChange={e => setPrefs(p => ({ ...p, [pref.key]: e.target.checked }))}
                    className="accent-[hsl(var(--hud-cyan))]" />
                </label>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Category filter */}
      <div className="flex gap-1">
        {CATEGORIES.map(c => (
          <button key={c.id} onClick={() => setCategory(c.id)}
            className="text-[10px] px-3 py-1 rounded-full font-medium transition-all"
            style={{
              background: category === c.id ? "hsl(var(--hud-cyan) / 0.15)" : "hsl(var(--hud-border) / 0.06)",
              color: category === c.id ? "hsl(var(--hud-cyan))" : "hsl(var(--hud-text-dim) / 0.4)",
            }}>
            {c.label}
          </button>
        ))}
      </div>

      {/* Notification list */}
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin" style={{ color: "hsl(var(--hud-cyan) / 0.3)" }} />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center py-8">
          <BellOff className="h-8 w-8 mb-2" style={{ color: "hsl(var(--hud-text-dim) / 0.15)" }} />
          <p className="text-xs" style={{ color: "hsl(var(--hud-text-dim) / 0.4)" }}>Aucune notification</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {filtered.map(n => {
            const cfg = NOTIF_ICONS[n.category] || NOTIF_ICONS.info;
            const Icon = cfg.icon;
            const isNew = !n.read_at;
            return (
              <motion.div key={n.id} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                className="flex items-start gap-3 p-3 rounded-xl cursor-pointer transition-all"
                onClick={() => isNew && markRead(n.id)}
                style={{
                  background: isNew ? "hsl(var(--hud-cyan) / 0.04)" : "hsl(var(--hud-surface))",
                  border: `1px solid ${isNew ? "hsl(var(--hud-cyan) / 0.12)" : "hsl(var(--hud-border) / 0.06)"}`,
                }}>
                <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                  style={{ background: `hsl(var(${cfg.color}) / 0.1)` }}>
                  <Icon className="h-3.5 w-3.5" style={{ color: `hsl(var(${cfg.color}))` }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-semibold truncate" style={{ color: "hsl(var(--hud-text))" }}>{n.title}</p>
                    {isNew && <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: "hsl(var(--hud-cyan))" }} />}
                  </div>
                  <p className="text-[10px] mt-0.5 line-clamp-2" style={{ color: "hsl(var(--hud-text-dim) / 0.5)" }}>{n.body}</p>
                  <span className="text-[8px] mt-1 block" style={{ color: "hsl(var(--hud-text-dim) / 0.3)" }}>{timeAgo(n.created_at)}</span>
                </div>
                <button onClick={e => { e.stopPropagation(); deleteNotif(n.id); }}
                  className="p-1 rounded-lg shrink-0 opacity-40 hover:opacity-80 transition-opacity">
                  <Trash2 className="h-3 w-3" style={{ color: "hsl(var(--destructive))" }} />
                </button>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
