/**
 * cartStore — Zustand-based single-merchant cart with localStorage persistence.
 * Source of truth for cart state across all food/storefront ordering flows.
 */
import { create } from "zustand";

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
  shopId: string | null;
  items: CartItem[];
}

const CART_KEY = "easylocs_cart";

function loadFromStorage(): CartState {
  try {
    const raw = localStorage.getItem(CART_KEY);
    return raw ? JSON.parse(raw) : emptyCart();
  } catch {
    return emptyCart();
  }
}

function emptyCart(): CartState {
  return { restaurantId: null, restaurantName: null, restaurantImage: null, shopId: null, items: [] };
}

function persist(state: CartState) {
  localStorage.setItem(CART_KEY, JSON.stringify(state));
}

type CartActions = {
  addItem: (
    restaurant: { id: string; name: string; image?: string | null; shopId?: string },
    item: Omit<CartItem, "id" | "quantity">,
    qty?: number
  ) => void;
  updateQuantity: (itemId: string, qty: number) => void;
  removeItem: (itemId: string) => void;
  updateItemNotes: (itemId: string, notes: string) => void;
  clearCart: () => void;
};

type CartComputed = {
  total: () => number;
  itemCount: () => number;
};

export const useCartStore = create<CartState & CartActions & CartComputed>((set, get) => ({
  ...loadFromStorage(),

  addItem: (restaurant, item, qty = 1) => {
    set((state) => {
      const isDifferentRestaurant = state.restaurantId && state.restaurantId !== restaurant.id;
      const items = isDifferentRestaurant ? [] : [...state.items];

      const existing = items.find((i) => i.menuItemId === item.menuItemId);
      if (existing) {
        existing.quantity += qty;
      } else {
        items.push({ ...item, id: crypto.randomUUID(), quantity: qty });
      }

      const next: CartState = {
        restaurantId: restaurant.id,
        restaurantName: restaurant.name,
        restaurantImage: restaurant.image ?? null,
        shopId: restaurant.shopId ?? state.shopId,
        items,
      };
      persist(next);
      return next;
    });
  },

  updateQuantity: (itemId, qty) => {
    set((state) => {
      const next: CartState = {
        ...state,
        items: qty <= 0
          ? state.items.filter((i) => i.id !== itemId)
          : state.items.map((i) => (i.id === itemId ? { ...i, quantity: qty } : i)),
      };
      persist(next);
      return next;
    });
  },

  removeItem: (itemId) => {
    set((state) => {
      const next: CartState = { ...state, items: state.items.filter((i) => i.id !== itemId) };
      persist(next);
      return next;
    });
  },

  updateItemNotes: (itemId, notes) => {
    set((state) => {
      const next: CartState = {
        ...state,
        items: state.items.map((i) => (i.id === itemId ? { ...i, notes } : i)),
      };
      persist(next);
      return next;
    });
  },

  clearCart: () => {
    const next = emptyCart();
    persist(next);
    set(next);
  },

  total: () => get().items.reduce((s, i) => s + i.unitPrice * i.quantity, 0),
  itemCount: () => get().items.reduce((s, i) => s + i.quantity, 0),
}));
