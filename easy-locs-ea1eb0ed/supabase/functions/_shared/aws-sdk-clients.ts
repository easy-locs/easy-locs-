import { S3Client, PutObjectCommand, DeleteObjectCommand, HeadObjectCommand, GetObjectCommand } from "npm:@aws-sdk/client-s3@3.650.0";
import { getSignedUrl } from "npm:@aws-sdk/s3-request-presigner@3.650.0";
import { SESv2Client, SendEmailCommand } from "npm:@aws-sdk/client-sesv2@3.650.0";
import { SQSClient, SendMessageCommand, GetQueueUrlCommand } from "npm:@aws-sdk/client-sqs@3.650.0";
import { LambdaClient, InvokeCommand } from "npm:@aws-sdk/client-lambda@3.650.0";

const AWS_REGION = Deno.env.get("AWS_REGION") || "eu-west-1";
const AWS_ACCESS_KEY_ID = Deno.env.get("AWS_ACCESS_KEY_ID") || "";
const AWS_SECRET_ACCESS_KEY = Deno.env.get("AWS_SECRET_ACCESS_KEY") || "";
const AWS_S3_BUCKET = Deno.env.get("AWS_S3_BUCKET") || "easy-locs-media";

const credentials = AWS_ACCESS_KEY_ID && AWS_SECRET_ACCESS_KEY
  ? { accessKeyId: AWS_ACCESS_KEY_ID, secretAccessKey: AWS_SECRET_ACCESS_KEY }
  : undefined;

let _s3Client: S3Client | null = null;
let _sesClient: SESv2Client | null = null;
let _sqsClient: SQSClient | null = null;
let _lambdaClient: LambdaClient | null = null;

export function getS3Client(): S3Client {
  if (!_s3Client) {
    if (!credentials) throw new Error("AWS credentials not configured");
    _s3Client = new S3Client({ region: AWS_REGION, credentials });
  }
  return _s3Client;
}

export function getSESClient(): SESv2Client {
  if (!_sesClient) {
    if (!credentials) throw new Error("AWS credentials not configured");
    _sesClient = new SESv2Client({ region: AWS_REGION, credentials });
  }
  return _sesClient;
}

export function getSQSClient(): SQSClient {
  if (!_sqsClient) {
    if (!credentials) throw new Error("AWS credentials not configured");
    _sqsClient = new SQSClient({ region: AWS_REGION, credentials });
  }
  return _sqsClient;
}

export function getLambdaClient(): LambdaClient {
  if (!_lambdaClient) {
    if (!credentials) throw new Error("AWS credentials not configured");
    _lambdaClient = new LambdaClient({ region: AWS_REGION, credentials });
  }
  return _lambdaClient;
}

export function hasAwsCredentials(): boolean {
  return !!(AWS_ACCESS_KEY_ID && AWS_SECRET_ACCESS_KEY);
}

export async function s3PutPresignedUrl(key: string, contentType: string, expiresIn = 300): Promise<string> {
  const client = getS3Client();
  const command = new PutObjectCommand({
    Bucket: AWS_S3_BUCKET,
    Key: key,
    ContentType: contentType,
  });
  return getSignedUrl(client, command, { expiresIn });
}

export async function s3GetPresignedUrl(key: string, expiresIn = 3600): Promise<string> {
  const client = getS3Client();
  const command = new GetObjectCommand({
    Bucket: AWS_S3_BUCKET,
    Key: key,
  });
  return getSignedUrl(client, command, { expiresIn });
}

export async function s3DeleteObject(key: string): Promise<void> {
  const client = getS3Client();
  await client.send(new DeleteObjectCommand({
    Bucket: AWS_S3_BUCKET,
    Key: key,
  }));
}

export async function s3HeadObject(key: string): Promise<{ exists: boolean; contentType?: string; contentLength?: number }> {
  const client = getS3Client();
  try {
    const result = await client.send(new HeadObjectCommand({
      Bucket: AWS_S3_BUCKET,
      Key: key,
    }));
    return {
      exists: true,
      contentType: result.ContentType,
      contentLength: result.ContentLength,
    };
  } catch (e: unknown) {
    const err = e as { name?: string; $metadata?: { httpStatusCode?: number } };
    if (err.name === "NotFound" || err.$metadata?.httpStatusCode === 404) {
      return { exists: false };
    }
    throw e;
  }
}

export async function sqsSendMessage(queueUrl: string, body: Record<string, unknown>, delaySeconds = 0): Promise<string | undefined> {
  const client = getSQSClient();
  const result = await client.send(new SendMessageCommand({
    QueueUrl: queueUrl,
    MessageBody: JSON.stringify(body),
    DelaySeconds: delaySeconds,
  }));
  return result.MessageId;
}

export async function lambdaInvoke(functionName: string, payload: Record<string, unknown>, async_ = true): Promise<{ statusCode: number; payload: Record<string, unknown> | null; functionError?: string }> {
  const client = getLambdaClient();
  const result = await client.send(new InvokeCommand({
    FunctionName: functionName,
    InvocationType: async_ ? "Event" : "RequestResponse",
    Payload: new TextEncoder().encode(JSON.stringify(payload)),
  }));

  let responsePayload = null;
  if (result.Payload) {
    const text = new TextDecoder().decode(result.Payload);
    try {
      responsePayload = JSON.parse(text);
    } catch {
      responsePayload = { raw: text };
    }
  }

  return {
    statusCode: result.StatusCode ?? 0,
    payload: responsePayload,
    functionError: result.FunctionError,
  };
}

export {
  S3Client, PutObjectCommand, DeleteObjectCommand, HeadObjectCommand, GetObjectCommand,
  SESv2Client, SendEmailCommand,
  SQSClient, SendMessageCommand, GetQueueUrlCommand,
  LambdaClient, InvokeCommand,
  getSignedUrl,
};
