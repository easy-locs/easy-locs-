import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { createRidePackageMission } from "@/lib/v1/ridePackageFlow";

export default function V1RideSendPackagePage({ type }: { type: "ride" | "package" }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [pickup, setPickup] = useState("");
  const [dropoff, setDropoff] = useState("");
  const [priceEstimate, setPriceEstimate] = useState(type === "ride" ? "35" : "28");
  const [notes, setNotes] = useState("");

  const submit = async () => {
    if (!user?.id) {
      toast.error("Please sign in");
      return;
    }

    try {
      const mission = await createRidePackageMission({
        customerUserId: user.id,
        type,
        pickupLabel: pickup,
        dropoffLabel: dropoff,
        priceEstimate: Number(priceEstimate || 0),
        notes,
      });

      toast.success(`${type === "ride" ? "Ride" : "Package"} created`);
      navigate(`/tracking/${mission.id}`);
    } catch (e: any) {
      toast.error(e.message || "Could not create mission");
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-4 space-y-4">
      <h1 className="text-lg font-bold text-foreground">
        {type === "ride" ? "Ride" : "Send Package"}
      </h1>

      <div className="rounded-[28px] border border-border/20 bg-card p-4 space-y-3">
        <input value={pickup} onChange={(e) => setPickup(e.target.value)} className="w-full rounded-xl border border-border/20 bg-background px-3 py-2.5 text-sm" placeholder="Pickup" />
        <input value={dropoff} onChange={(e) => setDropoff(e.target.value)} className="w-full rounded-xl border border-border/20 bg-background px-3 py-2.5 text-sm" placeholder="Dropoff" />
        <input value={priceEstimate} onChange={(e) => setPriceEstimate(e.target.value)} className="w-full rounded-xl border border-border/20 bg-background px-3 py-2.5 text-sm" type="number" placeholder="Estimated price AED" />
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className="w-full rounded-xl border border-border/20 bg-background px-3 py-2.5 text-sm resize-none" placeholder="Notes" />
        <button onClick={submit} className="w-full rounded-2xl bg-primary text-primary-foreground px-4 py-3 text-sm font-bold">
          Create {type === "ride" ? "Ride" : "Package"}
        </button>
      </div>
    </div>
  );
}
