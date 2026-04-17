import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Inbox, Loader2, RefreshCw, Sparkles, Users } from "lucide-react";
import { dashboardRepo } from "@/repositories/domain/dashboard.repo";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import ApprovalDecisionDrawer from "@/components/admin/approvals/ApprovalDecisionDrawer";
import { getSection } from "../sections";

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

interface PresencePeer {
  user_id: string;
  display: string;
  joined_at: string;
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

function summarizeBlockedReason(rows: PendingTaskRow[]): string {
  if (rows.length === 0) return "Inbox is empty.";
  const byRisk = rows.reduce<Record<string, number>>((acc, r) => {
    acc[r.risk_level] = (acc[r.risk_level] ?? 0) + 1;
    return acc;
  }, {});
  const byDomain = rows.reduce<Record<string, number>>((acc, r) => {
    acc[r.domain] = (acc[r.domain] ?? 0) + 1;
    return acc;
  }, {});
  const oldest = rows.reduce((acc, r) =>
    new Date(r.created_at) < new Date(acc.created_at) ? r : acc,
  );
  const reasonCounts = rows.reduce<Record<string, number>>((acc, r) => {
    const key = (r.blocked_reason ?? "no reason given").slice(0, 60);
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});
  const topReason = Object.entries(reasonCounts).sort((a, b) => b[1] - a[1])[0];
  const topDomain = Object.entries(byDomain).sort((a, b) => b[1] - a[1])[0];
  const critical = byRisk.CRITICAL ?? 0;
  return [
    `${rows.length} task${rows.length === 1 ? "" : "s"} waiting`,
    critical > 0 ? `${critical} critical` : null,
    topDomain ? `top domain ${topDomain[0]} (${topDomain[1]})` : null,
    topReason ? `most common blocker: "${topReason[0]}"` : null,
    `oldest ${formatAge(oldest.created_at)}`,
  ]
    .filter(Boolean)
    .join(" · ");
}

export default function ApprovalsSection() {
  const section = getSection("approvals");
  const Icon = section.icon;
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();

  const [riskFilter, setRiskFilter] = useState<string>("ALL");
  const [domainFilter, setDomainFilter] = useState<string>("ALL");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerTaskId, setDrawerTaskId] = useState<string | null>(null);
  const [bulkDialog, setBulkDialog] = useState<null | "approve" | "reject">(
    null,
  );
  const [peers, setPeers] = useState<PresencePeer[]>([]);

  const queueQuery = useQuery({
    queryKey: ["admin-approvals", "queue"],
    queryFn: () =>
      dashboardRepo.fetchPendingApprovals({ limit: 200 }) as Promise<
        PendingTaskRow[]
      >,
    refetchInterval: 30_000,
  });

  const rows = queueQuery.data ?? [];

  const domains = useMemo(
    () => Array.from(new Set(rows.map((r) => r.domain))).sort(),
    [rows],
  );
  const filtered = useMemo(
    () =>
      rows.filter(
        (r) =>
          (riskFilter === "ALL" || r.risk_level === riskFilter) &&
          (domainFilter === "ALL" || r.domain === domainFilter),
      ),
    [rows, riskFilter, domainFilter],
  );

  const summary = useMemo(() => summarizeBlockedReason(filtered), [filtered]);

  // Presence — show other admins currently viewing the inbox.
  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase.channel("admin-control:approvals", {
      config: { presence: { key: user.id } },
    });
    const display =
      (user.user_metadata?.display_name as string | undefined) ??
      user.email ??
      user.id.slice(0, 8);
    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState() as Record<
          string,
          PresencePeer[]
        >;
        const flat: PresencePeer[] = [];
        for (const [, list] of Object.entries(state)) {
          for (const entry of list) flat.push(entry);
        }
        setPeers(flat);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({
            user_id: user.id,
            display,
            joined_at: new Date().toISOString(),
          });
        }
      });
    return () => {
      void supabase.removeChannel(channel);
    };
    // Re-subscribe only when the user identity actually changes. We
    // intentionally exclude `user.user_metadata` (a fresh object reference on
    // every render) and `user.email` from the dep list to prevent infinite
    // channel re-subscriptions while the page is open.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const otherPeers = peers.filter((p) => p.user_id !== user?.id);

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const toggleAll = () => {
    if (filtered.every((r) => selected.has(r.id)) && filtered.length > 0) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map((r) => r.id)));
    }
  };

  const bulkMutation = useMutation({
    mutationFn: async (input: {
      decision: "approved" | "rejected";
      ids: string[];
      reason: string;
    }) => {
      const results = await Promise.allSettled(
        input.ids.map((id) =>
          dashboardRepo.decideTaskApproval({
            taskId: id,
            decision: input.decision,
            reason:
              input.decision === "rejected"
                ? input.reason || "bulk reject from control plane"
                : null,
            commentMd: null,
            clientRequestId: `bulk:${input.decision}:${id}`,
          }),
        ),
      );
      const ok = results.filter((r) => r.status === "fulfilled").length;
      const failed = results.length - ok;
      return { ok, failed };
    },
    onSuccess: ({ ok, failed }, vars) => {
      if (failed > 0) {
        toast({
          title: `Bulk ${vars.decision} partially failed`,
          description: `${ok} succeeded · ${failed} failed`,
          variant: "destructive",
        });
      } else {
        toast({
          title: `Bulk ${vars.decision} complete`,
          description: `${ok} task${ok === 1 ? "" : "s"} processed`,
        });
      }
      setSelected(new Set());
      qc.invalidateQueries({ queryKey: ["admin-approvals"] });
    },
    onError: (err: Error) => {
      toast({
        title: "Bulk action failed",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  const runBulk = (decision: "approved" | "rejected") => {
    bulkMutation.mutate({
      decision,
      ids: Array.from(selected),
      reason: `bulk ${decision} via /admin/control/approvals`,
    });
    setBulkDialog(null);
  };

  const allChecked =
    filtered.length > 0 && filtered.every((r) => selected.has(r.id));

  return (
    <TooltipProvider>
      <section
        data-testid="control-section-approvals"
        className="flex h-full flex-col"
      >
        <header className="flex items-start justify-between gap-3 border-b border-border/40 px-6 py-4">
          <div className="flex items-start gap-3">
            <div className="rounded-lg border border-border/40 bg-card/60 p-2">
              <Icon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-lg font-semibold leading-tight">
                {section.label}
              </h1>
              <p className="text-xs text-muted-foreground">
                {section.description}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {otherPeers.length > 0 && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div
                    data-testid="approvals-presence"
                    className="flex items-center gap-1 rounded-full border border-border/40 bg-muted/40 px-2 py-1 text-[11px] text-muted-foreground"
                  >
                    <Users className="h-3 w-3" />
                    {otherPeers.length} other admin
                    {otherPeers.length === 1 ? "" : "s"}
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <div className="space-y-0.5 text-xs">
                    {otherPeers.map((p) => (
                      <div key={p.user_id}>{p.display}</div>
                    ))}
                  </div>
                </TooltipContent>
              </Tooltip>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => queueQuery.refetch()}
              disabled={queueQuery.isFetching}
              data-testid="approvals-refresh"
            >
              {queueQuery.isFetching ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </Button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto">
          <div className="space-y-4 p-6">
            <div
              data-testid="approvals-summary"
              className="flex items-start gap-2 rounded-lg border border-border/40 bg-muted/20 p-3 text-xs"
            >
              <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <div>
                <div className="font-medium text-foreground">
                  Inbox summary
                </div>
                <div className="text-muted-foreground">{summary}</div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Select value={riskFilter} onValueChange={setRiskFilter}>
                <SelectTrigger
                  className="h-8 w-[140px] text-xs"
                  data-testid="approvals-risk-filter"
                >
                  <SelectValue placeholder="Risk" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All risks</SelectItem>
                  <SelectItem value="LOW">Low</SelectItem>
                  <SelectItem value="MEDIUM">Medium</SelectItem>
                  <SelectItem value="HIGH">High</SelectItem>
                  <SelectItem value="CRITICAL">Critical</SelectItem>
                </SelectContent>
              </Select>

              <Select value={domainFilter} onValueChange={setDomainFilter}>
                <SelectTrigger
                  className="h-8 w-[160px] text-xs"
                  data-testid="approvals-domain-filter"
                >
                  <SelectValue placeholder="Domain" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All domains</SelectItem>
                  {domains.map((d) => (
                    <SelectItem key={d} value={d}>
                      {d}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="ml-auto flex items-center gap-2">
                <span className="text-xs text-muted-foreground">
                  {selected.size} selected
                </span>
                <Button
                  size="sm"
                  variant="default"
                  disabled={selected.size === 0 || bulkMutation.isPending}
                  onClick={() => setBulkDialog("approve")}
                  data-testid="approvals-bulk-approve"
                >
                  Approve
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  disabled={selected.size === 0 || bulkMutation.isPending}
                  onClick={() => setBulkDialog("reject")}
                  data-testid="approvals-bulk-reject"
                >
                  Reject
                </Button>
              </div>
            </div>

            {queueQuery.isLoading ? (
              <div className="flex items-center justify-center py-24">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : queueQuery.isError ? (
              <div
                className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
                data-testid="approvals-error"
              >
                Failed to load approvals queue.{" "}
                {(queueQuery.error as Error | undefined)?.message}
              </div>
            ) : filtered.length === 0 ? (
              <div
                className="rounded-2xl border border-dashed border-border/60 p-10 text-center"
                data-testid="approvals-empty"
              >
                <Inbox className="mx-auto mb-2 h-8 w-8 text-muted-foreground/60" />
                <p className="text-sm font-medium text-foreground">Inbox zero</p>
                <p className="text-xs text-muted-foreground">
                  No tasks match the current filters.
                </p>
              </div>
            ) : (
              <div className="rounded-lg border border-border/40">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10">
                        <Checkbox
                          checked={allChecked}
                          onCheckedChange={toggleAll}
                          data-testid="approvals-select-all"
                        />
                      </TableHead>
                      <TableHead>Task</TableHead>
                      <TableHead>Risk</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead className="text-right">Age</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((row) => (
                      <TableRow
                        key={row.id}
                        className="cursor-pointer hover:bg-muted/30 focus-visible:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        data-testid={`approval-row-${row.id}`}
                        role="button"
                        tabIndex={0}
                        aria-label={`Open approval ${row.type}`}
                        onClick={() => {
                          setDrawerTaskId(row.id);
                          setDrawerOpen(true);
                        }}
                        onKeyDown={(e) => {
                          // Only handle when the row itself is focused —
                          // keyboard events bubbling from inner controls
                          // (checkbox, action buttons) must not reopen the
                          // drawer.
                          if (e.target !== e.currentTarget) return;
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            setDrawerTaskId(row.id);
                            setDrawerOpen(true);
                          }
                        }}
                      >
                        <TableCell
                          onClick={(e) => e.stopPropagation()}
                          className="w-10"
                        >
                          <Checkbox
                            checked={selected.has(row.id)}
                            onCheckedChange={() => toggle(row.id)}
                            data-testid={`approval-select-${row.id}`}
                          />
                        </TableCell>
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
                          <span className="line-clamp-2 text-xs text-muted-foreground">
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
              </div>
            )}
          </div>
        </div>

        <ApprovalDecisionDrawer
          taskId={drawerTaskId}
          open={drawerOpen}
          onOpenChange={(o) => {
            setDrawerOpen(o);
            if (!o) setDrawerTaskId(null);
          }}
        />

        <AlertDialog
          open={bulkDialog !== null}
          onOpenChange={(o) => !o && setBulkDialog(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {bulkDialog === "approve"
                  ? `Approve ${selected.size} task${selected.size === 1 ? "" : "s"}?`
                  : `Reject ${selected.size} task${selected.size === 1 ? "" : "s"}?`}
              </AlertDialogTitle>
              <AlertDialogDescription>
                This action is recorded in the audit log and cannot be undone
                without a reverse decision. Selected tasks will be{" "}
                {bulkDialog === "approve" ? "approved" : "rejected"}{" "}
                immediately.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() =>
                  runBulk(bulkDialog === "approve" ? "approved" : "rejected")
                }
                data-testid="approvals-bulk-confirm"
              >
                Confirm
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </section>
    </TooltipProvider>
  );
}
