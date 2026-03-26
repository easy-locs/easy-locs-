/**
 * DeliveryParcelPage — Send parcel / document flow.
 * Structured logistics: type, size, weight, fragile, signature, OTP.
 */
import { useState } from "react";
import { ArrowLeft, MapPin, Navigation, Package, Shield } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { CanonicalAddressInput } from "@/components/address/CanonicalAddressInput";
import type { CanonicalPlace } from "@/lib/address/canonical-place";

const PARCEL_TYPES = [
  { id: "documents", label: "📄 Documents", size: "xs_envelope" },
  { id: "small_package", label: "📦 Small Package", size: "small" },
  { id: "medium_package", label: "📦 Medium Package", size: "medium" },
  { id: "electronics", label: "💻 Electronics", size: "medium" },
  { id: "fragile", label: "🥂 Fragile Item", size: "medium" },
  { id: "large", label: "🏗️ Large / Bulky", size: "large" },
];

export default function DeliveryParcelPage() {
  const navigate = useNavigate();
  const [pickup, setPickup] = useState<CanonicalPlace | null>(null);
  const [dropoff, setDropoff] = useState<CanonicalPlace | null>(null);
  const [parcelType, setParcelType] = useState<string | null>(null);
  const [recipientName, setRecipientName] = useState("");
  const [recipientPhone, setRecipientPhone] = useState("");
  const [requireSignature, setRequireSignature] = useState(false);
  const [requireOTP, setRequireOTP] = useState(false);
  const [isFragile, setIsFragile] = useState(false);
  const [declaredValue, setDeclaredValue] = useState("");
  const [instructions, setInstructions] = useState("");

  return (
    <div className="min-h-[100dvh] bg-background">
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-md border-b border-border/40 px-4 py-3">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/mobility/delivery")} className="p-1.5 rounded-xl hover:bg-muted/60">
            <ArrowLeft className="h-5 w-5 text-foreground" />
          </button>
          <div>
            <h1 className="text-lg font-bold text-foreground">Send Parcel</h1>
            <p className="text-xs text-muted-foreground">Documents · Packages · Fragile items</p>
          </div>
        </div>
      </div>

      <div className="px-4 py-4 space-y-4">
        {/* Parcel type */}
        <div>
          <p className="text-xs font-semibold text-muted-foreground mb-2">What are you sending?</p>
          <div className="grid grid-cols-2 gap-2">
            {PARCEL_TYPES.map(t => (
              <button
                key={t.id}
                onClick={() => setParcelType(t.id)}
                className={`p-3 rounded-xl border text-left text-sm transition-all ${
                  parcelType === t.id
                    ? "border-primary bg-primary/5 text-foreground font-semibold"
                    : "border-border/30 bg-card text-muted-foreground"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Addresses */}
        <div className="space-y-3">
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-1.5 flex items-center gap-1">
              <MapPin className="h-3 w-3" /> Pickup
            </p>
            <CanonicalAddressInput value={pickup} onChange={setPickup} placeholder="Pickup address" contextType="parcel_pickup" allowSavedPlaces />
          </div>
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-1.5 flex items-center gap-1">
              <Navigation className="h-3 w-3" /> Dropoff
            </p>
            <CanonicalAddressInput value={dropoff} onChange={setDropoff} placeholder="Delivery address" contextType="parcel_dropoff" allowSavedPlaces />
          </div>
        </div>

        {/* Recipient */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground">Recipient</p>
          <input
            value={recipientName}
            onChange={(e) => setRecipientName(e.target.value)}
            placeholder="Recipient name"
            className="w-full px-3 py-2.5 rounded-xl border border-border/30 bg-card text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          <input
            value={recipientPhone}
            onChange={(e) => setRecipientPhone(e.target.value)}
            placeholder="Recipient phone"
            className="w-full px-3 py-2.5 rounded-xl border border-border/30 bg-card text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>

        {/* Options */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1"><Shield className="h-3 w-3" /> Delivery options</p>
          <div className="flex flex-wrap gap-2">
            {[
              { label: "Signature required", state: requireSignature, set: setRequireSignature },
              { label: "OTP verification", state: requireOTP, set: setRequireOTP },
              { label: "Fragile", state: isFragile, set: setIsFragile },
            ].map(opt => (
              <button
                key={opt.label}
                onClick={() => opt.set(!opt.state)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                  opt.state ? "border-primary bg-primary/10 text-primary" : "border-border/30 text-muted-foreground"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <input
            value={declaredValue}
            onChange={(e) => setDeclaredValue(e.target.value)}
            placeholder="Declared value (optional)"
            type="number"
            className="w-full px-3 py-2.5 rounded-xl border border-border/30 bg-card text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          <textarea
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            placeholder="Special instructions..."
            className="w-full p-3 rounded-xl border border-border/30 bg-card text-sm text-foreground placeholder:text-muted-foreground resize-none h-20 focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>

        <button
          disabled={!parcelType || !pickup || !dropoff || !recipientName}
          className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm disabled:opacity-40 transition-all active:scale-[0.98]"
        >
          Get Price Estimate
        </button>
      </div>
    </div>
  );
}
