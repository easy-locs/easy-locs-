/**
 * useLeaseAutoGenerator — Atomic: auto-generates lease PDF + first rent call on tenant creation.
 * MIGRATED: All DB ops via rental-data.repository.
 */
import { useCallback } from "react";
import * as rentalRepo from "@/repositories/rental-data.repository";
import { getAllTemplates } from "@/lib/templates/registry";
import { frLeaseEmpty } from "@/lib/templates/fr/lease-empty";
import { frLeaseFurnished } from "@/lib/templates/fr/lease-furnished";
import { frLeaseCommercial } from "@/lib/templates/fr/lease-commercial";
import { generateFromTemplate, downloadPDF } from "@/lib/pdf-generator";
import { dispatchSyncEvent } from "@/lib/shared/sync-engine";
import type { DocumentTemplate } from "@/lib/templates/types";

interface LeaseContext {
  orgId: string;
  userId: string;
  userCountry: string;
  properties: any[];
  toast: (opts: any) => void;
  t: (key: string) => string;
  formatCurrency: (n: number) => string;
}

export function useLeaseAutoGenerator(ctx: LeaseContext) {
  const { orgId, userId, userCountry, properties, toast, t, formatCurrency } = ctx;

  const autoGenerateLease = useCallback(async (tenantId: string, form: any) => {
    const prop = properties.find((p: any) => p.id === form.property_id);
    if (!prop) return;
    const propCountry = prop.country || userCountry;

    const allTpls = getAllTemplates();
    const findLease = (docType: string) =>
      allTpls.find((tpl) => tpl.country === propCountry && tpl.docType === docType && tpl.active) ||
      allTpls.find((tpl) => tpl.country === propCountry && tpl.category === "rental" && tpl.docType.includes("lease") && tpl.active);

    const leaseTemplateMap: Record<string, DocumentTemplate | undefined> = {
      empty: findLease("lease-empty") || findLease("lease-residential") || frLeaseEmpty,
      furnished: findLease("lease-furnished") || findLease("lease-residential") || frLeaseFurnished,
      commercial: findLease("lease-commercial") || frLeaseCommercial,
    };
    const template = leaseTemplateMap[form.lease_type];
    if (!template) return;

    let landlordName = "";
    let landlordEmail = "";
    let landlordSignature = "";
    try {
      const profile = await rentalRepo.fetchProfile(userId);
      if (profile?.name) landlordName = profile.name;
      if (profile?.email) landlordEmail = profile.email;
      if (profile?.signature_url) landlordSignature = profile.signature_url;
    } catch { /* use defaults */ }

    const leaseData: Record<string, unknown> = {
      landlordName, landlordAddress: prop.address ? `${prop.address}, ${prop.postal_code} ${prop.city}` : "", landlordEmail,
      tenantName: form.name, tenantBirthDate: form.birth_date || "", tenantBirthPlace: form.birth_place || "",
      tenantEmail: form.email || "", tenantPhone: form.phone || "",
      propertyAddress: `${prop.address}, ${prop.postal_code} ${prop.city}`,
      surface: prop.surface, rooms: prop.rooms, floor: prop.floor ?? "",
      rentAmount: form.rent_amount || prop.monthly_rent, chargesAmount: form.charges_amount || prop.monthly_charges,
      depositAmount: form.deposit_amount || prop.deposit_amount, paymentDay: 5,
      startDate: form.lease_start || new Date().toISOString().split("T")[0],
      duration: form.lease_type === "furnished" ? "1" : form.lease_type === "commercial" ? "9" : "3",
    };

    try {
      const signatures = landlordSignature ? { landlord: landlordSignature, tenant: "" } : undefined;
      const doc = generateFromTemplate(template, leaseData, signatures);
      const leaseLabel = form.lease_type === "furnished" ? t("page.rental.lease_furnished") : form.lease_type === "commercial" ? t("page.rental.lease_commercial") : t("page.rental.lease_empty");
      const title = `${leaseLabel} — ${form.name}`;
      if (orgId) {
        await rentalRepo.insertDocument({ org_id: orgId, user_id: userId, title, doc_type: template.docType, template_id: template.id, template_version: template.version, data_json: leaseData as any, status: "draft", country: propCountry });
      }
      downloadPDF(doc, `${title.replace(/\s/g, "_")}.pdf`);
      toast({ title: t("page.rental.lease_generated"), description: `${leaseLabel} ${t("page.rental.lease_downloaded")} ${form.name}` });
    } catch (err) {
      console.error("Auto-lease generation failed:", err);
      toast({ title: t("page.rental.info"), description: t("page.rental.lease_gen_failed"), variant: "destructive" });
    }
  }, [orgId, userId, userCountry, properties, toast, t]);

  const autoGenerateFirstRentCall = useCallback(async (tenantId: string, form: any) => {
    if (!orgId || !userId || !form.property_id) return;
    const now = new Date();
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    try {
      const inserted = await rentalRepo.insertSingleRentCall({
        org_id: orgId, tenant_id: tenantId, property_id: form.property_id,
        month, rent_amount: form.rent_amount || 0, charges_amount: form.charges_amount || 0,
        total_amount: (form.rent_amount || 0) + (form.charges_amount || 0), paid: false,
      });
      toast({ title: t("page.rental.month_calls") || "Monthly rent call", description: `${month} — ${formatCurrency((form.rent_amount || 0) + (form.charges_amount || 0))}` });
      if (inserted?.id) {
        const prop = properties.find((p: any) => p.id === form.property_id);
        dispatchSyncEvent({
          type: "rent_call_created",
          context: { orgId, propertyId: form.property_id, tenantId, countryCode: prop?.country || "" },
          actorUserId: userId, month, totalAmount: (form.rent_amount || 0) + (form.charges_amount || 0),
          currency: "EUR", tenantName: form.name, propertyLabel: prop?.label || "", rentCallId: inserted.id,
        }).catch(() => {});
      }
    } catch { /* ignore duplicate */ }
  }, [orgId, userId, properties, toast, t, formatCurrency]);

  return { autoGenerateLease, autoGenerateFirstRentCall };
}
