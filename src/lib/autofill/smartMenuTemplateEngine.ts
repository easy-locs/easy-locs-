export type MenuTemplateType = "pizza" | "burger" | "shawarma" | "sushi";

export function getSmartMenuTemplate(type: MenuTemplateType) {
  if (type === "burger") {
    return [
      { name: "Classic Burger", description: "Beef patty, lettuce, tomato", price: 28, category: "burgers" },
      { name: "Cheese Burger", description: "Beef patty, cheddar cheese", price: 31, category: "burgers" },
      { name: "Chicken Burger", description: "Crispy chicken burger", price: 29, category: "burgers" },
      { name: "Fries", description: "Golden fries", price: 12, category: "sides" },
      { name: "Cola", description: "Soft drink", price: 6, category: "drinks" },
    ];
  }

  if (type === "shawarma") {
    return [
      { name: "Chicken Shawarma", description: "Arabic bread, garlic sauce", price: 18, category: "shawarma" },
      { name: "Meat Shawarma", description: "Beef strips, tahini sauce", price: 21, category: "shawarma" },
      { name: "Fries", description: "Crispy fries", price: 10, category: "sides" },
      { name: "Soft Drink", description: "Cold beverage", price: 5, category: "drinks" },
    ];
  }

  if (type === "sushi") {
    return [
      { name: "California Roll", description: "Crab stick, avocado, cucumber", price: 32, category: "sushi" },
      { name: "Salmon Roll", description: "Fresh salmon roll", price: 38, category: "sushi" },
      { name: "Miso Soup", description: "Traditional soup", price: 12, category: "sides" },
      { name: "Water", description: "Mineral water", price: 4, category: "drinks" },
    ];
  }

  return [
    { name: "Margherita", description: "Tomato sauce, mozzarella, basil", price: 29, category: "pizza" },
    { name: "Pepperoni", description: "Pepperoni and mozzarella", price: 34, category: "pizza" },
    { name: "BBQ Chicken", description: "BBQ chicken pizza", price: 37, category: "pizza" },
    { name: "Garlic Bread", description: "Fresh baked bread", price: 14, category: "sides" },
    { name: "Coke", description: "Soft drink", price: 6, category: "drinks" },
  ];
}
