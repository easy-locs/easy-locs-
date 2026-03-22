import { platformBus } from "@/lib/shared/platform-bus";
import { useBookingStore } from "@/stores/bookingStore";
import { useWalletStore } from "@/stores/walletStore";
import { usePropertyManagementStore } from "@/stores/propertyManagementStore";
import type { CurrencyCode } from "@/lib/types/domain";

let installed = false;

export function installBookingReactions() {
  if (installed) return;
  installed = true;

  platformBus.on("booking.payment.required", (event) => {
    const p = event.payload as { bookingId: string; amount: number; currency: string; listingId: string };
    void (async () => {
      const walletStore = useWalletStore.getState();
      const tx = await walletStore.createTransaction({
        type: "payment",
        amount: p.amount,
        currency: p.currency as CurrencyCode,
        reference: `booking:${p.bookingId}`,
        status: "pending",
      });
      walletStore.markTransactionSuccess(tx.id);
      await useBookingStore.getState().confirmBooking(p.bookingId, tx.id);
    })();
  });

  platformBus.on("booking.confirmation.required", (event) => {
    const p = event.payload as { bookingId: string };
    void useBookingStore.getState().markPendingConfirmation(p.bookingId);
  });

  platformBus.on("rent.payment.required", (event) => {
    const p = event.payload as { paymentId: string };
    void usePropertyManagementStore.getState().payRent(p.paymentId);
  });

  platformBus.on("booking.cancelled", (event) => {
    console.log("[booking reaction] cancelled", event.payload);
  });

  platformBus.on("booking.completed", (event) => {
    console.log("[booking reaction] completed", event.payload);
  });

  platformBus.on("rent.payment.paid", (event) => {
    console.log("[rent reaction] paid", event.payload);
  });
}
