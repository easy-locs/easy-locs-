import { useState, useEffect, useMemo } from "react";
import FeatureGate from "@/components/subscription/FeatureGate";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { fetchTenantsForCharges, fetchPropertiesForCharges } from "@/repositories/rental.repository";
import { useI18n } from "@/lib/i18n";
import { formatCurrency } from "@/lib/country-config";
import { getCountryEntryOrDefault } from "@/lib/global-country-registry";
import { useCountryFilter } from "@/hooks/useCountryFilter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calculator, Download, AlertTriangle, Euro, Users } from "lucide-react";
import { exportToCSV } from "@/lib/csv-export";

interface Tenant { id: string; name: string; charges_amount: number; property_id: string | null; }
interface Property { id: string; label: string; monthly_charges: number; country: string; }


const ChargesRegularization = () => {
  const { orgId, userCountry } = useAuth();
  const { t } = useI18n();
  const countryFilter = useCountryFilter();
  const fmt = (n: number, country?: string) => formatCurrency(n, country || userCountry);
  const [allTenants, setAllTenants] = useState<Tenant[]>([]);
  const [allProperties, setAllProperties] = useState<Property[]>([]);
  const [year, setYear] = useState(new Date().getFullYear() - 1);
  const [realCharges, setRealCharges] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orgId) return;
    Promise.all([
      fetchTenantsForCharges(orgId),
      fetchPropertiesForCharges(orgId),
    ]).then(([tData, pData]) => {
      setAllTenants(tData as Tenant[]);
      setAllProperties(pData as Property[]);
      setLoading(false);
    });
  }, [orgId]);

  // Filter by country workspace if active
  const properties = useMemo(() => {
    if (!countryFilter) return allProperties;
    return allProperties.filter(p => (p.country || "").toUpperCase() === countryFilter.toUpperCase());
  }, [allProperties, countryFilter]);

  const tenants = useMemo(() => {
    const propIds = new Set(properties.map(p => p.id));
    if (!countryFilter) return allTenants;
    return allTenants.filter(t => t.property_id && propIds.has(t.property_id));
  }, [allTenants, properties, countryFilter]);

  const results = useMemo(() => {
    return tenants.map(tenant => {
      const prop = properties.find(p => p.id === tenant.property_id);
      const provisionsAnnuelles = (tenant.charges_amount || prop?.monthly_charges || 0) * 12;
      const chargesReelles = realCharges[tenant.id] || 0;
      const solde = provisionsAnnuelles - chargesReelles;
      return {
        tenantId: tenant.id, tenantName: tenant.name, propertyLabel: prop?.label || "—",
        provisionsAnnuelles, chargesReelles, solde,
        type: solde > 0 ? t("page.charges.overpaid") : solde < 0 ? t("page.charges.underpaid") : t("page.charges.balanced"),
      };
    });
  }, [tenants, properties, realCharges, t]);

  const handleExport = () => {
    exportToCSV(
      results.map(r => ({
        locataire: r.tenantName, bien: r.propertyLabel,
        provisions: r.provisionsAnnuelles, charges_reelles: r.chargesReelles,
        solde: r.solde, resultat: r.type,
      })),
      `regularisation_charges_${year}`,
      [
        { key: "locataire", label: t("page.receipts.tenant") },
        { key: "bien", label: t("page.expenses.property") },
        { key: "provisions", label: t("page.charges.provisions_annual") },
        { key: "charges_reelles", label: t("page.charges.real_charges") },
        { key: "solde", label: t("page.charges.balance") },
        { key: "resultat", label: t("page.charges.result") },
      ]
    );
  };

  return (
    <DashboardLayout>
      <FeatureGate feature="unlimited_properties" featureLabel={t("page.charges.title")}>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="page-header mb-0">
            <h1>{t("page.charges.title")}</h1>
            <p>{t("page.charges.subtitle")}</p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <select value={year} onChange={e => setYear(Number(e.target.value))} className="form-select w-auto">
              {[...Array(5)].map((_, i) => { const y = new Date().getFullYear() - i; return <option key={y} value={y}>{y}</option>; })}
            </select>
            <button onClick={handleExport} className="btn-secondary btn-sm">
              <Download className="h-4 w-4" /> {t("page.charges.export_csv")}
            </button>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12 text-muted-foreground">{t("page.common.loading")}</div>
        ) : tenants.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Users className="h-10 w-10 text-muted-foreground/30 mb-3" />
              <p className="text-muted-foreground text-sm">{t("page.charges.no_tenants")}</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
             {/* Group tenants by country then property */}
             {(() => {
               // Build structure: country → property → tenants
               const structure: Record<string, Record<string, { prop: Property; tenantList: Tenant[] }>> = {};
               tenants.forEach(tenant => {
                 const prop = properties.find(p => p.id === tenant.property_id);
                 const country = (prop?.country || "XX").toUpperCase();
                 const propId = prop?.id || "no-property";
                 if (!structure[country]) structure[country] = {};
                 if (!structure[country][propId]) structure[country][propId] = { prop: prop || { id: "no-property", label: "—", monthly_charges: 0, country: "XX" }, tenantList: [] };
                 structure[country][propId].tenantList.push(tenant);
               });

               return Object.entries(structure).sort(([a], [b]) => a.localeCompare(b)).map(([country, propMap]) => (
                 <div key={country} className="space-y-4">
                   {/* Country header */}
                   <div className="flex items-center gap-2 pt-2">
                     <span className="text-lg">{getCountryEntryOrDefault(country).flag}</span>
                     <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">{getCountryEntryOrDefault(country).name}</h3>
                   </div>

                   {Object.entries(propMap).map(([propId, { prop, tenantList }]) => {
                     const propResults = results.filter(r => tenantList.some(t => t.id === r.tenantId));
                     return (
                       <Card key={propId}>
                         <CardHeader className="pb-3">
                           <CardTitle className="text-base flex items-center gap-2">
                             <Calculator className="h-4 w-4 text-accent" />
                             {prop.label}
                           </CardTitle>
                         </CardHeader>
                         <CardContent className="space-y-4">
                           {/* Input real charges per tenant */}
                           <div className="space-y-3">
                             {tenantList.map(tenant => (
                               <div key={tenant.id} className="flex items-center gap-4">
                                 <div className="flex-1">
                                   <p className="text-sm font-medium text-foreground">{tenant.name}</p>
                                   <p className="text-xs text-muted-foreground">
                                     {t("page.charges.provisions")} : {fmt((tenant.charges_amount || 0) * 12, prop.country)}/an
                                   </p>
                                 </div>
                                 <div className="flex items-center gap-2">
                                   <Euro className="h-4 w-4 text-muted-foreground" />
                                   <input type="number" min={0} step={0.01} value={realCharges[tenant.id] || ""} onChange={e => setRealCharges(prev => ({ ...prev, [tenant.id]: Number(e.target.value) }))} placeholder="0.00" className="w-32 bg-background border border-border rounded-lg px-3 py-2 text-sm text-right" />
                                 </div>
                               </div>
                             ))}
                           </div>

                           {/* Results table for this property */}
                           {propResults.some(r => r.chargesReelles > 0) && (
                             <div className="border-t border-border/30 pt-3">
                               <div className="table-scroll">
                                 <table className="w-full text-sm">
                                   <thead>
                                     <tr className="table-head-row">
                                       <th className="table-head-cell">{t("page.receipts.tenant")}</th>
                                       <th className="table-head-cell text-right">{t("page.charges.provisions")}</th>
                                       <th className="table-head-cell text-right">{t("page.charges.real_charges")}</th>
                                       <th className="table-head-cell text-right">{t("page.charges.balance")}</th>
                                       <th className="table-head-cell">{t("page.charges.result")}</th>
                                     </tr>
                                   </thead>
                                   <tbody>
                                     {propResults.map(r => (
                                       <tr key={r.tenantId} className="table-body-row">
                                         <td className="table-cell font-medium text-foreground">{r.tenantName}</td>
                                         <td className="table-cell-amount">{fmt(r.provisionsAnnuelles)}</td>
                                         <td className="table-cell-amount">{fmt(r.chargesReelles)}</td>
                                         <td className={`table-cell-amount ${r.solde > 0 ? "text-success" : r.solde < 0 ? "text-destructive" : "text-foreground"}`}>{r.solde > 0 ? "+" : ""}{fmt(r.solde)}</td>
                                         <td className="table-cell"><span className={`badge-status ${r.solde > 0 ? "badge-success" : r.solde < 0 ? "badge-danger" : "badge-neutral"}`}>{r.type}</span></td>
                                       </tr>
                                     ))}
                                   </tbody>
                                 </table>
                               </div>
                             </div>
                           )}
                         </CardContent>
                       </Card>
                     );
                   })}
                 </div>
               ));
             })()}
           </div>
        )}

        <div className="flex items-start gap-3 bg-muted/50 rounded-lg p-4">
          <AlertTriangle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground">{t("page.charges.legal_notice")}</p>
        </div>
      </div>
      </FeatureGate>
    </DashboardLayout>
  );
};

export default ChargesRegularization;
