/**
 * Dubai Test Dataset — 50 restaurants across 5 areas.
 */
import type { ImportedMerchantRecord } from "@/lib/growth/types";

const AREAS = ["Marina", "JLT", "Business Bay", "Al Barsha", "Deira"];

const PIZZA_NAMES = [
  "Pizza Roma", "Napoli Express", "Il Forno", "Pizza Maestro", "La Dolce Pizza",
  "Bella Napoli", "Pizza Fresca", "Fuoco Pizza", "Trattoria Pizza", "Margherita House",
  "Pizzeria Sole", "Da Luigi Pizza", "Pizza Paradiso", "Vesuvio Pizza", "Antico Forno",
  "La Stella Pizza", "Pizza Rustica", "Firenze Pizza", "Sicilia Pizza", "Roma Mia Pizza",
];

const BURGER_NAMES = [
  "Smash Bros Burger", "The Patty Lab", "Grill House", "Burger Republik", "Flame Grill",
  "Stack Burger", "Juicy Lucy's", "The Bun House", "Charcoal Grill", "Fat Burger Co",
  "Burger District", "Prime Burgers", "Wagyu Corner", "Double Stack", "The Grind Burger",
];

const ARABIC_NAMES = [
  "Shawarma King", "Al Reef Grill", "Bab Al Shams Kitchen", "Falafel Street", "Sultan's Table",
  "Beirut Bites", "Damascus Kitchen", "Levant Grill", "Arabian Nights Kitchen", "Mezze House",
  "Shawarma Palace", "Al Halabi Kitchen", "Zaatar Express", "Manakeesh Station", "Kebab Republic",
];

const PIZZA_MENU = [
  { name: "Margherita", price: 35, category: "Pizza" },
  { name: "Pepperoni", price: 42, category: "Pizza" },
  { name: "Quattro Formaggi", price: 48, category: "Pizza" },
  { name: "Diavola", price: 45, category: "Pizza" },
  { name: "Garlic Bread", price: 18, category: "Sides" },
  { name: "Coca-Cola", price: 8, category: "Drinks" },
];

const BURGER_MENU = [
  { name: "Classic Smash", price: 38, category: "Burgers" },
  { name: "Double Stack", price: 52, category: "Burgers" },
  { name: "Chicken Burger", price: 35, category: "Burgers" },
  { name: "Loaded Fries", price: 22, category: "Sides" },
  { name: "Milkshake", price: 25, category: "Drinks" },
];

const ARABIC_MENU = [
  { name: "Shawarma Chicken", price: 25, category: "Mains" },
  { name: "Shawarma Meat", price: 30, category: "Mains" },
  { name: "Falafel Plate", price: 22, category: "Mains" },
  { name: "Hummus", price: 15, category: "Mezze" },
  { name: "Fattoush", price: 18, category: "Salads" },
  { name: "Ayran", price: 8, category: "Drinks" },
];

function buildRecord(
  name: string,
  area: string,
  cuisineType: string,
  menu: Array<{ name: string; price: number; category: string }>,
  index: number
): ImportedMerchantRecord {
  return {
    sourceType: "internal_seed",
    sourceExternalId: `test_dubai_${index}_${Date.now()}`,
    sourceName: "dubai_test_batch",
    vertical: "food",
    merchantName: name,
    city: "Dubai",
    area,
    countryCode: "AE",
    cuisineType,
    tags: [cuisineType.toLowerCase(), "test", area.toLowerCase().replace(/\s+/g, "-")],
    rating: Math.round((3.5 + Math.random() * 1.5) * 10) / 10,
    reviewCount: Math.floor(20 + Math.random() * 200),
    description: `${name} — Fresh ${cuisineType.toLowerCase()} in ${area}, Dubai.`,
    menuItems: menu.map((m) => ({
      name: m.name,
      category: m.category,
      price: m.price,
      currency: "AED",
    })),
  };
}

export function generateDubaiTestDataset(): ImportedMerchantRecord[] {
  const records: ImportedMerchantRecord[] = [];
  let idx = 0;

  // 20 pizza
  for (let i = 0; i < 20; i++) {
    const area = AREAS[i % AREAS.length];
    records.push(buildRecord(PIZZA_NAMES[i], area, "Pizza", PIZZA_MENU, idx++));
  }

  // 15 burger
  for (let i = 0; i < 15; i++) {
    const area = AREAS[i % AREAS.length];
    records.push(buildRecord(BURGER_NAMES[i], area, "Burgers", BURGER_MENU, idx++));
  }

  // 15 arabic
  for (let i = 0; i < 15; i++) {
    const area = AREAS[i % AREAS.length];
    records.push(buildRecord(ARABIC_NAMES[i], area, "Arabic", ARABIC_MENU, idx++));
  }

  return records;
}
