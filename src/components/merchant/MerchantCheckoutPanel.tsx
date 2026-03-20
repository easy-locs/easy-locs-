import { useListingStore } from "@/stores/listingStore";
import { StripeCheckoutButton } from "@/components/payments/StripeCheckoutButton";
import { useCheckoutDiscountStore } from "@/stores/checkoutDiscountStore";
import { computeDiscountedAmount } from "@/lib/payments/amounts";

export function MerchantCheckoutPanel() {
  const listings = useListingStore((s) => s.getPublishedListings());
  const appliedCode = useCheckoutDiscountStore((s) => s.appliedCode);
  const discountAmount = useCheckoutDiscountStore((s) => s.discountAmount);

  return (
    <div className="rounded-lg border border-border p-4 space-y-4">
      <h3 className="text-lg font-semibold text-foreground">Merchant Checkout</h3>

      {listings.length === 0 && (
        <p className="text-sm text-muted-foreground">No published listings to checkout.</p>
      )}

      {listings.map((listing) => {
        const finalAmount = computeDiscountedAmount({
          originalAmount: listing.pricing.nightPrice,
          discountAmount,
        });

        return (
          <div key={listing.id} className="flex items-center justify-between rounded-lg border border-border p-3">
            <div>
              <p className="text-sm font-medium text-foreground">{listing.title}</p>
              <p className="text-xs text-muted-foreground">
                Original: {listing.pricing.nightPrice} {listing.pricing.currency}
              </p>
              {discountAmount > 0 && (
                <p className="text-xs text-primary">
                  Final: {finalAmount} {listing.pricing.currency}
                  {appliedCode ? ` (${appliedCode})` : ""}
                </p>
              )}
            </div>

            <StripeCheckoutButton
              name={listing.title}
              amountMinor={Math.round(finalAmount * 100)}
              currency={listing.pricing.currency}
              metadata={{
                listingId: listing.id,
                couponCode: appliedCode ?? "",
                originalAmount: String(listing.pricing.nightPrice),
                discountAmount: String(discountAmount ?? 0),
                finalAmount: String(finalAmount),
              }}
            />
          </div>
        );
      })}
    </div>
  );
}
