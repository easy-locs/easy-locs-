/**
 * lease-workflow — Automated lease lifecycle pipeline.
 * 
 * CRITICAL LIFECYCLE (production-grade):
 * 1. generate_lease → Creates lease + document in "pending_signature" status
 * 2. Signatures happen via frontend (recordTenantSignature / recordOwnerSignature)
 * 3. When lease.status → "active" (both signed), DB trigger calls generate_rent_schedule
 * 4. generate_rent_schedule → Only works for active leases with rent_schedule_generated check
 * 
 * Country-aware: uses country-specific defaults for lease terms, deposit, notice period.
 */

import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Country-specific lease defaults
const LEASE_DEFAULTS: Record<string, { leaseType: string; durationMonths: number; noticePeriod: number; depositMonths: number; docType: string }> = {
  FR: { leaseType: "furnished", durationMonths: 12, noticePeriod: 1, depositMonths: 2, docType: "bail-meuble" },
  ES: { leaseType: "residential", durationMonths: 60, noticePeriod: 4, depositMonths: 2, docType: "contrato-alquiler" },
  DE: { leaseType: "residential", durationMonths: 0, noticePeriod: 3, depositMonths: 3, docType: "mietvertrag" },
  IT: { leaseType: "residential", durationMonths: 48, noticePeriod: 6, depositMonths: 3, docType: "contratto-locazione" },
  GB: { leaseType: "ast", durationMonths: 12, noticePeriod: 2, depositMonths: 5, docType: "tenancy-agreement" },
  PT: { leaseType: "residential", durationMonths: 12, noticePeriod: 2, depositMonths: 2, docType: "contrato-arrendamento" },
  AE: { leaseType: "residential", durationMonths: 12, noticePeriod: 3, depositMonths: 1, docType: "tenancy-contract" },
  NL: { leaseType: "residential", durationMonths: 24, noticePeriod: 3, depositMonths: 3, docType: "huurcontract" },
  BE: { leaseType: "residential", durationMonths: 36, noticePeriod: 3, depositMonths: 3, docType: "bail-habitation" },
  CH: { leaseType: "residential", durationMonths: 12, noticePeriod: 3, depositMonths: 3, docType: "mietvertrag" },
  AT: { leaseType: "residential", durationMonths: 36, noticePeriod: 3, depositMonths: 3, docType: "mietvertrag" },
  MA: { leaseType: "residential", durationMonths: 12, noticePeriod: 2, depositMonths: 2, docType: "contrat-bail" },
  DK: { leaseType: "residential", durationMonths: 0, noticePeriod: 3, depositMonths: 3, docType: "lejekontrakt" },
  SE: { leaseType: "residential", durationMonths: 0, noticePeriod: 3, depositMonths: 0, docType: "hyreskontrakt" },
  NO: { leaseType: "residential", durationMonths: 36, noticePeriod: 3, depositMonths: 3, docType: "husleiekontrakt" },
  FI: { leaseType: "residential", durationMonths: 0, noticePeriod: 1, depositMonths: 2, docType: "vuokrasopimus" },
};

function getLeaseDefaults(country: string) {
  return LEASE_DEFAULTS[country] || { leaseType: "residential", durationMonths: 12, noticePeriod: 2, depositMonths: 2, docType: "lease-agreement" };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceKey);

  try {
    const { action, tenant_id, lease_id, property_id, org_id, override } = await req.json();

    // ═══════════════════════════════════════════
    // ACTION: generate_lease
    // Creates lease in pending_signature status
    // Does NOT generate rent schedule
    // ═══════════════════════════════════════════
    if (action === "generate_lease") {
      const [{ data: tenant }, { data: property }] = await Promise.all([
        supabase.from("tenants").select("*").eq("id", tenant_id).single(),
        supabase.from("properties").select("*").eq("id", property_id).single(),
      ]);

      if (!tenant) throw new Error("Tenant not found");
      if (!property) throw new Error("Property not found");

      const country = property.country || "FR";
      const defaults = getLeaseDefaults(country);

      // Check for existing active/pending lease
      const { data: existingLease } = await supabase
        .from("leases")
        .select("id, status")
        .eq("tenant_id", tenant_id)
        .eq("property_id", property_id)
        .in("status", ["active", "pending_signature", "signed"])
        .maybeSingle();

      if (existingLease) {
        return new Response(JSON.stringify({
          success: true,
          lease_id: existingLease.id,
          status: existingLease.status,
          message: "Lease already exists",
          action: "existing",
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // Create lease in pending_signature status
      const startDate = new Date();
      const endDate = defaults.durationMonths > 0
        ? new Date(startDate.getTime() + defaults.durationMonths * 30 * 24 * 60 * 60 * 1000)
        : null;

      const rentAmount = tenant.rent_amount || override?.rent_amount || 0;
      const chargesAmount = tenant.charges_amount || override?.charges_amount || 0;
      const depositAmount = rentAmount * defaults.depositMonths;

      const { data: lease, error: leaseErr } = await supabase
        .from("leases")
        .insert({
          org_id: org_id || tenant.org_id,
          tenant_id,
          property_id,
          lease_type: override?.lease_type || defaults.leaseType,
          start_date: override?.start_date || startDate.toISOString().slice(0, 10),
          end_date: endDate ? endDate.toISOString().slice(0, 10) : null,
          rent_amount: rentAmount,
          charges_amount: chargesAmount,
          deposit_amount: depositAmount,
          status: "pending_signature",
          country,
          notice_period: defaults.noticePeriod,
          rent_schedule_generated: false,
        } as any)
        .select("*")
        .single();

      if (leaseErr) throw leaseErr;

      // Generate lease document
      const { data: ownerProfile } = await supabase
        .from("owner_profiles")
        .select("full_name, company_name, address, postal_code, city, email, phone")
        .eq("org_id", org_id || tenant.org_id)
        .maybeSingle();

      await supabase.from("documents").insert({
        org_id: org_id || tenant.org_id,
        user_id: property.user_id,
        doc_type: defaults.docType,
        title: `${defaults.docType} — ${tenant.name}`,
        country,
        status: "pending_signature",
        requires_signature: true,
        lease_id: lease.id,
        property_id,
        tenant_id,
        data_json: {
          tenant_name: tenant.name,
          tenant_email: tenant.email,
          tenant_phone: tenant.phone,
          property_label: property.label,
          property_address: property.address,
          property_city: property.city,
          property_postal_code: property.postal_code,
          property_surface: property.surface,
          property_rooms: property.rooms,
          property_furnished: property.furnished,
          owner_name: ownerProfile?.full_name || ownerProfile?.company_name || "",
          owner_address: ownerProfile?.address || "",
          owner_city: ownerProfile?.city || "",
          owner_postal_code: ownerProfile?.postal_code || "",
          rent_amount: rentAmount,
          charges_amount: chargesAmount,
          deposit_amount: depositAmount,
          start_date: lease.start_date,
          end_date: lease.end_date,
          lease_type: lease.lease_type,
          country,
        },
      });

      // Notify tenant for signature
      if (tenant.tenant_user_id) {
        await supabase.from("notifications").insert({
          user_id: tenant.tenant_user_id,
          org_id: org_id || tenant.org_id,
          type: "document",
          title: "📝 Lease ready for signature",
          message: `Your lease for ${property.label} is ready. Please review and sign.`,
          link: "/tenant/documents",
          metadata_json: {
            target_type: "lease",
            target_id: lease.id,
            country_code: country,
            org_id: org_id || tenant.org_id,
            target_url: "/tenant/documents",
          },
        });
      }

      // Notify landlord
      const { data: org } = await supabase
        .from("orgs").select("owner_user_id").eq("id", org_id || tenant.org_id).single();

      if (org?.owner_user_id) {
        await supabase.from("notifications").insert({
          user_id: org.owner_user_id,
          org_id: org_id || tenant.org_id,
          type: "document",
          title: "📝 Lease generated — awaiting signatures",
          message: `Lease for ${tenant.name} at ${property.label} created. Awaiting tenant & owner signatures before rent schedule is generated.`,
          link: `/dashboard/leases?record=${lease.id}`,
        });
      }

      // Audit
      await supabase.from("audit_logs").insert({
        user_id: null,
        org_id: org_id || tenant.org_id,
        action: "lease_generated",
        metadata_json: {
          lease_id: lease.id, tenant_id, property_id, country,
          status: "pending_signature",
          note: "Rent schedule will be generated only after both signatures",
        },
      });

      return new Response(JSON.stringify({
        success: true,
        lease_id: lease.id,
        action: "created",
        status: "pending_signature",
        message: "Lease generated — awaiting signatures before rent schedule",
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ═══════════════════════════════════════════
    // ACTION: generate_rent_schedule
    // ONLY works when lease status = "active"
    // Called automatically by DB trigger after both signatures
    // ═══════════════════════════════════════════
    if (action === "generate_rent_schedule") {
      const { data: lease, error: leaseErr } = await supabase
        .from("leases")
        .select("*")
        .eq("id", lease_id)
        .single();

      if (leaseErr || !lease) throw new Error("Lease not found");

      // CRITICAL: Only generate for active (fully signed) leases
      if ((lease as any).status !== "active") {
        return new Response(JSON.stringify({
          success: false,
          error: "lease_not_active",
          message: "Rent schedule can only be generated for fully signed (active) leases. Current status: " + (lease as any).status,
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 });
      }

      const startDate = new Date((lease as any).start_date);
      const endDate = (lease as any).end_date ? new Date((lease as any).end_date) : (() => {
        const d = new Date(startDate);
        d.setFullYear(d.getFullYear() + 1);
        return d;
      })();

      const rentCalls: any[] = [];
      const current = new Date(startDate);
      current.setDate(1);

      while (current <= endDate) {
        const month = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, "0")}`;

        const { data: existing } = await supabase
          .from("rent_calls")
          .select("id")
          .eq("tenant_id", (lease as any).tenant_id)
          .eq("month", month)
          .maybeSingle();

        if (!existing) {
          const dueDate = new Date(current);
          dueDate.setDate(override?.due_day || 1);

          rentCalls.push({
            org_id: (lease as any).org_id,
            tenant_id: (lease as any).tenant_id,
            property_id: (lease as any).property_id,
            month,
            rent_amount: (lease as any).rent_amount || 0,
            charges_amount: (lease as any).charges_amount || 0,
            total_amount: ((lease as any).rent_amount || 0) + ((lease as any).charges_amount || 0),
            paid: false,
            due_date: dueDate.toISOString().slice(0, 10),
          });
        }

        current.setMonth(current.getMonth() + 1);
      }

      if (rentCalls.length > 0) {
        const { error: insertErr } = await supabase.from("rent_calls").insert(rentCalls);
        if (insertErr) throw insertErr;
      }

      // Notify landlord
      const { data: org } = await supabase
        .from("orgs").select("owner_user_id").eq("id", (lease as any).org_id).single();

      if (org?.owner_user_id) {
        await supabase.from("notifications").insert({
          user_id: org.owner_user_id,
          org_id: (lease as any).org_id,
          type: "info",
          title: "📅 Rent schedule generated",
          message: `${rentCalls.length} monthly rent calls created after lease activation.`,
          link: `/dashboard/reminders?country=${(lease as any).country || ""}`,
        });
      }

      // Notify tenant
      const { data: tenantData } = await supabase
        .from("tenants").select("tenant_user_id").eq("id", (lease as any).tenant_id).single();

      if ((tenantData as any)?.tenant_user_id) {
        await supabase.from("notifications").insert({
          user_id: (tenantData as any).tenant_user_id,
          org_id: (lease as any).org_id,
          type: "info",
          title: "📅 Your rent schedule is ready",
          message: `${rentCalls.length} monthly rent notices have been set up for your lease.`,
          link: "/tenant/payments",
        });
      }

      // Audit
      await supabase.from("audit_logs").insert({
        user_id: null,
        org_id: (lease as any).org_id,
        action: "rent_schedule_generated",
        metadata_json: {
          lease_id: lease_id,
          months_generated: rentCalls.length,
          triggered_by: "lease_activation",
          start: startDate.toISOString().slice(0, 7),
          end: endDate.toISOString().slice(0, 7),
        },
      });

      return new Response(JSON.stringify({
        success: true,
        months_generated: rentCalls.length,
        message: `${rentCalls.length} rent calls generated after lease activation`,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("lease-workflow error:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
