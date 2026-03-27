import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Search, CalendarCheck, MessageCircle, FileText, CreditCard, ArrowRight, Inbox, Clock, Star, TrendingUp } from "lucide-react";
import ClientLayout from "@/components/client/ClientLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";

interface ActivityItem {
  id: string;
  icon: typeof CalendarCheck;
  label: string;
  detail: string;
  time: string;
  type: "booking" | "payment" | "message" | "document";
  link?: string;
}

const ClientDashboard = () => {
  const { user } = useAuth();
  const { t } = useI18n();
  const [stats, setStats] = useState({ bookings: 0, messages: 0, documents: 0, payments: 0 });
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!user) return;
    const fetchAll = async () => {
      const email = user.email || "";

      // Stats: bookings
      const [seasonalRes, conciergeRes, marketplaceRes] = await Promise.all([
        supabase.from("booking_requests").select("id", { count: "exact", head: true }).eq("guest_email", email),
        supabase.from("concierge_orders").select("id", { count: "exact", head: true }).eq("guest_email", email),
        supabase.from("marketplace_bookings").select("id", { count: "exact", head: true }).eq("booker_email", email),
      ]);
      const bookingCount = (seasonalRes.count || 0) + (conciergeRes.count || 0) + (marketplaceRes.count || 0);

      // Stats: unread messages (V2 via notifications)
      const { count: unreadCount } = await (supabase as any)
        .from("app_notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("category", "message")
        .is("read_at", null);

      // Stats: payments
      const [{ count: paidConcierge }, { count: paidMarketplace }] = await Promise.all([
        supabase.from("concierge_orders").select("id", { count: "exact", head: true }).eq("guest_email", email).eq("payment_status", "paid"),
        supabase.from("marketplace_bookings").select("id", { count: "exact", head: true }).eq("booker_email", email).eq("payment_confirmed", true),
      ]);

      // Stats: documents (tenant-linked)
      let docCount = 0;
      const { data: tenantLinks } = await supabase.from("tenants").select("id").eq("tenant_user_id", user.id);
      if (tenantLinks && tenantLinks.length > 0) {
        const { count } = await supabase
          .from("documents")
          .select("id", { count: "exact", head: true })
          .in("tenant_id", tenantLinks.map(tl => tl.id));
        docCount = count || 0;
      }

      setStats({
        bookings: bookingCount,
        messages: unreadCount || 0,
        documents: docCount,
        payments: (paidConcierge || 0) + (paidMarketplace || 0),
      });

      // Activity timeline — recent 10 items from all sources
      const timeline: ActivityItem[] = [];

      // Recent bookings
      const { data: recentBookings } = await supabase
        .from("marketplace_bookings")
        .select("id, service_date, status, created_at, marketplace_services(title)")
        .eq("booker_email", email)
        .order("created_at", { ascending: false })
        .limit(5);
      if (recentBookings) {
        for (const b of recentBookings) {
          timeline.push({
            id: `bk-${b.id}`,
            icon: CalendarCheck,
            label: (b as any).marketplace_services?.title || "Booking",
            detail: b.status,
            time: b.created_at,
            type: "booking",
            link: "/client/bookings",
          });
        }
      }

      const { data: recentConcierge } = await supabase
        .from("concierge_orders")
        .select("id, service_date, status, total_price, currency, created_at")
        .eq("guest_email", email)
        .order("created_at", { ascending: false })
        .limit(5);
      if (recentConcierge) {
        for (const c of recentConcierge) {
          timeline.push({
            id: `co-${c.id}`,
            icon: Star,
            label: `Concierge — ${c.service_date || "—"}`,
            detail: `${c.total_price} ${c.currency} • ${c.status}`,
            time: c.created_at,
            type: "booking",
            link: "/client/bookings",
          });
        }
      }

      // Recent messages (V2)
      const { data: recentMsgs } = await (supabase as any)
        .from("chat_messages_v2")
        .select("id, body, sender_user_id, created_at, metadata")
        .eq("sender_user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(3);
      if (recentMsgs) {
        for (const m of recentMsgs) {
          timeline.push({
            id: `msg-${m.id}`,
            icon: MessageCircle,
            label: (m.metadata as any)?.contact_name || "Provider",
            detail: m.body?.substring(0, 60) || "",
            time: m.created_at,
            type: "message",
            link: "/client/messages",
          });
        }
      }

      timeline.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
      setActivity(timeline.slice(0, 8));
      setLoaded(true);
    };
    fetchAll();
  }, [user]);

  const quickCards = [
    { icon: Search, label: t("nav.explore") || "Explore", path: "/explore", value: t("client.browse") || "Browse", color: "text-primary", hint: t("client.hint_explore") || "Discover listings & services" },
    { icon: CalendarCheck, label: t("nav.bookings") || "My Bookings", path: "/client/bookings", value: `${stats.bookings}`, color: "text-info", hint: t("client.hint_bookings") || "View my reservations" },
    { icon: MessageCircle, label: t("nav.messages") || "Messages", path: "/client/messages", value: stats.messages > 0 ? `${stats.messages}` : "0", color: "text-warning", hint: stats.messages > 0 ? `${stats.messages} unread` : (t("client.hint_messages") || "Conversations with providers") },
    { icon: FileText, label: t("nav.documents") || "Documents", path: "/client/documents", value: `${stats.documents}`, color: "text-muted-foreground", hint: t("client.hint_documents") || "Invoices & confirmations" },
    { icon: CreditCard, label: t("nav.payments") || "Payments", path: "/client/payments", value: `${stats.payments}`, color: "text-success", hint: t("client.hint_payments") || "Payment history" },
  ];

  const typeColor: Record<string, string> = {
    booking: "bg-info/10 text-info",
    payment: "bg-success/10 text-success",
    message: "bg-warning/10 text-warning",
    document: "bg-muted text-muted-foreground",
  };

  return (
    <ClientLayout>
      <div className="max-w-4xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-2xl font-bold text-foreground mb-1">
            {t("client.welcome") || "Welcome back"}
          </h1>
          <p className="text-muted-foreground mb-8">
            {t("client.dashboard_desc") || "Track your bookings, messages and payments across all providers."}
          </p>
        </motion.div>

        <div className="responsive-card-grid mb-8">
          {!loaded ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex flex-col h-full min-h-[148px] bg-card rounded-xl shadow-card border border-border/50 animate-pulse" style={{ padding: "var(--card-padding)" }}>
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-lg bg-muted" />
                </div>
                <div className="h-4 bg-muted rounded w-20 mb-2" />
                <div className="h-7 bg-muted rounded w-12 mt-auto" />
              </div>
            ))
          ) : (
            quickCards.map((card, i) => (
              <motion.div key={card.path} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.05 }}>
                <Link
                  to={card.path}
                  className="group flex flex-col h-full min-h-[148px] bg-card rounded-xl shadow-card border border-border/50 hover:shadow-card-hover hover:border-accent/30 transition-all relative overflow-hidden"
                  style={{ padding: "var(--card-padding)" }}
                >
                  <div className="absolute top-0 left-0 right-0 h-0.5 bg-accent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center group-hover:bg-accent/10 transition-colors">
                      <card.icon className={`h-5 w-5 ${card.color}`} />
                    </div>
                    <ArrowRight className="h-4 w-4 text-transparent group-hover:text-accent transition-colors" />
                  </div>
                  <span className="text-sm text-muted-foreground mb-1">{card.label}</span>
                  <div className="font-bold text-foreground text-2xl tabular-nums mt-auto">{card.value}</div>
                  <p className="text-2xs text-accent mt-1 opacity-0 group-hover:opacity-100 transition-opacity">{card.hint}</p>
                </Link>
              </motion.div>
            ))
          )}
        </div>

        {/* Activity timeline */}
        {loaded && activity.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="h-4 w-4 text-accent" />
              <h2 className="text-sm font-semibold text-foreground">{t("client.recent_activity") || "Recent Activity"}</h2>
            </div>
            <div className="bg-card rounded-xl shadow-card border border-border/50 divide-y divide-border/30">
              {activity.map((item, i) => (
                <Link
                  key={item.id}
                  to={item.link || "#"}
                  className="flex items-center gap-3 p-3.5 hover:bg-muted/30 transition-colors first:rounded-t-xl last:rounded-b-xl"
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${typeColor[item.type] || "bg-muted"}`}>
                    <item.icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{item.label}</p>
                    <p className="text-xs text-muted-foreground truncate">{item.detail}</p>
                  </div>
                  <span className="text-[10px] text-muted-foreground shrink-0">
                    {formatDistanceToNow(new Date(item.time), { addSuffix: true })}
                  </span>
                </Link>
              ))}
            </div>
          </motion.div>
        )}

        {loaded && stats.bookings === 0 && activity.length === 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="bg-card rounded-xl p-8 shadow-card border border-border/50 text-center">
            <Inbox className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground font-medium">{t("client.no_bookings") || "No bookings yet"}</p>
            <p className="text-sm text-muted-foreground mt-1">{t("client.no_bookings_desc") || "Start by exploring available listings and services."}</p>
            <Link to="/explore" className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">
              <Search className="h-4 w-4" /> {t("nav.explore") || "Explore"}
            </Link>
          </motion.div>
        )}
      </div>
    </ClientLayout>
  );
};

export default ClientDashboard;
