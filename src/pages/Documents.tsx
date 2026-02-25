import { useState } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Send, FileText, XCircle, AlertTriangle, ShieldCheck, Download, ArrowLeft, Clock } from "lucide-react";
import { generateSwornStatementPDF, downloadPDF, pdfToDataUri } from "@/lib/pdf-generator";
import { addDocument, getDocuments, type GeneratedDocument } from "@/lib/store";

const templates = [
  { type: "sworn-statement" as const, icon: FileText, label: "Attestation sur l'honneur", description: "Déclaration solennelle pour diverses démarches." },
  { type: "termination" as const, icon: XCircle, label: "Lettre de résiliation", description: "Résiliation de contrat (assurance, abonnement…)." },
  { type: "formal-notice" as const, icon: AlertTriangle, label: "Mise en demeure", description: "Lettre de mise en demeure formelle." },
  { type: "gdpr" as const, icon: ShieldCheck, label: "Modèle RGPD", description: "Demande de suppression ou d'accès aux données." },
];

const Documents = () => {
  const [activeForm, setActiveForm] = useState<string | null>(null);
  const [tab, setTab] = useState<"create" | "history">("create");
  const [, setRefresh] = useState(0);
  const [swornForm, setSwornForm] = useState({
    fullName: "",
    birthDate: "",
    birthPlace: "",
    address: "",
    statement: "",
  });

  const allDocs = getDocuments();

  const handleGenerateSworn = () => {
    const doc = generateSwornStatementPDF(swornForm);
    const record: GeneratedDocument = {
      id: crypto.randomUUID(),
      userId: "demo-user-1",
      type: "sworn-statement",
      country: "FR",
      title: `Attestation sur l'honneur — ${swornForm.fullName}`,
      dataJson: swornForm,
      pdfDataUri: pdfToDataUri(doc),
      createdAt: new Date().toISOString(),
    };
    addDocument(record);
    downloadPDF(doc, `attestation_${swornForm.fullName.replace(/\s/g, "_").toLowerCase()}.pdf`);
    setActiveForm(null);
    setTab("history");
    setRefresh((r) => r + 1);
  };

  const handleDownload = (d: GeneratedDocument) => {
    if (d.pdfDataUri) {
      const link = document.createElement("a");
      link.href = d.pdfDataUri;
      link.download = `${d.title.replace(/\s/g, "_")}.pdf`;
      link.click();
    }
  };

  if (activeForm === "sworn-statement") {
    return (
      <DashboardLayout>
        <div className="max-w-2xl mx-auto">
          <button onClick={() => setActiveForm(null)} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
            <ArrowLeft className="h-4 w-4" /> Retour
          </button>
          <h1 className="text-2xl font-bold text-foreground mb-6">Attestation sur l'honneur</h1>
          <div className="bg-card rounded-xl shadow-card border border-border/50 p-6 space-y-5">
            {[
              { key: "fullName", label: "Nom complet", type: "text" },
              { key: "birthDate", label: "Date de naissance", type: "date" },
              { key: "birthPlace", label: "Lieu de naissance", type: "text" },
              { key: "address", label: "Adresse actuelle", type: "text" },
            ].map((f) => (
              <div key={f.key}>
                <label className="block text-sm font-medium text-foreground mb-1.5">{f.label}</label>
                <input
                  type={f.type}
                  value={(swornForm as Record<string, string>)[f.key]}
                  onChange={(e) => setSwornForm((p) => ({ ...p, [f.key]: e.target.value }))}
                  className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            ))}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Déclaration</label>
              <textarea
                rows={4}
                value={swornForm.statement}
                onChange={(e) => setSwornForm((p) => ({ ...p, statement: e.target.value }))}
                placeholder="Je soussigné(e) certifie sur l'honneur que..."
                className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
              />
            </div>
            <button onClick={handleGenerateSworn} className="w-full bg-gradient-gold text-accent-foreground font-semibold py-3 rounded-lg shadow-gold hover:opacity-90 transition-opacity">
              Générer et télécharger le PDF
            </button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-foreground mb-1">Documents administratifs</h1>
        <p className="text-muted-foreground text-sm mb-6">Générez vos documents conformes en quelques clics.</p>

        {/* Tabs */}
        <div className="flex gap-1 bg-muted rounded-lg p-1 mb-8">
          <button
            onClick={() => setTab("create")}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${tab === "create" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
          >
            Créer un document
          </button>
          <button
            onClick={() => setTab("history")}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${tab === "history" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
          >
            Historique ({allDocs.length})
          </button>
        </div>

        {tab === "create" ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {templates.map((t) => (
              <button
                key={t.label}
                onClick={() => t.type === "sworn-statement" ? setActiveForm("sworn-statement") : null}
                className="flex items-start gap-4 bg-card rounded-xl p-5 shadow-card border border-border/50 hover:shadow-card-hover transition-all text-left group"
              >
                <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center group-hover:bg-gradient-gold transition-colors shrink-0">
                  <t.icon className="h-5 w-5 text-muted-foreground group-hover:text-accent-foreground transition-colors" />
                </div>
                <div>
                  <div className="font-semibold text-foreground text-sm">{t.label}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{t.description}</div>
                  {t.type !== "sworn-statement" && (
                    <div className="text-xs text-muted-foreground/60 mt-1 italic">Bientôt disponible</div>
                  )}
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {allDocs.length === 0 ? (
              <div className="bg-card rounded-xl shadow-card border border-border/50 p-12 text-center">
                <FileText className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                <p className="text-muted-foreground">Aucun document généré.</p>
              </div>
            ) : (
              allDocs.map((d) => (
                <div key={d.id} className="flex items-center gap-4 bg-card rounded-xl p-4 shadow-card border border-border/50">
                  <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-foreground truncate">{d.title}</div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {new Date(d.createdAt).toLocaleDateString("fr-FR")}
                      <span className="bg-muted px-1.5 py-0.5 rounded text-xs">{d.type}</span>
                    </div>
                  </div>
                  <button onClick={() => handleDownload(d)} className="text-muted-foreground hover:text-foreground transition-colors p-2">
                    <Download className="h-4 w-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Documents;
