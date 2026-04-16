import { useState, useEffect, useRef, useCallback } from "react";
import { useVisibilityAwareInterval } from "@/hooks/useVisibilityAwareInterval";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RefreshCw, Bell, Clock, AlertTriangle, CheckCircle2, XCircle, Activity, Zap } from "lucide-react";
import { fetchPrayerCronHealthRpc, type PrayerCronHealthRpc } from "@/repositories/admin.repository";

const NAVY = "hsl(220 40% 18%)";
const GOLD = "hsl(38 65% 56%)";
const AUTO_REFRESH_INTERVAL_S = 60;

const STATUS_CONFIG: Record<string, { color: string; bg: string; border: string; label: string }> = {
  healthy: { color: "hsl(142 71% 45%)", bg: "hsl(142 71% 45% / 0.12)", border: "hsl(142 71% 45% / 0.3)", label: "HEALTHY" },
  warning: { color: "hsl(38 92% 50%)", bg: "hsl(38 92% 50% / 0.12)", border: "hsl(38 92% 50% / 0.3)", label: "WARNING" },
  degraded: { color: "hsl(25 95% 53%)", bg: "hsl(25 95% 53% / 0.12)", border: "hsl(25 95% 53% / 0.3)", label: "DEGRADED" },
  critical: { color: "hsl(0 80% 50%)", bg: "hsl(0 80% 50% / 0.12)", border: "hsl(0 80% 50% / 0.3)", label: "CRITICAL" },
  unknown: { color: "hsl(0 0% 60%)", bg: "hsl(0 0% 60% / 0.12)", border: "hsl(0 0% 60% / 0.3)", label: "UNKNOWN" },
};

function formatRelativeTime(iso: string | null): string {
  if (!iso) return "Never";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function PrayerCronHealthWidget() {
  const [health, setHealth] = useState<PrayerCronHealthRpc | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const loadingRef = useRef(false);

  const load = useCallback(async (): Promise<boolean> => {
    if (loadingRef.current) return false;
    loadingRef.current = true;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchPrayerCronHealthRpc();
      setHealth(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load prayer cron health");
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
    return true;
  }, []);

  useEffect(() => { load(); }, [load]);

  const { countdown: secondsUntilRefresh, isVisible } = useVisibilityAwareInterval(
    () => { if (!loadingRef.current) load(); },
    AUTO_REFRESH_INTERVAL_S
  );

  const cfg = health ? (STATUS_CONFIG[health.status] ?? STATUS_CONFIG.unknown) : STATUS_CONFIG.unknown;
  const failureRate = health && health.total_24h_runs > 0
    ? ((health.failures_24h / health.total_24h_runs) * 100).toFixed(1)
    : "0.0";

  const countdownProgress = Math.min(1, Math.max(0, secondsUntilRefresh / AUTO_REFRESH_INTERVAL_S));
  const circumference = 2 * Math.PI * 6;

  return (
    <Card style={{ background: NAVY, border: `1px solid ${GOLD}22` }}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-semibold text-white flex items-center gap-2">
          <Bell size={16} style={{ color: GOLD }} />
          Prayer Cron Health
        </CardTitle>
        <div className="flex items-center gap-2">
          {health && (
            <Badge
              className="text-[10px] font-bold tracking-wide"
              style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}
            >
              <span
                className="inline-block w-1.5 h-1.5 rounded-full mr-1.5"
                style={{ background: cfg.color }}
              />
              {cfg.label}
            </Badge>
          )}
          <div className="relative flex items-center justify-center">
            <svg
              width="28"
              height="28"
              viewBox="0 0 28 28"
              className="absolute"
              style={{ transform: "rotate(-90deg)" }}
            >
              <circle
                cx="14"
                cy="14"
                r="6"
                fill="none"
                stroke={`${GOLD}33`}
                strokeWidth="1.5"
              />
              <circle
                cx="14"
                cy="14"
                r="6"
                fill="none"
                stroke={GOLD}
                strokeWidth="1.5"
                strokeDasharray={circumference}
                strokeDashoffset={circumference * countdownProgress}
                strokeLinecap="round"
                style={{ transition: "stroke-dashoffset 1s linear" }}
              />
            </svg>
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={load} disabled={loading}>
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} style={{ color: GOLD }} />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="text-xs text-red-400 mb-3 flex items-center gap-1.5">
            <AlertTriangle size={12} />
            {error}
          </div>
        )}
        {health && (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-xl p-3" style={{ background: "hsl(220 40% 22%)" }}>
                <div className="flex items-center gap-1.5 mb-1">
                  <XCircle size={12} className="text-red-400" />
                  <span className="text-[10px] text-muted-foreground">Consecutive Failures</span>
                </div>
                <div className="text-lg font-bold" style={{ color: health.consecutive_failures > 0 ? "hsl(0 80% 60%)" : "white" }}>
                  {health.consecutive_failures}
                </div>
              </div>
              <div className="rounded-xl p-3" style={{ background: "hsl(220 40% 22%)" }}>
                <div className="flex items-center gap-1.5 mb-1">
                  <Clock size={12} style={{ color: GOLD }} />
                  <span className="text-[10px] text-muted-foreground">Last Success</span>
                </div>
                <div className="text-sm font-bold text-white truncate" title={health.last_success ?? "Never"}>
                  {formatRelativeTime(health.last_success)}
                </div>
              </div>
              <div className="rounded-xl p-3" style={{ background: "hsl(220 40% 22%)" }}>
                <div className="flex items-center gap-1.5 mb-1">
                  <Activity size={12} style={{ color: GOLD }} />
                  <span className="text-[10px] text-muted-foreground">Failure Rate (24h)</span>
                </div>
                <div className="text-lg font-bold" style={{ color: Number(failureRate) > 10 ? "hsl(38 92% 50%)" : "white" }}>
                  {failureRate}%
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-xl p-3" style={{ background: "hsl(220 40% 22%)" }}>
                <div className="flex items-center gap-1.5 mb-1">
                  <CheckCircle2 size={12} className="text-green-400" />
                  <span className="text-[10px] text-muted-foreground">Total Runs (24h)</span>
                </div>
                <div className="text-lg font-bold text-white">{health.total_24h_runs}</div>
              </div>
              <div className="rounded-xl p-3" style={{ background: "hsl(220 40% 22%)" }}>
                <div className="flex items-center gap-1.5 mb-1">
                  <XCircle size={12} className="text-red-400" />
                  <span className="text-[10px] text-muted-foreground">Failures (24h)</span>
                </div>
                <div className="text-lg font-bold text-red-400">{health.failures_24h}</div>
              </div>
              <div className="rounded-xl p-3" style={{ background: "hsl(220 40% 22%)" }}>
                <div className="flex items-center gap-1.5 mb-1">
                  <Zap size={12} className="text-orange-400" />
                  <span className="text-[10px] text-muted-foreground">Edge Fn Failures</span>
                </div>
                <div className="text-lg font-bold text-orange-400">{health.edge_function_failures_24h}</div>
              </div>
            </div>

            {(health.status === "critical" || health.status === "degraded") && (
              <div
                className="rounded-lg px-3 py-2 text-xs flex items-center gap-2"
                style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}
              >
                <AlertTriangle size={14} />
                <span>
                  {health.status === "critical"
                    ? `Critical: ${health.consecutive_failures} consecutive failures detected. Immediate attention required.`
                    : `Degraded: ${health.consecutive_failures} consecutive failures. Investigate soon.`}
                </span>
              </div>
            )}

            <div className="flex items-center justify-end gap-1.5">
              <span className="text-[10px] text-muted-foreground">
                {!isVisible
                  ? "Auto-refresh paused"
                  : loading
                    ? "Refreshing\u2026"
                    : `Auto-refresh in ${secondsUntilRefresh}s`}
              </span>
              {!isVisible && (
                <span
                  className="inline-block w-1.5 h-1.5 rounded-full"
                  style={{ background: "hsl(0 0% 50%)" }}
                />
              )}
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
