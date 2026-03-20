import { platformBus } from "@/app/events/platform-bus";
import { useWalletStore } from "@/stores/walletStore";
import { useOrbitStore } from "@/stores/orbitStore";
import { installBookingReactions } from "@/core/bootstrap/install-booking-reactions";

let installed = false;

export function installPlatformReactions() {
  if (installed) return;
  installed = true;

  installBookingReactions();

  platformBus.on("orbit.profile.loaded", (event) => {
    const current = useOrbitStore.getState().profile;
    if (!current) return;

    useOrbitStore.getState().setProfile({
      ...current,
      serviceLinks: { ...current.serviceLinks, walletLinked: true },
    });

    void useWalletStore.getState().loadWallet({
      walletId: `wallet_${event.payload.orbitId}`,
      ownerOrbitId: event.payload.orbitId,
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
    console.log("[reaction] listing created", event.payload.listing.id);
  });

  platformBus.on("listing.published", (event) => {
    console.log("[reaction] listing published", event.payload.listingId);
  });

  platformBus.on("booking.requested", (event) => {
    console.log("[reaction] booking requested", event.payload.booking.id);
  });
}
