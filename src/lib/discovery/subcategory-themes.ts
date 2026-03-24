/**
 * Subcategory Themes — Per-subcategory visual identity.
 * Provides unique hero imagery, accent colors, taglines per subcategory.
 */

export interface SubcategoryTheme {
  heroImage: string;
  heroOverlay: string;
  accentHsl: string;
  tagline: string;
  emoji: string;
  searchPlaceholder: string;
}

const SUBCATEGORY_THEMES: Record<string, SubcategoryTheme> = {
  // ── FOOD ──
  pizza: {
    heroImage: "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=800&q=80",
    heroOverlay: "linear-gradient(135deg, hsla(8,70%,12%,0.92) 0%, hsla(25,80%,20%,0.8) 100%)",
    accentHsl: "15 80% 50%",
    tagline: "Wood-fired perfection, delivered hot",
    emoji: "🍕",
    searchPlaceholder: "Margherita, pepperoni, calzone…",
  },
  burger: {
    heroImage: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800&q=80",
    heroOverlay: "linear-gradient(135deg, hsla(30,60%,10%,0.92) 0%, hsla(40,70%,18%,0.8) 100%)",
    accentHsl: "35 75% 48%",
    tagline: "Smash it, stack it, devour it",
    emoji: "🍔",
    searchPlaceholder: "Classic, smash, wagyu, veggie…",
  },
  sushi: {
    heroImage: "https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=800&q=80",
    heroOverlay: "linear-gradient(135deg, hsla(220,30%,10%,0.92) 0%, hsla(0,40%,18%,0.8) 100%)",
    accentHsl: "0 55% 50%",
    tagline: "Fresh rolls, masterful craft",
    emoji: "🍣",
    searchPlaceholder: "Maki, nigiri, sashimi, ramen…",
  },
  coffee: {
    heroImage: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=800&q=80",
    heroOverlay: "linear-gradient(135deg, hsla(25,50%,10%,0.92) 0%, hsla(30,40%,20%,0.8) 100%)",
    accentHsl: "25 60% 42%",
    tagline: "Your daily ritual, perfected",
    emoji: "☕",
    searchPlaceholder: "Latte, espresso, cold brew…",
  },
  kebab: {
    heroImage: "https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=800&q=80",
    heroOverlay: "linear-gradient(135deg, hsla(15,55%,12%,0.92) 0%, hsla(35,65%,20%,0.8) 100%)",
    accentHsl: "20 70% 45%",
    tagline: "Grilled to perfection, every time",
    emoji: "🥙",
    searchPlaceholder: "Shawarma, doner, mixed grill…",
  },
  bakery: {
    heroImage: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800&q=80",
    heroOverlay: "linear-gradient(135deg, hsla(35,45%,12%,0.92) 0%, hsla(40,50%,22%,0.8) 100%)",
    accentHsl: "38 65% 50%",
    tagline: "Freshly baked, always warm",
    emoji: "🥐",
    searchPlaceholder: "Croissant, bread, pastry…",
  },
  chinese: {
    heroImage: "https://images.unsplash.com/photo-1585032226651-759b368d7246?w=800&q=80",
    heroOverlay: "linear-gradient(135deg, hsla(0,50%,12%,0.92) 0%, hsla(15,45%,18%,0.8) 100%)",
    accentHsl: "0 60% 48%",
    tagline: "Authentic flavors from the East",
    emoji: "🥡",
    searchPlaceholder: "Dim sum, noodles, fried rice…",
  },
  indian: {
    heroImage: "https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=800&q=80",
    heroOverlay: "linear-gradient(135deg, hsla(25,60%,10%,0.92) 0%, hsla(45,70%,18%,0.8) 100%)",
    accentHsl: "30 75% 48%",
    tagline: "Spices that tell a story",
    emoji: "🍛",
    searchPlaceholder: "Biryani, curry, tandoori, naan…",
  },
  healthy: {
    heroImage: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800&q=80",
    heroOverlay: "linear-gradient(135deg, hsla(130,40%,12%,0.92) 0%, hsla(150,50%,20%,0.8) 100%)",
    accentHsl: "140 55% 42%",
    tagline: "Nourish your body, fuel your life",
    emoji: "🥗",
    searchPlaceholder: "Salad, bowl, smoothie, poke…",
  },

  // ── SERVICES ──
  plumbing: {
    heroImage: "https://images.unsplash.com/photo-1585704032915-c3400ca199e7?w=800&q=80",
    heroOverlay: "linear-gradient(135deg, hsla(210,50%,12%,0.92) 0%, hsla(200,45%,22%,0.8) 100%)",
    accentHsl: "205 55% 45%",
    tagline: "Expert plumbers, fast response",
    emoji: "🔧",
    searchPlaceholder: "Leak repair, installation…",
  },
  electrical: {
    heroImage: "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=800&q=80",
    heroOverlay: "linear-gradient(135deg, hsla(45,50%,10%,0.92) 0%, hsla(40,55%,18%,0.8) 100%)",
    accentHsl: "45 70% 48%",
    tagline: "Safe wiring, bright solutions",
    emoji: "⚡",
    searchPlaceholder: "Wiring, outlets, panel…",
  },
  cleaning: {
    heroImage: "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=800&q=80",
    heroOverlay: "linear-gradient(135deg, hsla(190,45%,12%,0.92) 0%, hsla(180,40%,22%,0.8) 100%)",
    accentHsl: "185 50% 42%",
    tagline: "Spotless spaces, guaranteed",
    emoji: "🧹",
    searchPlaceholder: "Deep clean, move-out, regular…",
  },
  salon: {
    heroImage: "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=800&q=80",
    heroOverlay: "linear-gradient(135deg, hsla(330,40%,14%,0.92) 0%, hsla(340,45%,22%,0.8) 100%)",
    accentHsl: "335 50% 50%",
    tagline: "Look amazing, feel confident",
    emoji: "💇",
    searchPlaceholder: "Haircut, color, styling…",
  },
  nail_salon: {
    heroImage: "https://images.unsplash.com/photo-1604654894610-df63bc536371?w=800&q=80",
    heroOverlay: "linear-gradient(135deg, hsla(340,35%,14%,0.92) 0%, hsla(350,40%,24%,0.8) 100%)",
    accentHsl: "345 45% 55%",
    tagline: "Perfect nails, every detail",
    emoji: "💅",
    searchPlaceholder: "Manicure, pedicure, gel, acrylic…",
  },
  moving: {
    heroImage: "https://images.unsplash.com/photo-1600518464441-9154a4dea21b?w=800&q=80",
    heroOverlay: "linear-gradient(135deg, hsla(220,40%,12%,0.92) 0%, hsla(210,45%,22%,0.8) 100%)",
    accentHsl: "215 50% 45%",
    tagline: "Stress-free moves, handled with care",
    emoji: "📦",
    searchPlaceholder: "Local, international, packing…",
  },

  // ── HEALTHCARE ──
  pharmacy: {
    heroImage: "https://images.unsplash.com/photo-1631549916768-4119b2e5f926?w=800&q=80",
    heroOverlay: "linear-gradient(135deg, hsla(160,45%,10%,0.92) 0%, hsla(170,40%,20%,0.8) 100%)",
    accentHsl: "165 50% 40%",
    tagline: "Your health essentials, always near",
    emoji: "💊",
    searchPlaceholder: "Medicine, vitamins, first aid…",
  },
  dentist: {
    heroImage: "https://images.unsplash.com/photo-1629909613654-28e377c37b09?w=800&q=80",
    heroOverlay: "linear-gradient(135deg, hsla(200,50%,10%,0.92) 0%, hsla(190,45%,20%,0.8) 100%)",
    accentHsl: "195 55% 42%",
    tagline: "Bright smiles start here",
    emoji: "🦷",
    searchPlaceholder: "Cleaning, whitening, braces…",
  },
  clinic: {
    heroImage: "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=800&q=80",
    heroOverlay: "linear-gradient(135deg, hsla(195,50%,10%,0.92) 0%, hsla(185,45%,20%,0.8) 100%)",
    accentHsl: "190 50% 40%",
    tagline: "Expert care, close to you",
    emoji: "🏥",
    searchPlaceholder: "General, specialist, check-up…",
  },

  // ── PROPERTY ──
  hotel: {
    heroImage: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&q=80",
    heroOverlay: "linear-gradient(135deg, hsla(220,40%,8%,0.92) 0%, hsla(38,50%,18%,0.8) 100%)",
    accentHsl: "38 68% 52%",
    tagline: "Luxury stays, unforgettable moments",
    emoji: "🏨",
    searchPlaceholder: "5-star, boutique, beach…",
  },
  resort: {
    heroImage: "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800&q=80",
    heroOverlay: "linear-gradient(135deg, hsla(200,45%,10%,0.92) 0%, hsla(38,50%,18%,0.8) 100%)",
    accentHsl: "38 65% 50%",
    tagline: "Paradise awaits, escape today",
    emoji: "🏖️",
    searchPlaceholder: "Beach resort, all-inclusive…",
  },
  short_stay: {
    heroImage: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&q=80",
    heroOverlay: "linear-gradient(135deg, hsla(210,35%,12%,0.92) 0%, hsla(30,45%,20%,0.8) 100%)",
    accentHsl: "30 55% 48%",
    tagline: "Cozy stays, feel at home",
    emoji: "🛏️",
    searchPlaceholder: "Studio, apartment, furnished…",
  },
  serviced_apartment: {
    heroImage: "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&q=80",
    heroOverlay: "linear-gradient(135deg, hsla(215,40%,10%,0.92) 0%, hsla(35,50%,18%,0.8) 100%)",
    accentHsl: "35 55% 45%",
    tagline: "Premium living, hotel service",
    emoji: "🏢",
    searchPlaceholder: "Furnished, serviced, long-stay…",
  },
  villa: {
    heroImage: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&q=80",
    heroOverlay: "linear-gradient(135deg, hsla(220,38%,8%,0.92) 0%, hsla(40,60%,18%,0.8) 100%)",
    accentHsl: "40 62% 48%",
    tagline: "Private luxury, your own retreat",
    emoji: "🏡",
    searchPlaceholder: "Pool, garden, beachfront…",
  },

  // ── GROCERY ──
  supermarket: {
    heroImage: "https://images.unsplash.com/photo-1604719312566-8912e9227c6a?w=800&q=80",
    heroOverlay: "linear-gradient(135deg, hsla(145,45%,10%,0.92) 0%, hsla(155,50%,20%,0.8) 100%)",
    accentHsl: "150 55% 38%",
    tagline: "Everything you need, one stop",
    emoji: "🏪",
    searchPlaceholder: "Weekly shop, essentials…",
  },
  organic: {
    heroImage: "https://images.unsplash.com/photo-1488459716781-31db52582fe9?w=800&q=80",
    heroOverlay: "linear-gradient(135deg, hsla(100,40%,12%,0.92) 0%, hsla(120,45%,20%,0.8) 100%)",
    accentHsl: "110 50% 38%",
    tagline: "Pure, natural, organic goodness",
    emoji: "🌿",
    searchPlaceholder: "Bio, organic, farm-fresh…",
  },

  // ── MOBILITY ──
  car_rental: {
    heroImage: "https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?w=800&q=80",
    heroOverlay: "linear-gradient(135deg, hsla(240,35%,12%,0.92) 0%, hsla(260,40%,22%,0.8) 100%)",
    accentHsl: "250 45% 48%",
    tagline: "Drive your way, any destination",
    emoji: "🚗",
    searchPlaceholder: "SUV, sedan, luxury, economy…",
  },

  // ── FOOD (additional) ──
  shawarma: {
    heroImage: "https://images.unsplash.com/photo-1529006557810-274b9b2fc783?w=800&q=80",
    heroOverlay: "linear-gradient(135deg, hsla(18,55%,12%,0.92) 0%, hsla(30,60%,20%,0.8) 100%)",
    accentHsl: "22 68% 46%",
    tagline: "Grilled, wrapped, irresistible",
    emoji: "🌯",
    searchPlaceholder: "Chicken, beef, mixed plate…",
  },
  italian: {
    heroImage: "https://images.unsplash.com/photo-1498579150354-977475b7ea0b?w=800&q=80",
    heroOverlay: "linear-gradient(135deg, hsla(10,45%,12%,0.92) 0%, hsla(25,55%,20%,0.8) 100%)",
    accentHsl: "12 60% 45%",
    tagline: "Authentic Italian, la dolce vita",
    emoji: "🍝",
    searchPlaceholder: "Pasta, risotto, tiramisu…",
  },
  japanese: {
    heroImage: "https://images.unsplash.com/photo-1580822184713-fc5400e7fe10?w=800&q=80",
    heroOverlay: "linear-gradient(135deg, hsla(220,30%,10%,0.92) 0%, hsla(0,35%,16%,0.8) 100%)",
    accentHsl: "0 50% 48%",
    tagline: "Precision, freshness, umami",
    emoji: "🍱",
    searchPlaceholder: "Ramen, tempura, yakitori…",
  },
  lebanese: {
    heroImage: "https://images.unsplash.com/photo-1540914124281-342587941389?w=800&q=80",
    heroOverlay: "linear-gradient(135deg, hsla(30,50%,10%,0.92) 0%, hsla(45,55%,18%,0.8) 100%)",
    accentHsl: "35 65% 45%",
    tagline: "Generous plates, rich flavors",
    emoji: "🥙",
    searchPlaceholder: "Hummus, fattoush, grills…",
  },
  seafood: {
    heroImage: "https://images.unsplash.com/photo-1615141982883-c7ad0e69fd62?w=800&q=80",
    heroOverlay: "linear-gradient(135deg, hsla(200,50%,10%,0.92) 0%, hsla(185,45%,18%,0.8) 100%)",
    accentHsl: "195 55% 42%",
    tagline: "Ocean-fresh, daily catch",
    emoji: "🦞",
    searchPlaceholder: "Lobster, shrimp, fish, oyster…",
  },
  breakfast: {
    heroImage: "https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?w=800&q=80",
    heroOverlay: "linear-gradient(135deg, hsla(40,50%,12%,0.92) 0%, hsla(50,55%,22%,0.8) 100%)",
    accentHsl: "42 65% 50%",
    tagline: "Rise, shine, eat well",
    emoji: "🍳",
    searchPlaceholder: "Eggs, pancakes, smoothie bowl…",
  },
  desserts: {
    heroImage: "https://images.unsplash.com/photo-1488477181946-6428a0291777?w=800&q=80",
    heroOverlay: "linear-gradient(135deg, hsla(330,40%,14%,0.92) 0%, hsla(345,45%,22%,0.8) 100%)",
    accentHsl: "338 50% 52%",
    tagline: "Sweet endings, pure happiness",
    emoji: "🍰",
    searchPlaceholder: "Cake, ice cream, kunafa…",
  },
  arabic: {
    heroImage: "https://images.unsplash.com/photo-1547573854-74d2a71d0826?w=800&q=80",
    heroOverlay: "linear-gradient(135deg, hsla(25,50%,10%,0.92) 0%, hsla(38,55%,18%,0.8) 100%)",
    accentHsl: "30 60% 45%",
    tagline: "Traditional taste, generous soul",
    emoji: "🧆",
    searchPlaceholder: "Mansaf, machboos, falafel…",
  },
  fast_food: {
    heroImage: "https://images.unsplash.com/photo-1561758033-d89a9ad46330?w=800&q=80",
    heroOverlay: "linear-gradient(135deg, hsla(10,55%,12%,0.92) 0%, hsla(35,65%,20%,0.8) 100%)",
    accentHsl: "18 70% 48%",
    tagline: "Quick, tasty, satisfying",
    emoji: "🍟",
    searchPlaceholder: "Fries, nuggets, wraps…",
  },
  brunch: {
    heroImage: "https://images.unsplash.com/photo-1504754524776-8f4f37790ca0?w=800&q=80",
    heroOverlay: "linear-gradient(135deg, hsla(40,45%,12%,0.92) 0%, hsla(55,50%,22%,0.8) 100%)",
    accentHsl: "45 60% 48%",
    tagline: "Lazy mornings, perfect plates",
    emoji: "🥂",
    searchPlaceholder: "Avocado toast, mimosa, eggs…",
  },

  // ── SERVICES (additional) ──
  barber: {
    heroImage: "https://images.unsplash.com/photo-1503951914875-452cb2831c6c?w=800&q=80",
    heroOverlay: "linear-gradient(135deg, hsla(220,35%,10%,0.92) 0%, hsla(210,40%,20%,0.8) 100%)",
    accentHsl: "215 45% 42%",
    tagline: "Sharp cuts, clean lines",
    emoji: "💈",
    searchPlaceholder: "Fade, beard trim, hot towel…",
  },
  spa: {
    heroImage: "https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=800&q=80",
    heroOverlay: "linear-gradient(135deg, hsla(280,30%,12%,0.92) 0%, hsla(290,35%,22%,0.8) 100%)",
    accentHsl: "285 40% 48%",
    tagline: "Relax, renew, restore",
    emoji: "🧖",
    searchPlaceholder: "Massage, facial, body scrub…",
  },
  laundry: {
    heroImage: "https://images.unsplash.com/photo-1545173168-9f1947eebb7f?w=800&q=80",
    heroOverlay: "linear-gradient(135deg, hsla(200,40%,12%,0.92) 0%, hsla(210,45%,22%,0.8) 100%)",
    accentHsl: "205 50% 45%",
    tagline: "Fresh, folded, delivered",
    emoji: "🧺",
    searchPlaceholder: "Dry clean, iron, wash & fold…",
  },
  ac_repair: {
    heroImage: "https://images.unsplash.com/photo-1631545806609-05fba29ba3ff?w=800&q=80",
    heroOverlay: "linear-gradient(135deg, hsla(200,45%,10%,0.92) 0%, hsla(195,50%,20%,0.8) 100%)",
    accentHsl: "198 55% 42%",
    tagline: "Cool comfort, fast fix",
    emoji: "❄️",
    searchPlaceholder: "Service, repair, installation…",
  },
  handyman: {
    heroImage: "https://images.unsplash.com/photo-1581092921461-eab62e97a780?w=800&q=80",
    heroOverlay: "linear-gradient(135deg, hsla(30,40%,12%,0.92) 0%, hsla(35,45%,22%,0.8) 100%)",
    accentHsl: "32 50% 45%",
    tagline: "Fix anything, fix everything",
    emoji: "🛠️",
    searchPlaceholder: "Assembly, mounting, repairs…",
  },
  movers: {
    heroImage: "https://images.unsplash.com/photo-1600518464441-9154a4dea21b?w=800&q=80",
    heroOverlay: "linear-gradient(135deg, hsla(220,40%,12%,0.92) 0%, hsla(210,45%,22%,0.8) 100%)",
    accentHsl: "215 50% 45%",
    tagline: "Stress-free moves, handled with care",
    emoji: "📦",
    searchPlaceholder: "Local, international, packing…",
  },
  pest_control: {
    heroImage: "https://images.unsplash.com/photo-1611284446314-60a58ac0deb9?w=800&q=80",
    heroOverlay: "linear-gradient(135deg, hsla(90,35%,12%,0.92) 0%, hsla(100,40%,22%,0.8) 100%)",
    accentHsl: "95 45% 38%",
    tagline: "Safe home, zero pests",
    emoji: "🐜",
    searchPlaceholder: "Cockroach, termite, rodent…",
  },

  // ── HEALTHCARE (additional) ──
  physio: {
    heroImage: "https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=800&q=80",
    heroOverlay: "linear-gradient(135deg, hsla(195,45%,10%,0.92) 0%, hsla(180,40%,20%,0.8) 100%)",
    accentHsl: "188 50% 40%",
    tagline: "Move better, live better",
    emoji: "🩺",
    searchPlaceholder: "Sports injury, rehab, therapy…",
  },

  // ── PROPERTY (additional) ──
  apartment: {
    heroImage: "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800&q=80",
    heroOverlay: "linear-gradient(135deg, hsla(220,38%,8%,0.92) 0%, hsla(215,35%,18%,0.8) 100%)",
    accentHsl: "218 42% 45%",
    tagline: "Modern living, perfect location",
    emoji: "🏢",
    searchPlaceholder: "Studio, 1BR, 2BR, penthouse…",
  },
  office: {
    heroImage: "https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&q=80",
    heroOverlay: "linear-gradient(135deg, hsla(215,40%,10%,0.92) 0%, hsla(210,35%,20%,0.8) 100%)",
    accentHsl: "212 45% 42%",
    tagline: "Premium workspaces, prime locations",
    emoji: "🏢",
    searchPlaceholder: "Coworking, private office…",
  },
  hostel: {
    heroImage: "https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=800&q=80",
    heroOverlay: "linear-gradient(135deg, hsla(25,40%,12%,0.92) 0%, hsla(35,45%,22%,0.8) 100%)",
    accentHsl: "28 50% 48%",
    tagline: "Social stays, smart prices",
    emoji: "🛏️",
    searchPlaceholder: "Dorm, private room, mixed…",
  },

  // ── SHOPS (additional) ──
  fashion: {
    heroImage: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800&q=80",
    heroOverlay: "linear-gradient(135deg, hsla(275,40%,10%,0.92) 0%, hsla(290,45%,20%,0.8) 100%)",
    accentHsl: "282 48% 48%",
    tagline: "Style that speaks volumes",
    emoji: "👗",
    searchPlaceholder: "Dress, shoes, accessories…",
  },
  electronics: {
    heroImage: "https://images.unsplash.com/photo-1468495244123-6c6c332eeece?w=800&q=80",
    heroOverlay: "linear-gradient(135deg, hsla(210,45%,10%,0.92) 0%, hsla(220,50%,20%,0.8) 100%)",
    accentHsl: "215 52% 48%",
    tagline: "Latest tech, best deals",
    emoji: "📱",
    searchPlaceholder: "Phone, laptop, headphones…",
  },
  flowers: {
    heroImage: "https://images.unsplash.com/photo-1487530811176-3780de880c2d?w=800&q=80",
    heroOverlay: "linear-gradient(135deg, hsla(340,40%,14%,0.92) 0%, hsla(350,45%,24%,0.8) 100%)",
    accentHsl: "345 50% 52%",
    tagline: "Beautiful blooms, any occasion",
    emoji: "💐",
    searchPlaceholder: "Roses, bouquet, arrangement…",
  },
  pets: {
    heroImage: "https://images.unsplash.com/photo-1450778869180-41d0601e046e?w=800&q=80",
    heroOverlay: "linear-gradient(135deg, hsla(30,40%,12%,0.92) 0%, hsla(35,45%,22%,0.8) 100%)",
    accentHsl: "32 55% 48%",
    tagline: "Everything for your furry friend",
    emoji: "🐾",
    searchPlaceholder: "Food, toys, grooming…",
  },

  // ── GROCERY (additional) ──
  mini_mart: {
    heroImage: "https://images.unsplash.com/photo-1604719312566-8912e9227c6a?w=800&q=80",
    heroOverlay: "linear-gradient(135deg, hsla(140,40%,10%,0.92) 0%, hsla(150,45%,20%,0.8) 100%)",
    accentHsl: "145 50% 38%",
    tagline: "Quick essentials, always close",
    emoji: "🏪",
    searchPlaceholder: "Snacks, drinks, basics…",
  },
  butcher: {
    heroImage: "https://images.unsplash.com/photo-1607623814075-e51df1bdc82f?w=800&q=80",
    heroOverlay: "linear-gradient(135deg, hsla(0,40%,12%,0.92) 0%, hsla(10,45%,20%,0.8) 100%)",
    accentHsl: "5 50% 42%",
    tagline: "Premium cuts, fresh daily",
    emoji: "🥩",
    searchPlaceholder: "Wagyu, lamb, chicken…",
  },

  // ── MOBILITY (additional) ──
  taxi: {
    heroImage: "https://images.unsplash.com/photo-1511527661048-7fe73d85e9a4?w=800&q=80",
    heroOverlay: "linear-gradient(135deg, hsla(45,50%,10%,0.92) 0%, hsla(40,55%,18%,0.8) 100%)",
    accentHsl: "42 60% 48%",
    tagline: "Your ride, right now",
    emoji: "🚕",
    searchPlaceholder: "Airport, city center, express…",
  },
  chauffeur: {
    heroImage: "https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=800&q=80",
    heroOverlay: "linear-gradient(135deg, hsla(220,40%,8%,0.92) 0%, hsla(215,38%,18%,0.8) 100%)",
    accentHsl: "218 42% 38%",
    tagline: "Premium rides, professional service",
    emoji: "🚘",
    searchPlaceholder: "Luxury, airport, hourly…",
  },

  // ── EXPERIENCES ──
  activities: {
    heroImage: "https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=800&q=80",
    heroOverlay: "linear-gradient(135deg, hsla(338,50%,12%,0.92) 0%, hsla(12,60%,20%,0.8) 100%)",
    accentHsl: "350 58% 50%",
    tagline: "Adventures that make memories",
    emoji: "🎯",
    searchPlaceholder: "Desert safari, skydiving, diving…",
  },
  events: {
    heroImage: "https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=800&q=80",
    heroOverlay: "linear-gradient(135deg, hsla(280,40%,12%,0.92) 0%, hsla(300,45%,22%,0.8) 100%)",
    accentHsl: "290 48% 48%",
    tagline: "Don't miss what's happening",
    emoji: "🎫",
    searchPlaceholder: "Concert, exhibition, festival…",
  },
};

export function getSubcategoryTheme(subcategory: string): SubcategoryTheme | null {
  return SUBCATEGORY_THEMES[subcategory] || null;
}
