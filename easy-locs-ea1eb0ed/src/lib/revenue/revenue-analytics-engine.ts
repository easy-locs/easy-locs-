import type {
  RevenueModule,
  RevenueStream,
  ModuleRevenueBreakdown,
  GlobalRevenueSnapshot,
  RevenueEvent,
} from "@/domains/revenue/revenue-types";
import type { CurrencyCode } from "@/domains/shared/canonical-types";

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function computeModuleBreakdown(
  events: RevenueEvent[],
  module: RevenueModule,
  previousPeriodRevenue?: number,
): ModuleRevenueBreakdown {
  const moduleEvents = events.filter(e => e.module === module);
  const revenueByStream: Partial<Record<RevenueStream, number>> = {};
  let totalRevenue = 0;

  for (const event of moduleEvents) {
    revenueByStream[event.stream] = (revenueByStream[event.stream] ?? 0) + event.amount;
    totalRevenue += event.amount;
  }

  const growthPercent = previousPeriodRevenue && previousPeriodRevenue > 0
    ? round2(((totalRevenue - previousPeriodRevenue) / previousPeriodRevenue) * 100)
    : 0;

  return {
    module,
    totalRevenue: round2(totalRevenue),
    revenueByStream,
    transactionCount: moduleEvents.length,
    avgRevenuePerTransaction: moduleEvents.length > 0 ? round2(totalRevenue / moduleEvents.length) : 0,
    growthPercent,
    projectedMonthlyRevenue: round2(totalRevenue * 30 / Math.max(1, getDaySpan(moduleEvents))),
    currency: "EUR",
  };
}

function getDaySpan(events: RevenueEvent[]): number {
  if (events.length < 2) return 1;
  const dates = events.map(e => new Date(e.createdAt).getTime());
  const min = Math.min(...dates);
  const max = Math.max(...dates);
  return Math.max(1, Math.ceil((max - min) / 86_400_000));
}

export function computeGlobalSnapshot(
  events: RevenueEvent[],
  uniqueUsers: number,
  previousPeriodEvents?: RevenueEvent[],
): GlobalRevenueSnapshot {
  const modules: RevenueModule[] = [
    "wallet", "flight", "hotel", "property", "taxi",
    "delivery", "marketplace", "services", "orbit",
    "advertising", "subscription",
  ];

  const prevByModule: Partial<Record<RevenueModule, number>> = {};
  if (previousPeriodEvents) {
    for (const e of previousPeriodEvents) {
      prevByModule[e.module] = (prevByModule[e.module] ?? 0) + e.amount;
    }
  }

  const byModule = modules
    .map(m => computeModuleBreakdown(events, m, prevByModule[m]))
    .filter(b => b.transactionCount > 0);

  const totalRevenue = round2(byModule.reduce((s, b) => s + b.totalRevenue, 0));
  const totalTransactions = byModule.reduce((s, b) => s + b.transactionCount, 0);

  const byCountry: Map<string, { revenue: number; transactions: number; currency: CurrencyCode }> = new Map();
  for (const e of events) {
    const entry = byCountry.get(e.country) ?? { revenue: 0, transactions: 0, currency: e.currency };
    entry.revenue = round2(entry.revenue + e.amount);
    entry.transactions += 1;
    byCountry.set(e.country, entry);
  }

  const streamTotals: Map<RevenueStream, number> = new Map();
  for (const e of events) {
    streamTotals.set(e.stream, (streamTotals.get(e.stream) ?? 0) + e.amount);
  }

  const topStreams = [...streamTotals.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([stream, revenue]) => ({
      stream,
      revenue: round2(revenue),
      share: totalRevenue > 0 ? round2((revenue / totalRevenue) * 100) : 0,
    }));

  const payingUsers = new Set(events.map(e => e.userId)).size;
  const conversionRate = uniqueUsers > 0 ? round2((payingUsers / uniqueUsers) * 100) : 0;

  const daySpan = getDaySpan(events);
  const dailyRevenue = daySpan > 0 ? totalRevenue / daySpan : 0;
  const avgLifetimeMonths = 12;
  const userLTV = payingUsers > 0
    ? round2((dailyRevenue * 30 * avgLifetimeMonths) / payingUsers)
    : 0;

  const estimatedCosts = totalRevenue * 0.35;
  const roi = estimatedCosts > 0 ? round2(((totalRevenue - estimatedCosts) / estimatedCosts) * 100) : 0;

  return {
    totalRevenue,
    totalTransactions,
    avgRevenuePerUser: uniqueUsers > 0 ? round2(totalRevenue / uniqueUsers) : 0,
    currency: "EUR",
    period: `${daySpan}d`,
    byModule,
    byCountry: [...byCountry.entries()].map(([country, data]) => ({
      country,
      revenue: data.revenue,
      transactions: data.transactions,
      currency: data.currency,
    })).sort((a, b) => b.revenue - a.revenue),
    topStreams,
    conversionRate,
    userLTV,
    roi,
  };
}

export function computeConversionFunnel(
  totalVisitors: number,
  signups: number,
  activeUsers: number,
  payingUsers: number,
  repeatPayers: number,
): Array<{ stage: string; count: number; rate: number; dropoff: number }> {
  const stages = [
    { stage: "Visitors", count: totalVisitors },
    { stage: "Sign-ups", count: signups },
    { stage: "Active Users", count: activeUsers },
    { stage: "Paying Users", count: payingUsers },
    { stage: "Repeat Payers", count: repeatPayers },
  ];

  return stages.map((s, i) => {
    const prev = i === 0 ? s.count : stages[i - 1].count;
    return {
      ...s,
      rate: prev > 0 ? round2((s.count / prev) * 100) : 0,
      dropoff: prev > 0 ? round2(((prev - s.count) / prev) * 100) : 0,
    };
  });
}

export function computeUserLTV(
  avgOrderValue: number,
  ordersPerMonth: number,
  avgLifetimeMonths: number,
  avgCommissionRate: number,
): { grossLTV: number; netLTV: number; monthlyValue: number } {
  const monthlyValue = round2(avgOrderValue * ordersPerMonth);
  const grossLTV = round2(monthlyValue * avgLifetimeMonths);
  const netLTV = round2(grossLTV * avgCommissionRate);
  return { grossLTV, netLTV, monthlyValue };
}

export function computeModuleROI(
  revenue: number,
  developmentCost: number,
  operationalCostMonthly: number,
  monthsActive: number,
): { roi: number; paybackMonths: number; profitMargin: number; totalCost: number } {
  const totalCost = developmentCost + operationalCostMonthly * monthsActive;
  const profit = revenue - totalCost;
  const roi = totalCost > 0 ? round2((profit / totalCost) * 100) : 0;
  const monthlyRevenue = monthsActive > 0 ? revenue / monthsActive : 0;
  const monthlyCost = operationalCostMonthly + (monthsActive > 0 ? developmentCost / monthsActive : developmentCost);
  const paybackMonths = monthlyCost > 0 && monthlyRevenue > monthlyCost
    ? Math.ceil(developmentCost / (monthlyRevenue - operationalCostMonthly))
    : -1;
  const profitMargin = revenue > 0 ? round2((profit / revenue) * 100) : 0;

  return { roi, paybackMonths, profitMargin, totalCost: round2(totalCost) };
}

export function projectRevenue(
  currentMonthlyRevenue: number,
  growthRatePercent: number,
  months: number,
): Array<{ month: number; revenue: number; cumulative: number }> {
  const projections: Array<{ month: number; revenue: number; cumulative: number }> = [];
  let cumulative = 0;
  let monthlyRevenue = currentMonthlyRevenue;

  for (let m = 1; m <= months; m++) {
    monthlyRevenue = round2(monthlyRevenue * (1 + growthRatePercent / 100));
    cumulative = round2(cumulative + monthlyRevenue);
    projections.push({ month: m, revenue: monthlyRevenue, cumulative });
  }

  return projections;
}

export function identifyRevenueOpportunities(
  snapshot: GlobalRevenueSnapshot,
): Array<{ module: RevenueModule; opportunity: string; estimatedImpact: number; priority: "high" | "medium" | "low" }> {
  const opportunities: Array<{ module: RevenueModule; opportunity: string; estimatedImpact: number; priority: "high" | "medium" | "low" }> = [];

  const allModules: RevenueModule[] = [
    "wallet", "flight", "hotel", "property", "taxi",
    "delivery", "marketplace", "services", "advertising", "subscription",
  ];

  const activeModules = new Set(snapshot.byModule.map(m => m.module));
  for (const mod of allModules) {
    if (!activeModules.has(mod)) {
      opportunities.push({
        module: mod,
        opportunity: `Activate ${mod} monetization — currently generating no revenue`,
        estimatedImpact: snapshot.totalRevenue * 0.05,
        priority: "high",
      });
    }
  }

  for (const mod of snapshot.byModule) {
    if (mod.growthPercent < -10) {
      opportunities.push({
        module: mod.module,
        opportunity: `${mod.module} revenue declining ${mod.growthPercent}% — investigate and optimize pricing`,
        estimatedImpact: Math.abs(mod.totalRevenue * mod.growthPercent / 100),
        priority: "high",
      });
    }
  }

  if (snapshot.conversionRate < 5) {
    opportunities.push({
      module: "subscription",
      opportunity: `Conversion rate at ${snapshot.conversionRate}% — optimize onboarding and first-purchase flow`,
      estimatedImpact: snapshot.totalRevenue * 0.20,
      priority: "high",
    });
  }

  const hasSubscription = snapshot.byModule.some(m => m.module === "subscription");
  if (!hasSubscription) {
    opportunities.push({
      module: "subscription",
      opportunity: "Launch subscription tiers for merchants — recurring revenue stream",
      estimatedImpact: snapshot.totalRevenue * 0.15,
      priority: "medium",
    });
  }

  const hasAdvertising = snapshot.byModule.some(m => m.module === "advertising");
  if (!hasAdvertising) {
    opportunities.push({
      module: "advertising",
      opportunity: "Enable boost/sponsored listings — high-margin revenue with zero COGS",
      estimatedImpact: snapshot.totalRevenue * 0.10,
      priority: "medium",
    });
  }

  return opportunities.sort((a, b) => {
    const prio = { high: 0, medium: 1, low: 2 };
    return prio[a.priority] - prio[b.priority] || b.estimatedImpact - a.estimatedImpact;
  });
}
