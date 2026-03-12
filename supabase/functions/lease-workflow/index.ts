/**
 * lease-workflow — Automated lease lifecycle pipeline.
 * 
 * Triggered when a tenant invitation is accepted or manually via API.
 * 
 * Pipeline:
 * 1. Tenant invited → tenant account created (handled by existing accept_tenant_invitation)
 * 2. Lease auto-generated from property + tenant data + country templates
 * 3. Notification sent for e-signature
 * 4. After signature → rent schedule auto-generated
 * 
 * Supports: generate_lease, generate_rent_schedule actions.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Default lease types by country
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

    if (action === "generate_lease") {
      // ── Step 1: Fetch tenant + property data ──
      const [{ data: tenant }, { data: property }] = await Promise.all([
        supabase.from("tenants").select("*").eq("id", tenant_id).single(),
        supabase.from("properties").select("*").eq("id", property_id).single(),
      ]);

      if (!tenant) throw new Error("Tenant not found");
      if (!property) throw new Error("Property not found");

      const country = property.country || "FR";
      const defaults = getLeaseDefaults(country);

      // Check if lease already exists for this tenant+property
      const { data: existingLease } = await supabase
        .from("leases")
        .select("id")
        .eq("tenant_id", tenant_id)
        .eq("property_id", property_id)
        .eq("status", "active")
        .maybeSingle();

      if (existingLease) {
        return new Response(JSON.stringify({ 
          success: true, 
          lease_id: existingLease.id, 
          message: "Lease already exists",
          action: "existing" 
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // ── Step 2: Create lease ──
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
          tenant_id: tenant_id,
          property_id: property_id,
          lease_type: override?.lease_type || defaults.leaseType,
          start_date: override?.start_date || startDate.toISOString().slice(0, 10),
          end_date: endDate ? endDate.toISOString().slice(0, 10) : null,
          rent_amount: rentAmount,
          charges_amount: chargesAmount,
          deposit_amount: depositAmount,
          status: "pending_signature",
          country: country,
          notice_period: defaults.noticePeriod,
        } as any)
        .select("*")
        .single();

      if (leaseErr) throw leaseErr;

      // ── Step 3: Generate lease document ──
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
        country: country,
        status: "pending_signature",
        requires_signature: true,
        lease_id: lease.id,
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
          country: country,
        },
      });

      // ── Step 4: Notify tenant for signature ──
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
        .from("orgs")
        .select("owner_user_id")
        .eq("id", org_id || tenant.org_id)
        .single();

      if (org?.owner_user_id) {
        await supabase.from("notifications").insert({
          user_id: org.owner_user_id,
          org_id: org_id || tenant.org_id,
          type: "document",
          title: "📝 Lease generated",
          message: `Lease for ${tenant.name} at ${property.label} has been auto-generated and sent for signature.`,
          link: `/dashboard/leases?record=${lease.id}`,
        });
      }

      // Audit
      await supabase.from("audit_logs").insert({
        user_id: null,
        org_id: org_id || tenant.org_id,
        action: "lease_auto_generated",
        metadata_json: {
          lease_id: lease.id,
          tenant_id: tenant_id,
          property_id: property_id,
          country: country,
        },
      });

      return new Response(JSON.stringify({ 
        success: true, 
        lease_id: lease.id, 
        action: "created",
        message: "Lease generated and sent for signature" 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "generate_rent_schedule") {
      // ── Generate monthly rent calls for the lease period ──
      const { data: lease, error: leaseErr } = await supabase
        .from("leases")
        .select("*")
        .eq("id", lease_id)
        .single();

      if (leaseErr || !lease) throw new Error("Lease not found");

      const startDate = new Date(lease.start_date);
      const endDate = lease.end_date ? new Date(lease.end_date) : (() => {
        const d = new Date(startDate);
        d.setFullYear(d.getFullYear() + 1);
        return d;
      })();

      // Generate rent calls for each month
      const rentCalls: any[] = [];
      const current = new Date(startDate);
      current.setDate(1); // Normalize to 1st of month

      while (current <= endDate) {
        const month = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, "0")}`;
        
        // Check if this rent call already exists
        const { data: existing } = await supabase
          .from("rent_calls")
          .select("id")
          .eq("tenant_id", lease.tenant_id)
          .eq("month", month)
          .maybeSingle();

        if (!existing) {
          const dueDate = new Date(current);
          dueDate.setDate(override?.due_day || 1);

          rentCalls.push({
            org_id: lease.org_id,
            tenant_id: lease.tenant_id,
            property_id: lease.property_id,
            month,
            rent_amount: lease.rent_amount || 0,
            charges_amount: lease.charges_amount || 0,
            total_amount: (lease.rent_amount || 0) + (lease.charges_amount || 0),
            paid: false,
            due_date: dueDate.toISOString().slice(0, 10),
          });
        }

        current.setMonth(current.getMonth() + 1);
      }

      if (rentCalls.length > 0) {
        const { error: insertErr } = await supabase
          .from("rent_calls")
          .insert(rentCalls);
        if (insertErr) throw insertErr;
      }

      // Notify landlord
      const { data: org } = await supabase
        .from("orgs")
        .select("owner_user_id")
        .eq("id", lease.org_id)
        .single();

      if (org?.owner_user_id) {
        await supabase.from("notifications").insert({
          user_id: org.owner_user_id,
          org_id: lease.org_id,
          type: "info",
          title: "📅 Rent schedule generated",
          message: `${rentCalls.length} monthly rent calls created for the lease period.`,
          link: `/dashboard/reminders?country=${lease.country || ""}`,
        });
      }

      // Audit
      await supabase.from("audit_logs").insert({
        user_id: null,
        org_id: lease.org_id,
        action: "rent_schedule_generated",
        metadata_json: {
          lease_id: lease_id,
          months_generated: rentCalls.length,
          start: startDate.toISOString().slice(0, 7),
          end: endDate.toISOString().slice(0, 7),
        },
      });

      return new Response(JSON.stringify({ 
        success: true, 
        months_generated: rentCalls.length,
        message: `${rentCalls.length} rent calls generated` 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action. Use: generate_lease, generate_rent_schedule" }), {
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
