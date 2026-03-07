import { useState, useEffect, useCallback } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/lib/i18n";
import { Plus, Trash2, Edit, X, Globe, MapPin, Phone, ExternalLink, Image as ImageIcon, ToggleLeft, ToggleRight } from "lucide-react";

const SERVICE_CATEGORIES = [
  "airport_transfer", "private_driver", "car_rental", "chef_at_home",
  "massage_wellness", "excursions", "boat_trip", "restaurants",
  "desert_tour", "babysitting", "cleaning", "shopping", "sports",
  "cultural_tour", "nightlife", "other",
];

const CATEGORY_ICONS: Record<string, string> = {
  airport_transfer: "✈️", private_driver: "🚗", car_rental: "🏎️",
  chef_at_home: "👨‍🍳", massage_wellness: "💆", excursions: "🏔️",
  boat_trip: "⛵", restaurants: "🍽️", desert_tour: "🏜️",
  babysitting: "👶", cleaning: "🧹", shopping: "🛍️",
  sports: "⚽", cultural_tour: "🏛️", nightlife: "🎶", other: "📌",
};

interface ServiceForm {
  title: string;
  category: string;
  description: string;
  photo_url: string;
  country: string;
  city: string;
  whatsapp_number: string;
  website_url: string;
  price_indication: string;
  availability_note: string;
  property_id: string;
  active: boolean;
}

const emptyForm: ServiceForm = {
  title: "", category: "other", description: "", photo_url: "",
  country: "", city: "", whatsapp_number: "", website_url: "",
  price_indication: "", availability_note: "", property_id: "", active: true,
};

const LocalServices = () => {
  const { user, orgId } = useAuth();
  const { toast } = useToast();
  const { t } = useI18n();
  const [services, setServices] = useState<any[]>([]);
  const [properties, setProperties] = useState<any[]>([]);
  const [featureEnabled, setFeatureEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ServiceForm>(emptyForm);

  const load = useCallback(async () => {
    if (!orgId) return;
    const [{ data: svc }, { data: props }, { data: org }] = await Promise.all([
      supabase.from("local_services").select("*").eq("org_id", orgId).order("sort_order"),
      supabase.from("properties").select("id, label, city, country").eq("org_id", orgId).order("label"),
      supabase.from("orgs").select("local_services_enabled").eq("id", orgId).single(),
    ]);
    setServices(svc || []);
    setProperties(props || []);
    setFeatureEnabled(org?.local_services_enabled || false);
    setLoading(false);
  }, [orgId]);

  useEffect(() => { load(); }, [load]);

  const toggleFeature = async () => {
    if (!orgId) return;
    const newVal = !featureEnabled;
    await supabase.from("orgs").update({ local_services_enabled: newVal } as any).eq("id", orgId);
    setFeatureEnabled(newVal);
    toast({ title: newVal ? (t("page.services.feature_enabled") !== "page.services.feature_enabled" ? t("page.services.feature_enabled") : "Activités activées") : (t("page.services.feature_disabled") !== "page.services.feature_disabled" ? t("page.services.feature_disabled") : "Activités désactivées") });
  };

  const save = async () => {
    if (!orgId || !user || !form.title.trim()) return;
    const payload: any = {
      org_id: orgId, user_id: user.id,
      title: form.title.trim(), category: form.category,
      description: form.description.trim(), photo_url: form.photo_url.trim(),
      country: form.country.trim(), city: form.city.trim(),
      whatsapp_number: form.whatsapp_number.trim(), website_url: form.website_url.trim(),
      price_indication: form.price_indication.trim(), availability_note: form.availability_note.trim(),
      property_id: form.property_id || null, active: form.active,
    };
    if (editingId) {
      await supabase.from("local_services").update(payload).eq("id", editingId);
    } else {
      await supabase.from("local_services").insert(payload);
    }
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);
    await load();
    toast({ title: editingId ? "Service modifié" : "Service ajouté" });
  };

  const remove = async (id: string) => {
    if (!confirm("Supprimer ce service ?")) return;
    await supabase.from("local_services").delete().eq("id", id);
    await load();
    toast({ title: "Service supprimé" });
  };

  const startEdit = (s: any) => {
    setForm({
      title: s.title, category: s.category, description: s.description || "",
      photo_url: s.photo_url || "", country: s.country || "", city: s.city || "",
      whatsapp_number: s.whatsapp_number || "", website_url: s.website_url || "",
      price_indication: s.price_indication || "", availability_note: s.availability_note || "",
      property_id: s.property_id || "", active: s.active,
    });
    setEditingId(s.id);
    setShowForm(true);
  };

  const catLabel = (cat: string) => {
    const key = `page.services.cat_${cat}`;
    const val = t(key);
    return val !== key ? val : cat.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
  };

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground">🎯 Activités & Services locaux</h1>
            <p className="text-sm text-muted-foreground mt-1">Recommandations conciergerie pour vos voyageurs</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={toggleFeature} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${featureEnabled ? "bg-success/10 text-success border border-success/30" : "bg-muted text-muted-foreground border border-border"}`}>
              {featureEnabled ? <ToggleRight className="h-5 w-5" /> : <ToggleLeft className="h-5 w-5" />}
              {featureEnabled ? "Activé" : "Désactivé"}
            </button>
            <button onClick={() => { setForm(emptyForm); setEditingId(null); setShowForm(true); }} className="bg-gradient-gold text-accent-foreground px-4 py-2 rounded-xl text-sm font-semibold shadow-gold hover:opacity-90 flex items-center gap-2">
              <Plus className="h-4 w-4" /> Ajouter
            </button>
          </div>
        </div>

        {!featureEnabled && (
          <div className="bg-muted/50 border border-border rounded-xl p-4 text-sm text-muted-foreground text-center">
            Cette fonctionnalité est désactivée. Activez-la pour afficher les services sur vos pages d'annonces.
          </div>
        )}

        {/* Form */}
        {showForm && (
          <div className="bg-card rounded-xl border border-border p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-foreground">{editingId ? "Modifier le service" : "Nouveau service"}</h3>
              <button onClick={() => { setShowForm(false); setEditingId(null); }} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Titre *</label>
                <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm" placeholder="Ex: Transfert aéroport" />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Catégorie</label>
                <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm">
                  {SERVICE_CATEGORIES.map(c => <option key={c} value={c}>{CATEGORY_ICONS[c] || "📌"} {catLabel(c)}</option>)}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-foreground mb-1">Description</label>
                <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm resize-none" placeholder="Courte description du service..." />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Pays</label>
                <input value={form.country} onChange={e => setForm(f => ({ ...f, country: e.target.value }))} className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm" placeholder="Ex: Maroc, Thaïlande" />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Ville</label>
                <input value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm" placeholder="Ex: Marrakech, Phuket" />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">📱 WhatsApp</label>
                <input value={form.whatsapp_number} onChange={e => setForm(f => ({ ...f, whatsapp_number: e.target.value }))} className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm" placeholder="+212 6XX XXX XXX" />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">🌐 Site web</label>
                <input value={form.website_url} onChange={e => setForm(f => ({ ...f, website_url: e.target.value }))} className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm" placeholder="https://..." />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">💰 Indication de prix</label>
                <input value={form.price_indication} onChange={e => setForm(f => ({ ...f, price_indication: e.target.value }))} className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm" placeholder="Ex: À partir de 30€" />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">📅 Disponibilité</label>
                <input value={form.availability_note} onChange={e => setForm(f => ({ ...f, availability_note: e.target.value }))} className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm" placeholder="Ex: Tous les jours, 7j/7" />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">🏠 Lier à un bien</label>
                <select value={form.property_id} onChange={e => setForm(f => ({ ...f, property_id: e.target.value }))} className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm">
                  <option value="">Tous les biens (par ville)</option>
                  {properties.map(p => <option key={p.id} value={p.id}>{p.label} — {p.city}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">🖼️ URL photo</label>
                <input value={form.photo_url} onChange={e => setForm(f => ({ ...f, photo_url: e.target.value }))} className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm" placeholder="https://..." />
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={save} className="bg-gradient-gold text-accent-foreground px-6 py-2.5 rounded-lg text-sm font-semibold shadow-gold hover:opacity-90">
                {editingId ? "Enregistrer" : "Ajouter"}
              </button>
              <button onClick={() => { setShowForm(false); setEditingId(null); }} className="border border-border text-foreground px-6 py-2.5 rounded-lg text-sm hover:bg-muted">Annuler</button>
            </div>
          </div>
        )}

        {/* Services list */}
        {loading ? (
          <p className="text-center text-muted-foreground py-8">Chargement...</p>
        ) : services.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <MapPin className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">Aucun service ajouté</p>
            <p className="text-sm mt-1">Ajoutez des activités et services locaux pour vos voyageurs</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {services.map(s => (
              <div key={s.id} className={`bg-card rounded-xl border overflow-hidden transition-opacity ${s.active ? "border-border/50" : "border-border/30 opacity-60"}`}>
                {s.photo_url && (
                  <div className="h-32 bg-muted">
                    <img src={s.photo_url} alt={s.title} className="w-full h-full object-cover" loading="lazy" />
                  </div>
                )}
                <div className="p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <span className="text-lg mr-1.5">{CATEGORY_ICONS[s.category] || "📌"}</span>
                      <span className="font-semibold text-foreground text-sm">{s.title}</span>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button onClick={() => startEdit(s)} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground"><Edit className="h-3.5 w-3.5" /></button>
                      <button onClick={() => remove(s.id)} className="p-1.5 rounded-lg hover:bg-destructive/10 text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
                    </div>
                  </div>
                  {s.description && <p className="text-xs text-muted-foreground line-clamp-2">{s.description}</p>}
                  <div className="flex flex-wrap gap-1.5 text-[10px]">
                    {s.city && <span className="bg-muted text-muted-foreground px-2 py-0.5 rounded-full flex items-center gap-1"><MapPin className="h-2.5 w-2.5" />{s.city}</span>}
                    {s.price_indication && <span className="bg-accent/10 text-accent px-2 py-0.5 rounded-full">{s.price_indication}</span>}
                    {!s.active && <span className="bg-destructive/10 text-destructive px-2 py-0.5 rounded-full">Inactif</span>}
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    {s.whatsapp_number && (
                      <a href={`https://wa.me/${s.whatsapp_number.replace(/[^0-9+]/g, "")}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 bg-[#25D366]/10 text-[#25D366] px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-[#25D366]/20 transition-colors">
                        <Phone className="h-3 w-3" /> WhatsApp
                      </a>
                    )}
                    {s.website_url && (
                      <a href={s.website_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                        <ExternalLink className="h-3 w-3" /> Site
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default LocalServices;
