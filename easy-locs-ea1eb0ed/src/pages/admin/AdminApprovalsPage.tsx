/**
 * AdminApprovalsPage — Sovereign Agent Control · L5 (#812)
 *
 * One inbox for every approval-gated execution_task in the system —
 * regardless of which agent kind produced it (AI router, marketplace
 * onboarding bot, future build agent, etc.). Reviewers see an
 * oldest-first queue, click a row, vote in the drawer, and the task
 * either flips to `approved` (downstream worker can pick it up) or
 * `rejected` / `changes_requested` (audit row preserved).
 *
 * Why list-only on this page: the heavy diff/decision UI lives in a
 * Sheet so the queue stays scannable on mobile and the keyboard focus
 * stays on the comment box while reviewing.
 */
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Inbox, RefreshCcw } from "lucide-react";
import SubPageShell from "@/components/layout/SubPageShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { dashboardRepo } from "@/repositories/domain/dashboard.repo";
import ApprovalDecisionDrawer from "@/components/admin/approvals/ApprovalDecisionDrawer";
import { useUiEngine } from "@/hooks/useUiEngine";

interface PendingTaskRow {
  id: string;
  type: string;
  domain: string;
  risk_level: string;
  status: string;
  requested_by: string | null;
  agent_id: string | null;
  blocked_reason: string | null;
  approval_policy: unknown;
  created_at: string;
  updated_at: string;
}

function formatAge(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const min = Math.round(ms / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m`;
  const h = Math.round(min / 60);
  if (h < 24) return `${h}h`;
  return `${Math.round(h / 24)}d`;
}

export default function AdminApprovalsPage() {
  useUiEngine("admin-adminapprovalspage");
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const queueQuery = useQuery({
    queryKey: ["admin-approvals", "queue"],
    queryFn: () =>
      dashboardRepo.fetchPendingApprovals({ limit: 200 }) as Promise<
        PendingTaskRow[]
      >,
    refetchInterval: 30_000,
  });

  const rows = useMemo<PendingTaskRow[]>(
    () => queueQuery.data ?? [],
    [queueQuery.data],
  );

  const openDrawer = (id: string) => {
    setSelectedTaskId(id);
    setDrawerOpen(true);
  };

  return (
    <SubPageShell noContentPad className="bg-background">
      <div className="px-4 pt-4 pb-2 flex items-center gap-3">
        <Inbox className="w-5 h-5 text-accent" />
        <div className="flex-1">
          <h1 className="text-lg font-semibold text-foreground">
            Approvals inbox
          </h1>
          <p className="text-xs text-muted-foreground">
            Tasks waiting for human review across every agent in the platform.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => queueQuery.refetch()}
          disabled={queueQuery.isFetching}
          data-testid="approvals-refresh"
        >
          {queueQuery.isFetching ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <RefreshCcw className="w-4 h-4" />
          )}
        </Button>
      </div>

      <div className="px-2 pb-6" data-testid="approvals-queue">
        {queueQuery.isLoading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : queueQuery.isError ? (
          <div
            className="m-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
            data-testid="approvals-error"
          >
            Failed to load approvals queue.{" "}
            {(queueQuery.error as Error | undefined)?.message}
          </div>
        ) : rows.length === 0 ? (
          <div
            className="m-4 rounded-2xl border border-dashed border-border/60 p-10 text-center"
            data-testid="approvals-empty"
          >
            <Inbox className="w-8 h-8 mx-auto text-muted-foreground/60 mb-2" />
            <p className="text-sm font-medium text-foreground">
              Inbox zero
            </p>
            <p className="text-xs text-muted-foreground">
              No tasks are waiting for review right now.
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Task</TableHead>
                <TableHead>Risk</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead className="text-right">Age</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow
                  key={row.id}
                  className="cursor-pointer hover:bg-muted/30"
                  onClick={() => openDrawer(row.id)}
                  data-testid={`approval-row-${row.id}`}
                >
                  <TableCell>
                    <div className="space-y-0.5">
                      <div className="text-sm font-medium text-foreground">
                        {row.type}
                      </div>
                      <div className="text-[0.625rem] text-muted-foreground">
                        <Badge variant="outline" className="mr-1">
                          {row.domain}
                        </Badge>
                        <span className="font-mono">
                          {row.id.slice(0, 8)}
                        </span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        row.risk_level === "CRITICAL"
                          ? "destructive"
                          : "secondary"
                      }
                    >
                      {row.risk_level}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className="text-xs text-muted-foreground line-clamp-2">
                      {row.blocked_reason ?? "—"}
                    </span>
                  </TableCell>
                  <TableCell className="text-right text-xs text-muted-foreground">
                    {formatAge(row.created_at)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <ApprovalDecisionDrawer
        taskId={selectedTaskId}
        open={drawerOpen}
        onOpenChange={(o) => {
          setDrawerOpen(o);
          if (!o) setSelectedTaskId(null);
        }}
      />
    </SubPageShell>
  );
}
