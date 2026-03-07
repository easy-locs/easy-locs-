import { useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { getCountryConfig } from "@/lib/country-config";
import { Home, ArrowLeft, MapPin } from "lucide-react";
import AddressAutocomplete, { type AddressResult } from "@/components/ui/AddressAutocomplete";
import CountrySelect from "@/components/ui/CountrySelect";

const defaultForm = {
  label: "", address: "", postal_code: "", city: "", property_type: "apartment",
  surface: 0, rooms: 0, heating: "individual-gas", furnished: false,
  monthly_rent: 0, monthly_charges: 0, deposit_amount: 0, notes: "",
  floor: undefined as number | undefined,
  building_name: "", lot_number: "", country: "FR",
};

const AddProperty = () => {
  const { user, orgId, userCountry } = useAuth();
  const { toast } = useToast();
  const { t } = useI18n();
  const navigate = useNavigate();

  const [form, setForm] = useState({ ...defaultForm, country: userCountry || "FR" });
  const [saving, setSaving] = useState(false);
  const [postalSuggestions, setPostalSuggestions] = useState<{ city: string; code: string }[]>([]);
  const [showPostalSuggestions, setShowPostalSuggestions] = useState(false);

  const cc = useMemo(() => getCountryConfig(form.country), [form.country]);
  const L = cc.labels;

  const handlePostalCodeChange = async (value: string) => {
    setForm(prev => ({ ...prev, postal_code: value }));
    if (form.country === "FR" && value.length === 5) {
      try {
        const res = await fetch(`https://geo.api.gouv.fr/communes?codePostal=${value}&fields=nom,codesPostaux&limit=10`);
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setPostalSuggestions(data.map((c: any) => ({ city: c.nom, code: value })));
          setShowPostalSuggestions(true);
        }
      } catch { /* ignore */ }
    } else {
      setShowPostalSuggestions(false);
    }
  };

  const handleSave = async () => {
    if (!form.label.trim()) {
      toast({ title: t("page.rental.error"), description: t("page.rental.property_name_required"), variant: "destructive" });
      return;
    }
    if (!orgId || !user) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("properties").insert({
        org_id: orgId, user_id: user.id,
        label: form.label.trim(), address: form.address, postal_code: form.postal_code,
        city: form.city, property_type: form.property_type, surface: form.surface,
        rooms: form.rooms, floor: form.floor ?? null, heating: form.heating,
        furnished: form.furnished, monthly_rent: form.monthly_rent,
        monthly_charges: form.monthly_charges, deposit_amount: form.deposit_amount,
        notes: form.notes, building_name: form.building_name || null,
        lot_number: form.lot_number || null, country: form.country,
      });
      if (error) throw error;
      toast({ title: t("page.rental.property_saved") || "Bien enregistré !" });
      // Navigate to the country workspace for the new property
      navigate(`/dashboard/country/${form.country.toLowerCase()}`);
    } catch (err: any) {
      toast({ title: t("page.rental.error"), description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const inputClass = "w-full bg-muted/50 border border-border/50 rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent";

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto">
        {/* Back */}
        <button onClick={() => navigate("/dashboard")} className="text-sm text-accent hover:underline mb-4 flex items-center gap-1">
          <ArrowLeft className="h-3.5 w-3.5" /> {t("page.dashboard.world_map") || "Tableau de bord"}
        </button>

        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <div className="w-12 h-12 rounded-xl bg-gradient-gold flex items-center justify-center shrink-0">
            <Home className="h-6 w-6 text-accent-foreground" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">
              {t("page.rental.add_property") || "Ajouter un bien"}
            </h1>
            <p className="text-sm text-muted-foreground">
              {t("page.add_property.subtitle") || "Enregistrez un nouveau bien avec son pays de rattachement"}
            </p>
          </div>
        </div>

        {/* Form */}
        <div className="bg-card rounded-xl p-6 shadow-card border border-border/50 space-y-5">
          {/* Country — prominent */}
          <div className="bg-accent/5 border border-accent/20 rounded-xl p-4">
            <label className="block text-xs font-semibold text-accent mb-2">{L.country} *</label>
            <CountrySelect value={form.country} onChange={(code) => setForm(prev => ({ ...prev, country: code }))} />
            <p className="text-xs text-muted-foreground mt-1.5">
              {t("page.add_property.country_hint") || "Le pays détermine la législation, la devise et les modèles de documents applicables."}
            </p>
          </div>

          {/* Name / Building / Lot */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">{L.propertyName} *</label>
              <input value={form.label} onChange={(e) => setForm(prev => ({ ...prev, label: e.target.value }))} className={inputClass} placeholder="Ex: Studio Rivoli" />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">{L.building}</label>
              <input value={form.building_name} onChange={(e) => setForm(prev => ({ ...prev, building_name: e.target.value }))} className={inputClass} />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">{L.lotNumber}</label>
              <input value={form.lot_number} onChange={(e) => setForm(prev => ({ ...prev, lot_number: e.target.value }))} className={inputClass} />
            </div>
          </div>

          {/* Type */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">{L.propertyType}</label>
              <select value={form.property_type} onChange={(e) => setForm(prev => ({ ...prev, property_type: e.target.value }))} className={inputClass}>
                {cc.propertyTypes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">{L.heating}</label>
              <select value={form.heating} onChange={(e) => setForm(prev => ({ ...prev, heating: e.target.value }))} className={inputClass}>
                {cc.heatingTypes.map(h => <option key={h.value} value={h.value}>{h.label}</option>)}
              </select>
            </div>
          </div>

          {/* Address */}
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">{L.address}</label>
            <AddressAutocomplete
              value={form.address}
              onChange={(val) => setForm(prev => ({ ...prev, address: val }))}
              onSelect={(result: AddressResult) => {
                const fullAddr = result.housenumber && result.street
                  ? `${result.housenumber} ${result.street}`
                  : result.street || result.label || "";
                setForm(prev => ({ ...prev, address: fullAddr.trim(), postal_code: result.postcode || "", city: result.city || "" }));
              }}
              countryCode={form.country}
            />
          </div>

          {/* Postal / City */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="relative">
              <label className="block text-xs font-medium text-muted-foreground mb-1">{L.postalCode}</label>
              <input value={form.postal_code} onChange={(e) => handlePostalCodeChange(e.target.value)} className={inputClass} />
              {showPostalSuggestions && postalSuggestions.length > 0 && (
                <div className="absolute z-10 mt-1 w-full bg-card border border-border rounded-lg shadow-lg max-h-32 overflow-y-auto">
                  {postalSuggestions.map((s, i) => (
                    <button key={i} onClick={() => { setForm(prev => ({ ...prev, city: s.city })); setShowPostalSuggestions(false); }}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-muted/50 transition-colors">{s.city}</button>
                  ))}
                </div>
              )}
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">{L.city}</label>
              <input value={form.city} onChange={(e) => setForm(prev => ({ ...prev, city: e.target.value }))} className={inputClass} />
            </div>
          </div>

          {/* Surface / Rooms / Floor */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">{L.surface} ({cc.surfaceUnit})</label>
              <input type="number" value={form.surface || ""} onChange={(e) => setForm(prev => ({ ...prev, surface: +e.target.value }))} className={inputClass} />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">{L.rooms}</label>
              <input type="number" value={form.rooms || ""} onChange={(e) => setForm(prev => ({ ...prev, rooms: +e.target.value }))} className={inputClass} />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">{L.floor}</label>
              <input type="number" value={form.floor ?? ""} onChange={(e) => setForm(prev => ({ ...prev, floor: e.target.value ? +e.target.value : undefined }))} className={inputClass} />
            </div>
          </div>

          {/* Furnished */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.furnished} onChange={(e) => setForm(prev => ({ ...prev, furnished: e.target.checked }))} className="rounded border-border" />
            <span className="text-sm text-foreground">{L.furnished}</span>
          </label>

          {/* Rent / Charges / Deposit */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">{L.rent} ({cc.currencySymbol})</label>
              <input type="number" value={form.monthly_rent || ""} onChange={(e) => setForm(prev => ({ ...prev, monthly_rent: +e.target.value }))} className={inputClass} />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">{L.charges} ({cc.currencySymbol})</label>
              <input type="number" value={form.monthly_charges || ""} onChange={(e) => setForm(prev => ({ ...prev, monthly_charges: +e.target.value }))} className={inputClass} />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">{L.deposit} ({cc.currencySymbol})</label>
              <input type="number" value={form.deposit_amount || ""} onChange={(e) => setForm(prev => ({ ...prev, deposit_amount: +e.target.value }))} className={inputClass} />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">{L.notes}</label>
            <textarea value={form.notes} onChange={(e) => setForm(prev => ({ ...prev, notes: e.target.value }))} rows={2} className={inputClass} />
          </div>

          {/* Submit */}
          <button onClick={handleSave} disabled={saving} className="bg-gradient-gold text-accent-foreground text-sm font-semibold px-8 py-3 rounded-lg shadow-gold hover:opacity-90 transition-opacity disabled:opacity-50 w-full sm:w-auto">
            {saving ? "..." : (t("page.rental.add_property") || "Ajouter le bien")}
          </button>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AddProperty;
