import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useUiEngine } from "@/hooks/useUiEngine";
import SubPageShell from "@/components/layout/SubPageShell";
import { db } from "@/services/db";

type ExperimentStatus = "draft" | "running" | "concluded" | "archived";

interface Experiment {
  id: string;
  name: string;
  description: string;
  status: ExperimentStatus;
  startDate: string | null;
  endDate: string | null;
  variants: ExperimentVariant[];
  winner: string | null;
}

interface ExperimentVariant {
  id: string;
  name: string;
  weight: number;
  participants: number;
  conversions: number;
  conversionRate: number;
}

interface FeatureFlagRow {
  id: string;
  flag_key: string;
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

function chiSquaredSignificance(variants: ExperimentVariant[]): { significant: boolean; pValue: number } {
  if (variants.length < 2) return { significant: false, pValue: 1 };
  const totalParticipants = variants.reduce((s, v) => s + v.participants, 0);
  const totalConversions = variants.reduce((s, v) => s + v.conversions, 0);
  if (totalParticipants === 0) return { significant: false, pValue: 1 };
  const expectedRate = totalConversions / totalParticipants;

  let chiSq = 0;
  for (const v of variants) {
    if (v.participants === 0) continue;
    const expectedConv = v.participants * expectedRate;
    const expectedNonConv = v.participants * (1 - expectedRate);
    if (expectedConv > 0) chiSq += Math.pow(v.conversions - expectedConv, 2) / expectedConv;
    if (expectedNonConv > 0) chiSq += Math.pow((v.participants - v.conversions) - expectedNonConv, 2) / expectedNonConv;
  }

  const df = variants.length - 1;
  const criticalValue = df === 1 ? 3.841 : 5.991;
  const significant = chiSq > criticalValue;
  const pValue = significant ? Math.max(0.001, 1 / (1 + chiSq)) : Math.min(1, 1 / (1 + chiSq * 0.1));
  return { significant, pValue };
}

async function loadFeatureFlags(): Promise<FeatureFlagRow[]> {
  try {
    const { data } = await db
      .from("system_feature_flags")
      .select("*")
      .order("created_at", { ascending: false });
    return (data as unknown as FeatureFlagRow[]) || [];
  } catch {
    return [];
  }
}

const EXPERIMENTS_STORAGE_KEY = "el_experiments";

function loadStoredExperiments(): Experiment[] {
  try {
    const raw = localStorage.getItem(EXPERIMENTS_STORAGE_KEY);
    if (raw) return JSON.parse(raw) as Experiment[];
  } catch {}
  return [];
}

function saveExperiments(experiments: Experiment[]): void {
  localStorage.setItem(EXPERIMENTS_STORAGE_KEY, JSON.stringify(experiments));
}

const STATUS_COLORS: Record<ExperimentStatus, string> = {
  draft: "bg-muted text-muted-foreground",
  running: "bg-green-500/10 text-green-400",
  concluded: "bg-blue-500/10 text-blue-400",
  archived: "bg-muted text-muted-foreground",
};

export default function AdminExperimentLabPage() {
  useUiEngine("admin-experiment-lab");
  const navigate = useNavigate();
  const [experiments, setExperiments] = useState<Experiment[]>([]);
  const [flags, setFlags] = useState<FeatureFlagRow[]>([]);
  const [filter, setFilter] = useState<ExperimentStatus | "all">("all");
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"experiments" | "flags">("experiments");

  const refresh = useCallback(async () => {
    setLoading(true);
    const [flagData] = await Promise.all([loadFeatureFlags()]);
    setFlags(flagData);
    const stored = loadStoredExperiments();
    setExperiments(stored);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const filtered = filter === "all" ? experiments : experiments.filter((e) => e.status === filter);
  const selectedExp = experiments.find((e) => e.id === selected);

  const handleStatusChange = (id: string, newStatus: ExperimentStatus) => {
    setExperiments((prev) => {
      const updated = prev.map((e) =>
        e.id === id
          ? {
              ...e,
              status: newStatus,
              startDate: newStatus === "running" && !e.startDate ? new Date().toISOString().split("T")[0] : e.startDate,
              endDate: newStatus === "concluded" ? new Date().toISOString().split("T")[0] : e.endDate,
            }
          : e
      );
      saveExperiments(updated);
      return updated;
    });
  };

  const handleCreateExperiment = () => {
    const newExp: Experiment = {
      id: `exp-${Date.now()}`,
      name: "New Experiment",
      description: "Describe the hypothesis",
      status: "draft",
      startDate: null,
      endDate: null,
      variants: [
        { id: "v1", name: "Control", weight: 50, participants: 0, conversions: 0, conversionRate: 0 },
        { id: "v2", name: "Variant A", weight: 50, participants: 0, conversions: 0, conversionRate: 0 },
      ],
      winner: null,
    };
    const updated = [newExp, ...experiments];
    setExperiments(updated);
    saveExperiments(updated);
    setSelected(newExp.id);
  };

  return (
    <SubPageShell>
      <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/admin/lab-hub")} className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center">←</button>
          <div>
            <h1 className="text-lg font-bold">Experiment Lab</h1>
            <p className="text-xs text-muted-foreground">A/B testing, variant analysis, feature flags</p>
          </div>
        </div>

        <div className="flex gap-2">
          {(["experiments", "flags"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                tab === t ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              }`}
            >
              {t === "experiments" ? `Experiments (${experiments.length})` : `Feature Flags (${flags.length})`}
            </button>
          ))}
        </div>

        {loading && (
          <div className="text-center text-sm text-muted-foreground py-8">Loading experiment data...</div>
        )}

        {!loading && tab === "flags" && (
          <div className="space-y-2">
            {flags.length === 0 ? (
              <div className="text-center text-sm text-muted-foreground py-8">
                No feature flags in the database. Flags are stored in the system_feature_flags table and managed by the feature-flag-registry.
              </div>
            ) : (
              flags.map((f) => (
                <div key={f.id} className="rounded-xl bg-card border border-border/20 p-3 flex justify-between items-center">
                  <div>
                    <div className="text-xs font-bold font-mono">{f.flag_key}</div>
                    <div className="text-xs text-muted-foreground">{new Date(f.updated_at).toLocaleDateString()}</div>
                  </div>
                  <div className={`text-xs font-bold px-2 py-0.5 rounded-full ${f.enabled ? "bg-green-500/10 text-green-400" : "bg-muted text-muted-foreground"}`}>
                    {f.enabled ? "ON" : "OFF"}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {!loading && tab === "experiments" && !selectedExp && (
          <div className="space-y-3">
            <div className="grid grid-cols-4 gap-2">
              {(["all", "draft", "running", "concluded"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setFilter(s)}
                  className={`px-2 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    filter === s ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  }`}
                >
                  {s === "all" ? `All (${experiments.length})` : `${s.charAt(0).toUpperCase() + s.slice(1)} (${experiments.filter((e) => e.status === s).length})`}
                </button>
              ))}
            </div>

            {filtered.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-sm text-muted-foreground">No experiments yet.</p>
                <p className="text-xs text-muted-foreground mt-1">Create an experiment to start A/B testing features.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {filtered.map((exp) => (
                  <button
                    key={exp.id}
                    onClick={() => setSelected(exp.id)}
                    className="w-full rounded-xl bg-card border border-border/20 p-4 text-left"
                  >
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm font-bold">{exp.name}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[exp.status]}`}>
                        {exp.status}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground">{exp.description}</div>
                    {exp.winner && (
                      <div className="text-xs text-green-400 mt-1">Winner: {exp.winner}</div>
                    )}
                  </button>
                ))}
              </div>
            )}

            <button
              onClick={handleCreateExperiment}
              className="w-full rounded-xl bg-primary text-primary-foreground py-2.5 text-sm font-bold"
            >
              Create Experiment
            </button>
          </div>
        )}

        {!loading && tab === "experiments" && selectedExp && (
          <div className="space-y-3">
            <button onClick={() => setSelected(null)} className="text-xs text-muted-foreground hover:text-foreground">
              ← Back to experiments
            </button>

            <div className="rounded-xl bg-card border border-border/20 p-4 space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-bold">{selectedExp.name}</h3>
                <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[selectedExp.status]}`}>
                  {selectedExp.status}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">{selectedExp.description}</p>

              {selectedExp.startDate && (
                <div className="text-xs text-muted-foreground">
                  Started: {selectedExp.startDate}
                  {selectedExp.endDate && ` — Ended: ${selectedExp.endDate}`}
                </div>
              )}

              <div className="space-y-3">
                <h4 className="text-xs font-bold">Variants</h4>
                {selectedExp.variants.map((v) => {
                  const isWinner = selectedExp.winner === v.name;
                  return (
                    <div
                      key={v.id}
                      className={`rounded-lg border p-3 ${isWinner ? "border-green-500/30 bg-green-500/5" : "border-border/20"}`}
                    >
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-xs font-bold">{v.name}</span>
                        <span className="text-xs text-muted-foreground">{v.weight}% traffic</span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div>
                          <div className="text-muted-foreground">Participants</div>
                          <div className="font-bold">{v.participants.toLocaleString()}</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Conversions</div>
                          <div className="font-bold">{v.conversions.toLocaleString()}</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Rate</div>
                          <div className="font-bold">{v.conversionRate.toFixed(2)}%</div>
                        </div>
                      </div>
                      {v.participants > 0 && (
                        <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden mt-2">
                          <div className="h-full bg-primary rounded-full" style={{ width: `${v.conversionRate}%` }} />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {selectedExp.status === "running" && selectedExp.variants.every((v) => v.participants > 0) && (
                <div className="rounded-lg bg-muted/50 p-3">
                  <h4 className="text-xs font-bold mb-1">Statistical Significance</h4>
                  {(() => {
                    const result = chiSquaredSignificance(selectedExp.variants);
                    return (
                      <div className="text-xs">
                        <div className={result.significant ? "text-green-400" : "text-yellow-400"}>
                          {result.significant ? "Statistically significant" : "Not yet significant"}
                        </div>
                        <div className="text-muted-foreground">p-value: {result.pValue.toFixed(4)}</div>
                      </div>
                    );
                  })()}
                </div>
              )}

              {selectedExp.status === "running" && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold">Declare Winner</h4>
                  <div className="flex gap-2">
                    {selectedExp.variants.map((v) => (
                      <button
                        key={v.id}
                        onClick={() => {
                          setExperiments((prev) => {
                            const updated = prev.map((e) =>
                              e.id === selectedExp.id
                                ? { ...e, winner: v.name, status: "concluded" as ExperimentStatus, endDate: new Date().toISOString().split("T")[0] }
                                : e
                            );
                            saveExperiments(updated);
                            return updated;
                          });
                        }}
                        className={`flex-1 rounded-lg py-2 text-xs font-bold ${
                          selectedExp.winner === v.name
                            ? "bg-green-500/20 text-green-400 border border-green-500/30"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {v.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                {selectedExp.status === "draft" && (
                  <button
                    onClick={() => handleStatusChange(selectedExp.id, "running")}
                    className="flex-1 rounded-lg bg-green-500/10 text-green-400 py-2 text-xs font-bold"
                  >
                    Start Experiment
                  </button>
                )}
                {selectedExp.status === "running" && !selectedExp.winner && (
                  <button
                    onClick={() => handleStatusChange(selectedExp.id, "concluded")}
                    className="flex-1 rounded-lg bg-blue-500/10 text-blue-400 py-2 text-xs font-bold"
                  >
                    Conclude Without Winner
                  </button>
                )}
                {selectedExp.status === "concluded" && (
                  <button
                    onClick={() => handleStatusChange(selectedExp.id, "archived")}
                    className="flex-1 rounded-lg bg-muted text-muted-foreground py-2 text-xs font-bold"
                  >
                    Archive
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </SubPageShell>
  );
}
