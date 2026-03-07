import { useState, useEffect, useCallback } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Edit, X, Check, Compass, Star, Tag } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const ACTIVITY_CATEGORIES = [
  { value: "experience", label: "🌟 Experience" },
  { value: "adventure", label: "🏜️ Adventure" },
  { value: "water_sport", label: "🚤 Water Sport" },
  { value: "city_tour", label: "🏛️ City Tour" },
  { value: "museum", label: "🎨 Museum / Culture" },
  { value: "theme_park", label: "🎢 Theme Park" },
  { value: "restaurant", label: "🍽️ Restaurant" },
  { value: "spa", label: "🧖 Spa & Wellness" },
  { value: "car_rental", label: "🚗 Car Rental" },
  { value: "luxury_car", label: "🏎️ Luxury Car" },
  { value: "coworking", label: "💻 Coworking" },
  { value: "event", label: "🎫 Event / Tickets" },
  { value: "shopping", label: "🛍️ Shopping" },
  { value: "visa", label: "📋 Visa Assistance" },
  { value: "relocation", label: "🏠 Relocation" },
  { value: "gym", label: "🏋️ Gym / Fitness" },
  { value: "other", label: "📦 Other" },
];

const BADGES = ["new", "popular", "premium", "family", "business", "last_minute"];

interface ActivityForm {
  category: string;
  title: string;
  description: string;
  price: number;
  currency: string;
  duration_minutes: number | null;
  provider_name: string;
  provider_type: string;
  commission_percent: number;
  country: string;
  city: string;
  badges: string[];
  active: boolean;
}

const emptyForm: ActivityForm = {
  category: "experience",
  title: "",
  description: "",
  price: 0,
  currency: "EUR",
  duration_minutes: null,
  provider_name: "",
  provider_type: "internal",
  commission_percent: 0,
  country: "",
  city: "",
  badges: [],
  active: true,
};

const ActivitiesMarketplace = () => {
  const { user, orgId } = useAuth();
  const { toast } = useToast();
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ActivityForm>(emptyForm);
  const [filterCategory, setFilterCategory] = useState("");

  const load = useCallback(async () => {
    if (!orgId) return;
    const { data } = await supabase.from("activities").select("*").eq("org_id", orgId).order("sort_order");
    setActivities(data || []);
    setLoading(false);
  }, [orgId]);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    if (!orgId || !user || !form.title) return;
    const record = { ...form, org_id: orgId, user_id: user.id };
    if (editingId) {
      await supabase.from("activities").update(record as any).eq("id", editingId);
      toast({ title: "Activity updated" });
    } else {
      await supabase.from("activities").insert(record as any);
      toast({ title: "Activity created" });
    }
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);
    await load();
  };

  const startEdit = (a: any) => {
    setEditingId(a.id);
    setForm({
      category: a.category,
      title: a.title,
      description: a.description || "",
      price: a.price,
      currency: a.currency || "EUR",
      duration_minutes: a.duration_minutes,
      provider_name: a.provider_name || "",
      provider_type: a.provider_type || "internal",
      commission_percent: a.commission_percent || 0,
      country: a.country || "",
      city: a.city || "",
      badges: a.badges || [],
      active: a.active,
    });
    setShowForm(true);
  };

  const remove = async (id: string) => {
    await supabase.from("activities").delete().eq("id", id);
    toast({ title: "Activity deleted" });
    await load();
  };

  const toggleBadge = (badge: string) => {
    setForm(f => ({
      ...f,
      badges: f.badges.includes(badge) ? f.badges.filter(b => b !== badge) : [...f.badges, badge],
    }));
  };

  const filtered = filterCategory ? activities.filter(a => a.category === filterCategory) : activities;

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Compass className="h-6 w-6 text-accent" /> Activities & Upsells
            </h1>
            <p className="text-sm text-muted-foreground">Manage experiences, activities, and upsell offers for guests</p>
          </div>
          <button onClick={() => { setShowForm(true); setEditingId(null); setForm(emptyForm); }} className="btn-primary">
            <Plus className="h-4 w-4" /> Add Activity
          </button>
        </div>

        {/* Category filter */}
        <div className="flex flex-wrap gap-2 mb-6">
          <button onClick={() => setFilterCategory("")}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${!filterCategory ? "bg-accent text-accent-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}>
            All ({activities.length})
          </button>
          {ACTIVITY_CATEGORIES.filter(c => activities.some(a => a.category === c.value)).map(c => (
            <button key={c.value} onClick={() => setFilterCategory(c.value)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${filterCategory === c.value ? "bg-accent text-accent-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}>
              {c.label}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-16 bg-card rounded-xl border border-border/50">
            <Compass className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">No activities yet</h3>
            <p className="text-sm text-muted-foreground mb-4">Create experiences and activities for your guests</p>
            <button onClick={() => setShowForm(true)} className="btn-primary"><Plus className="h-4 w-4" /> Add Activity</button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((a, i) => (
              <motion.div key={a.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }}
                className="bg-card rounded-xl border border-border/50 shadow-card overflow-hidden group">
                {a.photo_url && (
                  <div className="aspect-[16/9] bg-muted overflow-hidden">
                    <img src={a.photo_url} alt={a.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" />
                  </div>
                )}
                <div className="p-4 space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    {(a.badges || []).map((b: string) => (
                      <span key={b} className="text-[10px] px-2 py-0.5 rounded-full bg-accent/10 text-accent font-medium uppercase">{b}</span>
                    ))}
                  </div>
                  <h3 className="font-semibold text-foreground text-sm line-clamp-1">{a.title}</h3>
                  {a.description && <p className="text-xs text-muted-foreground line-clamp-2">{a.description}</p>}
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-accent">{a.price}€</span>
                    <span className="text-muted-foreground">{a.provider_type === "external" ? "External" : "Internal"}</span>
                  </div>
                  {a.commission_percent > 0 && (
                    <p className="text-[10px] text-muted-foreground">Commission: {a.commission_percent}%</p>
                  )}
                  <div className="flex items-center gap-2 pt-2 border-t border-border/50">
                    <button onClick={() => startEdit(a)} className="text-xs text-accent hover:underline flex items-center gap-1">
                      <Edit className="h-3 w-3" /> Edit
                    </button>
                    <button onClick={() => remove(a.id)} className="text-xs text-destructive hover:underline flex items-center gap-1 ml-auto">
                      <Trash2 className="h-3 w-3" /> Delete
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Form Modal */}
        <AnimatePresence>
          {showForm && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
              <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
                className="bg-card rounded-2xl border border-border shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6 space-y-4" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold text-foreground">{editingId ? "Edit Activity" : "New Activity"}</h2>
                  <button onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground"><X className="h-5 w-5" /></button>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">Category</label>
                    <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                      className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground">
                      {ACTIVITY_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">Title *</label>
                    <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                      className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground" />
                  </div>

                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">Description</label>
                    <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                      className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground resize-none" rows={2} />
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs text-muted-foreground mb-1">Price</label>
                      <input type="number" value={form.price} onChange={e => setForm(f => ({ ...f, price: Number(e.target.value) }))}
                        className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground" />
                    </div>
                    <div>
                      <label className="block text-xs text-muted-foreground mb-1">Duration (min)</label>
                      <input type="number" value={form.duration_minutes || ""} onChange={e => setForm(f => ({ ...f, duration_minutes: e.target.value ? Number(e.target.value) : null }))}
                        className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground" />
                    </div>
                    <div>
                      <label className="block text-xs text-muted-foreground mb-1">Commission %</label>
                      <input type="number" value={form.commission_percent} onChange={e => setForm(f => ({ ...f, commission_percent: Number(e.target.value) }))}
                        className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-muted-foreground mb-1">Provider</label>
                      <input value={form.provider_name} onChange={e => setForm(f => ({ ...f, provider_name: e.target.value }))}
                        className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground" />
                    </div>
                    <div>
                      <label className="block text-xs text-muted-foreground mb-1">Type</label>
                      <select value={form.provider_type} onChange={e => setForm(f => ({ ...f, provider_type: e.target.value }))}
                        className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground">
                        <option value="internal">Internal</option>
                        <option value="external">External</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-muted-foreground mb-1">Country</label>
                      <input value={form.country} onChange={e => setForm(f => ({ ...f, country: e.target.value }))}
                        className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground" />
                    </div>
                    <div>
                      <label className="block text-xs text-muted-foreground mb-1">City</label>
                      <input value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))}
                        className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">Badges</label>
                    <div className="flex flex-wrap gap-2">
                      {BADGES.map(b => (
                        <button key={b} type="button" onClick={() => toggleBadge(b)}
                          className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${form.badges.includes(b) ? "bg-accent text-accent-foreground" : "bg-muted text-muted-foreground"}`}>
                          {b}
                        </button>
                      ))}
                    </div>
                  </div>

                  <label className="flex items-center gap-2 text-sm text-foreground">
                    <input type="checkbox" checked={form.active} onChange={e => setForm(f => ({ ...f, active: e.target.checked }))} className="rounded" />
                    Active
                  </label>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-border/50">
                  <button onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
                  <button onClick={save} disabled={!form.title} className="btn-primary">
                    <Check className="h-4 w-4" /> {editingId ? "Update" : "Create"}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </DashboardLayout>
  );
};

export default ActivitiesMarketplace;
