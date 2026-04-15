/**
 * HotelDashboardPage — Hotelier dashboard with KPIs, pending bookings,
 * arrivals/departures of the day.
 */
import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Building2, CalendarDays, BedDouble, Users, TrendingUp,
  Check, X, LogIn, LogOut, Clock, Loader2, ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import SubPageShell from "@/components/layout/SubPageShell";
import { MobilePageHeader } from "@/components/ui/mobile-page-header";
import { useAuth } from "@/contexts/AuthContext";
import { createHotelService } from "@/domains/hotel/service";
import type { DashboardData, HotelBooking } from "@/domains/hotel/ports";
import { toast } from "sonner";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

function KpiCard({ icon: Icon, label, value, sub, accent }: {
  icon: React.ElementType; label: string; value: string | number; sub?: string; accent?: string;
}) {
  return (
    <Card className="bg-card/80 border-border/15">
      <CardContent className="p-4 flex items-center gap-3">
        <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center shrink-0", accent ?? "bg-primary/10")}>
          <Icon className={cn("h-5 w-5", accent ? "text-white" : "text-primary")} />
        </div>
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground truncate">{label}</p>
          <p className="text-lg font-bold tabular-nums">{value}</p>
          {sub && <p className="text-[10px] text-muted-foreground">{sub}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

function BookingRow({ booking, actions }: { booking: HotelBooking; actions?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-3 px-4 border-b border-border/10 last:border-0">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium truncate">{booking.guestName ?? "Guest"}</p>
        <p className="text-[10px] text-muted-foreground">
          {format(new Date(booking.checkIn), "dd MMM")} → {format(new Date(booking.checkOut), "dd MMM")} · {booking.bookingReference}
        </p>
        <p className="text-xs font-medium text-primary tabular-nums">{booking.totalPrice.toLocaleString()} {booking.currency}</p>
      </div>
      {actions && <div className="flex items-center gap-1.5 shrink-0 ml-2">{actions}</div>}
    </div>
  );
}

export default function HotelDashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const [hotelId, setHotelId] = useState<string>("");

  const loadDashboard = useCallback(async () => {
    if (!user?.id) return;
    const service = createHotelService({ userId: user.id });
    let hid = hotelId;
    if (!hid) {
      const owned = await service.getOwnedHotelId();
      if (!owned.ok) { setLoading(false); return; }
      hid = owned.data;
      setHotelId(hid);
    }
    const result = await service.getHotelDashboard(hid);
    if (result.ok) setDashboard(result.data);
    setLoading(false);
  }, [user?.id, hotelId]);

  useEffect(() => { loadDashboard(); }, [loadDashboard]);

  useEffect(() => {
    if (!hotelId) return;
    const channel = supabase
      .channel(`hotel-dashboard-${hotelId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "hotel_bookings", filter: `hotel_id=eq.${hotelId}` },
        () => { loadDashboard(); }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [hotelId, loadDashboard]);

  const handleConfirm = async (bookingId: string) => {
    if (!user?.id) return;
    setActionLoading(bookingId);
    const service = createHotelService({ userId: user.id });
    const result = await service.confirmBooking(bookingId);
    if (result.ok) { toast.success("Booking confirmed"); loadDashboard(); }
    else toast.error(result.error);
    setActionLoading(null);
  };

  const handleReject = async (bookingId: string) => {
    if (!user?.id) return;
    setActionLoading(bookingId);
    const service = createHotelService({ userId: user.id });
    const result = await service.rejectBooking(bookingId, "Rejected by hotel");
    if (result.ok) { toast.success("Booking rejected"); loadDashboard(); }
    else toast.error(result.error);
    setActionLoading(null);
  };

  const handleCheckIn = async (bookingId: string) => {
    if (!user?.id) return;
    setActionLoading(bookingId);
    const service = createHotelService({ userId: user.id });
    const result = await service.checkInGuest(bookingId);
    if (result.ok) { toast.success("Guest checked in"); loadDashboard(); }
    else toast.error(result.error);
    setActionLoading(null);
  };

  const handleCheckOut = async (bookingId: string) => {
    if (!user?.id) return;
    setActionLoading(bookingId);
    const service = createHotelService({ userId: user.id });
    const result = await service.checkOutGuest(bookingId);
    if (result.ok) { toast.success("Guest checked out"); loadDashboard(); }
    else toast.error(result.error);
    setActionLoading(null);
  };

  if (loading) {
    return (
      <SubPageShell noContentPad>
        <MobilePageHeader title="Hotel Dashboard" backTo="/me" />
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      </SubPageShell>
    );
  }

  return (
    <SubPageShell noContentPad>
      <MobilePageHeader title="Hotel Dashboard" backTo="/me" />
      <div className="p-4 space-y-4 pb-24">
        <div className="grid grid-cols-2 gap-3">
          <KpiCard
            icon={BedDouble}
            label="Occupation"
            value={`${dashboard?.occupancyPercent ?? 0}%`}
            sub={`${dashboard?.occupiedRooms ?? 0}/${dashboard?.totalRooms ?? 0} rooms`}
            accent="bg-blue-500"
          />
          <KpiCard
            icon={TrendingUp}
            label="Revenue (month)"
            value={`${(dashboard?.monthRevenue ?? 0).toLocaleString()} AED`}
            accent="bg-emerald-500"
          />
          <KpiCard
            icon={LogIn}
            label="Arrivals today"
            value={dashboard?.arrivalsToday.length ?? 0}
            accent="bg-amber-500"
          />
          <KpiCard
            icon={LogOut}
            label="Departures today"
            value={dashboard?.departuresToday.length ?? 0}
            accent="bg-purple-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="flex-1" onClick={() => navigate("/hotel/calendar")}>
            <CalendarDays className="h-4 w-4 mr-1.5" /> Calendar
          </Button>
          <Button variant="outline" size="sm" className="flex-1" onClick={() => navigate("/hotel/rooms")}>
            <BedDouble className="h-4 w-4 mr-1.5" /> Rooms
          </Button>
          <Button variant="outline" size="sm" className="flex-1" onClick={() => navigate("/hotel/pricing")}>
            <TrendingUp className="h-4 w-4 mr-1.5" /> Pricing
          </Button>
        </div>

        {(dashboard?.pendingBookings.length ?? 0) > 0 && (
          <Card className="bg-card/80 border-border/15">
            <CardHeader className="pb-2 px-4 pt-4">
              <CardTitle className="text-sm flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-warning" />
                Pending Bookings ({dashboard!.pendingBookings.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {dashboard!.pendingBookings.map(b => (
                <BookingRow key={b.id} booking={b} actions={
                  actionLoading === b.id ? <Loader2 className="h-4 w-4 animate-spin" /> : (
                    <>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-emerald-500" onClick={() => handleConfirm(b.id)}>
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive" onClick={() => handleReject(b.id)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </>
                  )
                } />
              ))}
            </CardContent>
          </Card>
        )}

        {(dashboard?.arrivalsToday.length ?? 0) > 0 && (
          <Card className="bg-card/80 border-border/15">
            <CardHeader className="pb-2 px-4 pt-4">
              <CardTitle className="text-sm flex items-center gap-1.5">
                <LogIn className="h-4 w-4 text-amber-500" />
                Arrivals Today ({dashboard!.arrivalsToday.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {dashboard!.arrivalsToday.map(b => (
                <BookingRow key={b.id} booking={b} actions={
                  actionLoading === b.id ? <Loader2 className="h-4 w-4 animate-spin" /> : (
                    <Button size="sm" variant="default" className="h-7 text-xs" onClick={() => handleCheckIn(b.id)}>
                      Check-in
                    </Button>
                  )
                } />
              ))}
            </CardContent>
          </Card>
        )}

        {(dashboard?.departuresToday.length ?? 0) > 0 && (
          <Card className="bg-card/80 border-border/15">
            <CardHeader className="pb-2 px-4 pt-4">
              <CardTitle className="text-sm flex items-center gap-1.5">
                <LogOut className="h-4 w-4 text-purple-500" />
                Departures Today ({dashboard!.departuresToday.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {dashboard!.departuresToday.map(b => (
                <BookingRow key={b.id} booking={b} actions={
                  actionLoading === b.id ? <Loader2 className="h-4 w-4 animate-spin" /> : (
                    <Button size="sm" variant="secondary" className="h-7 text-xs" onClick={() => handleCheckOut(b.id)}>
                      Check-out
                    </Button>
                  )
                } />
              ))}
            </CardContent>
          </Card>
        )}

        {!dashboard?.pendingBookings.length && !dashboard?.arrivalsToday.length && !dashboard?.departuresToday.length && (
          <div className="text-center py-12 text-muted-foreground">
            <Building2 className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No pending activity today</p>
            <p className="text-xs mt-1">Bookings and arrivals will appear here</p>
          </div>
        )}
      </div>
    </SubPageShell>
  );
}
