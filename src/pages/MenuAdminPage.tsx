import { useState } from "react";
import { BackCard } from "@/components/ui/back-card";
import { publishImportedMenuToCatalog } from "@/lib/onboarding/menu-publisher";
import { useAuth } from "@/contexts/AuthContext";

export default function MenuAdminPage() {
  const { user, orgId } = useAuth();
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const publish = async () => {
    if (!user?.id) {
      setMessage("Connectez-vous pour publier un menu importé.");
      return;
    }

    setLoading(true);
    setMessage(null);
    try {
      const result = await publishImportedMenuToCatalog({
        userId: user.id,
        workspaceId: orgId,
      });

      setMessage(
        result.importedCount > 0
          ? `${result.createdCount} article(s) publiés, ${result.skippedCount} déjà existant(s).`
          : "Aucun menu importé trouvé pour ce compte."
      );
      setDone(true);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Échec de publication du menu.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-4 space-y-6">
      <BackCard label="Back" to="/dashboard" />
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-foreground">Menu Admin</h1>
        <p className="text-sm text-muted-foreground">Publier les menus importés vers le catalogue live</p>
      </div>

      <button
        onClick={publish}
        disabled={loading}
        className="w-full bg-primary text-primary-foreground py-3 rounded-xl font-semibold disabled:opacity-50"
      >
        {loading ? "Publication en cours..." : "Publier le menu importé"}
      </button>

      {message && (
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-sm text-foreground">{message}</p>
        </div>
      )}

      {done && !message && (
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-sm text-foreground">Publication terminée.</p>
        </div>
      )}
    </div>
  );
}
