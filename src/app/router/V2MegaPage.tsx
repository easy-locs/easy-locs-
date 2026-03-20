import { useEffect, useState } from "react";
import { V2AppShell } from "@/components/shell/V2AppShell";
import { V2MegaAudit } from "@/components/debug/V2MegaAudit";
import { useUiShellStore } from "@/stores/uiShellStore";
import { useOrbitStore } from "@/stores/orbitStore";
import { useListingStore } from "@/stores/listingStore";
import { useBookingStore } from "@/stores/bookingStore";
import { useWalletStore } from "@/stores/walletStore";
import { useContactStore } from "@/stores/contactStore";
import { usePropertyManagementStore } from "@/stores/propertyManagementStore";
import { useListingsRealtime } from "@/hooks/useListingsRealtime";
import { useBookingsRealtime } from "@/hooks/useBookingsRealtime";
import { useNotificationsRealtime } from "@/hooks/useNotificationsRealtime";
import { useMapStore } from "@/stores/mapStore";
import { MapMarkerList } from "@/components/map/MapMarkerList";
import { PropertyDetailPanel } from "@/components/property/PropertyDetailPanel";
import { SimpleCallPanel } from "@/components/call/SimpleCallPanel";
import { CameraPreviewPanel } from "@/components/camera/CameraPreviewPanel";
import { useCameraStore } from "@/stores/cameraStore";
import { usePermissionStore } from "@/stores/permissionStore";
import { ConversationList } from "@/components/chat/ConversationList";
import { ConversationThread } from "@/components/chat/ConversationThread";
import { NotificationsPanel } from "@/components/notifications/NotificationsPanel";
import { useNotificationsStore } from "@/stores/notificationsStore";
import { OwnerPropertyDashboard } from "@/components/property/OwnerPropertyDashboard";
import { TenantDashboard } from "@/components/property/TenantDashboard";
import { ListingSearchPanel } from "@/components/search/ListingSearchPanel";
import { ListingSearchResults } from "@/components/search/ListingSearchResults";
import { QrPaymentPanel } from "@/components/payments/QrPaymentPanel";
import { GenerateListingQrButton } from "@/components/property/GenerateListingQrButton";
import { useChatStore } from "@/stores/chatStore";
import { BookingStatusPanel } from "@/components/booking/BookingStatusPanel";
import { RentStatusPanel } from "@/components/property/RentStatusPanel";
import { SimpleNavTabs, type SimpleNavTab } from "@/components/layout/SimpleNavTabs";

export default function V2MegaPage() {
  useListingsRealtime();
  useBookingsRealtime();

  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [tab, setTab] = useState<SimpleNavTab>("overview");

  const ui = useUiShellStore();
  const orbit = useOrbitStore((s) => s.profile);
  const createListing = useListingStore((s) => s.createListing);
  const publishListing = useListingStore((s) => s.publishListing);
  const getPublishedListings = useListingStore((s) => s.getPublishedListings);
  const hydratePublished = useListingStore((s) => s.hydratePublished);
  const createBooking = useBookingStore((s) => s.createBooking);
  const createUnit = usePropertyManagementStore((s) => s.createUnit);
  const createLease = usePropertyManagementStore((s) => s.createLease);
  const createRentPayment = usePropertyManagementStore((s) => s.createRentPayment);
  const openContact = useContactStore((s) => s.openContact);
  const openChatPanel = useContactStore((s) => s.openChatPanel);
  const startAudioCall = useContactStore((s) => s.startAudioCall);
  const startVideoCall = useContactStore((s) => s.startVideoCall);
  const buildListingMarkers = useMapStore((s) => s.buildListingMarkers);
  const openCamera = useCameraStore((s) => s.openCamera);
  const checkCamera = usePermissionStore((s) => s.checkCamera);
  const checkMicrophone = usePermissionStore((s) => s.checkMicrophone);
  const checkGeolocation = usePermissionStore((s) => s.checkGeolocation);
  const hydrateNotifications = useNotificationsStore((s) => s.hydrate);
  const pushNotification = useNotificationsStore((s) => s.push);
  const unreadCount = useNotificationsStore((s) => s.unreadCount);
  const hydrateConversations = useChatStore((s) => s.hydrateConversations);
  const hydrateMessages = useChatStore((s) => s.hydrateMessages);

  useEffect(() => {
    void hydratePublished().then(() => {
      buildListingMarkers();
    });
  }, [hydratePublished, buildListingMarkers]);

  useEffect(() => {
    if (!orbit?.orbitId) return;
    void hydrateNotifications(orbit.orbitId);
    void hydrateConversations(orbit.orbitId);
  }, [orbit?.orbitId, hydrateNotifications, hydrateConversations]);

  useEffect(() => {
    if (!activeConversationId) return;
    void hydrateMessages(activeConversationId);
  }, [activeConversationId, hydrateMessages]);

  const seedWallet = () => {
    const state = useWalletStore.getState();
    if (!state.wallet) return;
    useWalletStore.setState({
      wallet: {
        ...state.wallet,
        availableBalance: 20000,
        lastUpdatedAt: new Date().toISOString(),
      },
    });
  };

  const doCreateListing = async () => {
    if (!orbit?.orbitId) return;
    const listing = await createListing({
      title: "Dubai Marina Apartment",
      description: "Wallet + Orbit + Booking + Immo connected",
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
    buildListingMarkers();

    await pushNotification({
      orbitId: orbit.orbitId,
      type: "system",
      title: "Listing published",
      body: `${listing.title} is now live`,
      metadata: { listingId: listing.id },
    });
  };

  const doInstantBooking = async () => {
    const listing = getPublishedListings()[0];
    if (!listing || !orbit?.orbitId) return;

    const booking = await createBooking({
      listingId: listing.id,
      checkIn: "2026-03-25",
      checkOut: "2026-03-28",
      guestInfo: {
        fullName: "Demo Guest",
        phone: "+971500000000",
        notes: "Late arrival",
        guestsCount: 2,
      },
    });

    if (booking) {
      await pushNotification({
        orbitId: orbit.orbitId,
        type: "booking",
        title: "New booking flow",
        body: `Booking ${booking.id} created`,
        metadata: { bookingId: booking.id, listingId: listing.id },
      });

      if (booking.conversationId) {
        setActiveConversationId(booking.conversationId);
        setTab("chat");
      }
    }
  };

  const doImmoFlow = async () => {
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

    await pushNotification({
      orbitId: orbit.orbitId,
      type: "rent",
      title: "Rent flow created",
      body: `Lease ${lease.id} and payment schedule created`,
      metadata: { leaseId: lease.id, listingId: listing.id },
    });
  };

  const doOpenContact = () => {
    const listing = getPublishedListings()[0];
    if (!listing) return;
    openContact({ orbitId: listing.ownerOrbitId, listingId: listing.id });
  };

  const firstListing = getPublishedListings()[0];

  const btnClass =
    "rounded-lg bg-secondary px-3 py-1.5 text-xs font-medium text-secondary-foreground hover:bg-secondary/80 transition-colors";

  const renderTab = () => {
    switch (tab) {
      case "overview":
        return (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <NotificationsPanel />
              <BookingStatusPanel />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <RentStatusPanel />
              <PropertyDetailPanel />
            </div>
          </>
        );

      case "chat":
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ConversationList onOpen={setActiveConversationId} />
            <ConversationThread conversationId={activeConversationId} />
          </div>
        );

      case "owner":
        return (
          <div className="space-y-4">
            <OwnerPropertyDashboard />
            <BookingStatusPanel />
            <RentStatusPanel />
          </div>
        );

      case "tenant":
        return <TenantDashboard tenantOrbitId="orbit_tenant_demo_1" />;

      case "search":
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ListingSearchPanel />
            <ListingSearchResults />
          </div>
        );

      case "payments":
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <QrPaymentPanel />
            <div className="space-y-4">
              <RentStatusPanel />
              {firstListing ? (
                <GenerateListingQrButton
                  amount={firstListing.pricing.nightPrice}
                  reference={`listing:${firstListing.id}`}
                />
              ) : null}
            </div>
          </div>
        );

      case "system":
        return <V2MegaAudit />;

      default:
        return null;
    }
  };

  return (
    <V2AppShell
      header={
        <div className="bg-card border-b border-border px-4 py-3">
          <div className="flex items-center justify-between">
            <h1 className="text-sm font-semibold text-foreground">
              V2 Mega Connected — Suite 3
            </h1>
            <p className="text-xs text-muted-foreground">
              Unread notifications: {unreadCount()}
            </p>
          </div>
          <SimpleNavTabs value={tab} onChange={setTab} />
        </div>
      }
      bottomNav={
        <div className="flex flex-wrap gap-1.5 bg-card border-t border-border p-2">
          <button className={btnClass} onClick={seedWallet}>Seed Wallet</button>
          <button className={btnClass} onClick={() => void hydratePublished().then(buildListingMarkers)}>Load Published</button>
          <button className={btnClass} onClick={() => void doCreateListing()}>Create Listing</button>
          <button className={btnClass} onClick={() => void doInstantBooking()}>Instant Booking</button>
          <button className={btnClass} onClick={() => void doImmoFlow()}>Create Immo Flow</button>
          <button className={btnClass} onClick={doOpenContact}>Open Contact</button>
          <button className={btnClass} onClick={openChatPanel}>Open Chat</button>
          <button className={btnClass} onClick={startAudioCall}>Audio Call</button>
          <button className={btnClass} onClick={startVideoCall}>Video Call</button>
          <button className={btnClass} onClick={() => void openCamera("qr")}>Open Camera</button>
          <button className={btnClass} onClick={() => void checkCamera()}>Check Camera</button>
          <button className={btnClass} onClick={() => void checkMicrophone()}>Check Mic</button>
          <button className={btnClass} onClick={() => void checkGeolocation()}>Check Geo</button>
          <button className={btnClass} onClick={() => ui.setMapFullscreen(!ui.mapFullscreen)}>Toggle Map</button>
        </div>
      }
      mapLayer={<MapMarkerList />}
      cameraLayer={<CameraPreviewPanel />}
      callLayer={<SimpleCallPanel />}
      rightPanel={<PropertyDetailPanel />}
    >
      <div className="p-4 space-y-6">{renderTab()}</div>
    </V2AppShell>
  );
}
