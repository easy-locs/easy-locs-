import { useState } from "react";
import { BackCard } from "@/components/ui/back-card";
import { addIncidentEvent, createIncidentCase, resolveIncidentCase } from "@/lib/admin/incidents";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function IncidentDashboardPage() {
  const [incident, setIncident] = useState<any>(null);

  const create = async () => {
    const created = await createIncidentCase({
      incidentType: "payment",
      severity: "critical",
      title: "Payment provider degraded",
      summary: "High error rate during checkout confirmations",
    });
    await addIncidentEvent({
      incidentId: created.id,
      eventType: "created",
      body: "Incident opened by ops dashboard",
    });
    setIncident(created);
    toast.success("Incident created");
  };

  const note = async () => {
    if (!incident) return;
    await addIncidentEvent({
      incidentId: incident.id,
      eventType: "note",
      body: "Investigating provider callback failures",
    });
    toast.success("Note added");
  };

  const resolve = async () => {
    if (!incident) return;
    const done = await resolveIncidentCase(incident.id);
    setIncident(done);
    toast.success("Incident resolved");
  };

  return (
    <div className="min-h-screen bg-background p-4 space-y-4 max-w-lg mx-auto">
      <BackCard />
      <div>
        <h1 className="text-xl font-bold text-foreground">Incident Dashboard</h1>
        <p className="text-sm text-muted-foreground">Operational incident workflow</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button onClick={create} variant="outline" className="rounded-xl">Create incident</Button>
        <Button onClick={note} variant="outline" className="rounded-xl" disabled={!incident}>Add note</Button>
        <Button onClick={resolve} variant="outline" className="rounded-xl" disabled={!incident}>Resolve</Button>
      </div>
      {incident && (
        <div className="rounded-xl border border-border bg-card p-4 space-y-1">
          <p className="text-sm font-semibold text-foreground">{incident.title}</p>
          <p className="text-xs text-muted-foreground">severity: {incident.severity}</p>
          <p className="text-xs text-muted-foreground">status: <span className="font-bold">{incident.status}</span></p>
        </div>
      )}
    </div>
  );
}
