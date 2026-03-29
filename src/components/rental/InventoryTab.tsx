import React, { useState, useEffect, useCallback } from "react";
import { fetchInventoryReportById, fetchInventoryReports, fetchInventoryRooms, fetchInventoryItems } from "@/repositories/rental.repository";
import { invokeSendEmail } from "@/repositories/ai.repository";
import { ClipboardCheck, Home, Users, Calendar, Eye, Mail, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { generateInventoryPDF } from "@/lib/inventory-pdf-generator";
import type { Property, Tenant } from "@/hooks/useRentalData";
import { useI18n } from "@/lib/i18n";

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
  const { t } = useI18n();
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
      const reportData = await fetchInventoryReportById(report.id);
      if (!reportData) throw new Error(t("comp.inventory.report_not_found"));

      const doc = await generateInventoryPDF({
        propertyLabel: property.label, reportType: report.report_type as "entry" | "exit",
        reportDate: report.report_date, tenantName: tenant.name,
        keysCount: reportData.keys_count || 0, keysDetails: reportData.keys_details || "",
        meterElectricity: reportData.meter_electricity || "", meterGas: reportData.meter_gas || "",
        meterWater: reportData.meter_water || "", generalNotes: reportData.general_notes || "", rooms,
      });

      const typeStr = report.report_type === "entry" ? "entree" : "sortie";
      const pdfBase64 = doc.output("datauristring").split(",")[1];
      const subjectType = report.report_type === "entry" ? t("comp.inventory.email_subject_entry") : t("comp.inventory.email_subject_exit");
      const bodyText = report.report_type === "entry" ? t("comp.inventory.email_body_entry") : t("comp.inventory.email_body_exit");

      await invokeSendEmail({
        body: {
          to: tenant.email,
          subject: `${subjectType} — ${property.label}`,
          html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;background:#fff;">
            <h2 style="color:#1a2744;text-align:center;">${t("comp.inventory.email_heading")}</h2>
            <p style="color:#555;">Bonjour ${tenant.name},</p>
            <p style="color:#555;">${bodyText} <strong>${property.label}</strong> du ${report.report_date}.</p>
            <p style="color:#aaa;font-size:11px;text-align:center;margin-top:32px;">EASY-LOCS® — Gestion locative intelligente</p>
          </div>`,
          attachments: [{ content: pdfBase64, filename: `etat_des_lieux_${typeStr}_${report.report_date}.pdf`, type: "application/pdf" }],
        },
      });
      toast({ title: t("comp.inventory.email_resent"), description: t("comp.inventory.email_resent_desc").replace("{email}", tenant.email) });
    } catch (err: any) {
      toast({ title: t("page.common.error"), description: err.message, variant: "destructive" });
    } finally {
      setResendingId(null);
    }
  };

  if (properties.length === 0) {
    return (
      <div className="text-center py-16">
        <ClipboardCheck className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
        <p className="text-sm text-muted-foreground">{t("comp.inventory.add_property_first")}</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-foreground">{t("comp.inventory.inventory_by_property")}</h2>
        <span className="text-xs text-muted-foreground bg-muted px-3 py-1 rounded-full">{reports.length} {t("comp.inventory.reports_total")}</span>
      </div>
      <div className="grid grid-cols-1 gap-4">
        {properties.map(p => {
          const propTenants = tenants.filter(tn => tn.property_id === p.id);
          const propReports = reports.filter(r => r.property_id === p.id);

          return (
            <div key={p.id} className="bg-card rounded-xl shadow-card border border-border/50 flex flex-col" style={{ borderRadius: "var(--card-radius)" }}>
              <div className="flex items-start gap-3 p-4 sm:p-5 pb-3">
                <div className="icon-box shrink-0 mt-0.5">
                  <Home className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{p.label}</p>
                  <p className="text-xs text-muted-foreground line-clamp-2">{p.address}, {p.city}</p>
                </div>
                <span className="badge-neutral shrink-0 whitespace-nowrap">
                  {propReports.length} {t("comp.inventory.inventory_reports")}
                </span>
              </div>

              {propTenants.length > 0 && (
                <div className="px-4 sm:px-5 mb-3">
                  <p className="text-xs text-muted-foreground mb-1.5">{t("comp.inventory.tenants_label")}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {propTenants.map(tn => (
                      <span key={tn.id} className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${isLeaseActive(tn) ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}`}>
                        {tn.name} {!isLeaseActive(tn) && t("comp.inventory.terminated")}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2 px-4 sm:px-5 mb-4">
                {propTenants.filter(isLeaseActive).length > 0 ? (
                  propTenants.filter(isLeaseActive).map(tn => (
                    <React.Fragment key={tn.id}>
                      <button onClick={() => setInventoryMode({ propertyId: p.id, tenantId: tn.id, reportType: "entry", propertyLabel: p.label })}
                        className="inline-flex items-center justify-center gap-1.5 text-xs font-medium bg-accent/10 text-accent px-3 py-2.5 rounded-lg hover:bg-accent/20 transition-colors min-h-[40px] truncate">
                        <ClipboardCheck className="h-3.5 w-3.5 shrink-0" /><span className="truncate">{t("comp.inventory.entry")} ({tn.name})</span>
                      </button>
                      <button onClick={() => setInventoryMode({ propertyId: p.id, tenantId: tn.id, reportType: "exit", propertyLabel: p.label })}
                        className="inline-flex items-center justify-center gap-1.5 text-xs font-medium bg-destructive/10 text-destructive px-3 py-2.5 rounded-lg hover:bg-destructive/20 transition-colors min-h-[40px] truncate">
                        <ClipboardCheck className="h-3.5 w-3.5 shrink-0" /><span className="truncate">{t("comp.inventory.exit")} ({tn.name})</span>
                      </button>
                    </React.Fragment>
                  ))
                ) : (
                  <>
                    <button onClick={() => setInventoryMode({ propertyId: p.id, reportType: "entry", propertyLabel: p.label })}
                      className="inline-flex items-center justify-center gap-1.5 text-xs font-medium bg-accent/10 text-accent px-3 py-2.5 rounded-lg hover:bg-accent/20 transition-colors min-h-[40px]">
                      <ClipboardCheck className="h-3.5 w-3.5 shrink-0" />{t("comp.inventory.entry")}
                    </button>
                    <button onClick={() => setInventoryMode({ propertyId: p.id, reportType: "exit", propertyLabel: p.label })}
                      className="inline-flex items-center justify-center gap-1.5 text-xs font-medium bg-destructive/10 text-destructive px-3 py-2.5 rounded-lg hover:bg-destructive/20 transition-colors min-h-[40px]">
                      <ClipboardCheck className="h-3.5 w-3.5 shrink-0" />{t("comp.inventory.exit")}
                    </button>
                  </>
                )}
              </div>

              {propReports.length > 0 && (
                <div className="border-t border-border/30 px-4 sm:px-5 py-3">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">{t("comp.inventory.history")}</p>
                  <div className="space-y-1.5">
                    {propReports.map(r => {
                      const reportTenant = tenants.find(tn => tn.id === r.tenant_id);
                      return (
                        <div key={r.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-muted/30 rounded-lg px-3 py-2.5">
                          <div className="flex items-center gap-2 min-w-0 flex-wrap">
                            <span className={`inline-flex items-center text-[10px] font-medium px-2 py-0.5 rounded-full ${r.report_type === "entry" ? "bg-accent/20 text-accent" : "bg-destructive/20 text-destructive"}`}>
                              {r.report_type === "entry" ? t("comp.inventory.entry") : t("comp.inventory.exit")}
                            </span>
                            <span className="text-xs text-foreground flex items-center gap-1 whitespace-nowrap">
                              <Calendar className="h-3 w-3 text-muted-foreground shrink-0" /> {r.report_date}
                            </span>
                            {reportTenant && (
                              <span className="text-xs text-muted-foreground flex items-center gap-1 truncate">
                                <Users className="h-3 w-3 shrink-0" /> {reportTenant.name}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 flex-wrap justify-end">
                            <button
                              onClick={() => setInventoryMode({
                                propertyId: p.id,
                                tenantId: r.tenant_id || undefined,
                                reportType: r.report_type as "entry" | "exit",
                                propertyLabel: p.label,
                                existingReportId: r.id,
                              })}
                              className="inline-flex items-center gap-1 text-[11px] font-medium text-accent hover:underline px-2 py-1 rounded"
                            >
                              <Eye className="h-3 w-3 shrink-0" /> {t("comp.inventory.open")}
                            </button>
                            {r.status === "completed" && reportTenant && (
                              <button
                                onClick={() => handleResendEmail(r, p, reportTenant)}
                                disabled={resendingId === r.id}
                                className="inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline disabled:opacity-50 px-2 py-1 rounded"
                              >
                                {resendingId === r.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Mail className="h-3 w-3 shrink-0" />} Email
                              </button>
                            )}
                            <span className={`inline-flex items-center text-[10px] font-medium px-2 py-0.5 rounded-full ${r.status === "completed" ? "bg-success/20 text-success" : "bg-muted text-muted-foreground"}`}>
                              {r.status === "completed" ? t("comp.inventory.finalized") : t("comp.inventory.draft")}
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
