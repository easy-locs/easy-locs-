import { platformBus } from "@/lib/shared/platform-bus";
import { useWalletStore } from "@/stores/walletStore";
import { useOrbitStore } from "@/stores/orbitStore";
import { installBookingReactions } from "@/core/bootstrap/install-booking-reactions";

let installed = false;

export function installPlatformReactions() {
  if (installed) return;
  installed = true;

  installBookingReactions();

  platformBus.on("orbit.profile.loaded", (event) => {
    const p = event.payload as { orbitId: string; userId: string };
    const current = useOrbitStore.getState().profile;
    if (!current) return;

    useOrbitStore.getState().setProfile({
      ...current,
      serviceLinks: {
        ...current.serviceLinks,
        walletLinked: true,
        propertyEnabled: true,
        bookingEnabled: true,
        messagingEnabled: true,
      },
    });

    void useWalletStore.getState().loadWallet({
      walletId: `wallet_${p.orbitId}`,
      ownerOrbitId: p.userId,
      currency: "AED",
    });
  });

  platformBus.on("wallet.payment.success", (event) => {
    console.log("[reaction] payment success", event.payload);
  });

  platformBus.on("geo.position.updated", (event) => {
    console.log("[reaction] geo updated", event.payload);
  });

  platformBus.on("call.started", (event) => {
    console.log("[reaction] call started", event.payload);
  });

  platformBus.on("listing.created", (event) => {
    const p = event.payload as { listing: { id: string } };
    console.log("[reaction] listing created", p.listing.id);
  });

  platformBus.on("listing.published", (event) => {
    const p = event.payload as { listingId: string };
    console.log("[reaction] listing published", p.listingId);
  });

  platformBus.on("booking.requested", (event) => {
    const p = event.payload as { booking: { id: string } };
    console.log("[reaction] booking requested", p.booking.id);
  });

  platformBus.on("conversation.created", (event) => {
    const p = event.payload as { conversation: { id: string } };
    console.log("[reaction] conversation created", p.conversation.id);
  });

  platformBus.on("lease.created", (event) => {
    const p = event.payload as { lease: { id: string } };
    console.log("[reaction] lease created", p.lease.id);
  });
}
