import { useMemo } from "react";
import { TrendingUp, TrendingDown, Percent, DollarSign, Home, AlertTriangle, BarChart3 } from "lucide-react";
import { formatCurrency } from "@/lib/country-config";
import { motion } from "framer-motion";

interface PortfolioAnalyticsProps {
  properties: any[];
  tenants: any[];
  leases: any[];
  rentCalls: any[];
  expenses: any[];
  userCountry: string;
}

interface PropertyROI {
  id: string;
  label: string;
  country: string;
  monthlyRent: number;
  monthlyExpenses: number;
  cashFlow: number;
  occupancyRate: number;
  riskLevel: "low" | "medium" | "high";
}

const PortfolioAnalytics = ({ properties, tenants, leases, rentCalls, expenses, userCountry }: PortfolioAnalyticsProps) => {
  const fmt = (n: number) => formatCurrency(n, userCountry);

  const analytics = useMemo(() => {
    const today = new Date();
    const currentMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;

    const propertyMetrics: PropertyROI[] = properties.map(prop => {
      const propTenants = tenants.filter(t => t.property_id === prop.id);
      const propLeases = leases.filter(l => l.property_id === prop.id && l.status === "active");
      const propRentCalls = rentCalls.filter(r => r.property_id === prop.id);
      const propExpenses = expenses.filter(e => e.property_id === prop.id);

      const monthlyRent = propLeases.reduce((s, l) => s + (l.rent_amount || 0) + (l.charges_amount || 0), 0);
      const avgMonthlyExpenses = propExpenses.length > 0
        ? propExpenses.reduce((s, e) => s + (e.amount || 0), 0) / Math.max(1, new Set(propExpenses.map((e: any) => e.expense_date?.slice(0, 7))).size)
        : 0;

      const isOccupied = propTenants.length > 0;
      const totalMonths = 12;
      const occupiedMonths = isOccupied ? totalMonths : 0;

      // Late payments
      const unpaidCalls = propRentCalls.filter((r: any) => !r.paid && r.month < currentMonth);
      const riskLevel: "low" | "medium" | "high" = unpaidCalls.length >= 3 ? "high" : unpaidCalls.length >= 1 ? "medium" : "low";

      return {
        id: prop.id,
        label: prop.label || "Unnamed",
        country: prop.country || "FR",
        monthlyRent,
        monthlyExpenses: avgMonthlyExpenses,
        cashFlow: monthlyRent - avgMonthlyExpenses,
        occupancyRate: totalMonths > 0 ? (occupiedMonths / totalMonths) * 100 : 0,
        riskLevel,
      };
    });

    const totalMonthlyRent = propertyMetrics.reduce((s, p) => s + p.monthlyRent, 0);
    const totalMonthlyCashFlow = propertyMetrics.reduce((s, p) => s + p.cashFlow, 0);
    const avgOccupancy = propertyMetrics.length > 0
      ? propertyMetrics.reduce((s, p) => s + p.occupancyRate, 0) / propertyMetrics.length
      : 0;
    const highRiskCount = propertyMetrics.filter(p => p.riskLevel === "high").length;

    // Country performance
    const countryMap = new Map<string, { revenue: number; properties: number; cashFlow: number }>();
    propertyMetrics.forEach(p => {
      const existing = countryMap.get(p.country) || { revenue: 0, properties: 0, cashFlow: 0 };
      existing.revenue += p.monthlyRent;
      existing.properties++;
      existing.cashFlow += p.cashFlow;
      countryMap.set(p.country, existing);
    });

    return {
      propertyMetrics: propertyMetrics.sort((a, b) => b.cashFlow - a.cashFlow),
      totalMonthlyRent,
      totalMonthlyCashFlow,
      avgOccupancy,
      highRiskCount,
      countryPerformance: Array.from(countryMap.entries()).map(([code, data]) => ({ code, ...data })),
    };
  }, [properties, tenants, leases, rentCalls, expenses]);

  const riskColor = (level: string) => {
    if (level === "high") return "text-destructive bg-destructive/10";
    if (level === "medium") return "text-warning bg-warning/10";
    return "text-success bg-success/10";
  };

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: DollarSign, label: "Monthly Revenue", value: fmt(analytics.totalMonthlyRent), positive: true },
          { icon: TrendingUp, label: "Net Cash Flow", value: fmt(analytics.totalMonthlyCashFlow), positive: analytics.totalMonthlyCashFlow >= 0 },
          { icon: Percent, label: "Avg Occupancy", value: `${Math.round(analytics.avgOccupancy)}%`, positive: analytics.avgOccupancy >= 80 },
          { icon: AlertTriangle, label: "High Risk", value: String(analytics.highRiskCount), positive: analytics.highRiskCount === 0 },
        ].map((kpi, i) => (
          <motion.div
            key={kpi.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="stat-card"
          >
            <div className="flex items-center gap-2 mb-2">
              <kpi.icon className={`h-4 w-4 ${kpi.positive ? "text-success" : "text-destructive"}`} />
              <span className="text-xs text-muted-foreground font-medium">{kpi.label}</span>
            </div>
            <div className={`text-xl font-bold tabular-nums ${kpi.positive ? "text-foreground" : "text-destructive"}`}>
              {kpi.value}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Property Performance Table */}
      <div className="bg-card rounded-xl border border-border/50 shadow-card overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-accent" />
          <h3 className="text-sm font-semibold text-foreground">Property Performance</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Property</th>
                <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">Revenue</th>
                <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">Cash Flow</th>
                <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">Occupancy</th>
                <th className="text-center px-4 py-2.5 font-medium text-muted-foreground">Risk</th>
              </tr>
            </thead>
            <tbody>
              {analytics.propertyMetrics.slice(0, 10).map((p, i) => (
                <tr key={p.id} className="border-b border-border/50 last:border-0 hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <Home className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span className="font-medium text-foreground truncate max-w-[180px]">{p.label}</span>
                    </div>
                  </td>
                  <td className="text-right px-4 py-2.5 tabular-nums text-foreground whitespace-nowrap">{fmt(p.monthlyRent)}</td>
                  <td className={`text-right px-4 py-2.5 tabular-nums whitespace-nowrap ${p.cashFlow >= 0 ? "text-success" : "text-destructive"}`}>
                    {p.cashFlow >= 0 ? "+" : ""}{fmt(p.cashFlow)}
                  </td>
                  <td className="text-right px-4 py-2.5 tabular-nums text-foreground">{Math.round(p.occupancyRate)}%</td>
                  <td className="text-center px-4 py-2.5">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${riskColor(p.riskLevel)}`}>
                      {p.riskLevel}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Country Performance */}
      {analytics.countryPerformance.length > 1 && (
        <div className="bg-card rounded-xl border border-border/50 shadow-card p-4">
          <h3 className="text-sm font-semibold text-foreground mb-3">Country Comparison</h3>
          <div className="space-y-2">
            {analytics.countryPerformance.map(cp => (
              <div key={cp.code} className="flex items-center gap-3 py-2">
                <span className="text-xs font-mono font-bold text-muted-foreground w-8">{cp.code}</span>
                <div className="flex-1">
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-accent rounded-full transition-all"
                      style={{ width: `${Math.min(100, (cp.revenue / Math.max(1, analytics.totalMonthlyRent)) * 100)}%` }}
                    />
                  </div>
                </div>
                <span className="text-xs tabular-nums font-medium text-foreground whitespace-nowrap">{fmt(cp.revenue)}/mo</span>
                <span className="text-xs tabular-nums text-muted-foreground">{cp.properties} props</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default PortfolioAnalytics;
