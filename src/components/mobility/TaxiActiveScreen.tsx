/**
 * TaxiActiveScreen — Step 3: live ride tracking.
 * Shows the active ride card(s) for the customer.
 */
import React from "react";
import { useTaxiFlowStore } from "@/stores/taxiFlowStore";
import { useCustomerMobilityStore, type MobilityJob } from "@/stores/customerMobilityStore";
import { CustomerJobCard } from "@/components/rides/CustomerJobCard";
import { PageEmptyState } from "@/components/ui/PageEmptyState";
import { ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";

export function TaxiActiveScreen() {
  const { activeJobId, setStep, reset } = useTaxiFlowStore();
  const jobs = useCustomerMobilityStore(s => s.jobs);

  const activeJobs = jobs.filter(j =>
    j.job_type === "taxi" &&
    !["completed", "cancelled", "failed_no_rider", "expired"].includes(j.status)
  );

  // If the job we requested completed/cancelled, allow going back
  const currentJob = activeJobs.find(j => j.id === activeJobId);

  return (
    <motion.div
      key="taxi-active"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      className="space-y-4"
    >
      <button
        type="button"
        onClick={() => { reset(); }}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" /> Book another ride
      </button>

      {activeJobs.length === 0 ? (
        <PageEmptyState
          icon={<span>🚕</span>}
          title="No active rides"
          description="Your ride may have completed or been cancelled"
        />
      ) : (
        activeJobs.map(j => <CustomerJobCard key={j.id} job={j} />)
      )}
    </motion.div>
  );
}
