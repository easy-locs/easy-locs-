import type { DomainResult } from "../shared/types";

export type FoodOrderStatus =
  | "pending"
  | "accepted"
  | "preparing"
  | "ready_for_pickup"
  | "dispatching"
  | "in_delivery"
  | "delivered"
  | "cancelled";

export interface FoodOrder {
  id: string;
  shopId: string;
  buyerId: string;
  sellerId: string;
  status: FoodOrderStatus;
  items: FoodOrderItem[];
  subtotal: number;
  deliveryFee: number;
  total: number;
  currency: string;
  deliveryAddress?: string;
  deliveryLat?: number;
  deliveryLng?: number;
  shopLat?: number;
  shopLng?: number;
  estimatedPrepMinutes?: number;
  deliveryJobId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface FoodOrderItem {
  id: string;
  title: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  modifiers?: ItemModifierSelection[];
  notes?: string;
  allergens?: string[];
  prepTimeMinutes?: number;
}

export interface ItemModifierSelection {
  groupName: string;
  optionName: string;
  priceAdjustment: number;
}

export interface DailyStats {
  ordersToday: number;
  revenueToday: number;
  avgPrepTime: number;
  topItems: { name: string; count: number }[];
}

export interface RestaurantUseCases {
  acceptOrder(orderId: string): Promise<DomainResult<FoodOrder>>;
  rejectOrder(orderId: string, reason: string): Promise<DomainResult<void>>;
  startPreparing(orderId: string): Promise<DomainResult<FoodOrder>>;
  markReady(orderId: string): Promise<DomainResult<FoodOrder>>;
  getActiveOrders(shopId: string): Promise<DomainResult<FoodOrder[]>>;
  getDailyStats(shopId: string): Promise<DomainResult<DailyStats>>;
}

export interface RestaurantOrderRepository {
  findById(id: string): Promise<FoodOrder | null>;
  findActiveByShop(shopId: string): Promise<FoodOrder[]>;
  updateStatus(id: string, status: FoodOrderStatus, extra?: Record<string, unknown>, expectedCurrentStatus?: FoodOrderStatus): Promise<FoodOrder | null>;
  getDailyStats(shopId: string): Promise<DailyStats>;
}

export interface RestaurantEventPort {
  orderPlaced(order: FoodOrder): void;
  orderAccepted(order: FoodOrder): void;
  orderPreparing(order: FoodOrder): void;
  orderReady(order: FoodOrder): void;
  orderDispatched(order: FoodOrder): void;
  orderDelivered(order: FoodOrder): void;
  orderCancelled(orderId: string, reason: string, context?: { buyerId?: string; sellerId?: string; shopId?: string }): void;
}
