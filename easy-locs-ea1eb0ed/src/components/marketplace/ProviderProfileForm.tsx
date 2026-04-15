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
import { uploadMarketplaceFile } from "@/repositories/marketplace.repository";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";
import { getCountryEntryOrDefault } from "@/lib/global-country-registry";
import type { ProviderType } from "@/services/onboarding-providers.service";

interface ProviderFormData {
  provider_type: ProviderType;
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

const IBAN_PLACEHOLDERS: Record<string, string> = {
  FR: "FR76 1234 5678 9012 3456 7890 123",
  DE: "DE89 3704 0044 0532 0130 00",
  ES: "ES91 2100 0418 4502 0005 1332",
  IT: "IT60 X054 2811 1010 0000 0123 456",
  GB: "GB29 NWBK 6016 1331 9268 19",
  AE: "AE07 0331 2345 6789 0123 456",
  SA: "SA03 8000 0000 6080 1016 7519",
  CH: "CH93 0076 2011 6238 5295 7",
  BE: "BE68 5390 0754 7034",
  NL: "NL91 ABNA 0417 1643 00",
  US: "N/A",
};

const BIC_PLACEHOLDERS: Record<string, string> = {
  FR: "BNPAFRPP",
  DE: "COBADEFF",
  ES: "CAIXESBB",
  IT: "BCITITMM",
  GB: "NWBKGB2L",
  AE: "ABORAEAA",
  SA: "RJHISARI",
  CH: "UBSWCHZH",
};

const TAX_ID_PLACEHOLDERS: Record<string, string> = {
  FR: "FR12345678901",
  DE: "DE123456789",
  ES: "ESA12345678",
  IT: "IT12345678901",
  GB: "GB123456789",
  AE: "100123456700003",
  SA: "300012345600003",
  US: "12-3456789",
};

const BANK_NAME_PLACEHOLDERS: Record<string, string> = {
  FR: "BNP Paribas",
  DE: "Deutsche Bank",
  ES: "CaixaBank",
  IT: "Intesa Sanpaolo",
  GB: "NatWest",
  AE: "ADCB",
  SA: "Al Rajhi Bank",
};

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
  const { t } = useI18n();

  const countryEntry = getCountryEntryOrDefault(form.country || "FR");
  const phonePlaceholder = countryEntry.phoneFormat || "";
  const whatsappPlaceholder = `${countryEntry.phonePrefix}...`;
  const ibanPlaceholder = IBAN_PLACEHOLDERS[form.country] || IBAN_PLACEHOLDERS["FR"] || "";
  const bicPlaceholder = BIC_PLACEHOLDERS[form.country] || "";
  const taxIdPlaceholder = TAX_ID_PLACEHOLDERS[form.country] || "";
  const bankNamePlaceholder = BANK_NAME_PLACEHOLDERS[form.country] || "";

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
    try {
      const ext = file.name.split(".").pop();
      const path = `${orgId}/providers/${crypto.randomUUID()}.${ext}`;
      const url = await uploadMarketplaceFile("property-photos", path, file);
      setForm((f) => ({ ...f, avatar_url: url }));
      toast.success(t("provider.photo_uploaded"));
    } catch (err: any) {
      toast.error(t("common.error"));
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initialData ? t("provider.edit_title") : t("provider.create_title")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              {form.avatar_url ? (
                <AvatarImage src={form.avatar_url} alt={form.display_name} />
              ) : null}
              <AvatarFallback className="text-lg">{form.display_name?.charAt(0) || "P"}</AvatarFallback>
            </Avatar>
            <label className={`cursor-pointer inline-flex items-center gap-2 px-3 py-2 rounded-md border border-input text-sm hover:bg-muted transition-colors ${uploading ? "opacity-50 pointer-events-none" : ""}`}>
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
              {uploading ? t("common.loading") : t("provider.upload_photo")}
              <input type="file" accept="image/*" onChange={uploadAvatar} className="hidden" />
            </label>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant={form.provider_type === "individual" ? "default" : "outline"}
              className="w-full"
              onClick={() => update("provider_type", "individual")}
            >
              <User className="h-4 w-4 mr-2" /> {t("provider.individual")}
            </Button>
            <Button
              type="button"
              variant={form.provider_type === "company" ? "default" : "outline"}
              className="w-full"
              onClick={() => update("provider_type", "company")}
            >
              <Building2 className="h-4 w-4 mr-2" /> {t("provider.company")}
            </Button>
          </div>

          {form.provider_type === "company" && (
            <div>
              <Label>{t("provider.company_name")}</Label>
              <Input value={form.company_name} onChange={(e) => update("company_name", e.target.value)} />
            </div>
          )}

          <div>
            <Label>{t("provider.display_name")} *</Label>
            <Input value={form.display_name} onChange={(e) => update("display_name", e.target.value)} placeholder={t("provider.display_name_placeholder")} />
          </div>

          <div>
            <Label>{t("provider.bio")}</Label>
            <Textarea value={form.bio} onChange={(e) => update("bio", e.target.value)} placeholder={t("provider.bio_placeholder")} rows={3} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>{t("auth.email")}</Label>
              <Input type="email" value={form.email} onChange={(e) => update("email", e.target.value)} />
            </div>
            <div>
              <Label>{t("auth.phone")}</Label>
              <Input value={form.phone} onChange={(e) => update("phone", e.target.value)} placeholder={phonePlaceholder} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>{t("provider.whatsapp")}</Label>
              <Input value={form.whatsapp} onChange={(e) => update("whatsapp", e.target.value)} placeholder={whatsappPlaceholder} />
            </div>
            <div>
              <Label>{t("provider.website")}</Label>
              <Input value={form.website_url} onChange={(e) => update("website_url", e.target.value)} placeholder="https://..." />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>{t("boost.country")} *</Label>
              <Input value={form.country} onChange={(e) => update("country", e.target.value)} placeholder={countryEntry.code} />
            </div>
            <div>
              <Label>{t("boost.city")} *</Label>
              <Input value={form.city} onChange={(e) => update("city", e.target.value)} />
            </div>
            <div>
              <Label>{t("provider.address")}</Label>
              <Input value={form.address} onChange={(e) => update("address", e.target.value)} />
            </div>
          </div>

          <div>
            <Label>{t("provider.categories")}</Label>
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

          <div className="flex items-center justify-between border-t border-border pt-4">
            <div>
              <p className="text-sm font-medium text-foreground">{t("provider.enable_reviews")}</p>
              <p className="text-xs text-muted-foreground">{t("provider.enable_reviews_desc")}</p>
            </div>
            <Switch
              checked={(form as any).reviews_enabled || false}
              onCheckedChange={(v) => update("reviews_enabled" as any, v)}
            />
          </div>

          <div className="space-y-3 border-t border-border pt-4">
            <p className="text-sm font-medium text-foreground">{t("provider.payment_links")}</p>
            <div>
              <Label>{t("provider.stripe_link")}</Label>
              <Input value={form.payment_stripe_link} onChange={(e) => update("payment_stripe_link", e.target.value)} placeholder="https://buy.stripe.com/..." />
            </div>
            <div>
              <Label>{t("provider.paypal_email")}</Label>
              <Input value={form.payment_paypal_email} onChange={(e) => update("payment_paypal_email", e.target.value)} placeholder="pay@provider.com" />
            </div>
            <div>
              <Label>{t("provider.custom_payment_url")}</Label>
              <Input value={form.payment_custom_url} onChange={(e) => update("payment_custom_url", e.target.value)} placeholder="https://..." />
            </div>
          </div>

          <div className="space-y-3 border-t border-border pt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-accent" />
                <p className="text-sm font-medium text-foreground">{t("provider.invoicing")}</p>
              </div>
              <Switch
                checked={form.invoicing_enabled}
                onCheckedChange={(v) => update("invoicing_enabled", v)}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {form.invoicing_enabled ? t("provider.invoicing_enabled_desc") : t("provider.invoicing_disabled_desc")}
            </p>

            {form.invoicing_enabled && (
              <div className="space-y-3 pl-1 border-l-2 border-accent/20 ml-1">
                <div>
                  <Label>{t("provider.invoice_company")}</Label>
                  <Input
                    value={form.invoice_company_name}
                    onChange={(e) => update("invoice_company_name", e.target.value)}
                    placeholder={form.company_name || form.display_name || t("provider.invoice_company_placeholder")}
                  />
                </div>
                <div>
                  <Label>{t("provider.invoice_address")}</Label>
                  <Textarea
                    value={form.invoice_address}
                    onChange={(e) => update("invoice_address", e.target.value)}
                    placeholder={t("provider.invoice_address_placeholder")}
                    rows={2}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>{countryEntry.taxIdLabel || t("provider.tax_id")}</Label>
                    <Input
                      value={form.invoice_tax_id}
                      onChange={(e) => update("invoice_tax_id", e.target.value)}
                      placeholder={taxIdPlaceholder}
                    />
                  </div>
                  <div>
                    <Label>{t("provider.invoice_prefix")}</Label>
                    <Input
                      value={form.invoice_prefix}
                      onChange={(e) => update("invoice_prefix", e.target.value)}
                      placeholder="INV"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>{t("provider.tax_rate")}</Label>
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
                    <Label>{t("provider.tax_label")}</Label>
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

          <div className="space-y-3 border-t border-border pt-4">
            <p className="text-sm font-medium text-foreground">{t("provider.bank_details")}</p>
            <p className="text-xs text-muted-foreground">{t("provider.bank_details_desc")}</p>
            <div>
              <Label>{t("provider.bank_holder")}</Label>
              <Input value={form.bank_holder} onChange={(e) => update("bank_holder", e.target.value)} placeholder={form.company_name || form.display_name || ""} />
            </div>
            <div>
              <Label>{t("provider.iban")}</Label>
              <Input value={form.bank_iban} onChange={(e) => update("bank_iban", e.target.value)} placeholder={ibanPlaceholder} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>{t("provider.bic")}</Label>
                <Input value={form.bank_bic} onChange={(e) => update("bank_bic", e.target.value)} placeholder={bicPlaceholder} />
              </div>
              <div>
                <Label>{t("provider.bank_name")}</Label>
                <Input value={form.bank_name} onChange={(e) => update("bank_name", e.target.value)} placeholder={bankNamePlaceholder} />
              </div>
            </div>
          </div>

          <Button className="w-full" disabled={!form.display_name || !form.country || !form.city || isPending} onClick={() => onSave(form)}>
            {isPending ? t("common.loading") : initialData ? t("provider.update") : t("provider.create")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
