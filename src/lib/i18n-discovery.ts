/**
 * i18n-discovery.ts — Canonical i18n keys for discovery surfaces.
 * Covers: verticals, subcategories, common discovery labels.
 * 3 languages: en, fr, ar. Fallback to en if key missing.
 */

export type DiscoveryLocale = "en" | "fr" | "ar";

const translations: Record<DiscoveryLocale, Record<string, string>> = {
  en: {
    // ── Verticals ──
    "discovery.vertical.food.title": "Food",
    "discovery.vertical.food.tagline": "Craving something delicious?",
    "discovery.vertical.food.search_placeholder": "Pizza, sushi, burger, coffee…",
    "discovery.vertical.food.empty_title": "No restaurants nearby",
    "discovery.vertical.food.empty_subtitle": "Try expanding your search radius",
    "discovery.vertical.food.loading": "Finding delicious options…",
    "discovery.vertical.food.results": "{count} restaurants near you",
    "discovery.vertical.food.cta_primary": "Order Now",
    "discovery.vertical.food.cta_secondary": "View Menu",

    "discovery.vertical.grocery.title": "Grocery",
    "discovery.vertical.grocery.tagline": "Fresh groceries, delivered fast",
    "discovery.vertical.grocery.search_placeholder": "Fruits, dairy, organic, snacks…",
    "discovery.vertical.grocery.empty_title": "No stores nearby",
    "discovery.vertical.grocery.empty_subtitle": "Try a different area",
    "discovery.vertical.grocery.loading": "Scanning nearby stores…",
    "discovery.vertical.grocery.results": "{count} stores near you",
    "discovery.vertical.grocery.cta_primary": "Shop Now",
    "discovery.vertical.grocery.cta_secondary": "Browse",

    "discovery.vertical.shops.title": "Shops",
    "discovery.vertical.shops.tagline": "Shop local, discover more",
    "discovery.vertical.shops.search_placeholder": "Fashion, electronics, gifts…",
    "discovery.vertical.shops.empty_title": "No shops found",
    "discovery.vertical.shops.empty_subtitle": "Explore a different category",
    "discovery.vertical.shops.loading": "Discovering shops…",
    "discovery.vertical.shops.results": "{count} shops near you",
    "discovery.vertical.shops.cta_primary": "Visit Store",
    "discovery.vertical.shops.cta_secondary": "Browse",

    "discovery.vertical.services.title": "Services",
    "discovery.vertical.services.tagline": "Trusted services at your door",
    "discovery.vertical.services.search_placeholder": "Cleaning, salon, repair, movers…",
    "discovery.vertical.services.empty_title": "No services available",
    "discovery.vertical.services.empty_subtitle": "Try a wider radius",
    "discovery.vertical.services.loading": "Finding trusted services…",
    "discovery.vertical.services.results": "{count} services near you",
    "discovery.vertical.services.cta_primary": "Book Now",
    "discovery.vertical.services.cta_secondary": "Get Quote",

    "discovery.vertical.property.title": "Property",
    "discovery.vertical.property.tagline": "Find your perfect space",
    "discovery.vertical.property.search_placeholder": "Apartment, villa, office…",
    "discovery.vertical.property.empty_title": "No properties found",
    "discovery.vertical.property.empty_subtitle": "Adjust your filters",
    "discovery.vertical.property.loading": "Searching properties…",
    "discovery.vertical.property.results": "{count} properties available",
    "discovery.vertical.property.cta_primary": "Book Stay",
    "discovery.vertical.property.cta_secondary": "View Details",

    "discovery.vertical.healthcare.title": "Healthcare",
    "discovery.vertical.healthcare.tagline": "Your health, our priority",
    "discovery.vertical.healthcare.search_placeholder": "Clinic, dentist, pharmacy…",
    "discovery.vertical.healthcare.empty_title": "No providers nearby",
    "discovery.vertical.healthcare.empty_subtitle": "Expand your search area",
    "discovery.vertical.healthcare.loading": "Finding healthcare providers…",
    "discovery.vertical.healthcare.results": "{count} providers near you",
    "discovery.vertical.healthcare.cta_primary": "Book Appointment",
    "discovery.vertical.healthcare.cta_secondary": "Call",

    "discovery.vertical.mobility.title": "Mobility",
    "discovery.vertical.mobility.tagline": "Move smarter, go further",
    "discovery.vertical.mobility.search_placeholder": "Ride, rental, parking…",
    "discovery.vertical.mobility.empty_title": "No rides available",
    "discovery.vertical.mobility.empty_subtitle": "Try again shortly",
    "discovery.vertical.mobility.loading": "Searching for rides…",
    "discovery.vertical.mobility.results": "{count} options available",
    "discovery.vertical.mobility.cta_primary": "Book Ride",
    "discovery.vertical.mobility.cta_secondary": "Get Price",

    "discovery.vertical.experiences.title": "Experiences",
    "discovery.vertical.experiences.tagline": "Unforgettable moments await",
    "discovery.vertical.experiences.search_placeholder": "Events, activities, tours…",
    "discovery.vertical.experiences.empty_title": "No experiences found",
    "discovery.vertical.experiences.empty_subtitle": "Check back soon for new events",
    "discovery.vertical.experiences.loading": "Discovering experiences…",
    "discovery.vertical.experiences.results": "{count} experiences near you",
    "discovery.vertical.experiences.cta_primary": "Book Now",
    "discovery.vertical.experiences.cta_secondary": "Learn More",

    // ── Subcategories ──
    "discovery.subcategory.pizza.title": "Pizza",
    "discovery.subcategory.pizza.tagline": "Wood-fired perfection, delivered hot",
    "discovery.subcategory.pizza.search_placeholder": "Margherita, pepperoni, calzone…",
    "discovery.subcategory.burger.title": "Burger",
    "discovery.subcategory.burger.tagline": "Smash it, stack it, devour it",
    "discovery.subcategory.burger.search_placeholder": "Classic, smash, wagyu, veggie…",
    "discovery.subcategory.sushi.title": "Sushi",
    "discovery.subcategory.sushi.tagline": "Fresh rolls, masterful craft",
    "discovery.subcategory.sushi.search_placeholder": "Maki, nigiri, sashimi, ramen…",
    "discovery.subcategory.coffee.title": "Coffee",
    "discovery.subcategory.coffee.tagline": "Your daily ritual, perfected",
    "discovery.subcategory.coffee.search_placeholder": "Latte, espresso, cold brew…",
    "discovery.subcategory.kebab.title": "Kebab",
    "discovery.subcategory.kebab.tagline": "Grilled to perfection, every time",
    "discovery.subcategory.kebab.search_placeholder": "Shawarma, doner, mixed grill…",
    "discovery.subcategory.hotel.title": "Hotels",
    "discovery.subcategory.hotel.tagline": "Luxury stays, unforgettable moments",
    "discovery.subcategory.hotel.search_placeholder": "5-star, boutique, beach…",
    "discovery.subcategory.resort.title": "Resorts",
    "discovery.subcategory.resort.tagline": "Paradise awaits, escape today",
    "discovery.subcategory.resort.search_placeholder": "Beach resort, all-inclusive…",
    "discovery.subcategory.short_stay.title": "Short Stay",
    "discovery.subcategory.short_stay.tagline": "Cozy stays, feel at home",
    "discovery.subcategory.short_stay.search_placeholder": "Studio, apartment, furnished…",
    "discovery.subcategory.salon.title": "Salon",
    "discovery.subcategory.salon.tagline": "Look amazing, feel confident",
    "discovery.subcategory.salon.search_placeholder": "Haircut, color, styling…",
    "discovery.subcategory.pharmacy.title": "Pharmacy",
    "discovery.subcategory.pharmacy.tagline": "Your health essentials, always near",
    "discovery.subcategory.pharmacy.search_placeholder": "Medicine, vitamins, first aid…",
    "discovery.subcategory.plumbing.title": "Plumbing",
    "discovery.subcategory.plumbing.tagline": "Expert plumbers, fast response",
    "discovery.subcategory.plumbing.search_placeholder": "Leak repair, installation…",
    "discovery.subcategory.electrical.title": "Electrical",
    "discovery.subcategory.electrical.tagline": "Safe wiring, bright solutions",
    "discovery.subcategory.electrical.search_placeholder": "Wiring, outlets, panel…",
    "discovery.subcategory.cleaning.title": "Cleaning",
    "discovery.subcategory.cleaning.tagline": "Spotless spaces, guaranteed",
    "discovery.subcategory.cleaning.search_placeholder": "Deep clean, move-out, regular…",

    // ── Common ──
    "discovery.common.open": "Open",
    "discovery.common.closed": "Closed",
    "discovery.common.popular": "Popular",
    "discovery.common.verified": "Verified",
    "discovery.common.sponsored": "Sponsored",
    "discovery.common.loading": "Loading…",
    "discovery.common.results_count": "{count} results",
    "discovery.common.no_results": "No results found",
    "discovery.common.see_all": "See all",
    "discovery.common.near_you": "Near you",
    "discovery.common.trending": "Trending",
    "discovery.common.best_rated": "Best Rated",
    "discovery.common.newest": "New",
    "discovery.common.filter": "Filter",
    "discovery.common.sort": "Sort",
    "discovery.common.radius": "Radius",
    "discovery.common.rating": "Rating",

    // ── Travel ──
    "travel.check_in": "Check-in",
    "travel.check_out": "Check-out",
    "travel.guests": "Guests",
    "travel.rooms": "Rooms",
    "travel.nights": "{count} nights",
    "travel.per_night": "per night",
    "travel.book_now": "Book Now",
    "travel.filters": "Filters",
    "travel.total_stay": "Total stay",
    "travel.available": "Available",
    "travel.sold_out": "Sold out",
  },

  fr: {
    "discovery.vertical.food.title": "Restauration",
    "discovery.vertical.food.tagline": "Une envie gourmande ?",
    "discovery.vertical.food.search_placeholder": "Pizza, sushi, burger, café…",
    "discovery.vertical.food.empty_title": "Aucun restaurant à proximité",
    "discovery.vertical.food.empty_subtitle": "Essayez d'élargir votre rayon de recherche",
    "discovery.vertical.food.loading": "Recherche de bons plans…",
    "discovery.vertical.food.results": "{count} restaurants près de vous",
    "discovery.vertical.food.cta_primary": "Commander",
    "discovery.vertical.food.cta_secondary": "Voir le menu",

    "discovery.vertical.grocery.title": "Courses",
    "discovery.vertical.grocery.tagline": "Courses fraîches, livrées vite",
    "discovery.vertical.grocery.search_placeholder": "Fruits, laitier, bio, snacks…",
    "discovery.vertical.grocery.empty_title": "Aucun magasin à proximité",
    "discovery.vertical.grocery.empty_subtitle": "Essayez une autre zone",
    "discovery.vertical.grocery.loading": "Recherche des magasins…",
    "discovery.vertical.grocery.results": "{count} magasins près de vous",
    "discovery.vertical.grocery.cta_primary": "Acheter",
    "discovery.vertical.grocery.cta_secondary": "Parcourir",

    "discovery.vertical.shops.title": "Boutiques",
    "discovery.vertical.shops.tagline": "Achetez local, découvrez plus",
    "discovery.vertical.shops.search_placeholder": "Mode, électronique, cadeaux…",
    "discovery.vertical.shops.empty_title": "Aucune boutique trouvée",
    "discovery.vertical.shops.empty_subtitle": "Explorez une autre catégorie",
    "discovery.vertical.shops.loading": "Découverte des boutiques…",
    "discovery.vertical.shops.results": "{count} boutiques près de vous",
    "discovery.vertical.shops.cta_primary": "Visiter",
    "discovery.vertical.shops.cta_secondary": "Parcourir",

    "discovery.vertical.services.title": "Services",
    "discovery.vertical.services.tagline": "Services de confiance à domicile",
    "discovery.vertical.services.search_placeholder": "Ménage, salon, réparation…",
    "discovery.vertical.services.empty_title": "Aucun service disponible",
    "discovery.vertical.services.empty_subtitle": "Essayez un rayon plus large",
    "discovery.vertical.services.loading": "Recherche de services…",
    "discovery.vertical.services.results": "{count} services près de vous",
    "discovery.vertical.services.cta_primary": "Réserver",
    "discovery.vertical.services.cta_secondary": "Devis",

    "discovery.vertical.property.title": "Immobilier",
    "discovery.vertical.property.tagline": "Trouvez votre espace idéal",
    "discovery.vertical.property.search_placeholder": "Appartement, villa, bureau…",
    "discovery.vertical.property.empty_title": "Aucun bien trouvé",
    "discovery.vertical.property.empty_subtitle": "Ajustez vos filtres",
    "discovery.vertical.property.loading": "Recherche de biens…",
    "discovery.vertical.property.results": "{count} biens disponibles",
    "discovery.vertical.property.cta_primary": "Réserver",
    "discovery.vertical.property.cta_secondary": "Voir détails",

    "discovery.vertical.healthcare.title": "Santé",
    "discovery.vertical.healthcare.tagline": "Votre santé, notre priorité",
    "discovery.vertical.healthcare.search_placeholder": "Clinique, dentiste, pharmacie…",
    "discovery.vertical.healthcare.empty_title": "Aucun praticien à proximité",
    "discovery.vertical.healthcare.empty_subtitle": "Élargissez votre zone de recherche",
    "discovery.vertical.healthcare.loading": "Recherche de praticiens…",
    "discovery.vertical.healthcare.results": "{count} praticiens près de vous",
    "discovery.vertical.healthcare.cta_primary": "Prendre RDV",
    "discovery.vertical.healthcare.cta_secondary": "Appeler",

    "discovery.vertical.mobility.title": "Mobilité",
    "discovery.vertical.mobility.tagline": "Bougez plus malin, allez plus loin",
    "discovery.vertical.mobility.search_placeholder": "Course, location, parking…",
    "discovery.vertical.mobility.empty_title": "Aucune course disponible",
    "discovery.vertical.mobility.empty_subtitle": "Réessayez bientôt",
    "discovery.vertical.mobility.loading": "Recherche de courses…",
    "discovery.vertical.mobility.results": "{count} options disponibles",
    "discovery.vertical.mobility.cta_primary": "Réserver",
    "discovery.vertical.mobility.cta_secondary": "Voir les prix",

    "discovery.vertical.experiences.title": "Expériences",
    "discovery.vertical.experiences.tagline": "Des moments inoubliables vous attendent",
    "discovery.vertical.experiences.search_placeholder": "Événements, activités, visites…",
    "discovery.vertical.experiences.empty_title": "Aucune expérience trouvée",
    "discovery.vertical.experiences.empty_subtitle": "Revenez bientôt",
    "discovery.vertical.experiences.loading": "Découverte des expériences…",
    "discovery.vertical.experiences.results": "{count} expériences près de vous",
    "discovery.vertical.experiences.cta_primary": "Réserver",
    "discovery.vertical.experiences.cta_secondary": "En savoir plus",

    // Subcategories
    "discovery.subcategory.pizza.title": "Pizza",
    "discovery.subcategory.pizza.tagline": "Perfection au feu de bois, livrée chaude",
    "discovery.subcategory.pizza.search_placeholder": "Margherita, pepperoni, calzone…",
    "discovery.subcategory.burger.title": "Burger",
    "discovery.subcategory.burger.tagline": "Écrasé, empilé, dévoré",
    "discovery.subcategory.burger.search_placeholder": "Classique, smash, wagyu, veggie…",
    "discovery.subcategory.sushi.title": "Sushi",
    "discovery.subcategory.sushi.tagline": "Rouleaux frais, art maîtrisé",
    "discovery.subcategory.sushi.search_placeholder": "Maki, nigiri, sashimi, ramen…",
    "discovery.subcategory.hotel.title": "Hôtels",
    "discovery.subcategory.hotel.tagline": "Séjours de luxe, moments inoubliables",
    "discovery.subcategory.hotel.search_placeholder": "5 étoiles, boutique, plage…",
    "discovery.subcategory.resort.title": "Resorts",
    "discovery.subcategory.resort.tagline": "Le paradis vous attend",
    "discovery.subcategory.resort.search_placeholder": "Resort balnéaire, tout inclus…",
    "discovery.subcategory.salon.title": "Salon",
    "discovery.subcategory.salon.tagline": "Soyez sublime, ayez confiance",
    "discovery.subcategory.salon.search_placeholder": "Coupe, couleur, coiffure…",
    "discovery.subcategory.pharmacy.title": "Pharmacie",
    "discovery.subcategory.pharmacy.tagline": "Vos essentiels santé, toujours proches",
    "discovery.subcategory.pharmacy.search_placeholder": "Médicaments, vitamines…",
    "discovery.subcategory.plumbing.title": "Plomberie",
    "discovery.subcategory.plumbing.tagline": "Plombiers experts, intervention rapide",
    "discovery.subcategory.plumbing.search_placeholder": "Fuite, installation…",
    "discovery.subcategory.cleaning.title": "Ménage",
    "discovery.subcategory.cleaning.tagline": "Espaces impeccables, garanti",
    "discovery.subcategory.cleaning.search_placeholder": "Grand ménage, déménagement…",

    // Common
    "discovery.common.open": "Ouvert",
    "discovery.common.closed": "Fermé",
    "discovery.common.popular": "Populaire",
    "discovery.common.verified": "Vérifié",
    "discovery.common.sponsored": "Sponsorisé",
    "discovery.common.loading": "Chargement…",
    "discovery.common.results_count": "{count} résultats",
    "discovery.common.no_results": "Aucun résultat",
    "discovery.common.see_all": "Voir tout",
    "discovery.common.near_you": "Près de vous",
    "discovery.common.trending": "Tendance",
    "discovery.common.best_rated": "Mieux notés",
    "discovery.common.newest": "Nouveaux",
    "discovery.common.filter": "Filtrer",
    "discovery.common.sort": "Trier",
    "discovery.common.radius": "Rayon",
    "discovery.common.rating": "Note",

    // Travel
    "travel.check_in": "Arrivée",
    "travel.check_out": "Départ",
    "travel.guests": "Voyageurs",
    "travel.rooms": "Chambres",
    "travel.nights": "{count} nuits",
    "travel.per_night": "par nuit",
    "travel.book_now": "Réserver",
    "travel.filters": "Filtres",
    "travel.total_stay": "Séjour total",
    "travel.available": "Disponible",
    "travel.sold_out": "Complet",
  },

  ar: {
    "discovery.vertical.food.title": "طعام",
    "discovery.vertical.food.tagline": "تشتهي شيئاً لذيذاً؟",
    "discovery.vertical.food.search_placeholder": "بيتزا، سوشي، برغر، قهوة…",
    "discovery.vertical.food.empty_title": "لا مطاعم قريبة",
    "discovery.vertical.food.empty_subtitle": "حاول توسيع نطاق البحث",
    "discovery.vertical.food.loading": "جارٍ البحث عن خيارات لذيذة…",
    "discovery.vertical.food.results": "{count} مطعم بالقرب منك",
    "discovery.vertical.food.cta_primary": "اطلب الآن",
    "discovery.vertical.food.cta_secondary": "عرض القائمة",

    "discovery.vertical.grocery.title": "بقالة",
    "discovery.vertical.grocery.tagline": "بقالة طازجة، توصيل سريع",
    "discovery.vertical.grocery.search_placeholder": "فواكه، ألبان، عضوي…",
    "discovery.vertical.grocery.empty_title": "لا متاجر قريبة",
    "discovery.vertical.grocery.empty_subtitle": "جرّب منطقة أخرى",
    "discovery.vertical.grocery.loading": "جارٍ البحث عن متاجر…",
    "discovery.vertical.grocery.results": "{count} متجر بالقرب منك",
    "discovery.vertical.grocery.cta_primary": "تسوّق الآن",
    "discovery.vertical.grocery.cta_secondary": "تصفّح",

    "discovery.vertical.shops.title": "متاجر",
    "discovery.vertical.shops.tagline": "تسوّق محلياً، اكتشف أكثر",
    "discovery.vertical.shops.search_placeholder": "أزياء، إلكترونيات، هدايا…",
    "discovery.vertical.shops.empty_title": "لا متاجر",
    "discovery.vertical.shops.empty_subtitle": "استكشف فئة أخرى",
    "discovery.vertical.shops.loading": "جارٍ اكتشاف المتاجر…",
    "discovery.vertical.shops.results": "{count} متجر بالقرب منك",
    "discovery.vertical.shops.cta_primary": "زيارة",
    "discovery.vertical.shops.cta_secondary": "تصفّح",

    "discovery.vertical.services.title": "خدمات",
    "discovery.vertical.services.tagline": "خدمات موثوقة لباب منزلك",
    "discovery.vertical.services.search_placeholder": "تنظيف، صالون، إصلاح…",
    "discovery.vertical.services.empty_title": "لا خدمات متاحة",
    "discovery.vertical.services.empty_subtitle": "جرّب نطاقاً أوسع",
    "discovery.vertical.services.loading": "جارٍ البحث عن خدمات…",
    "discovery.vertical.services.results": "{count} خدمة بالقرب منك",
    "discovery.vertical.services.cta_primary": "احجز الآن",
    "discovery.vertical.services.cta_secondary": "طلب عرض سعر",

    "discovery.vertical.property.title": "عقارات",
    "discovery.vertical.property.tagline": "اعثر على مساحتك المثالية",
    "discovery.vertical.property.search_placeholder": "شقة، فيلا، مكتب…",
    "discovery.vertical.property.empty_title": "لا عقارات",
    "discovery.vertical.property.empty_subtitle": "عدّل الفلاتر",
    "discovery.vertical.property.loading": "جارٍ البحث عن عقارات…",
    "discovery.vertical.property.results": "{count} عقار متاح",
    "discovery.vertical.property.cta_primary": "احجز إقامة",
    "discovery.vertical.property.cta_secondary": "عرض التفاصيل",

    "discovery.vertical.healthcare.title": "صحة",
    "discovery.vertical.healthcare.tagline": "صحتك أولويتنا",
    "discovery.vertical.healthcare.search_placeholder": "عيادة، طبيب أسنان، صيدلية…",
    "discovery.vertical.healthcare.empty_title": "لا مقدمي رعاية قريبين",
    "discovery.vertical.healthcare.empty_subtitle": "وسّع منطقة البحث",
    "discovery.vertical.healthcare.loading": "جارٍ البحث عن مقدمي الرعاية…",
    "discovery.vertical.healthcare.results": "{count} مقدم رعاية بالقرب منك",
    "discovery.vertical.healthcare.cta_primary": "حجز موعد",
    "discovery.vertical.healthcare.cta_secondary": "اتصل",

    "discovery.vertical.mobility.title": "تنقل",
    "discovery.vertical.mobility.tagline": "تنقّل أذكى، اذهب أبعد",
    "discovery.vertical.mobility.search_placeholder": "رحلة، إيجار، مواقف…",
    "discovery.vertical.mobility.empty_title": "لا رحلات متاحة",
    "discovery.vertical.mobility.empty_subtitle": "حاول مجدداً قريباً",
    "discovery.vertical.mobility.loading": "جارٍ البحث عن رحلات…",
    "discovery.vertical.mobility.results": "{count} خيار متاح",
    "discovery.vertical.mobility.cta_primary": "احجز رحلة",
    "discovery.vertical.mobility.cta_secondary": "عرض الأسعار",

    "discovery.vertical.experiences.title": "تجارب",
    "discovery.vertical.experiences.tagline": "لحظات لا تُنسى بانتظارك",
    "discovery.vertical.experiences.search_placeholder": "فعاليات، أنشطة، جولات…",
    "discovery.vertical.experiences.empty_title": "لا تجارب",
    "discovery.vertical.experiences.empty_subtitle": "تحقق قريباً",
    "discovery.vertical.experiences.loading": "جارٍ اكتشاف التجارب…",
    "discovery.vertical.experiences.results": "{count} تجربة بالقرب منك",
    "discovery.vertical.experiences.cta_primary": "احجز الآن",
    "discovery.vertical.experiences.cta_secondary": "اعرف أكثر",

    // Subcategories
    "discovery.subcategory.pizza.title": "بيتزا",
    "discovery.subcategory.pizza.tagline": "كمال الحطب، توصيل ساخن",
    "discovery.subcategory.pizza.search_placeholder": "مارغريتا، بيبروني…",
    "discovery.subcategory.burger.title": "برغر",
    "discovery.subcategory.burger.tagline": "اسحقه، رصّه، التهمه",
    "discovery.subcategory.burger.search_placeholder": "كلاسيك، سماش، واغيو…",
    "discovery.subcategory.hotel.title": "فنادق",
    "discovery.subcategory.hotel.tagline": "إقامات فاخرة، لحظات لا تُنسى",
    "discovery.subcategory.hotel.search_placeholder": "5 نجوم، بوتيك، شاطئ…",
    "discovery.subcategory.resort.title": "منتجعات",
    "discovery.subcategory.resort.tagline": "الجنة بانتظارك",
    "discovery.subcategory.resort.search_placeholder": "منتجع شاطئي، شامل…",
    "discovery.subcategory.salon.title": "صالون",
    "discovery.subcategory.salon.tagline": "اظهر رائعاً، اشعر بالثقة",
    "discovery.subcategory.salon.search_placeholder": "قص شعر، صبغة، تسريحة…",
    "discovery.subcategory.pharmacy.title": "صيدلية",
    "discovery.subcategory.pharmacy.tagline": "مستلزماتك الصحية، دائماً قريبة",
    "discovery.subcategory.pharmacy.search_placeholder": "أدوية، فيتامينات…",

    // Common
    "discovery.common.open": "مفتوح",
    "discovery.common.closed": "مغلق",
    "discovery.common.popular": "شائع",
    "discovery.common.verified": "موثّق",
    "discovery.common.sponsored": "مموّل",
    "discovery.common.loading": "جارٍ التحميل…",
    "discovery.common.results_count": "{count} نتيجة",
    "discovery.common.no_results": "لا نتائج",
    "discovery.common.see_all": "عرض الكل",
    "discovery.common.near_you": "بالقرب منك",
    "discovery.common.trending": "رائج",
    "discovery.common.best_rated": "الأعلى تقييماً",
    "discovery.common.newest": "جديد",
    "discovery.common.filter": "تصفية",
    "discovery.common.sort": "ترتيب",
    "discovery.common.radius": "النطاق",
    "discovery.common.rating": "التقييم",

    // Travel
    "travel.check_in": "تسجيل الوصول",
    "travel.check_out": "تسجيل المغادرة",
    "travel.guests": "الضيوف",
    "travel.rooms": "الغرف",
    "travel.nights": "{count} ليالٍ",
    "travel.per_night": "لليلة",
    "travel.book_now": "احجز الآن",
    "travel.filters": "الفلاتر",
    "travel.total_stay": "إجمالي الإقامة",
    "travel.available": "متاح",
    "travel.sold_out": "نفذ",
  },
};

/** Get current discovery locale — delegates to canonical i18n if available */
function getDiscoveryLocale(): DiscoveryLocale {
  try {
    // Use shared locale from canonical system
    const { getAppLocale } = require("@/lib/i18n-canonical");
    return getAppLocale() as DiscoveryLocale;
  } catch {
    try {
      const stored = localStorage.getItem("app-locale");
      if (stored && (stored === "fr" || stored === "ar")) return stored;
      const lang = navigator.language?.split("-")[0];
      if (lang === "fr" || lang === "ar") return lang;
    } catch {}
    return "en";
  }
}

let _cachedLocale: DiscoveryLocale | null = null;

/**
 * Translate a discovery i18n key with optional interpolation.
 * Falls back to English if key is missing in current locale.
 */
export function td(key: string, params?: Record<string, string | number>): string {
  if (!_cachedLocale) _cachedLocale = getDiscoveryLocale();
  const locale = _cachedLocale;
  let value = translations[locale]?.[key] || translations.en[key] || key;
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      value = value.replace(`{${k}}`, String(v));
    }
  }
  return value;
}

/** Reset cached locale (call when user changes language) */
export function resetDiscoveryLocale(): void {
  _cachedLocale = null;
}

/** Get all keys for a vertical */
export function getVerticalI18n(vertical: string) {
  return {
    title: td(`discovery.vertical.${vertical}.title`),
    tagline: td(`discovery.vertical.${vertical}.tagline`),
    searchPlaceholder: td(`discovery.vertical.${vertical}.search_placeholder`),
    emptyTitle: td(`discovery.vertical.${vertical}.empty_title`),
    emptySubtitle: td(`discovery.vertical.${vertical}.empty_subtitle`),
    loading: td(`discovery.vertical.${vertical}.loading`),
    results: (count: number) => td(`discovery.vertical.${vertical}.results`, { count }),
    ctaPrimary: td(`discovery.vertical.${vertical}.cta_primary`),
    ctaSecondary: td(`discovery.vertical.${vertical}.cta_secondary`),
  };
}

/** Get all keys for a subcategory */
export function getSubcategoryI18n(subcategory: string) {
  return {
    title: td(`discovery.subcategory.${subcategory}.title`),
    tagline: td(`discovery.subcategory.${subcategory}.tagline`),
    searchPlaceholder: td(`discovery.subcategory.${subcategory}.search_placeholder`),
  };
}
