import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useUiEngine } from "@/hooks/useUiEngine";
import SubPageShell from "@/components/layout/SubPageShell";
import { db } from "@/services/db";

interface ReleaseEntry {
  version: string;
  date: string;
  bump: "major" | "minor" | "patch";
  features: string[];
  fixes: string[];
  breaking: string[];
  commitCount: number;
}

interface AuditLogEntry {
  id: string;
  action: string;
  details: Record<string, unknown>;
  created_at: string;
  performed_by: string;
}

const BUMP_COLORS: Record<string, string> = {
  major: "bg-red-500/10 text-red-400 border-red-500/20",
  minor: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  patch: "bg-green-500/10 text-green-400 border-green-500/20",
};

async function loadReleasesFromChangelog(): Promise<ReleaseEntry[]> {
  try {
    const resp = await fetch("/CHANGELOG.md");
    if (!resp.ok) return [];
    const text = await resp.text();
    return parseChangelogToReleases(text);
  } catch {
    return [];
  }
}

function parseChangelogToReleases(markdown: string): ReleaseEntry[] {
  const releases: ReleaseEntry[] = [];
  const sections = markdown.split(/^## /m).filter(Boolean);

  for (const section of sections) {
    const headerMatch = section.match(/^(.+?)\s*\((\d{4}-\d{2}-\d{2})\)/);
    if (!headerMatch) continue;

    const version = headerMatch[1].trim();
    const date = headerMatch[2];
    const features: string[] = [];
    const fixes: string[] = [];
    const breaking: string[] = [];

    let currentCategory = "";
    for (const line of section.split("\n")) {
      if (line.startsWith("### ")) {
        const cat = line.replace("### ", "").trim().toLowerCase();
        if (cat.includes("breaking")) currentCategory = "breaking";
        else if (cat.includes("feature")) currentCategory = "features";
        else if (cat.includes("fix")) currentCategory = "fixes";
        else currentCategory = "other";
      } else if (line.startsWith("- ")) {
        const item = line.replace("- ", "").trim();
        if (currentCategory === "breaking") breaking.push(item);
        else if (currentCategory === "features") features.push(item);
        else if (currentCategory === "fixes") fixes.push(item);
      }
    }

    const commitCount = features.length + fixes.length + breaking.length;
    const bump: ReleaseEntry["bump"] = breaking.length > 0 ? "major" : features.length > 0 ? "minor" : "patch";
    releases.push({ version, date, bump, features, fixes, breaking, commitCount });
  }

  return releases;
}

async function loadAuditLog(): Promise<AuditLogEntry[]> {
  try {
    const { data } = await db
      .from("kill_switch_audit_log")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);
    return (data as unknown as AuditLogEntry[]) || [];
  } catch {
    return [];
  }
}

async function loadDegradationLog(): Promise<AuditLogEntry[]> {
  try {
    const { data } = await db
      .from("degradation_audit_log")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);
    return (data as unknown as AuditLogEntry[]) || [];
  } catch {
    return [];
  }
}

export default function AdminReleaseHistoryPage() {
  useUiEngine("admin-release-history");
  const navigate = useNavigate();
  const [releases, setReleases] = useState<ReleaseEntry[]>([]);
  const [auditEntries, setAuditEntries] = useState<AuditLogEntry[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"releases" | "audit" | "cli">("releases");

  const refresh = useCallback(async () => {
    setLoading(true);
    const [killSwitchLog, degradationLog] = await Promise.all([
      loadAuditLog(),
      loadDegradationLog(),
    ]);
    setAuditEntries([...killSwitchLog, ...degradationLog].sort((a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    ));
    const changelogReleases = await loadReleasesFromChangelog();
    setReleases(changelogReleases);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <SubPageShell>
      <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/admin/lab-hub")} className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center">←</button>
          <div>
            <h1 className="text-lg font-bold">Release Factory</h1>
            <p className="text-xs text-muted-foreground">Changelog, version management, audit trail</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-xl bg-card border border-border/20 p-3 text-center">
            <div className="text-xl font-bold text-foreground">{releases[0]?.version || "—"}</div>
            <div className="text-xs text-muted-foreground">Latest</div>
          </div>
          <div className="rounded-xl bg-card border border-border/20 p-3 text-center">
            <div className="text-xl font-bold text-foreground">{releases.length}</div>
            <div className="text-xs text-muted-foreground">Releases</div>
          </div>
          <div className="rounded-xl bg-card border border-border/20 p-3 text-center">
            <div className="text-xl font-bold text-foreground">{auditEntries.length}</div>
            <div className="text-xs text-muted-foreground">Audit Events</div>
          </div>
        </div>

        <div className="flex gap-2">
          {(["releases", "audit", "cli"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                tab === t ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              }`}
            >
              {t === "releases" ? "Releases" : t === "audit" ? "Audit Trail" : "CLI"}
            </button>
          ))}
        </div>

        {loading && (
          <div className="text-center text-sm text-muted-foreground py-8">Loading release data...</div>
        )}

        {!loading && tab === "releases" && (
          <div className="space-y-3">
            {releases.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-sm text-muted-foreground">No releases recorded yet.</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Run the changelog and version bump scripts to generate release entries:
                </p>
                <pre className="text-xs bg-muted px-2 py-1 rounded mt-2 font-mono">npm run changelog && npm run version:bump --apply</pre>
              </div>
            ) : (
              releases.map((r) => (
                <div key={r.version} className="rounded-xl bg-card border border-border/20 overflow-hidden">
                  <button
                    onClick={() => setExpanded(expanded === r.version ? null : r.version)}
                    className="w-full p-4 flex justify-between items-center text-left"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-bold">{r.version}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${BUMP_COLORS[r.bump]}`}>
                        {r.bump}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">{r.date}</span>
                      <span className="text-xs text-muted-foreground">{expanded === r.version ? "▲" : "▼"}</span>
                    </div>
                  </button>

                  {expanded === r.version && (
                    <div className="px-4 pb-4 space-y-2 border-t border-border/10 pt-3">
                      <div className="text-xs text-muted-foreground">{r.commitCount} commits</div>
                      {r.breaking.length > 0 && (
                        <div>
                          <div className="text-xs font-bold text-red-400 mb-1">Breaking Changes</div>
                          {r.breaking.map((b, i) => (
                            <div key={i} className="text-xs text-muted-foreground pl-2">{b}</div>
                          ))}
                        </div>
                      )}
                      {r.features.length > 0 && (
                        <div>
                          <div className="text-xs font-bold text-green-400 mb-1">Features</div>
                          {r.features.map((f, i) => (
                            <div key={i} className="text-xs text-muted-foreground pl-2">{f}</div>
                          ))}
                        </div>
                      )}
                      {r.fixes.length > 0 && (
                        <div>
                          <div className="text-xs font-bold text-yellow-400 mb-1">Bug Fixes</div>
                          {r.fixes.map((f, i) => (
                            <div key={i} className="text-xs text-muted-foreground pl-2">{f}</div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {!loading && tab === "audit" && (
          <div className="space-y-2">
            {auditEntries.length === 0 ? (
              <div className="text-center text-sm text-muted-foreground py-8">
                No audit entries found. Kill switch toggles and degradation mode changes are logged here automatically.
              </div>
            ) : (
              auditEntries.map((e) => (
                <div key={e.id} className="rounded-xl bg-card border border-border/20 p-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold">{e.action}</span>
                    <span className="text-xs text-muted-foreground">{new Date(e.created_at).toLocaleString()}</span>
                  </div>
                  {e.performed_by && (
                    <div className="text-xs text-muted-foreground mt-1">By: {e.performed_by.slice(0, 12)}...</div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {!loading && tab === "cli" && (
          <div className="rounded-xl bg-card border border-border/20 p-4">
            <h3 className="text-sm font-bold mb-3">Release CLI Commands</h3>
            <div className="space-y-3 text-xs text-muted-foreground">
              <div>
                <code className="bg-muted px-2 py-1 rounded font-mono block">npm run changelog</code>
                <p className="mt-1">Generate changelog from conventional commits since last tag.</p>
              </div>
              <div>
                <code className="bg-muted px-2 py-1 rounded font-mono block">npm run version:bump</code>
                <p className="mt-1">Calculate next semantic version (dry run by default).</p>
              </div>
              <div>
                <code className="bg-muted px-2 py-1 rounded font-mono block">npm run version:bump -- --apply</code>
                <p className="mt-1">Apply the version bump to package.json.</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </SubPageShell>
  );
}
