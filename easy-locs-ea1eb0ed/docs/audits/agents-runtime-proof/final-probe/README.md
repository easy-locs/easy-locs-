# Final post-fix probe matrix

All four functions probed back-to-back from the audit machine after the
bug-fixes in `../bug-fixes/` were deployed. Each row records: timestamp,
function, action sent, HTTP status, body file. Bodies are saved next to
this README.

| Timestamp (UTC)        | Function                       | Body sent                                | HTTP | Body file                              | Verdict |
|------------------------|--------------------------------|------------------------------------------|------|----------------------------------------|---------|
| 2026-04-17T00:40:13Z   | autonomous-cron-dispatcher     | `{}`                                     | 200  | `autonomous-cron-dispatcher.body`      | OK — handler ran, jobs triggered (post-fix). |
| 2026-04-17T00:40:26Z   | execution-loop                 | `{"batch_size":1}`                       | 200  | `execution-loop.body`                  | OK — loop tick handled. |
| 2026-04-17T00:40:27Z   | lease-workflow                 | `{"action":"generate_lease",…}`          | 200  | `lease-workflow.body`                  | OK — `action:"existing"` (idempotent replay returns prior lease). |
| 2026-04-17T00:40:12Z   | chief-agent                    | `{}`                                     | 400  | `chief-agent.body`                     | Handler reached: `{"error":"Command or actionType is required"}`. Function code is healthy; semantic 400 because no command/actionType supplied. End-to-end execution of an LLM command additionally requires `OPENAI_API_KEY` / `ANTHROPIC_API_KEY` in the function env (not set on this project — see README "Remaining open items"). |

`matrix.tsv` contains the raw timestamp/function/code triplets captured in
order during the same shell invocation.

This matrix supersedes the earlier failure-path probes in
`../function-probes/` and `../agent-driven-lifecycle/`'s pre-fix files.
