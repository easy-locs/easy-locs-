import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import SubPageShell from "@/components/layout/SubPageShell";
import {
  getAllIntegrationHealth,
  type IntegrationHealthEntry,
} from "@/lib/integrations";

function StatusDot({ ok, neutral }: { ok: boolean; neutral?: boolean }) {
  const cls = neutral ? "bg-yellow-500" : ok ? "bg-green-500" : "bg-red-500";
  return <span className={`inline-block w-2.5 h-2.5 rounded-full ${cls}`} />;
}

function EnvRow({ name, present }: { name: string; present: boolean }) {
  return (
    <div className="flex items-center justify-between text-xs py-0.5">
      <span className="font-mono text-muted-foreground">{name}</span>
      <span className={present ? "text-green-400" : "text-red-400"}>
        {present ? "set" : "missing"}
      </span>
    </div>
  );
}

function IntegrationCard({ entry }: { entry: IntegrationHealthEntry }) {
  const { health } = entry;
  const neutral = health.ok && !!health.reason;
  const requiredEnvKeys = Object.keys(entry.envPresence);
  const optionalEnvKeys = Object.keys(entry.optionalEnvPresence);

  return (
    <div className="rounded-xl bg-card border border-border/20 p-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-bold">{entry.label}</div>
          <div className="text-xs text-muted-foreground">{entry.description}</div>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`text-xs font-medium ${
              neutral ? "text-yellow-400" : health.ok ? "text-green-400" : "text-red-400"
            }`}
          >
            {neutral ? "Informational" : health.ok ? "Healthy" : "Unhealthy"}
          </span>
          <StatusDot ok={health.ok} neutral={neutral} />
        </div>
      </div>

      {health.reason && (
        <div
          className={`mt-2 text-xs rounded-lg p-2 ${
            health.ok
              ? "bg-yellow-500/10 text-yellow-400"
              : "bg-red-500/10 text-red-400"
          }`}
        >
          {health.reason}
        </div>
      )}

      {requiredEnvKeys.length > 0 && (
        <div className="mt-3">
          <div className="text-xs uppercase text-muted-foreground mb-1">Required env</div>
          {requiredEnvKeys.map((k) => (
            <EnvRow key={k} name={k} present={entry.envPresence[k]} />
          ))}
        </div>
      )}

      {entry.requiredAnyOfPresence.length > 0 && (
        <div className="mt-3">
          <div className="text-xs uppercase text-muted-foreground mb-1">Required (any of)</div>
          {entry.requiredAnyOfPresence.map((group) => (
            <EnvRow
              key={group.names.join("|")}
              name={group.names.join(" | ")}
              present={group.satisfied}
            />
          ))}
        </div>
      )}

      {optionalEnvKeys.length > 0 && (
        <div className="mt-3">
          <div className="text-xs uppercase text-muted-foreground mb-1">Optional env</div>
          {optionalEnvKeys.map((k) => (
            <EnvRow key={k} name={k} present={entry.optionalEnvPresence[k]} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function AdminClientIntegrationDiagnosticsPage() {
  const navigate = useNavigate();
  const [entries, setEntries] = useState<IntegrationHealthEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [checkedAt, setCheckedAt] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const all = await getAllIntegrationHealth();
      setEntries(all);
      setCheckedAt(new Date().toISOString());
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const unhealthy = entries.filter((e) => !e.health.ok).length;

  return (
    <SubPageShell>
      <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center"
          >
            ←
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-bold">Integration Diagnostics</h1>
            <p className="text-xs text-muted-foreground">
              Client-side health for Supabase, Map, AWS, Sentry, PostHog & Capacitor
            </p>
          </div>
          <button
            onClick={refresh}
            disabled={loading}
            className="px-3 py-1.5 text-xs rounded-lg bg-muted hover:bg-muted/80 disabled:opacity-50"
          >
            {loading ? "Checking..." : "Refresh"}
          </button>
        </div>

        <div className="rounded-xl bg-card border border-border/20 p-4">
          <div className="flex justify-between items-center">
            <div>
              <div className="text-xs text-muted-foreground">Overall</div>
              <div
                className={`text-lg font-bold ${
                  unhealthy === 0 ? "text-green-400" : "text-red-400"
                }`}
              >
                {entries.length === 0
                  ? "Loading..."
                  : unhealthy === 0
                  ? "All Integrations Healthy"
                  : `${unhealthy} Integration${unhealthy === 1 ? "" : "s"} Unhealthy`}
              </div>
            </div>
            {checkedAt && (
              <div className="text-right text-xs text-muted-foreground">
                Last checked
                <div className="font-mono">{new Date(checkedAt).toLocaleTimeString()}</div>
              </div>
            )}
          </div>
        </div>

        {error && (
          <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-4 text-sm text-red-400">
            {error}
          </div>
        )}

        <div className="space-y-2">
          {entries.map((entry) => (
            <IntegrationCard key={entry.id} entry={entry} />
          ))}
        </div>
      </div>
    </SubPageShell>
  );
}
