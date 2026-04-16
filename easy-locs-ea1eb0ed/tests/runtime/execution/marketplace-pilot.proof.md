# Marketplace Pilot — Runtime Proof (task #754)

> Generated 2026-04-16T22:38:00.239Z by `scripts/marketplace-pilot-runtime-proof.ts`.
> The harness drives `ExecutionOrchestratorV2` with the in-memory
> persistence / lock / idempotency fakes shared with the unit tests, so the
> orchestration code path under exercise is identical to the one the
> `execution-loop` Edge Function runs in production. Persistence and
> distributed-lock backends differ (Postgres in prod) but the orchestrator,
> adapter, verifier and event sequence are the same modules.

## 1. Nominal publish
```json
{
  "name": "Nominal publish",
  "before": {
    "id": "L-PUB",
    "status": "draft",
    "is_published": false,
    "visibility_mode": null
  },
  "after": {
    "id": "L-PUB",
    "status": "active",
    "is_published": true,
    "visibility_mode": null
  },
  "timeline": [
    {
      "name": "task.queued",
      "payload": {
        "attempt": 1
      }
    },
    {
      "name": "task.locked",
      "payload": {
        "lockKey": "marketplace:listing:L-PUB"
      }
    },
    {
      "name": "task.started",
      "payload": {
        "attempt": 1,
        "lockKey": "marketplace:listing:L-PUB"
      }
    },
    {
      "name": "task.verified",
      "payload": {
        "details": {
          "observed": {
            "id": "L-PUB",
            "status": "active",
            "is_published": true
          }
        }
      }
    },
    {
      "name": "task.succeeded",
      "payload": {
        "output": {
          "listingId": "L-PUB",
          "previous_state": {
            "id": "L-PUB",
            "status": "draft",
            "is_published": false,
            "visibility_mode": null
          },
          "observed": {
            "id": "L-PUB",
            "status": "active",
            "is_published": true
          },
          "target_status": "active"
        }
      }
    },
    {
      "name": "task.unlocked",
      "payload": {
        "lockKey": "marketplace:listing:L-PUB"
      }
    }
  ],
  "domain_events": [
    {
      "name": "domain.marketplace.listing_published",
      "listingId": "L-PUB",
      "previous_state": {
        "id": "L-PUB",
        "status": "draft",
        "is_published": false,
        "visibility_mode": null
      }
    }
  ],
  "outcome": {
    "taskId": "rt-pub",
    "finalStatus": "succeeded",
    "durationMs": 1,
    "sinkErrors": [],
    "result": {
      "output": {
        "listingId": "L-PUB",
        "previous_state": {
          "id": "L-PUB",
          "status": "draft",
          "is_published": false,
          "visibility_mode": null
        },
        "observed": {
          "id": "L-PUB",
          "status": "active",
          "is_published": true
        },
        "target_status": "active"
      },
      "logs": [
        "[2026-04-16T22:38:00.237Z] validate.ok listingId=L-PUB",
        "[2026-04-16T22:38:00.237Z] kyc.ok",
        "[2026-04-16T22:38:00.237Z] snapshot.ok prev_status=draft",
        "[2026-04-16T22:38:00.237Z] mutate.ok new_status=active",
        "[2026-04-16T22:38:00.237Z] verify.ok",
        "[2026-04-16T22:38:00.237Z] event.emitted domain.marketplace.listing_published"
      ],
      "actions_taken": [
        "snapshot_previous_state",
        "set_status:active",
        "domain.marketplace.listing_published"
      ],
      "verification": {
        "ok": true,
        "checked_at": "2026-04-16T22:38:00.237Z",
        "details": {
          "observed": {
            "id": "L-PUB",
            "status": "active",
            "is_published": true
          }
        }
      }
    }
  },
  "durations": [
    {
      "step": "orchestrator.run",
      "ms": 2
    }
  ]
}
```

## 2. Nominal unpublish (SAFE_BY_POLICY)
```json
{
  "name": "Nominal unpublish (SAFE_BY_POLICY)",
  "before": {
    "id": "L-UNPUB",
    "status": "active",
    "is_published": true,
    "visibility_mode": "live"
  },
  "after": {
    "id": "L-UNPUB",
    "status": "paused",
    "is_published": false,
    "visibility_mode": "live"
  },
  "timeline": [
    {
      "name": "task.queued",
      "payload": {
        "attempt": 1
      }
    },
    {
      "name": "task.locked",
      "payload": {
        "lockKey": "marketplace:listing:L-UNPUB"
      }
    },
    {
      "name": "task.started",
      "payload": {
        "attempt": 1,
        "lockKey": "marketplace:listing:L-UNPUB"
      }
    },
    {
      "name": "task.verified",
      "payload": {
        "details": {
          "observed": {
            "id": "L-UNPUB",
            "status": "paused",
            "is_published": false
          }
        }
      }
    },
    {
      "name": "task.succeeded",
      "payload": {
        "output": {
          "listingId": "L-UNPUB",
          "previous_state": {
            "id": "L-UNPUB",
            "status": "active",
            "is_published": true,
            "visibility_mode": "live"
          },
          "observed": {
            "id": "L-UNPUB",
            "status": "paused",
            "is_published": false
          },
          "target_status": "paused"
        }
      }
    },
    {
      "name": "task.unlocked",
      "payload": {
        "lockKey": "marketplace:listing:L-UNPUB"
      }
    }
  ],
  "domain_events": [
    {
      "name": "domain.marketplace.listing_unpublished",
      "listingId": "L-UNPUB",
      "previous_state": {
        "id": "L-UNPUB",
        "status": "active",
        "is_published": true,
        "visibility_mode": "live"
      }
    }
  ],
  "outcome": {
    "taskId": "rt-unpub",
    "finalStatus": "succeeded",
    "durationMs": 0,
    "sinkErrors": [],
    "result": {
      "output": {
        "listingId": "L-UNPUB",
        "previous_state": {
          "id": "L-UNPUB",
          "status": "active",
          "is_published": true,
          "visibility_mode": "live"
        },
        "observed": {
          "id": "L-UNPUB",
          "status": "paused",
          "is_published": false
        },
        "target_status": "paused"
      },
      "logs": [
        "[2026-04-16T22:38:00.238Z] validate.ok listingId=L-UNPUB",
        "[2026-04-16T22:38:00.238Z] snapshot.ok prev_status=active",
        "[2026-04-16T22:38:00.238Z] mutate.ok new_status=paused",
        "[2026-04-16T22:38:00.238Z] verify.ok",
        "[2026-04-16T22:38:00.238Z] event.emitted domain.marketplace.listing_unpublished"
      ],
      "actions_taken": [
        "snapshot_previous_state",
        "set_status:paused",
        "domain.marketplace.listing_unpublished"
      ],
      "verification": {
        "ok": true,
        "checked_at": "2026-04-16T22:38:00.238Z",
        "details": {
          "observed": {
            "id": "L-UNPUB",
            "status": "paused",
            "is_published": false
          }
        }
      }
    }
  },
  "durations": [
    {
      "step": "orchestrator.run",
      "ms": 0
    }
  ]
}
```

## 3. Double-dispatch with same idempotency key
Proof: `mutations_total` stays at **1** even though two distinct task rows are
dispatched with the same `idempotency_key`. The second run returns
`idempotent=true` after a `task.idempotent_hit` canonical event.
```json
{
  "name": "Double-dispatch with same idempotency key",
  "mutations_total": 1,
  "first_outcome": "succeeded",
  "second_outcome": "succeeded",
  "second_idempotent": true,
  "timeline": [
    "task.queued",
    "task.locked",
    "task.started",
    "task.verified",
    "task.succeeded",
    "task.unlocked",
    "task.queued",
    "task.locked",
    "task.idempotent_hit",
    "task.succeeded",
    "task.unlocked"
  ],
  "after": {
    "id": "L-DUP",
    "status": "active",
    "is_published": true,
    "visibility_mode": null
  }
}
```

## 4. Lock collision — serialised access
Proof: a pre-acquired lock on the listing forces task A to terminate with
`LOCK_TIMEOUT` (transient `failed` so the retry policy can re-queue). After
the contending owner releases, task B acquires the lock cleanly and the
mutation runs exactly once.
```json
{
  "name": "Lock collision — serialised access",
  "a_outcome": {
    "finalStatus": "failed",
    "errorCode": "LOCK_TIMEOUT"
  },
  "b_outcome": {
    "finalStatus": "succeeded"
  },
  "mutations_total": 1,
  "after": {
    "id": "L-LOCK",
    "status": "active",
    "is_published": true,
    "visibility_mode": null
  }
}
```

## 5. Verifier mismatch (forced divergence)
Proof: with `setStatus` replaced by a no-op, the post-state diverges from the
expected target. The verifier returns a structured diff, the adapter surfaces
`VERIFICATION_MISMATCH`, and the orchestrator transitions the task to
`failed`.
```json
{
  "name": "Verifier mismatch (forced divergence)",
  "final_status": "failed",
  "error_code": "VERIFICATION_MISMATCH",
  "error_message": "Listing L-MIS state diverged from expected (2 field(s))",
  "after": {
    "id": "L-MIS",
    "status": "draft",
    "is_published": false,
    "visibility_mode": null
  },
  "timeline": [
    "task.queued",
    "task.locked",
    "task.started",
    "task.failed",
    "task.unlocked"
  ]
}
```

## Real-DB execution playbook
Re-running this proof against a real Supabase deployment is a matter of
swapping the in-memory infra for the Postgres-backed services already used
by `execution-loop/index.ts`:

```ts
import { createClient } from "@supabase/supabase-js";
import { bootstrapMarketplaceAdapters } from "./supabase/functions/_shared/execution/adapters/marketplace/bootstrap.ts";
const sb = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
bootstrapMarketplaceAdapters(sb);
// then dispatch via system.dispatch_execution_task and trigger execution-loop
```

The migration `20260420000000_marketplace_pilot_risk_classification.sql`
must have been applied so `MARKETPLACE.LISTING.PUBLISH` /
`MARKETPLACE.LISTING.UNPUBLISH` are MEDIUM (not deny-by-default CRITICAL).
