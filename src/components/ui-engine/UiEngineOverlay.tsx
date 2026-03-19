import React, { useState } from "react";
import type { UiEngineReport } from "@/lib/ui-engine/types";

export function UiEngineOverlay({
  report,
  onRun,
}: {
  report: UiEngineReport | null;
  onRun: () => void;
}) {
  const [open, setOpen] = useState(false);
  if (!report) return null;

  const color =
    report.score.total >= 85
      ? "rgba(16,185,129,0.18)"
      : report.score.total >= 60
        ? "rgba(245,158,11,0.18)"
        : "rgba(239,68,68,0.18)";

  return (
    <div style={{ position: "fixed", bottom: 72, right: 12, zIndex: 9999, width: 300, borderRadius: 16, background: "#1a1a2e", color: "#fff", boxShadow: "0 8px 32px rgba(0,0,0,0.4)", fontSize: 13, overflow: "hidden" }}>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{ width: "100%", textAlign: "left", padding: 12, background: color, border: "none", color: "white", cursor: "pointer", fontWeight: 700 }}
      >
        UI ENGINE · {report.score.total}% · {report.issues.length} issue{report.issues.length !== 1 ? "s" : ""}
      </button>

      {open && (
        <div style={{ padding: 12 }}>
          <div style={{ marginBottom: 8, opacity: 0.7 }}>
            {report.pageType} · patched {report.patchedCount}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4, marginBottom: 8, fontSize: 11 }}>
            <p>Clarity: {report.score.clarity}</p>
            <p>Consistency: {report.score.consistency}</p>
            <p>Mobile: {report.score.mobile}</p>
            <p>Conversion: {report.score.conversion}</p>
            <p>Access: {report.score.accessibility}</p>
          </div>

          <div style={{ maxHeight: 180, overflowY: "auto", marginBottom: 8 }}>
            {report.issues.length === 0 && <p style={{ opacity: 0.5 }}>No issues detected.</p>}
            {report.issues.map((issue) => (
              <div key={issue.id} style={{ padding: "6px 0", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                <p style={{ fontWeight: 600 }}>{issue.type}</p>
                <p style={{ opacity: 0.7 }}>{issue.message}</p>
                <p style={{ fontSize: 10, opacity: 0.5 }}>
                  {issue.severity} · {issue.patchable ? "patchable" : "manual"}
                </p>
              </div>
            ))}
          </div>

          <button onClick={onRun} style={{ width: "100%", padding: 8, borderRadius: 8, border: "none", background: "#6366f1", color: "#fff", fontWeight: 700, cursor: "pointer" }}>
            Re-run UI Engine
          </button>
        </div>
      )}
    </div>
  );
}
