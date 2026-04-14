import express from "express";
import type { Request, Response, NextFunction } from "express";
import { loadConfig } from "./config.js";
import { Orchestrator } from "./orchestrator.js";
import { WebhookHandler } from "./github/webhook-handler.js";
import type { AgentRole } from "./types.js";

function requireAuth(adminToken: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const auth = req.headers.authorization;
    if (!auth || auth !== `Bearer ${adminToken}`) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    next();
  };
}

async function main(): Promise<void> {
  console.log("[orchestrator] Starting Easy-Locs Multi-Agent Orchestrator...");

  const config = loadConfig();
  const orchestrator = new Orchestrator(config);
  await orchestrator.initialize();

  const app = express();
  const authMiddleware = requireAuth(config.adminToken);

  const webhookHandler = new WebhookHandler(config.githubWebhookSecret, orchestrator.getRateLimiter());
  webhookHandler.onEvent(async (event) => {
    await orchestrator.handleWebhookEvent(event);
  });

  app.use("/webhooks/github", webhookHandler.createRouter());

  app.get("/health", (_req, res) => {
    const budget = orchestrator.getCostControls().getStatus();
    const taskCount = orchestrator.getTaskStore().size;

    res.json({
      status: "ok",
      uptime: process.uptime(),
      tasks: taskCount,
      cost: {
        dailyUsd: budget.currentDailyUsd,
        monthlyUsd: budget.currentMonthlyUsd,
        dailyLimitUsd: budget.dailyLimitUsd,
        monthlyLimitUsd: budget.monthlyLimitUsd,
      },
      rateLimits: orchestrator.getRateLimiter().getStats(),
    });
  });

  app.get("/audit", authMiddleware, (req, res) => {
    const agentId = req.query.agent as string | undefined;
    const taskId = req.query.task as string | undefined;
    const limit = parseInt(req.query.limit as string) || 50;

    const entries = orchestrator.getAuditLogger().getEntries({
      agentId: agentId as AgentRole | undefined,
      taskId,
      limit,
    });

    res.json({ entries, count: entries.length });
  });

  app.get("/tasks", authMiddleware, (_req, res) => {
    const tasks = orchestrator.getTaskStore().getAll().map((t) => ({
      id: t.id,
      issueNumber: t.githubIssueNumber,
      title: t.title,
      status: t.status,
      prNumber: t.prNumber,
      subtasks: t.subtasks.map((s) => ({
        id: s.id,
        title: s.title,
        agent: s.assignedAgent,
        status: s.status,
        result: s.result?.summary,
      })),
      createdAt: t.createdAt,
    }));

    res.json({ tasks, count: tasks.length });
  });

  app.get("/cost", authMiddleware, (_req, res) => {
    const budget = orchestrator.getCostControls().getStatus();
    const tokenSummary = orchestrator.getAuditLogger().getTokenUsageSummary();

    res.json({
      budget,
      usage: tokenSummary,
    });
  });

  app.listen(config.port, () => {
    console.log(`[orchestrator] Listening on port ${config.port}`);
    console.log(`[orchestrator] Webhook endpoint: POST /webhooks/github`);
    console.log(`[orchestrator] Health check: GET /health`);
    console.log(`[orchestrator] Audit log: GET /audit (auth required)`);
    console.log(`[orchestrator] Task queue: GET /tasks (auth required)`);
    console.log(`[orchestrator] Cost dashboard: GET /cost (auth required)`);
  });
}

main().catch((err) => {
  console.error("[orchestrator] Fatal error:", err);
  process.exit(1);
});
