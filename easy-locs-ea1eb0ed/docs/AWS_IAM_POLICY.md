# AWS IAM Policy — Easy-Locs Integration

## Required Environment Variables

### Server-Side (Supabase Edge Function secrets — never exposed to client)
| Variable | Description |
|---|---|
| `AWS_ACCESS_KEY_ID` | IAM access key |
| `AWS_SECRET_ACCESS_KEY` | IAM secret key |
| `AWS_REGION` | AWS region (default: `eu-west-1`) |
| `AWS_ACCOUNT_ID` | AWS Account ID (for SQS URLs) |
| `AWS_S3_BUCKET` | S3 bucket name |
| `AWS_CLOUDFRONT_DOMAIN` | CloudFront distribution domain |

### Client-Side (Vite env — public, no secrets)
| Variable | Description |
|---|---|
| `VITE_AWS_REGION` | AWS region (for URL construction only) |
| `VITE_AWS_S3_BUCKET` | S3 bucket name (for URL construction only) |
| `VITE_AWS_CLOUDFRONT_DOMAIN` | CloudFront domain (for URL construction only) |

**IMPORTANT**: AWS credentials (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`) must NEVER be prefixed with `VITE_`. All AWS API operations are proxied through Supabase Edge Functions to keep secrets server-side only.

## Least-Privilege IAM Policy

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "S3MediaBucket",
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject",
        "s3:HeadObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::easy-locs-media",
        "arn:aws:s3:::easy-locs-media/*"
      ]
    },
    {
      "Sid": "SESEmail",
      "Effect": "Allow",
      "Action": [
        "ses:SendEmail",
        "ses:SendRawEmail",
        "sesv2:SendEmail",
        "ses:GetAccount"
      ],
      "Resource": "*",
      "Condition": {
        "StringEquals": {
          "ses:FromAddress": "noreply@easy-locs.com"
        }
      }
    },
    {
      "Sid": "SQSQueues",
      "Effect": "Allow",
      "Action": [
        "sqs:SendMessage",
        "sqs:ReceiveMessage",
        "sqs:DeleteMessage",
        "sqs:GetQueueAttributes",
        "sqs:ListQueues"
      ],
      "Resource": "arn:aws:sqs:*:*:easy-locs-*"
    },
    {
      "Sid": "LambdaFunctions",
      "Effect": "Allow",
      "Action": [
        "lambda:InvokeFunction",
        "lambda:ListFunctions"
      ],
      "Resource": "arn:aws:lambda:*:*:function:easy-locs-*"
    },
    {
      "Sid": "CloudWatchRead",
      "Effect": "Allow",
      "Action": [
        "cloudwatch:GetMetricData",
        "cloudwatch:DescribeAlarms",
        "cloudwatch:ListMetrics"
      ],
      "Resource": "*"
    }
  ]
}
```

## S3 Bucket CORS Configuration

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "PUT", "POST", "DELETE", "HEAD"],
    "AllowedOrigins": ["https://easy-locs.com", "https://*.easy-locs.com", "https://*.replit.dev"],
    "ExposeHeaders": ["ETag", "x-amz-request-id"],
    "MaxAgeSeconds": 3600
  }
]
```

## S3 Lifecycle Policy

```json
{
  "Rules": [
    {
      "ID": "TransitionToIA",
      "Status": "Enabled",
      "Filter": { "Prefix": "lease-documents/" },
      "Transitions": [{ "Days": 90, "StorageClass": "STANDARD_IA" }]
    },
    {
      "ID": "DeleteTempUploads",
      "Status": "Enabled",
      "Filter": { "Prefix": "temp/" },
      "Expiration": { "Days": 7 }
    }
  ]
}
```

## SQS Queues to Create

| Queue Name | DLQ | Visibility Timeout | Retention |
|---|---|---|---|
| `easy-locs-ai-tasks` | `easy-locs-dlq` | 300s | 7 days |
| `easy-locs-media-processing` | `easy-locs-dlq` | 120s | 7 days |
| `easy-locs-scraping` | `easy-locs-dlq` | 300s | 7 days |
| `easy-locs-analytics` | `easy-locs-dlq` | 60s | 3 days |
| `easy-locs-email` | `easy-locs-dlq` | 30s | 3 days |
| `easy-locs-dlq` | — | 300s | 14 days |

## Lambda Functions to Create

| Function Name | Runtime | Timeout | Memory | Trigger |
|---|---|---|---|---|
| `easy-locs-ai-processor` | Node.js 20.x | 300s | 512MB | SQS: `easy-locs-ai-tasks` |
| `easy-locs-media-processor` | Node.js 20.x | 120s | 1024MB | SQS: `easy-locs-media-processing` |
| `easy-locs-scraper` | Node.js 20.x | 300s | 512MB | SQS: `easy-locs-scraping` |
| `easy-locs-analytics-aggregator` | Node.js 20.x | 60s | 256MB | SQS: `easy-locs-analytics` |

## SES Domain Verification

1. Add TXT record for domain verification: `_amazonses.easy-locs.com`
2. Add DKIM CNAME records (3 records provided by SES)
3. Add SPF record: `v=spf1 include:amazonses.com ~all`
4. Add DMARC record: `v=DMARC1; p=quarantine; rua=mailto:dmarc@easy-locs.com`

## CloudFront Distribution

- Origin: `easy-locs-media.s3.eu-west-1.amazonaws.com`
- Price Class: PriceClass_All (global edge)
- Cache Policy: CachingOptimized (managed)
- Viewer Protocol: HTTPS only
- Compress: Yes (Gzip + Brotli)
- Default TTL: 86400 (24h)
- Max TTL: 31536000 (1 year)
