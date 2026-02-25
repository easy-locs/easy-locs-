import { useState } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { ShieldCheck, Play, CheckCircle, XCircle, Clock, AlertTriangle } from "lucide-react";
import { getDocuments, getVaultFiles, getReminders, getUser } from "@/lib/store";
import { getAllTemplates } from "@/lib/templates/registry";
import { generateFromTemplate, pdfToDataUri } from "@/lib/pdf-generator";
import { frRentReceipt } from "@/lib/templates/fr/rent-receipt";

interface CheckResult {
  name: string;
  status: "pass" | "fail" | "warn";
  message: string;
}

const Admin = () => {
  const [results, setResults] = useState<CheckResult[]>([]);
  const [running, setRunning] = useState(false);

  const runSelfCheck = async () => {
    setRunning(true);
    const checks: CheckResult[] = [];

    // 1. User profile
    try {
      const user = getUser();
      checks.push({ name: "Profil utilisateur", status: user.id ? "pass" : "fail", message: user.id ? `${user.name} (${user.email})` : "Aucun profil trouvé" });
    } catch { checks.push({ name: "Profil utilisateur", status: "fail", message: "Erreur lecture profil" }); }

    // 2. Templates
    try {
      const templates = getAllTemplates();
      const active = templates.filter((t) => t.active);
      checks.push({ name: "Moteur de templates", status: active.length > 0 ? "pass" : "warn", message: `${active.length} actifs / ${templates.length} total` });
    } catch { checks.push({ name: "Moteur de templates", status: "fail", message: "Erreur chargement templates" }); }

    // 3. PDF generation
    try {
      const testData = { landlordName: "Test", tenantName: "Test", propertyAddress: "Test", rentAmount: 100, chargesAmount: 0, periodStart: "2026-01-01", periodEnd: "2026-01-31", paymentDate: "2026-01-05" };
      const doc = generateFromTemplate(frRentReceipt, testData);
      const uri = pdfToDataUri(doc);
      checks.push({ name: "Génération PDF", status: uri.length > 100 ? "pass" : "fail", message: uri.length > 100 ? `PDF généré (${Math.round(uri.length / 1024)} Ko)` : "PDF vide" });
    } catch (e) { checks.push({ name: "Génération PDF", status: "fail", message: String(e) }); }

    // 4. Document history
    try {
      const docs = getDocuments();
      checks.push({ name: "Historique documents", status: "pass", message: `${docs.length} document(s) en mémoire` });
    } catch { checks.push({ name: "Historique documents", status: "fail", message: "Erreur lecture historique" }); }

    // 5. Vault
    try {
      const files = getVaultFiles();
      checks.push({ name: "Coffre-fort", status: "pass", message: `${files.length} fichier(s)` });
    } catch { checks.push({ name: "Coffre-fort", status: "fail", message: "Erreur lecture coffre" }); }

    // 6. Reminders
    try {
      const reminders = getReminders();
      checks.push({ name: "Rappels", status: "pass", message: `${reminders.length} rappel(s)` });
    } catch { checks.push({ name: "Rappels", status: "fail", message: "Erreur lecture rappels" }); }

    // 7. Auth (placeholder)
    checks.push({ name: "Authentification", status: "warn", message: "Mode démo — pas de backend connecté" });

    // 8. Subscription gating (placeholder)
    checks.push({ name: "Gestion abonnements", status: "warn", message: "Stripe non connecté" });

    // 9. Share links (placeholder)
    checks.push({ name: "Liens de partage", status: "warn", message: "Backend requis pour partage sécurisé" });

    setResults(checks);
    setRunning(false);
  };

  const statusIcon = (s: CheckResult["status"]) => {
    if (s === "pass") return <CheckCircle className="h-4 w-4 text-success" />;
    if (s === "fail") return <XCircle className="h-4 w-4 text-destructive" />;
    return <AlertTriangle className="h-4 w-4 text-warning" />;
  };

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold text-foreground mb-1">Administration</h1>
        <p className="text-muted-foreground text-sm mb-8">Diagnostic et vérification de l'application.</p>

        <div className="bg-card rounded-xl shadow-card border border-border/50 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <ShieldCheck className="h-5 w-5 text-muted-foreground" />
              <h2 className="font-semibold text-foreground">Auto-diagnostic E2E</h2>
            </div>
            <button
              onClick={runSelfCheck}
              disabled={running}
              className="flex items-center gap-2 bg-gradient-gold text-accent-foreground font-semibold px-4 py-2 rounded-lg shadow-gold hover:opacity-90 transition-opacity text-sm disabled:opacity-50"
            >
              {running ? <Clock className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              {running ? "Vérification…" : "Lancer le diagnostic"}
            </button>
          </div>

          {results.length > 0 && (
            <div className="space-y-2">
              {results.map((r) => (
                <div key={r.name} className="flex items-center gap-3 px-4 py-3 rounded-lg bg-muted/30">
                  {statusIcon(r.status)}
                  <div className="flex-1">
                    <span className="text-sm font-medium text-foreground">{r.name}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">{r.message}</span>
                </div>
              ))}
              <div className="mt-4 pt-4 border-t border-border flex items-center gap-2">
                <span className="text-sm font-medium text-foreground">
                  {results.filter((r) => r.status === "pass").length}/{results.length} vérifications OK
                </span>
                {results.some((r) => r.status === "fail") && (
                  <span className="text-xs bg-destructive/10 text-destructive px-2 py-0.5 rounded-full">Erreurs détectées</span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Logs placeholder */}
        <div className="bg-card rounded-xl shadow-card border border-border/50 p-6">
          <h2 className="font-semibold text-foreground mb-4">Logs d'activité</h2>
          <div className="text-sm text-muted-foreground text-center py-8">
            Les logs d'audit seront disponibles une fois le backend connecté.
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Admin;
