import { useState, useEffect, useCallback, useRef } from "react";
import { useCountryFilter } from "@/hooks/useCountryFilter";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/lib/i18n";
import { Plus, Trash2, Download, Sofa, Camera, X, Image as ImageIcon, ChevronDown } from "lucide-react";
import jsPDF from "jspdf";

interface FurnitureItem {
  id: string; property_id: string; room_name: string; item_name: string;
  quantity: number; condition: string; notes: string; photo_url: string | null;
}
interface Property { id: string; label: string; furnished: boolean | null; country: string; }

const PRESET_FURNITURE: Record<string, string[]> = {
  salon: [
    "Canapé", "Canapé d'angle", "Fauteuil", "Table basse", "Meuble TV", "Bibliothèque",
    "Étagère", "Lampadaire", "Lampe de table", "Tapis", "Rideau", "Store",
    "Console", "Pouf", "Table d'appoint", "Cadre / Tableau", "Miroir", "Coussin décoratif",
  ],
  bedroom: [
    "Lit (sommier + matelas)", "Lit simple", "Lit double", "Table de chevet", "Commode",
    "Armoire", "Penderie", "Bureau", "Chaise de bureau", "Lampe de chevet",
    "Miroir", "Rideau", "Store", "Tapis", "Couette", "Oreillers", "Linge de lit",
  ],
  kitchen: [
    "Réfrigérateur", "Congélateur", "Four", "Micro-ondes", "Plaque de cuisson",
    "Hotte aspirante", "Lave-vaisselle", "Grille-pain", "Bouilloire", "Cafetière",
    "Table", "Chaises", "Tabourets de bar", "Vaisselle (set)", "Couverts (set)",
    "Casseroles (set)", "Poêles (set)", "Verres (set)", "Tasses (set)",
    "Ustensiles de cuisine", "Poubelle", "Égouttoir",
  ],
  bathroom: [
    "Meuble vasque", "Miroir", "Douche", "Baignoire", "WC", "Lave-linge",
    "Sèche-linge", "Sèche-serviettes", "Rideau de douche", "Tapis de bain",
    "Porte-serviettes", "Poubelle", "Étagère de rangement",
  ],
  entrance: [
    "Porte-manteau", "Meuble à chaussures", "Miroir", "Console d'entrée",
    "Tapis d'entrée", "Porte-parapluie", "Patère murale",
  ],
  office: [
    "Bureau", "Chaise de bureau", "Étagère", "Lampe de bureau", "Caisson de rangement",
    "Imprimante", "Corbeille à papier",
  ],
};

const ROOM_KEY_MAP: Record<string, string> = {
  "page.furniture.room_salon": "salon",
  "page.furniture.room_bedroom": "bedroom",
  "page.furniture.room_kitchen": "kitchen",
  "page.furniture.room_bathroom": "bathroom",
  "page.furniture.room_entrance": "entrance",
  "page.furniture.room_office": "office",
};

const FurnitureInventory = () => {
  const { user, orgId } = useAuth();
  const { toast } = useToast();
  const { t } = useI18n();
  const countryFilter = useCountryFilter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<FurnitureItem[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProp, setSelectedProp] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const CONDITIONS = [
    { value: "new", label: t("page.furniture.cond_new") },
    { value: "good", label: t("page.furniture.cond_good") },
    { value: "fair", label: t("page.furniture.cond_fair") },
    { value: "poor", label: t("page.furniture.cond_poor") },
  ];

  const ROOM_KEYS = [
    "page.furniture.room_salon", "page.furniture.room_bedroom", "page.furniture.room_kitchen",
    "page.furniture.room_bathroom", "page.furniture.room_entrance", "page.furniture.room_office",
  ];
  const DEFAULT_ROOMS = ROOM_KEYS.map(k => t(k));

  const [form, setForm] = useState({ property_id: "", room_name: "", item_name: "", quantity: 0, condition: "good", notes: "" });

  // Set default room after translations load
  useEffect(() => {
    if (!form.room_name && DEFAULT_ROOMS[0]) {
      setForm(f => ({ ...f, room_name: DEFAULT_ROOMS[0] }));
    }
  }, [DEFAULT_ROOMS[0]]);

  const load = useCallback(async () => {
    if (!orgId) return;
    let propQuery = supabase.from("properties").select("id, label, furnished, country").eq("org_id", orgId);
    if (countryFilter) propQuery = propQuery.eq("country", countryFilter);
    propQuery = propQuery.order("country").order("label");
    const { data: p } = await propQuery;
    const filteredProps = p || [];
    setProperties(filteredProps as Property[]);

    // Filter furniture items to only properties in the current country
    const propIds = filteredProps.map(pr => pr.id);
    if (propIds.length > 0) {
      const { data: f } = await supabase.from("furniture_items").select("*").eq("org_id", orgId).in("property_id", propIds);
      setItems((f || []) as FurnitureItem[]);
    } else if (!countryFilter) {
      const { data: f } = await supabase.from("furniture_items").select("*").eq("org_id", orgId);
      setItems((f || []) as FurnitureItem[]);
    } else {
      setItems([]);
    }
    setLoading(false);
  }, [orgId, countryFilter]);

  useEffect(() => { load(); }, [load]);

  const getCurrentRoomKey = () => {
    const idx = DEFAULT_ROOMS.indexOf(form.room_name);
    if (idx >= 0) return ROOM_KEY_MAP[ROOM_KEYS[idx]] || "salon";
    return "salon";
  };

  const suggestions = PRESET_FURNITURE[getCurrentRoomKey()] || [];

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "Fichier trop volumineux (max 5 Mo)", variant: "destructive" });
      return;
    }
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const uploadPhoto = async (itemId: string): Promise<string | null> => {
    if (!photoFile || !orgId) return null;
    const ext = photoFile.name.split(".").pop() || "jpg";
    const path = `${orgId}/furniture/${itemId}.${ext}`;
    const { error } = await supabase.storage.from("property-photos").upload(path, photoFile, { upsert: true });
    if (error) {
      console.error("Upload error:", error.message);
      return null;
    }
    const { data } = supabase.storage.from("property-photos").getPublicUrl(path);
    return data.publicUrl;
  };

  const save = async () => {
    if (!orgId || !form.property_id || !form.item_name) return;
    setUploading(true);
    const { data, error } = await supabase.from("furniture_items").insert({
      org_id: orgId, property_id: form.property_id, room_name: form.room_name,
      item_name: form.item_name, quantity: form.quantity, condition: form.condition, notes: form.notes,
    } as any).select().single();
    if (error) {
      toast({ title: t("page.common.error"), description: error.message, variant: "destructive" });
      setUploading(false);
      return;
    }
    // Upload photo if selected
    if (photoFile && data) {
      const photoUrl = await uploadPhoto(data.id);
      if (photoUrl) {
        await supabase.from("furniture_items").update({ photo_url: photoUrl } as any).eq("id", data.id);
      }
    }
    toast({ title: t("page.furniture.added") });
    setForm(f => ({ ...f, item_name: "", quantity: 0, notes: "" }));
    setPhotoFile(null);
    setPhotoPreview(null);
    setShowSuggestions(false);
    setUploading(false);
    await load();
  };

  const uploadPhotoForItem = async (itemId: string, file: File) => {
    if (!orgId) return;
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${orgId}/furniture/${itemId}.${ext}`;
    const { error } = await supabase.storage.from("property-photos").upload(path, file, { upsert: true });
    if (error) { toast({ title: t("page.common.error"), description: error.message, variant: "destructive" }); return; }
    const { data } = supabase.storage.from("property-photos").getPublicUrl(path);
    await supabase.from("furniture_items").update({ photo_url: data.publicUrl } as any).eq("id", itemId);
    toast({ title: "Photo ajoutée" });
    await load();
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("furniture_items").delete().eq("id", id);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    // Also try to remove photo
    if (orgId) {
      await supabase.storage.from("property-photos").remove([`${orgId}/furniture/${id}.jpg`, `${orgId}/furniture/${id}.png`, `${orgId}/furniture/${id}.webp`]);
    }
    await load();
  };

  const filtered = selectedProp ? items.filter(i => i.property_id === selectedProp) : items;
  const grouped = filtered.reduce((acc, item) => { if (!acc[item.room_name]) acc[item.room_name] = []; acc[item.room_name].push(item); return acc; }, {} as Record<string, FurnitureItem[]>);
  const condLabel = (c: string) => CONDITIONS.find(x => x.value === c)?.label || c;
  const groupedByProp = items.reduce((acc, item) => { if (!acc[item.property_id]) acc[item.property_id] = []; acc[item.property_id].push(item); return acc; }, {} as Record<string, FurnitureItem[]>);

  // Group properties by country
  const countryCodes: Record<string, string> = { FR: "🇫🇷", DE: "🇩🇪", ES: "🇪🇸", IT: "🇮🇹", PT: "🇵🇹", GB: "🇬🇧", BE: "🇧🇪", CH: "🇨🇭", AT: "🇦🇹", NL: "🇳🇱", LU: "🇱🇺", IE: "🇮🇪", PL: "🇵🇱", CZ: "🇨🇿", SK: "🇸🇰", HU: "🇭🇺", RO: "🇷🇴", BG: "🇧🇬", HR: "🇭🇷", GR: "🇬🇷", DK: "🇩🇰", SE: "🇸🇪", NO: "🇳🇴", FI: "🇫🇮" };
  const propsByCountry = properties.reduce((acc, p) => {
    const c = (p.country || "XX").toUpperCase();
    if (!acc[c]) acc[c] = [];
    acc[c].push(p);
    return acc;
  }, {} as Record<string, Property[]>);

  const loadImageBase64 = async (url: string): Promise<string | null> => {
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(blob);
      });
    } catch { return null; }
  };

  const downloadPDFFile = async () => {
    setUploading(true);
    try {
      const prop = properties.find(p => p.id === selectedProp);
      const doc = new jsPDF();
      const PAGE_W = 210;
      const MARGIN = 20;
      const CONTENT_W = PAGE_W - MARGIN * 2;

      const checkPage = (y: number, need: number) => {
        if (y + need > 275) { doc.addPage(); return 25; }
        return y;
      };

      // Header
      doc.setFillColor(212, 163, 74); doc.rect(0, 0, PAGE_W, 8, "F");
      doc.setFont("helvetica", "bold"); doc.setFontSize(16); doc.setTextColor(26, 39, 68);
      doc.text(t("page.furniture.pdf_title"), MARGIN, 25);
      doc.setFontSize(10); doc.setTextColor(100, 100, 100);
      doc.text(prop ? `${t("page.furniture.property")} : ${prop.label}` : t("page.furniture.all_properties"), MARGIN, 33);
      doc.setDrawColor(212, 163, 74); doc.setLineWidth(0.5);
      doc.line(MARGIN, 37, PAGE_W - MARGIN, 37);
      let y = 46;

      for (const [room, roomItems] of Object.entries(grouped)) {
        y = checkPage(y, 20);
        doc.setFont("helvetica", "bold"); doc.setFontSize(12); doc.setTextColor(26, 39, 68);
        doc.text(room, MARGIN, y);
        doc.setDrawColor(212, 163, 74); doc.setLineWidth(0.3);
        doc.line(MARGIN, y + 2, MARGIN + 40, y + 2);
        y += 9;

        for (const item of roomItems) {
          y = checkPage(y, 50);
          doc.setFont("helvetica", "bold"); doc.setFontSize(10); doc.setTextColor(50, 50, 50);
          const condColor: Record<string, [number, number, number]> = {
            new: [22, 163, 74], good: [22, 163, 74], fair: [202, 138, 4], poor: [220, 38, 38],
          };
          const textLine = `${item.item_name} (x${item.quantity})`;
          doc.text(textLine, MARGIN, y);
          const cc = condColor[item.condition] || [100, 100, 100];
          doc.setFont("helvetica", "bold"); doc.setFontSize(8); doc.setTextColor(cc[0], cc[1], cc[2]);
          doc.text(`[${condLabel(item.condition)}]`, MARGIN + 80, y);
          y += 5;

          if (item.notes) {
            doc.setFont("helvetica", "italic"); doc.setFontSize(8); doc.setTextColor(110, 110, 110);
            const noteLines = doc.splitTextToSize(item.notes, CONTENT_W);
            for (const nl of noteLines) {
              y = checkPage(y, 5);
              doc.text(nl, MARGIN, y); y += 4.5;
            }
          }

          // Photo
          if (item.photo_url) {
            y = checkPage(y, 45);
            try {
              const b64 = await loadImageBase64(item.photo_url);
              if (b64) {
                doc.addImage(b64, "JPEG", MARGIN, y, 40, 32);
                y += 35;
              }
            } catch {
              doc.setFont("helvetica", "italic"); doc.setFontSize(7); doc.setTextColor(150, 150, 150);
              doc.text("[Photo non disponible]", MARGIN, y); y += 5;
            }
          }
          y += 3;
        }
        y += 5;
      }

      // Footer on all pages
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFont("helvetica", "italic"); doc.setFontSize(7); doc.setTextColor(110, 110, 110);
        doc.text("Document genere a titre informatif.", MARGIN, 283);
        doc.setFont("helvetica", "bold"); doc.setFontSize(8); doc.setTextColor(26, 39, 68);
        doc.text("EASY-LOCS", PAGE_W / 2 - 8, 289);
        doc.setFont("helvetica", "normal"); doc.setFontSize(7); doc.setTextColor(110, 110, 110);
        doc.text(`Page ${i}/${pageCount}`, PAGE_W - MARGIN, 289, { align: "right" });
        doc.setFillColor(26, 39, 68); doc.rect(0, 291, PAGE_W, 6, "F");
      }

      doc.save(`inventaire_mobilier_${prop?.label || "tous"}.pdf`);
      toast({ title: "PDF téléchargé" });
    } catch (err: any) {
      toast({ title: "Erreur PDF", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="page-header mb-0">
            <h1>{t("page.furniture.title")}</h1>
            <p>{t("page.furniture.subtitle")}</p>
          </div>
          <div className="flex gap-2 shrink-0">
            {selectedProp && filtered.length > 0 && (
              <button onClick={downloadPDFFile} disabled={uploading} className="btn-secondary btn-sm disabled:opacity-50">
                <Download className="h-4 w-4" /> {uploading ? "..." : "PDF"}
              </button>
            )}
            <button onClick={() => setShowForm(!showForm)} className="btn-primary">
              <Plus className="h-4 w-4" /> {t("page.furniture.add")}
            </button>
          </div>
        </div>

        {/* Property selector */}
        <div className="mb-4">
          <select value={selectedProp} onChange={e => { setSelectedProp(e.target.value); setForm(f => ({ ...f, property_id: e.target.value })); }} className="form-select w-auto">
            <option value="">{t("page.furniture.all_properties")}</option>
            {Object.entries(propsByCountry).sort(([a], [b]) => a.localeCompare(b)).map(([country, countryProps]) => (
              <optgroup key={country} label={`${countryCodes[country] || "🌍"} ${country}`}>
                {countryProps.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.label} {p.furnished ? t("page.furniture.furnished") : ""} ({(groupedByProp[p.id] || []).length})
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>

        {/* Add form */}
        {showForm && (
          <div className="bg-card rounded-xl border border-border/50 p-6 mb-6 space-y-4">
            <h3 className="font-semibold text-foreground">{t("page.furniture.add_furniture")}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">{t("page.furniture.property")} *</label>
                <select value={form.property_id} onChange={e => setForm(f => ({ ...f, property_id: e.target.value }))} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm">
                  <option value="">{t("page.common.select")}</option>
                  {properties.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">{t("page.furniture.room")}</label>
                <select value={form.room_name} onChange={e => { setForm(f => ({ ...f, room_name: e.target.value })); setShowSuggestions(false); }} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm">
                  {DEFAULT_ROOMS.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div className="relative">
                <label className="block text-sm font-medium text-foreground mb-1">{t("page.furniture.item")} *</label>
                <div className="flex gap-2">
                  <input value={form.item_name} onChange={e => setForm(f => ({ ...f, item_name: e.target.value }))} className="flex-1 bg-background border border-border rounded-lg px-3 py-2 text-sm" placeholder={t("page.furniture.item_placeholder")} />
                  <button type="button" onClick={() => setShowSuggestions(!showSuggestions)} className="border border-border rounded-lg px-2 hover:bg-muted" title="Suggestions">
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  </button>
                </div>
                {showSuggestions && suggestions.length > 0 && (
                  <div className="absolute z-10 mt-1 w-full bg-card border border-border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                    {suggestions.map(s => (
                      <button key={s} type="button" onClick={() => { setForm(f => ({ ...f, item_name: s })); setShowSuggestions(false); }}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors">
                        {s}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">{t("page.furniture.quantity")}</label>
                <input type="number" min={1} value={form.quantity || ""} onChange={e => setForm(f => ({ ...f, quantity: e.target.value === "" ? 0 : +e.target.value }))} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm" placeholder="1" />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">{t("page.furniture.condition")}</label>
                <select value={form.condition} onChange={e => setForm(f => ({ ...f, condition: e.target.value }))} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm">
                  {CONDITIONS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">{t("page.furniture.notes")}</label>
                <input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm" />
              </div>
              {/* Photo upload */}
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-foreground mb-1">Photo</label>
                {photoPreview ? (
                  <div className="relative inline-block">
                    <img src={photoPreview} alt="Preview" className="h-24 w-24 object-cover rounded-lg border border-border" />
                    <button onClick={() => { setPhotoFile(null); setPhotoPreview(null); }} className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-0.5">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : (
                  <button type="button" onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-2 border border-dashed border-border rounded-lg px-4 py-3 text-sm text-muted-foreground hover:border-accent hover:text-foreground transition-colors">
                    <Camera className="h-4 w-4" /> {t("common.add_photo") || "Add Photo"}
                  </button>
                )}
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoSelect} />
              </div>
            </div>
            <button onClick={save} disabled={uploading} className="bg-gradient-gold text-accent-foreground px-6 py-2 rounded-lg text-sm font-semibold shadow-gold hover:opacity-90 disabled:opacity-50">
              {uploading ? "..." : t("page.furniture.add")}
            </button>
          </div>
        )}

        {/* Content */}
        {loading ? <p className="text-center text-muted-foreground py-8">{t("page.common.loading")}</p> :
          !selectedProp ? (
            properties.length === 0 ? (
              <div className="text-center py-12">
                <Sofa className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-muted-foreground">{t("page.furniture.no_items")}</p>
              </div>
            ) : (
              <div className="space-y-6">
                {Object.entries(propsByCountry).sort(([a], [b]) => a.localeCompare(b)).map(([country, countryProps]) => (
                  <div key={country}>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-lg">{countryCodes[country] || "🌍"}</span>
                      <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">{country}</h3>
                      <span className="text-xs text-muted-foreground">({countryProps.length})</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {countryProps.map(p => {
                        const propItems = groupedByProp[p.id] || [];
                        const roomCount = new Set(propItems.map(i => i.room_name)).size;
                        return (
                          <button key={p.id} onClick={() => { setSelectedProp(p.id); setForm(f => ({ ...f, property_id: p.id })); }}
                            className="bg-card rounded-xl border border-border/50 p-5 text-left hover:border-accent/50 hover:shadow-card-hover transition-all min-h-[6rem]">
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
                  </div>
                ))}
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
                    {/* Photo thumbnail or add-photo button */}
                    {item.photo_url ? (
                      <img src={item.photo_url} alt={item.item_name} className="h-12 w-12 rounded-lg object-cover border border-border shrink-0" />
                    ) : (
                      <label className="h-12 w-12 rounded-lg border border-dashed border-border flex items-center justify-center cursor-pointer hover:border-accent transition-colors shrink-0">
                        <ImageIcon className="h-4 w-4 text-muted-foreground" />
                        <input type="file" accept="image/*" className="hidden" onChange={e => {
                          const f = e.target.files?.[0];
                          if (f) uploadPhotoForItem(item.id, f);
                        }} />
                      </label>
                    )}
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
