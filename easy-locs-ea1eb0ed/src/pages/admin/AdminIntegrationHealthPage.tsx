import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useUiEngine } from "@/hooks/useUiEngine";
import { useAuth } from "@/contexts/AuthContext";
import SubPageShell from "@/components/layout/SubPageShell";
import { fetchIntegrationHealth, type IntegrationHealthResponse, type ServiceHealth } from "@/lib/api/integration-health";

const STATUS_COLORS: Record<string, string> = {
  ok: "bg-green-500",
  error: "bg-red-500",
  not_configured: "bg-yellow-500",
};

const STATUS_TEXT_COLORS: Record<string, string> = {
  ok: "text-green-400",
  error: "text-red-400",
  not_configured: "text-yellow-400",
};

const STATUS_LABELS: Record<string, string> = {
  ok: "Connected",
  error: "Unreachable",
  not_configured: "Not Configured",
};

const SERVICE_META: Record<string, { icon: string; label: string; description: string }> = {
  plaid: { icon: "🏦", label: "Plaid", description: "Banking & payment connectivity" },
  livekit: { icon: "📹", label: "LiveKit", description: "Real-time video & audio" },
  meilisearch: { icon: "🔍", label: "Meilisearch", description: "Search engine indexing" },
};

const POLL_INTERVAL_OPTIONS = [15, 30, 60, 120];

const STORAGE_BASE_AUTO_POLLING = "admin-integration-health-auto-polling";
const STORAGE_BASE_INTERVAL = "admin-integration-health-interval";

function userStorageKey(base: string, userId: string | undefined): string {
  return userId ? `${base}:${userId}` : base;
}

function storageGet(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function storageSet(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
  }
}

function CountdownRing({ seconds, total }: { seconds: number; total: number }) {
  const radius = 10;
  const circumference = 2 * Math.PI * radius;
  const progress = seconds / total;
  const offset = circumference * (1 - progress);

  return (
    <svg width="28" height="28" viewBox="0 0 28 28" className="shrink-0">
      <circle
        cx="14"
        cy="14"
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        className="text-muted/30"
      />
      <circle
        cx="14"
        cy="14"
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        className="text-blue-400 transition-[stroke-dashoffset] duration-1000 ease-linear"
        transform="rotate(-90 14 14)"
      />
      <text
        x="14"
        y="14"
        textAnchor="middle"
        dominantBaseline="central"
        className="fill-current text-muted-foreground"
        fontSize="8"
        fontFamily="monospace"
      >
        {seconds}
      </text>
    </svg>
  );
}

function ServiceCard({ name, health }: { name: string; health: ServiceHealth }) {
  const meta = SERVICE_META[name] ?? { icon: "⚙️", label: name, description: "" };
  const statusLabel = STATUS_LABELS[health.status] ?? health.status;
  const dotColor = STATUS_COLORS[health.status] ?? "bg-gray-500";
  const textColor = STATUS_TEXT_COLORS[health.status] ?? "text-gray-400";

  return (
    <div className="rounded-xl bg-card border border-border/20 p-4">
      <div className="flex items-center gap-3">
        <span className="text-2xl">{meta.icon}</span>
        <div className="flex-1">
          <div className="flex justify-between items-center">
            <span className="text-sm font-bold">{meta.label}</span>
            <div className="flex items-center gap-2">
              <span className={`text-xs font-medium ${textColor}`}>{statusLabel}</span>
              <div className={`w-2.5 h-2.5 rounded-full ${dotColor}`} />
            </div>
          </div>
          <div className="text-xs text-muted-foreground mt-0.5">{meta.description}</div>
        </div>
      </div>
      <div className="mt-3 space-y-1">
        {health.latencyMs !== undefined && (
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Latency</span>
            <span className="font-mono">{health.latencyMs}ms</span>
          </div>
        )}
        {health.version && (
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Version</span>
            <span className="font-mono">{health.version}</span>
          </div>
        )}
        {health.error && (
          <div className="mt-2 text-xs text-red-400 bg-red-500/10 rounded-lg p-2 font-mono break-all">
            {health.error}
          </div>
        )}
      </div>
    </div>
  );
}

export default function AdminIntegrationHealthPage() {
  useUiEngine("admin-integration-health");
  const navigate = useNavigate();
  const { user } = useAuth();
  const userId = user?.id;
  const pollingKey = userStorageKey(STORAGE_BASE_AUTO_POLLING, userId);
  const intervalKey = userStorageKey(STORAGE_BASE_INTERVAL, userId);
  const [data, setData] = useState<IntegrationHealthResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoPolling, setAutoPolling] = useState(() => {
    const stored = storageGet(pollingKey);
    return stored !== null ? stored === "true" : true;
  });
  const [intervalSeconds, setIntervalSeconds] = useState(() => {
    const stored = storageGet(intervalKey);
    if (stored !== null) {
      const parsed = Number(stored);
      if (POLL_INTERVAL_OPTIONS.includes(parsed)) return parsed;
    }
    return 30;
  });
  const [countdown, setCountdown] = useState(intervalSeconds);
  const refreshingRef = useRef(false);

  const refresh = useCallback(async (isAutomatic = false) => {
    if (isAutomatic && refreshingRef.current) return;
    refreshingRef.current = true;
    setLoading(true);
    setError(null);
    try {
      const result = await fetchIntegrationHealth();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch health status");
    } finally {
      setLoading(false);
      refreshingRef.current = false;
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const visibleRef = useRef(!document.hidden);

  useEffect(() => {
    storageSet(pollingKey, String(autoPolling));
  }, [autoPolling, pollingKey]);

  useEffect(() => {
    storageSet(intervalKey, String(intervalSeconds));
  }, [intervalSeconds, intervalKey]);

  useEffect(() => {
    if (!autoPolling) return;
    setCountdown(intervalSeconds);

    const handleVisibilityChange = () => {
      const nowVisible = !document.hidden;
      visibleRef.current = nowVisible;
      if (nowVisible) {
        setCountdown(intervalSeconds);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    const tickId = setInterval(() => {
      if (!visibleRef.current) return;

      setCountdown((prev) => {
        if (prev <= 1) {
          if (!refreshingRef.current) {
            refresh(true);
            return intervalSeconds;
          }
          return 1;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      clearInterval(tickId);
    };
  }, [autoPolling, intervalSeconds, refresh]);

  const handleManualRefresh = useCallback(() => {
    refresh();
    if (autoPolling) {
      setCountdown(intervalSeconds);
    }
  }, [refresh, autoPolling, intervalSeconds]);

  const overallColor = !data
    ? "text-muted-foreground"
    : data.status === "ok"
    ? "text-green-400"
    : data.status === "degraded"
    ? "text-red-400"
    : "text-yellow-400";

  const overallLabel = !data
    ? "Loading..."
    : data.status === "ok"
    ? "All Systems Operational"
    : data.status === "degraded"
    ? "Service Degradation Detected"
    : "Partial Configuration";

  return (
    <SubPageShell>
      <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/admin/lab-hub")} className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center">
            ←
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-bold">Integrations Lab</h1>
            <p className="text-xs text-muted-foreground">Plaid, LiveKit, Meilisearch status</p>
          </div>
          <div className="flex items-center gap-2">
            {autoPolling && (
              <CountdownRing seconds={countdown} total={intervalSeconds} />
            )}
            <button
              onClick={handleManualRefresh}
              disabled={loading}
              className="px-3 py-1.5 text-xs rounded-lg bg-muted hover:bg-muted/80 transition-colors disabled:opacity-50"
            >
              {loading ? "Checking..." : "Refresh"}
            </button>
          </div>
        </div>

        <div className="rounded-xl bg-card border border-border/20 p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setAutoPolling((p) => !p)}
                className={`relative w-8 h-[18px] rounded-full transition-colors ${
                  autoPolling ? "bg-blue-500" : "bg-muted"
                }`}
                aria-label="Toggle auto-polling"
              >
                <span
                  className={`absolute top-[2px] left-[2px] w-[14px] h-[14px] rounded-full bg-white transition-transform ${
                    autoPolling ? "translate-x-[14px]" : "translate-x-0"
                  }`}
                />
              </button>
              <span className="text-xs text-muted-foreground">
                Auto-refresh {autoPolling ? "on" : "off"}
              </span>
            </div>
            {autoPolling && (
              <div className="flex items-center gap-1">
                {POLL_INTERVAL_OPTIONS.map((opt) => (
                  <button
                    key={opt}
                    onClick={() => setIntervalSeconds(opt)}
                    className={`px-2 py-0.5 text-xs rounded-md transition-colors ${
                      intervalSeconds === opt
                        ? "bg-blue-500/20 text-blue-400 font-medium"
                        : "bg-muted/50 text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    {opt}s
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="rounded-xl bg-card border border-border/20 p-4">
          <div className="flex justify-between items-center">
            <div>
              <div className="text-xs text-muted-foreground">Overall Status</div>
              <div className={`text-lg font-bold ${overallColor}`}>{overallLabel}</div>
            </div>
            {data && (
              <div className="text-right">
                <div className="text-xs text-muted-foreground">Check Latency</div>
                <div className="text-sm font-mono">{data.latencyMs}ms</div>
              </div>
            )}
          </div>
          {data && (
            <div className="text-xs text-muted-foreground mt-2">
              Last checked: {new Date(data.timestamp).toLocaleString()}
            </div>
          )}
        </div>

        {error && (
          <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-4 text-sm text-red-400">
            {error}
          </div>
        )}

        {data && (
          <div className="space-y-2">
            {Object.entries(data.services).map(([name, health]) => (
              <ServiceCard key={name} name={name} health={health} />
            ))}
          </div>
        )}

        {loading && !data && (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="rounded-xl bg-card border border-border/20 p-4 animate-pulse">
                <div className="h-4 bg-muted rounded w-1/3 mb-2" />
                <div className="h-3 bg-muted rounded w-2/3" />
              </div>
            ))}
          </div>
        )}
      </div>
    </SubPageShell>
  );
}
