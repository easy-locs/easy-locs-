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
import { useRentalData } from "@/hooks/useRentalData";

interface Props {
  template: DocumentTemplate;
  onBack: () => void;
  onGenerated: () => void;
}

const DocumentBuilder = ({ template, onBack, onGenerated }: Props) => {
  const { user, orgId, userType } = useAuth();
  const { toast } = useToast();
  const { properties, tenants } = useRentalData();

  const defaults: Record<string, unknown> = {};
  const today = new Date().toISOString().split("T")[0];
  for (const f of template.fields) {
    // Auto-fill date fields with today's date
    if (f.type === "date" && !f.defaultValue && ["date", "documentDate", "signatureDate", "receiptDate", "noticeDate", "statementDate"].includes(f.key)) {
      defaults[f.key] = today;
    } else {
      defaults[f.key] = f.defaultValue ?? (f.type === "number" ? 0 : "");
    }
  }
  const [data, setData] = useState<Record<string, unknown>>(defaults);
  const [validation, setValidation] = useState<ReturnType<typeof validateDocument> | null>(null);
  const [generated, setGenerated] = useState(false);
  const [saving, setSaving] = useState(false);
  const [signatures, setSignatures] = useState<{ landlord: string; tenant: string }>({ landlord: "", tenant: "" });
  const [stampUrl, setStampUrl] = useState("");
  const [prefilled, setPrefilled] = useState(false);

  // Auto-load owner profile data + saved signature
  useEffect(() => {
    if (!user || prefilled) return;

    const loadOwnerData = async () => {
      // Load profile (signature)
      const { data: profile } = await supabase
        .from("profiles")
        .select("signature_url, name, email")
        .eq("id", user.id)
        .single();

      if (profile?.signature_url) {
        setSignatures((s) => ({ ...s, landlord: profile.signature_url! }));
      }

      // Load owner profile (identity, address, bank)
      if (!orgId) return;
      const { data: ownerProfile } = await supabase
        .from("owner_profiles")
        .select("*")
        .eq("org_id", orgId)
        .limit(1)
        .single();

      // Load org info + stamp
      const { data: org } = await supabase
        .from("orgs")
        .select("name, address, postal_code, city, siret, phone, email, stamp_url")
        .eq("id", orgId)
        .single();

      if ((org as any)?.stamp_url) setStampUrl((org as any).stamp_url);

      // Build prefill map
      const prefillMap: Record<string, unknown> = {};

      // Owner / landlord fields
      if (ownerProfile) {
        const ownerFields: Record<string, unknown> = {
          landlordName: ownerProfile.full_name,
          senderName: ownerProfile.full_name,
          hostName: ownerProfile.full_name,
          landlordAddress: [ownerProfile.address, ownerProfile.postal_code, ownerProfile.city].filter(Boolean).join(", "),
          senderAddress: [ownerProfile.address, ownerProfile.postal_code, ownerProfile.city].filter(Boolean).join(", "),
          landlordEmail: ownerProfile.email,
          landlordPhone: ownerProfile.phone,
          bankName: ownerProfile.bank_name,
          bankIban: ownerProfile.bank_iban,
          bankBic: ownerProfile.bank_bic,
          taxId: ownerProfile.tax_id,
          companyName: ownerProfile.company_name,
        };
        for (const [key, val] of Object.entries(ownerFields)) {
          if (val && template.fields.some((f) => f.key === key)) {
            prefillMap[key] = val;
          }
        }
      } else if (profile) {
        // Fallback to profile
        if (template.fields.some((f) => f.key === "landlordName")) prefillMap.landlordName = profile.name;
        if (template.fields.some((f) => f.key === "senderName")) prefillMap.senderName = profile.name;
      }

      // Org fields
      if (org) {
        const orgFields: Record<string, unknown> = {
          companyName: org.name,
          registeredOffice: [org.address, org.postal_code, org.city].filter(Boolean).join(", "),
          siret: org.siret,
        };
        for (const [key, val] of Object.entries(orgFields)) {
          if (val && template.fields.some((f) => f.key === key) && !prefillMap[key]) {
            prefillMap[key] = val;
          }
        }
      }

      // Apply prefill (only for empty fields)
      if (Object.keys(prefillMap).length > 0) {
        setData((prev) => {
          const merged = { ...prev };
          for (const [key, val] of Object.entries(prefillMap)) {
            if (!merged[key] || merged[key] === "" || merged[key] === 0) {
              merged[key] = val;
            }
          }
          return merged;
        });
      }

      setPrefilled(true);
    };

    loadOwnerData();
  }, [user, orgId, prefilled, template.fields]);

  // Auto-fill from tenant/property selection + load tenant signature
  useEffect(() => {
    const tenantId = data.tenantId as string;
    if (!tenantId || tenants.length === 0) return;

    const tenant = tenants.find((t) => t.id === tenantId);
    if (!tenant) return;

    const property = tenant.property_id ? properties.find((p) => p.id === tenant.property_id) : null;

    // Load tenant's saved signature if they have a user account
    if (tenant.tenant_user_id) {
      supabase
        .from("profiles")
        .select("signature_url")
        .eq("id", tenant.tenant_user_id)
        .single()
        .then(({ data: tenantProfile }) => {
          if (tenantProfile?.signature_url) {
            setSignatures((s) => ({ ...s, tenant: tenantProfile.signature_url! }));
          }
        });
    }

    setData((prev) => {
      const merged = { ...prev };
      const tenantFields: Record<string, unknown> = {
        // Identity
        tenantName: tenant.name,
        recipientName: tenant.name,
        guestName: tenant.name,
        tenantEmail: tenant.email,
        tenantPhone: tenant.phone,
        // Personal info
        tenantBirthDate: tenant.birth_date,
        birthDate: tenant.birth_date,
        tenantBirthPlace: tenant.birth_place,
        birthPlace: tenant.birth_place,
        tenantNationality: tenant.nationality,
        nationality: tenant.nationality,
        tenantProfession: tenant.profession,
        profession: tenant.profession,
        // Address
        tenantAddress: tenant.current_address,
        currentAddress: tenant.current_address,
        recipientAddress: tenant.current_address,
        // Guarantor
        guarantorName: tenant.guarantor_name,
        guarantorPhone: tenant.guarantor_phone,
        // Lease & financial
        leaseStart: tenant.lease_start,
        leaseEnd: tenant.lease_end,
        leaseType: tenant.lease_type,
        rentAmount: tenant.rent_amount,
        chargesAmount: tenant.charges_amount,
        depositAmount: tenant.deposit_amount,
      };

      for (const [key, val] of Object.entries(tenantFields)) {
        if (val && template.fields.some((f) => f.key === key)) {
          merged[key] = val;
        }
      }

      if (property) {
        const propFields: Record<string, unknown> = {
          propertyAddress: `${property.address}, ${property.postal_code} ${property.city}`,
          fullAddress: `${property.address}, ${property.postal_code} ${property.city}`,
          propertyLabel: property.label,
          propertySurface: property.surface,
          propertyRooms: property.rooms,
          propertyType: property.property_type,
        };
        for (const [key, val] of Object.entries(propFields)) {
          if (val && template.fields.some((f) => f.key === key)) {
            merged[key] = val;
          }
        }
      }

      return merged;
    });
  }, [data.tenantId, tenants, properties, template.fields]);

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

    const doc = generateFromTemplate(template, data, signatures.landlord || signatures.tenant ? signatures : undefined, stampUrl || undefined);
    downloadPDF(doc, `${template.docType}_${Date.now()}.pdf`);

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

  // Determine which signature pad to show based on user type
  const isLandlord = userType === "landlord";
  const isTenant = userType === "tenant";

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

        {/* Tenant selector for auto-fill */}
        {isLandlord && tenants.length > 0 && template.fields.some((f) => f.key === "tenantName" || f.key === "recipientName") && (
          <div className="bg-card rounded-xl shadow-card border border-border/50 p-4 mb-4">
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Pré-remplir à partir d'un locataire
            </label>
            <select
              value={String(data.tenantId ?? "")}
              onChange={(e) => updateField("tenantId", e.target.value)}
              className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">— Sélectionner un locataire —</option>
              {tenants.map((t) => (
                <option key={t.id} value={t.id}>{t.name} {t.email ? `(${t.email})` : ""}</option>
              ))}
            </select>
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

          {/* Signature — chaque utilisateur signe uniquement de son côté */}
          <div className="border-t border-border/50 pt-5 mt-2">
            <h3 className="text-sm font-semibold text-foreground mb-3">Signature</h3>
            {isLandlord && (
              <div>
                <SignaturePad
                  label="Votre signature (bailleur / expéditeur)"
                  value={signatures.landlord}
                  onChange={(v) => setSignatures((s) => ({ ...s, landlord: v }))}
                />
                {signatures.tenant ? (
                  <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                    <CheckCircle className="h-3.5 w-3.5 text-success" />
                    Le locataire a signé ce document
                  </div>
                ) : (
                  <p className="mt-3 text-xs text-muted-foreground">
                    La signature du locataire sera ajoutée depuis son espace personnel.
                  </p>
                )}
              </div>
            )}
            {isTenant && (
              <div>
                <SignaturePad
                  label="Votre signature (locataire / destinataire)"
                  value={signatures.tenant}
                  onChange={(v) => setSignatures((s) => ({ ...s, tenant: v }))}
                />
                {signatures.landlord ? (
                  <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                    <CheckCircle className="h-3.5 w-3.5 text-success" />
                    Le bailleur a signé ce document
                  </div>
                ) : (
                  <p className="mt-3 text-xs text-muted-foreground">
                    La signature du bailleur sera ajoutée depuis son interface.
                  </p>
                )}
              </div>
            )}
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
      </div>
    </DashboardLayout>
  );
};

export default DocumentBuilder;
