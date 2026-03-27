import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { MARKETPLACE_CATEGORIES } from "@/lib/taxonomy/category-tree";
import { Building2, User, ImagePlus, Loader2, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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
  avatar_url: string;
  invoicing_enabled: boolean;
  invoice_company_name: string;
  invoice_address: string;
  invoice_tax_id: string;
  invoice_prefix: string;
  invoice_next_number: number;
  bank_iban: string;
  bank_bic: string;
  bank_holder: string;
  bank_name: string;
  tax_rate: number;
  tax_label: string;
  reviews_enabled: boolean;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSave: (data: ProviderFormData) => void;
  initialData?: Partial<ProviderFormData>;
  isPending?: boolean;
  orgId?: string;
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
  avatar_url: "",
  invoicing_enabled: false,
  invoice_company_name: "",
  invoice_address: "",
  invoice_tax_id: "",
  invoice_prefix: "INV",
  invoice_next_number: 1,
  bank_iban: "",
  bank_bic: "",
  bank_holder: "",
  bank_name: "",
  tax_rate: 0,
  tax_label: "VAT",
  reviews_enabled: false,
};

export default function ProviderProfileForm({ open, onOpenChange, onSave, initialData, isPending, orgId }: Props) {
  const [form, setForm] = useState<ProviderFormData>({ ...emptyForm, ...initialData });
  const [uploading, setUploading] = useState(false);

  const toggleCategory = (cat: string) => {
    setForm((f) => ({
      ...f,
      categories: f.categories.includes(cat)
        ? f.categories.filter((c) => c !== cat)
        : [...f.categories, cat],
    }));
  };

  const update = (field: keyof ProviderFormData, value: string | boolean | number) =>
    setForm((f) => ({ ...f, [field]: value }));

  const uploadAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !orgId) return;
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${orgId}/providers/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("property-photos").upload(path, file, { upsert: true });
    if (error) {
      toast.error(`Upload failed: ${error.message}`);
      setUploading(false);
      return;
    }
    const { data: urlData } = supabase.storage.from("property-photos").getPublicUrl(path);
    setForm((f) => ({ ...f, avatar_url: urlData.publicUrl }));
    setUploading(false);
    toast.success("Photo uploaded!");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initialData ? "Edit Provider Profile" : "Create Provider Profile"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* Avatar */}
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              {form.avatar_url ? (
                <AvatarImage src={form.avatar_url} alt={form.display_name} />
              ) : null}
              <AvatarFallback className="text-lg">{form.display_name?.charAt(0) || "P"}</AvatarFallback>
            </Avatar>
            <label className={`cursor-pointer inline-flex items-center gap-2 px-3 py-2 rounded-md border border-input text-sm hover:bg-muted transition-colors ${uploading ? "opacity-50 pointer-events-none" : ""}`}>
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
              {uploading ? "Uploading..." : "Upload Photo"}
              <input type="file" accept="image/*" onChange={uploadAvatar} className="hidden" />
            </label>
          </div>

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

          {/* Reviews Toggle */}
          <div className="flex items-center justify-between border-t border-border pt-4">
            <div>
              <p className="text-sm font-medium text-foreground">⭐ Enable Reviews</p>
              <p className="text-xs text-muted-foreground">Allow customers to leave reviews on your services</p>
            </div>
            <Switch
              checked={(form as any).reviews_enabled || false}
              onCheckedChange={(v) => update("reviews_enabled" as any, v)}
            />
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

          {/* Invoicing Section */}
          <div className="space-y-3 border-t border-border pt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-accent" />
                <p className="text-sm font-medium text-foreground">Invoicing</p>
              </div>
              <Switch
                checked={form.invoicing_enabled}
                onCheckedChange={(v) => update("invoicing_enabled", v)}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {form.invoicing_enabled ? "Invoices will be generated for confirmed bookings" : "Enable to generate invoices for your services"}
            </p>

            {form.invoicing_enabled && (
              <div className="space-y-3 pl-1 border-l-2 border-accent/20 ml-1">
                <div>
                  <Label>Invoice Company / Name</Label>
                  <Input
                    value={form.invoice_company_name}
                    onChange={(e) => update("invoice_company_name", e.target.value)}
                    placeholder={form.company_name || form.display_name || "Company name on invoice"}
                  />
                </div>
                <div>
                  <Label>Invoice Address</Label>
                  <Textarea
                    value={form.invoice_address}
                    onChange={(e) => update("invoice_address", e.target.value)}
                    placeholder="Full address for the invoice"
                    rows={2}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Tax / VAT ID</Label>
                    <Input
                      value={form.invoice_tax_id}
                      onChange={(e) => update("invoice_tax_id", e.target.value)}
                      placeholder="FR12345678901"
                    />
                  </div>
                  <div>
                    <Label>Invoice Prefix</Label>
                    <Input
                      value={form.invoice_prefix}
                      onChange={(e) => update("invoice_prefix", e.target.value)}
                      placeholder="INV"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Tax Rate (%)</Label>
                    <Input
                      type="number"
                      value={form.tax_rate || ""}
                      onChange={(e) => update("tax_rate", Number(e.target.value))}
                      placeholder="20"
                      min={0}
                      max={100}
                      step={0.5}
                    />
                  </div>
                  <div>
                    <Label>Tax Label</Label>
                    <Input
                      value={form.tax_label}
                      onChange={(e) => update("tax_label", e.target.value)}
                      placeholder="VAT / TVA / IVA..."
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Bank Details Section */}
          <div className="space-y-3 border-t border-border pt-4">
            <p className="text-sm font-medium text-foreground">🏦 Bank Details (Wire Transfer)</p>
            <p className="text-xs text-muted-foreground">Displayed on invoices for bank transfer payments</p>
            <div>
              <Label>Account Holder</Label>
              <Input value={form.bank_holder} onChange={(e) => update("bank_holder", e.target.value)} placeholder="John Doe / Company Name" />
            </div>
            <div>
              <Label>IBAN</Label>
              <Input value={form.bank_iban} onChange={(e) => update("bank_iban", e.target.value)} placeholder="FR76 1234 5678 9012 3456 7890 123" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>BIC / SWIFT</Label>
                <Input value={form.bank_bic} onChange={(e) => update("bank_bic", e.target.value)} placeholder="BNPAFRPP" />
              </div>
              <div>
                <Label>Bank Name</Label>
                <Input value={form.bank_name} onChange={(e) => update("bank_name", e.target.value)} placeholder="BNP Paribas" />
              </div>
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
