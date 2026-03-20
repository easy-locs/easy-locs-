import { platformBus } from "@/app/events/platform-bus";
import { useBookingStore } from "@/stores/bookingStore";
import { useWalletStore } from "@/stores/walletStore";
import { usePropertyManagementStore } from "@/stores/propertyManagementStore";

let installed = false;

export function installBookingReactions() {
  if (installed) return;
  installed = true;

  platformBus.on("booking.payment.required", (event) => {
    const walletStore = useWalletStore.getState();
    const tx = walletStore.createTransaction({
      type: "payment",
      amount: event.payload.amount,
      currency: event.payload.currency as "AED" | "USD" | "EUR" | "SAR" | "GBP",
      reference: `booking:${event.payload.bookingId}`,
      status: "pending",
    });
    walletStore.markTransactionSuccess(tx.id);
    useBookingStore.getState().confirmBooking(event.payload.bookingId, tx.id);
  });

  platformBus.on("booking.confirmation.required", (event) => {
    useBookingStore.getState().markPendingConfirmation(event.payload.bookingId);
  });

  platformBus.on("rent.payment.required", (event) => {
    usePropertyManagementStore.getState().payRent(event.payload.paymentId);
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
