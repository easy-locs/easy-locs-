import { useListingStore } from "@/stores/listingStore";
import { StripeCheckoutButton } from "@/components/payments/StripeCheckoutButton";

export function MerchantCheckoutPanel() {
  const listings = useListingStore((s) => s.getPublishedListings());

  return (
    <div className="rounded-lg border border-border p-4 space-y-4">
      <h3 className="text-lg font-semibold text-foreground">Merchant Checkout</h3>

      {listings.length === 0 && (
        <p className="text-sm text-muted-foreground">No published listings to checkout.</p>
      )}

      {listings.map((listing) => (
        <div key={listing.id} className="flex items-center justify-between rounded-lg border border-border p-3">
          <div>
            <p className="text-sm font-medium text-foreground">{listing.title}</p>
            <p className="text-xs text-muted-foreground">
              {listing.pricing.nightPrice} {listing.pricing.currency} / night
            </p>
          </div>

          <StripeCheckoutButton
            name={listing.title}
            amountMinor={listing.pricing.nightPrice * 100}
            currency={listing.pricing.currency}
            metadata={{ listingId: listing.id }}
          />
        </div>
      ))}
    </div>
  );
}
