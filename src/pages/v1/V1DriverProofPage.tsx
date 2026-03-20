import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { V1RequireDriver } from "@/components/v1/V1RequireDriver";
import { V1AppShell } from "@/components/v1/V1AppShell";
import { submitMissionProof } from "@/lib/v1/v1DriverMissionCore";

function DriverProofBody({ driverUserId }: { driverUserId: string }) {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async () => {
    if (!orderId) return;

    setSubmitting(true);
    try {
      await submitMissionProof({
        orderId,
        driverUserId,
        notes,
      });
      toast.success("Proof submitted");
      navigate("/driver/missions");
    } catch (e: any) {
      toast.error(e.message || "Could not submit proof");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-4 space-y-4">
      <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-2xl bg-muted flex items-center justify-center">
        ←
      </button>

      <h1 className="text-lg font-bold text-foreground">Driver Proof</h1>

      <div className="rounded-[28px] border border-border/20 bg-card p-4 space-y-3">
        <p className="text-sm text-muted-foreground">Order #{orderId?.slice(0, 8)}</p>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={4}
          className="w-full rounded-2xl border border-border/20 bg-background px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
          placeholder="Delivery note"
        />
        <button onClick={onSubmit} disabled={submitting} className="w-full rounded-[24px] bg-primary text-primary-foreground px-4 py-3 font-bold disabled:opacity-50">
          {submitting ? "Submitting..." : "Submit Proof"}
        </button>
      </div>
    </div>
  );
}

export function V1DriverProofPage() {
  return (
    <V1AppShell>
      <V1RequireDriver>{(ctx) => <DriverProofBody driverUserId={ctx.driverUserId} />}</V1RequireDriver>
    </V1AppShell>
  );
}
