/**
 * useLeaseWorkflow — Frontend hook for the automated lease pipeline.
 * 
 * Provides functions to:
 * - Generate a lease automatically after tenant invitation acceptance
 * - Generate rent schedule after lease is signed
 * - Trigger the full pipeline
 */

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export function useLeaseWorkflow() {
  const { orgId } = useAuth();

  /** Generate a lease for a tenant+property pair */
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
        toast.success("Lease generated and sent for signature");
      }

      return data;
    } catch (err: any) {
      console.error("Lease generation failed:", err);
      toast.error("Failed to generate lease: " + (err.message || "Unknown error"));
      return null;
    }
  };

  /** Generate rent schedule for a signed lease */
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

  /** Full pipeline: generate lease → (after signing) → generate rent schedule */
  const runFullPipeline = async (
    tenantId: string,
    propertyId: string,
    override?: {
      rent_amount?: number;
      charges_amount?: number;
      lease_type?: string;
      start_date?: string;
      due_day?: number;
    },
  ) => {
    const leaseResult = await generateLease(tenantId, propertyId, override);
    if (!leaseResult?.lease_id) return null;

    // If lease already exists or was just created, generate rent schedule
    if (leaseResult.action === "existing" || leaseResult.action === "created") {
      const scheduleResult = await generateRentSchedule(leaseResult.lease_id, {
        due_day: override?.due_day,
      });
      return { lease: leaseResult, schedule: scheduleResult };
    }

    return { lease: leaseResult, schedule: null };
  };

  return { generateLease, generateRentSchedule, runFullPipeline };
}
