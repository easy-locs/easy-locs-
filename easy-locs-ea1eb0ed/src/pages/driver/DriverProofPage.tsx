import { useState } from "react";
import SubPageShell from "@/components/layout/SubPageShell";
import { useNavigate, useParams } from "react-router-dom";
import * as repo from "@/repositories/mobility.repository";
import { useAuth } from "@/contexts/AuthContext";
import { platformBus } from "@/lib/shared/platform-bus";
import { Camera, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { useUiEngine } from "@/hooks/useUiEngine";

export default function DriverProofPage() {
  useUiEngine("driver-driverproofpage");
  const navigate = useNavigate();
  const { orderId } = useParams();
  const { user } = useAuth();

  const [recipientName, setRecipientName] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const submitProof = async () => {
    if (!orderId) return;
    setSubmitting(true);
    try {
      await repo.insertDeliveryProof({
        order_id: orderId, driver_user_id: user?.id ?? null,
        notes: note || null, proof_type: "photo", photo_url: null, geo_lat: null, geo_lng: null,
      });
      platformBus.emit("MISSION_COMPLETED", { orderId, driverId: user?.id ?? "" }, "system");
      setSubmitted(true);
      toast.success("Delivery proof submitted");
    } catch (err: any) { toast.error("Could not submit proof"); }
    finally { setSubmitting(false); }
  };

  if (submitted) {
    return (
      <SubPageShell title="Delivery Proof" onBack={() => navigate("/driver/missions")} noContentPad>
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="text-center space-y-4">
            <CheckCircle className="h-16 w-16 mx-auto" style={{ color: "hsl(142 70% 45%)" }} />
            <h2 className="text-xl font-bold text-foreground">Proof Submitted</h2>
            <p className="text-muted-foreground text-sm">Delivery confirmed successfully</p>
            <button onClick={() => navigate("/driver/missions")} className="mt-4 rounded-xl bg-primary text-primary-foreground px-6 py-2.5 text-sm font-bold">
              Back to Missions
            </button>
          </div>
        </div>
      </SubPageShell>
    );
  }

  return (
    <SubPageShell
      title="Delivery Proof"
      onBack={() => navigate("/driver/missions")}
      contentClassName="space-y-4"
    >
      <div className="space-y-3">
        <div>
          <label className="text-[0.625rem] font-bold uppercase tracking-wider text-muted-foreground mb-1 block">Recipient name</label>
          <input type="text" value={recipientName} onChange={(e) => setRecipientName(e.target.value)}
            className="w-full rounded-xl border border-border/20 bg-background px-3 py-2.5 text-sm text-foreground" placeholder="Who received the order?" />
        </div>
        <div>
          <label className="text-[0.625rem] font-bold uppercase tracking-wider text-muted-foreground mb-1 block">Driver note</label>
          <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3}
            className="w-full rounded-xl border border-border/20 bg-background px-3 py-2.5 text-sm text-foreground resize-none" placeholder="Add a note..." />
        </div>
      </div>
      <div className="rounded-xl bg-muted p-3 flex items-center gap-2">
        <Camera className="w-4 h-4 text-muted-foreground" />
        <span className="text-xs text-muted-foreground">Photo upload, GPS & signature can be connected later.</span>
      </div>
      <p className="text-[0.6875rem] text-muted-foreground">Timestamp: {new Date().toLocaleString()}</p>
      <button onClick={submitProof} disabled={submitting}
        className="w-full rounded-2xl bg-primary text-primary-foreground px-4 py-3 text-sm font-bold disabled:opacity-50 active:scale-[0.97] transition-transform">
        {submitting ? "Submitting..." : "Submit Proof"}
      </button>
    </SubPageShell>
  );
}
