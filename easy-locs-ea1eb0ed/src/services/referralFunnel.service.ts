import { db } from "./db";

export interface FunnelStage {
  label: string;
  key: string;
  count: number;
  color: string;
}

export interface FunnelConversion {
  from: string;
  to: string;
  rate: number;
}

export interface DailyFunnelPoint {
  date: string;
  shares: number;
  clicks: number;
  conversions: number;
}

export interface ReferralFunnelData {
  stages: FunnelStage[];
  conversions: FunnelConversion[];
  timeSeries: DailyFunnelPoint[];
  totalRedemptions: number;
  totalCredited: number;
}

export async function fetchReferralFunnelData(
  userId: string,
  days: number = 30
): Promise<ReferralFunnelData> {
  const since = new Date();
  since.setDate(since.getDate() - days);
  const sinceISO = since.toISOString();

  const [activityResult, redemptionResult] = await Promise.all([
    db("activity_logs")
      .select("action, created_at")
      .in("action", ["link_shared", "link_clicked", "share_converted"])
      .eq("user_id", userId)
      .gte("created_at", sinceISO)
      .order("created_at", { ascending: true }),
    db("referral_redemptions")
      .select("status, created_at")
      .eq("referrer_user_id", userId)
      .gte("created_at", sinceISO),
  ]);

  if (activityResult.error) {
    if (activityResult.error.code === "42P01") {
      return emptyFunnelData(days);
    }
    throw new Error(`Failed to fetch referral activity: ${activityResult.error.message}`);
  }
  if (redemptionResult.error) {
    if (redemptionResult.error.code === "42P01") {
      return emptyFunnelData(days);
    }
    throw new Error(`Failed to fetch referral redemptions: ${redemptionResult.error.message}`);
  }

  const activityRows: Array<{ action: string; created_at: string }> =
    (activityResult.data as any[]) ?? [];
  const redemptionRows: Array<{ status: string; created_at: string }> =
    (redemptionResult.data as any[]) ?? [];

  const shares = activityRows.filter((r) => r.action === "link_shared").length;
  const clicks = activityRows.filter((r) => r.action === "link_clicked").length;
  const signups = redemptionRows.length;
  const credited = redemptionRows.filter((r) => r.status === "credited").length;
  const conversions = activityRows.filter(
    (r) => r.action === "share_converted"
  ).length;

  const stages: FunnelStage[] = [
    { label: "Shares", key: "shares", count: shares, color: "#3b82f6" },
    { label: "Clicks", key: "clicks", count: clicks, color: "#8b5cf6" },
    { label: "Sign-ups", key: "signups", count: signups, color: "#f59e0b" },
    {
      label: "Conversions",
      key: "conversions",
      count: conversions,
      color: "#22c55e",
    },
    { label: "Credited", key: "credited", count: credited, color: "#06b6d4" },
  ];

  const conversionRates: FunnelConversion[] = [];
  for (let i = 0; i < stages.length - 1; i++) {
    const from = stages[i];
    const to = stages[i + 1];
    conversionRates.push({
      from: from.label,
      to: to.label,
      rate: from.count > 0 ? (to.count / from.count) * 100 : 0,
    });
  }

  const dateMap = new Map<
    string,
    { shares: number; clicks: number; conversions: number }
  >();
  for (let d = 0; d < days; d++) {
    const dt = new Date();
    dt.setDate(dt.getDate() - (days - 1 - d));
    const key = dt.toISOString().slice(0, 10);
    dateMap.set(key, { shares: 0, clicks: 0, conversions: 0 });
  }
  for (const row of activityRows) {
    const key = row.created_at.slice(0, 10);
    const entry = dateMap.get(key);
    if (!entry) continue;
    if (row.action === "link_shared") entry.shares++;
    else if (row.action === "link_clicked") entry.clicks++;
    else if (row.action === "share_converted") entry.conversions++;
  }

  const timeSeries: DailyFunnelPoint[] = Array.from(dateMap.entries()).map(
    ([date, counts]) => ({ date, ...counts })
  );

  return {
    stages,
    conversions: conversionRates,
    timeSeries,
    totalRedemptions: signups,
    totalCredited: credited,
  };
}

function emptyFunnelData(days: number): ReferralFunnelData {
  const stages: FunnelStage[] = [
    { label: "Shares", key: "shares", count: 0, color: "#3b82f6" },
    { label: "Clicks", key: "clicks", count: 0, color: "#8b5cf6" },
    { label: "Sign-ups", key: "signups", count: 0, color: "#f59e0b" },
    { label: "Conversions", key: "conversions", count: 0, color: "#22c55e" },
    { label: "Credited", key: "credited", count: 0, color: "#06b6d4" },
  ];
  const dateMap = new Map<string, { shares: number; clicks: number; conversions: number }>();
  for (let d = 0; d < days; d++) {
    const dt = new Date();
    dt.setDate(dt.getDate() - (days - 1 - d));
    dateMap.set(dt.toISOString().slice(0, 10), { shares: 0, clicks: 0, conversions: 0 });
  }
  return {
    stages,
    conversions: stages.slice(0, -1).map((s, i) => ({ from: s.label, to: stages[i + 1].label, rate: 0 })),
    timeSeries: Array.from(dateMap.entries()).map(([date, counts]) => ({ date, ...counts })),
    totalRedemptions: 0,
    totalCredited: 0,
  };
}
