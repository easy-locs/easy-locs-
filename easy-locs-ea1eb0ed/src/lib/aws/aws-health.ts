import { db } from "@/services/db";

export interface AwsHealthReport {
  timestamp: string;
  region: string;
  overall: string;
  services: Record<string, { configured: boolean; reachable: boolean | null; latencyMs: number | null }>;
}

export async function getAwsHealthReport(): Promise<AwsHealthReport> {
  try {
    const { data, error } = await db.functions.invoke("aws-health-check", {});

    if (error) {
      return {
        timestamp: new Date().toISOString(),
        region: "unknown",
        overall: "unavailable",
        services: {},
      };
    }

    return data as AwsHealthReport;
  } catch {
    return {
      timestamp: new Date().toISOString(),
      region: "unknown",
      overall: "unavailable",
      services: {},
    };
  }
}
