import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { MARKETPLACE_CATEGORIES } from "./MarketplaceCategories";
import { Building2, User } from "lucide-react";

interface ProviderFormData {
  provider_type: string;
  company_name: string;
  display_name: string;
  bio: string;
  email: string;
  phone: string;
  whatsapp: string;
  website_url: string;
  country: string;
  city: string;
  address: string;
  categories: string[];
  payment_stripe_link: string;
  payment_paypal_email: string;
  payment_custom_url: string;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSave: (data: ProviderFormData) => void;
  initialData?: Partial<ProviderFormData>;
  isPending?: boolean;
}

const emptyForm: ProviderFormData = {
  provider_type: "individual",
  company_name: "",
  display_name: "",
  bio: "",
  email: "",
  phone: "",
  whatsapp: "",
  website_url: "",
  country: "",
  city: "",
  address: "",
  categories: [],
  payment_stripe_link: "",
  payment_paypal_email: "",
  payment_custom_url: "",
};

export default function ProviderProfileForm({ open, onOpenChange, onSave, initialData, isPending }: Props) {
  const [form, setForm] = useState<ProviderFormData>({ ...emptyForm, ...initialData });

  const toggleCategory = (cat: string) => {
    setForm((f) => ({
      ...f,
      categories: f.categories.includes(cat)
        ? f.categories.filter((c) => c !== cat)
        : [...f.categories, cat],
    }));
  };

  const update = (field: keyof ProviderFormData, value: string) =>
    setForm((f) => ({ ...f, [field]: value }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initialData ? "Edit Provider Profile" : "Create Provider Profile"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* Type */}
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant={form.provider_type === "individual" ? "default" : "outline"}
              className="w-full"
              onClick={() => update("provider_type", "individual")}
            >
              <User className="h-4 w-4 mr-2" /> Individual
            </Button>
            <Button
              type="button"
              variant={form.provider_type === "company" ? "default" : "outline"}
              className="w-full"
              onClick={() => update("provider_type", "company")}
            >
              <Building2 className="h-4 w-4 mr-2" /> Company
            </Button>
          </div>

          {form.provider_type === "company" && (
            <div>
              <Label>Company Name</Label>
              <Input value={form.company_name} onChange={(e) => update("company_name", e.target.value)} />
            </div>
          )}

          <div>
            <Label>Display Name *</Label>
            <Input value={form.display_name} onChange={(e) => update("display_name", e.target.value)} placeholder="Your public name" />
          </div>

          <div>
            <Label>Bio / Description</Label>
            <Textarea value={form.bio} onChange={(e) => update("bio", e.target.value)} placeholder="Tell clients about your services..." rows={3} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Email</Label>
              <Input type="email" value={form.email} onChange={(e) => update("email", e.target.value)} />
            </div>
            <div>
              <Label>Phone</Label>
              <Input value={form.phone} onChange={(e) => update("phone", e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>WhatsApp</Label>
              <Input value={form.whatsapp} onChange={(e) => update("whatsapp", e.target.value)} placeholder="+33..." />
            </div>
            <div>
              <Label>Website</Label>
              <Input value={form.website_url} onChange={(e) => update("website_url", e.target.value)} placeholder="https://..." />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>Country *</Label>
              <Input value={form.country} onChange={(e) => update("country", e.target.value)} placeholder="FR" />
            </div>
            <div>
              <Label>City *</Label>
              <Input value={form.city} onChange={(e) => update("city", e.target.value)} />
            </div>
            <div>
              <Label>Address</Label>
              <Input value={form.address} onChange={(e) => update("address", e.target.value)} />
            </div>
          </div>

          {/* Categories */}
          <div>
            <Label>Service Categories</Label>
            <div className="flex flex-wrap gap-2 mt-1">
              {MARKETPLACE_CATEGORIES.map((c) => (
                <Badge
                  key={c.value}
                  variant={form.categories.includes(c.value) ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => toggleCategory(c.value)}
                >
                  {c.icon} {c.label}
                </Badge>
              ))}
            </div>
          </div>

          {/* Payment Links */}
          <div className="space-y-3 border-t border-border pt-4">
            <p className="text-sm font-medium text-foreground">Payment Links (sent to clients)</p>
            <div>
              <Label>Stripe Payment Link</Label>
              <Input value={form.payment_stripe_link} onChange={(e) => update("payment_stripe_link", e.target.value)} placeholder="https://buy.stripe.com/..." />
            </div>
            <div>
              <Label>PayPal Email</Label>
              <Input value={form.payment_paypal_email} onChange={(e) => update("payment_paypal_email", e.target.value)} placeholder="pay@provider.com" />
            </div>
            <div>
              <Label>Custom Payment URL</Label>
              <Input value={form.payment_custom_url} onChange={(e) => update("payment_custom_url", e.target.value)} placeholder="https://..." />
            </div>
          </div>

          <Button className="w-full" disabled={!form.display_name || !form.country || !form.city || isPending} onClick={() => onSave(form)}>
            {isPending ? "Saving..." : initialData ? "Update Profile" : "Create Profile"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
