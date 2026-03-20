import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

type Address = { id: string; label: string; line1: string; city: string };

export default function CustomerAddressBookPageV2() {
  const navigate = useNavigate();
  const [addresses, setAddresses] = useState<Address[]>([
    { id: "1", label: "Home", line1: "Al Barsha 1", city: "Dubai" },
    { id: "2", label: "Office", line1: "Business Bay", city: "Dubai" },
  ]);

  const remove = (id: string) => {
    setAddresses((p) => p.filter((a) => a.id !== id));
    toast.success("Address removed");
  };

  return (
    <div className="max-w-md mx-auto px-4 py-4 space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate("/me")} className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center">←</button>
        <div>
          <h1 className="text-lg font-bold text-foreground">Address Book</h1>
          <p className="text-xs text-muted-foreground">Manage saved addresses</p>
        </div>
      </div>

      <div className="space-y-3">
        {addresses.map((a) => (
          <div key={a.id} className="rounded-2xl border border-border/20 bg-card p-4">
            <div className="text-sm font-bold text-foreground">{a.label}</div>
            <div className="text-xs text-muted-foreground mt-1">{a.line1}, {a.city}</div>
            <button onClick={() => remove(a.id)} className="mt-2 rounded-2xl bg-muted px-4 py-2 text-xs font-bold text-foreground">
              Remove
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
