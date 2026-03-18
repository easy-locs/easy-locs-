/**
 * Orbit Thread Hooks — Auto-generates context threads from business events.
 * 
 * Import and call these from lifecycle hooks, crons, or UI triggers
 * to ensure every business object has a dedicated Orbit thread.
 */
import {
  getOrCreateContextThread,
  injectThreadSystemMessage,
  type OrbitContextType,
  type ContextThreadRequest,
  type ThreadActionPayload,
} from "./context-thread-factory";

/* ═══════════════════════════════════════════════════
   LIFECYCLE HOOKS — Call from business logic
   ═══════════════════════════════════════════════════ */

/** Hook: Rent call created → auto-create rent thread */
export async function onRentCallCreated(opts: {
  rentCallId: string;
  orgId: string;
  landlordId: string;
  tenantId: string;
  amount: number;
  currency: string;
  period: string;
  propertyLabel?: string;
}) {
  const result = await getOrCreateContextThread({
    contextType: "rent_call",
    contextId: opts.rentCallId,
    orgId: opts.orgId,
    initiatorId: opts.landlordId,
    participantIds: [opts.landlordId, opts.tenantId],
    title: `Rent ${opts.period}`,
    subtitle: opts.propertyLabel,
  });

  if (result?.isNew) {
    await injectThreadSystemMessage({
      threadId: result.threadId,
      orgId: opts.orgId,
      contextType: "rent_call",
      contextId: opts.rentCallId,
      content: `🏠 Rent due: ${opts.amount} ${opts.currency} for ${opts.period}`,
      category: "lease",
      actionPayload: {
        type: "pay",
        label: `Pay Rent — ${opts.period}`,
        amount: opts.amount,
        currency: opts.currency,
        route: `/wallet?action=rent-pay&rentCallId=${opts.rentCallId}`,
        entityId: opts.rentCallId,
        entityType: "rent_call",
        variant: "primary",
      },
    });
  }
  return result;
}

/** Hook: Order created → auto-create order thread */
export async function onOrderCreated(opts: {
  orderId: string;
  orgId: string;
  buyerId: string;
  sellerId: string;
  amount: number;
  currency: string;
  orderLabel?: string;
}) {
  const result = await getOrCreateContextThread({
    contextType: "order",
    contextId: opts.orderId,
    orgId: opts.orgId,
    initiatorId: opts.buyerId,
    participantIds: [opts.buyerId, opts.sellerId],
    title: opts.orderLabel || `Order`,
  });

  if (result?.isNew) {
    await injectThreadSystemMessage({
      threadId: result.threadId,
      orgId: opts.orgId,
      contextType: "order",
      contextId: opts.orderId,
      content: `📦 New order: ${opts.amount} ${opts.currency}`,
      category: "payment",
      actionPayload: {
        type: "pay",
        label: "Pay for Order",
        amount: opts.amount,
        currency: opts.currency,
        entityId: opts.orderId,
        entityType: "order",
        variant: "primary",
      },
    });
  }
  return result;
}

/** Hook: Booking created → auto-create booking thread */
export async function onBookingCreated(opts: {
  bookingId: string;
  orgId: string;
  guestId: string;
  hostId: string;
  amount: number;
  currency: string;
  serviceTitle?: string;
}) {
  return getOrCreateContextThread({
    contextType: "booking",
    contextId: opts.bookingId,
    orgId: opts.orgId,
    initiatorId: opts.guestId,
    participantIds: [opts.guestId, opts.hostId],
    title: opts.serviceTitle || "Booking",
  });
}

/** Hook: Delivery created → auto-create delivery thread */
export async function onDeliveryCreated(opts: {
  deliveryId: string;
  orgId: string;
  senderId: string;
  courierId: string;
  pickupLabel?: string;
}) {
  return getOrCreateContextThread({
    contextType: "delivery",
    contextId: opts.deliveryId,
    orgId: opts.orgId,
    initiatorId: opts.senderId,
    participantIds: [opts.senderId, opts.courierId],
    title: opts.pickupLabel || "Delivery",
  });
}

/** Hook: Service booked → auto-create service thread */
export async function onServiceBooked(opts: {
  serviceId: string;
  orgId: string;
  clientId: string;
  providerId: string;
  serviceTitle?: string;
}) {
  return getOrCreateContextThread({
    contextType: "service",
    contextId: opts.serviceId,
    orgId: opts.orgId,
    initiatorId: opts.clientId,
    participantIds: [opts.clientId, opts.providerId],
    title: opts.serviceTitle || "Service",
  });
}

/** Hook: Travel booked → auto-create travel thread */
export async function onTravelBooked(opts: {
  travelId: string;
  orgId: string;
  travelerId: string;
  providerId: string;
  tripLabel?: string;
}) {
  return getOrCreateContextThread({
    contextType: "travel",
    contextId: opts.travelId,
    orgId: opts.orgId,
    initiatorId: opts.travelerId,
    participantIds: [opts.travelerId, opts.providerId],
    title: opts.tripLabel || "Travel",
  });
}

/** Hook: Property lease → auto-create property thread */
export async function onLeaseCreated(opts: {
  leaseId: string;
  orgId: string;
  landlordId: string;
  tenantId: string;
  propertyLabel?: string;
}) {
  return getOrCreateContextThread({
    contextType: "property",
    contextId: opts.leaseId,
    orgId: opts.orgId,
    initiatorId: opts.landlordId,
    participantIds: [opts.landlordId, opts.tenantId],
    title: opts.propertyLabel || "Lease",
  });
}

/** Hook: Payment sent → auto-create payment thread */
export async function onPaymentSent(opts: {
  paymentId: string;
  orgId: string;
  senderId: string;
  recipientId: string;
  amount: number;
  currency: string;
}) {
  return getOrCreateContextThread({
    contextType: "payment",
    contextId: opts.paymentId,
    orgId: opts.orgId,
    initiatorId: opts.senderId,
    participantIds: [opts.senderId, opts.recipientId],
    title: `Payment ${opts.amount} ${opts.currency}`,
  });
}

/** Hook: Ride requested → auto-create ride thread */
export async function onRideRequested(opts: {
  rideId: string;
  orgId: string;
  riderId: string;
  driverId: string;
  destination?: string;
}) {
  return getOrCreateContextThread({
    contextType: "delivery",
    contextId: opts.rideId,
    orgId: opts.orgId,
    initiatorId: opts.riderId,
    participantIds: [opts.riderId, opts.driverId],
    title: opts.destination ? `Ride → ${opts.destination}` : "Ride",
  });
}
