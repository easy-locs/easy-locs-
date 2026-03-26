import { useState } from "react";
import { useParams } from "react-router-dom";
import { submitDeliveryProof } from "@/lib/delivery/delivery-proof";
import { useAuth } from "@/contexts/AuthContext";
import { useGeoStore } from "@/lib/geo/geo-store";
import { toast } from "sonner";
import { Camera, MapPin, CheckCircle } from "lucide-react";

export default function DeliveryProofPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const { user } = useAuth();
  const [photoUrl, setPhotoUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const point = useGeoStore((s) => s.point);

  const handleSubmit = async () => {
    if (!orderId || !user) return;
    setLoading(true);
    try {
      await submitDeliveryProof({
        orderId,
        driverUserId: user.id,
        proofType: "photo",
        photoUrl: photoUrl || undefined,
        geoLat: point?.lat,
        geoLng: point?.lng,
        notes: notes || undefined,
      });
      setSubmitted(true);
      toast.success("Delivery proof submitted");
    } catch (err: any) {
      toast.error(err.message || "Failed to submit proof");
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="app-mobile-page flex items-center justify-center bg-background p-4">
        <div className="text-center space-y-4">
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
          <h2 className="text-xl font-bold text-foreground">Proof Submitted</h2>
          <p className="text-muted-foreground">Delivery confirmed successfully</p>
        </div>
      </div>
    );
  }

  return (
    <div className="app-mobile-page bg-background p-4">
      <div className="max-w-md mx-auto space-y-6">
        <div className="text-center space-y-2">
          <Camera className="h-12 w-12 text-primary mx-auto" />
          <h1 className="text-2xl font-bold text-foreground">Delivery Proof</h1>
          <p className="text-sm text-muted-foreground">
            Confirm delivery for order {orderId?.slice(0, 8)}…
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-foreground">Photo URL</label>
            <input
              type="text"
              value={photoUrl}
              onChange={(e) => setPhotoUrl(e.target.value)}
              placeholder="Paste delivery photo URL"
              className="w-full mt-1 border border-border rounded-xl px-3 py-2 bg-background text-foreground"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-foreground">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional delivery notes"
              className="w-full mt-1 border border-border rounded-xl px-3 py-2 bg-background text-foreground"
              rows={3}
            />
          </div>

          {point && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4" />
              <span>
                {point.lat.toFixed(5)}, {point.lng.toFixed(5)}
              </span>
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full bg-primary text-primary-foreground py-3 rounded-xl font-medium disabled:opacity-50"
          >
            {loading ? "Submitting…" : "Confirm Delivery"}
          </button>
        </div>
      </div>
    </div>
  );
}
