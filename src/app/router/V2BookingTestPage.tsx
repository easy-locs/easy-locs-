import { V2AppShell as AppShell } from "@/components/shell/V2AppShell";
import { V2BookingAudit } from "@/components/debug/V2BookingAudit";
import { useUiShellStore } from "@/stores/uiShellStore";
import { useOrbitStore } from "@/stores/orbitStore";
import { useListingStore } from "@/stores/listingStore";
import { useBookingStore } from "@/stores/bookingStore";
import { useWalletStore } from "@/stores/walletStore";
import { useContactStore } from "@/stores/contactStore";
import { usePropertyManagementStore } from "@/stores/propertyManagementStore";

export default function V2BookingTestPage() {
  const ui = useUiShellStore();
  const orbit = useOrbitStore((s) => s.profile);
  const createListing = useListingStore((s) => s.createListing);
  const publishListing = useListingStore((s) => s.publishListing);
  const getPublishedListings = useListingStore((s) => s.getPublishedListings);
  const createBooking = useBookingStore((s) => s.createBooking);
  const wallet = useWalletStore((s) => s.wallet);

  const createUnit = usePropertyManagementStore((s) => s.createUnit);
  const createLease = usePropertyManagementStore((s) => s.createLease);
  const createRentPayment = usePropertyManagementStore((s) => s.createRentPayment);

  const openContact = useContactStore((s) => s.openContact);
  const startAudioCall = useContactStore((s) => s.startAudioCall);
  const startVideoCall = useContactStore((s) => s.startVideoCall);
  const openChatPanel = useContactStore((s) => s.openChatPanel);

  const seedWallet = () => {
    const state = useWalletStore.getState();
    if (!state.wallet) return;

    useWalletStore.setState({
      wallet: {
        ...state.wallet,
        availableBalance: 15000,
        lastUpdatedAt: new Date().toISOString(),
      },
    });
  };

  const createAndPublishListing = async () => {
    if (!orbit?.orbitId) return;

    const listing = await createListing({
      ownerOrbitId: orbit.orbitId,
      title: "Dubai Marina Apartment",
      description: "Direct booking enabled listing linked with wallet orbit and property management.",
      address: "Dubai Marina, Dubai, UAE",
      city: "Dubai",
      country: "UAE",
      lat: 25.0806,
      lng: 55.1404,
      currency: "AED",
      nightPrice: 450,
      cleaningFee: 75,
      serviceFee: 25,
      securityDeposit: 200,
      monthlyRent: 6500,
      flowMode: "instant_book",
    });

    await publishListing(listing.id);
  };

  const createInstantBooking = async () => {
    const listing = getPublishedListings()[0];
    if (!listing) return;

    await createBooking({
      listingId: listing.id,
      buyerOrbitId: "orbit_buyer_demo_1",
      checkIn: "2026-03-25",
      checkOut: "2026-03-28",
      guestInfo: {
        fullName: "Demo Guest",
        phone: "+971500000000",
        notes: "Late arrival",
        guestsCount: 2,
      },
    });
  };

  const createRequestBooking = async () => {
    if (!orbit?.orbitId) return;

    const listing = await createListing({
      ownerOrbitId: orbit.orbitId,
      title: "JLT Studio",
      description: "Request to book listing",
      address: "JLT, Dubai, UAE",
      city: "Dubai",
      country: "UAE",
      lat: 25.0685,
      lng: 55.1422,
      currency: "AED",
      nightPrice: 320,
      cleaningFee: 50,
      serviceFee: 20,
      securityDeposit: 150,
      monthlyRent: 5200,
      flowMode: "request_to_book",
    });

    await publishListing(listing.id);

    await createBooking({
      listingId: listing.id,
      buyerOrbitId: "orbit_buyer_demo_2",
      checkIn: "2026-04-02",
      checkOut: "2026-04-05",
      guestInfo: {
        fullName: "Request Guest",
        guestsCount: 1,
      },
    });
  };

  const createImmoFlow = async () => {
    if (!orbit?.orbitId) return;
    const listing = getPublishedListings()[0];
    if (!listing) return;

    const unit = await createUnit({
      listingId: listing.id,
      ownerOrbitId: orbit.orbitId,
      unitLabel: "Unit A-101",
      propertyType: "apartment",
    });

    if (!unit) return;

    const lease = await createLease({
      listingId: listing.id,
      unitId: unit.id,
      ownerOrbitId: orbit.orbitId,
      tenantOrbitId: "orbit_tenant_demo_1",
      startDate: "2026-04-01",
      endDate: "2027-03-31",
      dueDay: 5,
      notes: "Annual residential lease",
    });

    if (!lease) return;

    await createRentPayment({
      leaseId: lease.id,
      dueDate: "2026-04-05",
      reference: "April rent",
    });
  };

  const openOwnerContact = () => {
    const listing = getPublishedListings()[0];
    if (!listing) return;

    openContact({
      orbitId: listing.ownerOrbitId,
      listingId: listing.id,
    });
  };

  return (
    <AppShell
      header={
        <h1 className="text-sm font-bold text-foreground px-4 py-2">
          V2 Booking / Chat / Property Management / Wallet / Orbit
        </h1>
      }
      bottomNav={
        <div className="flex flex-wrap gap-2 p-2">
          <button className="px-3 py-1 text-xs rounded-full bg-primary text-primary-foreground" onClick={seedWallet}>
            Seed Wallet
          </button>
          <button className="px-3 py-1 text-xs rounded-full bg-primary text-primary-foreground" onClick={() => void createAndPublishListing()}>
            Create Published Listing
          </button>
          <button className="px-3 py-1 text-xs rounded-full bg-primary text-primary-foreground" onClick={() => void createInstantBooking()}>
            Instant Booking
          </button>
          <button className="px-3 py-1 text-xs rounded-full bg-primary text-primary-foreground" onClick={() => void createRequestBooking()}>
            Request Booking
          </button>
          <button className="px-3 py-1 text-xs rounded-full bg-primary text-primary-foreground" onClick={() => void createImmoFlow()}>
            Create Immo Flow
          </button>
          <button className="px-3 py-1 text-xs rounded-full bg-primary text-primary-foreground" onClick={openOwnerContact}>
            Open Contact
          </button>
          <button className="px-3 py-1 text-xs rounded-full bg-primary text-primary-foreground" onClick={openChatPanel}>
            Open Chat
          </button>
          <button className="px-3 py-1 text-xs rounded-full bg-primary text-primary-foreground" onClick={startAudioCall}>
            Audio Call
          </button>
          <button className="px-3 py-1 text-xs rounded-full bg-primary text-primary-foreground" onClick={startVideoCall}>
            Video Call
          </button>
          <button className="px-3 py-1 text-xs rounded-full bg-secondary text-secondary-foreground" onClick={() => ui.setMapFullscreen(!ui.mapFullscreen)}>
            Toggle Map
          </button>
        </div>
      }
      mapLayer={
        <div className="flex items-center justify-center h-full bg-muted/50 text-muted-foreground text-sm">
          MAP LAYER
        </div>
      }
      cameraLayer={
        <div className="flex flex-col items-center justify-center h-full bg-background text-foreground">
          CAMERA LAYER
          <button className="mt-2 px-3 py-1 text-xs rounded-full bg-destructive text-destructive-foreground" onClick={() => ui.closeCamera()}>
            Close
          </button>
        </div>
      }
      callLayer={
        <div className="flex items-center justify-center h-full bg-background text-foreground text-sm">
          CALL LAYER
        </div>
      }
      rightPanel={
        <div className="p-4">
          <p className="text-sm font-medium text-foreground">Right Panel: {ui.rightPanel}</p>
          <p className="text-xs text-muted-foreground mt-1">
            Chat / Contact / Booking tools panel
          </p>
        </div>
      }
    >
      <div className="p-4 space-y-4 pb-48 overflow-y-auto">
        <div className="rounded-2xl border border-border/30 bg-card p-4">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Orbit: {orbit?.orbitId ?? "none"}</p>
            <p className="text-xs text-muted-foreground">Wallet: {wallet?.walletId ?? "none"}</p>
            <p className="text-xs text-muted-foreground">Balance: {wallet?.availableBalance ?? 0} {wallet?.currency ?? "AED"}</p>
          </div>
        </div>
        <V2BookingAudit />
      </div>
    </AppShell>
  );
}
