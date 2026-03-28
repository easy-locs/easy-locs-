import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { CalendarCheck, MapPin, Clock, Inbox, Star } from "lucide-react";
import ClientLayout from "@/components/client/ClientLayout";
import { useAuth } from "@/contexts/AuthContext";
import { fetchClientAllBookings, fetchReviewedBookingIds } from "@/repositories/client-portal.repository";
import { useI18n } from "@/lib/i18n";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format, differenceInDays } from "date-fns";
import ReviewSubmitDialog from "@/components/marketplace/ReviewSubmitDialog";

const REVIEW_WINDOW_DAYS = 30;

interface BookingItem {
  id: string;
  type: "seasonal" | "concierge" | "marketplace";
  title: string;
  date: string;
  status: string;
  total?: number;
  currency?: string;
  service_id?: string;
  provider_id?: string;
  booker_name?: string;
  booker_email?: string;
  service_title?: string;
  completed_at?: string | null;
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
  const [reviewBooking, setReviewBooking] = useState<BookingItem | null>(null);
  const [reviewedBookingIds, setReviewedBookingIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!user?.email) return;
    const email = user.email;

      const { seasonal, concierge, marketplace } = await fetchClientAllBookings(email);

      const mkIds = marketplace.map((b: any) => b.id);
      const reviewed = await fetchReviewedBookingIds(mkIds);
      setReviewedBookingIds(reviewed);

      const lblSeasonal = t("client.type_seasonal") || "Seasonal";
      const lblConcierge = t("client.type_concierge") || "Concierge";
      const lblService = t("client.type_service") || "Service";
      const items: BookingItem[] = [
        ...(seasonal || []).map(b => ({ id: b.id, type: "seasonal" as const, title: `${lblSeasonal}: ${b.check_in} → ${b.check_out}`, date: b.created_at, status: b.status })),
        ...(concierge || []).map(b => ({ id: b.id, type: "concierge" as const, title: `${lblConcierge}: ${b.service_date || "—"}`, date: b.created_at, status: b.status, total: b.total_price, currency: b.currency })),
        ...(marketplace || []).map((b: any) => ({
          id: b.id, type: "marketplace" as const,
          title: `${lblService}: ${b.marketplace_services?.title || b.service_date || "—"}`,
          date: b.created_at, status: b.status, total: b.total_price, currency: b.currency,
          service_id: b.service_id, provider_id: b.provider_id,
          booker_name: b.booker_name, booker_email: b.booker_email,
          service_title: b.marketplace_services?.title,
          completed_at: b.completed_at,
        })),
      ];
      items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setBookings(items);
      setLoading(false);
    };
    fetchAll();
  }, [user]);

  const filterByType = (type?: string) => type ? bookings.filter(b => b.type === type) : bookings;

  const canReview = (b: BookingItem) => {
    // Only completed marketplace bookings are eligible — cancelled/refunded are not
    if (b.type !== "marketplace" || !b.service_id || !b.provider_id) return false;
    if (b.status !== "completed") return false;
    if (reviewedBookingIds.has(b.id)) return false;
    // 30-day window check
    if (b.completed_at) {
      const daysSince = differenceInDays(new Date(), new Date(b.completed_at));
      if (daysSince > REVIEW_WINDOW_DAYS) return false;
    }
    return true;
  };

  const getReviewWindowInfo = (b: BookingItem) => {
    if (!b.completed_at) return null;
    const daysLeft = REVIEW_WINDOW_DAYS - differenceInDays(new Date(), new Date(b.completed_at));
    if (daysLeft <= 0) return null;
    if (daysLeft <= 7) return `${daysLeft} ${t("mp.review_days_left") || "days left to review"}`;
    return null;
  };

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
        {items.map((b, i) => {
          const windowInfo = canReview(b) ? getReviewWindowInfo(b) : null;
          return (
            <motion.div key={b.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
              className="bg-card rounded-lg p-4 border border-border/50 hover:shadow-card-hover hover:border-accent/30 transition-all relative overflow-hidden group"
            >
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-accent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="flex items-center justify-between gap-3">
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
                  <Badge variant="outline" className={statusColor[b.status] || ""}>{t(`mp.status_${b.status}`) || t(`mp.${b.status}`) || b.status}</Badge>
                </div>
              </div>
              {/* Review action row */}
              {(canReview(b) || (b.type === "marketplace" && reviewedBookingIds.has(b.id))) && (
                <div className="flex items-center justify-end gap-2 mt-2 pt-2 border-t border-border/30">
                  {canReview(b) && (
                    <>
                      <Button size="sm" variant="outline" className="gap-1 text-xs h-7" onClick={() => setReviewBooking(b)}>
                        <Star className="h-3 w-3" /> {t("mp.leave_review") || "Leave a review"}
                      </Button>
                      {windowInfo && (
                        <span className="text-2xs text-warning font-medium">{windowInfo}</span>
                      )}
                    </>
                  )}
                  {b.type === "marketplace" && reviewedBookingIds.has(b.id) && (
                    <Badge variant="secondary" className="text-2xs h-5 gap-1 bg-success/10 text-success border-success/20">
                       <Star className="h-2.5 w-2.5 fill-current" /> {t("mp.reviewed") || "Reviewed"}
                     </Badge>
                  )}
                </div>
              )}
            </motion.div>
          );
        })}
      </div>
    );
  };

  return (
    <ClientLayout>
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold text-foreground mb-6">{t("nav.bookings") || "My Bookings"}</h1>
        <Tabs defaultValue="all">
          <TabsList className="mb-4">
            <TabsTrigger value="all">{t("client.tab_all") || "All"} ({bookings.length})</TabsTrigger>
            <TabsTrigger value="seasonal">{t("client.type_seasonal") || "Seasonal"}</TabsTrigger>
            <TabsTrigger value="concierge">{t("client.type_concierge") || "Concierge"}</TabsTrigger>
            <TabsTrigger value="marketplace">{t("client.type_service") || "Services"}</TabsTrigger>
          </TabsList>
          <TabsContent value="all">{loading ? <p className="text-muted-foreground text-sm">Loading...</p> : renderList(bookings)}</TabsContent>
          <TabsContent value="seasonal">{renderList(filterByType("seasonal"))}</TabsContent>
          <TabsContent value="concierge">{renderList(filterByType("concierge"))}</TabsContent>
          <TabsContent value="marketplace">{renderList(filterByType("marketplace"))}</TabsContent>
        </Tabs>
      </div>

      {reviewBooking && (
        <ReviewSubmitDialog
          open={!!reviewBooking}
          onOpenChange={(v) => !v && setReviewBooking(null)}
          booking={{
            id: reviewBooking.id,
            service_id: reviewBooking.service_id!,
            provider_id: reviewBooking.provider_id!,
            booker_name: reviewBooking.booker_name,
            booker_email: reviewBooking.booker_email,
            service_title: reviewBooking.service_title,
          }}
          onSubmitted={() => {
            setReviewedBookingIds(prev => new Set([...prev, reviewBooking.id]));
            setReviewBooking(null);
          }}
        />
      )}
    </ClientLayout>
  );
};

export default ClientBookings;
