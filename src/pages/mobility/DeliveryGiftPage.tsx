/**
 * DeliveryGiftPage — Gift someone flow.
 * Select item/parcel → recipient → message → optional schedule → dispatch.
 */
import { useState } from "react";
import { ArrowLeft, Gift, MapPin, MessageSquare, Calendar } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { CanonicalAddressInput } from "@/components/address/CanonicalAddressInput";
import type { CanonicalPlace } from "@/lib/address/canonical-place";

export default function DeliveryGiftPage() {
  const navigate = useNavigate();
  const [recipientAddress, setRecipientAddress] = useState<CanonicalPlace | null>(null);
  const [recipientName, setRecipientName] = useState("");
  const [recipientPhone, setRecipientPhone] = useState("");
  const [giftMessage, setGiftMessage] = useState("");
  const [anonymous, setAnonymous] = useState(false);
  const [giftDescription, setGiftDescription] = useState("");

  return (
    <div className="min-h-[100dvh] bg-background">
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-md border-b border-border/40 px-4 py-3">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/mobility/delivery")} className="p-1.5 rounded-xl hover:bg-muted/60">
            <ArrowLeft className="h-5 w-5 text-foreground" />
          </button>
          <div>
            <h1 className="text-lg font-bold text-foreground">Gift Someone</h1>
            <p className="text-xs text-muted-foreground">Send a surprise with ❤️</p>
          </div>
        </div>
      </div>

      <div className="px-4 py-4 space-y-4">
        <div className="text-center py-4">
          <Gift className="h-10 w-10 text-primary mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Describe your gift or order from a shop</p>
        </div>

        <div>
          <p className="text-xs font-semibold text-muted-foreground mb-1.5">What are you gifting?</p>
          <textarea
            value={giftDescription}
            onChange={(e) => setGiftDescription(e.target.value)}
            placeholder="Flowers, cake, perfume, custom item..."
            className="w-full p-3 rounded-xl border border-border/30 bg-card text-sm text-foreground placeholder:text-muted-foreground resize-none h-20 focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>

        <div>
          <p className="text-xs font-semibold text-muted-foreground mb-1.5 flex items-center gap-1">
            <MapPin className="h-3 w-3" /> Deliver to
          </p>
          <CanonicalAddressInput
            value={recipientAddress}
            onChange={setRecipientAddress}
            placeholder="Recipient's address"
            contextType="parcel_dropoff"
            allowSavedPlaces
          />
        </div>

        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground">Recipient</p>
          <input value={recipientName} onChange={(e) => setRecipientName(e.target.value)} placeholder="Recipient name"
            className="w-full px-3 py-2.5 rounded-xl border border-border/30 bg-card text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
          <input value={recipientPhone} onChange={(e) => setRecipientPhone(e.target.value)} placeholder="Recipient phone"
            className="w-full px-3 py-2.5 rounded-xl border border-border/30 bg-card text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
        </div>

        <div>
          <p className="text-xs font-semibold text-muted-foreground mb-1.5 flex items-center gap-1">
            <MessageSquare className="h-3 w-3" /> Gift message
          </p>
          <textarea
            value={giftMessage}
            onChange={(e) => setGiftMessage(e.target.value)}
            placeholder="Add a personal message..."
            className="w-full p-3 rounded-xl border border-border/30 bg-card text-sm text-foreground placeholder:text-muted-foreground resize-none h-20 focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>

        <button
          onClick={() => setAnonymous(!anonymous)}
          className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
            anonymous ? "border-primary bg-primary/10 text-primary" : "border-border/30 text-muted-foreground"
          }`}
        >
          🎭 Send anonymously
        </button>

        <button
          disabled={!recipientAddress || !recipientName || !giftDescription}
          className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm disabled:opacity-40 transition-all active:scale-[0.98]"
        >
          Send Gift
        </button>
      </div>
    </div>
  );
}
