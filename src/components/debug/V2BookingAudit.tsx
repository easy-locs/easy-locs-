import { useListingStore } from "@/stores/listingStore";
import { useBookingStore } from "@/stores/bookingStore";
import { useWalletStore } from "@/stores/walletStore";

export function V2BookingAudit() {
  const listings = useListingStore((s) => s.listings);
  const bookings = useBookingStore((s) => s.bookings);
  const wallet = useWalletStore((s) => s.wallet);
  const transactions = useWalletStore((s) => s.transactions);

  const sections = [
    { title: "Listings", data: listings },
    { title: "Bookings", data: bookings },
    { title: "Wallet", data: wallet },
    { title: "Transactions", data: transactions },
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
