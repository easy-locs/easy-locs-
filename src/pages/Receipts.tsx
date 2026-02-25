import { useState } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { FileText, Plus, Download, Mail, ArrowLeft } from "lucide-react";
import { generateRentReceiptPDF, downloadPDF, pdfToDataUri } from "@/lib/pdf-generator";
import { addDocument, getDocuments, type GeneratedDocument } from "@/lib/store";

const Receipts = () => {
  const [showForm, setShowForm] = useState(false);
  const [, setRefresh] = useState(0);
  const [form, setForm] = useState({
    landlordName: "",
    tenantName: "",
    propertyAddress: "",
    rentAmount: 0,
    chargesAmount: 0,
    periodStart: "",
    periodEnd: "",
    paymentDate: "",
  });

  const receipts = getDocuments().filter((d) => d.type === "rent-receipt");

  const updateField = (key: string, value: string | number) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleGenerate = () => {
    const doc = generateRentReceiptPDF(form);
    const periodLabel = form.periodStart
      ? new Date(form.periodStart).toLocaleDateString("fr-FR", { month: "long", year: "numeric" })
      : "Quittance";
    const record: GeneratedDocument = {
      id: crypto.randomUUID(),
      userId: "demo-user-1",
      type: "rent-receipt",
      country: "FR",
      title: `Quittance de loyer — ${periodLabel}`,
      dataJson: form,
      pdfDataUri: pdfToDataUri(doc),
      createdAt: new Date().toISOString(),
    };
    addDocument(record);
    downloadPDF(doc, `quittance_${form.tenantName.replace(/\s/g, "_").toLowerCase()}.pdf`);
    setShowForm(false);
    setRefresh((r) => r + 1);
  };

  const handleDownload = (receipt: GeneratedDocument) => {
    if (receipt.pdfDataUri) {
      const link = document.createElement("a");
      link.href = receipt.pdfDataUri;
      link.download = `${receipt.title.replace(/\s/g, "_")}.pdf`;
      link.click();
    } else {
      // Regenerate
      const data = receipt.dataJson as typeof form;
      const doc = generateRentReceiptPDF(data);
      downloadPDF(doc, `${receipt.title.replace(/\s/g, "_")}.pdf`);
    }
  };

  if (showForm) {
    return (
      <DashboardLayout>
        <div className="max-w-2xl mx-auto">
          <button onClick={() => setShowForm(false)} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
            <ArrowLeft className="h-4 w-4" /> Retour
          </button>
          <h1 className="text-2xl font-bold text-foreground mb-6">Nouvelle quittance de loyer</h1>
          <div className="bg-card rounded-xl shadow-card border border-border/50 p-6 space-y-5">
            {[
              { key: "landlordName", label: "Nom du bailleur", type: "text" },
              { key: "tenantName", label: "Nom du locataire", type: "text" },
              { key: "propertyAddress", label: "Adresse du bien", type: "text" },
              { key: "rentAmount", label: "Loyer hors charges (€)", type: "number" },
              { key: "chargesAmount", label: "Charges (€)", type: "number" },
              { key: "periodStart", label: "Début de période", type: "date" },
              { key: "periodEnd", label: "Fin de période", type: "date" },
              { key: "paymentDate", label: "Date de paiement", type: "date" },
            ].map((f) => (
              <div key={f.key}>
                <label className="block text-sm font-medium text-foreground mb-1.5">{f.label}</label>
                <input
                  type={f.type}
                  value={(form as Record<string, unknown>)[f.key] as string}
                  onChange={(e) => updateField(f.key, f.type === "number" ? +e.target.value : e.target.value)}
                  className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            ))}
            <button onClick={handleGenerate} className="w-full bg-gradient-gold text-accent-foreground font-semibold py-3 rounded-lg shadow-gold hover:opacity-90 transition-opacity">
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
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Quittances de loyer</h1>
            <p className="text-muted-foreground text-sm mt-1">Générez et envoyez vos quittances conformes.</p>
          </div>
          <button onClick={() => setShowForm(true)} className="flex items-center gap-2 bg-gradient-gold text-accent-foreground font-semibold px-5 py-2.5 rounded-lg shadow-gold hover:opacity-90 transition-opacity text-sm">
            <Plus className="h-4 w-4" /> Nouvelle quittance
          </button>
        </div>

        {receipts.length > 0 ? (
          <div className="bg-card rounded-xl shadow-card border border-border/50 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Locataire</th>
                    <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Bien</th>
                    <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Période</th>
                    <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Montant</th>
                    <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Statut</th>
                    <th className="text-right text-xs font-medium text-muted-foreground px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {receipts.map((r) => {
                    const data = r.dataJson as Record<string, unknown>;
                    const total = (Number(data.rentAmount) || 0) + (Number(data.chargesAmount) || 0);
                    return (
                      <tr key={r.id} className="hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-3 text-sm font-medium text-foreground">{String(data.tenantName || "—")}</td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">{String(data.propertyAddress || "—")}</td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">{r.title}</td>
                        <td className="px-4 py-3 text-sm font-medium text-foreground">{total.toLocaleString("fr-FR")} €</td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-1 text-xs font-medium bg-success/10 text-success px-2 py-0.5 rounded-full">
                            <Mail className="h-3 w-3" /> Généré
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button onClick={() => handleDownload(r)} className="text-muted-foreground hover:text-foreground transition-colors p-1">
                            <Download className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="bg-card rounded-xl shadow-card border border-border/50 p-12 text-center">
            <FileText className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-muted-foreground">Aucune quittance pour le moment.</p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Receipts;
