import { useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import type { ChiefAgentResponse } from "@/stores/chief-agent-store";

const SEVERITY_COLOR: Record<string, string> = {
  green: "#10b981",
  yellow: "#f59e0b",
  red: "#ef4444",
};

interface Props {
  response: ChiefAgentResponse;
}

export function InlineVisualizations({ response }: Props) {
  const findingChartData = useMemo(() => {
    const counts: Record<string, number> = { green: 0, yellow: 0, red: 0 };
    for (const f of response.findings) counts[f.severity] = (counts[f.severity] ?? 0) + 1;
    return [
      { name: "OK", value: counts.green, key: "green" },
      { name: "Warn", value: counts.yellow, key: "yellow" },
      { name: "Critical", value: counts.red, key: "red" },
    ];
  }, [response.findings]);

  const showFindingsChart = response.findings.length >= 3;
  const showAgentsTable = response.agentsUsed.length >= 2 || response.actionsTaken.length >= 2;

  if (!showFindingsChart && !showAgentsTable) return null;

  return (
    <div className="space-y-2 pt-1">
      {showFindingsChart && (
        <div className="rounded-xl bg-muted/20 border border-border/20 p-3">
          <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Findings overview
          </div>
          <div className="h-28">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={findingChartData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: "currentColor" }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: "currentColor" }} axisLine={false} tickLine={false} width={28} />
                <Tooltip
                  cursor={{ fill: "rgba(255,255,255,0.04)" }}
                  contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {findingChartData.map((d) => (
                    <Cell key={d.key} fill={SEVERITY_COLOR[d.key] ?? "#64748b"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {showAgentsTable && (
        <div className="rounded-xl bg-muted/20 border border-border/20 overflow-hidden">
          <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-3 pt-3">
            Activity summary
          </div>
          <table className="w-full text-xs mt-2">
            <thead>
              <tr className="text-left text-muted-foreground/80">
                <th className="px-3 py-1.5 font-medium">Metric</th>
                <th className="px-3 py-1.5 font-medium text-right">Value</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t border-border/10">
                <td className="px-3 py-1.5">Agents used</td>
                <td className="px-3 py-1.5 text-right font-mono">{response.agentsUsed.join(", ") || "—"}</td>
              </tr>
              <tr className="border-t border-border/10">
                <td className="px-3 py-1.5">Actions taken</td>
                <td className="px-3 py-1.5 text-right font-mono">{response.actionsTaken.length}</td>
              </tr>
              <tr className="border-t border-border/10">
                <td className="px-3 py-1.5">Findings</td>
                <td className="px-3 py-1.5 text-right font-mono">{response.findings.length}</td>
              </tr>
              <tr className="border-t border-border/10">
                <td className="px-3 py-1.5">Status</td>
                <td className="px-3 py-1.5 text-right font-mono">{response.status}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
