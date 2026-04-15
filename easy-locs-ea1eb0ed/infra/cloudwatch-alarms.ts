import {
  CloudWatchClient,
  PutMetricAlarmCommand,
  type PutMetricAlarmCommandInput,
} from "@aws-sdk/client-cloudwatch";

const REGION = process.env.AWS_REGION || "eu-west-1";
const SNS_ALARM_TOPIC = process.env.AWS_SNS_ALARM_TOPIC_ARN || "";

const LAMBDA_FUNCTION_NAMES = [
  "easy-locs-ai-processor",
  "easy-locs-media-processor",
  "easy-locs-scraper",
  "easy-locs-analytics-aggregator",
];

const SQS_QUEUE_NAMES = [
  "easy-locs-ai-tasks",
  "easy-locs-media-processing",
  "easy-locs-scraping",
  "easy-locs-analytics",
];

const DLQ_NAME = "easy-locs-dlq";

function alarmActions(): string[] {
  return SNS_ALARM_TOPIC ? [SNS_ALARM_TOPIC] : [];
}

function lambdaErrorAlarm(functionName: string): PutMetricAlarmCommandInput {
  return {
    AlarmName: `${functionName}-errors`,
    AlarmDescription: `Lambda ${functionName} error rate exceeded threshold`,
    MetricName: "Errors",
    Namespace: "AWS/Lambda",
    Statistic: "Sum",
    Period: 300,
    EvaluationPeriods: 2,
    Threshold: 5,
    ComparisonOperator: "GreaterThanThreshold",
    Dimensions: [{ Name: "FunctionName", Value: functionName }],
    AlarmActions: alarmActions(),
    TreatMissingData: "notBreaching",
  };
}

function lambdaDurationAlarm(functionName: string): PutMetricAlarmCommandInput {
  return {
    AlarmName: `${functionName}-duration-p99`,
    AlarmDescription: `Lambda ${functionName} p99 duration exceeded 60s`,
    MetricName: "Duration",
    Namespace: "AWS/Lambda",
    ExtendedStatistic: "p99",
    Period: 300,
    EvaluationPeriods: 2,
    Threshold: 60_000,
    ComparisonOperator: "GreaterThanThreshold",
    Dimensions: [{ Name: "FunctionName", Value: functionName }],
    AlarmActions: alarmActions(),
    TreatMissingData: "notBreaching",
  };
}

function sqsQueueDepthAlarm(queueName: string): PutMetricAlarmCommandInput {
  return {
    AlarmName: `${queueName}-queue-depth`,
    AlarmDescription: `SQS ${queueName} queue depth exceeded 1000 messages`,
    MetricName: "ApproximateNumberOfMessagesVisible",
    Namespace: "AWS/SQS",
    Statistic: "Maximum",
    Period: 300,
    EvaluationPeriods: 2,
    Threshold: 1000,
    ComparisonOperator: "GreaterThanThreshold",
    Dimensions: [{ Name: "QueueName", Value: queueName }],
    AlarmActions: alarmActions(),
    TreatMissingData: "notBreaching",
  };
}

function sqsMessageAgeAlarm(queueName: string): PutMetricAlarmCommandInput {
  return {
    AlarmName: `${queueName}-message-age`,
    AlarmDescription: `SQS ${queueName} oldest message age exceeded 15 minutes`,
    MetricName: "ApproximateAgeOfOldestMessage",
    Namespace: "AWS/SQS",
    Statistic: "Maximum",
    Period: 300,
    EvaluationPeriods: 2,
    Threshold: 900,
    ComparisonOperator: "GreaterThanThreshold",
    Dimensions: [{ Name: "QueueName", Value: queueName }],
    AlarmActions: alarmActions(),
    TreatMissingData: "notBreaching",
  };
}

function dlqDepthAlarm(): PutMetricAlarmCommandInput {
  return {
    AlarmName: `${DLQ_NAME}-depth`,
    AlarmDescription: `Shared DLQ ${DLQ_NAME} has visible messages`,
    MetricName: "ApproximateNumberOfMessagesVisible",
    Namespace: "AWS/SQS",
    Statistic: "Sum",
    Period: 300,
    EvaluationPeriods: 1,
    Threshold: 0,
    ComparisonOperator: "GreaterThanThreshold",
    Dimensions: [{ Name: "QueueName", Value: DLQ_NAME }],
    AlarmActions: alarmActions(),
    TreatMissingData: "notBreaching",
  };
}

function sesBounceRateAlarm(): PutMetricAlarmCommandInput {
  return {
    AlarmName: "easy-locs-ses-bounce-rate",
    AlarmDescription: "SES bounce rate exceeded 5%",
    MetricName: "Reputation.BounceRate",
    Namespace: "AWS/SES",
    Statistic: "Average",
    Period: 3600,
    EvaluationPeriods: 1,
    Threshold: 0.05,
    ComparisonOperator: "GreaterThanThreshold",
    AlarmActions: alarmActions(),
    TreatMissingData: "notBreaching",
  };
}

function sesComplaintRateAlarm(): PutMetricAlarmCommandInput {
  return {
    AlarmName: "easy-locs-ses-complaint-rate",
    AlarmDescription: "SES complaint rate exceeded 0.1%",
    MetricName: "Reputation.ComplaintRate",
    Namespace: "AWS/SES",
    Statistic: "Average",
    Period: 3600,
    EvaluationPeriods: 1,
    Threshold: 0.001,
    ComparisonOperator: "GreaterThanThreshold",
    AlarmActions: alarmActions(),
    TreatMissingData: "notBreaching",
  };
}

function s3ErrorAlarm(): PutMetricAlarmCommandInput {
  const bucket = process.env.AWS_S3_BUCKET || "easy-locs-media";
  return {
    AlarmName: "easy-locs-s3-5xx-errors",
    AlarmDescription: "S3 bucket returning 5xx errors",
    MetricName: "5xxErrors",
    Namespace: "AWS/S3",
    Statistic: "Sum",
    Period: 300,
    EvaluationPeriods: 2,
    Threshold: 10,
    ComparisonOperator: "GreaterThanThreshold",
    Dimensions: [
      { Name: "BucketName", Value: bucket },
      { Name: "FilterId", Value: "EntireBucket" },
    ],
    AlarmActions: alarmActions(),
    TreatMissingData: "notBreaching",
  };
}

function s3BucketSizeAlarm(): PutMetricAlarmCommandInput {
  const bucket = process.env.AWS_S3_BUCKET || "easy-locs-media";
  return {
    AlarmName: "easy-locs-s3-bucket-size",
    AlarmDescription: "S3 bucket size exceeded 50GB",
    MetricName: "BucketSizeBytes",
    Namespace: "AWS/S3",
    Statistic: "Average",
    Period: 86400,
    EvaluationPeriods: 1,
    Threshold: 50 * 1024 * 1024 * 1024,
    ComparisonOperator: "GreaterThanThreshold",
    Dimensions: [
      { Name: "BucketName", Value: bucket },
      { Name: "StorageType", Value: "StandardStorage" },
    ],
    AlarmActions: alarmActions(),
    TreatMissingData: "notBreaching",
  };
}

function s3RequestRateAlarm(): PutMetricAlarmCommandInput {
  const bucket = process.env.AWS_S3_BUCKET || "easy-locs-media";
  return {
    AlarmName: "easy-locs-s3-request-rate",
    AlarmDescription: "S3 bucket request rate exceeded 10000/5min",
    MetricName: "AllRequests",
    Namespace: "AWS/S3",
    Statistic: "Sum",
    Period: 300,
    EvaluationPeriods: 2,
    Threshold: 10000,
    ComparisonOperator: "GreaterThanThreshold",
    Dimensions: [
      { Name: "BucketName", Value: bucket },
      { Name: "FilterId", Value: "EntireBucket" },
    ],
    AlarmActions: alarmActions(),
    TreatMissingData: "notBreaching",
  };
}

export async function provisionAlarms(): Promise<{ created: string[]; failed: string[] }> {
  const client = new CloudWatchClient({ region: REGION });
  const created: string[] = [];
  const failed: string[] = [];

  const alarmConfigs: PutMetricAlarmCommandInput[] = [
    ...LAMBDA_FUNCTION_NAMES.flatMap((fn) => [
      lambdaErrorAlarm(fn),
      lambdaDurationAlarm(fn),
    ]),
    ...SQS_QUEUE_NAMES.flatMap((q) => [
      sqsQueueDepthAlarm(q),
      sqsMessageAgeAlarm(q),
    ]),
    dlqDepthAlarm(),
    sesBounceRateAlarm(),
    sesComplaintRateAlarm(),
    s3ErrorAlarm(),
    s3BucketSizeAlarm(),
    s3RequestRateAlarm(),
  ];

  for (const config of alarmConfigs) {
    try {
      await client.send(new PutMetricAlarmCommand(config));
      created.push(config.AlarmName || "unknown");
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`Failed to create alarm ${config.AlarmName}:`, msg);
      failed.push(`${config.AlarmName}: ${msg}`);
    }
  }

  return { created, failed };
}

if (require.main === module) {
  provisionAlarms().then(({ created, failed }) => {
    console.log(`Created ${created.length} alarms:`);
    created.forEach((a) => console.log(`  + ${a}`));
    if (failed.length > 0) {
      console.error(`Failed ${failed.length} alarms:`);
      failed.forEach((f) => console.error(`  x ${f}`));
      process.exit(1);
    }
  });
}
