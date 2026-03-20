import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";

type ZoneRow = { id: string; name: string; fee: number };

export default function MerchantDeliveryZonesPage() {
  const navigate = useNavigate();
  const { merchantId = "" } = useParams();
  const [zones, setZones] = useState<ZoneRow[]>([
    { id: "1", name: "Dubai Marina", fee: 6 },
    { id: "2", name: "JLT", fee: 5 },
  ]);

  const addZone = () => {
    setZones((prev) => [...prev, { id: crypto.randomUUID(), name: `Zone ${prev.length + 1}`, fee: 7 }]);
    toast.success("Zone added");
  };

  const removeZone = (id: string) => {
    setZones((prev) => prev.filter((z) => z.id !== id));
    toast.success("Zone removed");
  };

  const save = () => {
    toast.success("Delivery zones saved");
    navigate(`/merchant/dashboard/${merchantId}`);
  };

  return (
    <div className="max-w-md mx-auto px-4 py-4 space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(`/merchant/dashboard/${merchantId}`)} className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center">←</button>
        <div>
          <h1 className="text-lg font-bold text-foreground">Delivery Zones</h1>
          <p className="text-xs text-muted-foreground">Manage delivery areas</p>
        </div>
      </div>

      <button onClick={addZone} className="w-full rounded-2xl bg-primary text-primary-foreground px-4 py-3 text-sm font-bold">Add Zone</button>

      <div className="space-y-3">
        {zones.map((zone) => (
          <div key={zone.id} className="rounded-2xl border border-border/20 bg-card p-4">
            <div className="text-sm font-bold text-foreground">{zone.name}</div>
            <div className="text-xs text-muted-foreground mt-1">Delivery fee {zone.fee} AED</div>
            <button onClick={() => removeZone(zone.id)} className="mt-3 w-full rounded-2xl bg-muted px-4 py-3 text-sm font-bold text-foreground">Remove</button>
          </div>
        ))}
      </div>

      <button onClick={save} className="w-full rounded-2xl bg-primary text-primary-foreground px-4 py-3 text-sm font-bold">Save Zones</button>
    </div>
  );
}
