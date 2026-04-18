import { requireRouterOrigin } from "../_shared/edge-function-consolidation.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { requireServiceRole } from "../_shared/edge-auth.ts";
import { redisLpush, redisRpop, redisLlen, isRedisAvailable } from "../_shared/redis-client.ts";
import { enqueueJobToRedis, REDIS_QUEUE_KEY } from "../_shared/redis-enqueue.ts";
import { enqueueToSqs, hasSqsCredentials } from "../_shared/aws-sqs.ts";
import type { SqsQueueName } from "../_shared/aws-sqs.ts";
import { rejectQuerySecrets } from "../_shared/reject-query-secrets.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-trace-id, x-span-id, x-parent-span-id, x-request-id, traceparent",
};

const QUEUE_HANDLERS: Record<string, string> = {
  email: "email-queue-process",
  push: "send-push-notification",
  sync: "engine-cron-server",
  pipeline: "pipeline-worker",
  "payment-webhook": "stripe-webhook",
  "ingestion-pipeline": "run-ingestion-pipeline",
  "import-pipeline": "shop-import-processor",
  notification: "send-notification-email",
  alert: "alert-dispatcher",
  backup: "backup-storage",
  "cache-refresh": "cache-manager",
  sentinel: "sentinel-server",
  delivery: "dispatch-delivery",
  ride: "dispatch-ride",
  booking: "booking-lifecycle",
  "rent-reminder": "rent-reminders",
  "ai-task": "ai-assistant",
  "media-processing": "media-processor",
  "scraping": "deliveroo-dubai-food",
  "analytics-aggregate": "sentinel-server",
};

const SQS_OFFLOAD_MAP: Record<string, SqsQueueName> = {
  "ai-task": "easy-locs-ai-tasks",
  "media-processing": "easy-locs-media-processing",
  "scraping": "easy-locs-scraping",
  "analytics-aggregate": "easy-locs-analytics",
};

const LEASE_TIMEOUT_MS = 120_000;
const POISON_THRESHOLD = 5;
const BACKOFF_BASE_MS = 5000;
const BACKOFF_MAX_MS = 300_000;
const BACKOFF_JITTER_MS = 2000;

interface RedisJob {
  id: string;
  queue_name: string;
  payload: Record<string, unknown>;
  priority: number;
  retry_count: number;
  max_retries: number;
  correlation_id: string;
  scheduled_at: string;
}

function computePayloadFingerprint(payload: Record<string, unknown>): string {
  const sorted = JSON.stringify(payload ?? {}, Object.keys(payload ?? {}).sort());
  let hash = 0;
  for (let i = 0; i < sorted.length; i++) {
    hash = ((hash << 5) - hash + sorted.charCodeAt(i)) | 0;
  }
  return `fp_${Math.abs(hash).toString(36)}`;
}

function computeStructuredBackoff(retryCount: number): number {
  const delay = Math.min(BACKOFF_BASE_MS * Math.pow(2, retryCount), BACKOFF_MAX_MS);
  return delay + Math.floor(Math.random() * BACKOFF_JITTER_MS);
}

function generateCorrelationId(): string {
  return `cor_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

async function dispatchToEdgeFunction(
  supabaseUrl: string,
  supabaseKey: string,
  job: { queue_name: string; payload?: Record<string, unknown> },
  correlationId: string,
): Promise<void> {
  const handler = QUEUE_HANDLERS[job.queue_name];

  if (!handler) {
    throw new Error(`No handler registered for queue "${job.queue_name}"`);
  }

  const resp = await fetch(`${supabaseUrl}/functions/v1/${handler}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${supabaseKey}`,
      "Content-Type": "application/json",
      "X-Correlation-Id": correlationId,
    },
    body: JSON.stringify(job.payload ?? {}),
  });

  if (!resp.ok) {
    const errText = await resp.text().catch(() => "");
    throw new Error(`Handler ${handler} returned ${resp.status}: ${errText}`);
  }
}

async function dispatchJobWithSqsFallback(
  supabaseUrl: string,
  supabaseKey: string,
  job: { id: string; queue_name: string; payload?: Record<string, unknown> },
  correlationId: string,
): Promise<"sqs" | "edge"> {
  const sqsQueue = SQS_OFFLOAD_MAP[job.queue_name];
  if (sqsQueue && hasSqsCredentials()) {
    const sqsResult = await enqueueToSqs(sqsQueue, {
      ...job.payload,
      _job_id: job.id,
      _correlation_id: correlationId,
      _queue_name: job.queue_name,
    });
    if (sqsResult.success) {
      return "sqs";
    }
    console.warn(`[job-queue] SQS offload failed for ${job.queue_name}, falling back to edge function:`, sqsResult.error);
  }
  await dispatchToEdgeFunction(supabaseUrl, supabaseKey, job, correlationId);
  return "edge";
}

Deno.serve(async (req) => {
  const __qsCheck = rejectQuerySecrets(req); if (__qsCheck.rejected) return __qsCheck.response!;
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const routerCheck = requireRouterOrigin(req);
  if (!routerCheck.allowed) return routerCheck.response!;
  const authCheck = requireServiceRole(req);
  if (!authCheck.authorized) return authCheck.response!;

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);
  const redisEnabled = isRedisAvailable();

  const startTime = Date.now();
  let processed = 0;
  let completed = 0;
  let failed = 0;
  let deduplicated = 0;
  let poisoned = 0;
  let domainPaused = 0;
  let redisJobsProcessed = 0;

  try {
    let batchSize = 50;
    try {
      const body = await req.json();
      batchSize = body?.batch_size ?? 50;
    } catch { /* GET requests have no body — expected */ }

    const stuckCutoff = new Date(Date.now() - LEASE_TIMEOUT_MS).toISOString();
    const { data: stuckJobs } = await supabase
      .from("job_queue")
      .select("id, retry_count, max_retries, queue_name, payload")
      .eq("status", "processing")
      .lt("started_at", stuckCutoff);

    for (const stuck of stuckJobs ?? []) {
      const newRetry = (stuck.retry_count ?? 0) + 1;
      if (newRetry >= (stuck.max_retries ?? 3)) {
        await supabase
          .from("job_queue")
          .update({
            status: "dead",
            error: "Lease timeout exceeded max retries",
            retry_count: newRetry,
            completed_at: new Date().toISOString(),
          })
          .eq("id", stuck.id);

        await supabase.rpc("insert_into_dlq", {
          p_source_system: `job-queue:${stuck.queue_name}`,
          p_operation_type: stuck.queue_name,
          p_payload: stuck.payload ?? {},
          p_error: "Lease timeout exceeded max retries",
        }).catch((dlqErr: unknown) => {
          console.error(`[job-queue] DLQ insert failed for stuck job ${stuck.id}:`, dlqErr);
        });

        const fingerprint = computePayloadFingerprint(stuck.payload ?? {});
        await supabase.from("queue_poison_messages").upsert({
          queue_name: stuck.queue_name,
          original_job_id: stuck.id,
          payload_hash: fingerprint,
          payload: stuck.payload ?? {},
          failure_count: newRetry,
          last_error: "Lease timeout exceeded max retries",
        }, { onConflict: "queue_name,payload_hash" }).catch(() => {});
      } else {
        const backoffMs = computeStructuredBackoff(newRetry);
        await supabase
          .from("job_queue")
          .update({
            status: "pending",
            error: "Lease timeout — requeued for retry",
            retry_count: newRetry,
            scheduled_at: new Date(Date.now() + backoffMs).toISOString(),
          })
          .eq("id", stuck.id);
      }
    }

    const { data: pausedQueues } = await supabase
      .from("queue_domain_pause")
      .select("queue_name")
      .eq("paused", true);
    const pausedQueueNames = new Set((pausedQueues ?? []).map((q: { queue_name: string }) => q.queue_name));

    if (redisEnabled) {
      const redisQueueLen = await redisLlen(REDIS_QUEUE_KEY);
      const redisBatchSize = Math.min(redisQueueLen, batchSize);
      const now = new Date();
      const deferredJobs: RedisJob[] = [];

      for (let i = 0; i < redisBatchSize; i++) {
        const redisJob = await redisRpop<RedisJob>(REDIS_QUEUE_KEY);
        if (!redisJob) break;

        if (redisJob.scheduled_at && new Date(redisJob.scheduled_at) > now) {
          deferredJobs.push(redisJob);
          continue;
        }

        if (pausedQueueNames.has(redisJob.queue_name)) {
          deferredJobs.push(redisJob);
          domainPaused++;
          continue;
        }

        const fingerprint = computePayloadFingerprint(redisJob.payload ?? {});

        const { data: isDuplicate } = await supabase.rpc("check_queue_dedup", {
          p_fingerprint: fingerprint,
          p_queue_name: redisJob.queue_name,
          p_job_id: redisJob.id,
          p_window_seconds: 300,
        }).catch(() => ({ data: false }));

        if (isDuplicate) {
          await supabase.from("job_queue").update({
            status: "completed",
            completed_at: new Date().toISOString(),
            error: "Deduplicated",
          }).eq("id", redisJob.id).catch(() => {});
          deduplicated++;
          continue;
        }

        const { data: existingPoison } = await supabase
          .from("queue_poison_messages")
          .select("failure_count")
          .eq("payload_hash", fingerprint)
          .eq("queue_name", redisJob.queue_name)
          .eq("status", "quarantined")
          .maybeSingle();

        if (existingPoison && existingPoison.failure_count >= POISON_THRESHOLD) {
          await supabase.from("job_queue").update({
            status: "dead",
            error: "Poison message detected",
            completed_at: new Date().toISOString(),
          }).eq("id", redisJob.id).catch(() => {});
          poisoned++;
          continue;
        }

        const { count: claimCount } = await supabase.from("job_queue").update({
          status: "processing",
          started_at: new Date().toISOString(),
        }, { count: "exact" }).eq("id", redisJob.id).eq("status", "pending");

        if (!claimCount || claimCount === 0) {
          continue;
        }

        processed++;
        redisJobsProcessed++;

        const jobStartTime = Date.now();

        try {
          if (redisJob.queue_name === "dlq-ingest") {
            const p = redisJob.payload ?? {};
            await supabase.rpc("insert_into_dlq", {
              p_source_system: p.source_system ?? "unknown",
              p_operation_type: p.operation_type ?? "unknown",
              p_payload: p.original_payload ?? {},
              p_error: p.error ?? "unknown",
            });
          } else {
            const dispatchResult = await dispatchJobWithSqsFallback(
              supabaseUrl, supabaseKey,
              { id: redisJob.id, queue_name: redisJob.queue_name, payload: redisJob.payload },
              redisJob.correlation_id,
            );

            if (dispatchResult === "sqs") {
              await supabase.from("job_queue").update({
                status: "offloaded_to_sqs",
                started_at: new Date().toISOString(),
                error: null,
              }).eq("id", redisJob.id);
              completed++;
              continue;
            }
          }

          const jobDuration = Date.now() - jobStartTime;

          await supabase.from("job_queue").update({
            status: "completed",
            completed_at: new Date().toISOString(),
          }).eq("id", redisJob.id);
          completed++;

          await supabase.rpc("record_db_observability", {
            p_metric_name: `queue_job_duration_${redisJob.queue_name}`,
            p_metric_value: jobDuration,
            p_metric_unit: "ms",
          }).catch(() => {});
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : String(e);
          const newRetryCount = (redisJob.retry_count ?? 0) + 1;

          if (newRetryCount >= (redisJob.max_retries ?? 3)) {
            await supabase.from("job_queue").update({
              status: "dead",
              error: msg,
              retry_count: newRetryCount,
              completed_at: new Date().toISOString(),
            }).eq("id", redisJob.id);

            await supabase.rpc("insert_into_dlq", {
              p_source_system: `job-queue:${redisJob.queue_name}`,
              p_operation_type: redisJob.queue_name,
              p_payload: redisJob.payload ?? {},
              p_error: msg,
            }).catch((dlqErr: unknown) => {
              console.error(`[job-queue] DLQ insert failed for dead job ${redisJob.id}:`, dlqErr);
            });

            await supabase.from("queue_poison_messages").upsert({
              queue_name: redisJob.queue_name,
              original_job_id: redisJob.id,
              payload_hash: fingerprint,
              payload: redisJob.payload ?? {},
              failure_count: newRetryCount,
              last_error: msg,
            }, { onConflict: "queue_name,payload_hash" }).catch(() => {});
          } else {
            const backoffJob = {
              ...redisJob,
              retry_count: newRetryCount,
              scheduled_at: new Date(Date.now() + computeStructuredBackoff(newRetryCount)).toISOString(),
            };
            await redisLpush(REDIS_QUEUE_KEY, backoffJob);

            await supabase.from("job_queue").update({
              status: "pending",
              error: msg,
              retry_count: newRetryCount,
              scheduled_at: backoffJob.scheduled_at,
            }).eq("id", redisJob.id);
          }

          failed++;
        }
      }

      for (const deferred of deferredJobs) {
        await redisLpush(REDIS_QUEUE_KEY, deferred);
      }
    }

    const remainingBatch = batchSize - redisJobsProcessed;
    if (remainingBatch > 0) {
      const { data: jobs } = await supabase
        .from("job_queue")
        .select("*")
        .eq("status", "pending")
        .lte("scheduled_at", new Date().toISOString())
        .order("priority", { ascending: false })
        .order("scheduled_at", { ascending: true })
        .limit(remainingBatch);

      for (const job of jobs ?? []) {
        const correlationId = job.correlation_id ?? generateCorrelationId();

        if (pausedQueueNames.has(job.queue_name)) {
          domainPaused++;
          continue;
        }

        const fingerprint = computePayloadFingerprint(job.payload ?? {});

        const { data: isDuplicate } = await supabase.rpc("check_queue_dedup", {
          p_fingerprint: fingerprint,
          p_queue_name: job.queue_name,
          p_job_id: job.id,
          p_window_seconds: 300,
        }).catch(() => ({ data: false }));

        if (isDuplicate) {
          await supabase
            .from("job_queue")
            .update({ status: "completed", completed_at: new Date().toISOString(), error: "Deduplicated" })
            .eq("id", job.id);
          deduplicated++;
          continue;
        }

        const { data: existingPoison } = await supabase
          .from("queue_poison_messages")
          .select("failure_count")
          .eq("payload_hash", fingerprint)
          .eq("queue_name", job.queue_name)
          .eq("status", "quarantined")
          .maybeSingle();

        if (existingPoison && existingPoison.failure_count >= POISON_THRESHOLD) {
          await supabase
            .from("job_queue")
            .update({ status: "dead", error: "Poison message detected", completed_at: new Date().toISOString() })
            .eq("id", job.id);
          poisoned++;
          continue;
        }

        const { count: dbClaimCount } = await supabase
          .from("job_queue")
          .update({ status: "processing", started_at: new Date().toISOString() }, { count: "exact" })
          .eq("id", job.id)
          .eq("status", "pending");

        if (!dbClaimCount || dbClaimCount === 0) {
          continue;
        }

        processed++;

        const jobStartTime = Date.now();

        try {
          if (job.queue_name === "dlq-ingest") {
            const p = job.payload ?? {};
            await supabase.rpc("insert_into_dlq", {
              p_source_system: p.source_system ?? "unknown",
              p_operation_type: p.operation_type ?? "unknown",
              p_payload: p.original_payload ?? {},
              p_error: p.error ?? "unknown",
            });
          } else {
            const dispatchResult = await dispatchJobWithSqsFallback(
              supabaseUrl, supabaseKey,
              { id: job.id, queue_name: job.queue_name, payload: job.payload },
              correlationId,
            );

            if (dispatchResult === "sqs") {
              await supabase
                .from("job_queue")
                .update({
                  status: "offloaded_to_sqs",
                  started_at: new Date().toISOString(),
                  error: null,
                })
                .eq("id", job.id);
              completed++;
              continue;
            }
          }

          const jobDuration = Date.now() - jobStartTime;

          await supabase
            .from("job_queue")
            .update({ status: "completed", completed_at: new Date().toISOString() })
            .eq("id", job.id);
          completed++;

          await supabase.rpc("record_db_observability", {
            p_metric_name: `queue_job_duration_${job.queue_name}`,
            p_metric_value: jobDuration,
            p_metric_unit: "ms",
          }).catch(() => {});
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : String(e);
          const newRetryCount = (job.retry_count ?? 0) + 1;

          if (newRetryCount >= (job.max_retries ?? 3)) {
            await supabase
              .from("job_queue")
              .update({
                status: "dead",
                error: msg,
                retry_count: newRetryCount,
                completed_at: new Date().toISOString(),
              })
              .eq("id", job.id);

            await supabase.rpc("insert_into_dlq", {
              p_source_system: `job-queue:${job.queue_name}`,
              p_operation_type: job.queue_name,
              p_payload: job.payload ?? {},
              p_error: msg,
            }).catch((dlqErr: unknown) => {
              console.error(`[job-queue] DLQ insert failed for dead job ${job.id}:`, dlqErr);
            });

            await supabase.from("queue_poison_messages").upsert({
              queue_name: job.queue_name,
              original_job_id: job.id,
              payload_hash: fingerprint,
              payload: job.payload ?? {},
              failure_count: newRetryCount,
              last_error: msg,
            }, { onConflict: "queue_name,payload_hash" }).catch(() => {});
          } else {
            const backoffMs = computeStructuredBackoff(newRetryCount);

            if (redisEnabled) {
              await enqueueJobToRedis({
                id: job.id,
                queue_name: job.queue_name,
                payload: job.payload ?? {},
                priority: job.priority ?? 0,
                retry_count: newRetryCount,
                max_retries: job.max_retries ?? 3,
                correlation_id: correlationId,
                scheduled_at: new Date(Date.now() + backoffMs).toISOString(),
              });
            }

            await supabase
              .from("job_queue")
              .update({
                status: "pending",
                error: msg,
                retry_count: newRetryCount,
                scheduled_at: new Date(Date.now() + backoffMs).toISOString(),
              })
              .eq("id", job.id);
          }

          failed++;
        }
      }
    }

    await supabase
      .from("job_queue")
      .delete()
      .eq("status", "completed")
      .lt("completed_at", new Date(Date.now() - 86400000).toISOString());

    await supabase.rpc("update_autonomy_status", {
      p_system_name: "job_queue",
      p_status: failed === 0 ? "green" : failed < completed ? "yellow" : "red",
      p_error_message: failed > 0 ? `${failed} jobs failed` : null,
    }).catch((e: unknown) => {
      console.error("[job-queue] autonomy status update failed:", e);
    });

    const { count: queueDepth } = await supabase
      .from("job_queue")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending");

    const redisQueueDepth = redisEnabled ? await redisLlen(REDIS_QUEUE_KEY) : 0;

    await supabase.rpc("record_db_observability", {
      p_metric_name: "queue_depth",
      p_metric_value: (queueDepth ?? 0) + redisQueueDepth,
      p_metric_unit: "count",
      p_threshold_warn: 500,
      p_threshold_crit: 1000,
    }).catch(() => {});

    return new Response(
      JSON.stringify({
        processed,
        completed,
        failed,
        deduplicated,
        poisoned,
        domain_paused: domainPaused,
        stuck_requeued: stuckJobs?.length ?? 0,
        redis_jobs: redisJobsProcessed,
        redis_queue_depth: redisQueueDepth,
        queue_depth: (queueDepth ?? 0) + redisQueueDepth,
        total_ms: Date.now() - startTime,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return new Response(
      JSON.stringify({ error: msg }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
