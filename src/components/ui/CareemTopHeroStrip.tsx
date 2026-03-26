import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AddressSelectorSheet } from "@/components/address/AddressSelectorSheet";

type CareemTopHeroStripProps = {
  locationLabel?: string;
  subtitle?: string;
};

export function CareemTopHeroStrip({
  locationLabel = "Dubai, UAE",
  subtitle = "Fast delivery, rides, groceries and more",
}: CareemTopHeroStripProps) {
  const navigate = useNavigate();
  const [addressOpen, setAddressOpen] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button
          onClick={() => setAddressOpen(true)}
          className="min-w-0 text-left active:scale-[0.99] transition-transform"
        >
          <div className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">
            Delivering to
          </div>
          <div className="text-sm font-bold text-foreground truncate">{locationLabel}</div>
          <div className="text-[11px] text-muted-foreground">Tap to change address</div>
        </button>

        <button
          onClick={() => navigate("/search-results")}
          className="w-10 h-10 shrink-0 rounded-2xl bg-muted flex items-center justify-center active:scale-95 transition-transform"
          aria-label="Search"
        >
          🔎
        </button>
      </div>

      <div>
        <h1 className="text-xl font-bold text-foreground">Everything you need, in one app</h1>
        <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => navigate("/browse/food")}
          className="rounded-2xl bg-primary text-primary-foreground px-4 py-3 text-sm font-bold active:scale-[0.98] transition-transform"
        >
          Order Food
        </button>
        <button
          onClick={() => navigate("/browse/grocery")}
          className="rounded-2xl bg-muted px-4 py-3 text-sm font-bold text-foreground active:scale-[0.98] transition-transform"
        >
          Groceries
        </button>
      </div>

      <AddressSelectorSheet open={addressOpen} onOpenChange={setAddressOpen} />
    </div>
  );
}
