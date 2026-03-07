import { useState, useEffect, useCallback } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/lib/i18n";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Edit, X, Check, Sparkles, Briefcase, ShoppingBag, Clock, DollarSign, Users } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const SERVICE_CATEGORIES = [
  { value: "cleaning", label: "🧹 Cleaning", icon: "🧹" },
  { value: "laundry", label: "👔 Laundry", icon: "👔" },
  { value: "transfer", label: "✈️ Airport Transfer", icon: "✈️" },
  { value: "chauffeur", label: "🚗 Chauffeur", icon: "🚗" },
  { value: "grocery", label: "🛒 Grocery Delivery", icon: "🛒" },
  { value: "welcome", label: "🎁 Welcome Pack", icon: "🎁" },
  { value: "chef", label: "👨‍🍳 Private Chef", icon: "👨‍🍳" },
  { value: "baby", label: "👶 Baby Equipment", icon: "👶" },
  { value: "maintenance", label: "🔧 Maintenance", icon: "🔧" },
  { value: "key_handover", label: "🔑 Key Handover", icon: "🔑" },
  { value: "late_checkin", label: "🌙 Late Check-in", icon: "🌙" },
  { value: "early_checkin", label: "☀️ Early Check-in", icon: "☀️" },
  { value: "late_checkout", label: "🕐 Late Check-out", icon: "🕐" },
  { value: "flowers", label: "💐 Flowers", icon: "💐" },
  { value: "romantic", label: "❤️ Romantic Setup", icon: "❤️" },
  { value: "birthday", label: "🎂 Birthday Setup", icon: "🎂" },
  { value: "security", label: "🛡️ Security", icon: "🛡️" },
  { value: "events", label: "🎉 Events Support", icon: "🎉" },
  { value: "other", label: "📦 Other", icon: "📦" },
];

interface ServiceForm {
  category: string;
  title: string;
  description: string;
  price: number;
  currency: string;
  duration_minutes: number | null;
  provider_name: string;
  provider_phone: string;
  country: string;
  city: string;
  active: boolean;
}

const emptyForm: ServiceForm = {
  category: "cleaning",
  title: "",
  description: "",
  price: 0,
  currency: "EUR",
  duration_minutes: null,
  provider_name: "",
  provider_phone: "",
  country: "",
  city: "",
  active: true,
};

const ConciergeServices = () => {
  const { user, orgId } = useAuth();
  const { t } = useI18n();
  const { toast } = useToast();
  const [services, setServices] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ServiceForm>(emptyForm);
  const [tab, setTab] = useState<"services" | "orders" | "tasks">("services");
  const [tasks, setTasks] = useState<any[]>([]);
  const [filterCategory, setFilterCategory] = useState("");

  const load = useCallback(async () => {
    if (!orgId) return;
    const [{ data: s }, { data: o }, { data: bt }] = await Promise.all([
      supabase.from("concierge_services").select("*").eq("org_id", orgId).order("sort_order"),
      supabase.from("concierge_orders").select("*").eq("org_id", orgId).order("created_at", { ascending: false }).limit(100),
      supabase.from("booking_tasks").select("*").eq("org_id", orgId).order("created_at", { ascending: false }).limit(100),
    ]);
    setServices(s || []);
    setOrders(o || []);
    setTasks(bt || []);
    setLoading(false);
  }, [orgId]);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    if (!orgId || !user || !form.title) return;
    const record = { ...form, org_id: orgId, user_id: user.id };
    if (editingId) {
      await supabase.from("concierge_services").update(record as any).eq("id", editingId);
      toast({ title: "Service updated" });
    } else {
      await supabase.from("concierge_services").insert(record as any);
      toast({ title: "Service created" });
    }
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);
    await load();
  };

  const startEdit = (s: any) => {
    setEditingId(s.id);
    setForm({
      category: s.category,
      title: s.title,
      description: s.description || "",
      price: s.price,
      currency: s.currency || "EUR",
      duration_minutes: s.duration_minutes,
      provider_name: s.provider_name || "",
      provider_phone: s.provider_phone || "",
      country: s.country || "",
      city: s.city || "",
      active: s.active,
    });
    setShowForm(true);
  };

  const remove = async (id: string) => {
    await supabase.from("concierge_services").delete().eq("id", id);
    toast({ title: "Service deleted" });
    await load();
  };

  const updateTaskStatus = async (taskId: string, status: string) => {
    const updates: any = { status };
    if (status === "completed") updates.completed_at = new Date().toISOString();
    await supabase.from("booking_tasks").update(updates).eq("id", taskId);
    toast({ title: `Task ${status}` });
    await load();
  };

  const updateOrderStatus = async (orderId: string, status: string) => {
    await supabase.from("concierge_orders").update({ status } as any).eq("id", orderId);
    toast({ title: `Order ${status}` });
    await load();
  };

  const catIcon = (cat: string) => SERVICE_CATEGORIES.find(c => c.value === cat)?.icon || "📦";
  const filteredServices = filterCategory ? services.filter(s => s.category === filterCategory) : services;

  // Stats
  const activeServices = services.filter(s => s.active).length;
  const pendingOrders = orders.filter(o => o.status === "pending").length;
  const pendingTasks = tasks.filter(t => t.status === "pending" || t.status === "assigned").length;
  const totalRevenue = orders.filter(o => o.payment_status === "paid").reduce((s, o) => s + Number(o.total_price), 0);

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Sparkles className="h-6 w-6 text-accent" /> Concierge & Services
            </h1>
            <p className="text-sm text-muted-foreground">Manage concierge services, orders, and operational tasks</p>
          </div>
          <button onClick={() => { setShowForm(true); setEditingId(null); setForm(emptyForm); }} className="btn-primary">
            <Plus className="h-4 w-4" /> Add Service
          </button>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[
            { icon: Briefcase, label: "Active Services", value: String(activeServices), cls: "text-accent" },
            { icon: ShoppingBag, label: "Pending Orders", value: String(pendingOrders), cls: "text-warning" },
            { icon: Clock, label: "Pending Tasks", value: String(pendingTasks), cls: "text-info" },
            { icon: DollarSign, label: "Revenue", value: `${totalRevenue.toFixed(0)}€`, cls: "text-success" },
          ].map((kpi, i) => (
            <motion.div key={kpi.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
              className="bg-card rounded-xl p-4 border border-border/50 shadow-card">
              <div className="flex items-center gap-2 mb-2">
                <kpi.icon className={`h-4 w-4 ${kpi.cls}`} />
                <span className="text-xs text-muted-foreground">{kpi.label}</span>
              </div>
              <div className="text-xl font-bold text-foreground tabular-nums">{kpi.value}</div>
            </motion.div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-muted/50 rounded-xl p-1 mb-6">
          {(["services", "orders", "tasks"] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${tab === t ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
              {t === "services" ? `Services (${services.length})` : t === "orders" ? `Orders (${orders.length})` : `Tasks (${tasks.length})`}
            </button>
          ))}
        </div>

        {/* Services Tab */}
        {tab === "services" && (
          <>
            {/* Category filter */}
            <div className="flex flex-wrap gap-2 mb-4">
              <button onClick={() => setFilterCategory("")}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${!filterCategory ? "bg-accent text-accent-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}>
                All
              </button>
              {SERVICE_CATEGORIES.filter(c => services.some(s => s.category === c.value)).map(c => (
                <button key={c.value} onClick={() => setFilterCategory(c.value)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${filterCategory === c.value ? "bg-accent text-accent-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}>
                  {c.icon} {c.value}
                </button>
              ))}
            </div>

            {filteredServices.length === 0 ? (
              <div className="text-center py-16 bg-card rounded-xl border border-border/50">
                <Sparkles className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">No services yet</h3>
                <p className="text-sm text-muted-foreground mb-4">Add concierge services for your guests</p>
                <button onClick={() => setShowForm(true)} className="btn-primary"><Plus className="h-4 w-4" /> Add Service</button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredServices.map((s, i) => (
                  <motion.div key={s.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }}
                    className="bg-card rounded-xl border border-border/50 shadow-card overflow-hidden group">
                    {s.photo_url && (
                      <div className="aspect-[16/9] bg-muted overflow-hidden">
                        <img src={s.photo_url} alt={s.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" />
                      </div>
                    )}
                    <div className="p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-lg">{catIcon(s.category)}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${s.active ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}`}>
                          {s.active ? "Active" : "Inactive"}
                        </span>
                      </div>
                      <h3 className="font-semibold text-foreground text-sm line-clamp-1">{s.title}</h3>
                      {s.description && <p className="text-xs text-muted-foreground line-clamp-2">{s.description}</p>}
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-accent">{s.price}€</span>
                        {s.duration_minutes && <span className="text-muted-foreground">{s.duration_minutes}min</span>}
                      </div>
                      {s.provider_name && <p className="text-xs text-muted-foreground">Provider: {s.provider_name}</p>}
                      <div className="flex items-center gap-2 pt-2 border-t border-border/50">
                        <button onClick={() => startEdit(s)} className="text-xs text-accent hover:underline flex items-center gap-1">
                          <Edit className="h-3 w-3" /> Edit
                        </button>
                        <button onClick={() => remove(s.id)} className="text-xs text-destructive hover:underline flex items-center gap-1 ml-auto">
                          <Trash2 className="h-3 w-3" /> Delete
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Orders Tab */}
        {tab === "orders" && (
          <div className="space-y-3">
            {orders.length === 0 ? (
              <div className="text-center py-16 bg-card rounded-xl border border-border/50">
                <ShoppingBag className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">No orders yet</h3>
                <p className="text-sm text-muted-foreground">Orders will appear when guests book services</p>
              </div>
            ) : (
              <div className="bg-card rounded-xl border border-border/50 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border/50 bg-muted/30">
                        <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Guest</th>
                        <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Service</th>
                        <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Total</th>
                        <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Payment</th>
                        <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Status</th>
                        <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                      {orders.map(o => {
                        const svc = services.find(s => s.id === o.service_id);
                        return (
                          <tr key={o.id} className="hover:bg-muted/20">
                            <td className="px-4 py-3 font-medium text-foreground">{o.guest_name}</td>
                            <td className="px-4 py-3 text-muted-foreground">{svc?.title || "—"}</td>
                            <td className="px-4 py-3 font-medium text-foreground">{o.total_price}€</td>
                            <td className="px-4 py-3">
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${o.payment_status === "paid" ? "bg-success/10 text-success" : "bg-warning/10 text-warning"}`}>
                                {o.payment_status}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                o.status === "completed" ? "bg-success/10 text-success" :
                                o.status === "in_progress" ? "bg-info/10 text-info" :
                                o.status === "cancelled" ? "bg-destructive/10 text-destructive" :
                                "bg-warning/10 text-warning"
                              }`}>{o.status}</span>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-1">
                                {o.status === "pending" && (
                                  <>
                                    <button onClick={() => updateOrderStatus(o.id, "in_progress")} className="text-xs text-accent hover:underline">Start</button>
                                    <button onClick={() => updateOrderStatus(o.id, "cancelled")} className="text-xs text-destructive hover:underline ml-2">Cancel</button>
                                  </>
                                )}
                                {o.status === "in_progress" && (
                                  <button onClick={() => updateOrderStatus(o.id, "completed")} className="text-xs text-success hover:underline">Complete</button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tasks Tab */}
        {tab === "tasks" && (
          <div className="space-y-3">
            {tasks.length === 0 ? (
              <div className="text-center py-16 bg-card rounded-xl border border-border/50">
                <Clock className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">No operational tasks</h3>
                <p className="text-sm text-muted-foreground">Tasks for cleaning, turnover, and operations will appear here</p>
              </div>
            ) : (
              <div className="space-y-2">
                {tasks.map((task, i) => (
                  <motion.div key={task.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.02 }}
                    className="bg-card rounded-xl border border-border/50 p-4 flex items-center gap-4">
                    <div className={`w-2 h-2 rounded-full shrink-0 ${
                      task.status === "completed" ? "bg-success" :
                      task.status === "in_progress" ? "bg-info" :
                      task.status === "urgent" ? "bg-destructive" :
                      "bg-warning"
                    }`} />
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-medium text-foreground truncate">{task.title}</h4>
                      <p className="text-xs text-muted-foreground">{task.task_type} • {task.priority}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {task.status === "pending" && (
                        <button onClick={() => updateTaskStatus(task.id, "in_progress")} className="text-xs bg-accent/10 text-accent px-3 py-1.5 rounded-lg hover:bg-accent/20">Start</button>
                      )}
                      {task.status === "in_progress" && (
                        <button onClick={() => updateTaskStatus(task.id, "completed")} className="text-xs bg-success/10 text-success px-3 py-1.5 rounded-lg hover:bg-success/20">Done</button>
                      )}
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        task.status === "completed" ? "bg-success/10 text-success" :
                        task.status === "in_progress" ? "bg-info/10 text-info" :
                        task.status === "urgent" ? "bg-destructive/10 text-destructive" :
                        "bg-warning/10 text-warning"
                      }`}>{task.status}</span>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Service Form Modal */}
        <AnimatePresence>
          {showForm && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
              <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
                className="bg-card rounded-2xl border border-border shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6 space-y-4" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold text-foreground">{editingId ? "Edit Service" : "New Service"}</h2>
                  <button onClick={() => { setShowForm(false); setEditingId(null); }} className="text-muted-foreground hover:text-foreground"><X className="h-5 w-5" /></button>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">Category</label>
                    <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                      className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground">
                      {SERVICE_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">Title *</label>
                    <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                      className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground" placeholder="Service name" />
                  </div>

                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">Description</label>
                    <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                      className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground resize-none" rows={2} />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
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
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-muted-foreground mb-1">Provider Name</label>
                      <input value={form.provider_name} onChange={e => setForm(f => ({ ...f, provider_name: e.target.value }))}
                        className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground" />
                    </div>
                    <div>
                      <label className="block text-xs text-muted-foreground mb-1">Provider Phone</label>
                      <input value={form.provider_phone} onChange={e => setForm(f => ({ ...f, provider_phone: e.target.value }))}
                        className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground" />
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

export default ConciergeServices;
