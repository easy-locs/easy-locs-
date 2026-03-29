import { useState, useEffect, useMemo } from "react";
import { useCountryFilter } from "@/hooks/useCountryFilter";
import FeatureGate from "@/components/subscription/FeatureGate";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { fetchFiscalProperties, fetchFiscalRentCallsRaw } from "@/repositories/rental.repository";
import { useI18n } from "@/lib/i18n";
import { formatCurrency } from "@/lib/country-config";
import { getCountryEntryOrDefault } from "@/lib/global-country-registry";
import { getAllAccountingRules } from "@/lib/accounting-rules";
import { Card, CardContent } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { FileText, Download, TrendingUp, TrendingDown, Calculator, Globe, ChevronRight } from "lucide-react";
import { exportToCSV } from "@/lib/csv-export";
import PropertyFiscalCard from "@/components/fiscal/PropertyFiscalCard";

interface RentCall { month: string; rent_amount: number; charges_amount: number; total_amount: number; paid: boolean | null; property_id?: string; }
interface Property { id: string; label: string; monthly_rent: number; monthly_charges: number; address: string; city: string; country: string; }

const accountingRulesMap = getAllAccountingRules();


const FORM_NAMES: Record<string,string> = {
  FR:"Formulaire 2044",DE:"Anlage V",ES:"Modelo 100",IT:"Modello 730",PT:"Modelo 3 (Anexo F)",GB:"Self Assessment",US:"Schedule E (1040)",
  BE:"Déclaration IPP",NL:"Box 3",AT:"Einkommensteuererklärung",CH:"Steuererklärung",PL:"PIT-28",SE:"Inkomstdeklaration",
  NO:"Skattemelding",DK:"Selvangivelse",FI:"Veroilmoitus",GR:"Φορολογική δήλωση",CZ:"Přiznání DPFO",HU:"SZJA",
  RO:"Declarația 212",BG:"Годишна декларация",HR:"Porezna prijava",IE:"Form 11",CA:"T776",MX:"Declaración anual",
  ZA:"ITR12",KR:"종합소득세",CN:"个人所得税申报",JP:"確定申告",BR:"IRPF",AU:"Tax Return",
  AE:"VAT Return",SA:"Zakat Return",
};

function buildFiscalConfig(country: string, t: (k: string) => string) {
  const rules = accountingRulesMap[country];
  const categories = rules?.deductibleCategories || ["tax", "insurance", "maintenance", "management", "interest"];
  return {
    flag: getCountryEntryOrDefault(country).flag,
    formName: FORM_NAMES[country] || "Tax Declaration",
    microThreshold: country === "FR" ? 15000 : 0,
    microRate: country === "FR" ? 0.3 : 0,
    microLabel: t("page.fiscal.micro_label"),
    realLabel: t("page.fiscal.real_label"),
    deficitMax: country === "FR" ? 10700 : null,
    taxAuthority: country.toLowerCase() + " tax authority",
    taxUrl: "#",
    deductibleCategories: categories,
    currencySymbol: rules?.currencySymbol || "€",
    expenseFields: categories.map(cat => ({
      key: cat,
      label: t(`page.fiscal.field_${cat === "interest" ? "interests" : cat === "tax" ? "property_tax" : cat}`) || cat,
      desc: "",
    })),
  };
}

const FiscalReport = () => {
  const countryFilter = useCountryFilter();
  const { orgId, user } = useAuth();
  const { t } = useI18n();
  const [rentCalls, setRentCalls] = useState<RentCall[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [year, setYear] = useState(new Date().getFullYear() - 1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orgId) return;
    Promise.all([
      fetchFiscalRentCallsRaw(orgId),
      fetchFiscalProperties(orgId, countryFilter),
    ]).then(([rcData, propsData]) => {
      setProperties(propsData as Property[]);
      const propIds = new Set((propsData as Property[]).map(pr => pr.id));
      let calls = rcData as RentCall[];
      if (countryFilter) {
        calls = calls.filter(r => r.property_id && propIds.has(r.property_id));
      }
      setRentCalls(calls);
      setLoading(false);
    });
  }, [orgId, countryFilter]);

  // Group properties by country
  const grouped = useMemo(() => {
    const map = new Map<string, Property[]>();
    for (const p of properties) {
      const c = p.country || "FR";
      if (!map.has(c)) map.set(c, []);
      map.get(c)!.push(p);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [properties]);

  // Global summary
  const globalSummary = useMemo(() => {
    const yearCalls = rentCalls.filter(r => r.month.startsWith(String(year)));
    const paidCalls = yearCalls.filter(r => r.paid);
    const totalBrut = paidCalls.reduce((s, r) => s + Number(r.rent_amount) + Number(r.charges_amount), 0);
    return { totalBrut, countries: grouped.length, properties: properties.length };
  }, [rentCalls, year, grouped, properties]);

  const handleExportAll = () => {
    const rows = properties.map(p => {
      const pCalls = rentCalls.filter(r => r.property_id === p.id && r.month.startsWith(String(year)) && r.paid);
      const total = pCalls.reduce((s, r) => s + Number(r.rent_amount) + Number(r.charges_amount), 0);
      return { bien: p.label, pays: p.country, adresse: `${p.address}, ${p.city}`, revenu_brut: total };
    });
    exportToCSV(rows as any, `bilan_fiscal_${year}`, [
      { key: "bien", label: t("page.properties.name") },
      { key: "pays", label: t("page.common.country") },
      { key: "adresse", label: t("page.properties.address") },
      { key: "revenu_brut", label: t("page.fiscal.gross_revenue") },
    ]);
  };

  return (
    <DashboardLayout>
      <FeatureGate feature="legal_documents" featureLabel={t("page.fiscal.title")}>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Calculator className="h-6 w-6 text-accent" /> {t("page.fiscal.title")}
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              {globalSummary.properties} {t("page.properties.title")} • {globalSummary.countries} {t("page.common.country")}{globalSummary.countries > 1 ? "s" : ""}
            </p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <select value={year} onChange={e => setYear(Number(e.target.value))} className="bg-background border border-border rounded-lg px-3 py-2 text-sm">
              {[...Array(5)].map((_, i) => { const y = new Date().getFullYear() - i; return <option key={y} value={y}>{y}</option>; })}
            </select>
            <button onClick={handleExportAll} className="flex items-center gap-2 bg-accent text-accent-foreground px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90">
              <Download className="h-4 w-4" /> {t("page.common.export_csv")}
            </button>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12 text-muted-foreground">{t("page.common.loading")}</div>
        ) : properties.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FileText className="h-10 w-10 text-muted-foreground/30 mb-3" />
              <p className="text-muted-foreground text-sm">{t("page.fiscal.no_data")}</p>
              <p className="text-xs text-muted-foreground mt-1">{t("page.fiscal.no_data_hint")}</p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Global KPIs */}
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              <StatCard icon={TrendingUp} iconClassName="text-primary" label={`${t("page.fiscal.gross_revenue")} (${year})`} value={formatCurrency(globalSummary.totalBrut, "FR")} />
              <StatCard icon={Globe} iconClassName="text-accent" label={`${t("page.common.country")}${globalSummary.countries > 1 ? "s" : ""}`} value={String(globalSummary.countries)} />
              <StatCard icon={Calculator} iconClassName="text-muted-foreground" label={t("page.properties.title")} value={String(globalSummary.properties)} />
            </div>

            {/* Per-country groups */}
            {grouped.map(([countryCode, countryProperties]) => {
              const config = buildFiscalConfig(countryCode, t);
              return (
                <div key={countryCode} className="space-y-3">
                  {/* Country header */}
                  <div className="flex items-center gap-2 pt-2">
                    <span className="text-lg">{config.flag}</span>
                    <h2 className="text-lg font-semibold text-foreground">{countryCode}</h2>
                    <span className="text-xs text-muted-foreground">— {config.formName}</span>
                    <span className="ml-auto text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                      {countryProperties.length} {t("page.properties.title").toLowerCase()}
                    </span>
                  </div>

                  {/* Per-property cards */}
                  {countryProperties.map(prop => (
                    <PropertyFiscalCard
                      key={prop.id}
                      propertyId={prop.id}
                      propertyLabel={prop.label}
                      propertyAddress={prop.address}
                      propertyCity={prop.city}
                      country={countryCode}
                      config={config}
                      rentCalls={rentCalls.filter(r => r.property_id === prop.id)}
                      year={year}
                    />
                  ))}
                </div>
              );
            })}
          </>
        )}

        {/* Disclaimer */}
        <div className="flex items-start gap-3 bg-muted/50 rounded-lg p-4">
          <Globe className="h-4 w-4 text-accent shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground">{t("page.fiscal.disclaimer")}</p>
        </div>
      </div>
      </FeatureGate>
    </DashboardLayout>
  );
};

export default FiscalReport;
