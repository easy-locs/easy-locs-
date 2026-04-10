import { menuItemCover, roomCover } from "@/lib/image/category-covers";

export type OnboardingVertical = "food" | "hotel" | "services";

export interface MenuTemplate {
  name: string;
  name_ar?: string;
  price: number;
  category: string;
  description: string;
  calories?: number;
  image?: string;
}

export interface RoomTemplate {
  name: string;
  name_ar?: string;
  type: string;
  price_per_night: number;
  max_guests: number;
  beds: string;
  description: string;
  image?: string;
}

export interface HotelDefaults {
  check_in: string;
  check_out: string;
  star_rating: number;
  amenities: string[];
  policies: { cancellation: string; pets: string; smoking: string };
}

export interface ServiceTemplate {
  name: string;
  name_ar?: string;
  price: number;
  duration_minutes: number;
  category: string;
  description: string;
  image?: string;
}

export interface ServiceDefaults {
  slot_interval: number;
  open_hour: number;
  close_hour: number;
  available_days: number[];
  booking_mode: "hourly" | "daily";
  min_notice_hours: number;
  max_advance_days: number;
}

export interface VerticalStepConfig {
  steps: { label: string; icon: string }[];
  welcome_emoji: string;
  welcome_title: (name: string) => string;
  welcome_subtitle: (name: string) => string;
  info_title: string;
  info_fields: { key: string; label: string; type: string; placeholder?: string }[];
  catalog_title: string;
  catalog_subtitle: string;
  go_live_cta: string;
  commission: string;
  revenue_estimate: string;
}

export const FOOD_MENU_TEMPLATES: Record<string, MenuTemplate[]> = {
  shawarma: [
    { name: "Chicken Shawarma Wrap", price: 18, category: "Shawarma", description: "Marinated chicken, garlic sauce, pickles in fresh bread", calories: 520, image: menuItemCover("food") },
    { name: "Meat Shawarma Plate", price: 32, category: "Shawarma", description: "Sliced lamb shawarma with rice, hummus and salad", calories: 780, image: menuItemCover("food") },
    { name: "Mixed Grill Platter", price: 65, category: "Grills", description: "Assorted grilled meats: kofta, shish tawook, lamb chops", calories: 920, image: menuItemCover("food") },
    { name: "Fattoush Salad", price: 15, category: "Salads", description: "Crispy pita chips with fresh vegetables and sumac dressing", calories: 220, image: menuItemCover("food") },
    { name: "Hummus", price: 12, category: "Mezze", description: "Creamy chickpea dip with olive oil and paprika", calories: 180, image: menuItemCover("food") },
    { name: "Fresh Lemon Mint", price: 10, category: "Drinks", description: "Freshly squeezed lemon with mint leaves", calories: 90, image: menuItemCover("food") },
  ],
  pizza: [
    { name: "Margherita", price: 35, category: "Pizzas", description: "San Marzano tomato, fresh mozzarella, basil", calories: 680, image: menuItemCover("food") },
    { name: "Pepperoni", price: 42, category: "Pizzas", description: "Spicy pepperoni, mozzarella, tomato sauce", calories: 820, image: menuItemCover("food") },
    { name: "Quattro Formaggi", price: 45, category: "Pizzas", description: "Mozzarella, gorgonzola, parmesan, fontina", calories: 900, image: menuItemCover("food") },
    { name: "Caesar Salad", price: 22, category: "Salads", description: "Romaine, croutons, parmesan, Caesar dressing", calories: 340, image: menuItemCover("food") },
    { name: "Garlic Bread", price: 15, category: "Starters", description: "Toasted bread with garlic butter and herbs", calories: 280, image: menuItemCover("food") },
    { name: "Tiramisu", price: 25, category: "Desserts", description: "Classic Italian coffee-flavored dessert", calories: 420, image: menuItemCover("food") },
  ],
  burger: [
    { name: "Classic Smash Burger", price: 38, category: "Burgers", description: "Double smashed patty, American cheese, special sauce", calories: 720, image: menuItemCover("food") },
    { name: "Chicken Burger", price: 35, category: "Burgers", description: "Crispy fried chicken, coleslaw, pickles", calories: 650, image: menuItemCover("food") },
    { name: "Loaded Fries", price: 20, category: "Sides", description: "Fries with cheese sauce, jalapeños, crispy onions", calories: 480, image: menuItemCover("food") },
    { name: "Onion Rings", price: 15, category: "Sides", description: "Beer-battered onion rings with ranch dip", calories: 350, image: menuItemCover("food") },
    { name: "Milkshake", price: 22, category: "Drinks", description: "Thick vanilla, chocolate or strawberry shake", calories: 520, image: menuItemCover("food") },
  ],
  sushi: [
    { name: "Salmon Nigiri (6pc)", price: 42, category: "Nigiri", description: "Fresh Norwegian salmon over seasoned rice", calories: 320, image: menuItemCover("food") },
    { name: "California Roll (8pc)", price: 35, category: "Maki", description: "Crab, avocado, cucumber with sesame", calories: 380, image: menuItemCover("food") },
    { name: "Dragon Roll (8pc)", price: 52, category: "Special Rolls", description: "Shrimp tempura, avocado, eel sauce", calories: 480, image: menuItemCover("food") },
    { name: "Miso Soup", price: 12, category: "Soups", description: "Traditional miso with tofu and wakame", calories: 80, image: menuItemCover("food") },
    { name: "Edamame", price: 15, category: "Starters", description: "Steamed soybeans with sea salt", calories: 120, image: menuItemCover("food") },
    { name: "Green Tea Ice Cream", price: 18, category: "Desserts", description: "Matcha flavored Japanese ice cream", calories: 180, image: menuItemCover("food") },
  ],
  cafe: [
    { name: "Cappuccino", price: 18, category: "Hot Drinks", description: "Double espresso with steamed milk foam", calories: 120, image: menuItemCover("food") },
    { name: "Iced Latte", price: 22, category: "Cold Drinks", description: "Espresso over ice with cold milk", calories: 150, image: menuItemCover("food") },
    { name: "Avocado Toast", price: 28, category: "Breakfast", description: "Sourdough, smashed avocado, poached egg, chili flakes", calories: 380, image: menuItemCover("food") },
    { name: "Açaí Bowl", price: 35, category: "Bowls", description: "Açaí blend, granola, fresh berries, honey", calories: 420, image: menuItemCover("food") },
    { name: "Club Sandwich", price: 32, category: "Sandwiches", description: "Triple-decker with chicken, bacon, egg, lettuce", calories: 580, image: menuItemCover("food") },
    { name: "Cheesecake", price: 25, category: "Desserts", description: "New York style baked cheesecake", calories: 450, image: menuItemCover("food") },
  ],
  default: [
    { name: "Plat Principal 1", price: 35, category: "Plats", description: "Plat signature du chef", calories: 600, image: menuItemCover("food") },
    { name: "Plat Principal 2", price: 40, category: "Plats", description: "Spécialité de la maison", calories: 700, image: menuItemCover("food") },
    { name: "Entrée", price: 18, category: "Entrées", description: "Entrée fraîche du jour", calories: 250, image: menuItemCover("food") },
    { name: "Dessert", price: 22, category: "Desserts", description: "Dessert fait maison", calories: 380, image: menuItemCover("food") },
    { name: "Boisson", price: 12, category: "Boissons", description: "Boisson fraîche", calories: 100, image: menuItemCover("food") },
  ],
};

export const HOTEL_ROOM_TEMPLATES: Record<string, RoomTemplate[]> = {
  hotel: [
    { name: "Standard Room", type: "standard", price_per_night: 350, max_guests: 2, beds: "1 Queen", description: "Comfortable room with city view, WiFi, TV, minibar", image: roomCover("hotel") },
    { name: "Deluxe Room", type: "deluxe", price_per_night: 550, max_guests: 2, beds: "1 King", description: "Spacious room with premium amenities and balcony", image: roomCover("hotel") },
    { name: "Superior Suite", type: "suite", price_per_night: 850, max_guests: 3, beds: "1 King + Sofa", description: "Separate living area, panoramic views, premium bath", image: roomCover("hotel") },
    { name: "Family Room", type: "family", price_per_night: 650, max_guests: 4, beds: "2 Queen", description: "Extra space for families with children's amenities", image: roomCover("hotel") },
    { name: "Executive Suite", type: "executive", price_per_night: 1200, max_guests: 2, beds: "1 King", description: "Business lounge access, workspace, premium toiletries", image: roomCover("hotel") },
  ],
  resort: [
    { name: "Garden Villa", type: "villa", price_per_night: 800, max_guests: 4, beds: "1 King + 2 Single", description: "Private garden villa with outdoor seating", image: roomCover("resort") },
    { name: "Beach Bungalow", type: "bungalow", price_per_night: 1200, max_guests: 2, beds: "1 King", description: "Direct beach access, private terrace, outdoor shower", image: roomCover("resort") },
    { name: "Pool Villa", type: "pool_villa", price_per_night: 1800, max_guests: 4, beds: "1 King + Sofa", description: "Private infinity pool, butler service, ocean view", image: roomCover("resort") },
    { name: "Overwater Suite", type: "overwater", price_per_night: 2500, max_guests: 2, beds: "1 King", description: "Glass floor panels, direct lagoon access, sunset deck", image: roomCover("resort") },
  ],
  riad: [
    { name: "Chambre Standard", type: "standard", price_per_night: 120, max_guests: 2, beds: "1 Double", description: "Chambre traditionnelle avec zellige et tadelakt", image: roomCover("riad") },
    { name: "Suite Royale", type: "suite", price_per_night: 280, max_guests: 3, beds: "1 King + Divan", description: "Suite avec salon privé et vue sur le patio", image: roomCover("riad") },
    { name: "Chambre Terrasse", type: "terrace", price_per_night: 180, max_guests: 2, beds: "1 Double", description: "Accès terrasse privée avec vue sur la médina", image: roomCover("riad") },
  ],
  default: [
    { name: "Chambre Standard", type: "standard", price_per_night: 250, max_guests: 2, beds: "1 Queen", description: "Chambre confortable avec WiFi et TV", image: roomCover("hotel") },
    { name: "Chambre Supérieure", type: "superior", price_per_night: 400, max_guests: 2, beds: "1 King", description: "Chambre spacieuse avec vue et balcon", image: roomCover("hotel") },
    { name: "Suite", type: "suite", price_per_night: 700, max_guests: 3, beds: "1 King + Sofa", description: "Suite avec salon séparé et vue panoramique", image: roomCover("hotel") },
  ],
};

export const HOTEL_DEFAULTS: Record<string, HotelDefaults> = {
  hotel: {
    check_in: "15:00",
    check_out: "11:00",
    star_rating: 4,
    amenities: ["WiFi", "Pool", "Gym", "Restaurant", "Room Service", "Parking", "Concierge", "Spa"],
    policies: { cancellation: "Free cancellation up to 24h before check-in", pets: "Not allowed", smoking: "Non-smoking rooms" },
  },
  resort: {
    check_in: "14:00",
    check_out: "12:00",
    star_rating: 5,
    amenities: ["WiFi", "Private Beach", "Multiple Pools", "Spa", "Water Sports", "Kids Club", "Fine Dining", "Butler Service", "Tennis", "Gym"],
    policies: { cancellation: "Free cancellation up to 48h before check-in", pets: "Not allowed", smoking: "Designated areas only" },
  },
  riad: {
    check_in: "14:00",
    check_out: "11:00",
    star_rating: 3,
    amenities: ["WiFi", "Rooftop Terrace", "Traditional Hammam", "Breakfast Included", "Airport Transfer"],
    policies: { cancellation: "Free cancellation up to 48h before check-in", pets: "Not allowed", smoking: "Not allowed indoors" },
  },
  default: {
    check_in: "14:00",
    check_out: "11:00",
    star_rating: 3,
    amenities: ["WiFi", "Parking", "Reception 24h"],
    policies: { cancellation: "Free cancellation up to 24h", pets: "On request", smoking: "Non-smoking" },
  },
};

export const SERVICE_TEMPLATES: Record<string, ServiceTemplate[]> = {
  plumber: [
    { name: "Diagnostic & Devis", price: 0, duration_minutes: 30, category: "Diagnostic", description: "Visite de diagnostic gratuite avec devis détaillé", image: menuItemCover("plumbing") },
    { name: "Réparation Fuite", price: 150, duration_minutes: 60, category: "Réparations", description: "Localisation et réparation de fuite eau", image: menuItemCover("plumbing") },
    { name: "Débouchage Canalisation", price: 120, duration_minutes: 45, category: "Réparations", description: "Débouchage professionnel de canalisation", image: menuItemCover("plumbing") },
    { name: "Installation Robinet", price: 80, duration_minutes: 45, category: "Installation", description: "Installation ou remplacement de robinetterie", image: menuItemCover("plumbing") },
    { name: "Installation Chauffe-eau", price: 350, duration_minutes: 120, category: "Installation", description: "Pose et raccordement chauffe-eau", image: menuItemCover("plumbing") },
    { name: "Urgence Plomberie 24/7", price: 200, duration_minutes: 60, category: "Urgence", description: "Intervention d'urgence plomberie", image: menuItemCover("plumbing") },
  ],
  electrician: [
    { name: "Diagnostic Électrique", price: 0, duration_minutes: 30, category: "Diagnostic", description: "Diagnostic complet de l'installation électrique", image: menuItemCover("electrical") },
    { name: "Installation Prise/Interrupteur", price: 60, duration_minutes: 30, category: "Installation", description: "Pose d'une prise ou interrupteur", image: menuItemCover("electrical") },
    { name: "Tableau Électrique", price: 450, duration_minutes: 180, category: "Installation", description: "Installation ou mise aux normes tableau", image: menuItemCover("electrical") },
    { name: "Éclairage LED", price: 80, duration_minutes: 45, category: "Installation", description: "Installation spot ou luminaire LED", image: menuItemCover("electrical") },
    { name: "Dépannage Électrique", price: 120, duration_minutes: 60, category: "Réparations", description: "Diagnostic et réparation panne électrique", image: menuItemCover("electrical") },
  ],
  cleaning: [
    { name: "Ménage Standard (2h)", price: 80, duration_minutes: 120, category: "Ménage", description: "Nettoyage complet appartement jusqu'à 80m²", image: menuItemCover("cleaning") },
    { name: "Grand Ménage (4h)", price: 150, duration_minutes: 240, category: "Ménage", description: "Nettoyage en profondeur avec vitres", image: menuItemCover("cleaning") },
    { name: "Ménage Déménagement", price: 200, duration_minutes: 300, category: "Spécial", description: "Nettoyage complet avant/après déménagement", image: menuItemCover("cleaning") },
    { name: "Repassage (2h)", price: 60, duration_minutes: 120, category: "Linge", description: "Service de repassage à domicile", image: menuItemCover("cleaning") },
  ],
  beauty: [
    { name: "Coupe Femme", price: 120, duration_minutes: 45, category: "Coiffure", description: "Shampoing, coupe et brushing", image: menuItemCover("salon") },
    { name: "Coupe Homme", price: 60, duration_minutes: 30, category: "Coiffure", description: "Coupe classique ou tendance", image: menuItemCover("salon") },
    { name: "Coloration", price: 180, duration_minutes: 90, category: "Coiffure", description: "Coloration complète avec soin", image: menuItemCover("salon") },
    { name: "Manucure", price: 80, duration_minutes: 45, category: "Ongles", description: "Manucure classique ou semi-permanent", image: menuItemCover("salon") },
    { name: "Soin Visage", price: 150, duration_minutes: 60, category: "Soins", description: "Soin du visage personnalisé", image: menuItemCover("salon") },
    { name: "Massage Relaxant (1h)", price: 200, duration_minutes: 60, category: "Bien-être", description: "Massage relaxant corps complet", image: menuItemCover("salon") },
  ],
  fitness: [
    { name: "Séance Personal Training", price: 150, duration_minutes: 60, category: "Coaching", description: "Session individuelle avec coach certifié", image: menuItemCover("fitness") },
    { name: "Pack 10 Séances", price: 1200, duration_minutes: 60, category: "Coaching", description: "10 sessions de coaching personnalisé", image: menuItemCover("fitness") },
    { name: "Cours Collectif", price: 40, duration_minutes: 45, category: "Cours", description: "Yoga, Pilates, HIIT ou CrossFit", image: menuItemCover("fitness") },
    { name: "Bilan Forme", price: 80, duration_minutes: 45, category: "Diagnostic", description: "Évaluation physique complète et programme", image: menuItemCover("fitness") },
  ],
  default: [
    { name: "Consultation", price: 0, duration_minutes: 30, category: "Diagnostic", description: "Première consultation gratuite", image: menuItemCover("services") },
    { name: "Prestation Standard", price: 100, duration_minutes: 60, category: "Services", description: "Prestation standard de service", image: menuItemCover("services") },
    { name: "Prestation Premium", price: 200, duration_minutes: 120, category: "Services", description: "Prestation premium avec garantie", image: menuItemCover("services") },
    { name: "Intervention Urgente", price: 150, duration_minutes: 60, category: "Urgence", description: "Intervention en urgence sous 2h", image: menuItemCover("services") },
  ],
};

export const SERVICE_DEFAULTS: Record<string, ServiceDefaults> = {
  plumber: {
    slot_interval: 60,
    open_hour: 7,
    close_hour: 20,
    available_days: [1, 2, 3, 4, 5, 6],
    booking_mode: "hourly",
    min_notice_hours: 2,
    max_advance_days: 30,
  },
  electrician: {
    slot_interval: 60,
    open_hour: 8,
    close_hour: 19,
    available_days: [1, 2, 3, 4, 5, 6],
    booking_mode: "hourly",
    min_notice_hours: 4,
    max_advance_days: 30,
  },
  cleaning: {
    slot_interval: 120,
    open_hour: 8,
    close_hour: 18,
    available_days: [1, 2, 3, 4, 5, 6, 0],
    booking_mode: "hourly",
    min_notice_hours: 12,
    max_advance_days: 14,
  },
  beauty: {
    slot_interval: 30,
    open_hour: 9,
    close_hour: 21,
    available_days: [1, 2, 3, 4, 5, 6],
    booking_mode: "hourly",
    min_notice_hours: 4,
    max_advance_days: 60,
  },
  fitness: {
    slot_interval: 60,
    open_hour: 6,
    close_hour: 22,
    available_days: [0, 1, 2, 3, 4, 5, 6],
    booking_mode: "hourly",
    min_notice_hours: 2,
    max_advance_days: 30,
  },
  default: {
    slot_interval: 60,
    open_hour: 9,
    close_hour: 18,
    available_days: [1, 2, 3, 4, 5],
    booking_mode: "hourly",
    min_notice_hours: 4,
    max_advance_days: 30,
  },
};

export function getMenuTemplates(subcategory: string): MenuTemplate[] {
  const key = subcategory?.toLowerCase().replace(/[^a-z]/g, "") || "default";
  return FOOD_MENU_TEMPLATES[key] || FOOD_MENU_TEMPLATES.default;
}

export function getRoomTemplates(subcategory: string): RoomTemplate[] {
  const key = subcategory?.toLowerCase().replace(/[^a-z]/g, "") || "default";
  return HOTEL_ROOM_TEMPLATES[key] || HOTEL_ROOM_TEMPLATES.default;
}

export function getHotelDefaults(subcategory: string): HotelDefaults {
  const key = subcategory?.toLowerCase().replace(/[^a-z]/g, "") || "default";
  return HOTEL_DEFAULTS[key] || HOTEL_DEFAULTS.default;
}

export function getServiceTemplates(subcategory: string): ServiceTemplate[] {
  const key = subcategory?.toLowerCase().replace(/[^a-z]/g, "") || "default";
  return SERVICE_TEMPLATES[key] || SERVICE_TEMPLATES.default;
}

export function getServiceDefaults(subcategory: string): ServiceDefaults {
  const key = subcategory?.toLowerCase().replace(/[^a-z]/g, "") || "default";
  return SERVICE_DEFAULTS[key] || SERVICE_DEFAULTS.default;
}

export const VERTICAL_CONFIG: Record<OnboardingVertical, VerticalStepConfig> = {
  food: {
    steps: [
      { label: "Bienvenue", icon: "rocket" },
      { label: "Infos", icon: "store" },
      { label: "Menu", icon: "utensils" },
      { label: "Paiement", icon: "credit-card" },
      { label: "Go Live", icon: "zap" },
    ],
    welcome_emoji: "🍽️",
    welcome_title: (name) => `${name} est prêt !`,
    welcome_subtitle: (name) => `Votre restaurant ${name} est déjà configuré avec son menu complet. Confirmez vos détails et commencez à recevoir des commandes.`,
    info_title: "Informations du restaurant",
    info_fields: [
      { key: "name", label: "Nom du restaurant", type: "text" },
      { key: "phone", label: "Téléphone", type: "tel" },
      { key: "address", label: "Adresse / Quartier", type: "text" },
      { key: "cuisine", label: "Type de cuisine", type: "text" },
    ],
    catalog_title: "Votre menu",
    catalog_subtitle: "articles • modifiez si besoin",
    go_live_cta: "Activer mon restaurant",
    commission: "5%",
    revenue_estimate: "8 000 — 25 000 AED/mois",
  },
  hotel: {
    steps: [
      { label: "Bienvenue", icon: "rocket" },
      { label: "Infos", icon: "building" },
      { label: "Chambres", icon: "bed" },
      { label: "Calendrier", icon: "calendar" },
      { label: "Paiement", icon: "credit-card" },
      { label: "Go Live", icon: "zap" },
    ],
    welcome_emoji: "🏨",
    welcome_title: (name) => `${name} est prêt !`,
    welcome_subtitle: (name) => `Votre établissement ${name} est configuré avec ses chambres et tarifs. Vérifiez vos informations et ouvrez les réservations.`,
    info_title: "Informations de l'établissement",
    info_fields: [
      { key: "name", label: "Nom de l'hôtel", type: "text" },
      { key: "phone", label: "Téléphone", type: "tel" },
      { key: "address", label: "Adresse", type: "text" },
      { key: "stars", label: "Catégorie (étoiles)", type: "stars" },
    ],
    catalog_title: "Vos chambres & tarifs",
    catalog_subtitle: "types de chambres • modifiez les tarifs",
    go_live_cta: "Ouvrir les réservations",
    commission: "5%",
    revenue_estimate: "15 000 — 80 000 AED/mois",
  },
  services: {
    steps: [
      { label: "Bienvenue", icon: "rocket" },
      { label: "Infos", icon: "store" },
      { label: "Services", icon: "wrench" },
      { label: "Horaires", icon: "clock" },
      { label: "Paiement", icon: "credit-card" },
      { label: "Go Live", icon: "zap" },
    ],
    welcome_emoji: "🔧",
    welcome_title: (name) => `${name} est prêt !`,
    welcome_subtitle: (name) => `Votre activité ${name} est configurée avec votre catalogue de services. Vérifiez et commencez à recevoir des réservations.`,
    info_title: "Informations de votre activité",
    info_fields: [
      { key: "name", label: "Nom de l'activité", type: "text" },
      { key: "phone", label: "Téléphone", type: "tel" },
      { key: "address", label: "Zone d'intervention", type: "text" },
      { key: "specialty", label: "Spécialité", type: "text" },
    ],
    catalog_title: "Vos prestations",
    catalog_subtitle: "services • modifiez les tarifs",
    go_live_cta: "Activer mon activité",
    commission: "5%",
    revenue_estimate: "5 000 — 20 000 AED/mois",
  },
};
