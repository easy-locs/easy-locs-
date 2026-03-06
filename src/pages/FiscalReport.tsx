import { useState, useEffect, useMemo } from "react";
import FeatureGate from "@/components/subscription/FeatureGate";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { formatCurrency } from "@/lib/country-config";
import { getAllAccountingRules } from "@/lib/accounting-rules";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Download, AlertTriangle, TrendingUp, TrendingDown, Calculator, PiggyBank, Globe, ChevronRight } from "lucide-react";
import { exportToCSV } from "@/lib/csv-export";

interface RentCall { month: string; rent_amount: number; charges_amount: number; total_amount: number; paid: boolean | null; }
interface Property { id: string; label: string; monthly_rent: number; monthly_charges: number; address: string; city: string; }

// Country-specific fiscal configurations
// Fiscal configs are built dynamically with i18n in the component below
// Build fiscal configs dynamically from accounting-rules for ALL countries
const accountingRulesMap = getAllAccountingRules();
const COUNTRY_FLAGS: Record<string, string> = {
  FR:"🇫🇷",DE:"🇩🇪",ES:"🇪🇸",IT:"🇮🇹",PT:"🇵🇹",GB:"🇬🇧",US:"🇺🇸",AE:"🇦🇪",JP:"🇯🇵",BR:"🇧🇷",MA:"🇲🇦",AU:"🇦🇺",IN:"🇮🇳",SG:"🇸🇬",SA:"🇸🇦",TR:"🇹🇷",
  BE:"🇧🇪",NL:"🇳🇱",AT:"🇦🇹",CH:"🇨🇭",PL:"🇵🇱",SE:"🇸🇪",NO:"🇳🇴",DK:"🇩🇰",FI:"🇫🇮",GR:"🇬🇷",CZ:"🇨🇿",HU:"🇭🇺",RO:"🇷🇴",BG:"🇧🇬",HR:"🇭🇷",IE:"🇮🇪",
  CA:"🇨🇦",MX:"🇲🇽",ZA:"🇿🇦",NG:"🇳🇬",KR:"🇰🇷",CN:"🇨🇳",EG:"🇪🇬",IL:"🇮🇱",QA:"🇶🇦",KW:"🇰🇼",PH:"🇵🇭",TH:"🇹🇭",VN:"🇻🇳",MY:"🇲🇾",ID:"🇮🇩",UA:"🇺🇦",SK:"🇸🇰",LU:"🇱🇺",NZ:"🇳🇿",
};
const FORM_NAMES: Record<string,string> = {
  FR:"Formulaire 2044",DE:"Anlage V",ES:"Modelo 100",IT:"Modello 730",PT:"Modelo 3 (Anexo F)",GB:"Self Assessment",US:"Schedule E (1040)",
  BE:"Déclaration IPP",NL:"Box 3",AT:"Einkommensteuererklärung",CH:"Steuererklärung",PL:"PIT-28",SE:"Inkomstdeklaration",
  NO:"Skattemelding",DK:"Selvangivelse",FI:"Veroilmoitus",GR:"Φορολογική δήλωση",CZ:"Přiznání DPFO",HU:"SZJA",
  RO:"Declarația 212",BG:"Годишна декларация",HR:"Porezna prijava",IE:"Form 11",CA:"T776",MX:"Declaración anual",
  ZA:"ITR12",KR:"종합소득세",CN:"个人所得税申报",JP:"確定申告",BR:"IRPF",AU:"Tax Return",
};

const FISCAL_CONFIGS_STATIC: Record<string, {
  label: string; flag: string; formName: string; microThreshold: number; microRate: number; taxAuthority: string; taxUrl: string; lawDepotUrl: string;
  deficitMax: number | null;
  expenseFieldKeys: { key: string; labelKey: string; descKey: string }[];
}> = {};

// Populate from accounting rules
for (const [code, rules] of Object.entries(accountingRulesMap)) {
  FISCAL_CONFIGS_STATIC[code] = {
    label: code, flag: COUNTRY_FLAGS[code] || "🌍", formName: FORM_NAMES[code] || "Tax Declaration",
    microThreshold: code === "FR" ? 15000 : 0, microRate: code === "FR" ? 0.3 : 0,
    deficitMax: code === "FR" ? 10700 : null,
    taxAuthority: code.toLowerCase() + " tax authority", taxUrl: "#", lawDepotUrl: "https://www.lawdepot.com",
    expenseFieldKeys: rules.deductibleCategories.map(cat => ({
      key: cat, labelKey: `page.fiscal.field_${cat === "interest" ? "interests" : cat === "tax" ? "property_tax" : cat}`, descKey: "",
    })),
  };
}

const DEFAULT_CONFIG_STATIC = {
  label: "International", flag: "🌍", formName: "Tax Declaration", microThreshold: 0, microRate: 0,
  deficitMax: null, taxAuthority: "lawdepot.com", taxUrl: "https://www.lawdepot.com", lawDepotUrl: "https://www.lawdepot.com",
  expenseFieldKeys: [
    { key: "tax", labelKey: "page.fiscal.field_property_tax", descKey: "" },
    { key: "insurance", labelKey: "page.fiscal.field_insurance", descKey: "" },
    { key: "maintenance", labelKey: "page.fiscal.field_maintenance", descKey: "" },
    { key: "management", labelKey: "page.fiscal.field_management", descKey: "" },
    { key: "interest", labelKey: "page.fiscal.field_interests", descKey: "" },
  ],
};

const FiscalReport = () => {
  const { orgId, user, userCountry: authUserCountry } = useAuth();
  const { t } = useI18n();
  const [rentCalls, setRentCalls] = useState<RentCall[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [year, setYear] = useState(new Date().getFullYear() - 1);
  const [expenses, setExpenses] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [userCountry, setUserCountry] = useState(authUserCountry || "FR");
  const [manualRegime, setManualRegime] = useState<"auto" | "micro" | "real">("auto");

  const staticConfig = FISCAL_CONFIGS_STATIC[userCountry] || DEFAULT_CONFIG_STATIC;
  const config = useMemo(() => ({
    ...staticConfig,
    microLabel: t("page.fiscal.micro_label"),
    realLabel: t("page.fiscal.real_label"),
    deficitLabel: t("page.fiscal.deficit_label"),
    expenseFields: staticConfig.expenseFieldKeys.map(f => ({
      key: f.key,
      label: f.labelKey ? t(f.labelKey) : f.key,
      desc: f.descKey ? t(f.descKey) : "",
    })),
  }), [staticConfig, t]);
  const fmt = (n: number) => formatCurrency(n, userCountry);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("country").eq("id", user.id).single().then(({ data }) => { if (data?.country) setUserCountry(data.country); });
  }, [user]);

  useEffect(() => {
    if (!orgId) return;
    Promise.all([
      supabase.from("rent_calls").select("month, rent_amount, charges_amount, total_amount, paid").eq("org_id", orgId),
      supabase.from("properties").select("id, label, monthly_rent, monthly_charges, address, city").eq("org_id", orgId),
    ]).then(([rc, p]) => {
      setRentCalls((rc.data || []) as RentCall[]);
      setProperties((p.data || []) as Property[]);
      setLoading(false);
    });
  }, [orgId]);

  const report = useMemo(() => {
    const yearCalls = rentCalls.filter(r => r.month.startsWith(String(year)));
    const paidCalls = yearCalls.filter(r => r.paid);
    const revenusBruts = paidCalls.reduce((s, r) => s + Number(r.rent_amount), 0);
    const chargesRecuperees = paidCalls.reduce((s, r) => s + Number(r.charges_amount), 0);
    const totalBrut = revenusBruts + chargesRecuperees;
    const totalExpenses = Object.values(expenses).reduce((s, v) => s + (v || 0), 0);
    const revenuNet = totalBrut - totalExpenses;
    const hasMicro = config.microThreshold > 0;
    const autoRegime = hasMicro && totalBrut <= config.microThreshold ? "micro" : "real";
    const regime = manualRegime === "auto" ? autoRegime : manualRegime;
    const abattement = regime === "micro" && config.microRate > 0 ? totalBrut * config.microRate : 0;
    const revenuImposable = regime === "micro" ? totalBrut - abattement : revenuNet;
    return { revenusBruts, chargesRecuperees, totalBrut, totalExpenses, revenuNet, regime, autoRegime, hasMicro, abattement, revenuImposable, yearCalls: yearCalls.length, paidCalls: paidCalls.length };
  }, [rentCalls, year, expenses, manualRegime, config]);

  const handleExport = () => {
    const rows = [
      { poste: t("page.fiscal.gross_income"), montant: report.revenusBruts },
      { poste: t("page.fiscal.recovered_charges"), montant: report.chargesRecuperees },
      { poste: t("page.fiscal.total_gross"), montant: report.totalBrut },
      { poste: "---", montant: 0 },
      ...config.expenseFields.map(f => ({ poste: f.label, montant: -(expenses[f.key] || 0) })),
      { poste: t("page.fiscal.total_deductible"), montant: -report.totalExpenses },
      { poste: "---", montant: 0 },
      { poste: `${t("page.fiscal.taxable_income")} (${report.regime === "micro" ? config.microLabel : config.realLabel})`, montant: report.revenuImposable },
    ];
    exportToCSV(rows as any, `bilan_fiscal_${userCountry}_${year}`, [{ key: "poste", label: t("page.expenses.label") }, { key: "montant", label: t("page.expenses.amount") }]);
  };

  return (
    <DashboardLayout>
      <FeatureGate feature="legal_documents" featureLabel={t("page.fiscal.title")}>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">{config.flag} {t("page.fiscal.title")}</h1>
            <p className="text-muted-foreground text-sm mt-1">{config.formName} • {config.label}</p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <select value={userCountry} onChange={e => setUserCountry(e.target.value)} className="bg-background border border-border rounded-lg px-3 py-2 text-sm">
              {Object.entries(FISCAL_CONFIGS_STATIC).map(([code, cfg]) => <option key={code} value={code}>{cfg.flag} {cfg.label}</option>)}
              <option value="OTHER">🌍 Other</option>
            </select>
            <select value={year} onChange={e => setYear(Number(e.target.value))} className="bg-background border border-border rounded-lg px-3 py-2 text-sm">
              {[...Array(5)].map((_, i) => { const y = new Date().getFullYear() - i; return <option key={y} value={y}>{y}</option>; })}
            </select>
            <button onClick={handleExport} className="flex items-center gap-2 bg-accent text-accent-foreground px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90">
              <Download className="h-4 w-4" /> {t("page.common.export_csv")}
            </button>
          </div>
        </div>

        {loading ? <div className="text-center py-12 text-muted-foreground">{t("page.common.loading")}</div> :
          rentCalls.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <FileText className="h-10 w-10 text-muted-foreground/30 mb-3" />
                <p className="text-muted-foreground text-sm">{t("page.fiscal.no_data")}</p>
                <p className="text-xs text-muted-foreground mt-1">{t("page.fiscal.no_data_hint")}</p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* KPIs */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card className="bg-gradient-to-br from-card to-muted/20">
                  <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">{t("page.fiscal.gross_revenue")}</CardTitle></CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-foreground">{fmt(report.totalBrut)}</div>
                    <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                      <PiggyBank className="h-3 w-3" /> {report.paidCalls} {t("page.fiscal.paid_calls")} / {report.yearCalls}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">{t("page.fiscal.deductible_expenses")}</CardTitle></CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-destructive">-{fmt(report.totalExpenses)}</div>
                    <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                      <TrendingDown className="h-3 w-3" /> {Object.keys(expenses).length} {t("page.finances.expense_count")}
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-accent/20 bg-accent/5">
                  <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-accent">{t("page.fiscal.taxable_income")}</CardTitle></CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-accent">{fmt(report.revenuImposable)}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {report.regime === "micro" ? `${config.microLabel} (-${config.microRate * 100}%)` : config.realLabel}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Regime Selector */}
              <Card>
                <CardHeader className="pb-3 border-b border-border/50">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2"><Calculator className="h-4 w-4 text-muted-foreground" /> {t("page.fiscal.regime")}</CardTitle>
                    <div className="flex bg-muted rounded-lg p-1">
                      <button onClick={() => setManualRegime("auto")} className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${manualRegime === "auto" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}>{t("page.fiscal.auto")}</button>
                      {report.hasMicro && <button onClick={() => setManualRegime("micro")} className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${manualRegime === "micro" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}>{t("page.fiscal.force_micro")}</button>}
                      <button onClick={() => setManualRegime("real")} className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${manualRegime === "real" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}>{t("page.fiscal.force_real")}</button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-4">
                  <p className="text-sm text-muted-foreground mb-4">
                    {report.regime === "micro"
                      ? `${t("page.fiscal.auto")} : ${config.microLabel}. ${t("page.fiscal.allowance_text").replace("{rate}", String(config.microRate * 100)).replace("{amount}", fmt(report.abattement))}`
                      : `${t("page.fiscal.auto")} : ${config.realLabel}. ${t("page.fiscal.deduction_text").replace("{amount}", fmt(report.totalExpenses))}`
                    }
                  </p>
                </CardContent>
              </Card>

              {/* Expenses Inputs */}
              {(report.regime === "real" || manualRegime === "real") && (
                <Card>
                  <CardHeader><CardTitle className="text-base">{t("page.fiscal.expense_entry")}</CardTitle></CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {config.expenseFields.map(field => (
                        <div key={field.key}>
                          <label className="block text-sm font-medium text-foreground mb-1">{field.label}</label>
                          <div className="flex items-center gap-2">
                            <input type="number" min={0} value={expenses[field.key] || ""} onChange={e => setExpenses(prev => ({ ...prev, [field.key]: Number(e.target.value) }))} className="flex-1 bg-background border border-border rounded-lg px-3 py-2 text-sm" placeholder="0.00" />
                            <span className="text-sm text-muted-foreground">€</span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">{field.desc}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}

        <div className="flex items-start gap-3 bg-muted/50 rounded-lg p-4">
          <Globe className="h-4 w-4 text-accent shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-xs text-muted-foreground mb-2">{t("page.fiscal.disclaimer")}</p>
            <div className="flex gap-4">
              <a href={config.taxUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-accent hover:underline flex items-center gap-1">{config.taxAuthority} <ChevronRight className="h-3 w-3" /></a>
              <a href={config.lawDepotUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-accent hover:underline flex items-center gap-1">LawDepot Tax Models <ChevronRight className="h-3 w-3" /></a>
            </div>
          </div>
        </div>
      </div>
      </FeatureGate>
    </DashboardLayout>
  );
};

export default FiscalReport;
