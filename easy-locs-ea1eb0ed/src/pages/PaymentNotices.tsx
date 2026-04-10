import { useState, useEffect, useCallback, useMemo } from "react";
import PropertyHubBreadcrumb from "@/components/property/PropertyHubBreadcrumb";
import FeatureGate from "@/components/subscription/FeatureGate";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { fetchPaymentNoticesData, insertPaymentNotices, sendNoticeEmail, fetchTenantEmail, regularizeRentCall, partialPayRentCall } from "@/repositories/payment-notices.repository";
import { useToast } from "@/hooks/use-toast";
import { FileText, Plus, Download, AlertTriangle, CheckCircle, Clock, Building, Globe, CreditCard, Banknote } from "lucide-react";
import jsPDF from "jspdf";
import { useI18n } from "@/lib/i18n";
import { useCountryFilter } from "@/hooks/useCountryFilter";
import { getCountryEntryOrDefault } from "@/lib/global-country-registry";
import { formatCurrency } from "@/lib/country-config";

interface Tenant { id: string; name: string; property_id: string | null; rent_amount: number; charges_amount: number; }
interface Property { id: string; label: string; address: string; city: string; country: string; }
interface Notice { id: string; tenant_id: string; property_id: string | null; month: string; rent_amount: number; charges_amount: number; total_amount: number; due_date: string; sent: boolean; }
interface RentCall { id: string; tenant_id: string; month: string; total_amount: number; paid: boolean; paid_amount?: number; }

const PaymentNotices = () => {
  const { user, orgId, userCountry } = useAuth();
  const { toast } = useToast();
  const { t } = useI18n();
  const countryFilter = useCountryFilter();

  const [allNotices, setAllNotices] = useState<Notice[]>([]);
  const [allTenants, setAllTenants] = useState<Tenant[]>([]);
  const [allProperties, setAllProperties] = useState<Property[]>([]);
  const [allRentCalls, setAllRentCalls] = useState<RentCall[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!orgId) return;
    const { notices: n, tenants: te, properties: p, rentCalls: rc } = await fetchPaymentNoticesData(orgId);
    setAllNotices(n as Notice[]);
    setAllTenants(te as Tenant[]);
    setAllProperties(p as Property[]);
    setAllRentCalls(rc as RentCall[]);
    setLoading(false);
  }, [orgId]);

  useEffect(() => { load(); }, [load]);

  // Filter by country workspace
  const properties = useMemo(() => {
    if (!countryFilter) return allProperties;
    return allProperties.filter(p => (p.country || "").toUpperCase() === countryFilter);
  }, [allProperties, countryFilter]);

  const propertyIds = useMemo(() => new Set(properties.map(p => p.id)), [properties]);

  const tenants = useMemo(() => {
    if (!countryFilter) return allTenants;
    return allTenants.filter(te => te.property_id && propertyIds.has(te.property_id));
  }, [allTenants, countryFilter, propertyIds]);

  const tenantIds = useMemo(() => new Set(tenants.map(te => te.id)), [tenants]);

  const notices = useMemo(() => {
    if (!countryFilter) return allNotices;
    return allNotices.filter(n => tenantIds.has(n.tenant_id));
  }, [allNotices, countryFilter, tenantIds]);

  const rentCalls = useMemo(() => {
    if (!countryFilter) return allRentCalls;
    return allRentCalls.filter(c => tenantIds.has(c.tenant_id));
  }, [allRentCalls, countryFilter, tenantIds]);

  // Group notices by country → property
  const grouped = useMemo(() => {
    const result: Record<string, Record<string, { prop: Property | null; notices: Notice[] }>> = {};
    notices.forEach(n => {
      const prop = properties.find(p => p.id === n.property_id);
      const country = (prop?.country || "XX").toUpperCase();
      const propId = n.property_id || "no-property";
      if (!result[country]) result[country] = {};
      if (!result[country][propId]) result[country][propId] = { prop: prop || null, notices: [] };
      result[country][propId].notices.push(n);
    });
    return result;
  }, [notices, properties]);

  const sortedCountries = useMemo(() => Object.keys(grouped).sort(), [grouped]);

  const fmt = (n: number, country?: string) => formatCurrency(n, country || userCountry);

  const generateNotices = async () => {
    if (!orgId) return;
    const now = new Date();
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const existingTenantIds = notices.filter(n => n.month === month).map(n => n.tenant_id);
    const newNotices = tenants
      .filter(te => te.rent_amount > 0 && !existingTenantIds.includes(te.id))
      .map(te => ({
        org_id: orgId, tenant_id: te.id, property_id: te.property_id,
        month, rent_amount: Number(te.rent_amount), charges_amount: Number(te.charges_amount),
        total_amount: Number(te.rent_amount) + Number(te.charges_amount),
        due_date: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`,
      }));
    if (newNotices.length === 0) { toast({ title: t("page.notices.all_created") }); return; }
    try {
      await insertPaymentNotices(newNotices);
    } catch (error: any) {
      toast({ title: t("common.error"), description: error.message, variant: "destructive" }); return;
    }
    toast({ title: `${newNotices.length} ${t("page.notices.generated")}` });

    const fmt2 = (n: number) => new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(n);
    for (const notice of newNotices) {
      const tenant = tenants.find(te => te.id === notice.tenant_id);
      if (!tenant) continue;
      const email = await fetchTenantEmail(tenant.id);
      if (email) {
        await sendNoticeEmail(email, `${t("email.notice_subject")} — ${notice.month}`,
          `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;">
            <h2 style="color:#1a1a1a;">${t("email.notice_title")}</h2>
            <p style="color:#555;">${t("email.notice_body").replace("{month}", notice.month)}</p>
            <div style="background:#f5f5f5;border-radius:8px;padding:16px;margin:16px 0;">
              <p style="color:#1a1a1a;"><strong>${t("pdf.rent")} :</strong> ${fmt2(notice.rent_amount)}</p>
              <p style="color:#1a1a1a;"><strong>${t("pdf.charges")} :</strong> ${fmt2(notice.charges_amount)}</p>
              <p style="color:#1a1a1a;"><strong>Total :</strong> ${fmt2(notice.total_amount)}</p>
              <p style="color:#1a1a1a;"><strong>${t("email.notice_due")} :</strong> ${notice.due_date}</p>
            </div>
            <p style="color:#888;font-size:13px;">${t("email.notice_footer")}</p>
          </div>`);
      }
    }
    await load();
  };

  const downloadNoticePDF = (notice: Notice) => {
    const tenant = tenants.find(te => te.id === notice.tenant_id);
    const property = properties.find(p => p.id === notice.property_id);
    const doc = new jsPDF();
    const fmtPdf = (n: number) => formatCurrency(n, property?.country || userCountry);

    doc.setFillColor(212, 163, 74);
    doc.rect(0, 0, 210, 8, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(26, 39, 68);
    doc.text(t("pdf.notice_title"), 20, 25);
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`${t("pdf.notice_month")} : ${notice.month}`, 20, 33);
    doc.text(`${t("pdf.notice_due_date")} : ${notice.due_date}`, 20, 39);

    let y = 55;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(26, 39, 68);
    doc.text(t("pdf.tenant"), 20, y);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(50, 50, 50);
    doc.text(tenant?.name || "—", 20, y + 7);

    if (property) {
      y += 20;
      doc.setFont("helvetica", "bold");
      doc.setTextColor(26, 39, 68);
      doc.text(t("pdf.property"), 20, y);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(50, 50, 50);
      doc.text(`${property.label} — ${property.address}, ${property.city}`, 20, y + 7);
    }

    y += 25;
    doc.setFont("helvetica", "bold");
    doc.setTextColor(26, 39, 68);
    doc.text(t("pdf.detail"), 20, y);
    y += 10;
    doc.setFont("helvetica", "normal");
    doc.setTextColor(50, 50, 50);
    doc.text(`${t("pdf.rent")} : ${fmtPdf(notice.rent_amount)}`, 20, y);
    doc.text(`${t("pdf.charges")} : ${fmtPdf(notice.charges_amount)}`, 20, y + 7);
    doc.setFont("helvetica", "bold");
    doc.text(`${t("pdf.total")} : ${fmtPdf(notice.total_amount)}`, 20, y + 17);

    doc.setFillColor(26, 39, 68);
    doc.rect(0, 290, 210, 7, "F");
    doc.setFontSize(7);
    doc.setTextColor(140, 140, 140);
    doc.text(t("pdf.footer_notice"), 20, 287);

    doc.save(`avis_echeance_${notice.month}_${tenant?.name || ""}.pdf`);
  };

  const tenantName = (id: string) => tenants.find(te => te.id === id)?.name || "—";
  const unpaidTotal = rentCalls.reduce((s, c) => s + (c.total_amount - (c.paid_amount || 0)), 0);

  const regularize = async (rentCall: RentCall) => {
    await regularizeRentCall(rentCall.id, rentCall.total_amount);
    toast({ title: t("page.common.paid") });
    await load();
  };

  // Partial payment dialog
  const [partialDialog, setPartialDialog] = useState<RentCall | null>(null);
  const [partialAmount, setPartialAmount] = useState(0);

  const handlePartialPayment = async () => {
    if (!partialDialog || partialAmount <= 0) return;
    const newPaid = Math.min((partialDialog.paid_amount || 0) + partialAmount, partialDialog.total_amount);
    const isFullyPaid = newPaid >= partialDialog.total_amount;
    await partialPayRentCall(partialDialog.id, newPaid, partialDialog.total_amount);
    toast({ title: isFullyPaid ? t("page.common.paid") : `${t("page.notices.partial_recorded")} — ${fmt(newPaid)}` });
    setPartialDialog(null);
    setPartialAmount(0);
    await load();
  };

  return (
    <DashboardLayout>
      <FeatureGate feature="unlimited_tenants" featureLabel={t("page.notices.title")}>
        <PropertyHubBreadcrumb currentPage={t("page.notices.title")} />
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div className="page-header mb-0">
              <h1>{t("page.notices.title")}</h1>
              <p>{t("page.notices.subtitle")}</p>
            </div>
            <button onClick={generateNotices} className="btn-primary shrink-0">
              <Plus className="h-4 w-4" /> {t("page.notices.generate")}
            </button>
          </div>

          {/* Unpaid alerts */}
          {rentCalls.length > 0 && (
            <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-4 mb-6">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-foreground">
                    {rentCalls.length} {t("page.notices.unpaid_alert")} — {fmt(unpaidTotal)}
                  </p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {rentCalls.slice(0, 5).map(c => (
                      <span key={c.id} className="text-xs bg-destructive/20 text-destructive px-2 py-1 rounded-full font-medium">
                        {tenantName(c.tenant_id)} · {c.month}
                      </span>
                    ))}
                    {rentCalls.length > 5 && (
                      <span className="text-xs text-muted-foreground">+{rentCalls.length - 5} {t("page.notices.others")}</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {loading ? (
            <div className="text-center py-12 text-muted-foreground">{t("page.common.loading")}</div>
          ) : notices.length === 0 ? (
            <div className="text-center py-16 bg-card rounded-xl border border-border/50">
              <FileText className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">{t("page.notices.no_notice")}</h3>
              <p className="text-sm text-muted-foreground">{t("page.notices.subtitle")}</p>
            </div>
          ) : (
            <div className="space-y-8">
              {sortedCountries.map(countryCode => {
                const entry = getCountryEntryOrDefault(countryCode);
                const countryProps = grouped[countryCode];
                const propEntries = Object.entries(countryProps).sort(([, a], [, b]) => b.notices.length - a.notices.length);

                return (
                  <div key={countryCode} className="space-y-4">
                    {/* Country header */}
                    {sortedCountries.length > 1 && (
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{entry.flag}</span>
                        <h2 className="text-lg font-bold text-foreground">{entry.name}</h2>
                        <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                          {propEntries.reduce((s, [, d]) => s + d.notices.length, 0)} avis
                        </span>
                      </div>
                    )}

                    {/* Properties */}
                    {propEntries.map(([propId, data]) => {
                      const propNotices = data.notices;
                      const propTotal = propNotices.reduce((s, n) => s + n.total_amount, 0);

                      return (
                        <div key={propId} className="bg-card rounded-xl border border-border/50 shadow-card overflow-hidden">
                          {/* Property header */}
                          <div className="flex items-center gap-3 px-5 py-3 bg-muted/30 border-b border-border/30">
                            <Building className="h-4 w-4 text-accent" />
                            <div className="flex-1 min-w-0">
                              <h3 className="text-sm font-semibold text-foreground truncate">
                                {data.prop ? `${data.prop.label} — ${data.prop.city}` : "Bien non assigné"}
                              </h3>
                            </div>
                            <span className="text-xs font-medium text-muted-foreground">
                              {propNotices.length} avis · {fmt(propTotal, countryCode)}
                            </span>
                          </div>

                          {/* Notices table */}
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm min-w-[600px]">
                              <thead>
                                <tr className="table-head-row">
                                  <th className="table-head-cell">{t("page.notices.month")}</th>
                                  <th className="table-head-cell">{t("page.notices.tenant")}</th>
                                  <th className="table-head-cell text-right">{t("page.notices.total")}</th>
                                  <th className="table-head-cell">{t("page.notices.status")}</th>
                                  <th className="table-head-cell"></th>
                                </tr>
                              </thead>
                              <tbody>
                                {propNotices.map(n => {
                                  const matchingRentCall = rentCalls.find(c => c.tenant_id === n.tenant_id && c.month === n.month);
                                  const isPaid = !matchingRentCall;
                                  const paidAmount = matchingRentCall?.paid_amount || 0;
                                  const remaining = matchingRentCall ? matchingRentCall.total_amount - paidAmount : 0;
                                  return (
                                    <tr key={n.id} className="table-body-row">
                                      <td className="table-cell whitespace-nowrap">{n.month}</td>
                                      <td className="table-cell font-medium">{tenantName(n.tenant_id)}</td>
                                      <td className="table-cell-amount">{fmt(n.total_amount, countryCode)}</td>
                                      <td className="table-cell">
                                        {isPaid ? (
                                          <span className="badge-success">
                                            <CheckCircle className="h-3 w-3" /> {t("page.common.paid")}
                                          </span>
                                        ) : paidAmount > 0 ? (
                                          <span className="badge-warning">
                                            <Banknote className="h-3 w-3" /> {fmt(paidAmount, countryCode)} / {fmt(n.total_amount, countryCode)}
                                          </span>
                                        ) : (
                                          <span className="badge-danger">
                                            <Clock className="h-3 w-3" /> {t("page.common.unpaid")}
                                          </span>
                                        )}
                                      </td>
                                       <td className="table-cell-actions">
                                        <div className="flex items-center gap-1.5 justify-end flex-wrap">
                                          {!isPaid && (
                                            <>
                                              <button onClick={() => regularize(matchingRentCall!)} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-success/10 text-success hover:bg-success/20 transition-colors whitespace-nowrap" title={t("page.notices.regularize") || "Regularize"}>
                                                <CheckCircle className="h-3.5 w-3.5 shrink-0" />
                                                {t("page.notices.regularize") || "Regularize"}
                                              </button>
                                              <button onClick={() => { setPartialDialog(matchingRentCall!); setPartialAmount(remaining); }} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-accent/10 text-accent hover:bg-accent/20 transition-colors whitespace-nowrap" title={t("page.notices.partial") || "Partiel"}>
                                                <Banknote className="h-3.5 w-3.5 shrink-0" />
                                                {t("page.notices.partial") || "Partiel"}
                                              </button>
                                            </>
                                          )}
                                          <button onClick={() => downloadNoticePDF(n)} className="inline-flex items-center justify-center h-8 w-8 rounded-lg hover:bg-muted transition-colors">
                                            <Download className="h-4 w-4 text-muted-foreground" />
                                          </button>
                                        </div>
                                       </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          )}

          {/* Partial Payment Dialog */}
          {partialDialog && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 backdrop-blur-sm">
              <div className="bg-card rounded-xl border border-border shadow-lg p-6 w-full max-w-md mx-4">
                <h3 className="text-lg font-semibold text-foreground mb-4">
                  {t("page.notices.partial_title") || "Paiement partiel"}
                </h3>
                <p className="text-sm text-muted-foreground mb-2">
                  {tenantName(partialDialog.tenant_id)} — {partialDialog.month}
                </p>
                <p className="text-sm text-muted-foreground mb-4">
                  {t("page.notices.total_due") || "Total due"}: <span className="font-semibold text-foreground">{fmt(partialDialog.total_amount)}</span>
                  {(partialDialog.paid_amount || 0) > 0 && (
                    <> · {t("page.notices.already_paid") || "Already paid"}: <span className="font-semibold text-success">{fmt(partialDialog.paid_amount || 0)}</span></>
                  )}
                </p>
                <div className="form-group mb-4">
                  <label className="form-label">{t("page.notices.amount_received") || "Montant reçu"}</label>
                  <input
                    type="number"
                    value={partialAmount || ""}
                    onChange={e => setPartialAmount(+e.target.value)}
                    className="form-input"
                    min={0}
                    max={partialDialog.total_amount - (partialDialog.paid_amount || 0)}
                    step={0.01}
                  />
                </div>
                <div className="flex gap-3">
                  <button onClick={handlePartialPayment} className="btn-primary flex-1">
                    <CreditCard className="h-4 w-4" />
                    {t("page.notices.record_payment") || "Record Payment"}
                  </button>
                  <button onClick={() => setPartialDialog(null)} className="btn-secondary">
                    {t("page.common.cancel") || "Cancel"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </FeatureGate>
    </DashboardLayout>
  );
};

export default PaymentNotices;
