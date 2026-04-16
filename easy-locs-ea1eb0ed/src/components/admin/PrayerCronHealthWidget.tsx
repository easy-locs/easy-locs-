import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RefreshCw, CheckCircle2, XCircle, Bell, Clock, Activity } from "lucide-react";
import { fetchPrayerCronHealth, type PrayerCronHealth } from "@/repositories/admin.repository";

const NAVY = "hsl(220 40% 18%)";
const GOLD = "hsl(38 65% 56%)";

export default function PrayerCronHealthWidget() {
  const [health, setHealth] = useState<PrayerCronHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchPrayerCronHealth();
      setHealth(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const status = !health
    ? "unknown"
    : health.failure_count === 0 && health.total_runs_24h > 0
    ? "healthy"
    : health.failure_count > 0 && health.failure_count < health.total_runs_24h
    ? "degraded"
    : health.total_runs_24h === 0
    ? "inactive"
    : "critical";

  const statusColor = {
    healthy: "hsl(142 71% 45%)",
    degraded: "hsl(38 92% 50%)",
    critical: "hsl(0 80% 50%)",
    inactive: "hsl(0 0% 60%)",
    unknown: "hsl(0 0% 60%)",
  }[status];

  return (
    <Card style={{ background: NAVY, border: `1px solid ${GOLD}22` }}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-semibold text-white flex items-center gap-2">
          <Bell size={16} style={{ color: GOLD }} />
          Prayer Notifications Health
        </CardTitle>
        <div className="flex items-center gap-2">
          <Badge
            className="text-[10px]"
            style={{ background: `${statusColor}22`, color: statusColor, border: `1px solid ${statusColor}44` }}
          >
            {status.toUpperCase()}
          </Badge>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={load} disabled={loading}>
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} style={{ color: GOLD }} />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="text-xs text-red-400 mb-3">{error}</div>
        )}
        {health && (
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl p-3" style={{ background: "hsl(220 40% 22%)" }}>
              <div className="flex items-center gap-1.5 mb-1">
                <Activity size={12} style={{ color: GOLD }} />
                <span className="text-[10px] text-muted-foreground">Runs (24h)</span>
              </div>
              <div className="text-lg font-bold text-white">{health.total_runs_24h}</div>
            </div>
            <div className="rounded-xl p-3" style={{ background: "hsl(220 40% 22%)" }}>
              <div className="flex items-center gap-1.5 mb-1">
                <Bell size={12} style={{ color: GOLD }} />
                <span className="text-[10px] text-muted-foreground">Sent (24h)</span>
              </div>
              <div className="text-lg font-bold text-white">{health.notifications_sent_24h}</div>
            </div>
            <div className="rounded-xl p-3" style={{ background: "hsl(220 40% 22%)" }}>
              <div className="flex items-center gap-1.5 mb-1">
                <CheckCircle2 size={12} className="text-green-400" />
                <span className="text-[10px] text-muted-foreground">Success</span>
              </div>
              <div className="text-lg font-bold text-green-400">{health.success_count}</div>
            </div>
            <div className="rounded-xl p-3" style={{ background: "hsl(220 40% 22%)" }}>
              <div className="flex items-center gap-1.5 mb-1">
                <XCircle size={12} className="text-red-400" />
                <span className="text-[10px] text-muted-foreground">Failed</span>
              </div>
              <div className="text-lg font-bold text-red-400">{health.failure_count}</div>
            </div>
            <div className="col-span-2 flex items-center justify-between text-[10px] text-muted-foreground pt-1">
              <span className="flex items-center gap-1">
                <Clock size={10} />
                Avg: {health.avg_duration_ms}ms
              </span>
              <span>
                Last: {health.last_run ? new Date(health.last_run).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }) : "—"}
                {health.last_status && (
                  <span style={{ color: health.last_status === "success" ? "hsl(142 71% 45%)" : "hsl(0 80% 50%)", marginLeft: 4 }}>
                    ({health.last_status})
                  </span>
                )}
              </span>
            </div>
          </div>
        )}
        {!health && !error && loading && (
          <div className="text-xs text-muted-foreground text-center py-4">Loading...</div>
        )}
      </CardContent>
    </Card>
  );
}
