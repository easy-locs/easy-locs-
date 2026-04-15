import { useState, useRef, useCallback } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Upload, FileSpreadsheet, CheckCircle2, AlertCircle, ArrowRight, Loader2, Users, Home, Receipt } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import * as diRepo from "@/repositories/data-import.repository";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/lib/i18n";
import {
  parseCsv, detectImportType, mapRow,
  RENTILA_PROPERTY_MAP, RENTILA_TENANT_MAP, RENTILA_RENT_MAP,
  type ImportType, type CsvRow,
} from "@/lib/csv-import";
import { useUiEngine } from "@/hooks/useUiEngine";

const BATCH_SIZE = 50;

const DataImport = () => {
  const { user, orgId } = useAuth();
  const { toast } = useToast();
  const { t } = useI18n();
  const fileRef = useRef<HTMLInputElement>(null);

  const IMPORT_TYPES: { key: ImportType; icon: typeof Home; label: string; desc: string }[] = [
    { key: "properties", icon: Home, label: t("page.import.properties"), desc: t("page.import.properties_desc") },
    { key: "tenants", icon: Users, label: t("page.import.tenants"), desc: t("page.import.tenants_desc") },
    { key: "rent_history", icon: Receipt, label: t("page.import.rent_history"), desc: t("page.import.rent_history_desc") },
  ];

  const [step, setStep] = useState<"select" | "preview" | "importing" | "done">("select");
  const [importType, setImportType] = useState<ImportType | null>(null);
  const [rawRows, setRawRows] = useState<CsvRow[]>([]);
  const [mappedRows, setMappedRows] = useState<Record<string, string>[]>([]);
  const [fileName, setFileName] = useState("");
  const [importResult, setImportResult] = useState({ success: 0, errors: 0 });
  const [progress, setProgress] = useState({ current: 0, total: 0 });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const rows = parseCsv(text);
      if (rows.length === 0) {
        toast({ title: t("page.import.empty_file"), description: t("page.import.empty_file_desc"), variant: "destructive" });
        return;
      }
      setRawRows(rows);
      const headers = Object.keys(rows[0]);
      const detected = detectImportType(headers);
      if (detected) setImportType(detected);
      const mapping = detected === "properties" ? RENTILA_PROPERTY_MAP : detected === "tenants" ? RENTILA_TENANT_MAP : detected === "rent_history" ? RENTILA_RENT_MAP : RENTILA_PROPERTY_MAP;
      setMappedRows(rows.map(r => mapRow(r, mapping)));
      setStep("preview");
    };
    reader.readAsText(file);
  };

  const handleTypeChange = (type: ImportType) => {
    setImportType(type);
    const mapping = type === "properties" ? RENTILA_PROPERTY_MAP : type === "tenants" ? RENTILA_TENANT_MAP : RENTILA_RENT_MAP;
    setMappedRows(rawRows.map(r => mapRow(r, mapping)));
  };

  const handleImport = useCallback(async () => {
    if (!orgId || !user || !importType) return;
    setStep("importing");
    const total = mappedRows.length;
    setProgress({ current: 0, total });
    let success = 0, errors = 0;

    if (importType === "properties") {
      for (let i = 0; i < mappedRows.length; i += BATCH_SIZE) {
        const chunk = mappedRows.slice(i, i + BATCH_SIZE);
        const validRows: Record<string, any>[] = [];
        for (const row of chunk) {
          if (!row.label && !row.address) { errors++; continue; }
          validRows.push({
            org_id: orgId, user_id: user.id,
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
            notes: row.notes || `Imported from ${fileName}`,
          });
        }
        if (validRows.length > 0) {
          try {
            await diRepo.insertPropertiesBatch(validRows);
            success += validRows.length;
          } catch {
            for (const row of validRows) {
              try { await diRepo.insertProperty(row); success++; } catch { errors++; }
            }
          }
        }
        setProgress({ current: Math.min(i + BATCH_SIZE, total), total });
      }
    } else if (importType === "tenants") {
      for (let i = 0; i < mappedRows.length; i += BATCH_SIZE) {
        const chunk = mappedRows.slice(i, i + BATCH_SIZE);
        const validRows: Record<string, any>[] = [];
        for (const row of chunk) {
          if (!row.name) { errors++; continue; }
          validRows.push({
            org_id: orgId, user_id: user.id,
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
            notes: `Imported from ${fileName}`,
          });
        }
        if (validRows.length > 0) {
          try {
            await diRepo.insertTenantsBatch(validRows);
            success += validRows.length;
          } catch {
            for (const row of validRows) {
              try { await diRepo.insertTenant(row); success++; } catch { errors++; }
            }
          }
        }
        setProgress({ current: Math.min(i + BATCH_SIZE, total), total });
      }
    } else if (importType === "rent_history") {
      const tenants = await diRepo.fetchTenantNames(orgId);
      const tenantMap = new Map(tenants.map(t2 => [t2.name.toLowerCase().trim(), t2.id]));
      for (let i = 0; i < mappedRows.length; i += BATCH_SIZE) {
        const chunk = mappedRows.slice(i, i + BATCH_SIZE);
        const validRows: Record<string, any>[] = [];
        for (const row of chunk) {
          const tenantName = (row.tenant_name || "").toLowerCase().trim();
          const tenantId = tenantMap.get(tenantName);
          if (!tenantId || !row.month) { errors++; continue; }
          validRows.push({
            org_id: orgId,
            tenant_id: tenantId,
            month: normalizeMonth(row.month),
            rent_amount: parseNum(row.rent_amount),
            charges_amount: parseNum(row.charges_amount),
            total_amount: parseNum(row.total_amount) || (parseNum(row.rent_amount) + parseNum(row.charges_amount)),
            paid: parseBool(row.paid),
            paid_date: row.paid_date || null,
            payment_method: row.payment_method || null,
          });
        }
        if (validRows.length > 0) {
          try {
            await diRepo.upsertRentCallsBatch(validRows);
            success += validRows.length;
          } catch {
            for (const row of validRows) {
              try { await diRepo.upsertRentCall(row); success++; } catch { errors++; }
            }
          }
        }
        setProgress({ current: Math.min(i + BATCH_SIZE, total), total });
      }
    }
    setImportResult({ success, errors });
    setStep("done");
    toast({ title: t("page.import.done"), description: `${success} ${t("page.import.success_count")}${errors > 0 ? `, ${errors} ${t("page.import.error_count")}` : ""}` });
  }, [orgId, user, importType, mappedRows, fileName, toast, t]);

  const reset = () => { setStep("select"); setImportType(null); setRawRows([]); setMappedRows([]); setFileName(""); setProgress({ current: 0, total: 0 }); if (fileRef.current) fileRef.current.value = ""; };

  useUiEngine("dataimport");

  const progressPct = progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0;

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t("page.import.title")}</h1>
          <p className="text-muted-foreground text-sm mt-1">{t("page.import.subtitle")}</p>
        </div>

        {step === "select" && (
          <div className="space-y-6">
            <div className="bg-card rounded-xl border border-border/50 p-6">
              <h2 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5 text-accent" />
                {t("page.import.how_to")}
              </h2>
              <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
                <li>{t("page.import.step1")} <strong>rentila.com</strong></li>
                <li>{t("page.import.step2")} <strong>{t("page.import.step2b")}</strong></li>
                <li>{t("page.import.step3")} <strong>{t("page.import.step3b")}</strong></li>
                <li>{t("page.import.step4")}</li>
              </ol>
            </div>
            <label className="block cursor-pointer">
              <div className="border-2 border-dashed border-border rounded-xl p-12 text-center hover:border-accent/50 hover:bg-accent/5 transition-all">
                <Upload className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-foreground font-medium">{t("page.import.drop_file")}</p>
                <p className="text-sm text-muted-foreground mt-1">{t("page.import.or_click")}</p>
                <p className="text-xs text-muted-foreground mt-3">{t("page.import.formats")}</p>
              </div>
              <input ref={fileRef} type="file" accept=".csv,.txt" onChange={handleFileSelect} className="hidden" />
            </label>
          </div>
        )}

        {step === "preview" && (
          <div className="space-y-6">
            <div className="bg-card rounded-xl border border-border/50 p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="font-semibold text-foreground">{t("page.import.preview")}</h2>
                  <p className="text-sm text-muted-foreground">{fileName} — {rawRows.length} {t("page.import.lines_detected")}</p>
                </div>
                <button onClick={reset} className="text-sm text-muted-foreground hover:text-foreground">{t("page.import.change_file")}</button>
              </div>
              <p className="text-sm font-medium text-foreground mb-2">{t("page.import.data_type")}</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-6">
                {IMPORT_TYPES.map(it => (
                  <button key={it.key} onClick={() => handleTypeChange(it.key)}
                    className={`flex items-center gap-3 p-3 rounded-lg border-2 transition-all text-left ${importType === it.key ? "border-accent bg-accent/5" : "border-border hover:border-accent/40"}`}>
                    <it.icon className={`h-5 w-5 ${importType === it.key ? "text-accent" : "text-muted-foreground"}`} />
                    <div><div className="text-sm font-medium text-foreground">{it.label}</div><div className="text-xs text-muted-foreground">{it.desc}</div></div>
                  </button>
                ))}
              </div>
              {mappedRows.length > 0 && (
                <div className="overflow-x-auto rounded-lg border border-border">
                  <table className="w-full text-sm">
                    <thead><tr className="bg-muted/50">{Object.keys(mappedRows[0]).filter(k => mappedRows[0][k]).map(k => <th key={k} className="px-3 py-2 text-left font-medium text-muted-foreground whitespace-nowrap">{k}</th>)}</tr></thead>
                    <tbody>{mappedRows.slice(0, 5).map((row, i) => <tr key={i} className="border-t border-border">{Object.entries(row).filter(([, v]) => v).map(([k, v]) => <td key={k} className="px-3 py-2 text-foreground whitespace-nowrap max-w-48 truncate">{v}</td>)}</tr>)}</tbody>
                  </table>
                  {mappedRows.length > 5 && <div className="text-xs text-muted-foreground text-center py-2 bg-muted/30">… {t("page.import.and_more").replace("{count}", String(mappedRows.length - 5))}</div>}
                </div>
              )}
              {rawRows.length > 0 && (() => {
                const mapping = importType === "properties" ? RENTILA_PROPERTY_MAP : importType === "tenants" ? RENTILA_TENANT_MAP : RENTILA_RENT_MAP;
                const unmapped = Object.keys(rawRows[0]).filter(h => !mapping[h] && !mapping[h.trim()]);
                if (unmapped.length === 0) return null;
                return <div className="mt-3 text-xs text-muted-foreground flex items-start gap-2"><AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" /><span>{t("page.import.unmapped_cols")} {unmapped.join(", ")}</span></div>;
              })()}
            </div>
            <div className="flex gap-3">
              <button onClick={reset} className="px-5 py-2.5 rounded-lg border border-border text-foreground font-medium hover:bg-muted transition-colors">{t("page.import.cancel")}</button>
              <button onClick={handleImport} disabled={!importType || mappedRows.length === 0} className="flex items-center gap-2 bg-accent text-accent-foreground font-medium px-6 py-2.5 rounded-lg hover:opacity-90 disabled:opacity-40 transition-opacity">
                {t("page.import.import_lines").replace("{count}", String(mappedRows.length))} <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {step === "importing" && (
          <div className="bg-card rounded-xl border border-border/50 p-12 text-center">
            <Loader2 className="h-10 w-10 text-accent mx-auto animate-spin mb-4" />
            <p className="text-foreground font-medium">{t("page.import.importing")}</p>
            <p className="text-sm text-muted-foreground mt-1">{progress.current} / {progress.total}</p>
            <div className="mt-4 w-full max-w-md mx-auto">
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-accent rounded-full transition-all duration-300"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">{progressPct}%</p>
            </div>
          </div>
        )}

        {step === "done" && (
          <div className="bg-card rounded-xl border border-border/50 p-12 text-center">
            <CheckCircle2 className="h-12 w-12 text-accent mx-auto mb-4" />
            <h2 className="text-xl font-bold text-foreground mb-2">{t("page.import.done")}</h2>
            <p className="text-muted-foreground">
              <span className="text-accent font-semibold">{importResult.success}</span> {t("page.import.success_count")}
              {importResult.errors > 0 && <> — <span className="text-destructive font-semibold">{importResult.errors}</span> {t("page.import.error_count")}</>}
            </p>
            <div className="flex gap-3 justify-center mt-6">
              <button onClick={reset} className="px-5 py-2.5 rounded-lg border border-border text-foreground font-medium hover:bg-muted transition-colors">{t("page.import.import_more")}</button>
              <a href="/dashboard/rental-management" className="flex items-center gap-2 bg-accent text-accent-foreground font-medium px-6 py-2.5 rounded-lg hover:opacity-90 transition-opacity">{t("page.import.view_data")} <ArrowRight className="h-4 w-4" /></a>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

function parseNum(v?: string): number { if (!v) return 0; return parseFloat(v.replace(/[^\d.,-]/g, "").replace(",", ".")) || 0; }
function parseBool(v?: string): boolean { if (!v) return false; const l = v.toLowerCase().trim(); return l === "oui" || l === "yes" || l === "true" || l === "1" || l === "vrai"; }
function normalizePropertyType(v?: string): string { if (!v) return "apartment"; const l = v.toLowerCase(); if (l.includes("maison") || l.includes("house")) return "house"; if (l.includes("studio")) return "studio"; if (l.includes("commerce") || l.includes("commercial")) return "commercial"; if (l.includes("parking") || l.includes("garage")) return "parking"; return "apartment"; }
function normalizeMonth(v: string): string { const isoMatch = v.match(/(\d{4})-(\d{1,2})/); if (isoMatch) return `${isoMatch[1]}-${isoMatch[2].padStart(2, "0")}`; const slashMatch = v.match(/(\d{1,2})[/.](\d{4})/); if (slashMatch) return `${slashMatch[2]}-${slashMatch[1].padStart(2, "0")}`; return v; }

export default DataImport;
