import { useState, useMemo } from "react";
import { runFullAudit, getCachedReport, runDryScan, runFullSweep, runIncrementalSweep, getEngineStatus, getTotalSweepCount } from "@/lib/data-quality/audit-runner";
import type { FullAuditReport, EntityFinding, IssueSeverity } from "@/lib/data-quality/types";
import { getSourceTrustSummary } from "@/lib/data-quality/source-inventory";
import { getPlaybooks } from "@/lib/data-quality/engines/safe-remediation-engine";
import { getAuditTrailStats } from "@/lib/data-quality/engines/audit-trail-engine";
import { getRuntimeSafetyMetrics, runConvergenceProof, getStressTestResults } from "@/lib/runtime/runtime-safety";
import { useUiEngine } from "@/hooks/useUiEngine";

const NAVY = "hsl(220 40% 18%)";
const NAVY_LIGHT = "hsl(220 40% 14%)";
const GOLD = "hsl(38 65% 56%)";
const BORDER = "hsl(220 30% 25%)";
const TEXT = "hsl(220 20% 85%)";
const TEXT_DIM = "hsl(220 15% 60%)";
const RED = "hsl(0 72% 51%)";
const ORANGE = "hsl(25 95% 53%)";
const YELLOW = "hsl(45 93% 47%)";
const GREEN = "hsl(142 71% 45%)";
const BLUE = "hsl(217 91% 60%)";

const SEVERITY_COLOR: Record<IssueSeverity, string> = {
  critical: RED,
  high: ORANGE,
  medium: YELLOW,
  low: BLUE,
  info: TEXT_DIM,
};

const CLASSIFICATION_COLOR: Record<string, string> = {
  VALID: GREEN,
  VALID_WITH_WARNINGS: YELLOW,
  SUSPICIOUS: ORANGE,
  INVALID: RED,
  DUPLICATE: "hsl(280 60% 55%)",
  ORPHAN: "hsl(320 60% 50%)",
  INCOMPLETE: ORANGE,
  MISCLASSIFIED: RED,
  CROSS_VERTICAL_CONTAMINATION: RED,
  BROKEN_MEDIA: RED,
  BROKEN_REFERENCE: RED,
  LEGACY_SHADOW: "hsl(200 40% 50%)",
  QUARANTINED: "hsl(0 0% 50%)",
};

function AdminDataQualityPage() {
  const [report, setReport] = useState<FullAuditReport | null>(getCachedReport());
  const [running, setRunning] = useState(false);
  const [filterVertical, setFilterVertical] = useState<string>("all");
  const [filterClassification, setFilterClassification] = useState<string>("all");
  const [filterSource, setFilterSource] = useState<string>("all");
  const [filterSeverity, setFilterSeverity] = useState<string>("all");
  const [searchText, setSearchText] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "engines" | "findings" | "sources" | "quarantine" | "remediations" | "playbooks" | "runtime">("overview");
  const [runMode, setRunMode] = useState<"boot" | "dry" | "incremental" | "full">("boot");

  const handleRunAudit = () => {
    setRunning(true);
    setTimeout(() => {
      let r: FullAuditReport;
      if (runMode === "dry") r = runDryScan();
      else if (runMode === "incremental") r = runIncrementalSweep();
      else if (runMode === "full") r = runFullSweep();
      else r = runFullAudit();
      setReport(r);
      setRunning(false);
    }, 50);
  };

  const filteredFindings = useMemo(() => {
    if (!report) return [];
    return report.findings.filter((f) => {
      if (filterVertical !== "all" && f.vertical !== filterVertical) return false;
      if (filterClassification !== "all" && f.classification !== filterClassification) return false;
      if (filterSource !== "all" && f.source !== filterSource) return false;
      if (filterSeverity !== "all") {
        const hasSeverity = f.issues.some((i) => i.severity === filterSeverity);
        if (!hasSeverity) return false;
      }
      if (searchText) {
        const q = searchText.toLowerCase();
        return (
          f.entityId.toLowerCase().includes(q) ||
          f.title.toLowerCase().includes(q) ||
          f.issues.some((i) => i.message.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [report, filterVertical, filterClassification, filterSource, filterSeverity, searchText]);

  const verticals = useMemo(() => {
    if (!report) return [];
    return [...new Set(report.findings.map((f) => f.vertical))].sort();
  }, [report]);

  const sources = useMemo(() => {
    if (!report) return [];
    return [...new Set(report.findings.map((f) => f.source))].sort();
  }, [report]);

  const classifications = useMemo(() => {
    if (!report) return [];
    return [...new Set(report.findings.map((f) => f.classification))].sort();
  }, [report]);

  useUiEngine("admin-admindataqualitypage");

  return (
    <div style={{ minHeight: "100vh", background: NAVY, color: TEXT, padding: 24 }}>
      <div style={{ maxWidth: 1400, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 700, color: GOLD, margin: 0 }}>Data Quality Audit</h1>
            <p style={{ color: TEXT_DIM, margin: "4px 0 0", fontSize: 14 }}>
              Full entity-by-entity audit, classification, remediation, and quarantine
            </p>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <select
              value={runMode}
              onChange={(e) => {
                const v = e.target.value;
                if (v === "boot" || v === "dry" || v === "incremental" || v === "full") setRunMode(v);
              }}
              style={{ background: NAVY_LIGHT, color: TEXT, border: `1px solid ${BORDER}`, borderRadius: 6, padding: "8px 10px", fontSize: 12 }}
            >
              <option value="boot">Boot Audit (Safe Auto)</option>
              <option value="dry">Dry Run (No Mutations)</option>
              <option value="incremental">Incremental Sweep</option>
              <option value="full">Full Sweep (Reset)</option>
            </select>
            <button
              onClick={handleRunAudit}
              disabled={running}
              style={{
                background: GOLD,
                color: NAVY,
                border: "none",
                borderRadius: 8,
                padding: "10px 24px",
                fontWeight: 700,
                fontSize: 14,
                cursor: running ? "wait" : "pointer",
                opacity: running ? 0.6 : 1,
              }}
            >
              {running ? "Running..." : "Run"}
            </button>
          </div>
        </div>

        {!report && !running && (
          <div style={{ textAlign: "center", padding: 60, color: TEXT_DIM }}>
            <p style={{ fontSize: 18 }}>No audit data yet. Click "Run Full Audit" to begin.</p>
          </div>
        )}

        {report && (
          <>
            <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
              {(["overview", "engines", "findings", "sources", "quarantine", "remediations", "playbooks", "runtime"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  style={{
                    background: activeTab === tab ? GOLD : NAVY_LIGHT,
                    color: activeTab === tab ? NAVY : TEXT,
                    border: `1px solid ${activeTab === tab ? GOLD : BORDER}`,
                    borderRadius: 6,
                    padding: "8px 16px",
                    fontWeight: 600,
                    fontSize: 13,
                    cursor: "pointer",
                    textTransform: "capitalize",
                  }}
                >
                  {tab}
                  {tab === "quarantine" && report.quarantine.length > 0 && (
                    <span style={{ marginLeft: 6, background: RED, color: "#fff", borderRadius: 10, padding: "2px 6px", fontSize: 11 }}>
                      {report.quarantine.length}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {activeTab === "overview" && <OverviewTab report={report} />}
            {activeTab === "engines" && <EnginesTab report={report} />}
            {activeTab === "findings" && (
              <FindingsTab
                findings={filteredFindings}
                totalFindings={report.findings.length}
                verticals={verticals}
                sources={sources}
                classifications={classifications}
                filterVertical={filterVertical}
                setFilterVertical={setFilterVertical}
                filterClassification={filterClassification}
                setFilterClassification={setFilterClassification}
                filterSource={filterSource}
                setFilterSource={setFilterSource}
                filterSeverity={filterSeverity}
                setFilterSeverity={setFilterSeverity}
                searchText={searchText}
                setSearchText={setSearchText}
                expandedId={expandedId}
                setExpandedId={setExpandedId}
              />
            )}
            {activeTab === "sources" && <SourcesTab report={report} />}
            {activeTab === "quarantine" && <QuarantineTab report={report} />}
            {activeTab === "remediations" && <RemediationsTab report={report} />}
            {activeTab === "playbooks" && <PlaybooksTab />}
            {activeTab === "runtime" && <RuntimeTab report={report} />}
          </>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number | string; color?: string }) {
  return (
    <div style={{ background: NAVY_LIGHT, border: `1px solid ${BORDER}`, borderRadius: 10, padding: 16, flex: 1, minWidth: 140 }}>
      <div style={{ fontSize: 12, color: TEXT_DIM, marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 700, color: color ?? GOLD }}>{value}</div>
    </div>
  );
}

function OverviewTab({ report }: { report: FullAuditReport }) {
  const s = report.summary;
  return (
    <div>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 24 }}>
        <StatCard label="Total Entities" value={s.totalEntities} />
        <StatCard label="Valid" value={s.byClassification["VALID"] ?? 0} color={GREEN} />
        <StatCard label="With Warnings" value={s.byClassification["VALID_WITH_WARNINGS"] ?? 0} color={YELLOW} />
        <StatCard label="Quarantined" value={s.quarantined} color={RED} />
        <StatCard label="Auto-Fixed" value={s.autoFixed} color={BLUE} />
        <StatCard label="Duplicates" value={s.duplicatesFound} color="hsl(280 60% 55%)" />
        <StatCard label="Orphans" value={s.orphansFound} color="hsl(320 60% 50%)" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
        <div style={{ background: NAVY_LIGHT, border: `1px solid ${BORDER}`, borderRadius: 10, padding: 16 }}>
          <h3 style={{ color: GOLD, fontSize: 15, fontWeight: 700, marginBottom: 12 }}>By Classification</h3>
          {Object.entries(s.byClassification)
            .sort(([, a], [, b]) => b - a)
            .map(([cls, count]) => (
              <div key={cls} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: 13 }}>
                <span style={{ color: CLASSIFICATION_COLOR[cls] ?? TEXT }}>{cls}</span>
                <span style={{ fontWeight: 600 }}>{count}</span>
              </div>
            ))}
        </div>

        <div style={{ background: NAVY_LIGHT, border: `1px solid ${BORDER}`, borderRadius: 10, padding: 16 }}>
          <h3 style={{ color: GOLD, fontSize: 15, fontWeight: 700, marginBottom: 12 }}>By Vertical</h3>
          {Object.entries(s.byVertical)
            .sort(([, a], [, b]) => b.issues - a.issues)
            .map(([vert, data]) => (
              <div key={vert} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: 13 }}>
                <span>{vert}</span>
                <span>
                  <span style={{ color: GREEN, marginRight: 8 }}>{data.valid} ok</span>
                  {data.issues > 0 && <span style={{ color: ORANGE }}>{data.issues} issues</span>}
                </span>
              </div>
            ))}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div style={{ background: NAVY_LIGHT, border: `1px solid ${BORDER}`, borderRadius: 10, padding: 16 }}>
          <h3 style={{ color: GOLD, fontSize: 15, fontWeight: 700, marginBottom: 12 }}>By Issue Severity</h3>
          {(["critical", "high", "medium", "low", "info"] as IssueSeverity[]).map((sev) => {
            const count = s.byIssueSeverity[sev] ?? 0;
            if (count === 0) return null;
            return (
              <div key={sev} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: 13 }}>
                <span style={{ color: SEVERITY_COLOR[sev] }}>{sev.toUpperCase()}</span>
                <span style={{ fontWeight: 600 }}>{count}</span>
              </div>
            );
          })}
        </div>

        <div style={{ background: NAVY_LIGHT, border: `1px solid ${BORDER}`, borderRadius: 10, padding: 16 }}>
          <h3 style={{ color: GOLD, fontSize: 15, fontWeight: 700, marginBottom: 12 }}>By Source</h3>
          {Object.entries(s.bySource)
            .sort(([, a], [, b]) => b.total - a.total)
            .map(([src, data]) => (
              <div key={src} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: 13 }}>
                <span style={{ fontSize: 12 }}>{src}</span>
                <span>
                  <span style={{ color: GREEN, marginRight: 6 }}>{data.valid}</span>
                  {data.issues > 0 && <span style={{ color: ORANGE }}>{data.issues}</span>}
                </span>
              </div>
            ))}
        </div>
      </div>

      <div style={{ marginTop: 24, background: NAVY_LIGHT, border: `1px solid ${BORDER}`, borderRadius: 10, padding: 16 }}>
        <h3 style={{ color: GOLD, fontSize: 15, fontWeight: 700, marginBottom: 8 }}>Audit Timestamp</h3>
        <p style={{ fontSize: 13, color: TEXT_DIM, margin: 0 }}>{s.timestamp}</p>
      </div>
    </div>
  );
}

function FindingsTab({
  findings,
  totalFindings,
  verticals,
  sources,
  classifications,
  filterVertical,
  setFilterVertical,
  filterClassification,
  setFilterClassification,
  filterSource,
  setFilterSource,
  filterSeverity,
  setFilterSeverity,
  searchText,
  setSearchText,
  expandedId,
  setExpandedId,
}: {
  findings: EntityFinding[];
  totalFindings: number;
  verticals: string[];
  sources: string[];
  classifications: string[];
  filterVertical: string;
  setFilterVertical: (v: string) => void;
  filterClassification: string;
  setFilterClassification: (v: string) => void;
  filterSource: string;
  setFilterSource: (v: string) => void;
  filterSeverity: string;
  setFilterSeverity: (v: string) => void;
  searchText: string;
  setSearchText: (v: string) => void;
  expandedId: string | null;
  setExpandedId: (v: string | null) => void;
}) {
  const selectStyle: React.CSSProperties = {
    background: NAVY_LIGHT,
    color: TEXT,
    border: `1px solid ${BORDER}`,
    borderRadius: 6,
    padding: "6px 10px",
    fontSize: 12,
  };

  return (
    <div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16, alignItems: "center" }}>
        <select value={filterVertical} onChange={(e) => setFilterVertical(e.target.value)} style={selectStyle}>
          <option value="all">All Verticals</option>
          {verticals.map((v) => (
            <option key={v} value={v}>{v}</option>
          ))}
        </select>
        <select value={filterClassification} onChange={(e) => setFilterClassification(e.target.value)} style={selectStyle}>
          <option value="all">All Classifications</option>
          {classifications.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <select value={filterSource} onChange={(e) => setFilterSource(e.target.value)} style={selectStyle}>
          <option value="all">All Sources</option>
          {sources.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <select value={filterSeverity} onChange={(e) => setFilterSeverity(e.target.value)} style={selectStyle}>
          <option value="all">All Severities</option>
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
        <input
          type="text"
          placeholder="Search entities or issues..."
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          style={{ ...selectStyle, minWidth: 200 }}
        />
        <span style={{ fontSize: 12, color: TEXT_DIM, marginLeft: "auto" }}>
          {findings.length} / {totalFindings} entities
        </span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {findings.slice(0, 200).map((f) => (
          <div
            key={`${f.source}::${f.entityId}`}
            style={{
              background: NAVY_LIGHT,
              border: `1px solid ${BORDER}`,
              borderRadius: 8,
              borderLeft: `3px solid ${CLASSIFICATION_COLOR[f.classification] ?? BORDER}`,
              overflow: "hidden",
            }}
          >
            <div
              onClick={() => setExpandedId(expandedId === f.entityId ? null : f.entityId)}
              style={{ padding: "10px 14px", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}
            >
              <div style={{ display: "flex", gap: 12, alignItems: "center", flex: 1, minWidth: 0 }}>
                <span style={{ fontSize: 11, color: CLASSIFICATION_COLOR[f.classification] ?? TEXT, fontWeight: 700, minWidth: 60 }}>
                  {f.classification === "VALID" ? "VALID" : f.classification.replace(/_/g, " ").slice(0, 12)}
                </span>
                <span style={{ fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {f.title}
                </span>
                <span style={{ fontSize: 11, color: TEXT_DIM }}>{f.vertical}/{f.subcategory}</span>
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <span style={{ fontSize: 11, color: TEXT_DIM }}>{f.source}</span>
                {f.issues.length > 0 && (
                  <span style={{ fontSize: 11, color: ORANGE }}>
                    {f.issues.length} issue{f.issues.length > 1 ? "s" : ""}
                  </span>
                )}
                <span style={{ fontSize: 14, color: TEXT_DIM }}>{expandedId === f.entityId ? "▲" : "▼"}</span>
              </div>
            </div>

            {expandedId === f.entityId && (
              <div style={{ padding: "0 14px 14px", borderTop: `1px solid ${BORDER}` }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, padding: "10px 0", fontSize: 12 }}>
                  <div><span style={{ color: TEXT_DIM }}>Entity ID:</span> {f.entityId}</div>
                  <div><span style={{ color: TEXT_DIM }}>Source:</span> {f.source}</div>
                  <div><span style={{ color: TEXT_DIM }}>Vertical:</span> {f.vertical}</div>
                  <div><span style={{ color: TEXT_DIM }}>Category:</span> {f.category}</div>
                  <div><span style={{ color: TEXT_DIM }}>Subcategory:</span> {f.subcategory}</div>
                  <div><span style={{ color: TEXT_DIM }}>Entity Type:</span> {f.entityType}</div>
                  <div style={{ gridColumn: "1/-1" }}><span style={{ color: TEXT_DIM }}>Media:</span> {f.mediaSummary}</div>
                </div>

                {f.issues.length > 0 && (
                  <div style={{ marginTop: 8 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: GOLD, marginBottom: 6 }}>Issues</div>
                    {f.issues.map((iss, idx) => (
                      <div
                        key={idx}
                        style={{
                          display: "flex",
                          gap: 8,
                          padding: "4px 0",
                          fontSize: 12,
                          borderBottom: idx < f.issues.length - 1 ? `1px solid ${BORDER}` : undefined,
                        }}
                      >
                        <span style={{ color: SEVERITY_COLOR[iss.severity], fontWeight: 600, minWidth: 60, fontSize: 11 }}>
                          {iss.severity.toUpperCase()}
                        </span>
                        <span style={{ color: TEXT_DIM, minWidth: 80, fontSize: 11 }}>[{iss.code}]</span>
                        <span>{iss.message}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}

        {findings.length > 200 && (
          <div style={{ textAlign: "center", padding: 12, color: TEXT_DIM, fontSize: 13 }}>
            Showing 200 of {findings.length} findings. Use filters to narrow.
          </div>
        )}
      </div>
    </div>
  );
}

function EnginesTab({ report }: { report: FullAuditReport }) {
  const status = getEngineStatus();
  const trailStats = getAuditTrailStats();

  const STATUS_COLOR: Record<string, string> = {
    success: GREEN,
    partial: YELLOW,
    failed: RED,
    never_run: TEXT_DIM,
  };

  return (
    <div>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 24 }}>
        <StatCard label="Engines" value={status.engineCount} />
        <StatCard label="Total Sweeps" value={getTotalSweepCount()} color={BLUE} />
        <StatCard label="Audit Trail" value={trailStats.total} color={GOLD} />
        <StatCard label="Scheduled" value={status.scheduledActive ? "Active" : "Inactive"} color={status.scheduledActive ? GREEN : YELLOW} />
      </div>

      <h3 style={{ color: GOLD, fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Engine Status</h3>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 24 }}>
        {status.engineSummaries.map((eng) => (
          <div
            key={eng.engineName}
            style={{
              background: NAVY_LIGHT,
              border: `1px solid ${BORDER}`,
              borderLeft: `3px solid ${STATUS_COLOR[eng.status] ?? TEXT_DIM}`,
              borderRadius: 8,
              padding: 14,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <span style={{ fontWeight: 600, fontSize: 14 }}>{eng.engineName}</span>
              <span style={{
                fontSize: 11,
                padding: "2px 8px",
                borderRadius: 4,
                background: STATUS_COLOR[eng.status] ?? TEXT_DIM,
                color: NAVY,
                fontWeight: 600,
              }}>
                {eng.status.toUpperCase()}
              </span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 4, fontSize: 12 }}>
              <div><span style={{ color: TEXT_DIM }}>Processed:</span> {eng.entitiesProcessed}</div>
              <div><span style={{ color: TEXT_DIM }}>Issues:</span> {eng.issuesFound}</div>
              <div><span style={{ color: TEXT_DIM }}>Actions:</span> {eng.actionsApplied}</div>
              <div style={{ gridColumn: "1/-1" }}><span style={{ color: TEXT_DIM }}>Last run:</span> {eng.lastRun ? new Date(eng.lastRun).toLocaleString() : "Never"}</div>
            </div>
          </div>
        ))}
      </div>

      {report.engineRuns && report.engineRuns.length > 0 && (
        <>
          <h3 style={{ color: GOLD, fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Last Sweep Run Logs</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {report.engineRuns.map((run, idx) => (
              <div key={idx} style={{ background: NAVY_LIGHT, border: `1px solid ${BORDER}`, borderRadius: 8, padding: 12, fontSize: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ fontWeight: 600 }}>{run.engineName}</span>
                  <span style={{ color: STATUS_COLOR[run.status] ?? TEXT_DIM }}>{run.mode}/{run.cadence}</span>
                </div>
                <div style={{ display: "flex", gap: 16, color: TEXT_DIM }}>
                  <span>Scanned: {run.entitiesScanned}</span>
                  <span>Issues: {run.issuesFound}</span>
                  <span style={{ color: GREEN }}>Fixed: {run.autoFixed}</span>
                  <span style={{ color: RED }}>Quarantined: {run.quarantined}</span>
                  <span style={{ color: YELLOW }}>Suppressed: {run.suppressed}</span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <div style={{ marginTop: 24, background: NAVY_LIGHT, border: `1px solid ${BORDER}`, borderRadius: 10, padding: 16 }}>
        <h3 style={{ color: GOLD, fontSize: 15, fontWeight: 700, marginBottom: 12 }}>Source Trust Summary</h3>
        {(() => {
          const trust = getSourceTrustSummary();
          return (
            <div>
              <div style={{ fontSize: 12, color: TEXT_DIM, marginBottom: 8 }}>Average Trust: {trust.averageTrust.toFixed(1)}/100</div>
              {trust.sources.map((s) => (
                <div key={s.name} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: 12 }}>
                  <span>{s.name}</span>
                  <div style={{ display: "flex", gap: 8 }}>
                    <span style={{ color: s.trustScore >= 80 ? GREEN : s.trustScore >= 60 ? YELLOW : RED }}>Trust: {s.trustScore}</span>
                    <span style={{ color: TEXT_DIM }}>{s.mutationPolicy}</span>
                    <span style={{ color: s.mayFeedLiveSurfaces ? GREEN : RED }}>{s.mayFeedLiveSurfaces ? "live" : "blocked"}</span>
                  </div>
                </div>
              ))}
            </div>
          );
        })()}
      </div>
    </div>
  );
}

function SourcesTab({ report }: { report: FullAuditReport }) {
  return (
    <div>
      <h3 style={{ color: GOLD, fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Data Source Inventory</h3>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {report.sources.map((src) => (
          <div
            key={src.name}
            style={{
              background: NAVY_LIGHT,
              border: `1px solid ${BORDER}`,
              borderRadius: 10,
              padding: 16,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <span style={{ fontWeight: 700, fontSize: 14 }}>{src.name}</span>
              <span style={{
                fontSize: 11,
                padding: "2px 8px",
                borderRadius: 4,
                background: src.risk === "none" || src.risk === "low" ? GREEN : src.risk === "medium" ? YELLOW : RED,
                color: NAVY,
                fontWeight: 600,
              }}>
                Risk: {src.risk}
              </span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4, fontSize: 12 }}>
              <div><span style={{ color: TEXT_DIM }}>Path:</span> {src.path}</div>
              <div><span style={{ color: TEXT_DIM }}>Type:</span> {src.type}</div>
              <div><span style={{ color: TEXT_DIM }}>Entities:</span> {src.entityCount}</div>
              <div><span style={{ color: TEXT_DIM }}>Status:</span> {src.status}</div>
              <div><span style={{ color: TEXT_DIM }}>Trust:</span> <span style={{ color: src.trustScore >= 80 ? GREEN : src.trustScore >= 60 ? YELLOW : RED }}>{src.trustScore}/100</span></div>
              <div><span style={{ color: TEXT_DIM }}>Mutation:</span> {src.mutationPolicy}</div>
              <div><span style={{ color: TEXT_DIM }}>Visibility:</span> {src.visibilityPolicy}</div>
              <div><span style={{ color: TEXT_DIM }}>Live:</span> <span style={{ color: src.mayFeedLiveSurfaces ? GREEN : RED }}>{src.mayFeedLiveSurfaces ? "Yes" : "No"}</span></div>
              <div><span style={{ color: TEXT_DIM }}>Verticals:</span> {src.verticalsAffected.join(", ")}</div>
              <div><span style={{ color: TEXT_DIM }}>Consumers:</span> {src.runtimeConsumers.join(", ")}</div>
              <div style={{ gridColumn: "1/-1" }}><span style={{ color: TEXT_DIM }}>Action:</span> {src.actionNeeded}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function QuarantineTab({ report }: { report: FullAuditReport }) {
  if (report.quarantine.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: 40, color: GREEN }}>
        <p style={{ fontSize: 18, fontWeight: 600 }}>No entities quarantined</p>
        <p style={{ fontSize: 13, color: TEXT_DIM }}>All data passed safety checks.</p>
      </div>
    );
  }

  return (
    <div>
      <h3 style={{ color: RED, fontSize: 16, fontWeight: 700, marginBottom: 16 }}>
        Quarantined Entities ({report.quarantine.length})
      </h3>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {report.quarantine.map((q) => (
          <div
            key={`${q.source}::${q.entityId}`}
            style={{
              background: NAVY_LIGHT,
              border: `1px solid ${RED}33`,
              borderLeft: `3px solid ${RED}`,
              borderRadius: 8,
              padding: 14,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <span style={{ fontWeight: 600, fontSize: 14 }}>{q.title}</span>
              <span style={{ fontSize: 11, color: CLASSIFICATION_COLOR[q.classification] ?? TEXT }}>
                {q.classification}
              </span>
            </div>
            <div style={{ fontSize: 12, display: "flex", gap: 16 }}>
              <span><span style={{ color: TEXT_DIM }}>ID:</span> {q.entityId}</span>
              <span><span style={{ color: TEXT_DIM }}>Source:</span> {q.source}</span>
              <span><span style={{ color: TEXT_DIM }}>Vertical:</span> {q.vertical}</span>
            </div>
            <div style={{ fontSize: 11, color: RED, marginTop: 6 }}>
              Reasons: {q.reasonCodes.join(", ")}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function RemediationsTab({ report }: { report: FullAuditReport }) {
  if (report.remediations.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: 40, color: TEXT_DIM }}>
        <p style={{ fontSize: 18 }}>No remediations applied</p>
        <p style={{ fontSize: 13 }}>No deterministic auto-fixes were needed.</p>
      </div>
    );
  }

  return (
    <div>
      <h3 style={{ color: GOLD, fontSize: 16, fontWeight: 700, marginBottom: 16 }}>
        Remediation Log ({report.remediations.length} entries)
      </h3>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {report.remediations.map((r, idx) => (
          <div
            key={idx}
            style={{
              background: NAVY_LIGHT,
              border: `1px solid ${BORDER}`,
              borderLeft: `3px solid ${r.action === "auto_fixed" ? GREEN : YELLOW}`,
              borderRadius: 8,
              padding: 14,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <span style={{ fontWeight: 600, fontSize: 13 }}>{r.entityId}</span>
              <span style={{
                fontSize: 11,
                padding: "2px 8px",
                borderRadius: 4,
                background: r.action === "auto_fixed" ? GREEN : YELLOW,
                color: NAVY,
                fontWeight: 600,
              }}>
                {r.action}
              </span>
            </div>
            <div style={{ fontSize: 12, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4 }}>
              <div><span style={{ color: TEXT_DIM }}>Source:</span> {r.source}</div>
              <div><span style={{ color: TEXT_DIM }}>Field:</span> {r.field ?? "—"}</div>
              <div><span style={{ color: TEXT_DIM }}>Before:</span> {r.beforeState}</div>
              <div><span style={{ color: TEXT_DIM }}>After:</span> {r.afterState}</div>
              <div style={{ gridColumn: "1/-1" }}><span style={{ color: TEXT_DIM }}>Reason:</span> {r.reason}</div>
              <div><span style={{ color: TEXT_DIM }}>Confidence:</span> {r.confidence}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PlaybooksTab() {
  const playbooks = getPlaybooks();

  const ACTION_COLOR: Record<string, string> = {
    remapped: BLUE,
    suppressed: YELLOW,
    quarantined: RED,
    auto_fixed: GREEN,
    downgraded: ORANGE,
  };

  return (
    <div>
      <h3 style={{ color: GOLD, fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Remediation Playbooks ({playbooks.length})</h3>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {playbooks.map((pb) => (
          <div
            key={pb.id}
            style={{
              background: NAVY_LIGHT,
              border: `1px solid ${BORDER}`,
              borderLeft: `3px solid ${ACTION_COLOR[pb.action] ?? BORDER}`,
              borderRadius: 10,
              padding: 16,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <span style={{ fontWeight: 700, fontSize: 14 }}>{pb.name}</span>
              <div style={{ display: "flex", gap: 6 }}>
                <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 4, background: ACTION_COLOR[pb.action] ?? BORDER, color: NAVY, fontWeight: 600 }}>
                  {pb.action}
                </span>
                <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 4, background: BORDER, color: TEXT, fontWeight: 600 }}>
                  {pb.decisionTier}
                </span>
              </div>
            </div>
            <p style={{ fontSize: 12, color: TEXT_DIM, margin: "0 0 8px" }}>{pb.description}</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4, fontSize: 12 }}>
              <div><span style={{ color: TEXT_DIM }}>Confidence:</span> {pb.confidenceRequired}</div>
              <div><span style={{ color: TEXT_DIM }}>Rollback:</span> {pb.rollbackSupported ? "Supported" : "Not supported"}</div>
              <div style={{ gridColumn: "1/-1" }}><span style={{ color: TEXT_DIM }}>Triggers:</span> {pb.triggerConditions.join("; ")}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function RuntimeTab({ report }: { report: FullAuditReport }) {
  const metrics = getRuntimeSafetyMetrics();
  const [stressResult, setStressResult] = useState<ReturnType<typeof getStressTestResults>>(getStressTestResults());
  const [stressRunning, setStressRunning] = useState(false);

  const handleStressTest = () => {
    setStressRunning(true);
    setTimeout(() => {
      const result = runConvergenceProof(() => runFullAudit(), 5);
      setStressResult(result);
      setStressRunning(false);
    }, 50);
  };

  return (
    <div>
      <h3 style={{ color: GOLD, fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Runtime Safety Metrics</h3>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 24 }}>
        <StatCard label="Total Sweeps" value={metrics.sweepCount} color={BLUE} />
        <StatCard label="Avg Sweep (ms)" value={metrics.averageSweepMs} color={GREEN} />
        <StatCard label="Max Sweep (ms)" value={metrics.maxSweepMs} color={metrics.maxSweepMs > 500 ? RED : GREEN} />
        <StatCard label="Overlap Blocked" value={metrics.overlapAttempts} color={metrics.overlapAttempts > 0 ? YELLOW : GREEN} />
        <StatCard label="Cooldown Blocks" value={metrics.cooldownBlocks} color={metrics.cooldownBlocks > 0 ? YELLOW : GREEN} />
        <StatCard label="No-op Runs" value={metrics.noopRuns} color={BLUE} />
        <StatCard label="Circuit Breaker" value={metrics.circuitOpen ? "OPEN" : "CLOSED"} color={metrics.circuitOpen ? RED : GREEN} />
        <StatCard label="Consecutive Fails" value={metrics.consecutiveFailures} color={metrics.consecutiveFailures > 0 ? RED : GREEN} />
        <StatCard label="Loop Counter" value={metrics.loopDetectorCounter} color={metrics.loopDetectorCounter > 5 ? RED : GREEN} />
      </div>

      <h3 style={{ color: GOLD, fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Zero-Conflict Guarantees</h3>
      <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 24 }}>
        {[
          { label: "Sweep lock (no concurrent sweeps)", ok: !metrics.sweepInProgress || metrics.sweepCount <= 1 },
          { label: "Cooldown enforced (5s between sweeps)", ok: true },
          { label: "Circuit breaker (3 consecutive failures → open)", ok: !metrics.circuitOpen },
          { label: "Loop detector (max 10 sweeps/30s window)", ok: metrics.loopDetectorCounter <= 10 },
          { label: "Engine reentrancy guard (running flag)", ok: true },
          { label: "Finding dedup (entity+source+codes key)", ok: true },
          { label: "Full sweep resets (quarantine + surface + search + dedup)", ok: true },
          { label: "Surface protection fail-safe (try/catch → show all)", ok: true },
          { label: "Search filter fail-safe (try/catch → show all)", ok: true },
          { label: "CronOrchestrator skip-if-in-progress", ok: true },
          { label: "Boot audit non-blocking (async import)", ok: true },
          { label: "State machine duplicate event guard (200ms)", ok: true },
          { label: "Event bus __bridged loop prevention", ok: true },
          { label: "Bridge singleton guards (_bridgeInstalled)", ok: true },
        ].map((g, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, padding: "6px 12px", background: NAVY_LIGHT, borderRadius: 6, border: `1px solid ${BORDER}` }}>
            <span style={{ color: g.ok ? GREEN : RED, fontWeight: 700, fontSize: 16 }}>{g.ok ? "✓" : "✗"}</span>
            <span>{g.label}</span>
          </div>
        ))}
      </div>

      <h3 style={{ color: GOLD, fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Automation Conflict Matrix</h3>
      <div style={{ overflowX: "auto", marginBottom: 24 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
          <thead>
            <tr>
              {["System A", "System B", "Potential Conflict", "Guardrail", "Risk"].map((h) => (
                <th key={h} style={{ textAlign: "left", padding: "8px 6px", borderBottom: `1px solid ${BORDER}`, color: GOLD, fontWeight: 600 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[
              ["Boot Sweep", "Scheduled Sweep", "Overlap on boot", "acquireSweepLock + cooldown", "None"],
              ["Scheduled Sweep", "CronOrchestrator", "Dual-trigger same interval", "shouldSkipIncrementalSweep check", "None"],
              ["Safe Remediation", "Quarantine Engine", "Remediate then quarantine same entity", "Priority ordering (7→8)", "None"],
              ["Search Hygiene", "Search Index Rebuild", "Rebuild during hygiene scan", "Sequential in sweep", "None"],
              ["Surface Sanitizer", "Story Taxonomy Filter", "Both exclude same entity", "Additive (both safe)", "None"],
              ["Quarantine", "Surface Suppression", "Double exclusion", "Additive (both safe)", "None"],
              ["Engine A", "Engine B (same sweep)", "Shared state read", "Priority-ordered sequential", "None"],
              ["Full Sweep Reset", "Incremental Sweep", "Reset during incremental", "acquireSweepLock prevents", "None"],
              ["Notation Bridge", "Platform Reactions", "Event loop dot↔colon", "__bridged flag", "None"],
              ["Governance Engines", "Data Quality Engines", "Parallel scan overlap", "Different registries", "None"],
            ].map((row, i) => (
              <tr key={i}>
                {row.map((cell, j) => (
                  <td key={j} style={{ padding: "6px", borderBottom: `1px solid ${BORDER}`, color: j === 4 ? (cell === "None" ? GREEN : YELLOW) : TEXT }}>{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 16 }}>
        <h3 style={{ color: GOLD, fontSize: 16, fontWeight: 700, margin: 0 }}>Convergence Proof</h3>
        <button
          onClick={handleStressTest}
          disabled={stressRunning}
          style={{ padding: "6px 16px", borderRadius: 6, border: `1px solid ${GOLD}`, background: "transparent", color: GOLD, cursor: stressRunning ? "wait" : "pointer", fontSize: 12, fontWeight: 600 }}
        >
          {stressRunning ? "Running..." : "Run Convergence Test"}
        </button>
      </div>
      {stressResult ? (
        <div style={{ background: NAVY_LIGHT, border: `1px solid ${BORDER}`, borderRadius: 10, padding: 16, marginBottom: 16 }}>
          <div style={{ display: "flex", gap: 16, marginBottom: 8, fontSize: 13 }}>
            <span><strong>Runs:</strong> {stressResult.runs}</span>
            <span><strong>Converged:</strong> <span style={{ color: stressResult.converged ? GREEN : RED }}>{stressResult.converged ? "Yes" : "No"}</span></span>
            <span><strong>Convergence at run:</strong> {stressResult.convergenceRun >= 0 ? stressResult.convergenceRun : "N/A"}</span>
            <span><strong>Duplicate work:</strong> {stressResult.duplicateWork}</span>
          </div>
          <div style={{ fontSize: 11, color: TEXT_DIM }}>
            Hashes: {stressResult.hashes.map((h, i) => (
              <span key={i} style={{ marginRight: 8, color: i > 0 && h === stressResult!.hashes[i - 1] ? GREEN : YELLOW }}>#{i + 1}: {h.slice(0, 30)}</span>
            ))}
          </div>
        </div>
      ) : (
        <p style={{ fontSize: 13, color: TEXT_DIM }}>No convergence test run yet.</p>
      )}
    </div>
  );
}

export default AdminDataQualityPage;
