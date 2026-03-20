import { autofillRestaurantsBatch, AutofillMerchantInput } from "./restaurantAutofillEngine";

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

function makePizzaSeedList(): AutofillMerchantInput[] {
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

  const rows: AutofillMerchantInput[] = [];

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
  return autofillRestaurantsBatch(seed);
}
