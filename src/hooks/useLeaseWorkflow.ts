/**
 * useLeaseWorkflow — Frontend hook for the automated lease pipeline.
 * MIGRATED: All DB ops via rental.repository + rental-data.repository.
 */
import * as rentalRepo from "@/repositories/rental.repository";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { platformBus } from "@/lib/shared/platform-bus";
import { supabase } from "@/integrations/supabase/client";

export type LeaseStatus = "draft" | "pending_signature" | "signed" | "active" | "archived" | "cancelled";
export type RentCallStatus = "pending" | "overdue" | "paid" | "partial" | "cancelled";
export type DocumentStatus = "draft" | "pending_signature" | "signed" | "generated" | "archived";

export function useLeaseWorkflow() {
  const { orgId } = useAuth();

  const generateLease = async (
    tenantId: string, propertyId: string,
    override?: { rent_amount?: number; charges_amount?: number; lease_type?: string; start_date?: string },
  ) => {
    try {
      const { data, error } = await supabase.functions.invoke("lease-workflow", {
        body: { action: "generate_lease", tenant_id: tenantId, property_id: propertyId, org_id: orgId, override },
      });
      if (error) throw error;
      if (data?.action === "existing") {
        toast.info("A lease already exists for this tenant");
      } else if (data?.success) {
        toast.success("Lease generated — awaiting signatures");
        platformBus.emit("pm:lease_created", { leaseId: data.lease_id, tenantId, propertyId }, "pm", { orgId });
      }
      return data;
    } catch (err: any) {
      console.error("Lease generation failed:", err);
      toast.error("Failed to generate lease: " + (err.message || "Unknown error"));
      return null;
    }
  };

  const recordTenantSignature = async (leaseId: string, signatureUrl?: string) => {
    try {
      const now = new Date().toISOString();
      const lease = await rentalRepo.updateLeaseSignature(leaseId, "tenant", now, signatureUrl);
      await rentalRepo.insertLeaseAuditLog(lease?.org_id || orgId, "tenant_signature_completed", { lease_id: leaseId, signed_at: now });
      toast.success("Signature recorded — awaiting owner signature");
      return lease;
    } catch (err: any) {
      toast.error("Signature failed: " + (err.message || "Unknown error"));
      return null;
    }
  };

  const recordOwnerSignature = async (leaseId: string, signatureUrl?: string) => {
    try {
      const now = new Date().toISOString();
      const current = await rentalRepo.fetchLeaseForSignature(leaseId);
      const tenantSigned = !!(current as any)?.tenant_signed_at;
      const newStatus: LeaseStatus = tenantSigned ? "active" : "signed";
      const lease = await rentalRepo.updateLeaseOwnerSignature(leaseId, now, newStatus, signatureUrl);
      await rentalRepo.insertLeaseAuditLog(
        (current as any)?.org_id || orgId,
        tenantSigned ? "lease_fully_signed_active" : "owner_signature_completed",
        { lease_id: leaseId, signed_at: now, new_status: newStatus },
      );
      if (tenantSigned) {
        toast.success("Both signatures complete — lease is now active. Rent schedule will be generated automatically.");
        platformBus.emit("pm:lease_activated", { leaseId }, "pm", { orgId: (current as any)?.org_id || orgId });
      } else {
        toast.success("Owner signature recorded — awaiting tenant signature");
      }
      return lease;
    } catch (err: any) {
      toast.error("Signature failed: " + (err.message || "Unknown error"));
      return null;
    }
  };

  const generateRentSchedule = async (leaseId: string, options?: { due_day?: number }) => {
    try {
      const { data, error } = await supabase.functions.invoke("lease-workflow", {
        body: { action: "generate_rent_schedule", lease_id: leaseId, override: options },
      });
      if (error) throw error;
      if (data?.error === "lease_not_active") {
        toast.error("Lease must be fully signed (active) before generating rent schedule");
        return null;
      }
      if (data?.success) toast.success(`${data.months_generated} monthly rent calls generated`);
      return data;
    } catch (err: any) {
      console.error("Rent schedule generation failed:", err);
      toast.error("Failed to generate rent schedule: " + (err.message || "Unknown error"));
      return null;
    }
  };

  return { generateLease, recordTenantSignature, recordOwnerSignature, generateRentSchedule };
}
