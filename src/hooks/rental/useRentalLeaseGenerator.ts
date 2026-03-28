/**
 * useRentalLeaseGenerator — Extracted from RentalManagement.tsx
 * Auto-generates lease PDF + first rent call on tenant creation.
 */
import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/lib/i18n";
import { getCountryConfig, formatCurrency } from "@/lib/country-config";
import { generateFromTemplate, downloadPDF } from "@/lib/pdf-generator";
import { getAllTemplates } from "@/lib/templates/registry";
import { frLeaseEmpty } from "@/lib/templates/fr/lease-empty";
import { frLeaseFurnished } from "@/lib/templates/fr/lease-furnished";
import { frLeaseCommercial } from "@/lib/templates/fr/lease-commercial";
import { dispatchSyncEvent } from "@/lib/shared/sync-engine";
import type { Property } from "@/hooks/useRentalData";
import type { DocumentTemplate } from "@/lib/templates/types";

export function useRentalLeaseGenerator(properties: Property[], userCountry: string) {
  const { user, orgId } = useAuth();
  const { toast } = useToast();
  const { t } = useI18n();
  const cc = getCountryConfig(userCountry);
  const L = cc.labels;
  const fmt = (n: number) => formatCurrency(n, userCountry);

  const autoGenerateLease = useCallback(async (tenantId: string, form: {
    name: string; email: string; phone: string; property_id: string | null;
    lease_start: string | null; lease_end: string | null; rent_amount: number;
    charges_amount: number; deposit_amount: number; lease_type: string;
    birth_date?: string | null; birth_place?: string | null;
  }) => {
    const prop = properties.find(p => p.id === form.property_id);
    if (!prop || !user) return;
    const propCountry = prop.country || userCountry;

    const allTpls = getAllTemplates();
    const findLease = (docType: string) =>
      allTpls.find(t => t.country === propCountry && t.docType === docType && t.active) ||
      allTpls.find(t => t.country === propCountry && t.category === "rental" && t.docType.includes("lease") && t.active);

    const leaseTemplateMap: Record<string, DocumentTemplate | undefined> = {
      empty: findLease("lease-empty") || findLease("lease-residential") || frLeaseEmpty,
      furnished: findLease("lease-furnished") || findLease("lease-residential") || frLeaseFurnished,
      commercial: findLease("lease-commercial") || frLeaseCommercial,
    };
    const template = leaseTemplateMap[form.lease_type];
    if (!template) return;

    let landlordName = user?.user_metadata?.name || t("page.rental.landlord");
    let landlordEmail = user?.email || "";
    let landlordSignature = "";
    try {
      const { data: profile } = await supabase.from("profiles").select("name, email, signature_url").eq("id", user!.id).single();
      if (profile?.name) landlordName = profile.name;
      if (profile?.email) landlordEmail = profile.email;
      if (profile?.signature_url) landlordSignature = profile.signature_url;
    } catch {}

    const propertyTypeMap: Record<string, string> = { apartment: "Appartement", house: "Maison", studio: "Studio", commercial: "Local commercial", parking: "Parking / Garage" };
    const heatingMap: Record<string, string> = { "individual-gas": "individuel-gaz", "individual-electric": "individuel-electrique", "collective": "collectif", "heat-pump": "pompe-chaleur", "other": "autre" };

    const leaseData: Record<string, unknown> = {
      landlordName, landlordAddress: prop.address ? `${prop.address}, ${prop.postal_code} ${prop.city}` : "", landlordEmail,
      tenantName: form.name, tenantBirthDate: form.birth_date || "", tenantBirthPlace: form.birth_place || "",
      tenantEmail: form.email || "", tenantPhone: form.phone || "",
      propertyAddress: `${prop.address}, ${prop.postal_code} ${prop.city}`,
      propertyType: propertyTypeMap[prop.property_type] || prop.property_type,
      surface: prop.surface, rooms: prop.rooms, floor: prop.floor ?? "",
      heating: heatingMap[prop.heating] || prop.heating,
      hotWater: "individuel", annexes: "", equipments: "",
      rentAmount: form.rent_amount || prop.monthly_rent,
      chargesAmount: form.charges_amount || prop.monthly_charges,
      chargesMode: "provisions", depositAmount: form.deposit_amount || prop.deposit_amount,
      paymentDay: 5, paymentMethod: "virement",
      zoneTendue: "non", dpeLetter: "D", gesLetter: "D",
      startDate: form.lease_start || new Date().toISOString().split("T")[0],
      duration: form.lease_type === "furnished" ? "1" : form.lease_type === "commercial" ? "9" : "3",
    };

    if (form.lease_type === "commercial") {
      Object.assign(leaseData, {
        tenantSiret: "", tenantRCS: "", tenantRepresentant: form.name,
        activity: "Toutes activités commerciales", allActivities: "oui",
        localDescription: "", parkingSpaces: 0, taxeFonciere: 0,
        indexationType: "ILC", paymentFrequency: "mensuel", tva: "non", droitBail: 0,
        rentAmount: (form.rent_amount || prop.monthly_rent) * 12,
        chargesAmount: (form.charges_amount || prop.monthly_charges) * 12,
      });
    }
    if (form.lease_type === "furnished") {
      leaseData.furnitureList = "Literie avec couette/couverture\nVolets ou rideaux occultants\nPlaques de cuisson\nFour ou micro-ondes\nRéfrigérateur\nVaisselle et ustensiles\nTable et chaises\nÉtagères de rangement\nLuminaires\nMatériel d'entretien ménager";
    }

    try {
      const signatures = landlordSignature ? { landlord: landlordSignature, tenant: "" } : undefined;
      const doc = generateFromTemplate(template, leaseData, signatures);
      const leaseLabel = form.lease_type === "furnished" ? t("page.rental.lease_furnished") : form.lease_type === "commercial" ? t("page.rental.lease_commercial") : t("page.rental.lease_empty");
      const title = `${leaseLabel} — ${form.name}`;
      if (orgId) {
        await supabase.from("documents").insert({
          org_id: orgId, user_id: user!.id, title, doc_type: template.docType,
          template_id: template.id, template_version: template.version,
          data_json: leaseData as any, status: "draft", country: propCountry,
        } as any);
      }
      downloadPDF(doc, `${title.replace(/\s/g, "_")}.pdf`);
      toast({ title: t("page.rental.lease_generated"), description: `${leaseLabel} ${t("page.rental.lease_downloaded")} ${form.name}` });
    } catch (err) {
      console.error("Auto-lease generation failed:", err);
      toast({ title: t("page.rental.info"), description: t("page.rental.lease_gen_failed"), variant: "destructive" });
    }
  }, [properties, user, orgId, userCountry, toast, t]);

  const autoGenerateFirstRentCall = useCallback(async (tenantId: string, form: {
    name: string; property_id: string | null; rent_amount: number; charges_amount: number;
  }) => {
    if (!orgId || !user || !form.property_id) return;
    const now = new Date();
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    try {
      const { data: inserted } = await supabase.from("rent_calls").insert({
        org_id: orgId, tenant_id: tenantId, property_id: form.property_id,
        month, rent_amount: form.rent_amount || 0, charges_amount: form.charges_amount || 0,
        total_amount: (form.rent_amount || 0) + (form.charges_amount || 0), paid: false,
      }).select("id").single();
      toast({ title: L.monthCalls, description: `${month} — ${fmt((form.rent_amount || 0) + (form.charges_amount || 0))}` });

      if (inserted?.id) {
        const prop = properties.find(p => p.id === form.property_id);
        dispatchSyncEvent({
          type: "rent_call_created",
          context: { orgId, propertyId: form.property_id, tenantId, countryCode: prop?.country || "" },
          actorUserId: user.id, month,
          totalAmount: (form.rent_amount || 0) + (form.charges_amount || 0),
          currency: "EUR", tenantName: form.name, propertyLabel: prop?.label || "",
          rentCallId: inserted.id,
        }).catch(() => {});
      }
    } catch {}
  }, [orgId, user, properties, toast, L, fmt]);

  return { autoGenerateLease, autoGenerateFirstRentCall };
}
