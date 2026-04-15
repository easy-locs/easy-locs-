import type { AwsServiceStatus } from "./aws-types";
import { db } from "@/services/db";

export type { AwsServiceStatus };

const CLOUDFRONT_DOMAIN = import.meta.env.VITE_AWS_CLOUDFRONT_DOMAIN || "";
const S3_BUCKET = import.meta.env.VITE_AWS_S3_BUCKET || "easy-locs-media";
const AWS_REGION = import.meta.env.VITE_AWS_REGION || "eu-west-1";

export const awsConfig = {
  region: AWS_REGION,
  s3Bucket: S3_BUCKET,
  cloudfrontDomain: CLOUDFRONT_DOMAIN,
  hasCloudFront: () => !!CLOUDFRONT_DOMAIN,
  isConfigured: () => !!CLOUDFRONT_DOMAIN || !!S3_BUCKET,
} as const;

export function getCloudFrontUrl(key: string): string {
  if (awsConfig.cloudfrontDomain) {
    return `https://${awsConfig.cloudfrontDomain}/${key}`;
  }
  return `https://${awsConfig.s3Bucket}.s3.${awsConfig.region}.amazonaws.com/${key}`;
}

export async function checkAwsHealth(): Promise<AwsServiceStatus> {
  try {
    const { data, error } = await db.functions.invoke("aws-health-check", {
      body: {},
    });

    if (error || !data) {
      return {
        overall: "unhealthy",
        services: {},
        timestamp: new Date().toISOString(),
        region: AWS_REGION,
      };
    }

    return data as AwsServiceStatus;
  } catch {
    return {
      overall: "not_configured",
      services: {},
      timestamp: new Date().toISOString(),
      region: AWS_REGION,
    };
  }
}
