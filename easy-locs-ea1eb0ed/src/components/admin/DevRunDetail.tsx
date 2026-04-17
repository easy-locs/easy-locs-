/**
 * DevRunDetail — LC8 (#875).
 *
 * Renders a `domain: 'code'` execution_task row inside the existing
 * runs explorer (RunsExplorer / AdminAgentRunsPage). Surfaces the
 * artefacts produced by the dev builder pipeline (LC1-7): unified
 * diff, build log, test output, PR status, drift report, plus the
 * GitHub Actions run URL.
 *
 * Replay is delegated back to the parent through `onReplay` so we
 * stay aligned with the canonical `taskDispatcher` path used by the
 * AI run renderer (the only sanctioned mutation entry point per
 * `dispatchExecutionTask`). View PR is a plain external link to
 * `pr_url` when present.
 *
 * The renderer is selected by domain alone — the AI renderer in the
 * runs explorer is untouched.
 */
import { Link } from "react-router-dom";
import {
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw,
  ExternalLink,
  ShieldAlert,
  GitPullRequest,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import TextDiffView from "@/components/admin/approvals/TextDiffView";
import type { AgentRunRichRow } from "@/lib/admin/agents-repo";

function fmtMs(ms: number | null | undefined): string {
  if (ms == null) return "—";
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}
function fmtUsd(n: number | null | undefined): string {
  if (n == null) return "—";
  return n < 0.01 ? `$${n.toFixed(6)}` : `$${n.toFixed(4)}`;
}
function statusTone(status: string): string {
  if (status === "succeeded") return "bg-success/15 text-success";
  if (status === "failed" || status === "blocked")
    return "bg-destructive/15 text-destructive";
  if (status === "running") return "bg-info/15 text-info";
  if (status === "pending_review") return "bg-warning/15 text-warning";
  return "bg-muted text-muted-foreground";
}
function prTone(s: string | null | undefined): string {
  if (s === "merged") return "bg-success/15 text-success";
  if (s === "open") return "bg-info/15 text-info";
  if (s === "closed" || s === "failed")
    return "bg-destructive/15 text-destructive";
  if (s === "running") return "bg-warning/15 text-warning";
  return "bg-muted text-muted-foreground";
}

export interface DevRunDetailProps {
  run: AgentRunRichRow;
  onReplay?: () => void;
}

export default function DevRunDetail({ run, onReplay }: DevRunDetailProps) {
  return (
    <div
      data-testid="dev-run-detail"
      className="rounded-lg border border-border/40 bg-card/40 overflow-hidden"
    >
      <div className="flex items-center justify-between border-b border-border/40 px-3 py-2 gap-2">
        <div className="text-xs flex items-center gap-2">
          <span className="font-medium">Dev run</span>
          <code className="font-mono text-[11px]">
            {run.task_id.slice(0, 12)}…
          </code>
          <span
            className={`text-[10px] px-1.5 py-0.5 rounded ${statusTone(run.status)}`}
          >
            {run.status}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {run.pr_url ? (
            <Button
              asChild
              size="sm"
              variant="outline"
              className="h-7 gap-1"
              data-testid="dev-run-view-pr"
            >
              <a
                href={run.pr_url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="View PR on GitHub"
              >
                <GitPullRequest className="h-3 w-3" /> View PR
                <ExternalLink className="h-3 w-3" />
              </a>
            </Button>
          ) : null}
          {onReplay ? (
            <Button
              size="sm"
              variant="default"
              className="h-7 gap-1"
              onClick={onReplay}
              data-testid="dev-run-replay"
            >
              <RefreshCw className="h-3 w-3" /> Replay
            </Button>
          ) : null}
        </div>
      </div>

      <div className="max-h-[60vh] overflow-y-auto p-3 space-y-3">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
          <Stat label="status" value={run.status} />
          <Stat label="risk" value={run.risk_level} />
          <Stat label="latency" value={fmtMs(run.latency_ms)} />
          <Stat label="cost" value={fmtUsd(run.cost_usd)} />
          {run.pr_status ? (
            <div
              className="rounded border bg-muted/30 px-2 py-1"
              data-testid="dev-run-pr-status"
            >
              <div className="text-[10px] uppercase text-muted-foreground">
                PR status
              </div>
              <div
                className={`font-mono truncate inline-block px-1.5 rounded ${prTone(run.pr_status)}`}
              >
                {run.pr_status}
              </div>
            </div>
          ) : null}
          {run.external_run_url ? (
            <div className="rounded border bg-muted/30 px-2 py-1">
              <div className="text-[10px] uppercase text-muted-foreground">
                Actions run
              </div>
              <a
                href={run.external_run_url}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-[11px] text-primary hover:underline inline-flex items-center gap-1 truncate"
              >
                open <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          ) : null}
          <Stat
            label="created"
            value={new Date(run.created_at).toLocaleString()}
          />
        </div>

        {run.held_for_review ? (
          <div className="rounded border border-warning/40 bg-warning/5 p-3 space-y-2">
            <div className="flex items-center gap-2 text-warning text-sm font-medium">
              <ShieldAlert className="h-4 w-4" />
              Held for review
            </div>
            {run.held_reason ? (
              <p className="text-xs text-muted-foreground">
                Reason: {run.held_reason}
              </p>
            ) : null}
            <Link
              to={`/admin/approvals?taskId=${run.task_id}`}
              className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
            >
              Review in approvals inbox <ExternalLink className="h-3 w-3" />
            </Link>
          </div>
        ) : run.released_at ? (
          <div className="rounded border border-success/40 bg-success/5 p-3">
            <p className="text-xs flex items-center gap-1 text-success">
              <CheckCircle2 className="h-3 w-3" /> Decided at{" "}
              {new Date(run.released_at).toLocaleString()}
            </p>
          </div>
        ) : null}

        {run.purpose || run.prompt ? (
          <Section title="Intent" empty="no intent captured">
            {run.purpose ?? run.prompt ?? null}
          </Section>
        ) : null}

        <DiffSection diff={run.dev_diff ?? null} />

        <LogSection
          title="Build log"
          body={run.dev_build_log ?? null}
          fallbackLogs={run.dev_logs ?? null}
        />
        <LogSection
          title="Test output"
          body={run.dev_test_output ?? null}
          fallbackLogs={null}
        />

        <DriftSection drift={run.dev_drift ?? null} />

        {run.error ? (
          <div className="rounded border border-destructive/40 bg-destructive/5 p-3">
            <div className="text-destructive text-sm font-medium flex items-center gap-1">
              <XCircle className="h-4 w-4" /> Error
            </div>
            <pre className="text-xs whitespace-pre-wrap mt-1">{run.error}</pre>
          </div>
        ) : null}

        <div className="text-[10px] text-muted-foreground flex items-center gap-1">
          <Clock className="h-3 w-3" /> task id: <code>{run.task_id}</code>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border bg-muted/30 px-2 py-1">
      <div className="text-[10px] uppercase text-muted-foreground">{label}</div>
      <div className="font-mono truncate">{value}</div>
    </div>
  );
}

function Section({
  title,
  children,
  empty,
}: {
  title: string;
  children: string | null;
  empty: string;
}) {
  return (
    <div>
      <div className="text-xs font-medium text-muted-foreground mb-1">
        {title}
      </div>
      {children ? (
        <pre className="text-xs whitespace-pre-wrap rounded border bg-muted/20 p-3 max-h-64 overflow-y-auto">
          {children}
        </pre>
      ) : (
        <div className="text-xs italic text-muted-foreground">{empty}</div>
      )}
    </div>
  );
}

function DiffSection({ diff }: { diff: string | null }) {
  return (
    <div data-testid="dev-run-diff">
      <div className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-2">
        Diff
        {diff ? (
          <Badge variant="outline" className="text-[10px] py-0 h-4">
            {diff.length.toLocaleString()} chars
          </Badge>
        ) : null}
      </div>
      {diff ? (
        <TextDiffView unifiedDiff={diff} />
      ) : (
        <div className="text-xs italic text-muted-foreground">
          no diff produced
        </div>
      )}
    </div>
  );
}

function LogSection({
  title,
  body,
  fallbackLogs,
}: {
  title: string;
  body: string | null;
  fallbackLogs: unknown[] | null;
}) {
  const text =
    body ??
    (fallbackLogs && fallbackLogs.length > 0
      ? fallbackLogs.map((l) => String(l)).join("\n")
      : null);
  return (
    <div data-testid={`dev-run-${title.toLowerCase().replace(/\s+/g, "-")}`}>
      <div className="text-xs font-medium text-muted-foreground mb-1">
        {title}
      </div>
      {text ? (
        <pre className="text-[11px] font-mono whitespace-pre-wrap rounded border bg-muted/20 p-3 max-h-64 overflow-y-auto">
          {text}
        </pre>
      ) : (
        <div className="text-xs italic text-muted-foreground">
          no {title.toLowerCase()} captured
        </div>
      )}
    </div>
  );
}

function DriftSection({ drift }: { drift: unknown | null }) {
  if (drift == null) return null;
  return (
    <div
      className="rounded border border-warning/40 bg-warning/5 p-3"
      data-testid="dev-run-drift"
    >
      <div className="flex items-center gap-2 text-warning text-sm font-medium mb-1">
        <AlertTriangle className="h-4 w-4" /> Drift report
      </div>
      <pre className="text-[11px] font-mono whitespace-pre-wrap max-h-64 overflow-y-auto">
        {typeof drift === "string" ? drift : JSON.stringify(drift, null, 2)}
      </pre>
    </div>
  );
}
