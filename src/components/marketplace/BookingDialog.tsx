import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Calendar, CreditCard, Mail, Phone } from "lucide-react";
import { format } from "date-fns";

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
    quantity: number;
    notes: string;
  }) => void;
  isPending?: boolean;
}

export default function BookingDialog({ open, onOpenChange, service, provider, onSubmit, isPending }: Props) {
  const [form, setForm] = useState({
    booker_name: "",
    booker_email: "",
    booker_phone: "",
    service_date: format(new Date(), "yyyy-MM-dd"),
    service_time: "10:00",
    quantity: 1,
    notes: "",
  });

  const update = (k: string, v: string | number) => setForm((f) => ({ ...f, [k]: v }));
  const totalPrice = Number(service?.price || 0) * form.quantity;

  // Get payment info from service or fallback to provider
  const paymentStripe = service?.payment_stripe_link || provider?.payment_stripe_link;
  const paymentPaypal = service?.payment_paypal_email || provider?.payment_paypal_email;
  const paymentCustom = service?.payment_custom_url || provider?.payment_custom_url;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Book: {service?.title}</DialogTitle>
        </DialogHeader>
        {service && (
          <div className="space-y-4">
            <div className="p-3 bg-muted/30 rounded-lg">
              <p className="font-medium text-foreground text-sm">{service.title}</p>
              <p className="text-xs text-muted-foreground">{provider?.display_name} — {service.city}, {service.country}</p>
              <p className="text-sm font-bold text-accent mt-1">{Number(service.price).toLocaleString()} {service.currency}</p>
            </div>

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

            <div>
              <Label>Phone</Label>
              <Input value={form.booker_phone} onChange={(e) => update("booker_phone", e.target.value)} />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Date *</Label>
                <Input type="date" value={form.service_date} onChange={(e) => update("service_date", e.target.value)} />
              </div>
              <div>
                <Label>Time</Label>
                <Input type="time" value={form.service_time} onChange={(e) => update("service_time", e.target.value)} />
              </div>
              <div>
                <Label>Qty</Label>
                <Input type="number" min={1} value={form.quantity} onChange={(e) => update("quantity", Number(e.target.value))} />
              </div>
            </div>

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
                disabled={!form.booker_name || !form.booker_email || isPending}
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
