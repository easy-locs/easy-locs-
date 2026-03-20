import { useListingStore } from "@/stores/listingStore";
import { useBookingStore } from "@/stores/bookingStore";
import { useWalletStore } from "@/stores/walletStore";
import { useChatStore } from "@/stores/chatStore";
import { usePropertyManagementStore } from "@/stores/propertyManagementStore";

export function V2BookingAudit() {
  const listings = useListingStore((s) => s.listings);
  const bookings = useBookingStore((s) => s.bookings);
  const wallet = useWalletStore((s) => s.wallet);
  const transactions = useWalletStore((s) => s.transactions);
  const conversations = useChatStore((s) => s.conversations);
  const messages = useChatStore((s) => s.messages);
  const units = usePropertyManagementStore((s) => s.units);
  const leases = usePropertyManagementStore((s) => s.leases);
  const rentPayments = usePropertyManagementStore((s) => s.rentPayments);

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
  ];

  return (
    <div className="space-y-4 p-4">
      {sections.map((section) => (
        <div key={section.title} className="rounded-2xl border border-border/30 bg-card p-4">
          <h3 className="text-sm font-bold text-foreground mb-2">{section.title}</h3>
          <pre className="text-[11px] text-muted-foreground whitespace-pre-wrap overflow-x-auto">
            {JSON.stringify(section.data, null, 2)}
          </pre>
        </div>
      ))}
    </div>
  );
}
