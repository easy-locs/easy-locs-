export type LambdaFunctionName =
  | "easy-locs-ai-processor"
  | "easy-locs-media-processor"
  | "easy-locs-scraper"
  | "easy-locs-analytics-aggregator";

export interface LambdaInvokeResult {
  statusCode: number;
  payload: Record<string, unknown> | null;
  functionError?: string;
}
