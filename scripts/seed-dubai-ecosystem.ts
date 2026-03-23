/**
 * Dubai ecosystem seed data generator.
 * Outputs JSON for bulk import across all 8 verticals.
 */

const AREAS = [
  "Dubai Marina", "Downtown Dubai", "JLT", "Business Bay", "JVC",
  "Al Barsha", "Deira", "Bur Dubai", "Jumeirah", "DIFC",
  "Silicon Oasis", "Al Quoz", "Mirdif", "Karama", "Palm Jumeirah",
  "City Walk", "Motor City", "Sports City", "International City", "Tecom",
];

function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }
function rating(): number { return +(3.5 + Math.random() * 1.5).toFixed(1); }
function reviews(): number { return Math.floor(10 + Math.random() * 300); }

interface SeedBiz {
  name: string;
  category: string;
  subcategory: string;
  city: string;
  area: string;
  items: { name: string; description: string; price: number }[];
}

const FOOD: SeedBiz[] = [
  // Burger
  { name: "Smash Lab Marina", category: "food", subcategory: "burger", city: "Dubai", area: "Dubai Marina", items: [{ name: "Classic Smash", description: "Double patty, cheddar, pickles", price: 42 }, { name: "Truffle Smash", description: "Truffle aioli, mushrooms", price: 55 }, { name: "Fries", description: "Crispy seasoned", price: 15 }] },
  { name: "Burger Republic", category: "food", subcategory: "burger", city: "Dubai", area: "Business Bay", items: [{ name: "Texas BBQ", description: "Smoked brisket, BBQ sauce", price: 48 }, { name: "Veggie Stack", description: "Plant-based patty", price: 38 }] },
  // Sushi
  { name: "Sushi Lab Downtown", category: "food", subcategory: "sushi", city: "Dubai", area: "Downtown Dubai", items: [{ name: "Salmon Nigiri Set", description: "8 pcs", price: 65 }, { name: "Dragon Roll", description: "Eel, avocado", price: 52 }] },
  { name: "Maki Express JLT", category: "food", subcategory: "sushi", city: "Dubai", area: "JLT", items: [{ name: "California Roll", description: "6 pcs", price: 35 }, { name: "Tuna Sashimi", description: "5 pcs", price: 45 }] },
  // Indian
  { name: "Spice Route Deira", category: "food", subcategory: "indian", city: "Dubai", area: "Deira", items: [{ name: "Butter Chicken", description: "Creamy tomato curry", price: 35 }, { name: "Biryani", description: "Lamb dum biryani", price: 42 }, { name: "Naan", description: "Tandoori bread", price: 8 }] },
  { name: "Curry House Karama", category: "food", subcategory: "indian", city: "Dubai", area: "Karama", items: [{ name: "Masala Dosa", description: "South Indian crepe", price: 22 }, { name: "Thali", description: "Complete meal", price: 30 }] },
  // Lebanese
  { name: "Beirut Nights DIFC", category: "food", subcategory: "lebanese", city: "Dubai", area: "DIFC", items: [{ name: "Mixed Grill", description: "Kebab, shish tawook, kofte", price: 75 }, { name: "Fattoush", description: "Fresh garden salad", price: 28 }] },
  { name: "Zaatar Factory", category: "food", subcategory: "lebanese", city: "Dubai", area: "Al Barsha", items: [{ name: "Manoushe", description: "Za'atar flatbread", price: 15 }, { name: "Shawarma Plate", description: "Chicken, garlic sauce", price: 30 }] },
  // Cafe
  { name: "Brew & Bean", category: "food", subcategory: "cafe", city: "Dubai", area: "City Walk", items: [{ name: "Flat White", description: "Double shot", price: 22 }, { name: "Avocado Toast", description: "Sourdough, poached egg", price: 38 }] },
  { name: "Third Wave Coffee", category: "food", subcategory: "cafe", city: "Dubai", area: "Al Quoz", items: [{ name: "Pour Over", description: "Single origin", price: 28 }, { name: "Matcha Latte", description: "Organic matcha", price: 25 }] },
  // Bakery
  { name: "Le Petrin Artisan", category: "food", subcategory: "bakery", city: "Dubai", area: "Jumeirah", items: [{ name: "Croissant", description: "Butter croissant", price: 16 }, { name: "Sourdough Loaf", description: "Fresh baked", price: 28 }] },
  // Desserts
  { name: "Sugar Rush Dubai", category: "food", subcategory: "desserts", city: "Dubai", area: "Dubai Marina", items: [{ name: "Kunafa Cheesecake", description: "Fusion dessert", price: 35 }, { name: "Gelato Cup", description: "3 scoops", price: 25 }] },
  // Italian
  { name: "Pasta Fresca JBR", category: "food", subcategory: "italian", city: "Dubai", area: "Dubai Marina", items: [{ name: "Truffle Pasta", description: "Fresh tagliatelle", price: 68 }, { name: "Margherita Pizza", description: "Wood-fired", price: 45 }] },
  // Seafood
  { name: "Ocean Basket Palm", category: "food", subcategory: "seafood", city: "Dubai", area: "Palm Jumeirah", items: [{ name: "Grilled Lobster", description: "Atlantic lobster", price: 180 }, { name: "Fish & Chips", description: "Cod fillet", price: 55 }] },
  // Chinese
  { name: "Wok Station", category: "food", subcategory: "chinese", city: "Dubai", area: "International City", items: [{ name: "Kung Pao Chicken", description: "Spicy wok-fried", price: 38 }, { name: "Dim Sum Platter", description: "8 pcs assorted", price: 45 }] },
  // Healthy
  { name: "Green Bowl Studio", category: "food", subcategory: "healthy", city: "Dubai", area: "DIFC", items: [{ name: "Acai Bowl", description: "Granola, berries", price: 42 }, { name: "Protein Salad", description: "Grilled chicken, quinoa", price: 48 }] },
  // Fast food
  { name: "Crispy Corner", category: "food", subcategory: "fried_chicken", city: "Dubai", area: "Deira", items: [{ name: "Bucket 8pc", description: "Original recipe", price: 55 }, { name: "Spicy Wings", description: "6 pcs", price: 28 }] },
  // Breakfast
  { name: "Morning Glory", category: "food", subcategory: "breakfast", city: "Dubai", area: "Business Bay", items: [{ name: "Full English", description: "Eggs, bacon, beans, toast", price: 45 }, { name: "Pancake Stack", description: "Maple syrup, berries", price: 35 }] },
  // Japanese
  { name: "Ramen House", category: "food", subcategory: "japanese", city: "Dubai", area: "Tecom", items: [{ name: "Tonkotsu Ramen", description: "Pork broth, chashu", price: 52 }, { name: "Gyoza", description: "6 pcs pan-fried", price: 30 }] },
];

const GROCERY: SeedBiz[] = [
  { name: "Fresh Market Downtown", category: "grocery", subcategory: "supermarket", city: "Dubai", area: "Downtown Dubai", items: [{ name: "Organic Basket", description: "Weekly mix", price: 120 }, { name: "Milk 2L", description: "Full cream", price: 12 }] },
  { name: "Mini Mart JVC", category: "grocery", subcategory: "mini_mart", city: "Dubai", area: "JVC", items: [{ name: "Snack Pack", description: "Assorted chips", price: 25 }, { name: "Water 12-Pack", description: "500ml bottles", price: 15 }] },
  { name: "Green Leaf Organic", category: "grocery", subcategory: "organic_store", city: "Dubai", area: "Jumeirah", items: [{ name: "Organic Eggs", description: "Free range 12 pcs", price: 28 }, { name: "Quinoa 500g", description: "Organic", price: 22 }] },
  { name: "Al Madina Butchery", category: "grocery", subcategory: "butcher", city: "Dubai", area: "Deira", items: [{ name: "Lamb Leg 1kg", description: "Fresh local", price: 65 }, { name: "Chicken Whole", description: "1.5kg", price: 25 }] },
  { name: "Fruit Stop Marina", category: "grocery", subcategory: "fruits_vegetables", city: "Dubai", area: "Dubai Marina", items: [{ name: "Mixed Fruit Box", description: "Seasonal selection", price: 45 }, { name: "Veggie Bundle", description: "Daily essentials", price: 30 }] },
  { name: "Juice Lab DIFC", category: "grocery", subcategory: "beverages_store", city: "Dubai", area: "DIFC", items: [{ name: "Cold Press Juice", description: "Green detox", price: 22 }, { name: "Smoothie Bowl", description: "Mango coconut", price: 32 }] },
];

const SHOPS: SeedBiz[] = [
  { name: "Thread & Co", category: "shops", subcategory: "fashion", city: "Dubai", area: "City Walk", items: [{ name: "Summer Dress", description: "Cotton blend", price: 180 }, { name: "Linen Shirt", description: "Relaxed fit", price: 145 }] },
  { name: "TechZone Marina", category: "shops", subcategory: "electronics", city: "Dubai", area: "Dubai Marina", items: [{ name: "Wireless Earbuds", description: "ANC pro", price: 350 }, { name: "Phone Case", description: "Premium silicone", price: 85 }] },
  { name: "PharmaCare Barsha", category: "shops", subcategory: "pharmacy", city: "Dubai", area: "Al Barsha", items: [{ name: "First Aid Kit", description: "Complete set", price: 45 }, { name: "Vitamins Pack", description: "Monthly supply", price: 60 }] },
  { name: "Bloom Flowers JBR", category: "shops", subcategory: "flowers", city: "Dubai", area: "Dubai Marina", items: [{ name: "Rose Bouquet", description: "24 red roses", price: 180 }, { name: "Mixed Arrangement", description: "Seasonal flowers", price: 120 }] },
  { name: "Pawfect Pets", category: "shops", subcategory: "pets", city: "Dubai", area: "JVC", items: [{ name: "Dog Food 10kg", description: "Premium blend", price: 120 }, { name: "Cat Toys Set", description: "Interactive play", price: 45 }] },
  { name: "GiftBox Dubai", category: "shops", subcategory: "gifts", city: "Dubai", area: "Downtown Dubai", items: [{ name: "Luxury Hamper", description: "Chocolates & wine", price: 350 }, { name: "Perfume Set", description: "Arabian oud", price: 280 }] },
  { name: "Casa Living", category: "shops", subcategory: "home_decor", city: "Dubai", area: "Al Quoz", items: [{ name: "Scented Candle Set", description: "3 pcs premium", price: 120 }, { name: "Throw Pillow", description: "Velvet cover", price: 85 }] },
  { name: "Shades & More", category: "shops", subcategory: "accessories", city: "Dubai", area: "DIFC", items: [{ name: "Sunglasses", description: "UV400 polarized", price: 220 }, { name: "Leather Belt", description: "Italian calfskin", price: 180 }] },
];

const SERVICES: SeedBiz[] = [
  { name: "SparkleClean Pro", category: "services", subcategory: "cleaning", city: "Dubai", area: "Dubai Marina", items: [{ name: "Deep Clean 2BR", description: "Full apartment", price: 250 }, { name: "Move-in Clean", description: "Empty unit", price: 350 }] },
  { name: "LaundryBox Express", category: "services", subcategory: "laundry", city: "Dubai", area: "Business Bay", items: [{ name: "Wash & Fold 5kg", description: "Next day delivery", price: 45 }, { name: "Dry Clean Suit", description: "Premium service", price: 65 }] },
  { name: "FixIt Handyman", category: "services", subcategory: "handyman", city: "Dubai", area: "JVC", items: [{ name: "General Repair", description: "1 hour slot", price: 120 }, { name: "Furniture Assembly", description: "Per item", price: 80 }] },
  { name: "CoolBreeze AC", category: "services", subcategory: "ac_repair", city: "Dubai", area: "Al Barsha", items: [{ name: "AC Service", description: "Clean & gas refill", price: 180 }, { name: "AC Installation", description: "Split unit", price: 350 }] },
  { name: "Glamour Salon JBR", category: "services", subcategory: "salon", city: "Dubai", area: "Dubai Marina", items: [{ name: "Haircut & Style", description: "Wash, cut, blowdry", price: 120 }, { name: "Manicure", description: "Gel polish", price: 80 }] },
  { name: "Royal Barber DIFC", category: "services", subcategory: "barber", city: "Dubai", area: "DIFC", items: [{ name: "Classic Cut", description: "Scissor cut", price: 80 }, { name: "Beard Trim", description: "Hot towel shave", price: 50 }] },
  { name: "Serenity Spa Downtown", category: "services", subcategory: "spa", city: "Dubai", area: "Downtown Dubai", items: [{ name: "Thai Massage 60min", description: "Full body", price: 280 }, { name: "Facial Treatment", description: "Deep cleanse", price: 220 }] },
  { name: "PlumbFix Dubai", category: "services", subcategory: "plumbing", city: "Dubai", area: "Bur Dubai", items: [{ name: "Drain Unblock", description: "Emergency service", price: 150 }, { name: "Faucet Replace", description: "Parts included", price: 200 }] },
  { name: "Bright Spark Electric", category: "services", subcategory: "electrical", city: "Dubai", area: "Karama", items: [{ name: "Wiring Repair", description: "Per point", price: 100 }, { name: "Light Installation", description: "Chandelier mounting", price: 180 }] },
  { name: "QuickMove Movers", category: "services", subcategory: "movers", city: "Dubai", area: "Silicon Oasis", items: [{ name: "Studio Move", description: "Within Dubai", price: 800 }, { name: "Packing Service", description: "Full packing", price: 400 }] },
  { name: "PhoneDoc Repair", category: "services", subcategory: "mobile_repair", city: "Dubai", area: "Deira", items: [{ name: "Screen Replacement", description: "iPhone/Samsung", price: 250 }, { name: "Battery Swap", description: "Same day", price: 120 }] },
  { name: "AutoCare Workshop", category: "services", subcategory: "car_repair", city: "Dubai", area: "Al Quoz", items: [{ name: "Oil Change", description: "Synthetic oil", price: 180 }, { name: "Brake Service", description: "Pads replacement", price: 350 }] },
  { name: "BubbleWash Detailing", category: "services", subcategory: "car_wash", city: "Dubai", area: "Motor City", items: [{ name: "Exterior Wash", description: "Foam & wax", price: 50 }, { name: "Full Detailing", description: "Interior & exterior", price: 250 }] },
  { name: "PestShield Dubai", category: "services", subcategory: "pest_control", city: "Dubai", area: "Mirdif", items: [{ name: "Cockroach Treatment", description: "2BR apartment", price: 200 }, { name: "Bed Bug Treatment", description: "Full unit", price: 450 }] },
  { name: "Stitch Perfect", category: "services", subcategory: "tailoring", city: "Dubai", area: "Bur Dubai", items: [{ name: "Suit Alteration", description: "Jacket & trousers", price: 120 }, { name: "Dress Hem", description: "Simple alteration", price: 40 }] },
  { name: "TutorPro Academy", category: "services", subcategory: "tutoring", city: "Dubai", area: "JLT", items: [{ name: "Math Tutoring", description: "1 hour session", price: 150 }, { name: "English Language", description: "1 hour session", price: 130 }] },
];

const PROPERTY: SeedBiz[] = [
  { name: "Marina Heights Rentals", category: "property", subcategory: "apartment", city: "Dubai", area: "Dubai Marina", items: [{ name: "1BR Marina View", description: "Fully furnished, sea view", price: 7500 }, { name: "Studio Cozy", description: "Near metro, balcony", price: 4500 }] },
  { name: "Downtown Living", category: "property", subcategory: "apartment", city: "Dubai", area: "Downtown Dubai", items: [{ name: "2BR Burj View", description: "Prime location", price: 15000 }, { name: "1BR Boulevard", description: "Modern finish", price: 9000 }] },
  { name: "Palm Villa Estates", category: "property", subcategory: "villa", city: "Dubai", area: "Palm Jumeirah", items: [{ name: "4BR Beach Villa", description: "Private beach access", price: 45000 }, { name: "3BR Garden Villa", description: "Gated community", price: 28000 }] },
  { name: "DIFC Office Hub", category: "property", subcategory: "office", city: "Dubai", area: "DIFC", items: [{ name: "Private Office 4-pax", description: "Furnished, pantry", price: 8000 }, { name: "Hot Desk", description: "Flexible workspace", price: 1500 }] },
  { name: "Al Quoz Warehouse", category: "property", subcategory: "warehouse", city: "Dubai", area: "Al Quoz", items: [{ name: "500sqm Unit", description: "Ground floor, loading dock", price: 25000 }, { name: "200sqm Storage", description: "Climate controlled", price: 12000 }] },
  { name: "CityStay Short Rental", category: "property", subcategory: "short_stay", city: "Dubai", area: "Business Bay", items: [{ name: "1BR Weekly", description: "Canal view, pool access", price: 3500 }, { name: "Studio Nightly", description: "Hotel-style service", price: 450 }] },
];

const HEALTHCARE: SeedBiz[] = [
  { name: "MediCare Clinic Marina", category: "healthcare", subcategory: "clinic", city: "Dubai", area: "Dubai Marina", items: [{ name: "General Consultation", description: "GP visit", price: 250 }, { name: "Blood Test Panel", description: "Full check", price: 350 }] },
  { name: "SmileBright Dental", category: "healthcare", subcategory: "dentist", city: "Dubai", area: "JLT", items: [{ name: "Dental Checkup", description: "Clean & x-ray", price: 300 }, { name: "Teeth Whitening", description: "In-office laser", price: 1200 }] },
  { name: "PhysioFit Center", category: "healthcare", subcategory: "physio", city: "Dubai", area: "Business Bay", items: [{ name: "Physio Session", description: "45 min treatment", price: 350 }, { name: "Sports Massage", description: "Recovery focused", price: 280 }] },
  { name: "Downtown Medical", category: "healthcare", subcategory: "clinic", city: "Dubai", area: "Downtown Dubai", items: [{ name: "Specialist Visit", description: "Dermatology", price: 400 }, { name: "Vaccination", description: "Travel vaccines", price: 180 }] },
];

const MOBILITY: SeedBiz[] = [
  { name: "RideEasy Chauffeur", category: "mobility", subcategory: "chauffeur", city: "Dubai", area: "Downtown Dubai", items: [{ name: "Airport Transfer", description: "Luxury sedan", price: 180 }, { name: "Hourly Hire", description: "4 hour minimum", price: 350 }] },
  { name: "DriveNow Rental", category: "mobility", subcategory: "car_rental", city: "Dubai", area: "Dubai Marina", items: [{ name: "Economy Daily", description: "Sedan class", price: 120 }, { name: "SUV Weekly", description: "Full size SUV", price: 1400 }] },
  { name: "CityRide Taxi", category: "mobility", subcategory: "taxi", city: "Dubai", area: "Deira", items: [{ name: "City Ride", description: "Metered taxi", price: 25 }, { name: "Airport Run", description: "Fixed rate", price: 80 }] },
];

const EXPERIENCES: SeedBiz[] = [
  { name: "Desert Safari Co", category: "experiences", subcategory: "activities", city: "Dubai", area: "Downtown Dubai", items: [{ name: "Evening Safari", description: "BBQ dinner, entertainment", price: 250 }, { name: "Morning Safari", description: "Dune bashing, sandboarding", price: 180 }] },
  { name: "SkyDive Dubai", category: "experiences", subcategory: "activities", city: "Dubai", area: "Dubai Marina", items: [{ name: "Tandem Jump", description: "Palm dropzone", price: 1800 }, { name: "Indoor Skydive", description: "2 flights", price: 220 }] },
  { name: "EventBox Dubai", category: "experiences", subcategory: "events", city: "Dubai", area: "DIFC", items: [{ name: "Art Exhibition", description: "Gallery access", price: 50 }, { name: "Food Festival", description: "Weekend pass", price: 120 }] },
  { name: "TicketMaster UAE", category: "experiences", subcategory: "tickets", city: "Dubai", area: "Downtown Dubai", items: [{ name: "Theme Park Pass", description: "Full day", price: 300 }, { name: "Concert Ticket", description: "Standing", price: 250 }] },
];

const ALL_BUSINESSES = [
  ...FOOD, ...GROCERY, ...SHOPS, ...SERVICES,
  ...PROPERTY, ...HEALTHCARE, ...MOBILITY, ...EXPERIENCES,
];

// Output as JSON for bulk import
console.log(JSON.stringify(ALL_BUSINESSES, null, 2));
console.error(`Total businesses: ${ALL_BUSINESSES.length}`);
console.error(`Food: ${FOOD.length}, Grocery: ${GROCERY.length}, Shops: ${SHOPS.length}`);
console.error(`Services: ${SERVICES.length}, Property: ${PROPERTY.length}`);
console.error(`Healthcare: ${HEALTHCARE.length}, Mobility: ${MOBILITY.length}, Experiences: ${EXPERIENCES.length}`);
