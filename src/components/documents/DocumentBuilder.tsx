import { useState, useMemo, useEffect } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { ArrowLeft, AlertTriangle, Building2, FileText, Scale } from "lucide-react";
import type { Json } from "@/integrations/supabase/types";
import type { DocumentTemplate } from "@/lib/templates/types";
import { validateDocument } from "@/lib/templates/validation";
import { generateFromTemplate, downloadPDF, pdfToDataUri } from "@/lib/pdf-generator";
import * as docBuilderRepo from "@/repositories/document-builder.repository";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/lib/i18n";
import SignaturePad from "@/components/ui/SignaturePad";
import { useRentalData } from "@/hooks/useRentalData";
import { useAutoFill } from "@/hooks/useAutoFill";
import { getCountryEntry } from "@/lib/global-country-registry";
import { assertTemplateCountryMatch, CountryIsolationError } from "@/lib/country-profile";

interface Props {
  template: DocumentTemplate;
  onBack: () => void;
  onGenerated: () => void;
}

const DocumentBuilder = ({ template, onBack, onGenerated }: Props) => {
  const { user, orgId, userType } = useAuth();
  const { toast } = useToast();
  const { t } = useI18n();
  const { properties, tenants } = useRentalData();
  const { fillFromTenant, fillFromProperty, fillFromOwner, ownerProfile } = useAutoFill(properties, tenants);

  const defaults: Record<string, unknown> = {};
  const today = new Date().toISOString().split("T")[0];
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split("T")[0];
  const locale = getCountryEntry(template.country)?.locale || "en-GB";
  const periodLabel = new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" }).format(now);

  const autoDateKeys = [
    "date",
    "documentDate",
    "signatureDate",
    "receiptDate",
    "noticeDate",
    "statementDate",
    "paymentDate",
    "reportDate",
    "leaseDate",
    "commandmentDate",
  ];

  for (const f of template.fields) {
    if (f.type === "date" && !f.defaultValue) {
      if (autoDateKeys.includes(f.key)) {
        defaults[f.key] = today;
      } else if (f.key === "periodStart" || f.key === "startDate" || f.key === "dateDebut") {
        defaults[f.key] = monthStart;
      } else if (f.key === "periodEnd" || f.key === "endDate" || f.key === "dateFin") {
        defaults[f.key] = monthEnd;
      } else {
        defaults[f.key] = "";
      }
    } else if (f.type === "select") {
      defaults[f.key] = f.defaultValue ?? f.options?.[0]?.value ?? "";
    } else if (f.key === "period" && !f.defaultValue) {
      defaults[f.key] = periodLabel;
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

  const applyDerivedValues = (input: Record<string, unknown>) => {
    const next = { ...input };
    const rent = Number(next.rentAmount) || 0;
    const charges = Number(next.chargesAmount) || 0;
    const deposit = Number(next.depositAmount) || 0;

    if ((next.totalAmount === undefined || next.totalAmount === "" || Number(next.totalAmount) === 0) && (rent > 0 || charges > 0)) {
      next.totalAmount = rent + charges;
    }
    if ((next.coldRent === undefined || next.coldRent === "") && rent > 0) next.coldRent = rent;
    if ((next.operatingCosts === undefined || next.operatingCosts === "") && charges > 0) next.operatingCosts = charges;
    if ((next.depositMonths === undefined || next.depositMonths === "") && rent > 0 && deposit > 0) {
      next.depositMonths = Number((deposit / rent).toFixed(2));
    }
    if ((next.period === undefined || next.period === "") && periodLabel) {
      next.period = periodLabel;
    }
    if ((next.startDate === undefined || next.startDate === "") && typeof next.leaseStart === "string" && next.leaseStart) {
      next.startDate = next.leaseStart;
    }
    if ((next.endDate === undefined || next.endDate === "") && typeof next.leaseEnd === "string" && next.leaseEnd) {
      next.endDate = next.leaseEnd;
    }

    const landlordTax = String(next.landlordTaxId || next.taxId || "");
    if (landlordTax) {
      if (!next.landlordNIF) next.landlordNIF = landlordTax;
      if (!next.landlordDNI) next.landlordDNI = landlordTax;
      if (!next.landlordAfm) next.landlordAfm = landlordTax;
      if (!next.landlordSiret) next.landlordSiret = landlordTax;
    }

    return next;
  };

  // Auto-load owner profile data + saved signature
  useEffect(() => {
    if (!user || prefilled) return;

    const loadOwnerData = async () => {
      // Load profile (signature)
      const profile = await docBuilderRepo.fetchProfileForDoc(user.id);

      if (profile?.signature_url) {
        setSignatures((s) => ({ ...s, landlord: profile.signature_url! }));
      }

      // Load owner profile (identity, address, bank)
      if (!orgId) return;
      const ownerProfile = await docBuilderRepo.fetchOwnerProfileForDoc(orgId);

      // Load org info + stamp
      const org = await docBuilderRepo.fetchOrgForDoc(orgId);

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
          return applyDerivedValues(merged);
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

    const tenantAutoData = fillFromTenant(tenantId);
    if (tenantAutoData) {
      setData((prev) => {
        const merged = { ...prev };
        for (const [key, val] of Object.entries(tenantAutoData)) {
          if (val !== undefined && val !== null && val !== "" && template.fields.some((f) => f.key === key)) {
            merged[key] = val;
          }
        }
        return applyDerivedValues(merged);
      });
    }

    if (tenant.tenant_user_id) {
      docBuilderRepo.fetchTenantProfile(tenant.tenant_user_id)
        .then((tenantProfile) => {
          if (tenantProfile?.signature_url) {
            setSignatures((s) => ({ ...s, tenant: tenantProfile.signature_url! }));
          }

          const tenantIdNumber = tenantProfile?.id_number || "";
          if (!tenantIdNumber) return;

          setData((prev) => {
            const merged = { ...prev };
            const tenantTaxKeys = ["tenantDNI", "tenantNIF", "tenantTaxId", "tenantAfm", "tenantIdNumber", "tenantEmiratesId"];
            for (const key of tenantTaxKeys) {
              if (template.fields.some((f) => f.key === key) && (!merged[key] || merged[key] === "")) {
                merged[key] = tenantIdNumber;
              }
            }
            return applyDerivedValues(merged);
          });
        });
    }
  }, [data.tenantId, tenants, template.fields, fillFromTenant]);

  const updateField = (key: string, value: unknown) => {
    setData((prev) => applyDerivedValues({ ...prev, [key]: value }));
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
      toast({ title: t("page.common.error"), description: "Not logged in", variant: "destructive" });
      return;
    }

    const strictCountryDocTypes = new Set([
      "lease-residential",
      "lease-empty",
      "lease-furnished",
      "lease-commercial",
      "rent-receipt",
      "formal-notice",
      "inventory",
      "termination",
      "deposit-return",
      "ejari-contract",
    ]);

    if (strictCountryDocTypes.has(template.docType)) {
      if (!template.legalBasis) {
        toast({
          title: t("page.common.error"),
          description: t("page.doc_builder.no_legal_basis") !== "page.doc_builder.no_legal_basis"
            ? t("page.doc_builder.no_legal_basis")
            : "Template blocked: missing governmental legal basis.",
          variant: "destructive",
        });
        return;
      }

      const selectedPropertyId = String(data.propertyId || "");
      const selectedProperty = properties.find((p) => p.id === selectedPropertyId);

      if (isLandlord && !selectedProperty) {
        toast({
          title: t("page.common.error"),
          description: t("page.doc_builder.select_property_first") !== "page.doc_builder.select_property_first"
            ? t("page.doc_builder.select_property_first")
            : "Select a property in the template's country first.",
          variant: "destructive",
        });
        return;
      }

      if (selectedProperty) {
        try {
          assertTemplateCountryMatch(selectedProperty.country, template);
        } catch (e) {
          const msg = e instanceof CountryIsolationError
            ? `⛔ ${e.message}`
            : `Property (${selectedProperty.country}) does not match template country (${template.country}).`;
          toast({
            title: t("page.common.error"),
            description: msg,
            variant: "destructive",
          });
          return;
        }
      }
    }

    setSaving(true);
    const title = `${template.label} — ${String(data.tenantName || data.fullName || data.companyName || data.senderName || "")}`.trim();

    const { error } = await docBuilderRepo.insertDocument({
      org_id: orgId,
      user_id: user.id,
      country: template.country,
      doc_type: template.docType,
      template_id: template.id,
      template_version: template.version,
      title,
      data_json: data as unknown as Json,
      status: "final",
    }).catch((e: any) => ({ error: e })) as any;

    if (error) {
      toast({ title: t("page.common.error"), description: error.message, variant: "destructive" });
      setSaving(false);
      return;
    }

    const skipTenant = ["rent-receipt", "dunning-letter", "payment-notice", "formal-notice"].includes(template.docType);
    const docCountry = template.country || "FR";
    const doc = generateFromTemplate(template, data, signatures.landlord || signatures.tenant ? signatures : undefined, stampUrl || undefined, { skipTenantSignature: skipTenant, country: docCountry });
    const pdfFileName = `${template.docType}_${Date.now()}.pdf`;
    downloadPDF(doc, pdfFileName);

    const pdfDataUri = pdfToDataUri(doc);
    const pdfBase64 = pdfDataUri.includes(",") ? pdfDataUri.split(",")[1] : "";

    // Localized email labels per country
    const emailLabels: Record<string, { subject: string; heading: string; attached: string; alsoAvailable: string }> = {
      fr: { subject: "Document envoyé", heading: "📄 Document envoyé", attached: "Votre document est joint à cet email :", alsoAvailable: "Vous pouvez aussi retrouver ce document dans votre interface locataire." },
      en: { subject: "Document sent", heading: "📄 Document sent", attached: "Your document is attached to this email:", alsoAvailable: "You can also find this document in your tenant portal." },
      es: { subject: "Documento enviado", heading: "📄 Documento enviado", attached: "Su documento está adjunto a este email:", alsoAvailable: "También puede encontrar este documento en su portal de inquilino." },
      de: { subject: "Dokument gesendet", heading: "📄 Dokument gesendet", attached: "Ihr Dokument ist dieser E-Mail beigefügt:", alsoAvailable: "Sie können dieses Dokument auch in Ihrem Mieterportal finden." },
      it: { subject: "Documento inviato", heading: "📄 Documento inviato", attached: "Il documento è allegato a questa email:", alsoAvailable: "Puoi trovare questo documento anche nel tuo portale inquilino." },
      pt: { subject: "Documento enviado", heading: "📄 Documento enviado", attached: "O seu documento está anexado a este email:", alsoAvailable: "Também pode encontrar este documento no seu portal de inquilino." },
    };
    const countryLangMap: Record<string, string> = {
      FR: "fr", BE: "fr", CH: "fr", LU: "fr", SN: "fr", CI: "fr", MA: "fr", TN: "fr",
      ES: "es", MX: "es",
      IT: "it",
      DE: "de", AT: "de",
      PT: "pt", BR: "pt",
      GB: "en", US: "en", CA: "en", NL: "en", IE: "en", AU: "en", SG: "en", ZA: "en",
      AE: "en", SA: "en", JP: "en", TR: "en",
      PL: "en", SE: "en", DK: "en", NO: "en", FI: "en", GR: "en", CZ: "en", HU: "en", RO: "en", HR: "en", BG: "en", SK: "en",
    };
    const eLang = countryLangMap[docCountry] || "en";
    const eL = emailLabels[eLang] || emailLabels.en;

    // Send email notification + attached PDF to tenant if applicable
    const tenantEmail = data.tenantEmail as string;
    const tenantNotifiableDocTypes = ["rent-receipt", "dunning-letter", "payment-notice", "formal-notice", "lease-empty", "lease-furnished", "lease-commercial"];
    if (tenantEmail && tenantNotifiableDocTypes.includes(template.docType) && pdfBase64) {
      docBuilderRepo.sendDocEmail({
          to: tenantEmail,
          subject: `${eL.subject} : ${title}`,
          html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;">
            <h2 style="color:#1a1a1a;">${eL.heading}</h2>
            <p style="color:#555;">${eL.attached}</p>
            <div style="background:#f5f5f5;border-radius:8px;padding:16px;margin:16px 0;">
              <p style="font-weight:600;color:#1a1a1a;">${title}</p>
              <p style="color:#888;font-size:13px;">${template.label}</p>
            </div>
            <p style="color:#888;font-size:13px;">${eL.alsoAvailable}</p>
          </div>`,
          attachments: [{
            content: pdfBase64,
            filename: pdfFileName,
            type: "application/pdf",
          }],
      });
    }

    await docBuilderRepo.insertDocAuditLog(orgId, user.id, { template_id: template.id, title });

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
  const propertiesForTemplate = useMemo(
    () => properties.filter((p) => !template.country || p.country === template.country),
    [properties, template.country]
  );

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto">
        <button onClick={onBack} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 group">
          <ArrowLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" /> {t("page.common.back")}
        </button>

        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-accent/10"><FileText className="h-5 w-5 text-accent" /></div>
            {template.label}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">{template.description}</p>
          {template.legalBasis && (
            <p className="text-xs text-muted-foreground/70 italic mt-2 flex items-center gap-1">
              <Scale className="h-3 w-3" /> {t("page.doc_builder.legal_basis")} : {template.legalBasis}
            </p>
          )}
        </div>

        {template.needsLegalReview && (
          <div className="flex items-start gap-3 bg-warning/10 border border-warning/30 rounded-lg p-4 mb-6">
            <AlertTriangle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-foreground">{t("page.doc_builder.legal_review_title")}</p>
              <p className="text-xs text-muted-foreground">{t("page.doc_builder.legal_review_desc")}</p>
            </div>
          </div>
        )}

        {/* Property selector for auto-fill by country */}
        {isLandlord && (
          propertiesForTemplate.length > 0 ? (
            <div className="bg-card rounded-xl shadow-card border border-border/50 p-4 mb-4">
              <label className="block text-sm font-medium text-foreground mb-1.5 flex items-center gap-2">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                {t("page.doc_builder.prefill_property") !== "page.doc_builder.prefill_property" ? t("page.doc_builder.prefill_property") : "Pré-remplir depuis un bien"}
              </label>
              <select
                value={String(data.propertyId ?? "")}
                onChange={(e) => {
                  const propId = e.target.value;
                  if (!propId) return;
                  const propData = fillFromProperty(propId);
                  const ownerData = fillFromOwner();
                  if (propData || ownerData) {
                    setData((prev) => {
                      const merged: Record<string, unknown> = { ...prev, propertyId: propId };
                      const templateKeys = new Set(template.fields.map((f) => f.key));
                      // Apply property fields — match any template key
                      if (propData) {
                        for (const [key, val] of Object.entries(propData)) {
                          if (val !== undefined && val !== null && val !== "" && templateKeys.has(key)) {
                            merged[key] = val;
                          }
                        }
                        // Force-set common address aliases
                        const fullAddr = (propData as any).fullAddress;
                        if (fullAddr) {
                          for (const k of ["propertyAddress", "fullAddress", "address"]) {
                            if (templateKeys.has(k)) merged[k] = fullAddr;
                          }
                        }
                      }
                      // Apply owner fields — fill empty keys
                      if (ownerData) {
                        for (const [key, val] of Object.entries(ownerData)) {
                          if (val && templateKeys.has(key) && (!merged[key] || merged[key] === "" || merged[key] === 0)) {
                            merged[key] = val;
                          }
                        }
                      }
                      return applyDerivedValues(merged);
                    });
                  }

                  // Auto-select first tenant linked to this property
                  const linkedTenants = tenants.filter(t => t.property_id === propId);
                  if (linkedTenants.length === 1) {
                    updateField("tenantId", linkedTenants[0].id);
                  }
                }}
                className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">{t("page.doc_builder.select_property") !== "page.doc_builder.select_property" ? t("page.doc_builder.select_property") : "Sélectionner un bien"}</option>
                {propertiesForTemplate.map((p) => (
                  <option key={p.id} value={p.id}>{p.label} — {p.address}, {p.city} ({p.country})</option>
                ))}
              </select>
            </div>
          ) : (
            <div className="flex items-start gap-3 bg-warning/10 border border-warning/30 rounded-lg p-4 mb-4">
              <AlertTriangle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-foreground">
                  {t("page.doc_builder.no_property_country") !== "page.doc_builder.no_property_country"
                    ? t("page.doc_builder.no_property_country")
                    : "No property found in the template's country"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t("page.doc_builder.add_property_hint") !== "page.doc_builder.add_property_hint"
                    ? t("page.doc_builder.add_property_hint")
                    : `Add a property in ${template.country} for a compliant governmental document.`}
                </p>
              </div>
            </div>
          )
        )}

        {/* Tenant selector for auto-fill */}
        {isLandlord && tenants.length > 0 && template.fields.some((f) => f.key === "tenantName" || f.key === "recipientName") && (
          <div className="bg-card rounded-xl shadow-card border border-border/50 p-4 mb-4">
            <label className="block text-sm font-medium text-foreground mb-1.5">
              {t("page.doc_builder.prefill_tenant")}
            </label>
            <select
              value={String(data.tenantId ?? "")}
              onChange={(e) => updateField("tenantId", e.target.value)}
              className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">{t("page.doc_builder.select_tenant")}</option>
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
                    <select
                      value={String(data[f.key] ?? "")}
                      onChange={(e) => updateField(f.key, e.target.value)}
                      className={`w-full bg-background border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring ${fieldErrors.has(f.key) ? "border-destructive focus:ring-destructive" : "border-border"}`}
                    >
                      <option value="">{t("page.common.select")}</option>
                      {f.options?.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  ) : f.type === "textarea" ? (
                    <textarea
                      value={String(data[f.key] ?? "")}
                      onChange={(e) => updateField(f.key, e.target.value)}
                      placeholder={f.placeholder}
                      rows={4}
                      className={`w-full bg-background border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring ${fieldErrors.has(f.key) ? "border-destructive focus:ring-destructive" : "border-border"}`}
                    />
                  ) : f.type === "date" ? (
                    <input
                      type="date"
                      value={String(data[f.key] ?? "")}
                      onChange={(e) => updateField(f.key, e.target.value)}
                      className={`w-full bg-background border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring ${fieldErrors.has(f.key) ? "border-destructive focus:ring-destructive" : "border-border"}`}
                    />
                  ) : (
                    <input
                      type={f.type === "number" ? "number" : f.type === "email" ? "email" : "text"}
                      value={String(data[f.key] ?? "")}
                      onChange={(e) => updateField(f.key, f.type === "number" ? (e.target.value === "" ? "" : Number(e.target.value)) : e.target.value)}
                      placeholder={f.placeholder}
                      className={`w-full bg-background border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring ${fieldErrors.has(f.key) ? "border-destructive focus:ring-destructive" : "border-border"}`}
                    />
                  )}
                  {fieldErrors.has(f.key) && (
                    <p className="text-xs text-destructive mt-1">
                      {validation?.errors.find((e) => e.field === f.key)?.message}
                    </p>
                  )}
                </div>
              ))}
            </div>
          ))}

          {/* Signatures */}
          <div className="border-t border-border pt-6 mt-6">
            <h3 className="text-sm font-semibold text-foreground mb-4">{t("page.doc_builder.signature")}</h3>
            
            {/* Landlord signature block */}
            <div className="mb-6">
              <label className="block text-xs font-medium text-muted-foreground mb-2">
                {t("page.doc_builder.landlord_signature")}
              </label>
              {isLandlord ? (
                <SignaturePad
                  label={t("page.settings.signature")}
                  value={signatures.landlord}
                  onChange={(val) => setSignatures(s => ({ ...s, landlord: val }))}
                />
              ) : (
                <div className="bg-muted/30 p-4 rounded-lg text-sm text-muted-foreground italic border border-dashed border-border text-center">
                  {signatures.landlord ? t("page.doc_builder.landlord_signed") : t("page.doc_builder.landlord_will_sign")}
                </div>
              )}
            </div>

            {/* Tenant signature block (only if applicable for this document type) */}
            {!["rent-receipt", "dunning-letter", "payment-notice", "formal-notice"].includes(template.docType) && (
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-2">
                  {t("page.doc_builder.tenant_signature")}
                </label>
                {isTenant ? (
                  <SignaturePad
                    label={t("page.settings.signature")}
                    value={signatures.tenant}
                    onChange={(val) => setSignatures(s => ({ ...s, tenant: val }))}
                  />
                ) : (
                  <div className="bg-muted/30 p-4 rounded-lg text-sm text-muted-foreground italic border border-dashed border-border text-center">
                    {signatures.tenant ? t("page.doc_builder.tenant_signed") : t("page.doc_builder.tenant_will_sign")}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-4">
            <button
              onClick={handleGenerate}
              disabled={saving}
              className="flex-1 bg-gradient-gold text-accent-foreground font-semibold py-3 rounded-lg shadow-gold hover:opacity-90 disabled:opacity-50 transition-all"
            >
              {saving ? t("page.common.loading") : t("page.common.generate_pdf")}
            </button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default DocumentBuilder;
