/**
 * useLeaseWorkflow — Frontend hook for the automated lease pipeline.
 * 
 * CRITICAL LIFECYCLE:
 * 1. Property created
 * 2. Tenant invited → account created
 * 3. Lease generated (status: draft → pending_signature)
 * 4. Tenant signs (tenant_signed_at set)
 * 5. Owner signs (owner_signed_at set)
 * 6. Lease status → "active" 
 * 7. DB trigger auto-generates rent schedule (only after BOTH signatures)
 * 8. Rent notices, payments, receipts, accounting all enabled
 * 
 * The rent schedule is NEVER generated before signature completion.
 */

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { platformBus } from "@/lib/shared/platform-bus";

/** Normalized lifecycle statuses */
export type LeaseStatus = "draft" | "pending_signature" | "signed" | "active" | "archived" | "cancelled";
export type RentCallStatus = "pending" | "overdue" | "paid" | "partial" | "cancelled";
export type DocumentStatus = "draft" | "pending_signature" | "signed" | "generated" | "archived";

export function useLeaseWorkflow() {
  const { orgId } = useAuth();

  /** Generate a lease for a tenant+property pair — status starts as pending_signature */
  const generateLease = async (
    tenantId: string,
    propertyId: string,
    override?: {
      rent_amount?: number;
      charges_amount?: number;
      lease_type?: string;
      start_date?: string;
    },
  ) => {
    try {
      const { data, error } = await supabase.functions.invoke("lease-workflow", {
        body: {
          action: "generate_lease",
          tenant_id: tenantId,
          property_id: propertyId,
          org_id: orgId,
          override,
        },
      });

      if (error) throw error;

      if (data?.action === "existing") {
        toast.info("A lease already exists for this tenant");
      } else if (data?.success) {
        toast.success("Lease generated — awaiting signatures");
        platformBus.emit("pm:lease_created", { leaseId: data.lease_id, tenantId: tenantId, propertyId: propertyId }, "pm", { orgId });
      }

      return data;
    } catch (err: any) {
      console.error("Lease generation failed:", err);
      toast.error("Failed to generate lease: " + (err.message || "Unknown error"));
      return null;
    }
  };

  /** Record tenant signature on a lease */
  const recordTenantSignature = async (leaseId: string, signatureUrl?: string) => {
    try {
      const now = new Date().toISOString();
      
      // Update lease with tenant signature
      const { data: lease, error } = await supabase
        .from("leases")
        .update({
          tenant_signed_at: now,
          status: "signed", // Partially signed — tenant done
        } as any)
        .eq("id", leaseId)
        .select("*")
        .single();

      if (error) throw error;

      // Update associated document
      if (signatureUrl) {
        await supabase
          .from("documents")
          .update({
            tenant_signature_url: signatureUrl,
            signed_by_tenant_at: now,
          })
          .eq("lease_id", leaseId);
      }

      // Audit
      await supabase.from("audit_logs").insert({
        user_id: null,
        org_id: (lease as any)?.org_id || orgId,
        action: "tenant_signature_completed",
        metadata_json: { lease_id: leaseId, signed_at: now },
      });

      toast.success("Signature recorded — awaiting owner signature");
      return lease;
    } catch (err: any) {
      toast.error("Signature failed: " + (err.message || "Unknown error"));
      return null;
    }
  };

  /** Record owner signature — if tenant already signed, lease becomes "active" triggering rent schedule */
  const recordOwnerSignature = async (leaseId: string, signatureUrl?: string) => {
    try {
      const now = new Date().toISOString();

      // Check if tenant has already signed
      const { data: current } = await supabase
        .from("leases")
        .select("tenant_signed_at, org_id")
        .eq("id", leaseId)
        .single();

      const tenantSigned = !!(current as any)?.tenant_signed_at;

      // Update lease — if both signed, status → active (triggers rent schedule via DB trigger)
      const newStatus: LeaseStatus = tenantSigned ? "active" : "signed";

      const { data: lease, error } = await supabase
        .from("leases")
        .update({
          owner_signed_at: now,
          status: newStatus,
        } as any)
        .eq("id", leaseId)
        .select("*")
        .single();

      if (error) throw error;

      // Update associated document
      if (signatureUrl) {
        await supabase
          .from("documents")
          .update({
            owner_signature_url: signatureUrl,
            signed_by_owner_at: now,
            status: tenantSigned ? "signed" : "pending_signature",
          })
          .eq("lease_id", leaseId);
      }

      // Audit
      await supabase.from("audit_logs").insert({
        user_id: null,
        org_id: (current as any)?.org_id || orgId,
        action: tenantSigned ? "lease_fully_signed_active" : "owner_signature_completed",
        metadata_json: { lease_id: leaseId, signed_at: now, new_status: newStatus },
      });

      if (tenantSigned) {
        toast.success("Both signatures complete — lease is now active. Rent schedule will be generated automatically.");
      } else {
        toast.success("Owner signature recorded — awaiting tenant signature");
      }

      return lease;
    } catch (err: any) {
      toast.error("Signature failed: " + (err.message || "Unknown error"));
      return null;
    }
  };

  /** Manual rent schedule generation (admin override) — only works on active leases */
  const generateRentSchedule = async (
    leaseId: string,
    options?: { due_day?: number },
  ) => {
    try {
      const { data, error } = await supabase.functions.invoke("lease-workflow", {
        body: {
          action: "generate_rent_schedule",
          lease_id: leaseId,
          override: options,
        },
      });

      if (error) throw error;

      if (data?.error === "lease_not_active") {
        toast.error("Lease must be fully signed (active) before generating rent schedule");
        return null;
      }

      if (data?.success) {
        toast.success(`${data.months_generated} monthly rent calls generated`);
      }

      return data;
    } catch (err: any) {
      console.error("Rent schedule generation failed:", err);
      toast.error("Failed to generate rent schedule: " + (err.message || "Unknown error"));
      return null;
    }
  };

  return { 
    generateLease, 
    recordTenantSignature,
    recordOwnerSignature,
    generateRentSchedule,
  };
}
