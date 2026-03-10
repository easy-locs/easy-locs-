import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { CalendarCheck, MapPin, Clock, Inbox } from "lucide-react";
import ClientLayout from "@/components/client/ClientLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";

interface BookingItem {
  id: string;
  type: "seasonal" | "concierge" | "marketplace";
  title: string;
  date: string;
  status: string;
  total?: number;
  currency?: string;
}

const statusColor: Record<string, string> = {
  pending: "bg-warning/10 text-warning border-warning/20",
  confirmed: "bg-success/10 text-success border-success/20",
  completed: "bg-muted text-muted-foreground border-border",
  cancelled: "bg-destructive/10 text-destructive border-destructive/20",
  paid: "bg-success/10 text-success border-success/20",
};

const ClientBookings = () => {
  const { user } = useAuth();
  const { t } = useI18n();
  const [bookings, setBookings] = useState<BookingItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.email) return;
    const email = user.email;

    const fetchAll = async () => {
      const [{ data: seasonal }, { data: concierge }, { data: marketplace }] = await Promise.all([
        supabase.from("booking_requests").select("id, guest_name, check_in, check_out, status, created_at").eq("guest_email", email).order("created_at", { ascending: false }).limit(50),
        supabase.from("concierge_orders").select("id, guest_name, service_date, status, total_price, currency, created_at").eq("guest_email", email).order("created_at", { ascending: false }).limit(50),
        supabase.from("marketplace_bookings").select("id, booker_name, service_date, status, total_price, currency, created_at").eq("booker_email", email).order("created_at", { ascending: false }).limit(50),
      ]);

      const items: BookingItem[] = [
        ...(seasonal || []).map(b => ({ id: b.id, type: "seasonal" as const, title: `Seasonal: ${b.check_in} → ${b.check_out}`, date: b.created_at, status: b.status })),
        ...(concierge || []).map(b => ({ id: b.id, type: "concierge" as const, title: `Concierge: ${b.service_date || "—"}`, date: b.created_at, status: b.status, total: b.total_price, currency: b.currency })),
        ...(marketplace || []).map(b => ({ id: b.id, type: "marketplace" as const, title: `Service: ${b.service_date || "—"}`, date: b.created_at, status: b.status, total: b.total_price, currency: b.currency })),
      ];
      items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setBookings(items);
      setLoading(false);
    };
    fetchAll();
  }, [user]);

  const filterByType = (type?: string) => type ? bookings.filter(b => b.type === type) : bookings;

  const renderList = (items: BookingItem[]) => {
    if (items.length === 0) {
      return (
        <div className="text-center py-12">
          <Inbox className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
          <p className="text-muted-foreground text-sm">{t("client.no_bookings") || "No bookings"}</p>
        </div>
      );
    }
    return (
      <div className="space-y-3">
        {items.map((b, i) => (
          <motion.div key={b.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
            className="bg-card rounded-lg p-4 border border-border/50 flex items-center justify-between gap-3 hover:shadow-card-hover hover:border-accent/30 transition-all relative overflow-hidden group"
          >
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-accent opacity-0 group-hover:opacity-100 transition-opacity" />
          >
            <div className="flex items-center gap-3 min-w-0">
              <CalendarCheck className="h-5 w-5 text-muted-foreground shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{b.title}</p>
                <p className="text-xs text-muted-foreground">{format(new Date(b.date), "dd/MM/yyyy HH:mm")}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {b.total != null && (
                <span className="text-sm font-semibold text-foreground">{b.total} {b.currency}</span>
              )}
              <Badge variant="outline" className={statusColor[b.status] || ""}>{b.status}</Badge>
            </div>
          </motion.div>
        ))}
      </div>
    );
  };

  return (
    <ClientLayout>
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold text-foreground mb-6">{t("nav.bookings") || "My Bookings"}</h1>
        <Tabs defaultValue="all">
          <TabsList className="mb-4">
            <TabsTrigger value="all">All ({bookings.length})</TabsTrigger>
            <TabsTrigger value="seasonal">Seasonal</TabsTrigger>
            <TabsTrigger value="concierge">Concierge</TabsTrigger>
            <TabsTrigger value="marketplace">Services</TabsTrigger>
          </TabsList>
          <TabsContent value="all">{loading ? <p className="text-muted-foreground text-sm">Loading...</p> : renderList(bookings)}</TabsContent>
          <TabsContent value="seasonal">{renderList(filterByType("seasonal"))}</TabsContent>
          <TabsContent value="concierge">{renderList(filterByType("concierge"))}</TabsContent>
          <TabsContent value="marketplace">{renderList(filterByType("marketplace"))}</TabsContent>
        </Tabs>
      </div>
    </ClientLayout>
  );
};

export default ClientBookings;
