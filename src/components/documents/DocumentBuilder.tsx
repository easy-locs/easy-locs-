import { useState, useMemo, useEffect } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { ArrowLeft, AlertCircle, AlertTriangle, CheckCircle, Info, Loader2 } from "lucide-react";
import type { Json } from "@/integrations/supabase/types";
import type { DocumentTemplate } from "@/lib/templates/types";
import { validateDocument } from "@/lib/templates/validation";
import { generateFromTemplate, downloadPDF } from "@/lib/pdf-generator";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import AddressAutocomplete from "@/components/ui/AddressAutocomplete";
import SignaturePad from "@/components/ui/SignaturePad";

interface Props {
  template: DocumentTemplate;
  onBack: () => void;
  onGenerated: () => void;
}

const DocumentBuilder = ({ template, onBack, onGenerated }: Props) => {
  const { user, orgId } = useAuth();
  const { toast } = useToast();
  const defaults: Record<string, unknown> = {};
  for (const f of template.fields) {
    defaults[f.key] = f.defaultValue ?? (f.type === "number" ? 0 : "");
  }
  const [data, setData] = useState<Record<string, unknown>>(defaults);
  const [validation, setValidation] = useState<ReturnType<typeof validateDocument> | null>(null);
  const [generated, setGenerated] = useState(false);
  const [saving, setSaving] = useState(false);
  const [signatures, setSignatures] = useState<{ landlord: string; tenant: string }>({ landlord: "", tenant: "" });

  // Auto-load saved signature from profile
  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("signature_url").eq("id", user.id).single().then(({ data: profile }) => {
      const savedSig = (profile as any)?.signature_url;
      if (savedSig) {
        setSignatures((s) => ({ ...s, landlord: savedSig }));
      }
    });
  }, [user]);
  const updateField = (key: string, value: unknown) => {
    setData((prev) => ({ ...prev, [key]: value }));
    setValidation(null);
    setGenerated(false);
  };

  const handleValidate = () => {
    const dataCopy = { ...data };
    const result = validateDocument(template, dataCopy);
    setData(dataCopy);
    setValidation(result);
    return result;
  };

  const handleGenerate = async () => {
    const result = handleValidate();
    if (result.errors.length > 0) return;
    if (!user || !orgId) {
      toast({ title: "Erreur", description: "Vous devez être connecté.", variant: "destructive" });
      return;
    }

    setSaving(true);
    const title = `${template.label} — ${String(data.tenantName || data.fullName || data.companyName || data.senderName || "")}`.trim();

    // Save to Supabase
    const { error } = await supabase.from("documents").insert({
      org_id: orgId,
      user_id: user.id,
      country: template.country,
      doc_type: template.docType,
      template_id: template.id,
      template_version: template.version,
      title,
      data_json: data as unknown as Json,
      status: "final",
    });

    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      setSaving(false);
      return;
    }

    // Generate and download PDF with signatures
    const doc = generateFromTemplate(template, data, signatures.landlord || signatures.tenant ? signatures : undefined);
    downloadPDF(doc, `${template.docType}_${Date.now()}.pdf`);

    // Audit log
    await supabase.from("audit_logs").insert({
      org_id: orgId,
      user_id: user.id,
      action: "document.created",
      metadata_json: { template_id: template.id, title } as unknown as Json,
    });

    setSaving(false);
    setGenerated(true);
    onGenerated();
  };

  const groups = useMemo(() => {
    const map = new Map<string, typeof template.fields>();
    for (const f of template.fields) {
      const g = f.group || "default";
      if (!map.has(g)) map.set(g, []);
      map.get(g)!.push(f);
    }
    return map;
  }, [template]);

  const fieldErrors = new Set(validation?.errors.map((e) => e.field) ?? []);

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto">
        <button onClick={onBack} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="h-4 w-4" /> Retour
        </button>

        <h1 className="text-2xl font-bold text-foreground mb-1">{template.label}</h1>
        <p className="text-sm text-muted-foreground mb-1">{template.description}</p>
        {template.legalBasis && (
          <p className="text-xs text-muted-foreground/70 italic mb-6">Base légale : {template.legalBasis}</p>
        )}

        {template.needsLegalReview && (
          <div className="flex items-start gap-3 bg-warning/10 border border-warning/30 rounded-lg p-4 mb-6">
            <AlertTriangle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-foreground">Révision juridique requise</p>
              <p className="text-xs text-muted-foreground">Ce modèle nécessite une validation juridique avant utilisation en production.</p>
            </div>
          </div>
        )}

        <div className="bg-card rounded-xl shadow-card border border-border/50 p-6 space-y-5">
          {[...groups.entries()].map(([groupName, fields]) => (
            <div key={groupName}>
              {groupName !== "default" && (
                <h3 className="text-sm font-semibold text-foreground mb-3 mt-2">{groupName}</h3>
              )}
              {fields.map((f) => (
                <div key={f.key} className="mb-4">
                  <label className="block text-sm font-medium text-foreground mb-1.5">
                    {f.label}
                    {f.required && <span className="text-destructive ml-1">*</span>}
                  </label>
                  {f.type === "select" ? (
                    <select value={String(data[f.key] ?? "")} onChange={(e) => updateField(f.key, e.target.value)}
                      className={`w-full bg-background border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring ${fieldErrors.has(f.key) ? "border-destructive" : "border-border"}`}>
                      <option value="">— Sélectionner —</option>
                      {f.options?.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  ) : f.type === "textarea" ? (
                    <textarea rows={4} value={String(data[f.key] ?? "")} onChange={(e) => updateField(f.key, e.target.value)}
                      placeholder={f.placeholder}
                      className={`w-full bg-background border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none ${fieldErrors.has(f.key) ? "border-destructive" : "border-border"}`} />
                  ) : f.key.toLowerCase().includes("address") || f.key.toLowerCase().includes("adresse") || f.key === "registeredOffice" || f.key === "propertyAddress" ? (
                    <AddressAutocomplete
                      value={String(data[f.key] ?? "")}
                      onChange={(val) => updateField(f.key, val)}
                      onSelect={(result) => updateField(f.key, result.label)}
                      placeholder={f.placeholder || "Saisissez une adresse…"}
                      className={fieldErrors.has(f.key) ? "!border-destructive" : ""}
                    />
                  ) : (
                    <input type={f.type === "postal-code" || f.type === "phone" || f.type === "email" ? "text" : f.type}
                      value={String(data[f.key] ?? "")}
                      onChange={(e) => updateField(f.key, f.type === "number" ? +e.target.value : e.target.value)}
                      placeholder={f.placeholder}
                      className={`w-full bg-background border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring ${fieldErrors.has(f.key) ? "border-destructive" : "border-border"}`} />
                  )}
                </div>
              ))}
            </div>
          ))}

          {/* Signature pads */}
          <div className="border-t border-border/50 pt-5 mt-2">
            <h3 className="text-sm font-semibold text-foreground mb-3">Signatures</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <SignaturePad
                label="Signature du bailleur / expéditeur"
                value={signatures.landlord}
                onChange={(v) => setSignatures((s) => ({ ...s, landlord: v }))}
              />
              <SignaturePad
                label="Signature du locataire / destinataire"
                value={signatures.tenant}
                onChange={(v) => setSignatures((s) => ({ ...s, tenant: v }))}
              />
            </div>
          </div>

          {validation && (
            <div className="space-y-3">
              {validation.corrections.length > 0 && (
                <div className="flex items-start gap-2 bg-info/10 rounded-lg p-3">
                  <Info className="h-4 w-4 text-info shrink-0 mt-0.5" />
                  <div className="text-xs text-foreground space-y-1">
                    {validation.corrections.map((c, i) => <p key={i}>{c.message}</p>)}
                  </div>
                </div>
              )}
              {validation.warnings.length > 0 && (
                <div className="flex items-start gap-2 bg-warning/10 rounded-lg p-3">
                  <AlertTriangle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
                  <div className="text-xs text-foreground space-y-1">
                    {validation.warnings.map((w, i) => <p key={i}>{w.message}</p>)}
                  </div>
                </div>
              )}
              {validation.errors.length > 0 && (
                <div className="flex items-start gap-2 bg-destructive/10 rounded-lg p-3">
                  <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                  <div className="text-xs text-foreground space-y-1">
                    {validation.errors.map((e, i) => <p key={i}>{e.message}</p>)}
                  </div>
                </div>
              )}
            </div>
          )}

          {generated && (
            <div className="flex items-center gap-2 bg-success/10 rounded-lg p-3">
              <CheckCircle className="h-4 w-4 text-success" />
              <p className="text-sm text-foreground">Document généré et sauvegardé dans l'historique.</p>
            </div>
          )}

          <div className="flex gap-3">
            <button onClick={handleValidate} className="flex-1 border border-border text-foreground font-semibold py-3 rounded-lg hover:bg-muted transition-colors text-sm">
              Valider
            </button>
            <button onClick={handleGenerate} disabled={template.needsLegalReview || saving}
              className="flex-1 flex items-center justify-center gap-2 bg-gradient-gold text-accent-foreground font-semibold py-3 rounded-lg shadow-gold hover:opacity-90 transition-opacity text-sm disabled:opacity-50 disabled:cursor-not-allowed">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Générer le PDF"}
            </button>
          </div>
        </div>

        <div className="mt-6 flex items-start gap-3 bg-muted/50 rounded-lg p-4">
          <AlertTriangle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground leading-relaxed">
            Ce document est généré à titre informatif. Il ne remplace pas les conseils d'un avocat, notaire ou expert-comptable.
          </p>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default DocumentBuilder;
