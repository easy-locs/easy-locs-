import { autoOnboardMerchant } from "@/lib/merchant/onboarding";

const DUBAI_AREAS = [
  "Dubai Marina",
  "JLT",
  "Business Bay",
  "Downtown Dubai",
  "JVC",
  "Al Barsha",
  "Deira",
  "Dubai Silicon Oasis",
  "Mirdif",
  "Motor City",
];

function makePizzaSeedList() {
  const baseNames = [
    "Pizza Times",
    "Fire Slice",
    "Urban Pizza",
    "Moon Pizza",
    "Royal Dough",
    "Speed Pizza",
    "Hot Stone Pizza",
    "Milano Slice",
    "Street Pizza",
    "Go Pizza",
  ];

  const rows: Array<{ name: string; area: string; city: string; cuisine: string; subcategory: string }> = [];

  for (const area of DUBAI_AREAS) {
    for (const base of baseNames) {
      rows.push({
        name: `${base} ${area}`,
        area,
        city: "Dubai",
        cuisine: "pizza",
        subcategory: "pizza",
      });
    }
  }

  return rows;
}

export async function runDubaiPizzaAutofill(limit = 50) {
  const seed = makePizzaSeedList().slice(0, limit);
  const results: Array<{ name: string; ok: boolean; merchantId?: string; error?: string }> = [];
  for (const input of seed) {
    try {
      const merchant = await autoOnboardMerchant({
        name: input.name,
        category: "food",
        subcategory: input.subcategory,
        city: input.city,
        area: input.area,
        items: [
          { name: "Margherita", description: "Tomato sauce, mozzarella, basil", price: 29, category: "pizza" },
          { name: "Pepperoni", description: "Tomato sauce, mozzarella, pepperoni", price: 34, category: "pizza" },
          { name: "Garlic Bread", description: "Fresh baked garlic bread", price: 14, category: "sides" },
          { name: "Water 500ml", description: "Mineral water", price: 4, category: "drinks" },
        ],
      });
      results.push({ name: input.name, ok: true, merchantId: merchant.id });
    } catch (error: any) {
      results.push({ name: input.name, ok: false, error: error?.message || "Autofill failed" });
    }
  }
  return results;
}
