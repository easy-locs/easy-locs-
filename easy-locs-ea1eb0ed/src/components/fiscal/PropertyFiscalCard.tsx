import { useState, useMemo } from "react";
import { useI18n } from "@/lib/i18n";
import { formatCurrency } from "@/lib/country-config";
import { AppCard, CardContent, CardHeader, CardTitle } from "@/components/ui/AppCard";
import { Calculator, TrendingDown, TrendingUp, ChevronDown, ChevronUp } from "lucide-react";

interface RentCall {
  month: string;
  rent_amount: number;
  charges_amount: number;
  total_amount: number;
  paid: boolean | null;
}

interface FiscalConfig {
  flag: string;
  formName: string;
  microThreshold: number;
  microRate: number;
  microLabel: string;
  realLabel: string;
  expenseFields: { key: string; label: string; desc: string }[];
  deficitMax: number | null;
  taxAuthority: string;
  taxUrl: string;
  deductibleCategories: string[];
  currencySymbol: string;
}

interface Props {
  propertyId: string;
  propertyLabel: string;
  propertyAddress: string;
  propertyCity: string;
  country: string;
  config: FiscalConfig;
  rentCalls: RentCall[];
  year: number;
}

const PropertyFiscalCard = ({ propertyId, propertyLabel, propertyAddress, propertyCity, country, config, rentCalls, year }: Props) => {
  const { t } = useI18n();
  const [expanded, setExpanded] = useState(false);
  const [expenses, setExpenses] = useState<Record<string, number>>({});
  const [manualRegime, setManualRegime] = useState<"auto" | "micro" | "real">("auto");
  const fmt = (n: number) => formatCurrency(n, country);

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
    return { revenusBruts, chargesRecuperees, totalBrut, totalExpenses, revenuNet, regime, hasMicro, abattement, revenuImposable, yearCalls: yearCalls.length, paidCalls: paidCalls.length };
  }, [rentCalls, year, expenses, manualRegime, config]);

  return (
    <AppCard className="border-border/60">
      {/* Header — always visible */}
      <CardHeader
        className="cursor-pointer hover:bg-muted/30 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-xl">{config.flag}</span>
            <div className="min-w-0">
              <CardTitle className="text-base line-clamp-2 break-words">{propertyLabel}</CardTitle>
              <p className="text-xs text-muted-foreground line-clamp-1 break-words">{propertyAddress}, {propertyCity} • {config.formName}</p>
            </div>
          </div>
          <div className="flex items-center gap-4 shrink-0">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-semibold text-foreground">{fmt(report.totalBrut)}</p>
              <p className="text-xs text-muted-foreground">{t("page.fiscal.gross_revenue")}</p>
            </div>
            <div className="text-right hidden sm:block">
              <p className="text-sm font-semibold text-accent">{fmt(report.revenuImposable)}</p>
              <p className="text-xs text-muted-foreground">{t("page.fiscal.taxable_income")}</p>
            </div>
            {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
          </div>
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="space-y-5 pt-0">
          {/* KPIs row */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-muted/30 rounded-lg p-3 text-center">
              <TrendingUp className="h-4 w-4 text-primary mx-auto mb-1" />
              <p className="text-lg font-bold text-foreground">{fmt(report.totalBrut)}</p>
              <p className="text-[0.6875rem] text-muted-foreground">{t("page.fiscal.gross_revenue")}</p>
              <p className="text-[0.625rem] text-muted-foreground">{report.paidCalls}/{report.yearCalls} {t("page.fiscal.paid_calls")}</p>
            </div>
            <div className="bg-muted/30 rounded-lg p-3 text-center">
              <TrendingDown className="h-4 w-4 text-destructive mx-auto mb-1" />
              <p className="text-lg font-bold text-destructive">-{fmt(report.totalExpenses)}</p>
              <p className="text-[0.6875rem] text-muted-foreground">{t("page.fiscal.deductible_expenses")}</p>
            </div>
            <div className="bg-accent/10 rounded-lg p-3 text-center border border-accent/20">
              <Calculator className="h-4 w-4 text-accent mx-auto mb-1" />
              <p className="text-lg font-bold text-accent">{fmt(report.revenuImposable)}</p>
              <p className="text-[0.6875rem] text-muted-foreground">{t("page.fiscal.taxable_income")}</p>
            </div>
          </div>

          {/* Regime selector */}
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-sm font-medium text-foreground">{t("page.fiscal.regime")} :</span>
            <div className="flex bg-muted rounded-lg p-1">
              <button onClick={() => setManualRegime("auto")} className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${manualRegime === "auto" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}>{t("page.fiscal.auto")}</button>
              {report.hasMicro && <button onClick={() => setManualRegime("micro")} className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${manualRegime === "micro" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}>{config.microLabel}</button>}
              <button onClick={() => setManualRegime("real")} className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${manualRegime === "real" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}>{config.realLabel}</button>
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            {report.regime === "micro"
              ? `${config.microLabel} — ${t("page.fiscal.allowance_text").replace("{rate}", String(config.microRate * 100)).replace("{amount}", fmt(report.abattement))}`
              : `${config.realLabel} — ${t("page.fiscal.deduction_text").replace("{amount}", fmt(report.totalExpenses))}`}
          </p>

          {/* Expense inputs (real regime) */}
          {(report.regime === "real" || manualRegime === "real") && (
            <div className="border-t border-border/50 pt-4">
              <p className="text-sm font-medium text-foreground mb-3">{t("page.fiscal.expense_entry")}</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {config.expenseFields.map(field => (
                  <div key={field.key}>
                    <label className="block text-xs font-medium text-foreground mb-1">{field.label}</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={0}
                        value={expenses[field.key] || ""}
                        onChange={e => setExpenses(prev => ({ ...prev, [field.key]: Number(e.target.value) }))}
                        className="flex-1 bg-background border border-border rounded-lg px-3 py-2 text-sm"
                        placeholder="0.00"
                      />
                      <span className="text-xs text-muted-foreground">{config.currencySymbol}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      )}
    </AppCard>
  );
};

export default PropertyFiscalCard;
