import { useState, useMemo, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { CreditCard, Mail, MapPin, Users, Clock } from "lucide-react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import ServiceBookingCalendar from "@/components/concierge/ServiceBookingCalendar";
import { getCategoryBookingConfig, isRangeCategory } from "./CategoryBookingConfig";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  service: any;
  provider: any;
  onSubmit: (data: {
    booker_name: string;
    booker_email: string;
    booker_phone: string;
    service_date: string;
    service_time: string;
    date_from?: string;
    date_to?: string;
    quantity: number;
    notes: string;
    pickup_location?: string;
    dropoff_location?: string;
    passengers?: number;
    return_time?: string;
  }) => void;
  isPending?: boolean;
}

export default function BookingDialog({ open, onOpenChange, service, provider, onSubmit, isPending }: Props) {
  const config = useMemo(() => getCategoryBookingConfig(service?.category || "other"), [service?.category]);
  const isRange = config.calendarMode === "range";

  const [form, setForm] = useState({
    booker_name: "",
    booker_email: "",
    booker_phone: "",
    service_date: format(new Date(), "yyyy-MM-dd"),
    service_time: "10:00",
    date_from: "",
    date_to: "",
    quantity: 0,
    notes: "",
    pickup_location: "",
    dropoff_location: "",
    passengers: 0,
    return_time: "",
  });

  const [bookedDates, setBookedDates] = useState<{ from: string; to: string }[]>([]);

  useEffect(() => {
    if (!open || !service?.id) return;
    const loadBookings = async () => {
      const { data } = await supabase
        .from("marketplace_bookings")
        .select("service_date, date_from, date_to, status")
        .eq("service_id", service.id)
        .in("status", ["pending", "confirmed", "completed"]);
      if (data) {
        setBookedDates(data.map((b: any) => ({
          from: b.date_from || b.service_date,
          to: b.date_to || b.service_date,
        })).filter((b: any) => b.from));
      }
    };
    loadBookings();
  }, [open, service?.id]);

  const update = (k: string, v: string | number) => setForm((f) => ({ ...f, [k]: v }));

  const days = useMemo(() => {
    if (!isRange || !form.date_from || !form.date_to) return 0;
    return Math.max(1, Math.ceil((new Date(form.date_to).getTime() - new Date(form.date_from).getTime()) / 86400000));
  }, [isRange, form.date_from, form.date_to]);

  const totalPrice = useMemo(() => {
    const price = Number(service?.price || 0);
    if (isRange) return price * days;
    const qty = form.quantity || 1;
    return price * qty;
  }, [isRange, days, form.quantity, service?.price]);

  const dateOverlap = useMemo(() => {
    if (!isRange || !form.date_from || !form.date_to) return false;
    return bookedDates.some(b => form.date_from < b.to && form.date_to > b.from);
  }, [isRange, form.date_from, form.date_to, bookedDates]);

  const paymentStripe = service?.payment_stripe_link || provider?.payment_stripe_link;
  const paymentPaypal = service?.payment_paypal_email || provider?.payment_paypal_email;
  const paymentCustom = service?.payment_custom_url || provider?.payment_custom_url;

  const timeSlots = Array.isArray(service?.time_slots) ? service.time_slots : [];
  const blockedDates = Array.isArray(service?.blocked_dates) ? service.blocked_dates : [];

  const handleCalendarSelect = (dateVal: Date) => {
    const date = format(dateVal, "yyyy-MM-dd");
    if (isRange) {
      if (!form.date_from || form.date_to) {
        setForm(f => ({ ...f, date_from: date, date_to: "" }));
      } else {
        if (date > form.date_from) {
          setForm(f => ({ ...f, date_to: date }));
        } else {
          setForm(f => ({ ...f, date_from: date, date_to: form.date_from }));
        }
      }
    } else {
      update("service_date", date);
    }
  };

  const isValid = form.booker_name && form.booker_email && !dateOverlap &&
    (isRange ? (form.date_from && form.date_to) : true);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Book: {service?.title}</DialogTitle>
        </DialogHeader>
        {service && (
          <div className="space-y-4">
            {/* Service info */}
            <div className="p-3 bg-muted/30 rounded-lg">
              <p className="font-medium text-foreground text-sm">{service.title}</p>
              <p className="text-xs text-muted-foreground">{provider?.display_name} — {service.city}, {service.country}</p>
              <p className="text-sm font-bold text-accent mt-1">
                {Number(service.price).toLocaleString()} {service.currency}
                {config.priceUnit && <span className="text-xs font-normal text-muted-foreground ml-1">{config.priceUnit}</span>}
              </p>
              {service.duration_minutes && config.showDuration && (
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                  <Clock className="h-3 w-3" /> {service.duration_minutes} min
                </p>
              )}
            </div>

            {/* Contact info */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Your Name *</Label>
                <Input value={form.booker_name} onChange={(e) => update("booker_name", e.target.value)} />
              </div>
              <div>
                <Label>Email *</Label>
                <Input type="email" value={form.booker_email} onChange={(e) => update("booker_email", e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Phone</Label>
                <Input value={form.booker_phone} onChange={(e) => update("booker_phone", e.target.value)} />
              </div>
              {config.showQuantity && (
                <div>
                  <Label>{config.quantityLabel}</Label>
                  <Input type="number" min={1} value={form.quantity || ""} onChange={(e) => update("quantity", e.target.value === "" ? 0 : Number(e.target.value))} placeholder="1" />
                </div>
              )}
            </div>

            {/* Passengers (airport transfer / transport) */}
            {config.showPassengers && (
              <div>
                <Label className="flex items-center gap-1"><Users className="h-3 w-3" /> Passengers</Label>
                <Input type="number" min={1} value={form.passengers || ""} onChange={(e) => update("passengers", e.target.value === "" ? 0 : Number(e.target.value))} placeholder="1" />
              </div>
            )}

            {/* Pickup / Drop-off locations (airport transfer / transport) */}
            {config.showLocations && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="flex items-center gap-1"><MapPin className="h-3 w-3" /> Pickup Location</Label>
                  <Input value={form.pickup_location} onChange={(e) => update("pickup_location", e.target.value)} placeholder="Airport, hotel..." />
                </div>
                <div>
                  <Label className="flex items-center gap-1"><MapPin className="h-3 w-3" /> Drop-off Location</Label>
                  <Input value={form.dropoff_location} onChange={(e) => update("dropoff_location", e.target.value)} placeholder="Destination..." />
                </div>
              </div>
            )}

            {/* Time slot */}
            {config.showTime && (
              <div className={config.showReturnTime ? "grid grid-cols-2 gap-3" : ""}>
                <div>
                  <Label>{isRange ? "Pickup Time" : "Time"}</Label>
                  <Input type="time" value={form.service_time} onChange={(e) => update("service_time", e.target.value)} />
                </div>
                {config.showReturnTime && (
                  <div>
                    <Label>Return Time</Label>
                    <Input type="time" value={form.return_time} onChange={(e) => update("return_time", e.target.value)} />
                  </div>
                )}
              </div>
            )}

            {/* Calendar */}
            <div className="border border-border rounded-lg p-3">
              <p className="text-xs font-medium text-muted-foreground mb-2">
                {isRange
                  ? form.date_from && !form.date_to
                    ? `📅 Select ${config.endDateLabel.toLowerCase()}`
                    : `📅 ${config.dateLabel} → ${config.endDateLabel}`
                  : `📅 ${config.dateLabel}`
                }
              </p>
              <ServiceBookingCalendar
                serviceId={service.id}
                timeSlots={timeSlots}
                blockedDates={blockedDates}
                maxCapacity={service.max_capacity}
                onSelect={handleCalendarSelect}
                selectedDate={isRange ? (form.date_from ? new Date(form.date_from) : undefined) : (form.service_date ? new Date(form.service_date) : undefined)}
                selectedTime={form.service_time}
              />

              {/* Selected range display */}
              {isRange && form.date_from && (
                <div className="mt-2 flex items-center gap-2 text-xs">
                  <Badge variant="outline">{form.date_from}</Badge>
                  {form.date_to && (
                    <>
                      <span className="text-muted-foreground">→</span>
                      <Badge variant="outline">{form.date_to}</Badge>
                    </>
                  )}
                </div>
              )}

              {!isRange && form.service_date && (
                <div className="mt-2">
                  <Badge variant="outline" className="text-xs">{form.service_date}</Badge>
                </div>
              )}
            </div>

            {dateOverlap && (
              <p className="text-xs text-destructive bg-destructive/10 p-2 rounded-lg">⚠️ These dates are already booked</p>
            )}

            {/* Price summary */}
            {((isRange && days > 0) || (!isRange && (form.quantity || 1) > 0)) && totalPrice > 0 && (
              <div className="bg-muted/50 rounded-lg p-3 text-sm space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    {isRange
                      ? `${days} day${days > 1 ? "s" : ""} × ${Number(service.price).toLocaleString()} ${service.currency}`
                      : `${form.quantity || 1} × ${Number(service.price).toLocaleString()} ${service.currency}`
                    }
                  </span>
                  <span className="font-bold text-foreground">{totalPrice.toLocaleString()} {service.currency}</span>
                </div>
              </div>
            )}

            {/* Notes — include location info for transport categories */}
            <div>
              <Label>Notes</Label>
              <Textarea value={form.notes} onChange={(e) => update("notes", e.target.value)} rows={2} placeholder="Special requests..." />
            </div>

            {/* Payment methods */}
            {(paymentStripe || paymentPaypal || paymentCustom) && (
              <div className="space-y-2 border-t border-border pt-3">
                <p className="text-xs font-medium text-muted-foreground uppercase">Payment Options</p>
                <div className="flex flex-wrap gap-2">
                  {paymentStripe && <Badge variant="outline"><CreditCard className="h-3 w-3 mr-1" /> Stripe</Badge>}
                  {paymentPaypal && <Badge variant="outline"><Mail className="h-3 w-3 mr-1" /> PayPal</Badge>}
                  {paymentCustom && <Badge variant="outline"><CreditCard className="h-3 w-3 mr-1" /> Other</Badge>}
                </div>
                <p className="text-[10px] text-muted-foreground">Payment link will be sent after confirmation</p>
              </div>
            )}

            <div className="flex items-center justify-between pt-2 border-t border-border">
              <span className="text-lg font-bold text-foreground">{totalPrice.toLocaleString()} {service.currency}</span>
              <Button
                onClick={() => onSubmit(form)}
                disabled={!isValid || isPending}
              >
                {isPending ? "Booking..." : "Request Booking"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
