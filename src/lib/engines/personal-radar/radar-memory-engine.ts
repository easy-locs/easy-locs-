/**
 * Radar Memory Engine — Remembers user patterns across sessions.
 * Provides insights like "you usually look for coffee at this time".
 */
import { supabase } from "@/integrations/supabase/client";

export interface RadarMemoryInsight {
  type: "habit" | "preference" | "pattern";
  message: string;
  confidence: number;
  category?: string;
}

/** Analyze past radar sessions to find patterns */
export async function getRadarInsights(userId: string): Promise<RadarMemoryInsight[]> {
  const insights: RadarMemoryInsight[] = [];

  const since = new Date(Date.now() - 60 * 86400000).toISOString();
  const { data: events } = await supabase
    .from("user_radar_events")
    .select("event_type, category, created_at")
    .eq("user_id", userId)
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(200);

  if (!events?.length) return insights;

  // Analyze time-of-day patterns
  const hourCats: Record<number, Record<string, number>> = {};
  for (const e of events as any[]) {
    const hour = new Date(e.created_at).getHours();
    const bucket = Math.floor(hour / 3); // 0-7 (3h buckets)
    if (!hourCats[bucket]) hourCats[bucket] = {};
    if (e.category) {
      hourCats[bucket][e.category] = (hourCats[bucket][e.category] || 0) + 1;
    }
  }

  const currentBucket = Math.floor(new Date().getHours() / 3);
  const currentPattern = hourCats[currentBucket];
  if (currentPattern) {
    const top = Object.entries(currentPattern).sort((a, b) => b[1] - a[1])[0];
    if (top && top[1] >= 3) {
      const timeLabel = getTimeBucketLabel(currentBucket);
      insights.push({
        type: "habit",
        message: `You usually look for ${top[0]} ${timeLabel}`,
        confidence: Math.min(90, 50 + top[1] * 5),
        category: top[0],
      });
    }
  }

  // Most visited category overall
  const catTotal: Record<string, number> = {};
  for (const e of events as any[]) {
    if (e.category) catTotal[e.category] = (catTotal[e.category] || 0) + 1;
  }
  const topCat = Object.entries(catTotal).sort((a, b) => b[1] - a[1])[0];
  if (topCat && topCat[1] >= 5) {
    insights.push({
      type: "preference",
      message: `${topCat[0]} is your top interest (${topCat[1]} interactions)`,
      confidence: 80,
      category: topCat[0],
    });
  }

  return insights;
}

function getTimeBucketLabel(bucket: number): string {
  const labels: Record<number, string> = {
    0: "late at night",
    1: "in the early morning",
    2: "in the morning",
    3: "around lunch",
    4: "in the afternoon",
    5: "in the evening",
    6: "at night",
    7: "late at night",
  };
  return labels[bucket] || "at this time";
}
