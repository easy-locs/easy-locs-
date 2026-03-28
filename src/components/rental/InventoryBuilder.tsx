import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import * as invRepo from "@/repositories/inventory.repository";
import * as tdRepo from "@/repositories/tenant-docs.repository";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/lib/i18n";
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

const InventoryBuilder = ({ propertyId, tenantId, reportType, propertyLabel, onBack, existingReportId }: Props) => {
  const { user, orgId } = useAuth();
  const { toast } = useToast();
  const { t } = useI18n();

  const conditionLabels: Record<string, { label: string; color: string; icon: typeof Star }> = {
    good: { label: t("page.inventory.cond_good"), color: "bg-green-500/20 text-green-700 border-green-500/30", icon: CheckCircle },
    average: { label: t("page.inventory.cond_average"), color: "bg-yellow-500/20 text-yellow-700 border-yellow-500/30", icon: AlertTriangle },
    bad: { label: t("page.inventory.cond_bad"), color: "bg-red-500/20 text-red-700 border-red-500/30", icon: X },
  };

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

  useEffect(() => {
    if (!existingReportId) return;
    const load = async () => {
      setLoading(true);
      const report = await invRepo.fetchInventoryReport(existingReportId);
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
      const dbRooms = await invRepo.fetchInventoryRooms(existingReportId);
      if (dbRooms.length > 0) {
        const roomsWithItems: InventoryRoom[] = [];
        for (const r of dbRooms) {
          const items = await invRepo.fetchInventoryItems(r.id);
          roomsWithItems.push({
            id: r.id,
            room_name: r.room_name,
            sort_order: r.sort_order,
            expanded: false,
            items: items.map((it: any) => ({
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

  useEffect(() => {
    if (!user) return;
    invRepo.fetchSignatureUrl(user.id).then((url) => {
      if (url) setLandlordSignature(url);
    });
  }, [user]);

  useEffect(() => {
    if (!orgId) return;
    invRepo.fetchOrgStampUrl(orgId).then((url) => {
      if (url) setStampUrl(url);
    });
  }, [orgId]);

  useEffect(() => {
    if (!tenantId) return;
    invRepo.fetchTenantName(tenantId).then((name) => {
      if (name) setTenantName(name);
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
    try {
      const url = await invRepo.uploadInventoryPhoto(orgId, reportId, roomId, itemId, file);
      setRooms(prev =>
        prev.map(r =>
          r.id === roomId
            ? { ...r, items: r.items.map(it => it.id === itemId ? { ...it, photo_urls: [...it.photo_urls, url] } : it) }
            : r
        )
      );
    } catch (error: any) {
      toast({ title: t("page.inventory.upload_error"), description: error.message, variant: "destructive" });
    }
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
        rId = await invRepo.insertInventoryReport({
          org_id: orgId, property_id: propertyId, tenant_id: tenantId || null,
          user_id: user.id, report_type: reportType, report_date: reportDate,
          general_notes: generalNotes, meter_electricity: meterElectricity,
          meter_gas: meterGas, meter_water: meterWater,
          keys_count: keysCount, keys_details: keysDetails, status: newStatus,
        });
        setReportId(rId);
      } else {
        await invRepo.updateInventoryReport(rId, {
          report_date: reportDate, general_notes: generalNotes,
          meter_electricity: meterElectricity, meter_gas: meterGas, meter_water: meterWater,
          keys_count: keysCount, keys_details: keysDetails, status: newStatus,
        });
        await invRepo.deleteRoomsForReport(rId);
      }

      for (const room of rooms) {
        const roomDbId = await invRepo.insertRoom({ report_id: rId, room_name: room.room_name, sort_order: room.sort_order });
        if (room.items.length > 0) {
          const itemsToInsert = room.items.map((it, idx) => ({
            room_id: roomDbId, element_name: it.element_name,
            condition: it.condition, notes: it.notes,
            photo_urls: it.photo_urls, sort_order: idx,
          }));
          await invRepo.insertItems(itemsToInsert);
        }
      }

      setReportStatus(newStatus);
      toast({ title: finalize ? t("page.inventory.finalized_toast") : t("page.inventory.draft_saved") });
    } catch (err: any) {
      toast({ title: t("common.error"), description: err.message, variant: "destructive" });
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
      toast({ title: t("page.inventory.pdf_downloaded") });
    } catch (err: any) {
      toast({ title: t("page.inventory.pdf_error"), description: err.message, variant: "destructive" });
    } finally {
      setGeneratingPdf(false);
    }
  };

  const handleFinalizeAndSend = async () => {
    await handleSave(true);

    let pdfDoc: any = null;
    try {
      pdfDoc = await generateInventoryPDF({
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
      downloadPDF(pdfDoc, `etat_des_lieux_${typeStr}_${reportDate}.pdf`);
      toast({ title: t("page.inventory.pdf_downloaded") });
    } catch (err: any) {
      toast({ title: t("page.inventory.pdf_error"), description: err.message, variant: "destructive" });
    }

    if (tenantId && orgId) {
      try {
        const tenant = await tdRepo.fetchTenantContactInfo(tenantId) as any;
        if (tenant?.tenant_user_id) {
          await tdRepo.insertAppNotificationForTenant({
            user_id: tenant.tenant_user_id,
            org_id: orgId,
            type: "info",
            title: reportType === "entry" ? t("page.inventory.notif_entry") : t("page.inventory.notif_exit"),
            message: t("page.inventory.notif_msg").replace("{property}", propertyLabel),
            link: "/tenant/documents",
          });
        }
        if (tenant?.email) {
          const typeStr = reportType === "entry" ? "entree" : "sortie";
          const attachments: any[] = [];
          if (pdfDoc) {
            try {
              const pdfBase64 = pdfDoc.output("datauristring").split(",")[1];
              attachments.push({
                content: pdfBase64,
                filename: `etat_des_lieux_${typeStr}_${reportDate}.pdf`,
                type: "application/pdf",
              });
            } catch {}
          }
          const emailSubject = reportType === "entry"
            ? `${t("page.inventory.email_subject_entry")} — ${propertyLabel}`
            : `${t("page.inventory.email_subject_exit")} — ${propertyLabel}`;
          await tdRepo.invokeSendEmail({
            to: tenant.email,
            subject: emailSubject,
            html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;background:#fff;">
              <h2 style="color:#1a2744;text-align:center;">${t("page.inventory.email_title")}</h2>
              <p style="color:#555;">${t("page.inventory.email_hello")} ${tenant.name || ""},</p>
              <p style="color:#555;">${t("page.inventory.email_body").replace("{property}", propertyLabel).replace("{date}", reportDate)}</p>
              <p style="color:#555;">${t("page.inventory.email_pdf_note")}</p>
              <p style="color:#aaa;font-size:11px;text-align:center;margin-top:32px;">EASY-LOCS® — ${t("page.listing.powered_by_brand") || "EASY-LOCS®"}</p>
            </div>`,
            attachments,
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
        <ArrowLeft className="h-3.5 w-3.5" /> {t("page.inventory.back")}
      </button>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-3">
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-foreground truncate">
            {reportType === "entry" ? t("page.inventory.entry") : t("page.inventory.exit")}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5 truncate">{propertyLabel}{tenantName && ` — ${tenantName}`}</p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto shrink-0">
          <button onClick={() => handleSave(false)} disabled={saving}
            className="inline-flex items-center justify-center gap-2 border border-border text-foreground text-sm font-medium px-4 h-10 rounded-lg hover:bg-muted transition-colors disabled:opacity-50 whitespace-nowrap">
            <Save className="h-4 w-4 shrink-0" />{saving ? "…" : t("page.inventory.draft_btn")}
          </button>
          <button onClick={handleDownloadPDF} disabled={generatingPdf || reportStatus !== "completed"}
            title={reportStatus !== "completed" ? t("page.inventory.finalize_tooltip") : ""}
            className="inline-flex items-center justify-center gap-2 border border-border text-foreground text-sm font-medium px-4 h-10 rounded-lg hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap">
            <Download className="h-4 w-4 shrink-0" />{generatingPdf ? t("page.inventory.pdf_generating") : t("page.inventory.pdf_btn")}
          </button>
          <button onClick={handleFinalizeAndSend} disabled={saving || generatingPdf}
            className="inline-flex items-center justify-center gap-2 bg-gradient-gold text-accent-foreground text-sm font-semibold px-5 h-10 rounded-lg shadow-gold hover:opacity-90 transition-opacity disabled:opacity-50 whitespace-nowrap">
            <FileCheck className="h-4 w-4 shrink-0" />{t("page.inventory.finalize_btn")}
          </button>
        </div>
      </div>

      {reportStatus === "completed" && (
        <div className="flex items-center gap-2 bg-green-500/10 border border-green-500/30 rounded-lg px-4 py-2.5 mb-6">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <p className="text-sm text-green-700 font-medium">{t("page.inventory.finalized_badge")}</p>
        </div>
      )}

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
        <div className="bg-card rounded-xl p-4 shadow-card border border-border/50 text-center">
          <div className="text-2xl font-bold text-foreground">{rooms.length}</div>
          <div className="text-xs text-muted-foreground">{t("page.inventory.rooms_label")}</div>
        </div>
        <div className="bg-card rounded-xl p-4 shadow-card border border-border/50 text-center">
          <div className="text-2xl font-bold text-green-600">{goodCount}</div>
          <div className="text-xs text-muted-foreground">{t("page.inventory.good_label")}</div>
        </div>
        <div className="bg-card rounded-xl p-4 shadow-card border border-border/50 text-center">
          <div className="text-2xl font-bold text-yellow-600">{avgCount}</div>
          <div className="text-xs text-muted-foreground">{t("page.inventory.average_label")}</div>
        </div>
        <div className="bg-card rounded-xl p-4 shadow-card border border-border/50 text-center">
          <div className="text-2xl font-bold text-red-600">{badCount}</div>
          <div className="text-xs text-muted-foreground">{t("page.inventory.bad_label")}</div>
        </div>
        <div className="bg-card rounded-xl p-4 shadow-card border border-border/50 text-center">
          <div className="text-2xl font-bold text-accent">{totalPhotos}</div>
          <div className="text-xs text-muted-foreground">{t("page.inventory.photos_label")}</div>
        </div>
      </div>

      {/* General Info */}
      <div className="bg-card rounded-xl p-6 shadow-card border border-border/50 mb-6">
        <h3 className="font-semibold text-foreground mb-4">{t("page.inventory.general_info")}</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">{t("page.inventory.date")}</label>
            <input type="date" value={reportDate} onChange={e => setReportDate(e.target.value)}
              className="w-full bg-muted/50 border border-border/50 rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent" />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">{t("page.inventory.keys_label")}</label>
            <div className="flex gap-2">
              <input type="number" value={keysCount || ""} onChange={e => setKeysCount(+e.target.value)} placeholder="Nb"
                onFocus={e => { if (e.target.value === "0") e.target.value = ""; }}
                className="w-20 bg-muted/50 border border-border/50 rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent" />
              <input value={keysDetails} onChange={e => setKeysDetails(e.target.value)} placeholder={t("page.inventory.keys_details")}
                className="flex-1 bg-muted/50 border border-border/50 rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-accent" />
            </div>
          </div>
        </div>

        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mt-4 mb-2">{t("page.inventory.meters")}</h4>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-yellow-500 shrink-0" />
            <input value={meterElectricity} onChange={e => setMeterElectricity(e.target.value)} placeholder={t("page.inventory.electricity")}
              className="flex-1 bg-muted/50 border border-border/50 rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-accent" />
          </div>
          <div className="flex items-center gap-2">
            <ThermometerSun className="h-4 w-4 text-orange-500 shrink-0" />
            <input value={meterGas} onChange={e => setMeterGas(e.target.value)} placeholder={t("page.inventory.gas")}
              className="flex-1 bg-muted/50 border border-border/50 rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-accent" />
          </div>
          <div className="flex items-center gap-2">
            <Droplets className="h-4 w-4 text-blue-500 shrink-0" />
            <input value={meterWater} onChange={e => setMeterWater(e.target.value)} placeholder={t("page.inventory.water")}
              className="flex-1 bg-muted/50 border border-border/50 rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-accent" />
          </div>
        </div>

        <div className="mt-4">
          <label className="block text-xs font-medium text-muted-foreground mb-1">{t("page.inventory.general_obs")}</label>
          <textarea value={generalNotes} onChange={e => setGeneralNotes(e.target.value)} rows={2} placeholder={t("page.inventory.general_obs_placeholder")}
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
                <span className="text-xs text-muted-foreground">{room.items.length} {t("page.inventory.elements")}</span>
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
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-2 gap-1">
                        <span className="text-sm font-medium text-foreground truncate">{item.element_name}</span>
                        <div className="flex items-center gap-1 flex-wrap shrink-0">
                          {(["good", "average", "bad"] as const).map(c => {
                            const cl = conditionLabels[c];
                            const Icon = cl.icon;
                            return (
                              <button key={c} onClick={() => updateItemCondition(room.id, item.id, c)}
                                className={`flex items-center gap-1 text-xs px-2 py-1 rounded-md border transition-colors ${item.condition === c ? cl.color : "border-border/50 text-muted-foreground hover:bg-muted/50"}`}>
                                <Icon className="h-3 w-3" /><span className="hidden sm:inline">{cl.label}</span>
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
                          placeholder={t("page.inventory.notes_placeholder")}
                          className="flex-1 bg-background border border-border/50 rounded px-2 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-accent" />
                        <label className="flex items-center gap-1 text-xs text-accent cursor-pointer hover:underline shrink-0">
                          <Camera className="h-3.5 w-3.5" />{t("page.inventory.photo")}
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
                <AddElementInline onAdd={(name) => addItem(room.id, name)} t={t} />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Add room */}
      <div className="flex gap-2 mb-8">
        <input value={newRoomName} onChange={e => setNewRoomName(e.target.value)}
          onKeyDown={e => e.key === "Enter" && addRoom()}
          placeholder={t("page.inventory.add_room_placeholder")}
          className="flex-1 bg-muted/50 border border-border/50 rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-accent" />
        <button onClick={addRoom} className="flex items-center gap-2 bg-accent/10 text-accent px-4 py-2.5 rounded-lg hover:bg-accent/20 transition-colors text-sm font-medium">
          <Plus className="h-4 w-4" />{t("page.inventory.add_room")}
        </button>
      </div>
    </div>
  );
};

/* ─── Inline element adder ─── */
const AddElementInline = ({ onAdd, t }: { onAdd: (name: string) => void; t: (key: string) => string }) => {
  const [name, setName] = useState("");
  return (
    <div className="flex gap-2 mt-2">
      <input value={name} onChange={e => setName(e.target.value)}
        onKeyDown={e => { if (e.key === "Enter" && name.trim()) { onAdd(name); setName(""); } }}
        placeholder={t("page.inventory.add_element")}
        className="flex-1 bg-background border border-border/50 rounded px-2 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-accent" />
      <button onClick={() => { if (name.trim()) { onAdd(name); setName(""); } }}
        className="text-xs text-accent hover:underline flex items-center gap-1">
        <Plus className="h-3 w-3" />{t("page.inventory.add_room")}
      </button>
    </div>
  );
};

export default InventoryBuilder;
