import { useState, useEffect, useCallback } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/lib/i18n";
import { Plus, Trash2, Download, Sofa } from "lucide-react";
import jsPDF from "jspdf";

interface FurnitureItem { id: string; property_id: string; room_name: string; item_name: string; quantity: number; condition: string; notes: string; }
interface Property { id: string; label: string; furnished: boolean | null; }

const FurnitureInventory = () => {
  const { user, orgId } = useAuth();
  const { toast } = useToast();
  const { t } = useI18n();
  const [items, setItems] = useState<FurnitureItem[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProp, setSelectedProp] = useState("");
  const [showForm, setShowForm] = useState(false);

  const CONDITIONS = [
    { value: "new", label: t("page.furniture.cond_new") },
    { value: "good", label: t("page.furniture.cond_good") },
    { value: "fair", label: t("page.furniture.cond_fair") },
    { value: "poor", label: t("page.furniture.cond_poor") },
  ];

  const DEFAULT_ROOMS = [
    t("page.furniture.room_salon"), t("page.furniture.room_bedroom"), t("page.furniture.room_kitchen"),
    t("page.furniture.room_bathroom"), t("page.furniture.room_entrance"), t("page.furniture.room_office"),
  ];

  const [form, setForm] = useState({ property_id: "", room_name: DEFAULT_ROOMS[0], item_name: "", quantity: 1, condition: "good", notes: "" });

  const load = useCallback(async () => {
    if (!orgId) return;
    const [{ data: f }, { data: p }] = await Promise.all([
      supabase.from("furniture_items").select("*").eq("org_id", orgId),
      supabase.from("properties").select("id, label, furnished").eq("org_id", orgId).order("label"),
    ]);
    if (f) setItems(f as FurnitureItem[]);
    if (p) setProperties(p as Property[]);
    setLoading(false);
  }, [orgId]);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    if (!orgId || !form.property_id || !form.item_name) return;
    const { error } = await supabase.from("furniture_items").insert({
      org_id: orgId, property_id: form.property_id, room_name: form.room_name,
      item_name: form.item_name, quantity: form.quantity, condition: form.condition, notes: form.notes,
    });
    if (error) { toast({ title: t("page.common.error"), description: error.message, variant: "destructive" }); return; }
    toast({ title: t("page.furniture.added") });
    setForm(f => ({ ...f, item_name: "", quantity: 1, notes: "" }));
    await load();
  };

  const remove = async (id: string) => { await supabase.from("furniture_items").delete().eq("id", id); await load(); };

  const filtered = selectedProp ? items.filter(i => i.property_id === selectedProp) : items;
  const grouped = filtered.reduce((acc, item) => { if (!acc[item.room_name]) acc[item.room_name] = []; acc[item.room_name].push(item); return acc; }, {} as Record<string, FurnitureItem[]>);
  const propName = (id: string) => properties.find(p => p.id === id)?.label || "—";
  const condLabel = (c: string) => CONDITIONS.find(x => x.value === c)?.label || c;

  // Group items by property for overview
  const groupedByProp = items.reduce((acc, item) => { if (!acc[item.property_id]) acc[item.property_id] = []; acc[item.property_id].push(item); return acc; }, {} as Record<string, FurnitureItem[]>);

  const downloadPDFFile = () => {
    const prop = properties.find(p => p.id === selectedProp);
    const doc = new jsPDF();
    doc.setFillColor(212, 163, 74); doc.rect(0, 0, 210, 8, "F");
    doc.setFont("helvetica", "bold"); doc.setFontSize(16); doc.setTextColor(26, 39, 68);
    doc.text(t("page.furniture.pdf_title"), 20, 25);
    doc.setFontSize(10); doc.setTextColor(100, 100, 100);
    doc.text(prop ? `${t("page.furniture.property")} : ${prop.label}` : t("page.furniture.all_properties"), 20, 33);
    let y = 50;
    for (const [room, roomItems] of Object.entries(grouped)) {
      if (y > 250) { doc.addPage(); y = 20; }
      doc.setFont("helvetica", "bold"); doc.setFontSize(12); doc.setTextColor(26, 39, 68); doc.text(room, 20, y); y += 8;
      for (const item of roomItems) {
        if (y > 270) { doc.addPage(); y = 20; }
        doc.setFont("helvetica", "normal"); doc.setFontSize(10); doc.setTextColor(50, 50, 50);
        doc.text(`• ${item.item_name} (x${item.quantity}) — ${condLabel(item.condition)}${item.notes ? ` — ${item.notes}` : ""}`, 25, y); y += 6;
      }
      y += 4;
    }
    doc.setFillColor(26, 39, 68); doc.rect(0, 290, 210, 7, "F");
    doc.save(`inventaire_mobilier_${prop?.label || "tous"}.pdf`);
  };

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">{t("page.furniture.title")}</h1>
            <p className="text-sm text-muted-foreground">{t("page.furniture.subtitle")}</p>
          </div>
          <div className="flex gap-2">
            {selectedProp && filtered.length > 0 && (
              <button onClick={downloadPDFFile} className="flex items-center gap-2 border border-border text-foreground px-3 py-2 rounded-lg text-sm hover:bg-muted">
                <Download className="h-4 w-4" /> PDF
              </button>
            )}
            <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 bg-gradient-gold text-accent-foreground px-4 py-2 rounded-lg text-sm font-semibold shadow-gold hover:opacity-90">
              <Plus className="h-4 w-4" /> {t("page.furniture.add")}
            </button>
          </div>
        </div>

        <div className="mb-4">
          <select value={selectedProp} onChange={e => { setSelectedProp(e.target.value); setForm(f => ({ ...f, property_id: e.target.value })); }} className="bg-background border border-border rounded-lg px-3 py-2 text-sm">
            <option value="">{t("page.furniture.all_properties")}</option>
            {properties.map(p => (
              <option key={p.id} value={p.id}>
                {p.label} {p.furnished ? t("page.furniture.furnished") : ""} ({(groupedByProp[p.id] || []).length})
              </option>
            ))}
          </select>
        </div>

        {showForm && (
          <div className="bg-card rounded-xl border border-border/50 p-6 mb-6 space-y-4">
            <h3 className="font-semibold text-foreground">{t("page.furniture.add_furniture")}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div><label className="block text-sm font-medium text-foreground mb-1">{t("page.furniture.property")} *</label><select value={form.property_id} onChange={e => setForm(f => ({ ...f, property_id: e.target.value }))} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm"><option value="">{t("page.common.select")}</option>{properties.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}</select></div>
              <div><label className="block text-sm font-medium text-foreground mb-1">{t("page.furniture.room")}</label><select value={form.room_name} onChange={e => setForm(f => ({ ...f, room_name: e.target.value }))} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm">{DEFAULT_ROOMS.map(r => <option key={r} value={r}>{r}</option>)}</select></div>
              <div><label className="block text-sm font-medium text-foreground mb-1">{t("page.furniture.item")} *</label><input value={form.item_name} onChange={e => setForm(f => ({ ...f, item_name: e.target.value }))} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm" placeholder={t("page.furniture.item_placeholder")} /></div>
              <div><label className="block text-sm font-medium text-foreground mb-1">{t("page.furniture.quantity")}</label><input type="number" min={1} value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: +e.target.value }))} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm" /></div>
              <div><label className="block text-sm font-medium text-foreground mb-1">{t("page.furniture.condition")}</label><select value={form.condition} onChange={e => setForm(f => ({ ...f, condition: e.target.value }))} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm">{CONDITIONS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}</select></div>
              <div><label className="block text-sm font-medium text-foreground mb-1">{t("page.furniture.notes")}</label><input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm" /></div>
            </div>
            <button onClick={save} className="bg-gradient-gold text-accent-foreground px-6 py-2 rounded-lg text-sm font-semibold shadow-gold hover:opacity-90">{t("page.furniture.add")}</button>
          </div>
        )}

        {loading ? <p className="text-center text-muted-foreground py-8">{t("page.common.loading")}</p> :
          !selectedProp ? (
            /* Overview: show all properties with item counts */
            properties.length === 0 ? (
              <div className="text-center py-12">
                <Sofa className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-muted-foreground">{t("page.furniture.no_items")}</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {properties.map(p => {
                  const propItems = groupedByProp[p.id] || [];
                  const roomCount = new Set(propItems.map(i => i.room_name)).size;
                  return (
                    <button key={p.id} onClick={() => { setSelectedProp(p.id); setForm(f => ({ ...f, property_id: p.id })); }}
                      className="bg-card rounded-xl border border-border/50 p-5 text-left hover:border-accent/50 transition-colors">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-semibold text-foreground">{p.label}</h3>
                          <p className="text-xs text-muted-foreground mt-1">
                            {p.furnished ? `${t("page.furniture.furnished")} · ` : ""}
                            {propItems.length} {t("page.furniture.item").toLowerCase()}(s) · {roomCount} {t("page.furniture.room").toLowerCase()}(s)
                          </p>
                        </div>
                        <Sofa className="h-5 w-5 text-accent/60" />
                      </div>
                    </button>
                  );
                })}
              </div>
            )
          ) : Object.keys(grouped).length === 0 ? (
            <div className="text-center py-12">
              <Sofa className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground">{t("page.furniture.no_items")}</p>
            </div>
          ) : Object.entries(grouped).map(([room, roomItems]) => (
            <div key={room} className="mb-4">
              <h3 className="font-semibold text-foreground mb-2">{room}</h3>
              <div className="bg-card rounded-xl border border-border/50 divide-y divide-border/30">
                {roomItems.map(item => (
                  <div key={item.id} className="flex items-center gap-3 px-4 py-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">{item.item_name} <span className="text-muted-foreground">x{item.quantity}</span></p>
                      <p className="text-xs text-muted-foreground">{condLabel(item.condition)} {item.notes && `· ${item.notes}`}</p>
                    </div>
                    <button onClick={() => remove(item.id)} className="text-destructive hover:text-destructive/80"><Trash2 className="h-4 w-4" /></button>
                  </div>
                ))}
              </div>
            </div>
          ))}
      </div>
    </DashboardLayout>
  );
};

export default FurnitureInventory;
