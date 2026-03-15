import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Search, CalendarCheck, MessageCircle, FileText, CreditCard, ArrowRight, Inbox } from "lucide-react";
import ClientLayout from "@/components/client/ClientLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";

const ClientDashboard = () => {
  const { user } = useAuth();
  const { t } = useI18n();
  const [stats, setStats] = useState({ bookings: 0, messages: 0, documents: 0 });
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!user) return;
    const fetchStats = async () => {
      // Count seasonal booking requests made by this user's email
      const email = user.email || "";

      const [seasonalRes, conciergeRes, marketplaceRes] = await Promise.all([
        supabase.from("booking_requests").select("id", { count: "exact", head: true }).eq("guest_email", email),
        supabase.from("concierge_orders").select("id", { count: "exact", head: true }).eq("guest_email", email),
        supabase.from("marketplace_bookings").select("id", { count: "exact", head: true }).eq("booker_email", email),
      ]);

      setStats({
        bookings: (seasonalRes.count || 0) + (conciergeRes.count || 0) + (marketplaceRes.count || 0),
        messages: -1, // -1 = not yet implemented, display "—"
        documents: -1,
      });
      setLoaded(true);
    };
    fetchStats();
  }, [user]);

  const quickCards = [
    { icon: Search, label: t("nav.explore") || "Explore", path: "/explore", value: t("client.browse") || "Browse", color: "text-primary", hint: t("client.hint_explore") || "Discover listings & services" },
    { icon: CalendarCheck, label: t("nav.bookings") || "My Bookings", path: "/client/bookings", value: `${stats.bookings}`, color: "text-info", hint: t("client.hint_bookings") || "View my reservations" },
    { icon: MessageCircle, label: t("nav.messages") || "Messages", path: "/client/messages", value: `${stats.messages}`, color: "text-warning", hint: t("client.hint_messages") || "Conversations with providers" },
    { icon: FileText, label: t("nav.documents") || "Documents", path: "/client/documents", value: `${stats.documents}`, color: "text-muted-foreground", hint: t("client.hint_documents") || "Invoices & confirmations" },
    { icon: CreditCard, label: t("nav.payments") || "Payments", path: "/client/payments", value: "—", color: "text-success", hint: t("client.hint_payments") || "Payment history" },
  ];

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

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {quickCards.map((card, i) => (
            <motion.div key={card.path} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.05 }}>
              <Link
                to={card.path}
                className="group flex flex-col h-full min-h-[148px] bg-card rounded-xl p-5 shadow-card border border-border/50 hover:shadow-card-hover hover:border-accent/30 transition-all relative overflow-hidden"
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
                <p className="text-[10px] text-accent mt-1 opacity-0 group-hover:opacity-100 transition-opacity">{card.hint}</p>
              </Link>
            </motion.div>
          ))}
        </div>

        {loaded && stats.bookings === 0 && (
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
