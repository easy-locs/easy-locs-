import { useCartStore } from "@/stores/cartStore";

export type { CartItem, CartState, CartModifier } from "@/stores/cartStore";

export function useCart() {
  const store = useCartStore();

  return {
    cart: {
      restaurantId: store.restaurantId,
      restaurantName: store.restaurantName,
      restaurantImage: store.restaurantImage,
      items: store.items,
    },
    addItem: store.addItem,
    updateQuantity: store.updateQuantity,
    removeItem: store.removeItem,
    clearCart: store.clearCart,
    total: store.total(),
    itemCount: store.itemCount(),
  };
}
