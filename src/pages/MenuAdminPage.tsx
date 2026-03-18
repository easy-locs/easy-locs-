import { useState } from "react";
import { BackCard } from "@/components/ui/back-card";
import { publishImportedMenuToCatalog } from "@/lib/onboarding/menu-publisher";

export default function MenuAdminPage() {
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  const publish = async () => {
    setLoading(true);
    try {
      await publishImportedMenuToCatalog({
        workspaceId: "REPLACE_WITH_REAL_WORKSPACE_ID",
        profileId: "REPLACE_WITH_REAL_PROFILE_ID",
      });
      setDone(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-4 space-y-6">
      <BackCard label="Back" to="/dashboard" />
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-foreground">Menu Admin</h1>
        <p className="text-sm text-muted-foreground">Publish imported items to live catalog</p>
      </div>

      <button
        onClick={publish}
        disabled={loading}
        className="w-full bg-primary text-primary-foreground py-3 rounded-xl font-semibold disabled:opacity-50"
      >
        {loading ? "Publishing..." : "Publish imported menu"}
      </button>

      {done && (
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-sm text-green-600">Menu published successfully.</p>
        </div>
      )}
    </div>
  );
}
