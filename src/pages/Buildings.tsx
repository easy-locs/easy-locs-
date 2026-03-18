import { useState, useEffect, useCallback } from "react";
import PropertyHubBreadcrumb from "@/components/property/PropertyHubBreadcrumb";
import { useCountryFilter } from "@/hooks/useCountryFilter";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Building, Plus, X, Home, MapPin, Edit, Trash2, ChevronRight, Globe } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useRentalData } from "@/hooks/useRentalData";
import AddressAutocomplete, { type AddressResult } from "@/components/ui/AddressAutocomplete";
import CountrySelect from "@/components/ui/CountrySelect";
import { useI18n } from "@/lib/i18n";

interface BuildingRecord {
  id: string;
  name: string;
  address: string;
  postal_code: string;
  city: string;
  building_type: string;
  total_units: number;
  notes: string;
}

const BUILDING_TYPES = [
  { value: "immeuble", labelKey: "page.buildings.type_immeuble" },
  { value: "residence", labelKey: "page.buildings.type_residence" },
  { value: "copropriete", labelKey: "page.buildings.type_copropriete" },
  { value: "lotissement", labelKey: "page.buildings.type_lotissement" },
  { value: "parking", labelKey: "page.buildings.type_parking" },
];

const defaultForm = { name: "", address: "", postal_code: "", city: "", building_type: "immeuble", total_units: 0, notes: "", country: "FR" };

const Buildings = () => {
  const { user, orgId } = useAuth();
  const { toast } = useToast();
  const countryFilter = useCountryFilter();
  const { properties } = useRentalData(countryFilter);
  const { t } = useI18n();
  const [buildings, setBuildings] = useState<BuildingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(defaultForm);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);
    const { data } = await supabase.from("buildings").select("*").eq("org_id", orgId).order("name");
    setBuildings((data || []).map(b => ({
      id: b.id, name: b.name, address: b.address, postal_code: b.postal_code,
      city: b.city, building_type: b.building_type, total_units: b.total_units ?? 0, notes: b.notes ?? "",
    })));
    setLoading(false);
  }, [orgId]);

  useEffect(() => { load(); }, [load]);

  const handleSave = async () => {
    if (!form.name.trim() || !orgId || !user) return;
    const record = { org_id: orgId, user_id: user.id, ...form };
    if (editId) {
      const { error } = await supabase.from("buildings").update(record).eq("id", editId);
      if (error) { toast({ title: t("common.error"), description: error.message, variant: "destructive" }); return; }
      toast({ title: t("page.buildings.modified") });
    } else {
      const { error } = await supabase.from("buildings").insert(record);
      if (error) { toast({ title: t("common.error"), description: error.message, variant: "destructive" }); return; }
      toast({ title: t("page.buildings.added") });
    }
    setForm(defaultForm); setShowForm(false); setEditId(null);
    await load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t("page.buildings.delete_confirm"))) return;
    const { error } = await supabase.from("buildings").delete().eq("id", id);
    if (error) { toast({ title: t("page.common.error"), description: error.message, variant: "destructive" }); return; }
    toast({ title: t("page.buildings.deleted") });
    load();
  };

  const startEdit = (b: BuildingRecord) => {
    setEditId(b.id);
    setForm({ name: b.name, address: b.address, postal_code: b.postal_code, city: b.city, building_type: b.building_type, total_units: b.total_units, notes: b.notes, country: (b as any).country || "FR" });
    setShowForm(true);
  };

  const handleAddressSelect = (result: AddressResult) => {
    setForm(prev => ({ ...prev, address: result.label, postal_code: result.postcode || "", city: result.city || "" }));
  };

  // Properties linked to a building
  const getLinkedProperties = (buildingId: string) =>
    properties.filter((p: any) => p.building_id === buildingId);

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto">
        <PropertyHubBreadcrumb currentPage={t("page.buildings.title")} />
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">{t("page.buildings.title")}</h1>
            <p className="text-sm text-muted-foreground mt-1">{t("page.buildings.subtitle")}</p>
          </div>
          <button onClick={() => { setShowForm(true); setEditId(null); setForm(defaultForm); }}
            className="flex items-center gap-2 bg-accent text-accent-foreground px-4 py-2.5 rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity">
            <Plus className="h-4 w-4" /> {t("page.buildings.add")}
          </button>
        </div>

        {/* Form */}
        {showForm && (
          <div className="bg-card rounded-xl p-6 border border-border/50 shadow-card mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-foreground">{editId ? t("page.buildings.edit") : t("page.buildings.new")}</h2>
              <button onClick={() => { setShowForm(false); setEditId(null); setForm(defaultForm); }}><X className="h-5 w-5 text-muted-foreground" /></button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground">{t("page.buildings.name")} *</label>
                <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                  placeholder={t("page.buildings.placeholder_name")} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm mt-1" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">{t("page.buildings.type")}</label>
                <select value={form.building_type} onChange={e => setForm(p => ({ ...p, building_type: e.target.value }))}
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm mt-1">
                  {BUILDING_TYPES.map(bt => <option key={bt.value} value={bt.value}>{t(bt.labelKey)}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">{t("page.buildings.country") || "Country"}</label>
                <CountrySelect value={form.country} onChange={code => setForm(p => ({ ...p, country: code }))} className="mt-1" />
              </div>
              <div className="sm:col-span-2">
                <label className="text-xs font-medium text-muted-foreground">{t("page.buildings.address")}</label>
                <AddressAutocomplete
                  value={form.address}
                  onSelect={handleAddressSelect}
                  onChange={val => setForm(p => ({ ...p, address: val }))}
                  placeholder={t("page.buildings.placeholder_address")}
                  countryCode={form.country}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">{t("page.buildings.postal")}</label>
                <input value={form.postal_code} onChange={e => setForm(p => ({ ...p, postal_code: e.target.value }))}
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm mt-1" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">{t("page.buildings.city")}</label>
                <input value={form.city} onChange={e => setForm(p => ({ ...p, city: e.target.value }))}
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm mt-1" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">{t("page.buildings.units")}</label>
                <input type="number" value={form.total_units || ""} onFocus={e => { if (e.target.value === "0") e.target.value = ""; }} onChange={e => setForm(p => ({ ...p, total_units: e.target.value === "" ? 0 : +e.target.value }))}
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm mt-1" placeholder="0" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">{t("page.buildings.notes")}</label>
                <input value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm mt-1" />
              </div>
            </div>
            <button onClick={handleSave}
              className="mt-4 w-full bg-accent text-accent-foreground py-2.5 rounded-lg font-semibold text-sm hover:opacity-90 transition-opacity">
              {editId ? t("page.buildings.edit") : t("page.buildings.add_building")}
            </button>
          </div>
        )}

        {/* List */}
        {loading ? (
          <div className="text-center py-16 text-muted-foreground">{t("page.common.loading")}</div>
        ) : buildings.length === 0 ? (
          <div className="text-center py-16">
            <Building className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-foreground mb-1">{t("page.buildings.empty")}</h2>
            <p className="text-sm text-muted-foreground">{t("page.buildings.empty_hint")}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {buildings.map(b => {
              const linked = getLinkedProperties(b.id);
              const expanded = expandedId === b.id;
              return (
                <div key={b.id} className="bg-card rounded-xl border border-border/50 shadow-card overflow-hidden">
                  <div className="p-5 flex items-start gap-4 cursor-pointer" onClick={() => setExpandedId(expanded ? null : b.id)}>
                    <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
                      <Building className="h-5 w-5 text-accent" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-foreground text-sm">{b.name}</span>
                        <span className="text-[10px] bg-muted text-muted-foreground px-2 py-0.5 rounded-full font-medium">
                          {BUILDING_TYPES.find(bt => bt.value === b.building_type) ? t(BUILDING_TYPES.find(bt => bt.value === b.building_type)!.labelKey) : b.building_type}
                        </span>
                        <span className="text-[10px] bg-accent/10 text-accent px-2 py-0.5 rounded-full font-medium">
                          {linked.length} {t("page.buildings.linked")}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                        <MapPin className="h-3 w-3" /> {b.address}, {b.postal_code} {b.city}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={e => { e.stopPropagation(); startEdit(b); }} className="p-1.5 rounded-lg hover:bg-muted"><Edit className="h-4 w-4 text-muted-foreground" /></button>
                      <button onClick={e => { e.stopPropagation(); handleDelete(b.id); }} className="p-1.5 rounded-lg hover:bg-destructive/10"><Trash2 className="h-4 w-4 text-destructive" /></button>
                      <ChevronRight className={`h-4 w-4 text-muted-foreground transition-transform ${expanded ? "rotate-90" : ""}`} />
                    </div>
                  </div>
                  {expanded && (
                    <div className="border-t border-border/50 px-5 py-3 bg-muted/30">
                      {linked.length === 0 ? (
                        <p className="text-xs text-muted-foreground">{t("page.buildings.no_linked")}</p>
                      ) : (
                        <div className="space-y-2">
                          {linked.map((p: any) => (
                            <div key={p.id} className="flex items-center gap-3 text-sm">
                              <Home className="h-4 w-4 text-muted-foreground" />
                              <span className="text-foreground font-medium">{p.label}</span>
                              <span className="text-xs text-muted-foreground">{t("page.buildings.lot")} {p.lot_number || "—"}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Buildings;
