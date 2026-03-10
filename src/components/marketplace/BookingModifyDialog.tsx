/**
 * BookingModifyDialog — allows providers to modify date, time, quantity,
 * and recalculates the total price. Triggers notification to customer.
 */
import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar, Edit } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  booking: any;
  service: any;
  onSubmit: (data: {
    service_date: string;
    service_time: string;
    date_from: string | null;
    date_to: string | null;
    quantity: number;
    total_price: number;
    modification_reason: string;
  }) => void;
  isPending?: boolean;
}

export default function BookingModifyDialog({ open, onOpenChange, booking, service, onSubmit, isPending }: Props) {
  const isRange = !!(booking?.date_from && booking?.date_to);

  const [form, setForm] = useState({
    service_date: booking?.service_date || "",
    service_time: booking?.service_time || "",
    date_from: booking?.date_from || "",
    date_to: booking?.date_to || "",
    quantity: booking?.quantity || 1,
    modification_reason: "",
  });

  const update = (k: string, v: string | number) => setForm((f) => ({ ...f, [k]: v }));

  const unitPrice = Number(service?.price || 0);

  const days = useMemo(() => {
    if (!isRange || !form.date_from || !form.date_to) return 0;
    return Math.max(1, Math.ceil((new Date(form.date_to).getTime() - new Date(form.date_from).getTime()) / 86400000));
  }, [isRange, form.date_from, form.date_to]);

  const totalPrice = useMemo(() => {
    if (isRange) return unitPrice * days;
    return unitPrice * (form.quantity || 1);
  }, [isRange, days, form.quantity, unitPrice]);

  const hasChanges =
    form.service_date !== (booking?.service_date || "") ||
    form.service_time !== (booking?.service_time || "") ||
    form.date_from !== (booking?.date_from || "") ||
    form.date_to !== (booking?.date_to || "") ||
    form.quantity !== (booking?.quantity || 1);

  if (!booking) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md w-[calc(100vw-2rem)]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Edit className="h-4 w-4 text-accent" />
            Modify Booking #{booking.id?.slice(0, 8)}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Current info */}
          <div className="p-3 bg-muted/30 rounded-lg text-sm space-y-1">
            <p className="font-medium text-foreground">{booking.booker_name}</p>
            <p className="text-muted-foreground">{service?.title || "Service"}</p>
            <p className="text-muted-foreground">
              Current: {booking.total_price} {booking.currency}
            </p>
          </div>

          {/* Date fields */}
          {isRange ? (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Start Date</Label>
                <Input
                  type="date"
                  className="h-9 text-sm"
                  value={form.date_from}
                  onChange={(e) => update("date_from", e.target.value)}
                />
              </div>
              <div>
                <Label className="text-xs">End Date</Label>
                <Input
                  type="date"
                  className="h-9 text-sm"
                  value={form.date_to}
                  onChange={(e) => update("date_to", e.target.value)}
                />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Date</Label>
                <Input
                  type="date"
                  className="h-9 text-sm"
                  value={form.service_date}
                  onChange={(e) => update("service_date", e.target.value)}
                />
              </div>
              <div>
                <Label className="text-xs">Time</Label>
                <Input
                  type="time"
                  className="h-9 text-sm"
                  value={form.service_time}
                  onChange={(e) => update("service_time", e.target.value)}
                />
              </div>
            </div>
          )}

          {/* Quantity (non-range only) */}
          {!isRange && (
            <div>
              <Label className="text-xs">Quantity</Label>
              <Input
                type="number"
                min={1}
                className="h-9 text-sm"
                value={form.quantity || ""}
                onChange={(e) => update("quantity", Number(e.target.value) || 1)}
              />
            </div>
          )}

          {/* New price preview */}
          <div className="p-3 bg-accent/10 rounded-lg flex justify-between items-center">
            <span className="text-sm text-muted-foreground">
              {isRange
                ? `${days} day${days > 1 ? "s" : ""} × ${unitPrice} ${service?.currency || booking.currency}`
                : `${form.quantity} × ${unitPrice} ${service?.currency || booking.currency}`}
            </span>
            <span className="text-lg font-bold text-foreground">
              {totalPrice.toLocaleString()} {service?.currency || booking.currency}
            </span>
          </div>

          {/* Reason */}
          <div>
            <Label className="text-xs">Reason for modification</Label>
            <Textarea
              className="text-sm min-h-[60px]"
              value={form.modification_reason}
              onChange={(e) => update("modification_reason", e.target.value)}
              placeholder="Date change requested by customer..."
              rows={2}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={!hasChanges || isPending || !form.modification_reason}
              onClick={() => onSubmit({
                service_date: isRange ? form.date_from : form.service_date,
                service_time: form.service_time,
                date_from: isRange ? form.date_from : null,
                date_to: isRange ? form.date_to : null,
                quantity: form.quantity,
                total_price: totalPrice,
                modification_reason: form.modification_reason,
              })}
            >
              {isPending ? "Saving..." : "Apply Modification"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
