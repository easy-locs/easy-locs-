import type { BookingRecord, WalletTransaction } from "@/lib/types/app";
import type { BookingRecordV2, PropertyListingV2 } from "@/lib/types/booking";

export type AppEvent =
  | { type: "auth.session.ready"; payload: { userId: string } }
  | { type: "orbit.profile.loaded"; payload: { orbitId: string; userId: string } }
  | { type: "wallet.loaded"; payload: { walletId: string; ownerOrbitId: string } }
  | { type: "wallet.transaction.created"; payload: { transaction: WalletTransaction } }
  | { type: "wallet.payment.success"; payload: { transactionId: string; amount: number; reference?: string } }
  | { type: "wallet.payment.failed"; payload: { transactionId: string; reason?: string } }
  | { type: "booking.created"; payload: { booking: BookingRecord } }
  | { type: "booking.confirmed"; payload: { bookingId: string; transactionId?: string } }
  | { type: "geo.permission.changed"; payload: { state: "prompt" | "granted" | "denied" } }
  | { type: "geo.position.updated"; payload: { lat: number; lng: number; accuracy: number | null } }
  | { type: "ui.panel.changed"; payload: { leftPanel?: string | null; rightPanel?: string | null } }
  | { type: "call.started"; payload: { peerOrbitId: string; mode: "audio" | "video" } }
  | { type: "call.ended"; payload: { peerOrbitId: string | null } }
  | { type: "camera.opened"; payload: { mode: "qr" | "call" | "proof" | "avatar" } }
  | { type: "camera.closed"; payload: { mode?: "qr" | "call" | "proof" | "avatar" } }
  | { type: "listing.created"; payload: { listing: PropertyListingV2 } }
  | { type: "listing.updated"; payload: { listing: PropertyListingV2 } }
  | { type: "listing.published"; payload: { listingId: string } }
  | { type: "booking.requested"; payload: { booking: BookingRecordV2 } }
  | { type: "booking.payment.required"; payload: { bookingId: string; amount: number; currency: string; listingId: string } }
  | { type: "booking.confirmation.required"; payload: { bookingId: string; listingId: string } }
  | { type: "booking.cancelled"; payload: { bookingId: string; listingId: string } }
  | { type: "booking.completed"; payload: { bookingId: string; listingId: string } };
