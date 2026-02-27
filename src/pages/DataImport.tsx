import { useState, useRef } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Upload, FileSpreadsheet, CheckCircle2, AlertCircle, ArrowRight, Loader2, Users, Home, Receipt } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  parseCsv, detectImportType, mapRow,
  RENTILA_PROPERTY_MAP, RENTILA_TENANT_MAP, RENTILA_RENT_MAP,
  type ImportType, type CsvRow,
} from "@/lib/csv-import";

const IMPORT_TYPES: { key: ImportType; icon: typeof Home; label: string; desc: string }[] = [
  { key: "properties", icon: Home, label: "Biens immobiliers", desc: "Adresses, surfaces, loyers, types" },
  { key: "tenants", icon: Users, label: "Locataires", desc: "Noms, contacts, baux, montants" },
  { key: "rent_history", icon: Receipt, label: "Historique des loyers", desc: "Paiements passés, quittances" },
];

const DataImport = () => {
  const { user, orgId } = useAuth();
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<"select" | "preview" | "importing" | "done">("select");
  const [importType, setImportType] = useState<ImportType | null>(null);
  const [rawRows, setRawRows] = useState<CsvRow[]>([]);
  const [mappedRows, setMappedRows] = useState<Record<string, string>[]>([]);
  const [fileName, setFileName] = useState("");
  const [importResult, setImportResult] = useState({ success: 0, errors: 0 });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const rows = parseCsv(text);
      if (rows.length === 0) {
        toast({ title: "Fichier vide", description: "Aucune donnée trouvée dans le fichier.", variant: "destructive" });
        return;
      }

      setRawRows(rows);
      const headers = Object.keys(rows[0]);
      const detected = detectImportType(headers);
      if (detected) setImportType(detected);

      // Map with detected type
      const mapping = detected === "properties" ? RENTILA_PROPERTY_MAP
        : detected === "tenants" ? RENTILA_TENANT_MAP
        : detected === "rent_history" ? RENTILA_RENT_MAP
        : RENTILA_PROPERTY_MAP;

      const mapped = rows.map(r => mapRow(r, mapping));
      setMappedRows(mapped);
      setStep("preview");
    };
    reader.readAsText(file);
  };

  const handleTypeChange = (type: ImportType) => {
    setImportType(type);
    const mapping = type === "properties" ? RENTILA_PROPERTY_MAP
      : type === "tenants" ? RENTILA_TENANT_MAP
      : RENTILA_RENT_MAP;
    setMappedRows(rawRows.map(r => mapRow(r, mapping)));
  };

  const handleImport = async () => {
    if (!orgId || !user || !importType) return;
    setStep("importing");
    let success = 0;
    let errors = 0;

    if (importType === "properties") {
      for (const row of mappedRows) {
        if (!row.label && !row.address) { errors++; continue; }
        const { error } = await supabase.from("properties").insert({
          org_id: orgId,
          user_id: user.id,
          label: row.label || row.address || "Import",
          address: row.address || "",
          postal_code: row.postal_code || "",
          city: row.city || "",
          property_type: normalizePropertyType(row.property_type),
          surface: parseNum(row.surface),
          rooms: parseInt(row.rooms) || 1,
          floor: row.floor ? parseInt(row.floor) : null,
          heating: row.heating || "individual-gas",
          furnished: parseBool(row.furnished),
          monthly_rent: parseNum(row.monthly_rent),
          monthly_charges: parseNum(row.monthly_charges),
          deposit_amount: parseNum(row.deposit_amount),
          notes: row.notes || `Importé depuis ${fileName}`,
        });
        if (error) errors++; else success++;
      }
    } else if (importType === "tenants") {
      for (const row of mappedRows) {
        if (!row.name) { errors++; continue; }
        const { error } = await supabase.from("tenants").insert({
          org_id: orgId,
          user_id: user.id,
          name: row.name,
          email: row.email || null,
          phone: row.phone || null,
          birth_date: row.birth_date || null,
          birth_place: row.birth_place || null,
          nationality: row.nationality || null,
          profession: row.profession || null,
          lease_type: row.lease_type || "empty",
          lease_start: row.lease_start || null,
          lease_end: row.lease_end || null,
          rent_amount: parseNum(row.rent_amount),
          charges_amount: parseNum(row.charges_amount),
          deposit_amount: parseNum(row.deposit_amount),
          guarantor_name: row.guarantor_name || null,
          guarantor_phone: row.guarantor_phone || null,
          current_address: row.current_address || null,
          notes: `Importé depuis ${fileName}`,
        });
        if (error) errors++; else success++;
      }
    } else if (importType === "rent_history") {
      // Need to match tenant by name
      const { data: tenants } = await supabase.from("tenants").select("id, name").eq("org_id", orgId);
      const tenantMap = new Map((tenants || []).map(t => [t.name.toLowerCase().trim(), t.id]));

      for (const row of mappedRows) {
        const tenantName = (row.tenant_name || "").toLowerCase().trim();
        const tenantId = tenantMap.get(tenantName);
        if (!tenantId || !row.month) { errors++; continue; }

        const { error } = await supabase.from("rent_calls").upsert({
          org_id: orgId,
          tenant_id: tenantId,
          month: normalizeMonth(row.month),
          rent_amount: parseNum(row.rent_amount),
          charges_amount: parseNum(row.charges_amount),
          total_amount: parseNum(row.total_amount) || (parseNum(row.rent_amount) + parseNum(row.charges_amount)),
          paid: parseBool(row.paid),
          paid_date: row.paid_date || null,
          payment_method: row.payment_method || null,
        }, { onConflict: "org_id,tenant_id,month", ignoreDuplicates: true });
        if (error) errors++; else success++;
      }
    }

    setImportResult({ success, errors });
    setStep("done");
    toast({
      title: `Import terminé`,
      description: `${success} élément(s) importé(s)${errors > 0 ? `, ${errors} erreur(s)` : ""}`,
    });
  };

  const reset = () => {
    setStep("select");
    setImportType(null);
    setRawRows([]);
    setMappedRows([]);
    setFileName("");
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Importer mes données</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Migrez vos données depuis Rentila ou tout autre logiciel de gestion locative (export CSV).
          </p>
        </div>

        {/* Step 1: Upload */}
        {step === "select" && (
          <div className="space-y-6">
            {/* Instructions */}
            <div className="bg-card rounded-xl border border-border/50 p-6">
              <h2 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5 text-accent" />
                Comment exporter depuis Rentila ?
              </h2>
              <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
                <li>Connectez-vous à <strong>rentila.com</strong></li>
                <li>Allez dans <strong>Biens</strong>, <strong>Locataires</strong> ou <strong>Finances</strong></li>
                <li>Cliquez sur <strong>Exporter</strong> → format <strong>CSV</strong> ou <strong>Excel</strong></li>
                <li>Importez le fichier ici</li>
              </ol>
            </div>

            {/* Upload zone */}
            <label className="block cursor-pointer">
              <div className="border-2 border-dashed border-border rounded-xl p-12 text-center hover:border-accent/50 hover:bg-accent/5 transition-all">
                <Upload className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-foreground font-medium">Glissez votre fichier CSV ici</p>
                <p className="text-sm text-muted-foreground mt-1">ou cliquez pour sélectionner</p>
                <p className="text-xs text-muted-foreground mt-3">Formats acceptés : .csv, .txt (séparateur , ou ;)</p>
              </div>
              <input ref={fileRef} type="file" accept=".csv,.txt" onChange={handleFileSelect} className="hidden" />
            </label>
          </div>
        )}

        {/* Step 2: Preview */}
        {step === "preview" && (
          <div className="space-y-6">
            <div className="bg-card rounded-xl border border-border/50 p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="font-semibold text-foreground">Aperçu de l'import</h2>
                  <p className="text-sm text-muted-foreground">{fileName} — {rawRows.length} ligne(s) détectée(s)</p>
                </div>
                <button onClick={reset} className="text-sm text-muted-foreground hover:text-foreground">Changer de fichier</button>
              </div>

              {/* Type selector */}
              <p className="text-sm font-medium text-foreground mb-2">Type de données :</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-6">
                {IMPORT_TYPES.map(t => (
                  <button key={t.key} onClick={() => handleTypeChange(t.key)}
                    className={`flex items-center gap-3 p-3 rounded-lg border-2 transition-all text-left ${importType === t.key ? "border-accent bg-accent/5" : "border-border hover:border-accent/40"}`}>
                    <t.icon className={`h-5 w-5 ${importType === t.key ? "text-accent" : "text-muted-foreground"}`} />
                    <div>
                      <div className="text-sm font-medium text-foreground">{t.label}</div>
                      <div className="text-xs text-muted-foreground">{t.desc}</div>
                    </div>
                  </button>
                ))}
              </div>

              {/* Preview table */}
              {mappedRows.length > 0 && (
                <div className="overflow-x-auto rounded-lg border border-border">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-muted/50">
                        {Object.keys(mappedRows[0]).filter(k => mappedRows[0][k]).map(k => (
                          <th key={k} className="px-3 py-2 text-left font-medium text-muted-foreground whitespace-nowrap">{k}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {mappedRows.slice(0, 5).map((row, i) => (
                        <tr key={i} className="border-t border-border">
                          {Object.entries(row).filter(([, v]) => v).map(([k, v]) => (
                            <td key={k} className="px-3 py-2 text-foreground whitespace-nowrap max-w-48 truncate">{v}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {mappedRows.length > 5 && (
                    <div className="text-xs text-muted-foreground text-center py-2 bg-muted/30">
                      … et {mappedRows.length - 5} ligne(s) de plus
                    </div>
                  )}
                </div>
              )}

              {/* Unmapped columns warning */}
              {rawRows.length > 0 && (() => {
                const mapping = importType === "properties" ? RENTILA_PROPERTY_MAP
                  : importType === "tenants" ? RENTILA_TENANT_MAP
                  : RENTILA_RENT_MAP;
                const unmapped = Object.keys(rawRows[0]).filter(h => !mapping[h] && !mapping[h.trim()]);
                if (unmapped.length === 0) return null;
                return (
                  <div className="mt-3 text-xs text-muted-foreground flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                    <span>Colonnes ignorées (non mappées) : {unmapped.join(", ")}</span>
                  </div>
                );
              })()}
            </div>

            <div className="flex gap-3">
              <button onClick={reset}
                className="px-5 py-2.5 rounded-lg border border-border text-foreground font-medium hover:bg-muted transition-colors">
                Annuler
              </button>
              <button onClick={handleImport} disabled={!importType || mappedRows.length === 0}
                className="flex items-center gap-2 bg-accent text-accent-foreground font-medium px-6 py-2.5 rounded-lg hover:opacity-90 disabled:opacity-40 transition-opacity">
                Importer {mappedRows.length} ligne(s) <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Importing */}
        {step === "importing" && (
          <div className="bg-card rounded-xl border border-border/50 p-12 text-center">
            <Loader2 className="h-10 w-10 text-accent mx-auto animate-spin mb-4" />
            <p className="text-foreground font-medium">Import en cours…</p>
            <p className="text-sm text-muted-foreground mt-1">Veuillez patienter pendant l'import de vos données.</p>
          </div>
        )}

        {/* Step 4: Done */}
        {step === "done" && (
          <div className="bg-card rounded-xl border border-border/50 p-12 text-center">
            <CheckCircle2 className="h-12 w-12 text-accent mx-auto mb-4" />
            <h2 className="text-xl font-bold text-foreground mb-2">Import terminé !</h2>
            <p className="text-muted-foreground">
              <span className="text-accent font-semibold">{importResult.success}</span> élément(s) importé(s) avec succès
              {importResult.errors > 0 && (
                <> — <span className="text-destructive font-semibold">{importResult.errors}</span> erreur(s)</>
              )}
            </p>
            <div className="flex gap-3 justify-center mt-6">
              <button onClick={reset}
                className="px-5 py-2.5 rounded-lg border border-border text-foreground font-medium hover:bg-muted transition-colors">
                Importer d'autres données
              </button>
              <a href="/dashboard/rental"
                className="flex items-center gap-2 bg-accent text-accent-foreground font-medium px-6 py-2.5 rounded-lg hover:opacity-90 transition-opacity">
                Voir mes données <ArrowRight className="h-4 w-4" />
              </a>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

/* ─── Helpers ─── */
function parseNum(v?: string): number {
  if (!v) return 0;
  return parseFloat(v.replace(/[^\d.,-]/g, "").replace(",", ".")) || 0;
}

function parseBool(v?: string): boolean {
  if (!v) return false;
  const l = v.toLowerCase().trim();
  return l === "oui" || l === "yes" || l === "true" || l === "1" || l === "vrai";
}

function normalizePropertyType(v?: string): string {
  if (!v) return "apartment";
  const l = v.toLowerCase();
  if (l.includes("maison") || l.includes("house")) return "house";
  if (l.includes("studio")) return "studio";
  if (l.includes("commerce") || l.includes("commercial")) return "commercial";
  if (l.includes("parking") || l.includes("garage")) return "parking";
  return "apartment";
}

function normalizeMonth(v: string): string {
  // Try to parse various month formats: "2024-01", "01/2024", "janvier 2024"
  const isoMatch = v.match(/(\d{4})-(\d{1,2})/);
  if (isoMatch) return `${isoMatch[1]}-${isoMatch[2].padStart(2, "0")}`;
  
  const slashMatch = v.match(/(\d{1,2})[/.](\d{4})/);
  if (slashMatch) return `${slashMatch[2]}-${slashMatch[1].padStart(2, "0")}`;
  
  return v; // fallback
}

export default DataImport;
