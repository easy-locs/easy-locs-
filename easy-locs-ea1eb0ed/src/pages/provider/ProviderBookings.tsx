import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ClipboardList, Clock, User, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useUiEngine } from "@/hooks/useUiEngine";

type BookingStatus = "pending" | "confirmed" | "completed" | "cancelled";

interface Booking {
  id: string;
  customerName: string;
  service: string;
  date: string;
  time: string;
  status: BookingStatus;
  amount: number;
  currency: string;
}

const MOCK_BOOKINGS: Booking[] = [
  { id: "b1", customerName: "Alice Martin", service: "Home Cleaning", date: "2026-04-15", time: "10:00", status: "pending", amount: 80, currency: "EUR" },
  { id: "b2", customerName: "Bob Dupont", service: "Plumbing Repair", date: "2026-04-14", time: "14:00", status: "confirmed", amount: 120, currency: "EUR" },
  { id: "b3", customerName: "Carol Smith", service: "Electrical Check", date: "2026-04-12", time: "09:00", status: "completed", amount: 95, currency: "EUR" },
  { id: "b4", customerName: "David Lee", service: "Garden Work", date: "2026-04-10", time: "11:00", status: "cancelled", amount: 60, currency: "EUR" },
];

const STATUS_CONFIG: Record<BookingStatus, { label: string; icon: typeof CheckCircle2; color: string }> = {
  pending: { label: "Pending", icon: AlertCircle, color: "text-amber-500" },
  confirmed: { label: "Confirmed", icon: CheckCircle2, color: "text-blue-500" },
  completed: { label: "Completed", icon: CheckCircle2, color: "text-green-500" },
  cancelled: { label: "Cancelled", icon: XCircle, color: "text-destructive" },
};

const FILTERS: { key: BookingStatus | "all"; label: string }[] = [
  { key: "all", label: "All" },
  { key: "pending", label: "Pending" },
  { key: "confirmed", label: "Confirmed" },
  { key: "completed", label: "Completed" },
];

export default function ProviderBookings() {
  useUiEngine("provider-bookings");
  const navigate = useNavigate();
  const { t } = useI18n();
  const [filter, setFilter] = useState<BookingStatus | "all">("all");
  const [bookings, setBookings] = useState<Booking[]>(MOCK_BOOKINGS);

  const filtered = filter === "all" ? bookings : bookings.filter(b => b.status === filter);

  const updateStatus = (id: string, status: BookingStatus) => {
    setBookings(bs => bs.map(b => b.id === id ? { ...b, status } : b));
  };

  return (
    <div className="app-mobile-page flex flex-col" style={{ background: "hsl(var(--background))" }}>
      <header className="flex items-center gap-3 px-4 pt-4 pb-2">
        <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-xl flex items-center justify-center active:scale-95" style={{ background: "hsl(var(--muted))" }}>
          <ArrowLeft className="w-4.5 h-4.5" />
        </button>
        <div className="flex items-center gap-2">
          <ClipboardList className="w-5 h-5 text-primary" />
          <h1 className="text-lg font-bold">{t("provider.bookings") || "Bookings"}</h1>
        </div>
      </header>

      <div className="px-4 pb-2 pt-1">
        <div className="app-tab-bar">
          {FILTERS.map(f => (
            <button key={f.key} onClick={() => setFilter(f.key)} className="app-tab" data-active={filter === f.key ? "true" : "false"}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 px-4 pb-24 mt-2 space-y-3 overflow-y-auto">
        {filtered.length === 0 && (
          <div className="text-center text-muted-foreground text-sm py-12">No bookings found</div>
        )}
        {filtered.map(booking => {
          const cfg = STATUS_CONFIG[booking.status];
          const Icon = cfg.icon;
          return (
            <div key={booking.id} className="rounded-2xl border p-4" style={{ background: "hsl(var(--card))", borderColor: "hsl(var(--border))" }}>
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="font-semibold text-sm">{booking.service}</p>
                  <div className="flex items-center gap-1 mt-0.5 text-xs text-muted-foreground">
                    <User className="w-3 h-3" />
                    {booking.customerName}
                  </div>
                </div>
                <div className={`flex items-center gap-1 text-xs font-medium ${cfg.color}`}>
                  <Icon className="w-3.5 h-3.5" />
                  {cfg.label}
                </div>
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
                <div className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {booking.date} at {booking.time}
                </div>
                <span className="font-semibold text-foreground">{booking.amount} {booking.currency}</span>
              </div>
              {booking.status === "pending" && (
                <div className="flex gap-2">
                  <button onClick={() => updateStatus(booking.id, "confirmed")} className="flex-1 btn-primary text-xs py-1.5">Accept</button>
                  <button onClick={() => updateStatus(booking.id, "cancelled")} className="flex-1 rounded-xl border text-xs py-1.5 text-destructive" style={{ borderColor: "hsl(var(--border))" }}>Decline</button>
                </div>
              )}
              {booking.status === "confirmed" && (
                <button onClick={() => updateStatus(booking.id, "completed")} className="w-full btn-primary text-xs py-1.5">Mark Complete</button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
