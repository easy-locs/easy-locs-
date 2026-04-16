import { useState, useEffect, useCallback, useMemo } from "react";
import SubPageShell from "@/components/layout/SubPageShell";
import {
  listConnectors,
  calculatePulse,
  getSyncHistory,
  type ApiConnector,
  type GatewayPulse,
  type SyncRecord,
  type ConnectorStatus,
} from "@/lib/api-gateway";
import { bootApiGateway, isGatewayBooted } from "@/lib/api-gateway";
import { orchestrationEngine } from "@/lib/api-gateway";
import { getRecentCorrelations } from "@/lib/api-gateway";

const STATUS_COLORS: Record<ConnectorStatus, string> = {
  connected: "bg-green-500",
  degraded: "bg-yellow-500",
  offline: "bg-red-500",
  pending: "bg-blue-400",
};

const STATUS_TEXT_COLORS: Record<ConnectorStatus, string> = {
  connected: "text-green-400",
  degraded: "text-yellow-400",
  offline: "text-red-400",
  pending: "text-blue-400",
};

const STATUS_LABELS: Record<ConnectorStatus, string> = {
  connected: "Connected",
  degraded: "Degraded",
  offline: "Offline",
  pending: "Pending",
};

const DOMAIN_ICONS: Record<string, string> = {
  real_estate: "🏢",
  food_delivery: "🍕",
  weather: "🌤️",
  news: "📰",
  forex: "💱",
  prayer: "🕌",
  government: "🏛️",
  social: "👥",
  market: "📊",
  transport: "🚗",
  custom: "⚙️",
};

function formatMs(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)}ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
  if (ms < 3_600_000) return `${Math.round(ms / 60_000)}m`;
  return `${(ms / 3_600_000).toFixed(1)}h`;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1_048_576) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / 1_048_576).toFixed(1)}MB`;
}

function formatTime(ts: number | null): string {
  if (!ts) return "Never";
  const diff = Date.now() - ts;
  if (diff < 60_000) return "Just now";
  if (diff < 3_600_000) return `${Math.round(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.round(diff / 3_600_000)}h ago`;
  return new Date(ts).toLocaleDateString();
}

function PulseScore({ pulse }: { pulse: GatewayPulse }) {
  const color = pulse.score >= 80 ? "text-green-400" : pulse.score >= 50 ? "text-yellow-400" : "text-red-400";
  const ringColor = pulse.score >= 80 ? "stroke-green-500" : pulse.score >= 50 ? "stroke-yellow-500" : "stroke-red-500";
  const circumference = 2 * Math.PI * 54;
  const offset = circumference - (pulse.score / 100) * circumference;

  return (
    <div className="rounded-2xl bg-card border border-border/20 p-6">
      <div className="flex items-center gap-6">
        <div className="relative w-32 h-32">
          <svg className="w-32 h-32 -rotate-90" viewBox="0 0 120 120">
            <circle cx="60" cy="60" r="54" fill="none" stroke="currentColor" strokeWidth="8" className="text-border/20" />
            <circle cx="60" cy="60" r="54" fill="none" strokeWidth="8" strokeLinecap="round"
              className={ringColor}
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              style={{ transition: "stroke-dashoffset 1s ease" }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={`text-3xl font-black ${color}`}>{pulse.score}</span>
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Pulse</span>
          </div>
        </div>
        <div className="flex-1 grid grid-cols-2 gap-3">
          <StatMini label="Total Sources" value={pulse.totalConnectors} />
          <StatMini label="Connected" value={pulse.connectedCount} color="text-green-400" />
          <StatMini label="Degraded" value={pulse.degradedCount} color="text-yellow-400" />
          <StatMini label="Offline" value={pulse.offlineCount} color="text-red-400" />
          <StatMini label="Syncs (24h)" value={pulse.totalSyncsLast24h} />
          <StatMini label="Records (24h)" value={pulse.totalRecordsLast24h} />
          <StatMini label="Avg Response" value={`${pulse.avgResponseTimeMs}ms`} />
          <StatMini label="Error Rate" value={`${(pulse.overallErrorRate * 100).toFixed(1)}%`} />
        </div>
      </div>
    </div>
  );
}

function StatMini({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <div>
      <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</div>
      <div className={`text-sm font-bold ${color ?? ""}`}>{value}</div>
    </div>
  );
}

function ConnectorCard({
  connector,
  onSync,
  syncing,
}: {
  connector: ApiConnector;
  onSync: (id: string) => void;
  syncing: boolean;
}) {
  const { config, health } = connector;
  const metrics = connector.getMetrics();
  const icon = DOMAIN_ICONS[config.domain] ?? "⚙️";
  const statusColor = STATUS_COLORS[health.status];
  const statusTextColor = STATUS_TEXT_COLORS[health.status];
  const statusLabel = STATUS_LABELS[health.status];

  return (
    <div className="rounded-xl bg-card border border-border/20 p-4 hover:border-border/40 transition-colors">
      <div className="flex items-start gap-3">
        <span className="text-2xl mt-0.5">{icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-bold truncate">{config.name}</h3>
            <div className="flex items-center gap-1.5 shrink-0">
              <span className={`text-xs font-medium ${statusTextColor}`}>{statusLabel}</span>
              <div className={`w-2 h-2 rounded-full ${statusColor} ${health.status === "connected" ? "animate-pulse" : ""}`} />
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{config.description}</p>

          <div className="grid grid-cols-3 gap-2 mt-3">
            <div>
              <div className="text-[10px] text-muted-foreground">Last Sync</div>
              <div className="text-xs font-mono">{formatTime(metrics.lastSyncAt)}</div>
            </div>
            <div>
              <div className="text-[10px] text-muted-foreground">Response</div>
              <div className="text-xs font-mono">{health.avgResponseTimeMs > 0 ? `${health.avgResponseTimeMs}ms` : "—"}</div>
            </div>
            <div>
              <div className="text-[10px] text-muted-foreground">Records</div>
              <div className="text-xs font-mono">{metrics.totalRecords.toLocaleString()}</div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 mt-1.5">
            <div>
              <div className="text-[10px] text-muted-foreground">Syncs</div>
              <div className="text-xs font-mono">{metrics.totalSyncs}</div>
            </div>
            <div>
              <div className="text-[10px] text-muted-foreground">Errors</div>
              <div className="text-xs font-mono">{metrics.totalErrors}</div>
            </div>
            <div>
              <div className="text-[10px] text-muted-foreground">Data</div>
              <div className="text-xs font-mono">{formatBytes(metrics.totalBytesReceived)}</div>
            </div>
          </div>

          <QuotaBar connector={connector} />

          {health.lastError && (
            <div className="mt-2 p-2 rounded bg-red-500/10 border border-red-500/20">
              <div className="text-[10px] text-red-400 font-mono truncate">{health.lastError}</div>
            </div>
          )}

          <div className="flex items-center justify-between mt-3">
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
              <span className="px-1.5 py-0.5 rounded bg-muted/50 uppercase">{config.type}</span>
              <span className="px-1.5 py-0.5 rounded bg-muted/50">Every {formatMs(config.pollingIntervalMs)}</span>
              {config.fallbackConnectorId && (
                <span className="px-1.5 py-0.5 rounded bg-yellow-500/10 text-yellow-400">Fallback</span>
              )}
            </div>
            <button
              onClick={() => onSync(config.id)}
              disabled={syncing}
              className="text-[10px] px-2 py-1 rounded bg-primary/10 text-primary hover:bg-primary/20 transition-colors disabled:opacity-50"
            >
              {syncing ? "Syncing..." : "Sync Now"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function CorrelationCard({ signal }: { signal: { type: string; title: string; description: string; confidence: number; sources: string[]; timestamp: number } }) {
  const typeColors: Record<string, string> = {
    opportunity: "text-green-400 bg-green-500/10",
    risk: "text-red-400 bg-red-500/10",
    trend: "text-blue-400 bg-blue-500/10",
    anomaly: "text-yellow-400 bg-yellow-500/10",
  };
  const colorClass = typeColors[signal.type] ?? "text-muted-foreground bg-muted/50";

  return (
    <div className="rounded-lg bg-card border border-border/20 p-3">
      <div className="flex items-start gap-2">
        <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium uppercase ${colorClass}`}>
          {signal.type}
        </span>
        <div className="flex-1">
          <div className="text-xs font-bold">{signal.title}</div>
          <div className="text-[11px] text-muted-foreground mt-0.5">{signal.description}</div>
          <div className="flex items-center gap-2 mt-1.5 text-[10px] text-muted-foreground">
            <span>Confidence: {Math.round(signal.confidence * 100)}%</span>
            <span>{formatTime(signal.timestamp)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function ResponseTimeTrend({ connectorId }: { connectorId: string }) {
  const history = getSyncHistory(connectorId);
  const recent = history
    .filter((s) => s.success && s.durationMs > 0)
    .slice(-20);

  if (recent.length < 2) {
    return <div className="text-[10px] text-muted-foreground">Not enough data for trend</div>;
  }

  const maxDuration = Math.max(...recent.map((s) => s.durationMs));
  const barHeight = 24;

  return (
    <div className="flex items-end gap-px h-7">
      {recent.map((s, i) => {
        const pct = maxDuration > 0 ? (s.durationMs / maxDuration) * 100 : 0;
        const color = s.durationMs < 1000 ? "bg-green-500" : s.durationMs < 3000 ? "bg-yellow-500" : "bg-red-500";
        return (
          <div
            key={i}
            className={`${color} rounded-t min-w-[3px] flex-1 opacity-70`}
            style={{ height: `${Math.max(pct, 8)}%`, maxHeight: barHeight }}
            title={`${formatMs(s.durationMs)} at ${new Date(s.syncedAt).toLocaleTimeString()}`}
          />
        );
      })}
    </div>
  );
}

function QuotaBar({ connector }: { connector: ApiConnector }) {
  const config = connector.config;
  const now = Date.now();
  const history = getSyncHistory(config.id);
  const last24h = history.filter((s) => now - s.syncedAt < 86_400_000);
  const syncsLast24h = last24h.length;
  const maxSyncsPerDay = Math.floor(86_400_000 / config.pollingIntervalMs);
  const quotaPct = maxSyncsPerDay > 0 ? Math.min((syncsLast24h / maxSyncsPerDay) * 100, 100) : 0;
  const quotaColor = quotaPct < 70 ? "bg-green-500" : quotaPct < 90 ? "bg-yellow-500" : "bg-red-500";

  return (
    <div className="mt-2">
      <div className="flex justify-between text-[10px] text-muted-foreground mb-0.5">
        <span>Quota ({syncsLast24h}/{maxSyncsPerDay} syncs/day)</span>
        <span>{Math.round(quotaPct)}%</span>
      </div>
      <div className="h-1.5 bg-muted/30 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${quotaColor} transition-all`}
          style={{ width: `${quotaPct}%` }}
        />
      </div>
    </div>
  );
}

function SyncHistorySection({ connectorId }: { connectorId: string | null }) {
  const history = connectorId ? getSyncHistory(connectorId) : [];
  const recent = history.slice(-10).reverse();

  if (recent.length === 0) {
    return (
      <div className="text-xs text-muted-foreground text-center py-4">
        No sync history yet. Select a connector to view history.
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {connectorId && (
        <div className="mb-3">
          <div className="text-[10px] text-muted-foreground mb-1">Response Time Trend</div>
          <ResponseTimeTrend connectorId={connectorId} />
        </div>
      )}
      {recent.map((sync, i) => (
        <div key={i} className="flex items-center justify-between text-xs py-1.5 px-2 rounded bg-muted/30">
          <div className="flex items-center gap-2">
            <div className={`w-1.5 h-1.5 rounded-full ${sync.success ? "bg-green-500" : "bg-red-500"}`} />
            <span className="font-mono">{new Date(sync.syncedAt).toLocaleTimeString()}</span>
          </div>
          <div className="flex items-center gap-3 text-muted-foreground">
            <span>{sync.recordCount} records</span>
            <span>{formatMs(sync.durationMs)}</span>
            <span>{formatBytes(sync.bytesReceived)}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function StatementDashboardPage() {
  const [connectors, setConnectors] = useState<ApiConnector[]>([]);
  const [pulse, setPulse] = useState<GatewayPulse | null>(null);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [selectedConnector, setSelectedConnector] = useState<string | null>(null);
  const [filter, setFilter] = useState<ConnectorStatus | "all">("all");
  const [refreshKey, setRefreshKey] = useState(0);
  const [syncError, setSyncError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!isGatewayBooted()) {
      bootApiGateway();
    }
    await orchestrationEngine.refreshFromDb();
    setConnectors(listConnectors());
    setPulse(calculatePulse());
  }, []);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 15_000);
    return () => clearInterval(interval);
  }, [refresh, refreshKey]);

  const handleSync = useCallback(async (id: string) => {
    setSyncingId(id);
    setSyncError(null);
    try {
      const result = await orchestrationEngine.triggerServerSync(id);
      if (!result.success) {
        setSyncError(result.error ?? "Sync failed");
      }
      await new Promise((r) => setTimeout(r, 1500));
      await refresh();
    } finally {
      setSyncingId(null);
    }
  }, [refresh]);

  const handleSyncAll = useCallback(async () => {
    setSyncingId("__all__");
    setSyncError(null);
    try {
      const result = await orchestrationEngine.triggerServerSync();
      if (!result.success) {
        setSyncError(result.error ?? "Sync failed");
      }
      await new Promise((r) => setTimeout(r, 2000));
      await refresh();
    } finally {
      setSyncingId(null);
    }
  }, [refresh]);

  const filteredConnectors = useMemo(() => {
    if (filter === "all") return connectors;
    return connectors.filter((c) => c.health.status === filter);
  }, [connectors, filter]);

  const correlations = getRecentCorrelations();

  return (
    <SubPageShell title="The Statement" subtitle="API Intelligence Gateway" backTo="/admin/lab-hub">
      <div className="space-y-6 pb-24">
        {pulse && <PulseScore pulse={pulse} />}

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold">Data Sources</h2>
            <span className="text-xs text-muted-foreground">({connectors.length} registered)</span>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as ConnectorStatus | "all")}
              className="text-xs bg-muted/50 border border-border/20 rounded px-2 py-1"
            >
              <option value="all">All</option>
              <option value="connected">Connected</option>
              <option value="degraded">Degraded</option>
              <option value="offline">Offline</option>
              <option value="pending">Pending</option>
            </select>
            <button
              onClick={handleSyncAll}
              disabled={syncingId !== null}
              className="text-xs px-3 py-1.5 rounded bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {syncingId === "__all__" ? "Syncing All..." : "Sync All"}
            </button>
            <button
              onClick={() => setRefreshKey((k) => k + 1)}
              className="text-xs px-3 py-1.5 rounded bg-muted/50 hover:bg-muted transition-colors"
            >
              Refresh
            </button>
          </div>
        </div>

        {syncError && (
          <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2 text-xs text-red-400">
            Sync error: {syncError}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filteredConnectors.map((connector) => (
            <div key={connector.config.id} onClick={() => setSelectedConnector(connector.config.id)} className="cursor-pointer">
              <ConnectorCard
                connector={connector}
                onSync={handleSync}
                syncing={syncingId === connector.config.id}
              />
            </div>
          ))}
        </div>

        {filteredConnectors.length === 0 && (
          <div className="text-center text-muted-foreground py-12">
            No connectors match the selected filter.
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="rounded-2xl bg-card border border-border/20 p-4">
            <h3 className="text-sm font-bold mb-3">Sync History</h3>
            <SyncHistorySection connectorId={selectedConnector} />
          </div>

          <div className="rounded-2xl bg-card border border-border/20 p-4">
            <h3 className="text-sm font-bold mb-3">Intelligence Correlations</h3>
            {correlations.length > 0 ? (
              <div className="space-y-2">
                {correlations.slice(-5).reverse().map((signal, i) => (
                  <CorrelationCard key={i} signal={signal} />
                ))}
              </div>
            ) : (
              <div className="text-xs text-muted-foreground text-center py-4">
                No correlations detected yet. Data from multiple sources will be analyzed automatically.
              </div>
            )}
          </div>
        </div>

        <div className="rounded-2xl bg-card border border-border/20 p-4">
          <h3 className="text-sm font-bold mb-3">Connector Configuration</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-muted-foreground border-b border-border/20">
                  <th className="pb-2 pr-4">Source</th>
                  <th className="pb-2 pr-4">Type</th>
                  <th className="pb-2 pr-4">Domain</th>
                  <th className="pb-2 pr-4">Auth</th>
                  <th className="pb-2 pr-4">Interval</th>
                  <th className="pb-2 pr-4">Timeout</th>
                  <th className="pb-2 pr-4">Fallback</th>
                  <th className="pb-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {connectors.map((c) => (
                  <tr key={c.config.id} className="border-b border-border/10">
                    <td className="py-2 pr-4 font-medium">{c.config.name}</td>
                    <td className="py-2 pr-4 uppercase text-muted-foreground">{c.config.type}</td>
                    <td className="py-2 pr-4">{c.config.domain}</td>
                    <td className="py-2 pr-4 text-muted-foreground">{c.config.authMethod}</td>
                    <td className="py-2 pr-4 font-mono">{formatMs(c.config.pollingIntervalMs)}</td>
                    <td className="py-2 pr-4 font-mono">{formatMs(c.config.timeoutMs ?? 10_000)}</td>
                    <td className="py-2 pr-4">{c.config.fallbackConnectorId ? "Yes" : "—"}</td>
                    <td className="py-2">
                      <span className={`${STATUS_TEXT_COLORS[c.health.status]} font-medium`}>
                        {STATUS_LABELS[c.health.status]}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-xl bg-muted/30 border border-border/10 p-4">
          <h3 className="text-sm font-bold mb-2">Add New Data Source</h3>
          <p className="text-xs text-muted-foreground">
            New API connectors can be added by creating a connector config and registering it with the gateway.
            Use the <code className="px-1 py-0.5 bg-muted rounded text-primary">GenericRestConnector</code> template
            or extend <code className="px-1 py-0.5 bg-muted rounded text-primary">BaseConnector</code> for custom sources.
            Supports REST, Webhook, RSS, GraphQL, and Scraper types — no architectural changes needed.
          </p>
        </div>
      </div>
    </SubPageShell>
  );
}
