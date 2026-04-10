/**
 * Platform event type definitions for the orchestration bus.
 */

export type PlatformEvent =
  | "ORDER_CREATED"
  | "ORDER_CONFIRMED"
  | "ORDER_READY"
  | "ORDER_DELIVERED"
  | "PAYMENT_SUCCESS"
  | "REFUND_REQUESTED"
  | "MISSION_CREATED"
  | "MISSION_ACCEPTED"
  | "MISSION_COMPLETED"
  | "USER_OPEN_HOME"
  | "USER_SEARCH"
  | "ISSUE_CREATED";

export interface OrderCreatedPayload {
  orderId: string;
  customerUserId: string;
  merchantId: string;
  totalAmount: number;
  currency: string;
}

export interface OrderConfirmedPayload {
  orderId: string;
  merchantId: string;
}

export interface OrderReadyPayload {
  orderId: string;
  merchantId: string;
  city?: string;
  pickupLat?: number | null;
  pickupLng?: number | null;
  zone?: string | null;
}

export interface OrderDeliveredPayload {
  orderId: string;
  merchantWalletId?: string;
  escrowWalletId?: string;
  grossAmount?: number;
  netToMerchant?: number;
  commission?: number;
  currency?: string;
}

export interface PaymentSuccessPayload {
  orderId: string;
  customerWalletId?: string;
  merchantWalletId?: string;
  escrowWalletId?: string;
  amount: number;
  currency: string;
  category: string;
  city: string;
  country: string;
}

export interface RefundRequestedPayload {
  orderId: string;
  requesterUserId: string;
  reason: string;
}

export interface MissionCreatedPayload {
  orderId: string;
  city: string;
  pickupLat: number;
  pickupLng: number;
  dropLat?: number;
  dropLng?: number;
  zone?: string;
}

export interface MissionAcceptedPayload {
  orderId: string;
  driverId: string;
  etaMinutes: number;
}

export interface MissionCompletedPayload {
  orderId: string;
  driverId: string;
  proofUrl?: string;
}

export interface UserOpenHomePayload {
  userId?: string;
}

export interface UserSearchPayload {
  userId?: string;
  query: string;
  vertical?: string;
}

export interface IssueCreatedPayload {
  ticketId: string;
  orderId?: string;
  requesterUserId: string;
  type: string;
}
