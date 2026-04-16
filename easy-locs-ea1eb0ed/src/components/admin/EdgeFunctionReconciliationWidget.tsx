import { useState, useEffect } from "react";
import { AppCard, CardContent, CardHeader, CardTitle } from "@/components/ui/AppCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Wifi,
  WifiOff,
  Zap,
  Hourglass,
} from "lucide-react";
import {
  fetchReconciliationStats,
  type ReconciliationStats,
} from "@/repositories/admin.repository";

const NAVY = "hsl(220 40% 18%)";
const GOLD = "hsl(38 65% 56%)";
const CELL_BG = "hsl(220 40% 22%)";

export default function EdgeFunctionReconciliationWidget() {
  const [stats, setStats] = useState<ReconciliationStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchReconciliationStats();
      setStats(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const successRate =
    stats && stats.total_dispatched_24h > 0
      ? Math.round((stats.confirmed_success / stats.total_dispatched_24h) * 100)
      : null;

  const status = !stats
    ? "unknown"
    : stats.total_dispatched_24h === 0
      ? "inactive"
      : stats.edge_function_error === 0 && stats.stale_no_response === 0
        ? "healthy"
        : stats.edge_function_error + stats.stale_no_response > stats.confirmed_success
          ? "critical"
          : "degraded";

  const statusColor = {
    healthy: "hsl(142 71% 45%)",
    degraded: "hsl(38 92% 50%)",
    critical: "hsl(0 80% 50%)",
    inactive: "hsl(0 0% 60%)",
    unknown: "hsl(0 0% 60%)",
  }[status];

  return (
    <AppCard style={{ background: NAVY, border: `1px solid ${GOLD}22` }}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-semibold text-white flex items-center gap-2">
          <Zap size={16} style={{ color: GOLD }} />
          Edge Function Reconciliation
        </CardTitle>
        <div className="flex items-center gap-2">
          <Badge
            className="text-[0.625rem]"
            style={{
              background: `${statusColor}22`,
              color: statusColor,
              border: `1px solid ${statusColor}44`,
            }}
          >
            {status.toUpperCase()}
          </Badge>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={load}
            disabled={loading}
          >
            <RefreshCw
              size={14}
              className={loading ? "animate-spin" : ""}
              style={{ color: GOLD }}
            />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {error && <div className="text-xs text-red-400 mb-3">{error}</div>}
        {stats && (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <StatCell
                icon={<Wifi size={12} style={{ color: GOLD }} />}
                label="Dispatched"
                value={stats.total_dispatched_24h}
                color="text-white"
              />
              <StatCell
                icon={<CheckCircle2 size={12} className="text-green-400" />}
                label="Confirmed"
                value={stats.confirmed_success}
                color="text-green-400"
              />
              <StatCell
                icon={<XCircle size={12} className="text-red-400" />}
                label="Failed"
                value={stats.edge_function_error}
                color="text-red-400"
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <StatCell
                icon={<WifiOff size={12} className="text-orange-400" />}
                label="Stale"
                value={stats.stale_no_response}
                color="text-orange-400"
              />
              <StatCell
                icon={<Hourglass size={12} className="text-yellow-400" />}
                label="Timeouts"
                value={stats.timeouts}
                color="text-yellow-400"
              />
              <StatCell
                icon={<AlertTriangle size={12} className="text-amber-400" />}
                label="Transport Err"
                value={stats.transport_errors}
                color="text-amber-400"
              />
            </div>

            {stats.pending_reconciliation > 0 && (
              <div
                className="rounded-xl p-2.5 flex items-center gap-2"
                style={{ background: CELL_BG }}
              >
                <Clock size={12} style={{ color: GOLD }} />
                <span className="text-[0.625rem] text-muted-foreground">
                  Pending reconciliation:
                </span>
                <span className="text-xs font-semibold text-white">
                  {stats.pending_reconciliation}
                </span>
              </div>
            )}

            {stats.http_errors.length > 0 && (
              <div className="rounded-xl p-2.5" style={{ background: CELL_BG }}>
                <div className="text-[0.625rem] text-muted-foreground mb-1.5">
                  HTTP Error Breakdown
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {stats.http_errors.map((he) => (
                    <span
                      key={he.status}
                      className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[0.625rem] font-medium"
                      style={{
                        background: he.status >= 500 ? "hsl(0 80% 50% / 0.15)" : "hsl(38 92% 50% / 0.15)",
                        color: he.status >= 500 ? "hsl(0 80% 60%)" : "hsl(38 92% 60%)",
                      }}
                    >
                      {he.status}: {he.count}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center justify-between text-[0.625rem] text-muted-foreground pt-1">
              {successRate !== null && (
                <span className="flex items-center gap-1">
                  <CheckCircle2 size={10} />
                  Success rate: {successRate}%
                </span>
              )}
              <span>
                Last dispatch reconciled:{" "}
                {stats.last_reconciled_at
                  ? new Date(stats.last_reconciled_at).toLocaleTimeString("fr-FR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "—"}
              </span>
            </div>
          </div>
        )}
        {!stats && !error && loading && (
          <div className="text-xs text-muted-foreground text-center py-4">
            Loading...
          </div>
        )}
      </CardContent>
    </AppCard>
  );
}

function StatCell({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="rounded-xl p-3" style={{ background: CELL_BG }}>
      <div className="flex items-center gap-1.5 mb-1">
        {icon}
        <span className="text-[0.625rem] text-muted-foreground">{label}</span>
      </div>
      <div className={`text-lg font-bold ${color}`}>{value}</div>
    </div>
  );
}
