export interface AwsServiceDetail {
  configured: boolean;
  reachable: boolean | null;
  latencyMs: number | null;
  error?: string;
}

export interface AwsServiceStatus {
  overall: "healthy" | "degraded" | "unhealthy" | "not_configured";
  services: Partial<Record<"s3" | "cloudfront" | "ses" | "sqs" | "lambda", AwsServiceDetail>>;
  timestamp: string;
  region: string;
}
