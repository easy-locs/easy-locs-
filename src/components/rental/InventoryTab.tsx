import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ClipboardCheck, Home, Users, Calendar, Eye, Mail, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { generateInventoryPDF } from "@/lib/inventory-pdf-generator";
import type { Property, Tenant } from "@/hooks/useRentalData";

interface InventoryReport {
  id: string;
  property_id: string;
  tenant_id: string | null;
  report_type: string;
  report_date: string;
  status: string;
}

interface InventoryTabProps {
  properties: Property[];
  tenants: Tenant[];
  orgId: string | null;
  isLeaseActive: (t: Tenant) => boolean;
  setInventoryMode: (mode: { propertyId: string; tenantId?: string; reportType: "entry" | "exit"; propertyLabel: string; existingReportId?: string } | null) => void;
}

const InventoryTab = ({ properties, tenants, orgId, isLeaseActive, setInventoryMode }: InventoryTabProps) => {
  const { toast } = useToast();
  const [reports, setReports] = useState<InventoryReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [resendingId, setResendingId] = useState<string | null>(null);

  const loadReports = useCallback(async () => {
    if (!orgId) return;
    const { data } = await supabase
      .from("inventory_reports")
      .select("id, property_id, tenant_id, report_type, report_date, status")
      .eq("org_id", orgId)
      .order("report_date", { ascending: false });
    setReports(data || []);
    setLoading(false);
  }, [orgId]);

  useEffect(() => { loadReports(); }, [loadReports]);

  const handleResendEmail = async (report: InventoryReport, property: Property, tenant: Tenant) => {
    setResendingId(report.id);
    try {
      // Load rooms + items for PDF generation
      const { data: dbRooms } = await supabase
        .from("inventory_rooms").select("*").eq("report_id", report.id).order("sort_order");
      const rooms: { room_name: string; items: { element_name: string; condition: string; notes: string; photo_urls: string[] }[] }[] = [];
      for (const r of dbRooms || []) {
        const { data: items } = await supabase
          .from("inventory_items").select("*").eq("room_id", r.id).order("sort_order");
        rooms.push({
          room_name: r.room_name,
          items: (items || []).map((it: any) => ({
            element_name: it.element_name, condition: it.condition,
            notes: it.notes || "", photo_urls: Array.isArray(it.photo_urls) ? it.photo_urls : [],
          })),
        });
      }
      const { data: reportData } = await supabase.from("inventory_reports").select("*").eq("id", report.id).single();
      if (!reportData) throw new Error("Rapport introuvable");

      const doc = await generateInventoryPDF({
        propertyLabel: property.label, reportType: report.report_type as "entry" | "exit",
        reportDate: report.report_date, tenantName: tenant.name,
        keysCount: reportData.keys_count || 0, keysDetails: reportData.keys_details || "",
        meterElectricity: reportData.meter_electricity || "", meterGas: reportData.meter_gas || "",
        meterWater: reportData.meter_water || "", generalNotes: reportData.general_notes || "", rooms,
      });

      const typeStr = report.report_type === "entry" ? "entree" : "sortie";
      const pdfBase64 = doc.output("datauristring").split(",")[1];

      await supabase.functions.invoke("send-email", {
        body: {
          to: tenant.email,
          subject: `État des lieux ${report.report_type === "entry" ? "d'entrée" : "de sortie"} — ${property.label}`,
          html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;background:#fff;">
            <h2 style="color:#1a2744;text-align:center;">📋 État des lieux</h2>
            <p style="color:#555;">Bonjour ${tenant.name},</p>
            <p style="color:#555;">Veuillez trouver ci-joint l'état des lieux ${report.report_type === "entry" ? "d'entrée" : "de sortie"} pour <strong>${property.label}</strong> du ${report.report_date}.</p>
            <p style="color:#aaa;font-size:11px;text-align:center;margin-top:32px;">EASY-LOCS® — Gestion locative intelligente</p>
          </div>`,
          attachments: [{ content: pdfBase64, filename: `etat_des_lieux_${typeStr}_${report.report_date}.pdf`, type: "application/pdf" }],
        },
      });
      toast({ title: "Email renvoyé", description: `PDF envoyé à ${tenant.email}` });
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    } finally {
      setResendingId(null);
    }
  };

  if (properties.length === 0) {
    return (
      <div className="text-center py-16">
        <ClipboardCheck className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
        <p className="text-sm text-muted-foreground">Ajoutez d'abord un bien.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-foreground">États des lieux par bien</h2>
        <span className="text-xs text-muted-foreground bg-muted px-3 py-1 rounded-full">{reports.length} rapport(s) total</span>
      </div>
      <div className="space-y-4">
        {properties.map(p => {
          const propTenants = tenants.filter(t => t.property_id === p.id);
          const propReports = reports.filter(r => r.property_id === p.id);

          return (
            <div key={p.id} className="bg-card rounded-xl p-5 shadow-card border border-border/50">
              {/* Property header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                    <Home className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <span className="font-semibold text-foreground text-sm">{p.label}</span>
                    <span className="text-xs text-muted-foreground ml-2">{p.address}, {p.city}</span>
                  </div>
                </div>
                <span className="text-[10px] font-medium bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                  {propReports.length} état(s) des lieux
                </span>
              </div>

              {/* Tenants */}
              {propTenants.length > 0 && (
                <div className="mb-3">
                  <p className="text-xs text-muted-foreground mb-1">Locataire(s) :</p>
                  <div className="flex flex-wrap gap-1">
                    {propTenants.map(t => (
                      <span key={t.id} className={`text-xs px-2 py-0.5 rounded-full ${isLeaseActive(t) ? "bg-green-500/10 text-green-700" : "bg-muted text-muted-foreground"}`}>
                        {t.name} {!isLeaseActive(t) && "(résilié)"}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex gap-2 flex-wrap mb-4">
                {propTenants.filter(isLeaseActive).length > 0 ? (
                  propTenants.filter(isLeaseActive).map(t => (
                    <div key={t.id} className="flex gap-2">
                      <button onClick={() => setInventoryMode({ propertyId: p.id, tenantId: t.id, reportType: "entry", propertyLabel: p.label })}
                        className="flex items-center gap-2 text-sm bg-accent/10 text-accent px-3 py-2 rounded-lg hover:bg-accent/20 transition-colors">
                        <ClipboardCheck className="h-4 w-4" />Entrée ({t.name})
                      </button>
                      <button onClick={() => setInventoryMode({ propertyId: p.id, tenantId: t.id, reportType: "exit", propertyLabel: p.label })}
                        className="flex items-center gap-2 text-sm bg-destructive/10 text-destructive px-3 py-2 rounded-lg hover:bg-destructive/20 transition-colors">
                        <ClipboardCheck className="h-4 w-4" />Sortie ({t.name})
                      </button>
                    </div>
                  ))
                ) : (
                  <>
                    <button onClick={() => setInventoryMode({ propertyId: p.id, reportType: "entry", propertyLabel: p.label })}
                      className="flex items-center gap-2 text-sm bg-accent/10 text-accent px-3 py-2 rounded-lg hover:bg-accent/20 transition-colors">
                      <ClipboardCheck className="h-4 w-4" />Entrée
                    </button>
                    <button onClick={() => setInventoryMode({ propertyId: p.id, reportType: "exit", propertyLabel: p.label })}
                      className="flex items-center gap-2 text-sm bg-destructive/10 text-destructive px-3 py-2 rounded-lg hover:bg-destructive/20 transition-colors">
                      <ClipboardCheck className="h-4 w-4" />Sortie
                    </button>
                  </>
                )}
              </div>

              {/* Existing reports */}
              {propReports.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Historique</p>
                  <div className="space-y-1">
                    {propReports.map(r => {
                      const reportTenant = tenants.find(t => t.id === r.tenant_id);
                      return (
                        <div key={r.id} className="flex items-center justify-between bg-muted/30 rounded-lg px-4 py-2.5">
                          <div className="flex items-center gap-3">
                            <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${r.report_type === "entry" ? "bg-accent/20 text-accent" : "bg-destructive/20 text-destructive"}`}>
                              {r.report_type === "entry" ? "Entrée" : "Sortie"}
                            </span>
                            <span className="text-sm text-foreground flex items-center gap-1">
                              <Calendar className="h-3 w-3 text-muted-foreground" /> {r.report_date}
                            </span>
                            {reportTenant && (
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <Users className="h-3 w-3" /> {reportTenant.name}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setInventoryMode({
                                propertyId: p.id,
                                tenantId: r.tenant_id || undefined,
                                reportType: r.report_type as "entry" | "exit",
                                propertyLabel: p.label,
                                existingReportId: r.id,
                              })}
                              className="text-[10px] flex items-center gap-1 text-accent hover:underline"
                              title="Ouvrir l'état des lieux"
                            >
                              <Eye className="h-3 w-3" /> Ouvrir
                            </button>
                            {r.status === "completed" && reportTenant && (
                              <button
                                onClick={() => handleResendEmail(r, p, reportTenant)}
                                disabled={resendingId === r.id}
                                className="text-[10px] flex items-center gap-1 text-primary hover:underline disabled:opacity-50"
                                title="Renvoyer par email"
                              >
                                {resendingId === r.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Mail className="h-3 w-3" />} Email
                              </button>
                            )}
                            <span className={`text-[10px] px-2 py-0.5 rounded-full ${r.status === "completed" ? "bg-green-500/20 text-green-700" : "bg-muted text-muted-foreground"}`}>
                              {r.status === "completed" ? "Finalisé" : "Brouillon"}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default InventoryTab;
