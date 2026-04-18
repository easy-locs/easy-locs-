# Agent Watchdog & Anti-Deadlock Runbook

This runbook covers the hardening installed by task **#1016** to keep the
agent task queue (`system.execution_tasks`) from silently deadlocking.

## What the watchdog does

Every 60 seconds the `agent-watchdog` edge function calls
`system.run_agent_watchdog()`, which:

1. Marks **running** tasks as `stalled` when they have either
   - passed their `deadline_at`, or
   - had no `last_heartbeat_at` update within the staleness threshold.
2. **Auto-fails** tasks that remain `stalled` past the autofail threshold,
   transitioning `running → failed` with `error_code = WATCHDOG_AUTOFAIL`.
3. **Releases** dependency edges in `system.execution_task_dependencies`
   whose upstream task has reached a terminal state
   (`succeeded`, `failed`, `cancelled`, `rolled_back`, `rejected`).
4. Writes a row to `system.agent_incident_log` for every action taken.
5. Stamps `system.agent_watchdog_settings.last_run_at` so the cockpit can
   detect a stalled watchdog.

Thresholds live in `system.agent_watchdog_settings` (single-row table):

| column                          | default | meaning                                  |
| ------------------------------- | ------- | ---------------------------------------- |
| `default_timeout_seconds`       | 600     | applied when a task has no override      |
| `staleness_threshold_seconds`   | 300     | no heartbeat → stalled                   |
| `autofail_after_stall_seconds`  | 600     | stalled this long → auto-fail            |
| `watchdog_max_silence_seconds`  | 300     | health check goes red after this gap     |

To change a threshold:

```sql
UPDATE system.agent_watchdog_settings
   SET default_timeout_seconds = 900,
       updated_at = now()
 WHERE id IS TRUE;
```

## Dependency guard

Use `system.add_task_dependency(task_id, depends_on, actor)` to wire one
task as blocking another. The function refuses to register an edge whose
`depends_on` target is not in one of: `approved`, `queued`, `running`,
`succeeded`. Every rejection is recorded in `system.agent_incident_log`
with `kind = 'dependency_rejected'`.

The TypeScript surface is in
`easy-locs-ea1eb0ed/src/core/execution/dependency-guard.ts` (mirrored by
`__tests__/dependency-guard.test.ts`).

## Operator actions

All three actions are SECURITY DEFINER RPCs. Each writes an audit row to
`system.agent_incident_log` with `actor` set to whoever invoked it.

### 1. Extend a task's deadline

```sql
SELECT system.extend_task_deadline(
  p_task_id       => '<uuid>',
  p_extra_seconds => 600,
  p_actor         => 'ops:<your-handle>'
);
```

Adds time to `deadline_at` and clears `stalled_at` so the watchdog gives
the task another full window before reconsidering.

### 2. Force-release a dependency edge

```sql
SELECT system.force_release_dependency(
  p_task_id    => '<dependent uuid>',
  p_depends_on => '<blocker uuid>',
  p_actor      => 'ops:<your-handle>',
  p_reason     => 'blocker stuck in pending_review since <date>'
);
```

`p_actor` and `p_reason` are required. The edge stays in the table for
audit but `released_at` is set so the watchdog will not see it as a
blocker.

### 3. Acknowledge an incident

```sql
SELECT system.acknowledge_incident(
  p_incident_id => '<incident uuid>',
  p_actor       => 'ops:<your-handle>'
);
```

Acknowledgement is itself logged so a separate row records who closed
which incident.

## Health check

The cockpit can poll `system.agent_watchdog_health()` to get a structured
JSON status:

```json
{
  "healthy": true,
  "last_run_at": "2026-04-18T12:00:00Z",
  "silence_seconds": 42,
  "max_silence_seconds": 300,
  "last_run_summary": { "stalled_count": 0, "autofailed_count": 0, "unblocked_count": 1, "ran_at": "..." },
  "open_incidents_24h": 3
}
```

When `healthy = false` the cockpit must surface a visible alert: it means
**monitoring itself is degraded** and a stuck task may not auto-recover.

## Manual recovery from a stuck queue

If the cockpit is showing "Waiting for tasks to complete…" indefinitely:

1. Check watchdog health — if `silence_seconds` is large, the cron is not
   firing. Inspect `engine_supervisor` for `agent-watchdog`.
2. List open incidents: `SELECT * FROM system.agent_incident_log
   WHERE acknowledged_at IS NULL ORDER BY created_at DESC LIMIT 50;`
3. List unreleased dependency edges with terminally-resolved blockers:

   ```sql
   SELECT d.task_id, d.depends_on_task_id, et.status
     FROM system.execution_task_dependencies d
     JOIN system.execution_tasks et ON et.id = d.depends_on_task_id
    WHERE d.released_at IS NULL
      AND et.status IN ('succeeded','failed','cancelled','rolled_back','rejected');
   ```

   These should auto-release on the next watchdog tick. If not, run
   `SELECT system.run_agent_watchdog();` once by hand.
4. If a task is genuinely lost, force-release its edges and let the
   dispatcher pick the dependent up.
