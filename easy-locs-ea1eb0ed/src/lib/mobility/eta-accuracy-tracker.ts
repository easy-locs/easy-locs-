import { db } from "@/services/db";

export interface ETAPrediction {
  id?: string;
  job_id: string | null;
  prediction_type: "booking" | "dispatch" | "live_update";
  predicted_eta_minutes: number;
  predicted_range_min: number;
  predicted_range_max: number;
  traffic_level: string;
  weather_impact: string;
  rush_hour_multiplier: number;
  confidence_score: number;
  origin_lat: number;
  origin_lng: number;
  destination_lat: number;
  destination_lng: number;
  created_at?: string;
  actual_duration_minutes?: number | null;
  accuracy_score?: number | null;
}

export interface AccuracyReport {
  totalPredictions: number;
  averageAccuracy: number;
  medianErrorMinutes: number;
  withinRangePercent: number;
  byTrafficLevel: Record<string, { count: number; avgError: number }>;
  byWeatherImpact: Record<string, { count: number; avgError: number }>;
  byHour: Record<number, { count: number; avgError: number }>;
}

export async function recordETAPrediction(prediction: Omit<ETAPrediction, "id" | "created_at">): Promise<string | null> {
  try {
    const { data, error } = await db
      .from("eta_predictions")
      .insert({
        job_id: prediction.job_id,
        prediction_type: prediction.prediction_type,
        predicted_eta_minutes: prediction.predicted_eta_minutes,
        predicted_range_min: prediction.predicted_range_min,
        predicted_range_max: prediction.predicted_range_max,
        traffic_level: prediction.traffic_level,
        weather_impact: prediction.weather_impact,
        rush_hour_multiplier: prediction.rush_hour_multiplier,
        confidence_score: prediction.confidence_score,
        origin_lat: prediction.origin_lat,
        origin_lng: prediction.origin_lng,
        destination_lat: prediction.destination_lat,
        destination_lng: prediction.destination_lng,
      })
      .select("id")
      .maybeSingle();

    if (error) {
      console.warn("[ETA_ACCURACY] Failed to record prediction:", error.message);
      return null;
    }
    return data?.id ?? null;
  } catch (e) {
    console.warn("[ETA_ACCURACY] Error recording prediction:", e);
    return null;
  }
}

export async function recordActualArrival(
  jobId: string,
  actualDurationMinutes: number,
): Promise<void> {
  try {
    const { data: predictions } = await db
      .from("eta_predictions")
      .select("id, predicted_eta_minutes, predicted_range_min, predicted_range_max")
      .eq("job_id", jobId)
      .is("actual_duration_minutes", null);

    if (!predictions?.length) return;

    for (const pred of predictions) {
      const error = Math.abs(actualDurationMinutes - pred.predicted_eta_minutes);
      const maxPossibleError = Math.max(pred.predicted_eta_minutes, actualDurationMinutes, 1);
      const accuracy = Math.max(0, 1 - error / maxPossibleError);

      await db
        .from("eta_predictions")
        .update({
          actual_duration_minutes: actualDurationMinutes,
          accuracy_score: Number(accuracy.toFixed(3)),
        })
        .eq("id", pred.id);
    }
  } catch (e) {
    console.warn("[ETA_ACCURACY] Error recording actual arrival:", e);
  }
}

export async function getAccuracyReport(daysBack: number = 7): Promise<AccuracyReport> {
  const since = new Date(Date.now() - daysBack * 24 * 3600 * 1000).toISOString();

  const report: AccuracyReport = {
    totalPredictions: 0,
    averageAccuracy: 0,
    medianErrorMinutes: 0,
    withinRangePercent: 0,
    byTrafficLevel: {},
    byWeatherImpact: {},
    byHour: {},
  };

  try {
    const { data } = await db
      .from("eta_predictions")
      .select("predicted_eta_minutes, predicted_range_min, predicted_range_max, actual_duration_minutes, accuracy_score, traffic_level, weather_impact, created_at")
      .not("actual_duration_minutes", "is", null)
      .gte("created_at", since)
      .limit(1000);

    if (!data?.length) return report;

    report.totalPredictions = data.length;

    const errors: number[] = [];
    let totalAccuracy = 0;
    let withinRange = 0;

    for (const row of data) {
      const actual = row.actual_duration_minutes!;
      const error = Math.abs(actual - row.predicted_eta_minutes);
      errors.push(error);
      totalAccuracy += row.accuracy_score ?? 0;

      if (actual >= row.predicted_range_min && actual <= row.predicted_range_max) {
        withinRange++;
      }

      const tl = row.traffic_level ?? "unknown";
      if (!report.byTrafficLevel[tl]) report.byTrafficLevel[tl] = { count: 0, avgError: 0 };
      report.byTrafficLevel[tl].count++;
      report.byTrafficLevel[tl].avgError += error;

      const wi = row.weather_impact ?? "none";
      if (!report.byWeatherImpact[wi]) report.byWeatherImpact[wi] = { count: 0, avgError: 0 };
      report.byWeatherImpact[wi].count++;
      report.byWeatherImpact[wi].avgError += error;

      if (row.created_at) {
        const hour = new Date(row.created_at).getHours();
        if (!report.byHour[hour]) report.byHour[hour] = { count: 0, avgError: 0 };
        report.byHour[hour].count++;
        report.byHour[hour].avgError += error;
      }
    }

    report.averageAccuracy = Number((totalAccuracy / data.length).toFixed(3));
    report.withinRangePercent = Number(((withinRange / data.length) * 100).toFixed(1));

    errors.sort((a, b) => a - b);
    report.medianErrorMinutes = errors[Math.floor(errors.length / 2)] ?? 0;

    for (const key of Object.keys(report.byTrafficLevel)) {
      const entry = report.byTrafficLevel[key];
      entry.avgError = Number((entry.avgError / entry.count).toFixed(1));
    }
    for (const key of Object.keys(report.byWeatherImpact)) {
      const entry = report.byWeatherImpact[key];
      entry.avgError = Number((entry.avgError / entry.count).toFixed(1));
    }
    for (const key of Object.keys(report.byHour)) {
      const entry = report.byHour[Number(key)];
      entry.avgError = Number((entry.avgError / entry.count).toFixed(1));
    }
  } catch (e) {
    console.warn("[ETA_ACCURACY] Error generating report:", e);
  }

  return report;
}

export async function getCalibratedMultipliers(): Promise<{
  weatherMultipliers: Record<string, number>;
  rushHourMultipliers: Record<number, number>;
}> {
  const defaults = {
    weatherMultipliers: { none: 1.0, rain: 1.15, storm: 1.30, fog: 1.10, heat: 1.0 } as Record<string, number>,
    rushHourMultipliers: {} as Record<number, number>,
  };

  try {
    const report = await getAccuracyReport(30);
    if (report.totalPredictions < 50) return defaults;

    for (const [weather, stats] of Object.entries(report.byWeatherImpact)) {
      if (stats.count < 10) continue;
      const avgError = stats.avgError;
      const currentMult = defaults.weatherMultipliers[weather] ?? 1.0;
      if (avgError > 3) {
        defaults.weatherMultipliers[weather] = Number((currentMult * 1.05).toFixed(2));
      } else if (avgError < 1) {
        defaults.weatherMultipliers[weather] = Number((currentMult * 0.98).toFixed(2));
      }
    }

    for (const [hourStr, stats] of Object.entries(report.byHour)) {
      if (stats.count < 10) continue;
      const hour = Number(hourStr);
      defaults.rushHourMultipliers[hour] = stats.avgError > 3 ? 1.05 : 1.0;
    }
  } catch { /* use defaults */ }

  return defaults;
}
