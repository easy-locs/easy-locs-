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
import { useSimpleRtcStore } from "@/stores/simpleRtcStore";

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
  const rtcInit = useSimpleRtcStore((s) => s.isInitialized);

  const sections = [
    { title: "Listings", data: listings },
    { title: "Bookings", data: bookings },
    { title: "Wallet", data: wallet },
    { title: "Transactions", data: transactions },
    { title: "Conversations", data: conversations },
    { title: "Messages", data: messages },
    { title: "Property Units", data: units },
    { title: "Leases", data: leases },
    { title: "Rent Payments", data: rentPayments },
    { title: "Map Markers", data: markers },
    { title: "Selected Marker", data: selectedMarker },
    { title: "Property Detail", data: propertyDetail },
    { title: "Calendar Days", data: calendarDays },
    { title: "Realtime Subs", data: realtimeSubs },
    {
      title: "Permissions",
      data: { camera: cameraPermission, microphone: micPermission, geolocation: geoPermission },
    },
    { title: "Camera", data: { open: cameraOpen, mode: cameraMode } },
    { title: "RTC", data: { initialized: rtcInit } },
  ];

  return (
    <div className="space-y-4 p-4 text-xs">
      {sections.map((section) => (
        <div key={section.title} className="rounded-lg border border-border p-3">
          <h4 className="font-semibold text-foreground mb-1">{section.title}</h4>
          <pre className="whitespace-pre-wrap break-all text-muted-foreground bg-muted rounded p-2 overflow-auto max-h-48">
            {JSON.stringify(section.data, null, 2)}
          </pre>
        </div>
      ))}
    </div>
  );
}
