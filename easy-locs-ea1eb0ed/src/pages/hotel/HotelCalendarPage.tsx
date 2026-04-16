/**
 * HotelCalendarPage — Monthly grid view of room availability.
 * Rows = room types, Columns = days. Color-coded cells.
 */
import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  ChevronLeft, ChevronRight, Loader2, Lock, Unlock, Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import SubPageShell from "@/components/layout/SubPageShell";
import { MobilePageHeader } from "@/components/ui/mobile-page-header";
import { useAuth } from "@/contexts/AuthContext";
import { createHotelService } from "@/domains/hotel/service";
import type { HotelRoom, RoomAvailability } from "@/domains/hotel/ports";
import { toast } from "sonner";
import {
  format, addMonths, subMonths, startOfMonth, endOfMonth,
  eachDayOfInterval, isBefore, isToday,
} from "date-fns";
import { cn } from "@/lib/utils";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

const STATUS_COLORS: Record<string, string> = {
  available: "bg-emerald-500/20 text-emerald-700 dark:text-emerald-400",
  booked: "bg-blue-500/20 text-blue-700 dark:text-blue-400",
  blocked: "bg-red-500/20 text-red-700 dark:text-red-400",
  maintenance: "bg-gray-400/20 text-gray-600 dark:text-gray-400",
};

export default function HotelCalendarPage() {
  const { user } = useAuth();
  const [month, setMonth] = useState(new Date());
  const [rooms, setRooms] = useState<HotelRoom[]>([]);
  const [availability, setAvailability] = useState<RoomAvailability[]>([]);
  const [loading, setLoading] = useState(true);
  const [blockDialog, setBlockDialog] = useState<{ roomId: string; date: string } | null>(null);
  const [blockReason, setBlockReason] = useState("");
  const [detailDialog, setDetailDialog] = useState<RoomAvailability | null>(null);
  const [detailBooking, setDetailBooking] = useState<{guestName: string; checkIn: string; checkOut: string; totalPrice: number; currency: string; status: string} | null>(null);

  const days = useMemo(() => eachDayOfInterval({
    start: startOfMonth(month),
    end: endOfMonth(month),
  }), [month]);

  const [hotelId, setHotelId] = useState<string>("");

  const loadData = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    const service = createHotelService({ userId: user.id });
    let hid = hotelId;
    if (!hid) {
      const owned = await service.getOwnedHotelId();
      if (!owned.ok) { setLoading(false); return; }
      hid = owned.data;
      setHotelId(hid);
    }
    const ms = format(startOfMonth(month), "yyyy-MM-dd");
    const me = format(endOfMonth(month), "yyyy-MM-dd");

    const [roomsRes, calRes] = await Promise.all([
      service.getRooms(hid),
      service.getCalendar(hid, ms, me),
    ]);

    if (roomsRes.ok) setRooms(roomsRes.data);
    if (calRes.ok) setAvailability(calRes.data);
    setLoading(false);
  }, [user?.id, month, hotelId]);

  useEffect(() => { loadData(); }, [loadData]);

  const getStatus = (roomId: string, dateStr: string): RoomAvailability | null => {
    return availability.find(a => a.roomId === roomId && a.date === dateStr) ?? null;
  };

  const handleCellClick = async (roomId: string, dateStr: string) => {
    const entry = getStatus(roomId, dateStr);
    const date = new Date(dateStr);
    if (isBefore(date, new Date()) && !isToday(date)) return;

    if (!entry || entry.status === "available") {
      setBlockDialog({ roomId, date: dateStr });
      setBlockReason("");
    } else if (entry.status === "blocked") {
      handleUnblock(roomId, dateStr);
    } else if (entry.status === "booked") {
      setDetailDialog(entry);
      setDetailBooking(null);
      if (entry.bookingId) {
        const { data } = await (await import("@/services/db")).db
          .from("hotel_bookings")
          .select("guest_name, checkin_date, checkout_date, total_price, currency, status")
          .eq("id", entry.bookingId)
          .single();
        if (data) {
          setDetailBooking({
            guestName: data.guest_name ?? "Guest",
            checkIn: data.checkin_date,
            checkOut: data.checkout_date,
            totalPrice: Number(data.total_price),
            currency: data.currency ?? "AED",
            status: data.status,
          });
        }
      }
    }
  };

  const handleBlock = async () => {
    if (!blockDialog || !user?.id) return;
    const service = createHotelService({ userId: user.id });
    const result = await service.blockDates(blockDialog.roomId, [blockDialog.date], blockReason || undefined);
    if (result.ok) { toast.success("Date blocked"); loadData(); }
    else toast.error(result.error);
    setBlockDialog(null);
  };

  const handleUnblock = async (roomId: string, date: string) => {
    if (!user?.id) return;
    const service = createHotelService({ userId: user.id });
    const result = await service.unblockDates(roomId, [date]);
    if (result.ok) { toast.success("Date unblocked"); loadData(); }
    else toast.error(result.error);
  };

  if (loading) {
    return (
      <SubPageShell noContentPad>
        <MobilePageHeader title="Calendar" backTo="/hotel/dashboard" />
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      </SubPageShell>
    );
  }

  return (
    <SubPageShell noContentPad>
      <MobilePageHeader title="Calendar" backTo="/hotel/dashboard" />
      <div className="p-4 space-y-3 pb-24">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="icon" onClick={() => setMonth(subMonths(month, 1))}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <h2 className="text-sm font-bold">{format(month, "MMMM yyyy")}</h2>
          <Button variant="ghost" size="icon" onClick={() => setMonth(addMonths(month, 1))}>
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>

        <div className="flex items-center gap-3 text-[0.625rem]">
          <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm bg-emerald-500/40" /> Available</span>
          <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm bg-blue-500/40" /> Booked</span>
          <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm bg-red-500/40" /> Blocked</span>
          <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm bg-gray-400/40" /> Maintenance</span>
        </div>

        <ScrollArea className="w-full">
          <div className="min-w-[600px]">
            <div className="grid" style={{ gridTemplateColumns: `140px repeat(${days.length}, 32px)` }}>
              <div className="h-8 flex items-center px-2 text-[0.625rem] font-medium text-muted-foreground sticky left-0 bg-background z-10">
                Room Type
              </div>
              {days.map(d => (
                <div key={d.toISOString()} className={cn(
                  "h-8 flex items-center justify-center text-[0.625rem]",
                  isToday(d) && "font-bold text-primary",
                  isBefore(d, new Date()) && !isToday(d) && "text-muted-foreground/40",
                )}>
                  {format(d, "d")}
                </div>
              ))}

              {rooms.map(room => (
                <React.Fragment key={room.id}>
                  <div className="h-8 flex items-center px-2 text-[0.6875rem] font-medium truncate sticky left-0 bg-background z-10 border-t border-border/10">
                    {room.name}
                  </div>
                  {days.map(d => {
                    const dateStr = format(d, "yyyy-MM-dd");
                    const entry = getStatus(room.id, dateStr);
                    const status = entry?.status ?? "available";
                    const isPast = isBefore(d, new Date()) && !isToday(d);

                    return (
                      <button
                        key={`${room.id}-${dateStr}`}
                        className={cn(
                          "h-8 w-8 rounded-sm text-[0.5625rem] font-medium border border-transparent transition-colors",
                          isPast ? "bg-muted/30 text-muted-foreground/30 cursor-default" : STATUS_COLORS[status],
                          !isPast && "hover:ring-1 hover:ring-primary/50 cursor-pointer",
                        )}
                        onClick={() => !isPast && handleCellClick(room.id, dateStr)}
                        title={`${room.name} — ${dateStr}: ${status}`}
                      >
                        {status === "booked" && "B"}
                        {status === "blocked" && "X"}
                        {status === "maintenance" && "M"}
                      </button>
                    );
                  })}
                </React.Fragment>
              ))}
            </div>
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>

        {rooms.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <p className="text-sm">No rooms configured yet</p>
            <Button variant="link" className="mt-1 text-xs" onClick={() => window.location.href = "/hotel/rooms"}>
              Add rooms
            </Button>
          </div>
        )}
      </div>

      <Dialog open={!!blockDialog} onOpenChange={() => setBlockDialog(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm">Block Date</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Block {blockDialog?.date} for this room type?
            </p>
            <div>
              <Label className="text-xs">Reason (optional)</Label>
              <Input value={blockReason} onChange={e => setBlockReason(e.target.value)} placeholder="e.g. Maintenance" className="mt-1" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setBlockDialog(null)}>Cancel</Button>
            <Button size="sm" onClick={handleBlock}>
              <Lock className="h-3.5 w-3.5 mr-1" /> Block
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!detailDialog} onOpenChange={() => { setDetailDialog(null); setDetailBooking(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm flex items-center gap-1.5">
              <Info className="h-4 w-4" /> Booking Details
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2 text-sm">
            <p><span className="text-muted-foreground">Date:</span> {detailDialog?.date}</p>
            <p><span className="text-muted-foreground">Status:</span> <Badge variant="secondary">{detailDialog?.status}</Badge></p>
            {detailBooking && (
              <>
                <p><span className="text-muted-foreground">Guest:</span> {detailBooking.guestName}</p>
                <p><span className="text-muted-foreground">Stay:</span> {detailBooking.checkIn} → {detailBooking.checkOut}</p>
                <p><span className="text-muted-foreground">Amount:</span> {detailBooking.totalPrice.toLocaleString()} {detailBooking.currency}</p>
                <p><span className="text-muted-foreground">Booking status:</span> <Badge variant="secondary">{detailBooking.status}</Badge></p>
              </>
            )}
            {!detailBooking && detailDialog?.bookingId && (
              <p className="text-xs text-muted-foreground">Loading booking details…</p>
            )}
            {detailDialog?.notes && (
              <p><span className="text-muted-foreground">Notes:</span> {detailDialog.notes}</p>
            )}
          </div>
          <DialogFooter>
            <Button size="sm" variant="outline" onClick={() => { setDetailDialog(null); setDetailBooking(null); }}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SubPageShell>
  );
}
