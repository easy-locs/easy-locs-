import { useState, useEffect } from "react";
import { Settings, User, ArrowUpCircle, Lock, Save, Loader2, Phone, Mail, MapPin, Globe, MessageCircle } from "lucide-react";
import ClientLayout from "@/components/client/ClientLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import CountrySelect from "@/components/ui/CountrySelect";
import { toast } from "sonner";

interface ProfileForm {
  first_name: string;
  last_name: string;
  phone: string;
  whatsapp_number: string;
  telegram_username: string;
  address: string;
  postal_code: string;
  city: string;
  country: string;
}

const PRO_FEATURES = [
  "Signature électronique",
  "Facturation & comptabilité",
  "Gestion des baux",
  "Gestion locative complète",
  "Documents juridiques",
  "Synchronisation calendrier (OTA)",
];

const ClientSettings = () => {
  const { user } = useAuth();
  const { t } = useI18n();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<ProfileForm>({
    first_name: "", last_name: "", phone: "",
    whatsapp_number: "", telegram_username: "",
    address: "", postal_code: "", city: "", country: "",
  });

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("first_name, last_name, phone, whatsapp_number, telegram_username, address, postal_code, city, country")
        .eq("id", user.id)
        .single();
      if (data) {
        setForm({
          first_name: data.first_name || "",
          last_name: data.last_name || "",
          phone: data.phone || "",
          whatsapp_number: data.whatsapp_number || "",
          telegram_username: data.telegram_username || "",
          address: data.address || "",
          postal_code: data.postal_code || "",
          city: data.city || "",
          country: data.country || "",
        });
      }
      setLoading(false);
    };
    load();
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        first_name: form.first_name.trim() || null,
        last_name: form.last_name.trim() || null,
        phone: form.phone.trim() || null,
        whatsapp_number: form.whatsapp_number.trim() || null,
        telegram_username: form.telegram_username.trim() || null,
        address: form.address.trim() || null,
        postal_code: form.postal_code.trim() || null,
        city: form.city.trim() || null,
        country: form.country || null,
      })
      .eq("id", user.id);
    setSaving(false);
    if (error) {
      toast.error(t("settings.save_error") || "Failed to save");
    } else {
      toast.success(t("settings.save_success") || "Profile saved");
    }
  };

  const up = (field: keyof ProfileForm, value: string) => setForm(f => ({ ...f, [field]: value }));

  return (
    <ClientLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold text-foreground">{t("nav.settings") || "Settings"}</h1>

        {/* Account info */}
        <div className="bg-card rounded-xl p-5 shadow-card border border-border/50">
          <div className="flex items-center gap-3 mb-4">
            <User className="h-5 w-5 text-muted-foreground" />
            <h2 className="font-semibold text-foreground">{t("settings.account") || "Account"}</h2>
          </div>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Email</span>
              <span className="text-foreground">{user?.email}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t("settings.account_type") || "Account type"}</span>
              <span className="text-foreground font-medium">Client (Free)</span>
            </div>
          </div>
        </div>

        {/* Profile form — FREE */}
        <div className="bg-card rounded-xl p-5 shadow-card border border-border/50">
          <div className="flex items-center gap-3 mb-5">
            <Settings className="h-5 w-5 text-muted-foreground" />
            <h2 className="font-semibold text-foreground">{t("settings.my_profile") || "My Profile"}</h2>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-5">
              {/* Name */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">{t("form.first_name") || "First name"}</Label>
                  <Input value={form.first_name} onChange={e => up("first_name", e.target.value)} placeholder="Jean" />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">{t("form.last_name") || "Last name"}</Label>
                  <Input value={form.last_name} onChange={e => up("last_name", e.target.value)} placeholder="Dupont" />
                </div>
              </div>

              <Separator />

              {/* Contact */}
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  {t("form.contact") || "Contact"}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs text-muted-foreground">{t("form.phone") || "Phone"}</Label>
                    <Input value={form.phone} onChange={e => up("phone", e.target.value)} placeholder="+33 6 12 34 56 78" type="tel" />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">WhatsApp</Label>
                    <Input value={form.whatsapp_number} onChange={e => up("whatsapp_number", e.target.value)} placeholder="+33 6 12 34 56 78" type="tel" />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Telegram</Label>
                    <Input value={form.telegram_username} onChange={e => up("telegram_username", e.target.value)} placeholder="@username" />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Address */}
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  {t("form.address") || "Address"}
                </h3>
                <div className="space-y-3">
                  <div>
                    <Label className="text-xs text-muted-foreground">{t("form.street") || "Street address"}</Label>
                    <Input value={form.address} onChange={e => up("address", e.target.value)} placeholder="123 Rue de la Paix" />
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <div>
                      <Label className="text-xs text-muted-foreground">{t("form.postal_code") || "Postal code"}</Label>
                      <Input value={form.postal_code} onChange={e => up("postal_code", e.target.value)} placeholder="75001" />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">{t("form.city") || "City"}</Label>
                      <Input value={form.city} onChange={e => up("city", e.target.value)} placeholder="Paris" />
                    </div>
                    <div className="col-span-2 sm:col-span-1">
                      <Label className="text-xs text-muted-foreground">{t("form.country") || "Country"}</Label>
                      <CountrySelect value={form.country} onValueChange={v => up("country", v)} />
                    </div>
                  </div>
                </div>
              </div>

              <Button onClick={handleSave} disabled={saving} className="w-full sm:w-auto gap-2">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {t("form.save") || "Save"}
              </Button>
            </div>
          )}
        </div>

        {/* Pro features locked */}
        <div className="bg-card rounded-xl p-5 shadow-card border border-border/50 opacity-75">
          <div className="flex items-center gap-3 mb-4">
            <Lock className="h-5 w-5 text-muted-foreground" />
            <h2 className="font-semibold text-foreground">{t("settings.pro_features") || "Pro Features"}</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {PRO_FEATURES.map(f => (
              <div key={f} className="flex items-center gap-2 text-sm text-muted-foreground">
                <Lock className="h-3 w-3 shrink-0" />
                <span>{f}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Upgrade CTA */}
        <div className="bg-gradient-to-br from-primary/5 to-accent/5 rounded-xl p-6 border border-primary/20">
          <div className="flex items-center gap-3 mb-3">
            <ArrowUpCircle className="h-5 w-5 text-primary" />
            <h2 className="font-semibold text-foreground">{t("settings.upgrade") || "Upgrade to Pro"}</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            {t("settings.upgrade_desc") || "Publish your own listings, manage properties, and access all professional tools."}
          </p>
          <Link
            to="/onboarding"
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            {t("settings.upgrade_cta") || "Start as Pro"}
          </Link>
        </div>
      </div>
    </ClientLayout>
  );
};

export default ClientSettings;
