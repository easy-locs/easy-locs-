import { useCustomerMobilityStore } from "@/stores/customerMobilityStore";
import { useLocationStore } from "@/stores/locationStore";
import { Package } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export function CreateDeliveryPanel() {
  const currentLocation = useLocationStore((s) => s.currentLocation);
  const createJob = useCustomerMobilityStore((s) => s.createJob);
  const [loading, setLoading] = useState(false);
  const lat = currentLocation?.lat ?? 25.2048;
  const lng = currentLocation?.lng ?? 55.2708;

  const handleCreate = async () => {
    setLoading(true);
    try {
      await createJob({
        jobType: "parcel_delivery",
        serviceLevel: "parcel_standard",
        pickupAddress: "Current location",
        pickupLat: lat,
        pickupLng: lng,
        dropoffAddress: "Destination",
        dropoffLat: lat + 0.01,
        dropoffLng: lng + 0.01,
        quotedPrice: 20,
        currency: "AED",
      });
      toast.success("Delivery created");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3 p-4 rounded-xl bg-card border border-border">
      <h3 className="text-sm font-semibold text-foreground">Create Delivery</h3>
      <button
        onClick={handleCreate}
        disabled={loading}
        className="flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors active:scale-[0.97] w-full"
      >
        <Package className="w-4 h-4" />
        {loading ? "Creating..." : "Create Test Job"}
      </button>
    </div>
  );
}
