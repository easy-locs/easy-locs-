import type {
  WalletTransaction,
  PropertyListingV2,
  BookingRecordV2,
  ConversationRecord,
  ChatMessageRecord,
  PropertyUnitManagement,
  LeaseRecord,
  RentPaymentRecord,
} from "@/lib/types/domain";

export type AppEvent =
  | { type: "orbit.profile.loaded"; payload: { orbitId: string; userId: string } }
  | { type: "wallet.loaded"; payload: { walletId: string; ownerOrbitId: string } }
  | { type: "wallet.transaction.created"; payload: { transaction: WalletTransaction } }
  | { type: "wallet.payment.success"; payload: { transactionId: string; amount: number; reference?: string } }
  | { type: "wallet.payment.failed"; payload: { transactionId: string; reason?: string } }
  | { type: "listing.created"; payload: { listing: PropertyListingV2 } }
  | { type: "listing.updated"; payload: { listing: PropertyListingV2 } }
  | { type: "listing.published"; payload: { listingId: string } }
  | { type: "booking.requested"; payload: { booking: BookingRecordV2 } }
  | { type: "booking.payment.required"; payload: { bookingId: string; amount: number; currency: string; listingId: string } }
  | { type: "booking.confirmation.required"; payload: { bookingId: string; listingId: string } }
  | { type: "booking.confirmed"; payload: { bookingId: string; transactionId?: string } }
  | { type: "booking.cancelled"; payload: { bookingId: string; listingId: string } }
  | { type: "booking.completed"; payload: { bookingId: string; listingId: string } }
  | { type: "conversation.created"; payload: { conversation: ConversationRecord } }
  | { type: "message.sent"; payload: { message: ChatMessageRecord } }
  | { type: "contact.opened"; payload: { orbitId: string; listingId?: string; bookingId?: string } }
  | { type: "property.unit.created"; payload: { unit: PropertyUnitManagement } }
  | { type: "lease.created"; payload: { lease: LeaseRecord } }
  | { type: "rent.payment.created"; payload: { payment: RentPaymentRecord } }
  | { type: "rent.payment.required"; payload: { paymentId: string; amount: number; currency: string; leaseId: string } }
  | { type: "rent.payment.paid"; payload: { paymentId: string; transactionId?: string } }
  | { type: "geo.permission.changed"; payload: { state: "prompt" | "granted" | "denied" } }
  | { type: "geo.position.updated"; payload: { lat: number; lng: number; accuracy: number | null } }
  | { type: "call.started"; payload: { peerOrbitId: string; mode: "audio" | "video" } }
  | { type: "call.ended"; payload: { peerOrbitId: string | null } }
  | { type: "call.request"; payload: { orgId: string; peerName: string; isVideo: boolean; threadId?: string } }
  | { type: "ui.panel.changed"; payload: { leftPanel?: string | null; rightPanel?: string | null } }
  | { type: "camera.opened"; payload: { mode: "qr" | "call" | "proof" | "avatar" } }
  | { type: "camera.closed"; payload: { mode?: "qr" | "call" | "proof" | "avatar" } };
