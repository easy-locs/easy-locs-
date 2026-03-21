import { useDeliveryStore } from "@/stores/deliveryStore";
import { useLocationStore } from "@/stores/locationStore";
import { Package } from "lucide-react";

export function CreateDeliveryPanel() {
  const currentLocation = useLocationStore((s) => s.currentLocation);
  const createJob = useDeliveryStore((s) => s.createJob);
  const lat = currentLocation?.lat ?? 25.2048;
  const lng = currentLocation?.lng ?? 55.2708;

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
