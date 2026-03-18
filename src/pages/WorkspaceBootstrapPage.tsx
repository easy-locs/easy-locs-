import { useState } from "react";
import { BackCard } from "@/components/ui/back-card";
import { createWorkspace } from "@/lib/workspace/workspace-core";

export default function WorkspaceBootstrapPage() {
  const [name, setName] = useState("Pizza Times Dubai");
  const [loading, setLoading] = useState(false);
  const [workspace, setWorkspace] = useState<any>(null);

  const create = async () => {
    setLoading(true);
    try {
      const ws = await createWorkspace({
        name,
        workspaceType: "business",
        currency: "AED",
        city: "Dubai",
        countryCode: "AE",
      });
      setWorkspace(ws);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-4 space-y-6">
      <BackCard label="Back" to="/dashboard" />
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-foreground">Workspace Bootstrap</h1>
        <p className="text-sm text-muted-foreground">Create your business workspace</p>
      </div>

      <input
        className="w-full border border-border rounded-lg px-4 py-2 bg-card text-foreground"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Workspace name"
      />

      <button
        onClick={create}
        disabled={loading}
        className="w-full bg-primary text-primary-foreground py-3 rounded-xl font-semibold disabled:opacity-50"
      >
        {loading ? "Creating..." : "Create workspace"}
      </button>

      {!!workspace && (
        <div className="bg-card border border-border rounded-xl p-4 space-y-1">
          <p className="text-sm text-foreground font-medium">workspace: {workspace.name}</p>
          <p className="text-xs text-muted-foreground">slug: {workspace.slug}</p>
        </div>
      )}
    </div>
  );
}
