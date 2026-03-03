import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Plus, X, Trash2, Camera, CheckCircle, ChevronDown, ChevronUp,
  ArrowLeft, Save, Star, AlertTriangle, Zap, Droplets, ThermometerSun,
  Download, Send, FileCheck
} from "lucide-react";
import { generateInventoryPDF } from "@/lib/inventory-pdf-generator";
import { downloadPDF, pdfToDataUri } from "@/lib/pdf-generator";

/* ─── Types ─── */
interface InventoryRoom {
  id: string;
  room_name: string;
  sort_order: number;
  items: InventoryItem[];
  expanded: boolean;
}

interface InventoryItem {
  id: string;
  element_name: string;
  condition: "good" | "average" | "bad";
  notes: string;
  photo_urls: string[];
  sort_order: number;
}

interface Props {
  propertyId: string;
  tenantId?: string;
  reportType: "entry" | "exit";
  propertyLabel: string;
  onBack: () => void;
  existingReportId?: string;
}

const DEFAULT_ROOMS = [
  "Entrée / Couloir", "Salon / Séjour", "Cuisine",
  "Chambre 1", "Salle de bain", "WC",
];

const DEFAULT_ELEMENTS = [
  "Sol", "Murs", "Plafond", "Porte", "Fenêtres",
  "Prises électriques", "Interrupteurs", "Radiateur / Chauffage",
  "Éclairage", "Placards / Rangements",
];

const conditionLabels: Record<string, { label: string; color: string; icon: typeof Star }> = {
  good: { label: "Bon", color: "bg-green-500/20 text-green-700 border-green-500/30", icon: CheckCircle },
  average: { label: "Moyen", color: "bg-yellow-500/20 text-yellow-700 border-yellow-500/30", icon: AlertTriangle },
  bad: { label: "Mauvais", color: "bg-red-500/20 text-red-700 border-red-500/30", icon: X },
};

const InventoryBuilder = ({ propertyId, tenantId, reportType, propertyLabel, onBack, existingReportId }: Props) => {
  const { user, orgId } = useAuth();
  const { toast } = useToast();

  const [reportId, setReportId] = useState(existingReportId || "");
  const [reportDate, setReportDate] = useState(new Date().toISOString().split("T")[0]);
  const [generalNotes, setGeneralNotes] = useState("");
  const [meterElectricity, setMeterElectricity] = useState("");
  const [meterGas, setMeterGas] = useState("");
  const [meterWater, setMeterWater] = useState("");
  const [keysCount, setKeysCount] = useState(0);
  const [keysDetails, setKeysDetails] = useState("");
  const [rooms, setRooms] = useState<InventoryRoom[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(!!existingReportId);
  const [newRoomName, setNewRoomName] = useState("");
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [reportStatus, setReportStatus] = useState("draft");
  const [landlordSignature, setLandlordSignature] = useState("");
  const [stampUrl, setStampUrl] = useState("");
  const [tenantName, setTenantName] = useState("");

  // Init with default rooms if new
  useEffect(() => {
    if (!existingReportId) {
      setRooms(
        DEFAULT_ROOMS.map((name, i) => ({
          id: crypto.randomUUID(),
          room_name: name,
          sort_order: i,
          expanded: i === 0,
          items: DEFAULT_ELEMENTS.map((el, j) => ({
            id: crypto.randomUUID(),
            element_name: el,
            condition: "good" as const,
            notes: "",
            photo_urls: [],
            sort_order: j,
          })),
        }))
      );
    }
  }, [existingReportId]);

  // Load existing report
  useEffect(() => {
    if (!existingReportId) return;
    const load = async () => {
      setLoading(true);
      const { data: report } = await supabase
        .from("inventory_reports")
        .select("*")
        .eq("id", existingReportId)
        .single();
      if (report) {
        setReportDate(report.report_date);
        setGeneralNotes(report.general_notes || "");
        setMeterElectricity(report.meter_electricity || "");
        setMeterGas(report.meter_gas || "");
        setMeterWater(report.meter_water || "");
        setKeysCount(report.keys_count || 0);
        setKeysDetails(report.keys_details || "");
        setReportStatus(report.status);
      }
      const { data: dbRooms } = await supabase
        .from("inventory_rooms")
        .select("*")
        .eq("report_id", existingReportId)
        .order("sort_order");
      if (dbRooms && dbRooms.length > 0) {
        const roomsWithItems: InventoryRoom[] = [];
        for (const r of dbRooms) {
          const { data: items } = await supabase
            .from("inventory_items")
            .select("*")
            .eq("room_id", r.id)
            .order("sort_order");
          roomsWithItems.push({
            id: r.id,
            room_name: r.room_name,
            sort_order: r.sort_order,
            expanded: false,
            items: (items || []).map((it: any) => ({
              id: it.id,
              element_name: it.element_name,
              condition: it.condition as "good" | "average" | "bad",
              notes: it.notes || "",
              photo_urls: Array.isArray(it.photo_urls) ? it.photo_urls : [],
              sort_order: it.sort_order,
            })),
          });
        }
        setRooms(roomsWithItems);
      }
      setLoading(false);
    };
    load();
  }, [existingReportId]);

  // Load landlord signature, stamp & tenant name
  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("signature_url").eq("id", user.id).single().then(({ data }) => {
      if (data?.signature_url) setLandlordSignature(data.signature_url);
    });
  }, [user]);

  useEffect(() => {
    if (!orgId) return;
    supabase.from("orgs").select("stamp_url").eq("id", orgId).single().then(({ data }) => {
      if ((data as any)?.stamp_url) setStampUrl((data as any).stamp_url);
    });
  }, [orgId]);

  useEffect(() => {
    if (!tenantId) return;
    supabase.from("tenants").select("name").eq("id", tenantId).single().then(({ data }) => {
      if (data?.name) setTenantName(data.name);
    });
  }, [tenantId]);

  const addRoom = () => {
    if (!newRoomName.trim()) return;
    setRooms(prev => [
      ...prev,
      {
        id: crypto.randomUUID(),
        room_name: newRoomName.trim(),
        sort_order: prev.length,
        expanded: true,
        items: DEFAULT_ELEMENTS.map((el, j) => ({
          id: crypto.randomUUID(),
          element_name: el,
          condition: "good" as const,
          notes: "",
          photo_urls: [],
          sort_order: j,
        })),
      },
    ]);
    setNewRoomName("");
  };

  const removeRoom = (roomId: string) => setRooms(prev => prev.filter(r => r.id !== roomId));
  const toggleRoom = (roomId: string) => setRooms(prev => prev.map(r => r.id === roomId ? { ...r, expanded: !r.expanded } : r));

  const addItem = (roomId: string, elementName: string) => {
    if (!elementName.trim()) return;
    setRooms(prev =>
      prev.map(r =>
        r.id === roomId
          ? { ...r, items: [...r.items, { id: crypto.randomUUID(), element_name: elementName.trim(), condition: "good" as const, notes: "", photo_urls: [], sort_order: r.items.length }] }
          : r
      )
    );
  };

  const removeItem = (roomId: string, itemId: string) => {
    setRooms(prev => prev.map(r => r.id === roomId ? { ...r, items: r.items.filter(it => it.id !== itemId) } : r));
  };

  const updateItemCondition = (roomId: string, itemId: string, condition: "good" | "average" | "bad") => {
    setRooms(prev => prev.map(r => r.id === roomId ? { ...r, items: r.items.map(it => it.id === itemId ? { ...it, condition } : it) } : r));
  };

  const updateItemNotes = (roomId: string, itemId: string, notes: string) => {
    setRooms(prev => prev.map(r => r.id === roomId ? { ...r, items: r.items.map(it => it.id === itemId ? { ...it, notes } : it) } : r));
  };

  const handlePhotoUpload = async (roomId: string, itemId: string, file: File) => {
    if (!user || !orgId) return;
    const ext = file.name.split(".").pop();
    const path = `${orgId}/${reportId || "new"}/${roomId}/${itemId}_${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("rental-docs").upload(path, file);
    if (error) {
      toast({ title: "Erreur upload", description: error.message, variant: "destructive" });
      return;
    }
    const { data: signedData } = await supabase.storage.from("rental-docs").createSignedUrl(path, 60 * 60 * 24 * 365);
    const url = signedData?.signedUrl || path;
    setRooms(prev =>
      prev.map(r =>
        r.id === roomId
          ? { ...r, items: r.items.map(it => it.id === itemId ? { ...it, photo_urls: [...it.photo_urls, url] } : it) }
          : r
      )
    );
  };

  const removePhoto = (roomId: string, itemId: string, photoIndex: number) => {
    setRooms(prev =>
      prev.map(r =>
        r.id === roomId
          ? { ...r, items: r.items.map(it => it.id === itemId ? { ...it, photo_urls: it.photo_urls.filter((_, i) => i !== photoIndex) } : it) }
          : r
      )
    );
  };

  const handleSave = async (finalize = false) => {
    if (!user || !orgId) return;
    setSaving(true);
    try {
      const newStatus = finalize ? "completed" : "draft";
      let rId = reportId;
      if (!rId) {
        const { data, error } = await supabase.from("inventory_reports").insert({
          org_id: orgId, property_id: propertyId, tenant_id: tenantId || null,
          user_id: user.id, report_type: reportType, report_date: reportDate,
          general_notes: generalNotes, meter_electricity: meterElectricity,
          meter_gas: meterGas, meter_water: meterWater,
          keys_count: keysCount, keys_details: keysDetails, status: newStatus,
        }).select("id").single();
        if (error) throw error;
        rId = data.id;
        setReportId(rId);
      } else {
        await supabase.from("inventory_reports").update({
          report_date: reportDate, general_notes: generalNotes,
          meter_electricity: meterElectricity, meter_gas: meterGas, meter_water: meterWater,
          keys_count: keysCount, keys_details: keysDetails, status: newStatus,
        }).eq("id", rId);
        await supabase.from("inventory_rooms").delete().eq("report_id", rId);
      }

      for (const room of rooms) {
        const { data: roomData, error: roomErr } = await supabase
          .from("inventory_rooms")
          .insert({ report_id: rId, room_name: room.room_name, sort_order: room.sort_order })
          .select("id").single();
        if (roomErr) throw roomErr;

        if (room.items.length > 0) {
          const itemsToInsert = room.items.map((it, idx) => ({
            room_id: roomData.id, element_name: it.element_name,
            condition: it.condition, notes: it.notes,
            photo_urls: it.photo_urls, sort_order: idx,
          }));
          const { error: itemErr } = await supabase.from("inventory_items").insert(itemsToInsert);
          if (itemErr) throw itemErr;
        }
      }

      setReportStatus(newStatus);
      toast({ title: finalize ? "État des lieux finalisé !" : "Brouillon enregistré" });
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDownloadPDF = async () => {
    setGeneratingPdf(true);
    try {
      const doc = await generateInventoryPDF({
        propertyLabel,
        reportType,
        reportDate,
        tenantName: tenantName || undefined,
        keysCount,
        keysDetails,
        meterElectricity,
        meterGas,
        meterWater,
        generalNotes,
        rooms: rooms.map(r => ({
          room_name: r.room_name,
          items: r.items.map(it => ({
            element_name: it.element_name,
            condition: it.condition,
            notes: it.notes,
            photo_urls: it.photo_urls,
          })),
        })),
      }, landlordSignature ? { landlord: landlordSignature } : undefined, stampUrl || undefined);

      const typeStr = reportType === "entry" ? "entree" : "sortie";
      downloadPDF(doc, `etat_des_lieux_${typeStr}_${reportDate}.pdf`);
      toast({ title: "PDF téléchargé !" });
    } catch (err: any) {
      toast({ title: "Erreur PDF", description: err.message, variant: "destructive" });
    } finally {
      setGeneratingPdf(false);
    }
  };

  const handleFinalizeAndSend = async () => {
    await handleSave(true);
    await handleDownloadPDF();

    // Send notification to tenant if linked
    if (tenantId && orgId) {
      try {
        const { data: tenant } = await supabase.from("tenants").select("tenant_user_id, email, name").eq("id", tenantId).single();
        if (tenant?.tenant_user_id) {
          await supabase.from("notifications").insert({
            user_id: tenant.tenant_user_id,
            org_id: orgId,
            type: "info",
            title: `📋 État des lieux ${reportType === "entry" ? "d'entrée" : "de sortie"}`,
            message: `L'état des lieux pour ${propertyLabel} a été finalisé.`,
            link: "/tenant/documents",
          });
        }
        // Send email
        if (tenant?.email) {
          await supabase.functions.invoke("send-email", {
            body: {
              to: tenant.email,
              subject: `État des lieux ${reportType === "entry" ? "d'entrée" : "de sortie"} — ${propertyLabel}`,
              html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;background:#fff;">
                <h2 style="color:#1a2744;text-align:center;">📋 État des lieux finalisé</h2>
                <p style="color:#555;">Bonjour ${tenant.name || ""},</p>
                <p style="color:#555;">L'état des lieux ${reportType === "entry" ? "d'entrée" : "de sortie"} pour <strong>${propertyLabel}</strong> a été finalisé le ${reportDate}.</p>
                <p style="color:#555;">Vous pouvez consulter ce document dans votre espace locataire.</p>
                <p style="color:#aaa;font-size:11px;text-align:center;margin-top:32px;">EASY-LOCS® — Gestion locative intelligente</p>
              </div>`,
            },
          });
        }
      } catch {}
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent" />
      </div>
    );
  }

  const totalItems = rooms.reduce((s, r) => s + r.items.length, 0);
  const goodCount = rooms.reduce((s, r) => s + r.items.filter(i => i.condition === "good").length, 0);
  const avgCount = rooms.reduce((s, r) => s + r.items.filter(i => i.condition === "average").length, 0);
  const badCount = rooms.reduce((s, r) => s + r.items.filter(i => i.condition === "bad").length, 0);
  const totalPhotos = rooms.reduce((s, r) => s + r.items.reduce((s2, it) => s2 + it.photo_urls.length, 0), 0);

  return (
    <div className="max-w-4xl mx-auto">
      <button onClick={onBack} className="text-sm text-accent hover:underline mb-4 flex items-center gap-1">
        <ArrowLeft className="h-3.5 w-3.5" /> Retour
      </button>

      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-foreground">
            État des lieux {reportType === "entry" ? "d'entrée" : "de sortie"}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">{propertyLabel}{tenantName && ` — ${tenantName}`}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={() => handleSave(false)} disabled={saving}
            className="flex items-center gap-2 border border-border text-foreground text-sm px-4 py-2.5 rounded-lg hover:bg-muted transition-colors disabled:opacity-50">
            <Save className="h-4 w-4" />{saving ? "…" : "Brouillon"}
          </button>
          <button onClick={handleDownloadPDF} disabled={generatingPdf}
            className="flex items-center gap-2 border border-border text-foreground text-sm px-4 py-2.5 rounded-lg hover:bg-muted transition-colors disabled:opacity-50">
            <Download className="h-4 w-4" />{generatingPdf ? "Génération…" : "PDF"}
          </button>
          <button onClick={handleFinalizeAndSend} disabled={saving || generatingPdf}
            className="flex items-center gap-2 bg-gradient-gold text-accent-foreground text-sm font-semibold px-5 py-2.5 rounded-lg shadow-gold hover:opacity-90 transition-opacity disabled:opacity-50">
            <FileCheck className="h-4 w-4" />Finaliser & Envoyer
          </button>
        </div>
      </div>

      {/* Status badge */}
      {reportStatus === "completed" && (
        <div className="flex items-center gap-2 bg-green-500/10 border border-green-500/30 rounded-lg px-4 py-2.5 mb-6">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <p className="text-sm text-green-700 font-medium">État des lieux finalisé</p>
        </div>
      )}

      {/* Summary KPIs */}
      <div className="grid grid-cols-5 gap-3 mb-6">
        <div className="bg-card rounded-xl p-4 shadow-card border border-border/50 text-center">
          <div className="text-2xl font-bold text-foreground">{rooms.length}</div>
          <div className="text-xs text-muted-foreground">Pièces</div>
        </div>
        <div className="bg-card rounded-xl p-4 shadow-card border border-border/50 text-center">
          <div className="text-2xl font-bold text-green-600">{goodCount}</div>
          <div className="text-xs text-muted-foreground">Bon état</div>
        </div>
        <div className="bg-card rounded-xl p-4 shadow-card border border-border/50 text-center">
          <div className="text-2xl font-bold text-yellow-600">{avgCount}</div>
          <div className="text-xs text-muted-foreground">Moyen</div>
        </div>
        <div className="bg-card rounded-xl p-4 shadow-card border border-border/50 text-center">
          <div className="text-2xl font-bold text-red-600">{badCount}</div>
          <div className="text-xs text-muted-foreground">Mauvais</div>
        </div>
        <div className="bg-card rounded-xl p-4 shadow-card border border-border/50 text-center">
          <div className="text-2xl font-bold text-accent">{totalPhotos}</div>
          <div className="text-xs text-muted-foreground">Photos</div>
        </div>
      </div>

      {/* General Info */}
      <div className="bg-card rounded-xl p-6 shadow-card border border-border/50 mb-6">
        <h3 className="font-semibold text-foreground mb-4">Informations générales</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Date</label>
            <input type="date" value={reportDate} onChange={e => setReportDate(e.target.value)}
              className="w-full bg-muted/50 border border-border/50 rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent" />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Clés remises</label>
            <div className="flex gap-2">
              <input type="number" value={keysCount || ""} onChange={e => setKeysCount(+e.target.value)} placeholder="Nb"
                onFocus={e => { if (e.target.value === "0") e.target.value = ""; }}
                className="w-20 bg-muted/50 border border-border/50 rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent" />
              <input value={keysDetails} onChange={e => setKeysDetails(e.target.value)} placeholder="Détails (badge, boîte aux lettres…)"
                className="flex-1 bg-muted/50 border border-border/50 rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-accent" />
            </div>
          </div>
        </div>

        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mt-4 mb-2">Relevés de compteurs</h4>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-yellow-500 shrink-0" />
            <input value={meterElectricity} onChange={e => setMeterElectricity(e.target.value)} placeholder="Électricité (kWh)"
              className="flex-1 bg-muted/50 border border-border/50 rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-accent" />
          </div>
          <div className="flex items-center gap-2">
            <ThermometerSun className="h-4 w-4 text-orange-500 shrink-0" />
            <input value={meterGas} onChange={e => setMeterGas(e.target.value)} placeholder="Gaz (m³)"
              className="flex-1 bg-muted/50 border border-border/50 rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-accent" />
          </div>
          <div className="flex items-center gap-2">
            <Droplets className="h-4 w-4 text-blue-500 shrink-0" />
            <input value={meterWater} onChange={e => setMeterWater(e.target.value)} placeholder="Eau (m³)"
              className="flex-1 bg-muted/50 border border-border/50 rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-accent" />
          </div>
        </div>

        <div className="mt-4">
          <label className="block text-xs font-medium text-muted-foreground mb-1">Observations générales</label>
          <textarea value={generalNotes} onChange={e => setGeneralNotes(e.target.value)} rows={2} placeholder="Remarques sur l'état général du logement…"
            className="w-full bg-muted/50 border border-border/50 rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-accent" />
        </div>
      </div>

      {/* Rooms */}
      <div className="space-y-4 mb-6">
        {rooms.map((room) => (
          <div key={room.id} className="bg-card rounded-xl shadow-card border border-border/50 overflow-hidden">
            <button onClick={() => toggleRoom(room.id)}
              className="w-full flex items-center justify-between px-5 py-4 hover:bg-muted/20 transition-colors">
              <div className="flex items-center gap-3">
                <span className="font-semibold text-foreground text-sm">{room.room_name}</span>
                <span className="text-xs text-muted-foreground">{room.items.length} élément{room.items.length !== 1 ? "s" : ""}</span>
                <span className="text-xs text-accent">{room.items.reduce((s, it) => s + it.photo_urls.length, 0)} 📷</span>
                <div className="flex gap-1">
                  {room.items.filter(i => i.condition === "good").length > 0 && <span className="w-2 h-2 rounded-full bg-green-500" />}
                  {room.items.filter(i => i.condition === "average").length > 0 && <span className="w-2 h-2 rounded-full bg-yellow-500" />}
                  {room.items.filter(i => i.condition === "bad").length > 0 && <span className="w-2 h-2 rounded-full bg-red-500" />}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={(e) => { e.stopPropagation(); removeRoom(room.id); }}
                  className="text-muted-foreground/40 hover:text-destructive transition-colors p-1">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
                {room.expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
              </div>
            </button>

            {room.expanded && (
              <div className="px-5 pb-5 space-y-3 border-t border-border/50 pt-4">
                {room.items.map((item) => {
                  const cond = conditionLabels[item.condition];
                  return (
                    <div key={item.id} className="bg-muted/20 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-foreground">{item.element_name}</span>
                        <div className="flex items-center gap-1">
                          {(["good", "average", "bad"] as const).map(c => {
                            const cl = conditionLabels[c];
                            const Icon = cl.icon;
                            return (
                              <button key={c} onClick={() => updateItemCondition(room.id, item.id, c)}
                                className={`flex items-center gap-1 text-xs px-2 py-1 rounded-md border transition-colors ${item.condition === c ? cl.color : "border-border/50 text-muted-foreground hover:bg-muted/50"}`}>
                                <Icon className="h-3 w-3" />{cl.label}
                              </button>
                            );
                          })}
                          <button onClick={() => removeItem(room.id, item.id)}
                            className="text-muted-foreground/40 hover:text-destructive transition-colors p-1 ml-1">
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <input value={item.notes} onChange={e => updateItemNotes(room.id, item.id, e.target.value)}
                          placeholder="Notes / observations…"
                          className="flex-1 bg-background border border-border/50 rounded px-2 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-accent" />
                        <label className="flex items-center gap-1 text-xs text-accent cursor-pointer hover:underline shrink-0">
                          <Camera className="h-3.5 w-3.5" />Photo
                          <input type="file" accept="image/*" className="hidden" multiple
                            onChange={e => {
                              const files = e.target.files;
                              if (files) {
                                Array.from(files).forEach(f => handlePhotoUpload(room.id, item.id, f));
                              }
                            }} />
                        </label>
                      </div>

                      {item.photo_urls.length > 0 && (
                        <div className="flex gap-2 mt-2 flex-wrap">
                          {item.photo_urls.map((url, i) => (
                            <div key={i} className="relative group">
                              <img src={url} alt={`Photo ${i + 1}`} className="h-16 w-16 object-cover rounded border border-border/50" />
                              <button onClick={() => removePhoto(room.id, item.id, i)}
                                className="absolute -top-1 -right-1 bg-destructive text-white rounded-full w-4 h-4 flex items-center justify-center text-[10px] opacity-0 group-hover:opacity-100 transition-opacity">
                                ×
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
                <AddElementInline onAdd={(name) => addItem(room.id, name)} />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Add room */}
      <div className="flex gap-2 mb-8">
        <input value={newRoomName} onChange={e => setNewRoomName(e.target.value)}
          onKeyDown={e => e.key === "Enter" && addRoom()}
          placeholder="Ajouter une pièce (ex: Chambre 2, Balcon…)"
          className="flex-1 bg-muted/50 border border-border/50 rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-accent" />
        <button onClick={addRoom} className="flex items-center gap-2 bg-accent/10 text-accent px-4 py-2.5 rounded-lg hover:bg-accent/20 transition-colors text-sm font-medium">
          <Plus className="h-4 w-4" />Ajouter
        </button>
      </div>
    </div>
  );
};

/* ─── Inline element adder ─── */
const AddElementInline = ({ onAdd }: { onAdd: (name: string) => void }) => {
  const [name, setName] = useState("");
  return (
    <div className="flex gap-2 mt-2">
      <input value={name} onChange={e => setName(e.target.value)}
        onKeyDown={e => { if (e.key === "Enter" && name.trim()) { onAdd(name); setName(""); } }}
        placeholder="Ajouter un élément…"
        className="flex-1 bg-background border border-border/50 rounded px-2 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-accent" />
      <button onClick={() => { if (name.trim()) { onAdd(name); setName(""); } }}
        className="text-xs text-accent hover:underline flex items-center gap-1">
        <Plus className="h-3 w-3" />Ajouter
      </button>
    </div>
  );
};

export default InventoryBuilder;
