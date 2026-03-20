import { useDeliveryStore } from "@/stores/deliveryStore";
import { useGeoStore } from "@/stores/geoStore";
import { Package } from "lucide-react";

export function CreateDeliveryPanel() {
  const geo = useGeoStore((s) => s.currentPosition);
  const createJob = useDeliveryStore((s) => s.createJob);

  return (
    <div className="space-y-3 p-4 rounded-xl bg-card border border-border">
      <h3 className="text-sm font-semibold text-foreground">Create Delivery</h3>

      <button
        onClick={() =>
          void createJob({
            pickupLat: geo.lat,
            pickupLng: geo.lng,
            dropLat: geo.lat + 0.01,
            dropLng: geo.lng + 0.01,
            price: 20,
          })
        }
        className="flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors active:scale-[0.97] w-full"
      >
        <Package className="w-4 h-4" />
        Create Test Job
      </button>
    </div>
  );
}
