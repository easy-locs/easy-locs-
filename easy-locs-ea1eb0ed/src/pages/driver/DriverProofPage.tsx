import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import * as repo from "@/repositories/mobility.repository";
import { useAuth } from "@/contexts/AuthContext";
import { platformBus } from "@/lib/shared/platform-bus";
import { ArrowLeft, Camera, CheckCircle } from "lucide-react";
import { toast } from "sonner";

export default function DriverProofPage() {
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
    } catch (err: any) { toast.error(err.message || "Could not submit proof"); }
    finally { setSubmitting(false); }
  };

  if (submitted) {
    return (
      <div className="app-mobile-page flex items-center justify-center bg-background p-4">
        <div className="text-center space-y-4">
          <CheckCircle className="h-16 w-16 mx-auto" style={{ color: "hsl(142 70% 45%)" }} />
          <h2 className="text-xl font-bold text-foreground">Proof Submitted</h2>
          <p className="text-muted-foreground text-sm">Delivery confirmed successfully</p>
          <button onClick={() => navigate("/driver/missions")} className="mt-4 rounded-xl bg-primary text-primary-foreground px-6 py-2.5 text-sm font-bold">
            Back to Missions
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="app-mobile-page flex flex-col bg-background">
      <header className="flex items-center gap-3 px-4 pt-4 pb-3">
        <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-xl flex items-center justify-center bg-muted active:scale-95 transition-transform">
          <ArrowLeft className="w-4.5 h-4.5" />
        </button>
        <div>
          <h1 className="text-lg font-bold text-foreground">Delivery Proof</h1>
          <p className="text-xs text-muted-foreground">{orderId ? `Order #${orderId.slice(0, 8)}` : ""}</p>
        </div>
      </header>
      <div className="flex-1 px-4 pb-24 space-y-4">
        <div className="space-y-3">
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1 block">Recipient name</label>
            <input type="text" value={recipientName} onChange={(e) => setRecipientName(e.target.value)}
              className="w-full rounded-xl border border-border/20 bg-background px-3 py-2.5 text-sm text-foreground" placeholder="Who received the order?" />
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1 block">Driver note</label>
            <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3}
              className="w-full rounded-xl border border-border/20 bg-background px-3 py-2.5 text-sm text-foreground resize-none" placeholder="Add a note..." />
          </div>
        </div>
        <div className="rounded-xl bg-muted p-3 flex items-center gap-2">
          <Camera className="w-4 h-4 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">Photo upload, GPS & signature can be connected later.</span>
        </div>
        <p className="text-[11px] text-muted-foreground">Timestamp: {new Date().toLocaleString()}</p>
        <button onClick={submitProof} disabled={submitting}
          className="w-full rounded-2xl bg-primary text-primary-foreground px-4 py-3 text-sm font-bold disabled:opacity-50 active:scale-[0.97] transition-transform">
          {submitting ? "Submitting..." : "Submit Proof"}
        </button>
      </div>
    </div>
  );
}
