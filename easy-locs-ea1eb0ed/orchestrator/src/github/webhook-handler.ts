import express from "express";
import crypto from "node:crypto";
import type { WebhookEvent } from "../types.js";
import type { RateLimiter } from "../rate-limiter.js";

type WebhookCallback = (event: WebhookEvent) => Promise<void>;

const ALLOWED_COMMAND_USERS = new Set(
  (process.env["ORCHESTRATOR_ADMINS"] ?? "").split(",").filter(Boolean)
);

export class WebhookHandler {
  private secret: string;
  private callbacks: WebhookCallback[] = [];
  private processedDeliveries = new Set<string>();
  private readonly MAX_DELIVERY_CACHE = 1000;
  private rateLimiter?: RateLimiter;

  constructor(secret: string, rateLimiter?: RateLimiter) {
    this.secret = secret;
    this.rateLimiter = rateLimiter;
  }

  onEvent(callback: WebhookCallback): void {
    this.callbacks.push(callback);
  }

  createRouter(): express.Router {
    const router = express.Router();

    router.post(
      "/",
      express.raw({ type: "application/json", limit: "10mb" }),
      async (req, res) => {
        const signature = req.headers["x-hub-signature-256"] as string | undefined;
        const eventType = req.headers["x-github-event"] as string | undefined;
        const deliveryId = req.headers["x-github-delivery"] as string | undefined;

        if (!signature || !eventType) {
          res.status(400).json({ error: "Missing required headers" });
          return;
        }

        if (deliveryId && this.processedDeliveries.has(deliveryId)) {
          res.status(200).json({ status: "duplicate" });
          return;
        }

        if (this.rateLimiter) {
          const source = (req.headers["x-forwarded-for"] as string) ?? req.ip ?? "unknown";
          const rateCheck = this.rateLimiter.checkWebhook(source);
          if (!rateCheck.allowed) {
            res.status(429).json({
              error: "Rate limit exceeded",
              retryAfterMs: rateCheck.retryAfterMs,
            });
            return;
          }
        }

        const rawBody = req.body as Buffer;
        if (!this.verifySignature(rawBody, signature)) {
          res.status(401).json({ error: "Invalid signature" });
          return;
        }

        if (deliveryId) {
          this.processedDeliveries.add(deliveryId);
          if (this.processedDeliveries.size > this.MAX_DELIVERY_CACHE) {
            const first = this.processedDeliveries.values().next().value;
            if (first) this.processedDeliveries.delete(first);
          }
        }

        let payload: Record<string, unknown>;
        try {
          payload = JSON.parse(rawBody.toString("utf-8"));
        } catch {
          res.status(400).json({ error: "Invalid JSON body" });
          return;
        }

        const webhookEvent = this.parseEvent(eventType, payload);
        if (!webhookEvent) {
          res.status(200).json({ status: "ignored" });
          return;
        }

        res.status(202).json({ status: "accepted" });

        for (const cb of this.callbacks) {
          try {
            await cb(webhookEvent);
          } catch (err) {
            console.error("[webhook] Callback error:", err);
          }
        }
      }
    );

    return router;
  }

  private verifySignature(rawBody: Buffer, signature: string): boolean {
    try {
      const expected =
        "sha256=" +
        crypto.createHmac("sha256", this.secret).update(rawBody).digest("hex");

      const sigBuffer = Buffer.from(signature);
      const expectedBuffer = Buffer.from(expected);

      if (sigBuffer.length !== expectedBuffer.length) {
        return false;
      }

      return crypto.timingSafeEqual(sigBuffer, expectedBuffer);
    } catch {
      return false;
    }
  }

  private parseEvent(
    eventType: string,
    payload: Record<string, unknown>
  ): WebhookEvent | null {
    const action = payload.action as string | undefined;
    const repo =
      ((payload.repository as Record<string, unknown>)?.full_name as string) ??
      "unknown";
    const sender =
      ((payload.sender as Record<string, unknown>)?.login as string) ??
      "unknown";
    const timestamp = new Date().toISOString();

    if (eventType === "issues" && action === "opened") {
      return { type: "issue_opened", payload, repo, sender, timestamp };
    }

    if (eventType === "issue_comment" && action === "created") {
      const body =
        (payload.comment as Record<string, unknown>)?.body as string ?? "";
      const isCommand =
        body.toLowerCase().includes("/orchestrator");

      if (isCommand && !this.isAuthorizedUser(sender)) {
        console.warn(
          `[webhook] Unauthorized command attempt by ${sender}`
        );
        return null;
      }

      return { type: "issue_comment", payload, repo, sender, timestamp };
    }

    if (eventType === "pull_request" && action === "opened") {
      return { type: "pr_opened", payload, repo, sender, timestamp };
    }

    if (eventType === "pull_request_review" && action === "submitted") {
      return { type: "pr_review", payload, repo, sender, timestamp };
    }

    if (eventType === "pull_request" && action === "closed") {
      const pr = payload.pull_request as Record<string, unknown> | undefined;
      if (pr?.merged) {
        return { type: "pr_merged", payload, repo, sender, timestamp };
      }
    }

    return null;
  }

  private isAuthorizedUser(login: string): boolean {
    if (ALLOWED_COMMAND_USERS.size === 0) {
      console.warn(`[webhook] Denying command from '${login}': ORCHESTRATOR_ADMINS is not configured (deny-by-default).`);
      return false;
    }
    return ALLOWED_COMMAND_USERS.has(login);
  }
}
