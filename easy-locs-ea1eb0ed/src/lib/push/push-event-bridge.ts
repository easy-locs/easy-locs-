export function initPushEventBridge(): void {
  console.info(
    "[push-event-bridge] Push notification enqueueing is handled server-side. " +
    "Edge Functions and DB triggers enqueue push jobs directly to the job_queue table. " +
    "This client-side bridge is a no-op; retained for boot compatibility."
  );
}
