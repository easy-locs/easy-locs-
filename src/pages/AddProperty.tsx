import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { getCountryConfig } from "@/lib/country-config";
import { Home, ArrowLeft, Building2, Ruler, Thermometer, Car, Trees, Sun, Zap, Waves, DoorOpen } from "lucide-react";
import AddressAutocomplete, { type AddressResult } from "@/components/ui/AddressAutocomplete";
import CountrySelect from "@/components/ui/CountrySelect";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

const SURFACE_UNITS = [
  { value: "sqm", label: "m²" },
  { value: "sqft", label: "ft²" },
];

const ENERGY_CLASSES = ["A", "B", "C", "D", "E", "F", "G"];

const LISTING_PURPOSES = [
  { value: "long_term", label: "Location longue durée", icon: "🏠" },
  { value: "seasonal", label: "Location saisonnière", icon: "🌴" },
  { value: "sale", label: "Vente", icon: "💰" },
  { value: "mixed", label: "Mixte (Long terme + Saisonnier)", icon: "🔄" },
];

const defaultForm = {
  label: "", address: "", postal_code: "", city: "", property_type: "apartment",
  surface: 0, rooms: 0, heating: "individual-gas", furnished: false,
  monthly_rent: 0, monthly_charges: 0, deposit_amount: 0, notes: "",
  floor: undefined as number | undefined,
  building_name: "", lot_number: "", country: "FR",
  bedrooms: 0, bathrooms: 0, surface_unit: "sqm",
  energy_class: "", parking: false, garden: false, terrace: false,
  elevator: false, balcony: false, pool: false,
  year_built: undefined as number | undefined,
  description: "", listing_purpose: "long_term",
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

  const set = (patch: Partial<typeof form>) => setForm(prev => ({ ...prev, ...patch }));

  const handlePostalCodeChange = async (value: string) => {
    set({ postal_code: value });
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
        bedrooms: form.bedrooms, bathrooms: form.bathrooms,
        surface_unit: form.surface_unit, energy_class: form.energy_class || null,
        parking: form.parking, garden: form.garden, terrace: form.terrace,
        elevator: form.elevator, balcony: form.balcony, pool: form.pool,
        year_built: form.year_built ?? null,
        description: form.description, listing_purpose: form.listing_purpose,
      } as any);
      if (error) throw error;
      toast({ title: t("page.rental.property_saved") || "Bien enregistré !" });
      navigate(`/dashboard/country/${form.country.toLowerCase()}`);
    } catch (err: any) {
      toast({ title: t("page.rental.error"), description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const selectClass = "w-full bg-muted/50 border border-border/50 rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent";

  const SectionTitle = ({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) => (
    <div className="flex items-center gap-2 pt-4 pb-1 border-b border-border/30">
      {icon}
      <h3 className="text-sm font-semibold text-foreground">{children}</h3>
    </div>
  );

  const ToggleRow = ({ label, icon, checked, onChange }: { label: string; icon: React.ReactNode; checked: boolean; onChange: (v: boolean) => void }) => (
    <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
      <div className="flex items-center gap-2 text-sm text-foreground">{icon} {label}</div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto pb-12">
        <button onClick={() => navigate("/dashboard")} className="text-sm text-accent hover:underline mb-4 flex items-center gap-1">
          <ArrowLeft className="h-3.5 w-3.5" /> {t("page.dashboard.world_map") || "Tableau de bord"}
        </button>

        <div className="flex items-center gap-4 mb-8">
          <div className="w-12 h-12 rounded-xl bg-gradient-gold flex items-center justify-center shrink-0">
            <Home className="h-6 w-6 text-accent-foreground" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">{t("page.rental.add_property") || "Ajouter un bien"}</h1>
            <p className="text-sm text-muted-foreground">{t("page.add_property.subtitle") || "Renseignez tous les détails pour publier votre annonce"}</p>
          </div>
        </div>

        <div className="bg-card rounded-xl p-6 shadow-card border border-border/50 space-y-5">

          {/* ── Country ── */}
          <div className="bg-accent/5 border border-accent/20 rounded-xl p-4">
            <label className="block text-xs font-semibold text-accent mb-2">{L.country} *</label>
            <CountrySelect value={form.country} onChange={(code) => set({ country: code })} />
            <p className="text-xs text-muted-foreground mt-1.5">
              {t("page.add_property.country_hint") || "Le pays détermine la législation, la devise et les modèles."}
            </p>
          </div>

          {/* ── Listing purpose ── */}
          <div>
            <label className="block text-xs font-semibold text-foreground mb-2">Catégorie d'annonce *</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {LISTING_PURPOSES.map(lp => (
                <button key={lp.value} type="button"
                  onClick={() => set({ listing_purpose: lp.value })}
                  className={`p-3 rounded-lg border text-sm font-medium text-center transition-all ${
                    form.listing_purpose === lp.value
                      ? "border-accent bg-accent/10 text-accent shadow-sm"
                      : "border-border/50 bg-muted/30 text-muted-foreground hover:bg-muted/50"
                  }`}>
                  <span className="text-lg block mb-1">{lp.icon}</span>
                  {lp.label}
                </button>
              ))}
            </div>
          </div>

          {/* ── Name / Building / Lot ── */}
          <SectionTitle icon={<Building2 className="h-4 w-4 text-muted-foreground" />}>Identification</SectionTitle>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <Label className="text-xs">{L.propertyName} *</Label>
              <Input value={form.label} onChange={(e) => set({ label: e.target.value })} placeholder="Ex: Studio Rivoli" />
            </div>
            <div>
              <Label className="text-xs">{L.building}</Label>
              <Input value={form.building_name} onChange={(e) => set({ building_name: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs">{L.lotNumber}</Label>
              <Input value={form.lot_number} onChange={(e) => set({ lot_number: e.target.value })} />
            </div>
          </div>

          {/* ── Type / Heating ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label className="text-xs">{L.propertyType}</Label>
              <select value={form.property_type} onChange={(e) => set({ property_type: e.target.value })} className={selectClass}>
                {cc.propertyTypes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <Label className="text-xs">{L.heating}</Label>
              <select value={form.heating} onChange={(e) => set({ heating: e.target.value })} className={selectClass}>
                {cc.heatingTypes.map(h => <option key={h.value} value={h.value}>{h.label}</option>)}
              </select>
            </div>
          </div>

          {/* ── Address ── */}
          <SectionTitle icon={<DoorOpen className="h-4 w-4 text-muted-foreground" />}>Localisation</SectionTitle>
          <div>
            <Label className="text-xs">{L.address}</Label>
            <AddressAutocomplete
              value={form.address}
              onChange={(val) => set({ address: val })}
              onSelect={(result: AddressResult) => {
                const fullAddr = result.housenumber && result.street
                  ? `${result.housenumber} ${result.street}`
                  : result.street || result.label || "";
                set({ address: fullAddr.trim(), postal_code: result.postcode || "", city: result.city || "" });
              }}
              countryCode={form.country}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="relative">
              <Label className="text-xs">{L.postalCode}</Label>
              <Input value={form.postal_code} onChange={(e) => handlePostalCodeChange(e.target.value)} />
              {showPostalSuggestions && postalSuggestions.length > 0 && (
                <div className="absolute z-10 mt-1 w-full bg-card border border-border rounded-lg shadow-lg max-h-32 overflow-y-auto">
                  {postalSuggestions.map((s, i) => (
                    <button key={i} onClick={() => { set({ city: s.city }); setShowPostalSuggestions(false); }}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-muted/50 transition-colors">{s.city}</button>
                  ))}
                </div>
              )}
            </div>
            <div>
              <Label className="text-xs">{L.city}</Label>
              <Input value={form.city} onChange={(e) => set({ city: e.target.value })} />
            </div>
          </div>

          {/* ── Surface / Rooms / Bedrooms / Bathrooms / Floor ── */}
          <SectionTitle icon={<Ruler className="h-4 w-4 text-muted-foreground" />}>Caractéristiques</SectionTitle>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div>
              <Label className="text-xs">{L.surface}</Label>
              <div className="flex gap-1">
                <Input type="number" value={form.surface || ""} onChange={(e) => set({ surface: +e.target.value })} className="flex-1" />
                <select value={form.surface_unit} onChange={(e) => set({ surface_unit: e.target.value })} className="w-16 bg-muted/50 border border-border/50 rounded-lg px-1 text-xs text-foreground">
                  {SURFACE_UNITS.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}
                </select>
              </div>
            </div>
            <div>
              <Label className="text-xs">{L.rooms}</Label>
              <Input type="number" value={form.rooms || ""} onChange={(e) => set({ rooms: +e.target.value })} />
            </div>
            <div>
              <Label className="text-xs">Chambres (Bedrooms)</Label>
              <Input type="number" value={form.bedrooms || ""} onChange={(e) => set({ bedrooms: +e.target.value })} />
            </div>
            <div>
              <Label className="text-xs">Salles de bain (Bathrooms)</Label>
              <Input type="number" value={form.bathrooms || ""} onChange={(e) => set({ bathrooms: +e.target.value })} />
            </div>
            <div>
              <Label className="text-xs">{L.floor}</Label>
              <Input type="number" value={form.floor ?? ""} onChange={(e) => set({ floor: e.target.value ? +e.target.value : undefined })} />
            </div>
            <div>
              <Label className="text-xs">Année de construction</Label>
              <Input type="number" value={form.year_built ?? ""} onChange={(e) => set({ year_built: e.target.value ? +e.target.value : undefined })} placeholder="Ex: 2005" />
            </div>
          </div>

          {/* ── Energy class ── */}
          <div>
            <Label className="text-xs flex items-center gap-1"><Zap className="h-3.5 w-3.5" /> Classe énergétique (DPE)</Label>
            <div className="flex gap-1.5 mt-1">
              {ENERGY_CLASSES.map(ec => (
                <button key={ec} type="button"
                  onClick={() => set({ energy_class: form.energy_class === ec ? "" : ec })}
                  className={`w-9 h-9 rounded-lg text-xs font-bold transition-all ${
                    form.energy_class === ec
                      ? "bg-accent text-accent-foreground shadow-sm scale-110"
                      : "bg-muted/50 text-muted-foreground hover:bg-muted"
                  }`}>{ec}</button>
              ))}
            </div>
          </div>

          {/* ── Amenities toggles ── */}
          <SectionTitle icon={<Thermometer className="h-4 w-4 text-muted-foreground" />}>Équipements & Prestations</SectionTitle>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <ToggleRow label={L.furnished} icon={<Home className="h-4 w-4" />} checked={form.furnished} onChange={(v) => set({ furnished: v })} />
            <ToggleRow label="Parking" icon={<Car className="h-4 w-4" />} checked={form.parking} onChange={(v) => set({ parking: v })} />
            <ToggleRow label="Jardin / Garden" icon={<Trees className="h-4 w-4" />} checked={form.garden} onChange={(v) => set({ garden: v })} />
            <ToggleRow label="Terrasse / Terrace" icon={<Sun className="h-4 w-4" />} checked={form.terrace} onChange={(v) => set({ terrace: v })} />
            <ToggleRow label="Balcon / Balcony" icon={<Sun className="h-4 w-4" />} checked={form.balcony} onChange={(v) => set({ balcony: v })} />
            <ToggleRow label="Ascenseur / Elevator" icon={<Building2 className="h-4 w-4" />} checked={form.elevator} onChange={(v) => set({ elevator: v })} />
            <ToggleRow label="Piscine / Pool" icon={<Waves className="h-4 w-4" />} checked={form.pool} onChange={(v) => set({ pool: v })} />
          </div>

          {/* ── Rent / Charges / Deposit ── */}
          <SectionTitle icon={<span className="text-sm">💰</span>}>Financier</SectionTitle>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <Label className="text-xs">{L.rent} ({cc.currencySymbol})</Label>
              <Input type="number" value={form.monthly_rent || ""} onChange={(e) => set({ monthly_rent: +e.target.value })} />
            </div>
            <div>
              <Label className="text-xs">{L.charges} ({cc.currencySymbol})</Label>
              <Input type="number" value={form.monthly_charges || ""} onChange={(e) => set({ monthly_charges: +e.target.value })} />
            </div>
            <div>
              <Label className="text-xs">{L.deposit} ({cc.currencySymbol})</Label>
              <Input type="number" value={form.deposit_amount || ""} onChange={(e) => set({ deposit_amount: +e.target.value })} />
            </div>
          </div>

          {/* ── Description / Notes ── */}
          <SectionTitle icon={<span className="text-sm">📝</span>}>Description</SectionTitle>
          <div>
            <Label className="text-xs">Description de l'annonce</Label>
            <Textarea value={form.description} onChange={(e) => set({ description: e.target.value })} rows={4} placeholder="Décrivez votre bien : emplacement, luminosité, proximité transports..." />
          </div>
          <div>
            <Label className="text-xs">{L.notes}</Label>
            <Textarea value={form.notes} onChange={(e) => set({ notes: e.target.value })} rows={2} placeholder="Notes internes (non publiées)" />
          </div>

          {/* ── Submit ── */}
          <button onClick={handleSave} disabled={saving}
            className="bg-gradient-gold text-accent-foreground text-sm font-semibold px-8 py-3 rounded-lg shadow-gold hover:opacity-90 transition-opacity disabled:opacity-50 w-full sm:w-auto">
            {saving ? "..." : (t("page.rental.add_property") || "Enregistrer le bien")}
          </button>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AddProperty;
