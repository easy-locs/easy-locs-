import { useState } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Home, Plus, ArrowLeft } from "lucide-react";
import { generateLeasePDF, downloadPDF, pdfToDataUri } from "@/lib/pdf-generator";
import { addDocument, type GeneratedDocument } from "@/lib/store";

const Leases = () => {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    leaseType: "empty" as "empty" | "furnished",
    landlordName: "",
    landlordAddress: "",
    tenantName: "",
    propertyAddress: "",
    propertyType: "Appartement",
    surface: 0,
    rentAmount: 0,
    chargesAmount: 0,
    depositAmount: 0,
    startDate: "",
    duration: 3,
  });

  const updateField = (key: string, value: string | number) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleGenerate = () => {
    const doc = generateLeasePDF(form);
    const title = `Bail ${form.leaseType === "furnished" ? "meublé" : "vide"} — ${form.tenantName}`;
    const record: GeneratedDocument = {
      id: crypto.randomUUID(),
      userId: "demo-user-1",
      type: "lease",
      country: "FR",
      title,
      dataJson: form,
      pdfDataUri: pdfToDataUri(doc),
      createdAt: new Date().toISOString(),
    };
    addDocument(record);
    downloadPDF(doc, `bail_${form.tenantName.replace(/\s/g, "_").toLowerCase()}.pdf`);
    setShowForm(false);
  };

  if (showForm) {
    return (
      <DashboardLayout>
        <div className="max-w-2xl mx-auto">
          <button onClick={() => setShowForm(false)} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
            <ArrowLeft className="h-4 w-4" /> Retour
          </button>
          <h1 className="text-2xl font-bold text-foreground mb-6">Nouveau bail d'habitation</h1>
          <div className="bg-card rounded-xl shadow-card border border-border/50 p-6 space-y-5">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Type de bail</label>
              <select value={form.leaseType} onChange={(e) => updateField("leaseType", e.target.value)} className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                <option value="empty">Non meublé (vide)</option>
                <option value="furnished">Meublé</option>
              </select>
            </div>
            {[
              { key: "landlordName", label: "Nom du bailleur", type: "text" },
              { key: "landlordAddress", label: "Adresse du bailleur", type: "text" },
              { key: "tenantName", label: "Nom du locataire", type: "text" },
              { key: "propertyAddress", label: "Adresse du bien", type: "text" },
              { key: "propertyType", label: "Type de bien", type: "text" },
              { key: "surface", label: "Surface (m²)", type: "number" },
              { key: "rentAmount", label: "Loyer mensuel HC (€)", type: "number" },
              { key: "chargesAmount", label: "Charges (€)", type: "number" },
              { key: "depositAmount", label: "Dépôt de garantie (€)", type: "number" },
              { key: "startDate", label: "Date de début", type: "date" },
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
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Durée (années)</label>
              <select value={form.duration} onChange={(e) => updateField("duration", +e.target.value)} className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                <option value={1}>1 an (meublé)</option>
                <option value={3}>3 ans (vide)</option>
                <option value={6}>6 ans (SCI)</option>
              </select>
            </div>
            <button onClick={handleGenerate} className="w-full bg-gradient-gold text-accent-foreground font-semibold py-3 rounded-lg shadow-gold hover:opacity-90 transition-opacity">
              Générer le bail PDF
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
            <h1 className="text-2xl font-bold text-foreground">Baux</h1>
            <p className="text-muted-foreground text-sm mt-1">Créez et gérez vos contrats de bail.</p>
          </div>
          <button onClick={() => setShowForm(true)} className="flex items-center gap-2 bg-gradient-gold text-accent-foreground font-semibold px-5 py-2.5 rounded-lg shadow-gold hover:opacity-90 transition-opacity text-sm">
            <Plus className="h-4 w-4" /> Nouveau bail
          </button>
        </div>
        <div className="bg-card rounded-xl shadow-card border border-border/50 p-16 text-center">
          <Home className="h-16 w-16 text-muted-foreground/20 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">Aucun bail enregistré</h3>
          <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
            Créez votre premier contrat de bail conforme à la législation française.
          </p>
          <button onClick={() => setShowForm(true)} className="inline-flex items-center gap-2 bg-gradient-gold text-accent-foreground font-semibold px-6 py-3 rounded-lg shadow-gold hover:opacity-90 transition-opacity text-sm">
            <Plus className="h-4 w-4" /> Créer un bail
          </button>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Leases;
