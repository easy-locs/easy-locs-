import { bannerCover } from "@/lib/image/category-covers";
/**
 * Dubai Full Category Seeder — 20 shops per vertical across all Dubai areas.
 * Each shop = production-ready but visibility_mode = 'coming_soon'.
 * No outbound messages until explicit activation trigger.
 */

const DUBAI_AREAS = [
  "Dubai Marina", "JLT", "Business Bay", "Downtown Dubai", "JVC",
  "Al Barsha", "Deira", "Dubai Silicon Oasis", "Mirdif", "Motor City",
  "JBR", "DIFC", "Palm Jumeirah", "Al Quoz", "International City",
  "Dubai Hills", "Jumeirah", "Karama", "Bur Dubai", "Discovery Gardens",
];

// Coordinates per area (approximate centers)
const AREA_COORDS: Record<string, { lat: number; lng: number }> = {
  "Dubai Marina": { lat: 25.0805, lng: 55.1403 },
  "JLT": { lat: 25.0742, lng: 55.1457 },
  "Business Bay": { lat: 25.1860, lng: 55.2612 },
  "Downtown Dubai": { lat: 25.1972, lng: 55.2744 },
  "JVC": { lat: 25.0608, lng: 55.2056 },
  "Al Barsha": { lat: 25.1137, lng: 55.1997 },
  "Deira": { lat: 25.2716, lng: 55.3150 },
  "Dubai Silicon Oasis": { lat: 25.1214, lng: 55.3781 },
  "Mirdif": { lat: 25.2175, lng: 55.4228 },
  "Motor City": { lat: 25.0488, lng: 55.2371 },
  "JBR": { lat: 25.0790, lng: 55.1325 },
  "DIFC": { lat: 25.2100, lng: 55.2789 },
  "Palm Jumeirah": { lat: 25.1124, lng: 55.1390 },
  "Al Quoz": { lat: 25.1582, lng: 55.2302 },
  "International City": { lat: 25.1674, lng: 55.4068 },
  "Dubai Hills": { lat: 25.1024, lng: 55.2443 },
  "Jumeirah": { lat: 25.2059, lng: 55.2371 },
  "Karama": { lat: 25.2473, lng: 55.3022 },
  "Bur Dubai": { lat: 25.2560, lng: 55.2955 },
  "Discovery Gardens": { lat: 25.0396, lng: 55.1444 },
};

interface ShopSeed {
  name: string;
  vertical: string;
  category: string;
  subcategory: string;
  area: string;
  lat: number;
  lng: number;
  logo_url: string;
  cover_url: string;
  menu_items: Array<{ name: string; price: number; description: string; category: string }>;
}

// ═══ FOOD ═══
const FOOD_BRANDS = [
  "Pizza Hut", "McDonald's", "KFC", "Subway", "Burger King",
  "Shake Shack", "Five Guys", "Nando's", "Texas Roadhouse", "PF Chang's",
  "Cheesecake Factory", "TGI Friday's", "Applebee's", "Salt Burger", "Operation Falafel",
  "Al Mallah", "Ravi Restaurant", "Tresind Studio", "Zuma Dubai", "La Petite Maison",
];

// ═══ GROCERY ═══
const GROCERY_BRANDS = [
  "Carrefour", "Spinneys", "Lulu Hypermarket", "Choithrams", "Waitrose",
  "Union Coop", "Grandiose", "Kibsons", "InstaShop", "Nesto",
  "Al Maya", "Zoom", "West Zone", "Aswaaq", "Baqala Plus",
  "Talabat Mart", "Noon Daily", "Amazon Fresh", "Geant", "Viva",
];

// ═══ SERVICES ═══
const SERVICE_BRANDS = [
  "Urban Clap", "Justmop", "ServiceMarket", "Mr. Fix", "Handyman UAE",
  "Hitches & Glitches", "Home Fix", "Dubai Electrician", "AC Master UAE", "Plumber Plus",
  "The Luxury Closet", "Washmen", "Champion Cleaners", "Mr Ben's", "Laundry Box",
  "Maid Simple", "Help Maids", "Molly Maid", "Bright & Clean", "The Change Initiative",
];

// ═══ BEAUTY ═══
const BEAUTY_BRANDS = [
  "Tips & Toes", "Sisters Beauty Lounge", "The White Room", "N.Bar", "Pastels Salon",
  "Harvey Nichols Beauty", "Nails Inc", "Glamour Dubai", "Boudoir Salon", "Salon 77",
  "Glow Spa Dubai", "The Nail Spa", "Belle Femme", "Lashes by Glow", "Style Studio",
  "Blow Dubai", "Rush Hair", "Toni & Guy", "Dessange Paris", "Jacques Dessange",
];

// ═══ COFFEE ═══
const COFFEE_BRANDS = [
  "Starbucks", "Costa Coffee", "Tim Hortons", "Caribou Coffee", "% Arabica",
  "Tom & Serg", "The Sum of Us", "Common Grounds", "RAW Coffee Company", "Mokha 1450",
  "Café Rider", "Drop Coffee", "Project Chaiwala", "Five Green", "Coffee Planet",
  "Espresso Lab", "Home Bakery", "Circle Café", "Paul", "Bateel Café",
];

// ═══ DINE OUT ═══
const DINEOUT_BRANDS = [
  "Nobu Dubai", "Pierchic", "At.mosphere", "Tresind Studio", "Ossiano",
  "La Petite Maison", "Roberto's", "Scalini", "BiCE Mare", "Hakkasan",
  "CÉ LA VI", "Hutong", "Zuma", "COYA Dubai", "Nammos",
  "Nusr-Et", "STK Dubai", "Catch Dubai", "Fi'lia", "Amazónico",
];

// ═══ MOBILITY ═══
const MOBILITY_BRANDS = [
  "Careem", "Uber", "Hala Taxi", "Dubai Taxi", "Bolt",
  "Lyft Dubai", "S'hail", "RTA Limo", "Emirates Transport", "Fenix",
  "Beam", "Tier", "Lime", "Byrd Scooters", "Flash Rides",
  "Drive Dubai", "EZ Transport", "MetroLink", "CityCab", "LuxRide",
];

// ═══ PROPERTY ═══
const PROPERTY_BRANDS = [
  "Bayut", "Property Finder", "Dubizzle", "Haus & Haus", "Allsopp & Allsopp",
  "Better Homes", "Betterhomes", "Gulf Sotheby's", "Knight Frank", "Savills",
  "Emaar Properties", "DAMAC", "Nakheel", "Sobha Realty", "Meraas",
  "Dubai Properties", "Azizi Developments", "Danube Properties", "MAG", "Ellington",
];

// ═══ DELIVERY ═══
const DELIVERY_BRANDS = [
  "Talabat", "Deliveroo", "Noon Food", "Zomato", "Careem NOW",
  "UberEats", "Instashop", "ElGrocer", "Quiqup", "Fetchr",
  "Shipa Delivery", "Aramex", "DHL Express", "FedEx", "Emirates Post",
  "Zajel", "Naqel Express", "SMSA", "Jeebly", "Lalamove",
];

// ═══ STAYS ═══
const STAYS_BRANDS = [
  "Marriott Marquis", "Atlantis The Palm", "Burj Al Arab", "One&Only", "Jumeirah Beach Hotel",
  "Palazzo Versace", "Address Downtown", "Ritz-Carlton DIFC", "W Dubai", "St. Regis",
  "Kempinski", "Four Seasons DIFC", "Mandarin Oriental", "Park Hyatt", "Sofitel",
  "Hilton Dubai", "JW Marriott", "InterContinental", "Conrad Dubai", "Waldorf Astoria",
];

// ═══ TRAVEL ═══
const TRAVEL_BRANDS = [
  "Emirates", "Flydubai", "Arabian Adventures", "DNATA Travel", "Al Rostamani",
  "Musafir", "Cleartrip", "MakeMyTrip", "Skyscanner Dubai", "Wego",
  "Holiday Factory", "Thomas Cook", "Rayna Tours", "Big Bus Dubai", "Viator",
  "GetYourGuide", "Klook", "Headout", "TripAdvisor", "Sun & Sand",
];

// ═══ CONCIERGE ═══
const CONCIERGE_BRANDS = [
  "Quintessentially", "John Paul", "Ten Lifestyle", "Velocity Black", "Bureau",
  "Innerplace", "Pure Entertainment", "Billionaire Concierge", "The One Concierge", "VIP Dubai",
  "Elysium Concierge", "Luxe Global", "Golden Key", "Emirates Concierge", "Elite Lifestyle",
  "Dubai VIP Services", "Royal Concierge", "The Fixer", "Access Dubai", "Prima Concierge",
];

// ═══ RENTALS ═══
const RENTALS_BRANDS = [
  "Hertz", "Avis", "Budget", "Sixt", "Thrifty",
  "Enterprise", "National Car", "Dollar Rent", "Europcar", "ekar",
  "Udrive", "Careem Car", "Shift Car", "OneClickDrive", "Donkey Republic",
  "FastRent", "SpeedyDrive", "AutoLease", "DXB Cars", "Prestige Rentals",
];

// ═══ WALLET/PAY ═══
const WALLET_BRANDS = [
  "LOCs Pay", "Apple Pay", "Samsung Pay", "Google Pay", "PayBy",
  "Beam Wallet", "Botim Pay", "Payit", "Etisalat Wallet", "du Pay",
  "Noon Pay", "Tabby", "Tamara", "PostPay", "Spotii",
  "CashU", "PayFort", "Telr", "Network International", "Magnati",
];

const CATEGORY_MAP: Record<string, { brands: string[]; vertical: string; subcategory: string; menu: Array<{ name: string; price: number; description: string; category: string }> }> = {
  food: {
    brands: FOOD_BRANDS, vertical: "food", subcategory: "restaurant",
    menu: [
      { name: "Signature Burger", price: 45, description: "Premium beef patty with special sauce", category: "mains" },
      { name: "Grilled Chicken", price: 38, description: "Herb-marinated chicken breast", category: "mains" },
      { name: "Caesar Salad", price: 28, description: "Romaine, croutons, parmesan", category: "starters" },
      { name: "Fries", price: 15, description: "Crispy golden fries", category: "sides" },
      { name: "Soft Drink", price: 8, description: "Pepsi / Coca-Cola", category: "drinks" },
    ],
  },
  grocery: {
    brands: GROCERY_BRANDS, vertical: "grocery", subcategory: "supermarket",
    menu: [
      { name: "Fresh Vegetables Box", price: 35, description: "Seasonal mixed vegetables", category: "fresh" },
      { name: "Fruit Basket", price: 45, description: "Premium mixed fruits", category: "fresh" },
      { name: "Dairy Essentials", price: 28, description: "Milk, cheese, yogurt pack", category: "dairy" },
      { name: "Pantry Basics", price: 55, description: "Rice, oil, bread, eggs", category: "pantry" },
    ],
  },
  services: {
    brands: SERVICE_BRANDS, vertical: "services", subcategory: "home_services",
    menu: [
      { name: "Deep Cleaning", price: 199, description: "Full apartment deep clean", category: "cleaning" },
      { name: "AC Service", price: 120, description: "AC cleaning & maintenance", category: "maintenance" },
      { name: "Plumbing Fix", price: 89, description: "Basic plumbing repair", category: "repair" },
      { name: "Painting Service", price: 299, description: "Room painting per room", category: "renovation" },
    ],
  },
  beauty: {
    brands: BEAUTY_BRANDS, vertical: "services", subcategory: "beauty",
    menu: [
      { name: "Manicure", price: 75, description: "Classic manicure with polish", category: "nails" },
      { name: "Pedicure", price: 95, description: "Deluxe pedicure treatment", category: "nails" },
      { name: "Hair Styling", price: 150, description: "Wash, cut & blow-dry", category: "hair" },
      { name: "Facial Treatment", price: 220, description: "Deep cleansing facial", category: "skin" },
    ],
  },
  coffee: {
    brands: COFFEE_BRANDS, vertical: "food", subcategory: "coffee",
    menu: [
      { name: "Espresso", price: 15, description: "Single shot espresso", category: "hot" },
      { name: "Cappuccino", price: 22, description: "Espresso with steamed milk", category: "hot" },
      { name: "Iced Latte", price: 25, description: "Cold brew with milk", category: "cold" },
      { name: "Croissant", price: 18, description: "Butter croissant", category: "pastry" },
    ],
  },
  dineout: {
    brands: DINEOUT_BRANDS, vertical: "food", subcategory: "fine_dining",
    menu: [
      { name: "Chef's Tasting Menu", price: 450, description: "7-course signature experience", category: "tasting" },
      { name: "Wagyu Steak", price: 320, description: "A5 Japanese Wagyu 200g", category: "mains" },
      { name: "Sushi Platter", price: 180, description: "12-piece premium selection", category: "starters" },
      { name: "Signature Cocktail", price: 65, description: "House creation", category: "drinks" },
    ],
  },
  mobility: {
    brands: MOBILITY_BRANDS, vertical: "services", subcategory: "transport",
    menu: [
      { name: "Economy Ride", price: 15, description: "Standard sedan ride", category: "rides" },
      { name: "Premium Ride", price: 35, description: "Luxury vehicle", category: "rides" },
      { name: "XL Ride", price: 25, description: "SUV / minivan", category: "rides" },
    ],
  },
  property: {
    brands: PROPERTY_BRANDS, vertical: "services", subcategory: "real_estate",
    menu: [
      { name: "Studio Viewing", price: 0, description: "Book a studio apartment viewing", category: "viewing" },
      { name: "1BR Viewing", price: 0, description: "1 bedroom apartment viewing", category: "viewing" },
      { name: "Villa Viewing", price: 0, description: "Villa/townhouse viewing", category: "viewing" },
    ],
  },
  delivery: {
    brands: DELIVERY_BRANDS, vertical: "services", subcategory: "logistics",
    menu: [
      { name: "Same Day Delivery", price: 25, description: "Deliver within 4 hours", category: "express" },
      { name: "Next Day Delivery", price: 15, description: "Standard next-day", category: "standard" },
      { name: "International", price: 89, description: "International shipping", category: "international" },
    ],
  },
  stays: {
    brands: STAYS_BRANDS, vertical: "services", subcategory: "hotel",
    menu: [
      { name: "Standard Room", price: 450, description: "Per night, city view", category: "rooms" },
      { name: "Deluxe Suite", price: 1200, description: "Per night, sea view", category: "suites" },
      { name: "Day Pass", price: 199, description: "Pool & beach access", category: "day_use" },
    ],
  },
  travel: {
    brands: TRAVEL_BRANDS, vertical: "services", subcategory: "travel",
    menu: [
      { name: "City Tour", price: 150, description: "Half-day Dubai city tour", category: "tours" },
      { name: "Desert Safari", price: 199, description: "Evening desert experience", category: "tours" },
      { name: "Dhow Cruise", price: 120, description: "Marina dinner cruise", category: "tours" },
    ],
  },
  concierge: {
    brands: CONCIERGE_BRANDS, vertical: "services", subcategory: "concierge",
    menu: [
      { name: "VIP Airport Transfer", price: 350, description: "Luxury airport pickup", category: "transfer" },
      { name: "Restaurant Booking", price: 50, description: "Priority reservation", category: "booking" },
      { name: "Event Planning", price: 500, description: "Custom event arrangement", category: "events" },
    ],
  },
  rentals: {
    brands: RENTALS_BRANDS, vertical: "services", subcategory: "car_rental",
    menu: [
      { name: "Economy Car / Day", price: 89, description: "Toyota Yaris or similar", category: "economy" },
      { name: "SUV / Day", price: 199, description: "Nissan Patrol or similar", category: "suv" },
      { name: "Luxury / Day", price: 499, description: "Mercedes S-Class or similar", category: "luxury" },
    ],
  },
  wallet: {
    brands: WALLET_BRANDS, vertical: "services", subcategory: "fintech",
    menu: [
      { name: "Instant Transfer", price: 0, description: "Send money instantly", category: "transfer" },
      { name: "Bill Payment", price: 2, description: "Pay utility bills", category: "bills" },
    ],
  },
};

// Logo placeholders using UI Avatars
function logoUrl(name: string): string {
  const encoded = encodeURIComponent(name.slice(0, 2));
  const colors = ["7C3AED", "2563EB", "059669", "D97706", "DC2626", "0891B2", "4F46E5", "9333EA"];
  const color = colors[name.length % colors.length];
  return `https://ui-avatars.com/api/?name=${encoded}&background=${color}&color=fff&size=256&bold=true&format=png`;
}

function coverUrl(category: string, _index: number): string {
  const photos: Record<string, string> = {
    food: bannerCover("food"),
    grocery: bannerCover("grocery"),
    services: bannerCover("services"),
    beauty: bannerCover("salon"),
    coffee: bannerCover("coffee"),
    dineout: bannerCover("dining"),
    mobility: bannerCover("mobility"),
    property: bannerCover("property"),
    delivery: bannerCover("delivery"),
    stays: bannerCover("hotel"),
    travel: bannerCover("travel"),
    concierge: bannerCover("concierge"),
    rentals: bannerCover("rentals"),
    wallet: bannerCover("fintech"),
  };
  return photos[category] || bannerCover(category);
}

function jitter(base: number, range = 0.008): number {
  return base + (Math.random() - 0.5) * range;
}

export function generateAllCategorySeeds(): ShopSeed[] {
  const seeds: ShopSeed[] = [];

  for (const [catKey, config] of Object.entries(CATEGORY_MAP)) {
    for (let i = 0; i < 20; i++) {
      const brand = config.brands[i];
      const area = DUBAI_AREAS[i % DUBAI_AREAS.length];
      const coords = AREA_COORDS[area];
      
      seeds.push({
        name: brand,
        vertical: config.vertical,
        category: catKey,
        subcategory: config.subcategory,
        area,
        lat: jitter(coords.lat),
        lng: jitter(coords.lng),
        logo_url: logoUrl(brand),
        cover_url: coverUrl(catKey, i),
        menu_items: config.menu,
      });
    }
  }

  return seeds;
}

export type { ShopSeed };
