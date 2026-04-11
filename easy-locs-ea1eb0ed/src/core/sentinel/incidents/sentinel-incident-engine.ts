import type { IncidentRecord, SentinelSeverity, IncidentStatus } from "../types";

let incidentCounter = 0;
function nextIncidentId(): string {
  return `INC_${Date.now()}_${++incidentCounter}`;
}

class SentinelIncidentEngine {
  private incidents = new Map<string, IncidentRecord>();
  private readonly MAX_INCIDENTS = 500;

  open(severity: SentinelSeverity, category: string, engineId: string, title: string, details: string, linkedAuditRun?: string): IncidentRecord {
    const existing = this.findExisting(category, engineId, title);
    if (existing && (existing.status === "open" || existing.status === "investigating")) {
      return existing;
    }

    const incident: IncidentRecord = {
      incident_id: nextIncidentId(),
      severity,
      category,
      engine_id: engineId,
      title,
      details,
      started_at: Date.now(),
      ended_at: null,
      status: "open",
      linked_audit_run: linkedAuditRun || null,
    };

    this.incidents.set(incident.incident_id, incident);
    this.trimIncidents();
    return incident;
  }

  private findExisting(category: string, engineId: string, title: string): IncidentRecord | undefined {
    return Array.from(this.incidents.values()).find(
      (i) => i.category === category && i.engine_id === engineId && i.title === title && (i.status === "open" || i.status === "investigating")
    );
  }

  private trimIncidents(): void {
    if (this.incidents.size <= this.MAX_INCIDENTS) return;
    const sorted = Array.from(this.incidents.entries())
      .sort(([, a], [, b]) => {
        const aResolved = a.status === "resolved" || a.status === "false_positive" ? 0 : 1;
        const bResolved = b.status === "resolved" || b.status === "false_positive" ? 0 : 1;
        if (aResolved !== bResolved) return aResolved - bResolved;
        return a.started_at - b.started_at;
      });
    for (const [key] of sorted.slice(0, this.incidents.size - this.MAX_INCIDENTS)) {
      this.incidents.delete(key);
    }
  }

  updateStatus(incidentId: string, status: IncidentStatus): boolean {
    const incident = this.incidents.get(incidentId);
    if (!incident) return false;
    incident.status = status;
    if (status === "resolved" || status === "false_positive" || status === "mitigated") {
      incident.ended_at = Date.now();
    }
    return true;
  }

  resolve(incidentId: string): boolean {
    return this.updateStatus(incidentId, "resolved");
  }

  getOpen(): IncidentRecord[] {
    return Array.from(this.incidents.values()).filter((i) => i.status === "open" || i.status === "investigating");
  }

  getCritical(): IncidentRecord[] {
    return this.getOpen().filter((i) => i.severity === "critical");
  }

  getByEngine(engineId: string): IncidentRecord[] {
    return Array.from(this.incidents.values()).filter((i) => i.engine_id === engineId);
  }

  getByCategory(category: string): IncidentRecord[] {
    return Array.from(this.incidents.values()).filter((i) => i.category === category);
  }

  getRecurring(windowMs = 86_400_000): Array<{ title: string; count: number; engine_id: string }> {
    const now = Date.now();
    const recent = Array.from(this.incidents.values()).filter((i) => i.started_at > now - windowMs);
    const counts = new Map<string, { count: number; engine_id: string }>();
    for (const i of recent) {
      const key = `${i.engine_id}::${i.title}`;
      const existing = counts.get(key) || { count: 0, engine_id: i.engine_id };
      existing.count++;
      counts.set(key, existing);
    }
    return Array.from(counts.entries())
      .filter(([, v]) => v.count > 1)
      .map(([title, v]) => ({ title: title.split("::")[1], count: v.count, engine_id: v.engine_id }))
      .sort((a, b) => b.count - a.count);
  }

  getStats(): { total: number; open: number; critical: number; investigating: number; mitigated: number; resolved: number } {
    const all = Array.from(this.incidents.values());
    return {
      total: all.length,
      open: all.filter((i) => i.status === "open").length,
      critical: all.filter((i) => i.severity === "critical" && (i.status === "open" || i.status === "investigating")).length,
      investigating: all.filter((i) => i.status === "investigating").length,
      mitigated: all.filter((i) => i.status === "mitigated").length,
      resolved: all.filter((i) => i.status === "resolved").length,
    };
  }
}

export const sentinelIncidentEngine = new SentinelIncidentEngine();
