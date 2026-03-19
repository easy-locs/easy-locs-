/**
 * useCart — Global food cart hook with Zustand-like local state.
 * Single-restaurant cart. Adding from a different restaurant resets the cart.
 * Prices are stored internally (hidden from menu UI, used for checkout).
 */
import { useState, useCallback, useMemo } from "react";

export interface CartItem {
  id: string;
  menuItemId: string;
  name: string;
  description?: string;
  imageUrl?: string;
  quantity: number;
  unitPrice: number;
  notes?: string;
  modifiers?: string[];
}

export interface CartState {
  restaurantId: string | null;
  restaurantName: string | null;
  restaurantImage?: string | null;
  items: CartItem[];
}

const CART_KEY = "easylocs_cart";

function loadCart(): CartState {
  try {
    const raw = localStorage.getItem(CART_KEY);
    return raw ? JSON.parse(raw) : { restaurantId: null, restaurantName: null, items: [] };
  } catch {
    return { restaurantId: null, restaurantName: null, items: [] };
  }
}

function saveCart(state: CartState) {
  localStorage.setItem(CART_KEY, JSON.stringify(state));
}

export function useCart() {
  const [cart, setCart] = useState<CartState>(loadCart);

  const updateCart = useCallback((updater: (prev: CartState) => CartState) => {
    setCart((prev) => {
      const next = updater(prev);
      saveCart(next);
      return next;
    });
  }, []);

  const addItem = useCallback((
    restaurant: { id: string; name: string; image?: string | null },
    item: Omit<CartItem, "id" | "quantity">,
    qty = 1
  ) => {
    updateCart((prev) => {
      // Different restaurant → reset
      const items = prev.restaurantId && prev.restaurantId !== restaurant.id ? [] : [...prev.items];
      const existing = items.find((i) => i.menuItemId === item.menuItemId);
      if (existing) {
        existing.quantity += qty;
      } else {
        items.push({ ...item, id: crypto.randomUUID(), quantity: qty });
      }
      return { restaurantId: restaurant.id, restaurantName: restaurant.name, restaurantImage: restaurant.image, items };
    });
  }, [updateCart]);

  const updateQuantity = useCallback((itemId: string, qty: number) => {
    updateCart((prev) => ({
      ...prev,
      items: qty <= 0 ? prev.items.filter((i) => i.id !== itemId) : prev.items.map((i) => i.id === itemId ? { ...i, quantity: qty } : i),
    }));
  }, [updateCart]);

  const removeItem = useCallback((itemId: string) => {
    updateCart((prev) => ({ ...prev, items: prev.items.filter((i) => i.id !== itemId) }));
  }, [updateCart]);

  const clearCart = useCallback(() => {
    updateCart(() => ({ restaurantId: null, restaurantName: null, items: [] }));
  }, [updateCart]);

  const total = useMemo(() => cart.items.reduce((s, i) => s + i.unitPrice * i.quantity, 0), [cart.items]);
  const itemCount = useMemo(() => cart.items.reduce((s, i) => s + i.quantity, 0), [cart.items]);

  return { cart, addItem, updateQuantity, removeItem, clearCart, total, itemCount };
}
