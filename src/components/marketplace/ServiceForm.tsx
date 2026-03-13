import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import ServicePhotoManager from "@/components/concierge/ServicePhotoManager";
import ServiceFormCategorySelector from "./ServiceFormCategorySelector";
import ServiceFormAvailabilityCalendar from "./ServiceFormAvailabilityCalendar";
import { UserCircle } from "lucide-react";

export interface ServiceFormData {
  title: string;
  description: string;
  category: string;
  price: number;
  currency: string;
  price_type: string;
  duration_minutes: number | null;
  country: string;
  city: string;
  location: string;
  max_capacity: number;
  payment_stripe_link: string;
  payment_paypal_email: string;
  payment_custom_url: string;
  active: boolean;
  photo_urls?: string[];
  requires_id_document?: boolean;
  source_contact_name?: string;
  source_contact_phone?: string;
  source_contact_email?: string;
  source_contact_notes?: string;
  time_slots?: Record<string, string[]>;
  blocked_dates?: string[];
  contact_method?: string;
}

const CURRENCIES = [
  "EUR", "USD", "GBP", "CHF", "MAD", "TND", "XOF", "AED", "CAD", "AUD",
  "JPY", "CNY", "INR", "BRL", "MXN", "ZAR", "NGN", "KES", "EGP", "SAR",
  "QAR", "KWD", "BHD", "OMR", "TRY", "PLN", "CZK", "HUF", "RON", "BGN",
  "SEK", "NOK", "DKK", "ISK", "HRK", "RSD", "GEL", "UAH", "THB", "SGD",
  "MYR", "IDR", "PHP", "VND", "KRW", "TWD", "HKD", "NZD", "CLP", "COP",
  "PEN", "ARS", "UYU", "DOP", "JMD", "TTD", "XAF", "GHS", "TZS", "UGX",
  "RWF", "MUR", "SCR", "MVR", "LKR", "PKR", "BDT", "MMK", "KHR", "LAK",
];

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSave: (data: ServiceFormData) => void;
  initialData?: Partial<ServiceFormData>;
  isPending?: boolean;
  providerCountry?: string;
  providerCity?: string;
  orgId?: string;
  allowVideo?: boolean;
}

const emptyService: ServiceFormData = {
  title: "",
  description: "",
  category: "other",
  price: 0,
  currency: "EUR",
  price_type: "fixed",
  duration_minutes: null,
  country: "",
  city: "",
  location: "",
  max_capacity: 1,
  payment_stripe_link: "",
  payment_paypal_email: "",
  payment_custom_url: "",
  active: true,
  photo_urls: [],
  requires_id_document: false,
  source_contact_name: "",
  source_contact_phone: "",
  source_contact_email: "",
  source_contact_notes: "",
  time_slots: {},
  blocked_dates: [],
  contact_method: "message",
};

export default function ServiceForm({ open, onOpenChange, onSave, initialData, isPending, providerCountry, providerCity, orgId, allowVideo = false }: Props) {
  const [form, setForm] = useState<ServiceFormData>({
    ...emptyService,
    country: providerCountry || "",
    city: providerCity || "",
    ...initialData,
  });

  useEffect(() => {
    if (open) {
      setForm({
        ...emptyService,
        country: providerCountry || "",
        city: providerCity || "",
        ...initialData,
      });
    }
  }, [open, initialData, providerCountry, providerCity]);

  const update = <K extends keyof ServiceFormData>(k: K, v: ServiceFormData[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initialData ? "Edit Service" : "Add Service"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Title *</Label>
            <Input value={form.title} onChange={(e) => update("title", e.target.value)} placeholder="Service name" />
          </div>

          <div>
            <Label>Description</Label>
            <Textarea value={form.description} onChange={(e) => update("description", e.target.value)} rows={3} />
          </div>

          {/* Photos */}
          {orgId && (
            <ServicePhotoManager
              photos={form.photo_urls || []}
              onChange={(urls) => update("photo_urls", urls)}
              orgId={orgId}
              allowVideo={allowVideo}
            />
          )}

          <ServiceFormCategorySelector
            category={form.category}
            onCategoryChange={(v) => update("category", v)}
          />

          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>Price *</Label>
              <Input type="number" value={form.price || ""} onChange={(e) => update("price", e.target.value === "" ? 0 : Number(e.target.value))} />
            </div>
            <div>
              <Label>Currency</Label>
              <Select value={form.currency} onValueChange={(v) => update("currency", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                {CURRENCIES.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Type</Label>
              <Select value={form.price_type} onValueChange={(v) => update("price_type", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="fixed">Fixed</SelectItem>
                  <SelectItem value="hourly">Per Hour</SelectItem>
                  <SelectItem value="daily">Per Day</SelectItem>
                  <SelectItem value="quote">On Quote</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Duration (min)</Label>
              <Input type="number" value={form.duration_minutes || ""} onChange={(e) => update("duration_minutes", e.target.value ? Number(e.target.value) : null)} />
            </div>
            <div>
              <Label>Max Capacity</Label>
              <Input type="number" value={form.max_capacity || ""} onChange={(e) => update("max_capacity", e.target.value === "" ? 1 : Number(e.target.value))} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>Country</Label>
              <Input value={form.country} onChange={(e) => update("country", e.target.value)} />
            </div>
            <div>
              <Label>City</Label>
              <Input value={form.city} onChange={(e) => update("city", e.target.value)} />
            </div>
            <div>
              <Label>Location</Label>
              <Input value={form.location} onChange={(e) => update("location", e.target.value)} placeholder="Address or area" />
            </div>
          </div>

          {/* Source Contact - for intermediaries */}
          <div className="space-y-3 border-t border-border pt-4">
            <div className="flex items-center gap-2">
              <UserCircle className="h-4 w-4 text-accent" />
              <p className="text-sm font-medium text-foreground">Source / Provider Contact</p>
            </div>
            <p className="text-xs text-muted-foreground">Contact details of the actual service provider (visible on service card)</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Contact Name</Label>
                <Input value={form.source_contact_name || ""} onChange={(e) => update("source_contact_name", e.target.value)} placeholder="Provider name" />
              </div>
              <div>
                <Label>Contact Phone</Label>
                <Input value={form.source_contact_phone || ""} onChange={(e) => update("source_contact_phone", e.target.value)} placeholder="+33..." />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Contact Email</Label>
                <Input type="email" value={form.source_contact_email || ""} onChange={(e) => update("source_contact_email", e.target.value)} placeholder="provider@email.com" />
              </div>
              <div>
                <Label>Notes (internal)</Label>
                <Input value={form.source_contact_notes || ""} onChange={(e) => update("source_contact_notes", e.target.value)} placeholder="Internal notes..." />
              </div>
            </div>
          </div>

          {/* Contact Method */}
          <div>
            <Label>Contact Method</Label>
            <Select value={form.contact_method || "message"} onValueChange={(v) => update("contact_method", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="message">💬 In-App Message</SelectItem>
                <SelectItem value="phone">📞 Phone</SelectItem>
                <SelectItem value="email">📧 Email</SelectItem>
                <SelectItem value="whatsapp">💬 WhatsApp</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Availability Calendar */}
          <ServiceFormAvailabilityCalendar
            timeSlots={(form.time_slots || {}) as Record<string, string[]>}
            blockedDates={(form.blocked_dates || []) as string[]}
            onTimeSlotsChange={(slots) => update("time_slots", slots)}
            onBlockedDatesChange={(dates) => update("blocked_dates", dates)}
          />
          <div className="space-y-3 border-t border-border pt-4">
            <p className="text-sm font-medium text-foreground">Payment Links (override provider defaults)</p>
            <div>
              <Label>Stripe Link</Label>
              <Input value={form.payment_stripe_link} onChange={(e) => update("payment_stripe_link", e.target.value)} />
            </div>
            <div>
              <Label>PayPal Email</Label>
              <Input value={form.payment_paypal_email} onChange={(e) => update("payment_paypal_email", e.target.value)} />
            </div>
            <div>
              <Label>Custom Payment URL</Label>
              <Input value={form.payment_custom_url} onChange={(e) => update("payment_custom_url", e.target.value)} />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Switch checked={form.requires_id_document || false} onCheckedChange={(v) => update("requires_id_document", v)} />
            <Label>🪪 Require ID Document (Passport / CNI / Permit)</Label>
          </div>

          <div className="flex items-center gap-2">
            <Switch checked={form.active} onCheckedChange={(v) => update("active", v)} />
            <Label>Active</Label>
          </div>

          <Button className="w-full" disabled={!form.title || isPending} onClick={() => onSave(form)}>
            {isPending ? "Saving..." : initialData ? "Update Service" : "Create Service"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
