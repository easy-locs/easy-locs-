import { useState, useEffect, useCallback } from "react";
import * as rentalRepo from "@/repositories/rental-data.repository";
import { dispatchSyncEvent } from "@/lib/shared/sync-engine";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { getCountryConfig } from "@/lib/country-config";
import { generateFromTemplate, pdfToDataUri } from "@/lib/pdf-generator";
import { getAllTemplates } from "@/lib/templates/registry";
import { frRentReceipt } from "@/lib/templates/fr/rent-receipt";
import { useI18n } from "@/lib/i18n";

/* ─── Types ─── */
export interface Property {
  id: string;
  label: string;
  address: string;
  postal_code: string;
  city: string;
  property_type: string;
  surface: number;
  rooms: number;
  floor?: number | null;
  heating: string;
  furnished: boolean;
  monthly_rent: number;
  monthly_charges: number;
  deposit_amount: number;
  notes: string;
  building_name?: string | null;
  lot_number?: string | null;
  building_id?: string | null;
  country: string;
  photo_urls?: any;
}

export interface Tenant {
  id: string;
  name: string;
  email: string;
  phone: string;
  property_id: string | null;
  lease_start: string | null;
  lease_end: string | null;
  rent_amount: number;
  charges_amount: number;
  deposit_amount: number;
  lease_type: string;
  notes: string;
  birth_date?: string | null;
  birth_place?: string | null;
  nationality?: string | null;
  profession?: string | null;
  guarantor_name?: string | null;
  guarantor_phone?: string | null;
  current_address?: string | null;
  tenant_user_id?: string | null;
  caf_apl_amount?: number;
}

export interface RentCall {
  id: string;
  tenant_id: string;
  property_id: string | null;
  month: string;
  rent_amount: number;
  charges_amount: number;
  total_amount: number;
  paid: boolean;
  paid_date: string | null;
  payment_method: string | null;
  receipt_validated: boolean;
  receipt_pdf_url: string | null;
}

export function useRentalData(countryFilter?: string | null) {
  const { user, orgId } = useAuth();
  const { toast } = useToast();
  const { t } = useI18n();
  const [properties, setProperties] = useState<Property[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [rentCalls, setRentCalls] = useState<RentCall[]>([]);
  const [loading, setLoading] = useState(true);

  /* ─── Load all data in a single batch to avoid N+1 queries ─── */
  const loadAll = useCallback(async () => {
    if (!orgId) { setLoading(false); return; }
    setLoading(true);

    // 1. Load properties first (needed for country filtering tenants/rents)
    let propsQuery = await rentalRepo.fetchProperties(orgId, countryFilter);
    const propsData = propsQuery;

    const mappedProps = (propsData || []).map(p => ({
      id: p.id, label: p.label, address: p.address, postal_code: p.postal_code,
      city: p.city, property_type: p.property_type, surface: Number(p.surface) || 0,
      rooms: p.rooms || 1, floor: p.floor, heating: p.heating || "individual-gas",
      furnished: p.furnished || false, monthly_rent: Number(p.monthly_rent) || 0,
      monthly_charges: Number(p.monthly_charges) || 0, deposit_amount: Number(p.deposit_amount) || 0,
      notes: p.notes || "", building_name: (p as any).building_name || null, lot_number: (p as any).lot_number || null,
      building_id: (p as any).building_id || null, country: p.country || "FR",
      photo_urls: p.photo_urls || null,
    }));
    setProperties(mappedProps);

    // Build property ID set for country filtering (reused for tenants + rent calls)
    const propIds = countryFilter ? new Set(mappedProps.map(p => p.id)) : null;

    // 2. Load tenants + rent calls in parallel (no extra property query needed)
    const [tenantsRaw, rentRaw] = await Promise.all([
      rentalRepo.fetchTenants(orgId),
      rentalRepo.fetchRentCalls(orgId),
    ]);
    let filteredTenants = tenantsData;
    if (propIds) {
      filteredTenants = filteredTenants.filter(t => t.property_id && propIds.has(t.property_id));
    }
    setTenants(filteredTenants.map(t => ({
      id: t.id, name: t.name, email: t.email || "", phone: t.phone || "",
      property_id: t.property_id, lease_start: t.lease_start, lease_end: t.lease_end,
      rent_amount: Number(t.rent_amount) || 0, charges_amount: Number(t.charges_amount) || 0,
      deposit_amount: Number(t.deposit_amount) || 0, lease_type: t.lease_type || "empty",
      notes: t.notes || "", birth_date: t.birth_date, birth_place: t.birth_place,
      nationality: t.nationality, profession: t.profession,
      guarantor_name: t.guarantor_name, guarantor_phone: t.guarantor_phone,
      current_address: t.current_address,
      tenant_user_id: t.tenant_user_id,
      caf_apl_amount: Number((t as any).caf_apl_amount) || 0,
    })));

    let rentCallData = rentData;
    if (propIds) {
      rentCallData = rentCallData.filter(r => r.property_id && propIds.has(r.property_id));
    }
    setRentCalls(rentCallData.map(r => ({
      id: r.id, tenant_id: r.tenant_id, property_id: r.property_id,
      month: r.month, rent_amount: Number(r.rent_amount) || 0,
      charges_amount: Number(r.charges_amount) || 0, total_amount: Number(r.total_amount) || 0,
      paid: r.paid || false, paid_date: r.paid_date, payment_method: r.payment_method || null,
      receipt_validated: r.receipt_validated || false, receipt_pdf_url: r.receipt_pdf_url,
    })));

    setLoading(false);
  }, [orgId, countryFilter]);

  // Aliases for backward compat — all reload the full dataset to stay consistent
  const loadProperties = loadAll;
  const loadTenants = loadAll;
  const loadRentCalls = loadAll;

  useEffect(() => { loadAll(); }, [loadAll]);

  /* ─── Property CRUD ─── */
  const saveProperty = async (form: Omit<Property, "id">, editId?: string) => {
    if (!orgId || !user) return;
    const record = {
      org_id: orgId, user_id: user.id, label: form.label, address: form.address,
      postal_code: form.postal_code, city: form.city, property_type: form.property_type,
      surface: form.surface, rooms: form.rooms, floor: form.floor,
      heating: form.heating, furnished: form.furnished, monthly_rent: form.monthly_rent,
      monthly_charges: form.monthly_charges, deposit_amount: form.deposit_amount, notes: form.notes,
      building_name: form.building_name || null, lot_number: form.lot_number || null,
      country: form.country || "FR",
    };
    if (editId) {
      const { error } = await supabase.from("properties").update(record).eq("id", editId);
      if (error) { toast({ title: t("page.common.error"), description: error.message, variant: "destructive" }); return false; }
      toast({ title: t("hook.rental.property_modified") });
    } else {
      const { error } = await supabase.from("properties").insert(record);
      if (error) { toast({ title: t("page.common.error"), description: error.message, variant: "destructive" }); return false; }
      toast({ title: t("hook.rental.property_added") });
    }
    await loadProperties();
    return true;
  };

  const deleteProperty = async (id: string) => {
    const { error } = await supabase.from("properties").delete().eq("id", id);
    if (error) { toast({ title: t("page.common.error"), description: error.message, variant: "destructive" }); return; }
    toast({ title: t("hook.rental.property_deleted") });
    await loadProperties();
  };

  /* ─── Tenant CRUD ─── */
  const saveTenant = async (form: Omit<Tenant, "id">, editId?: string): Promise<string | false> => {
    if (!orgId || !user) return false;
    const record = {
      org_id: orgId, user_id: user.id, name: form.name, email: form.email || null,
      phone: form.phone || null, property_id: form.property_id || null,
      lease_start: form.lease_start || null, lease_end: form.lease_end || null,
      rent_amount: form.rent_amount, charges_amount: form.charges_amount,
      deposit_amount: form.deposit_amount, lease_type: form.lease_type, notes: form.notes || null,
      birth_date: form.birth_date || null, birth_place: form.birth_place || null,
      nationality: form.nationality || null, profession: form.profession || null,
      guarantor_name: form.guarantor_name || null, guarantor_phone: form.guarantor_phone || null,
      caf_apl_amount: form.caf_apl_amount || 0,
    };
    if (editId) {
      const { error } = await supabase.from("tenants").update(record).eq("id", editId);
      if (error) { toast({ title: t("page.common.error"), description: error.message, variant: "destructive" }); return false; }
      toast({ title: t("hook.rental.tenant_modified") });
      await loadTenants();
      return editId;
    } else {
      const { data, error } = await supabase.from("tenants").insert(record).select("id").single();
      if (error) { toast({ title: t("page.common.error"), description: error.message, variant: "destructive" }); return false; }
      toast({ title: t("hook.rental.tenant_added") });
      await loadTenants();
      return data.id;
    }
  };

  const deleteTenant = async (id: string) => {
    const { error } = await supabase.from("tenants").delete().eq("id", id);
    if (error) { toast({ title: t("page.common.error"), description: error.message, variant: "destructive" }); return; }
    toast({ title: t("hook.rental.tenant_deleted") });
    await loadTenants();
  };

  /* ─── Rent calls ─── */
  const generateMonthlyRentCalls = async () => {
    if (!orgId) return;
    const now = new Date();
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    const { data: existingCalls } = await supabase
      .from("rent_calls")
      .select("tenant_id")
      .eq("org_id", orgId)
      .eq("month", month);

    const existingIds = new Set((existingCalls || []).map(r => r.tenant_id));
    const newCalls = tenants
      .filter(tn => tn.rent_amount > 0 && !existingIds.has(tn.id))
      .map(tn => ({
        org_id: orgId,
        tenant_id: tn.id,
        property_id: tn.property_id,
        month,
        rent_amount: tn.rent_amount,
        charges_amount: tn.charges_amount,
        total_amount: tn.rent_amount + tn.charges_amount,
      }));
    if (newCalls.length === 0) {
      toast({ title: t("hook.rental.all_calls_created") });
      return;
    }
    const { error } = await supabase.from("rent_calls").upsert(newCalls, { onConflict: "org_id,tenant_id,month", ignoreDuplicates: true });
    if (error) { toast({ title: t("page.common.error"), description: error.message, variant: "destructive" }); return; }
    toast({ title: `${newCalls.length} ${t("hook.rental.calls_generated")}` });
    await loadRentCalls();
  };

  const togglePayment = async (id: string, paymentMethod?: string) => {
    const call = rentCalls.find(r => r.id === id);
    if (!call) return;
    const nowPaid = !call.paid;
    const { error } = await supabase.from("rent_calls").update({
      paid: nowPaid,
      paid_date: nowPaid ? new Date().toISOString() : null,
      payment_method: nowPaid ? (paymentMethod || null) : null,
      receipt_validated: nowPaid ? true : false,
    }).eq("id", id);
    if (error) { toast({ title: t("page.common.error"), description: error.message, variant: "destructive" }); return; }

    if (nowPaid && user && orgId) {
      try {
        const tenant = tenants.find(tn => tn.id === call.tenant_id);
        const prop = properties.find(p => p.id === (call.property_id || tenant?.property_id));
        if (tenant) {
          const propCountryCode = prop?.country || "FR";
          const currency = getCountryConfig(propCountryCode).currency || "EUR";

          // 1. Sync engine: payment_received (owner/manager — finance/audit)
          await dispatchSyncEvent({
            type: "payment_received",
            context: { orgId, propertyId: call.property_id || tenant.property_id, tenantId: call.tenant_id, countryCode: propCountryCode },
            actorUserId: user.id,
            month: call.month,
            totalAmount: call.total_amount,
            currency,
            tenantName: tenant.name,
            paymentId: call.id,
          }).catch(() => {});

          // 2. Generate receipt PDF
          let landlordName = "";
          let landlordAddress = "";
          let landlordSignature = "";
          let stampUrl = "";
          try {
            const { data: profile } = await supabase.from("profiles").select("signature_url, name").eq("id", user.id).single();
            if (profile?.signature_url) landlordSignature = profile.signature_url;
            if (profile?.name) landlordName = profile.name;
          } catch { /* ignore */ }
          try {
            const { data: ownerProfile } = await supabase.from("owner_profiles").select("full_name, address, postal_code, city").eq("org_id", orgId).limit(1).maybeSingle();
            if (ownerProfile) {
              landlordName = ownerProfile.full_name || landlordName;
              landlordAddress = [ownerProfile.address, ownerProfile.postal_code, ownerProfile.city].filter(Boolean).join(", ");
            }
          } catch { /* ignore */ }
          try {
            const { data: orgData } = await supabase.from("orgs").select("stamp_url, name, address, postal_code, city").eq("id", orgId).single();
            if ((orgData as any)?.stamp_url) stampUrl = (orgData as any).stamp_url;
            if (!landlordName && orgData?.name) landlordName = orgData.name;
            if (!landlordAddress) landlordAddress = [orgData?.address, orgData?.postal_code, orgData?.city].filter(Boolean).join(", ");
          } catch { /* ignore */ }
          if (!landlordName) landlordName = user?.user_metadata?.name || t("hook.rental.owner_fallback");

          const paymentMethodLabels: Record<string, string> = {
            online: t("hook.rental.payment_method_online"),
            bank_transfer: t("hook.rental.payment_method_transfer"),
            cash: t("hook.rental.payment_method_cash"),
          };
          const paymentMethodLabel = paymentMethod ? (paymentMethodLabels[paymentMethod] || paymentMethod) : "";

          const receiptData: Record<string, unknown> = {
            landlordName, landlordAddress,
            tenantName: tenant.name,
            tenantAddress: prop ? `${prop.address}, ${prop.postal_code} ${prop.city}` : "",
            propertyAddress: prop ? `${prop.address}, ${prop.postal_code} ${prop.city}` : "",
            rentAmount: call.rent_amount, chargesAmount: call.charges_amount,
            periodStart: `${call.month}-01`,
            periodEnd: `${call.month}-${new Date(+call.month.split("-")[0], +call.month.split("-")[1], 0).getDate()}`,
            paymentDate: new Date().toISOString().split("T")[0],
            paymentMethod: paymentMethodLabel,
          };

          const allTpls = getAllTemplates();
          const receiptTemplate = allTpls.find(tpl => tpl.country === propCountryCode && tpl.docType === "rent-receipt" && tpl.active) || frRentReceipt;
          const signatures = landlordSignature ? { landlord: landlordSignature } : undefined;
          const pdfDoc = generateFromTemplate(receiptTemplate, receiptData, signatures, stampUrl || undefined, { skipTenantSignature: true, country: propCountryCode });

          const receiptTitle = t("hook.rental.receipt_title").replace("{name}", tenant.name).replace("{month}", call.month);

          await supabase.from("documents").insert({
            org_id: orgId,
            user_id: user.id,
            doc_type: "rent-receipt",
            title: receiptTitle,
            data_json: receiptData as any,
            country: propCountryCode,
            status: "final",
          });

          // 3. Email receipt to tenant
          const tenantEmail = tenant.email?.trim().toLowerCase();
          if (tenantEmail && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(tenantEmail)) {
            try {
              const pdfBase64 = pdfDoc.output("datauristring").split(",")[1];
              await supabase.functions.invoke("send-email", {
                body: {
                  to: tenantEmail,
                  subject: t("hook.rental.receipt_email_subject").replace("{month}", call.month),
                  from_name: landlordName || "Easy-Locs",
                  html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;background:#ffffff;">
                    <h2 style="color:#1a1a1a;text-align:center;">${t("hook.rental.receipt_email_heading")}</h2>
                    <p style="color:#555;font-size:15px;">${t("hook.rental.receipt_email_body").replace("{month}", call.month)}</p>
                    <div style="background:#f5f5f5;border-radius:8px;padding:16px;margin:16px 0;">
                      <p style="margin:4px 0;font-size:14px;color:#333;">${t("hook.rental.receipt_email_rent")} : <strong>${call.rent_amount}</strong></p>
                      <p style="margin:4px 0;font-size:14px;color:#333;">${t("hook.rental.receipt_email_charges")} : <strong>${call.charges_amount}</strong></p>
                      <p style="margin:8px 0 0;font-size:16px;color:#1a1a1a;font-weight:700;">${t("hook.rental.receipt_email_total")} : ${call.total_amount}</p>
                    </div>
                    <p style="color:#888;font-size:12px;text-align:center;">${t("hook.rental.receipt_email_footer")}</p>
                  </div>`,
                  attachments: [{
                    content: pdfBase64,
                    filename: `${receiptTitle.replace(/\s/g, "_")}.pdf`,
                    type: "application/pdf",
                  }],
                },
              });
              toast({ title: t("hook.rental.payment_registered"), description: t("hook.rental.receipt_generated_emailed") });
            } catch (emailErr) {
              console.error("Email send failed:", emailErr);
              toast({ title: t("hook.rental.payment_registered"), description: t("hook.rental.receipt_generated_no_email") });
            }
          } else {
            toast({ title: t("hook.rental.payment_registered"), description: t("hook.rental.receipt_generated") });
          }

          // 4. Sync engine: receipt_generated (tenant — legal proof/document)
          dispatchSyncEvent({
            type: "receipt_generated",
            context: { orgId, propertyId: call.property_id || tenant.property_id, tenantId: call.tenant_id, countryCode: propCountryCode },
            actorUserId: user.id,
            targetUserId: tenant.tenant_user_id || undefined,
            targetEmail: tenant.email || undefined,
            month: call.month,
            totalAmount: call.total_amount,
            currency,
            tenantName: tenant.name,
            receiptId: call.id,
          }).catch(() => {});
        }
      } catch (receiptErr) {
        console.error("Auto-receipt generation error:", receiptErr);
        toast({ title: t("hook.rental.payment_registered"), description: t("hook.rental.receipt_gen_error") });
      }
    }

    await loadRentCalls();
  };

  const validateReceipt = async (id: string) => {
    const { error } = await supabase.from("rent_calls").update({ receipt_validated: true }).eq("id", id);
    if (error) { toast({ title: t("page.common.error"), description: error.message, variant: "destructive" }); return; }
    toast({ title: t("hook.rental.receipt_validated") });
    await loadRentCalls();
  };

  /* ─── Send tenant invite (invitation link) ─── */
  const sendTenantInvite = async (tenant: Tenant) => {
    const normalizedEmail = tenant.email?.trim().toLowerCase();
    const isValidEmail = !!normalizedEmail && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail);

    if (!isValidEmail) {
      toast({ title: t("page.common.error"), description: t("hook.rental.tenant_email_invalid"), variant: "destructive" });
      return;
    }
    if (!orgId || !user) return;

    try {
      const token = `inv_${Date.now()}_${Math.random().toString(36).slice(2)}_${Math.random().toString(36).slice(2)}`;

      const { error: invError } = await supabase.from("tenant_invitations").insert({
        org_id: orgId,
        tenant_id: tenant.id,
        token,
        email: normalizedEmail,
        invited_by: user.id,
      });
      if (invError) throw invError;

      const publishedOrigin = "https://www.easy-locs.com";
      const inviteUrl = `${publishedOrigin}/tenant-signup?token=${token}`;

      const canCopyInviteLink =
        typeof window !== "undefined" &&
        window.isSecureContext &&
        typeof navigator !== "undefined" &&
        !!navigator.clipboard?.writeText;

      let copied = false;
      if (canCopyInviteLink) {
        try {
          await navigator.clipboard.writeText(inviteUrl);
          copied = true;
        } catch {
          copied = false;
        }
      }

      let emailSent = false;
      let emailErrorMessage = "";
      let propCountry = "FR";
      if (tenant.property_id) {
        const { data: prop } = await supabase.from("properties").select("country").eq("id", tenant.property_id).single();
        if (prop?.country) propCountry = prop.country;
      }
      const L = getCountryConfig(propCountry).labels;
      try {
        const { data: emailData, error: emailError } = await supabase.functions.invoke("send-email", {
          body: {
            to: normalizedEmail,
            subject: L.inviteSubject,
            html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;background:#ffffff;">
              <h2 style="color:#1a1a1a;text-align:center;">${L.inviteTitle}</h2>
              <p style="color:#555;font-size:15px;">${L.emailHello} ${tenant.name},</p>
              <p style="color:#555;font-size:15px;">${L.inviteBody}</p>
              <div style="text-align:center;margin:24px 0;">
                <a href="${inviteUrl}" style="display:inline-block;background:#d4a853;color:#1a1a1a;font-weight:600;text-decoration:none;padding:12px 28px;border-radius:8px;font-size:15px;">${L.inviteButton}</a>
              </div>
              <p style="color:#777;font-size:13px;">${L.inviteLinkExpiry}</p>
              <p style="color:#888;font-size:12px;text-align:center;">${L.emailAutoSent}</p>
            </div>`,
          },
        });

        if (emailError || (emailData && emailData.success === false)) {
          throw emailError || new Error(emailData?.error || "Send failed");
        }
        emailSent = true;
      } catch (err: any) {
        emailErrorMessage = err?.message || "unknown error";
      }

      if (emailSent) {
        toast({
          title: t("hook.rental.invite_sent"),
          description: t("hook.rental.invite_sent_desc").replace("{email}", normalizedEmail!) + (copied ? t("hook.rental.invite_link_copied") : ""),
        });
      } else {
        window.open(inviteUrl, '_blank');
        const linkMsg = copied ? t("hook.rental.invite_link_opened") : t("hook.rental.invite_link_opened_no_copy");
        const errMsg = emailErrorMessage ? ` ${t("hook.rental.invite_email_failed").replace("{error}", emailErrorMessage)}` : "";
        toast({
          title: t("hook.rental.invite_created"),
          description: linkMsg + errMsg,
        });
      }
    } catch (err: any) {
      toast({ title: t("page.common.error"), description: err.message, variant: "destructive" });
    }
  };

  /* ─── Assign tenant to property ─── */
  const assignTenantToProperty = async (tenantId: string, propertyId: string) => {
    const prop = properties.find(p => p.id === propertyId);
    const { error } = await supabase
      .from("tenants")
      .update({ property_id: propertyId })
      .eq("id", tenantId);
    if (error) {
      toast({ title: t("page.common.error"), description: error.message, variant: "destructive" });
      return false;
    }
    toast({
      title: t("hook.rental.tenant_assigned"),
      description: prop ? t("hook.rental.tenant_assigned_to").replace("{property}", prop.label) : t("hook.rental.tenant_assigned"),
    });
    await loadTenants();
    return true;
  };

  return {
    properties, tenants, rentCalls, loading,
    saveProperty, deleteProperty,
    saveTenant, deleteTenant, sendTenantInvite,
    generateMonthlyRentCalls, togglePayment, validateReceipt,
    loadAll, loadTenants, loadRentCalls, assignTenantToProperty,
  };
}
