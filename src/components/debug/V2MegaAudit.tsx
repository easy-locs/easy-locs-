import { useListingStore } from "@/stores/listingStore";
import { useBookingStore } from "@/stores/bookingStore";
import { useWalletStore } from "@/stores/walletStore";
import { useChatStore } from "@/stores/chatStore";
import { usePropertyManagementStore } from "@/stores/propertyManagementStore";
import { useMapStore } from "@/stores/mapStore";
import { usePropertyDetailStore } from "@/stores/propertyDetailStore";
import { useRealtimeStore } from "@/stores/realtimeStore";
import { usePermissionStore } from "@/stores/permissionStore";
import { useCameraStore } from "@/stores/cameraStore";

export function V2MegaAudit() {
  const listings = useListingStore((s) => s.listings);
  const bookings = useBookingStore((s) => s.bookings);
  const wallet = useWalletStore((s) => s.wallet);
  const transactions = useWalletStore((s) => s.transactions);
  const conversations = useChatStore((s) => s.conversations);
  const messages = useChatStore((s) => s.messages);
  const units = usePropertyManagementStore((s) => s.units);
  const leases = usePropertyManagementStore((s) => s.leases);
  const rentPayments = usePropertyManagementStore((s) => s.rentPayments);
  const markers = useMapStore((s) => s.markers);
  const selectedMarker = useMapStore((s) => s.selectedMarkerId);
  const propertyDetail = usePropertyDetailStore((s) => s.selectedListing);
  const calendarDays = usePropertyDetailStore((s) => s.calendarDays);
  const realtimeSubs = useRealtimeStore((s) => s.subscriptions);
  const cameraPermission = usePermissionStore((s) => s.camera);
  const micPermission = usePermissionStore((s) => s.microphone);
  const geoPermission = usePermissionStore((s) => s.geolocation);
  const cameraOpen = useCameraStore((s) => s.isOpen);
  const cameraMode = useCameraStore((s) => s.mode);

  const sections = [
    { title: "Listings", data: listings },
    { title: "Bookings", data: bookings },
    { title: "Wallet", data: wallet },
    { title: "Transactions", data: transactions },
    { title: "Conversations", data: conversations },
    { title: "Messages", data: messages },
    { title: "Units", data: units },
    { title: "Leases", data: leases },
    { title: "Rent Payments", data: rentPayments },
    { title: "Map Markers", data: markers },
    { title: "Selected Marker", data: selectedMarker },
    { title: "Property Detail", data: propertyDetail },
    { title: "Calendar Days", data: calendarDays },
    { title: "Realtime Subscriptions", data: realtimeSubs },
    {
      title: "Permissions",
      data: { camera: cameraPermission, mic: micPermission, geo: geoPermission },
    },
    { title: "Camera", data: { open: cameraOpen, mode: cameraMode } },
  ];

  return (
    <div className="space-y-4 p-4">
      {sections.map((s) => (
        <div key={s.title} className="rounded-2xl border border-border/30 bg-card p-4">
          <h3 className="text-sm font-bold text-foreground mb-2">{s.title}</h3>
          <pre className="text-[11px] text-muted-foreground whitespace-pre-wrap overflow-x-auto max-h-40">
            {JSON.stringify(s.data, null, 2)}
          </pre>
        </div>
      ))}
    </div>
  );
}