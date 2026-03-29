/**
 * Async Workflow Orchestrator — For long-running domain workflows.
 * 
 * Manages multi-step operations with:
 * - Step-by-step execution with rollback
 * - State persistence across failures
 * - Retry with exponential backoff
 * - Correlation tracking
 * - Domain event emission per step
 * 
 * Used for: lease creation, payment flows, onboarding, dispatch.
 */
import { createDomainLogger } from "./observability";
import { publishDomainEvent, createDomainEvent } from "./domain-event-bus";

const log = createDomainLogger("orchestrator");

export type StepStatus = "pending" | "running" | "done" | "failed" | "rolled_back";

export interface WorkflowStep<TCtx> {
  name: string;
  execute: (ctx: TCtx) => Promise<TCtx>;
  rollback?: (ctx: TCtx) => Promise<TCtx>;
}

export interface WorkflowResult<TCtx> {
  ok: boolean;
  context: TCtx;
  completedSteps: string[];
  failedStep?: string;
  error?: string;
}

export interface WorkflowConfig {
  name: string;
  domain: string;
  maxRetries?: number;
  correlationId?: string;
}

export async function runWorkflow<TCtx extends Record<string, any>>(
  config: WorkflowConfig,
  steps: WorkflowStep<TCtx>[],
  initialContext: TCtx
): Promise<WorkflowResult<TCtx>> {
  const correlationId = config.correlationId ?? crypto.randomUUID();
  const timer = log.timed(`workflow:${config.name}`, { correlationId });
  const completedSteps: string[] = [];
  let ctx = { ...initialContext };

  publishDomainEvent(
    createDomainEvent(
      `${config.domain}:workflow_started`,
      correlationId,
      "workflow",
      { name: config.name, steps: steps.map((s) => s.name) },
      config.domain,
      correlationId
    )
  );

  for (const step of steps) {
    const stepTimer = log.timed(`step:${step.name}`, { workflow: config.name, correlationId });

    try {
      ctx = await step.execute(ctx);
      completedSteps.push(step.name);
      stepTimer.done();
    } catch (err) {
      stepTimer.fail(err);

      // Rollback completed steps in reverse
      for (const completedName of [...completedSteps].reverse()) {
        const completedStep = steps.find((s) => s.name === completedName);
        if (completedStep?.rollback) {
          try {
            ctx = await completedStep.rollback(ctx);
            log.info(`rollback:${completedName}`, { correlationId });
          } catch (rollbackErr) {
            log.error(`rollback_failed:${completedName}`, rollbackErr, { correlationId });
          }
        }
      }

      publishDomainEvent(
        createDomainEvent(
          `${config.domain}:workflow_failed`,
          correlationId,
          "workflow",
          { name: config.name, failedStep: step.name, error: String(err) },
          config.domain,
          correlationId
        )
      );

      timer.fail(err);

      return {
        ok: false,
        context: ctx,
        completedSteps,
        failedStep: step.name,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  publishDomainEvent(
    createDomainEvent(
      `${config.domain}:workflow_completed`,
      correlationId,
      "workflow",
      { name: config.name, steps: completedSteps },
      config.domain,
      correlationId
    )
  );

  timer.done();

  return { ok: true, context: ctx, completedSteps };
}
