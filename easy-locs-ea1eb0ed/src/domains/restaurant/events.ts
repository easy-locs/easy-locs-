import { publishDomainEvent, createDomainEvent } from "../shared/domain-event-bus";
import type { RestaurantEventPort, FoodOrder } from "./ports";

export const restaurantEvents: RestaurantEventPort = {
  orderPlaced(order: FoodOrder) {
    publishDomainEvent(
      createDomainEvent("food:order_placed", order.id, "food_order", {
        orderId: order.id,
        shopId: order.shopId,
        buyerId: order.buyerId,
        sellerId: order.sellerId,
        total: order.total,
        currency: order.currency,
        itemCount: order.items.length,
      }, "restaurant")
    );
  },

  orderAccepted(order: FoodOrder) {
    publishDomainEvent(
      createDomainEvent("food:order_accepted", order.id, "food_order", {
        orderId: order.id,
        shopId: order.shopId,
        buyerId: order.buyerId,
        sellerId: order.sellerId,
        estimatedPrepMinutes: order.estimatedPrepMinutes,
      }, "restaurant")
    );
  },

  orderPreparing(order: FoodOrder) {
    publishDomainEvent(
      createDomainEvent("food:order_preparing", order.id, "food_order", {
        orderId: order.id,
        shopId: order.shopId,
        buyerId: order.buyerId,
        sellerId: order.sellerId,
      }, "restaurant")
    );
  },

  orderReady(order: FoodOrder) {
    publishDomainEvent(
      createDomainEvent("food:order_ready", order.id, "food_order", {
        orderId: order.id,
        shopId: order.shopId,
        buyerId: order.buyerId,
        sellerId: order.sellerId,
      }, "restaurant")
    );
  },

  orderDispatched(order: FoodOrder) {
    publishDomainEvent(
      createDomainEvent("food:order_dispatched", order.id, "food_order", {
        orderId: order.id,
        shopId: order.shopId,
        buyerId: order.buyerId,
        sellerId: order.sellerId,
        deliveryJobId: order.deliveryJobId,
      }, "restaurant")
    );
  },

  orderDelivered(order: FoodOrder) {
    publishDomainEvent(
      createDomainEvent("food:order_delivered", order.id, "food_order", {
        orderId: order.id,
        shopId: order.shopId,
        buyerId: order.buyerId,
        sellerId: order.sellerId,
      }, "restaurant")
    );
  },

  orderCancelled(orderId: string, reason: string, context?: { buyerId?: string; sellerId?: string; shopId?: string }) {
    publishDomainEvent(
      createDomainEvent("food:order_cancelled", orderId, "food_order", {
        orderId,
        reason,
        buyerId: context?.buyerId,
        sellerId: context?.sellerId,
        shopId: context?.shopId,
      }, "restaurant")
    );
  },
};
