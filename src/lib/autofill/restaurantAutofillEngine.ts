import { supabase } from "@/integrations/supabase/client";

export type AutofillMerchantInput = {
  name: string;
  area: string;
  city?: string;
  subcategory?: string;
  cuisine?: string;
  coverImage?: string | null;
};

const DEFAULT_PIZZA_ITEMS = [
  { name: "Margherita", description: "Tomato sauce, mozzarella, basil", price: 29, category: "pizza" },
  { name: "Pepperoni", description: "Tomato sauce, mozzarella, pepperoni", price: 34, category: "pizza" },
  { name: "BBQ Chicken", description: "BBQ sauce, chicken, onion", price: 37, category: "pizza" },
  { name: "Vegetarian", description: "Mushroom, peppers, olives, onion", price: 33, category: "pizza" },
  { name: "Hawaiian", description: "Turkey ham, pineapple, mozzarella", price: 35, category: "pizza" },
  { name: "Garlic Bread", description: "Fresh baked garlic bread", price: 14, category: "sides" },
  { name: "Cheesy Bread", description: "Oven baked cheesy bread", price: 18, category: "sides" },
  { name: "Coca Cola 330ml", description: "Soft drink", price: 6, category: "drinks" },
  { name: "Water 500ml", description: "Mineral water", price: 4, category: "drinks" },
  { name: "Chocolate Pizza", description: "Sweet dessert pizza", price: 25, category: "dessert" },
];

async function createMerchantDraft(input: AutofillMerchantInput) {
  const payload = {
    name: input.name,
    category: "food",
    subcategory: input.subcategory ?? input.cuisine ?? "pizza",
    city: input.city ?? "Dubai",
    area: input.area,
    cover_image: input.coverImage ?? null,
    is_open: true,
    is_active: true,
    is_featured: false,
    onboarding_status: "ready",
    visibility_score: 75,
    rating: 4.2,
    review_count: 0,
    delivery_time_min: 20,
    delivery_time_max: 35,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await (supabase as any)
    .from("seed_merchants")
    .insert(payload)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

async function createMerchantMenu(merchantId: string) {
  const rows = DEFAULT_PIZZA_ITEMS.map((item, index) => ({
    merchant_id: merchantId,
    name: item.name,
    description: item.description,
    price: item.price,
    category: item.category,
    image: null,
    sort_order: index + 1,
    is_available: true,
  }));

  const { error } = await (supabase as any).from("seed_products").insert(rows);
  if (error) throw error;

  return rows.length;
}

export async function autofillSingleRestaurant(input: AutofillMerchantInput) {
  const merchant = await createMerchantDraft(input);
  const itemsCreated = await createMerchantMenu(merchant.id);

  return {
    merchantId: merchant.id,
    merchantName: merchant.name,
    itemsCreated,
    ok: true,
  };
}

export async function autofillRestaurantsBatch(inputs: AutofillMerchantInput[]) {
  const results: Array<{
    name: string;
    ok: boolean;
    merchantId?: string;
    itemsCreated?: number;
    error?: string;
  }> = [];

  for (const input of inputs) {
    try {
      const res = await autofillSingleRestaurant(input);
      results.push({
        name: input.name,
        ok: true,
        merchantId: res.merchantId,
        itemsCreated: res.itemsCreated,
      });
    } catch (e: any) {
      results.push({
        name: input.name,
        ok: false,
        error: e.message || "Autofill failed",
      });
    }
  }

  return results;
}
