import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

type AddressItem = {
  id: string;
  label: string;
  line1: string;
  city: string;
};

const MOCK_ADDRESSES: AddressItem[] = [
  { id: "1", label: "Home", line1: "Al Barsha 1", city: "Dubai" },
  { id: "2", label: "Office", line1: "Business Bay", city: "Dubai" },
  { id: "3", label: "Other", line1: "Dubai Marina", city: "Dubai" },
];

export default function CustomerAddressSelectorPage() {
  const navigate = useNavigate();
  const [selectedId, setSelectedId] = useState("1");

  const save = () => {
    toast.success("Delivery address selected");
    navigate("/checkout");
  };

  return (
    <div className="min-h-[100dvh] bg-background pb-24">
      <div className="flex items-center gap-3 px-4 pt-6 pb-4">
        <button
          onClick={() => navigate("/checkout")}
          className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center"
        >
          ←
        </button>
        <div>
          <h1 className="text-lg font-bold text-foreground">Select Address</h1>
          <p className="text-xs text-muted-foreground">Choose delivery destination</p>
        </div>
      </div>

      <div className="px-4 space-y-3">
        {MOCK_ADDRESSES.map((row) => (
          <button
            key={row.id}
            onClick={() => setSelectedId(row.id)}
            className={`w-full rounded-2xl border p-4 text-left transition-transform active:scale-[0.99] ${
              selectedId === row.id
                ? "border-primary bg-primary/5"
                : "border-border/20 bg-card"
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-foreground">{row.label}</p>
                <p className="text-xs text-muted-foreground">{row.line1}</p>
                <p className="text-[11px] text-muted-foreground/70">{row.city}</p>
              </div>
              <div
                className={`w-5 h-5 rounded-full border-2 ${
                  selectedId === row.id ? "border-primary bg-primary" : "border-border"
                }`}
              />
            </div>
          </button>
        ))}
      </div>

      <button
        onClick={save}
        className="mx-4 mt-4 w-[calc(100%-2rem)] rounded-2xl bg-primary text-primary-foreground px-4 py-3 text-sm font-bold"
      >
        Confirm Address
      </button>
    </div>
  );
}
