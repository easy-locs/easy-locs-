export type { CanonicalVertical } from "@/domains/shared/canonical-types";
import type { CanonicalVertical } from "@/domains/shared/canonical-types";
import { SUBCATEGORY_ALIASES } from "@/lib/taxonomy/taxonomy-aliases";

export type MediaKind =
  | "exterior"
  | "interior"
  | "dish"
  | "menu"
  | "logo"
  | "facade"
  | "lobby"
  | "room"
  | "bathroom"
  | "pool"
  | "amenities"
  | "building"
  | "reception"
  | "treatment_room"
  | "equipment"
  | "entrance"
  | "gym_floor"
  | "machines"
  | "studio"
  | "locker"
  | "product"
  | "storefront"
  | "window_display"
  | "vehicle"
  | "driver_portrait"
  | "fuel_station"
  | "atm_machine"
  | "pharmacy_front"
  | "parking_lot"
  | "event_venue"
  | "activity"
  | "landscape"
  | "listing_hero"
  | "floor_plan"
  | "neighborhood"
  | "cover"
  | "gallery"
  | "generic";

export type CardTemplate =
  | "RestaurantCard"
  | "CafeCard"
  | "GroceryCard"
  | "ShopCard"
  | "ServiceCard"
  | "ClinicCard"
  | "HospitalCard"
  | "GymCard"
  | "PropertyCard"
  | "HotelCard"
  | "TaxiCard"
  | "UtilityCard"
  | "BeautyCard"
  | "ExperienceCard"
  | "GenericCard";

export interface CanonicalSubtype {
  key: string;
  label: string;
  aliases: string[];
}

export interface CanonicalType {
  key: string;
  label: string;
  subtypes: CanonicalSubtype[];
  allowedMediaKinds: MediaKind[];
  requiredFields: string[];
  optionalFields: string[];
  allowedCardTemplates: CardTemplate[];
  aliases: string[];
}

export interface CanonicalSubcategory {
  key: string;
  label: string;
  canonicalTypes: CanonicalType[];
  aliases: string[];
}

export interface CanonicalCategory {
  key: string;
  label: string;
  subcategories: CanonicalSubcategory[];
  aliases: string[];
}

export interface CanonicalFamily {
  vertical: CanonicalVertical;
  label: string;
  categories: CanonicalCategory[];
  defaultMediaKinds: MediaKind[];
  defaultCardTemplate: CardTemplate;
}

export interface CanonicalNode {
  vertical: CanonicalVertical;
  category: string;
  subcategory: string;
  canonicalType: string;
  canonicalSubtype: string | null;
  path: string;
}

export interface AliasEntry {
  alias: string;
  canonicalPath: string;
  confidence: number;
}

const FOOD_FAMILY: CanonicalFamily = {
  vertical: "food",
  label: "Food & Dining",
  defaultMediaKinds: ["exterior", "interior", "dish", "menu", "logo"],
  defaultCardTemplate: "RestaurantCard",
  categories: [
    {
      key: "restaurant",
      label: "Restaurant",
      aliases: ["dining", "eatery", "diner", "bistro", "brasserie"],
      subcategories: [
        {
          key: "fine_dining",
          label: "Fine Dining",
          aliases: ["upscale", "gourmet", "haute cuisine"],
          canonicalTypes: [{
            key: "fine_dining_restaurant",
            label: "Fine Dining Restaurant",
            subtypes: [],
            allowedMediaKinds: ["exterior", "interior", "dish", "menu", "logo"],
            requiredFields: ["name", "address", "vertical", "category"],
            optionalFields: ["phone", "email", "rating", "price_range"],
            allowedCardTemplates: ["RestaurantCard"],
            aliases: ["upscale restaurant", "gourmet restaurant"],
          }],
        },
        {
          key: "casual_dining",
          label: "Casual Dining",
          aliases: ["casual", "family restaurant", "sit-down"],
          canonicalTypes: [{
            key: "casual_dining_restaurant",
            label: "Casual Dining Restaurant",
            subtypes: [],
            allowedMediaKinds: ["exterior", "interior", "dish", "menu", "logo"],
            requiredFields: ["name", "address", "vertical", "category"],
            optionalFields: ["phone", "email", "rating"],
            allowedCardTemplates: ["RestaurantCard"],
            aliases: ["family dining", "sit-down restaurant"],
          }],
        },
        {
          key: "fast_food",
          label: "Fast Food",
          aliases: ["quick service", "qsr", "takeaway"],
          canonicalTypes: [{
            key: "fast_food_restaurant",
            label: "Fast Food Restaurant",
            subtypes: [
              { key: "burger", label: "Burger", aliases: ["hamburger"] },
              { key: "pizza", label: "Pizza", aliases: ["pizzeria"] },
              { key: "fried_chicken", label: "Fried Chicken", aliases: ["chicken"] },
              { key: "shawarma", label: "Shawarma", aliases: ["kebab", "doner", "gyro"] },
            ],
            allowedMediaKinds: ["exterior", "interior", "dish", "menu", "logo"],
            requiredFields: ["name", "address", "vertical", "category"],
            optionalFields: ["phone", "delivery_available"],
            allowedCardTemplates: ["RestaurantCard"],
            aliases: ["fast food", "quick service restaurant"],
          }],
        },
        {
          key: "cuisine",
          label: "Cuisine-Specific",
          aliases: [],
          canonicalTypes: [{
            key: "cuisine_restaurant",
            label: "Cuisine Restaurant",
            subtypes: [
              { key: "italian", label: "Italian", aliases: ["pasta", "trattoria"] },
              { key: "japanese", label: "Japanese", aliases: ["sushi", "ramen", "izakaya"] },
              { key: "chinese", label: "Chinese", aliases: ["dim sum", "wok"] },
              { key: "indian", label: "Indian", aliases: ["curry", "tandoori", "biryani"] },
              { key: "lebanese", label: "Lebanese", aliases: ["middle eastern"] },
              { key: "arabic", label: "Arabic", aliases: ["arab cuisine"] },
              { key: "turkish", label: "Turkish", aliases: ["ottoman cuisine"] },
              { key: "mexican", label: "Mexican", aliases: ["tex-mex", "taco"] },
              { key: "thai", label: "Thai", aliases: ["pad thai", "tom yum"] },
              { key: "korean", label: "Korean", aliases: ["korean bbq", "bibimbap"] },
              { key: "french", label: "French", aliases: ["patisserie", "brasserie"] },
              { key: "spanish", label: "Spanish", aliases: ["tapas", "paella"] },
              { key: "greek", label: "Greek", aliases: ["souvlaki", "gyros"] },
              { key: "persian", label: "Persian", aliases: ["iranian", "kebab"] },
              { key: "african", label: "African", aliases: ["jollof", "fufu"] },
              { key: "ethiopian", label: "Ethiopian", aliases: ["injera"] },
              { key: "vietnamese", label: "Vietnamese", aliases: ["pho", "banh mi"] },
              { key: "filipino", label: "Filipino", aliases: ["adobo"] },
              { key: "brazilian", label: "Brazilian", aliases: ["churrasco"] },
              { key: "caribbean", label: "Caribbean", aliases: ["jerk"] },
              { key: "moroccan", label: "Moroccan", aliases: ["tagine"] },
              { key: "pakistani", label: "Pakistani", aliases: ["karahi"] },
              { key: "german", label: "German", aliases: ["bratwurst", "schnitzel"] },
              { key: "seafood", label: "Seafood", aliases: ["fish", "shellfish"] },
            ],
            allowedMediaKinds: ["exterior", "interior", "dish", "menu", "logo"],
            requiredFields: ["name", "address", "vertical", "category"],
            optionalFields: ["phone", "email", "cuisine_type"],
            allowedCardTemplates: ["RestaurantCard"],
            aliases: [],
          }],
        },
      ],
    },
    {
      key: "cafe",
      label: "Cafe & Coffee",
      aliases: ["coffee shop", "coffeehouse", "tea house"],
      subcategories: [
        {
          key: "coffee_shop",
          label: "Coffee Shop",
          aliases: ["espresso bar", "coffee house"],
          canonicalTypes: [{
            key: "coffee_shop",
            label: "Coffee Shop",
            subtypes: [],
            allowedMediaKinds: ["exterior", "interior", "dish", "logo"],
            requiredFields: ["name", "address", "vertical", "category"],
            optionalFields: ["phone"],
            allowedCardTemplates: ["CafeCard", "RestaurantCard"],
            aliases: ["cafe", "coffee house", "espresso bar"],
          }],
        },
        {
          key: "bakery",
          label: "Bakery",
          aliases: ["patisserie", "bread shop"],
          canonicalTypes: [{
            key: "bakery",
            label: "Bakery",
            subtypes: [],
            allowedMediaKinds: ["exterior", "interior", "dish", "logo"],
            requiredFields: ["name", "address", "vertical", "category"],
            optionalFields: ["phone"],
            allowedCardTemplates: ["CafeCard", "RestaurantCard"],
            aliases: ["patisserie", "pastry shop"],
          }],
        },
        {
          key: "juice_bar",
          label: "Juice Bar",
          aliases: ["smoothie bar", "juice shop"],
          canonicalTypes: [{
            key: "juice_bar",
            label: "Juice Bar",
            subtypes: [],
            allowedMediaKinds: ["exterior", "interior", "dish", "logo"],
            requiredFields: ["name", "address", "vertical", "category"],
            optionalFields: ["phone"],
            allowedCardTemplates: ["CafeCard", "RestaurantCard"],
            aliases: ["smoothie bar", "acai bar"],
          }],
        },
      ],
    },
    {
      key: "cloud_kitchen",
      label: "Cloud Kitchen",
      aliases: ["ghost kitchen", "virtual kitchen", "dark kitchen", "delivery only"],
      subcategories: [
        {
          key: "cloud_kitchen",
          label: "Cloud Kitchen",
          aliases: ["ghost kitchen"],
          canonicalTypes: [{
            key: "cloud_kitchen",
            label: "Cloud Kitchen",
            subtypes: [],
            allowedMediaKinds: ["dish", "menu", "logo"],
            requiredFields: ["name", "vertical", "category"],
            optionalFields: ["phone"],
            allowedCardTemplates: ["RestaurantCard"],
            aliases: ["ghost kitchen", "virtual kitchen", "dark kitchen"],
          }],
        },
      ],
    },
  ],
};

const STAY_FAMILY: CanonicalFamily = {
  vertical: "stay",
  label: "Hotels & Stays",
  defaultMediaKinds: ["facade", "lobby", "room", "bathroom", "pool", "amenities", "logo"],
  defaultCardTemplate: "HotelCard",
  categories: [
    {
      key: "hotel",
      label: "Hotel",
      aliases: ["inn", "lodge"],
      subcategories: [
        {
          key: "business_hotel",
          label: "Business Hotel",
          aliases: ["corporate hotel"],
          canonicalTypes: [{
            key: "business_hotel",
            label: "Business Hotel",
            subtypes: [],
            allowedMediaKinds: ["facade", "lobby", "room", "bathroom", "pool", "amenities", "logo"],
            requiredFields: ["name", "address", "vertical", "category", "star_rating"],
            optionalFields: ["phone", "email", "price_per_night"],
            allowedCardTemplates: ["HotelCard"],
            aliases: ["corporate hotel"],
          }],
        },
        {
          key: "boutique_hotel",
          label: "Boutique Hotel",
          aliases: ["design hotel"],
          canonicalTypes: [{
            key: "boutique_hotel",
            label: "Boutique Hotel",
            subtypes: [],
            allowedMediaKinds: ["facade", "lobby", "room", "bathroom", "pool", "amenities", "logo"],
            requiredFields: ["name", "address", "vertical", "category"],
            optionalFields: ["phone", "email", "price_per_night", "star_rating"],
            allowedCardTemplates: ["HotelCard"],
            aliases: ["design hotel", "charming hotel"],
          }],
        },
        {
          key: "resort",
          label: "Resort",
          aliases: ["beach resort", "mountain resort"],
          canonicalTypes: [{
            key: "resort",
            label: "Resort",
            subtypes: [
              { key: "beach_resort", label: "Beach Resort", aliases: ["seaside resort"] },
              { key: "mountain_resort", label: "Mountain Resort", aliases: ["ski resort"] },
              { key: "spa_resort", label: "Spa Resort", aliases: ["wellness resort"] },
            ],
            allowedMediaKinds: ["facade", "lobby", "room", "bathroom", "pool", "amenities", "landscape", "logo"],
            requiredFields: ["name", "address", "vertical", "category"],
            optionalFields: ["phone", "email", "price_per_night", "star_rating"],
            allowedCardTemplates: ["HotelCard"],
            aliases: ["holiday resort"],
          }],
        },
      ],
    },
    {
      key: "aparthotel",
      label: "Aparthotel",
      aliases: ["apart hotel", "serviced apartment", "furnished apartment"],
      subcategories: [
        {
          key: "serviced_apartment",
          label: "Serviced Apartment",
          aliases: ["apart-hotel", "extended stay"],
          canonicalTypes: [{
            key: "serviced_apartment",
            label: "Serviced Apartment",
            subtypes: [],
            allowedMediaKinds: ["facade", "lobby", "room", "bathroom", "amenities", "logo"],
            requiredFields: ["name", "address", "vertical", "category"],
            optionalFields: ["phone", "email", "price_per_night"],
            allowedCardTemplates: ["HotelCard"],
            aliases: ["apart hotel", "extended stay"],
          }],
        },
      ],
    },
    {
      key: "holiday_rental",
      label: "Holiday Rental",
      aliases: ["vacation rental", "short stay", "airbnb"],
      subcategories: [
        {
          key: "holiday_home",
          label: "Holiday Home",
          aliases: ["vacation home"],
          canonicalTypes: [{
            key: "holiday_home",
            label: "Holiday Home",
            subtypes: [],
            allowedMediaKinds: ["facade", "room", "bathroom", "pool", "amenities", "logo"],
            requiredFields: ["name", "address", "vertical", "category"],
            optionalFields: ["phone", "price_per_night"],
            allowedCardTemplates: ["HotelCard"],
            aliases: ["vacation home", "holiday rental"],
          }],
        },
      ],
    },
  ],
};

const HEALTH_FAMILY: CanonicalFamily = {
  vertical: "healthcare",
  label: "Health & Medical",
  defaultMediaKinds: ["building", "reception", "treatment_room", "equipment", "logo"],
  defaultCardTemplate: "ClinicCard",
  categories: [
    {
      key: "clinic",
      label: "Clinic",
      aliases: ["medical center", "health center", "polyclinic"],
      subcategories: [
        {
          key: "general",
          label: "General Clinic",
          aliases: ["gp", "family clinic", "primary care"],
          canonicalTypes: [{
            key: "general_clinic",
            label: "General Clinic",
            subtypes: [],
            allowedMediaKinds: ["building", "reception", "treatment_room", "equipment", "logo"],
            requiredFields: ["name", "address", "vertical", "category"],
            optionalFields: ["phone", "email", "specialties"],
            allowedCardTemplates: ["ClinicCard"],
            aliases: ["gp clinic", "family practice"],
          }],
        },
        {
          key: "dental",
          label: "Dental Clinic",
          aliases: ["dentist", "dental practice", "orthodontist"],
          canonicalTypes: [{
            key: "dental_clinic",
            label: "Dental Clinic",
            subtypes: [
              { key: "general_dentistry", label: "General Dentistry", aliases: [] },
              { key: "orthodontics", label: "Orthodontics", aliases: ["braces"] },
              { key: "cosmetic_dentistry", label: "Cosmetic Dentistry", aliases: ["veneers", "whitening"] },
            ],
            allowedMediaKinds: ["building", "reception", "treatment_room", "equipment", "logo"],
            requiredFields: ["name", "address", "vertical", "category"],
            optionalFields: ["phone", "email"],
            allowedCardTemplates: ["ClinicCard"],
            aliases: ["dentist", "dental office"],
          }],
        },
        {
          key: "dermatology",
          label: "Dermatology",
          aliases: ["skin clinic", "dermatologist"],
          canonicalTypes: [{
            key: "dermatology_clinic",
            label: "Dermatology Clinic",
            subtypes: [],
            allowedMediaKinds: ["building", "reception", "treatment_room", "equipment", "logo"],
            requiredFields: ["name", "address", "vertical", "category"],
            optionalFields: ["phone", "email"],
            allowedCardTemplates: ["ClinicCard"],
            aliases: ["skin clinic", "dermatologist office"],
          }],
        },
        {
          key: "ophthalmology",
          label: "Ophthalmology",
          aliases: ["eye clinic", "eye doctor", "optometrist"],
          canonicalTypes: [{
            key: "ophthalmology_clinic",
            label: "Ophthalmology Clinic",
            subtypes: [],
            allowedMediaKinds: ["building", "reception", "treatment_room", "equipment", "logo"],
            requiredFields: ["name", "address", "vertical", "category"],
            optionalFields: ["phone", "email"],
            allowedCardTemplates: ["ClinicCard"],
            aliases: ["eye clinic", "vision center"],
          }],
        },
      ],
    },
    {
      key: "hospital",
      label: "Hospital",
      aliases: ["medical hospital", "medical facility"],
      subcategories: [
        {
          key: "general_hospital",
          label: "General Hospital",
          aliases: ["public hospital"],
          canonicalTypes: [{
            key: "general_hospital",
            label: "General Hospital",
            subtypes: [],
            allowedMediaKinds: ["building", "reception", "equipment", "logo"],
            requiredFields: ["name", "address", "vertical", "category"],
            optionalFields: ["phone", "email", "bed_count"],
            allowedCardTemplates: ["HospitalCard", "ClinicCard"],
            aliases: ["hospital"],
          }],
        },
      ],
    },
    {
      key: "pharmacy",
      label: "Pharmacy",
      aliases: ["drugstore", "apothecary"],
      subcategories: [
        {
          key: "retail_pharmacy",
          label: "Retail Pharmacy",
          aliases: ["drugstore"],
          canonicalTypes: [{
            key: "retail_pharmacy",
            label: "Retail Pharmacy",
            subtypes: [],
            allowedMediaKinds: ["exterior", "interior", "logo"],
            requiredFields: ["name", "address", "vertical", "category"],
            optionalFields: ["phone", "delivery_available"],
            allowedCardTemplates: ["ClinicCard"],
            aliases: ["pharmacy", "drugstore"],
          }],
        },
      ],
    },
    {
      key: "lab",
      label: "Laboratory",
      aliases: ["diagnostic lab", "pathology lab"],
      subcategories: [
        {
          key: "diagnostic_lab",
          label: "Diagnostic Lab",
          aliases: ["blood test", "pathology"],
          canonicalTypes: [{
            key: "diagnostic_lab",
            label: "Diagnostic Lab",
            subtypes: [],
            allowedMediaKinds: ["building", "reception", "equipment", "logo"],
            requiredFields: ["name", "address", "vertical", "category"],
            optionalFields: ["phone"],
            allowedCardTemplates: ["ClinicCard"],
            aliases: ["lab", "diagnostics center"],
          }],
        },
      ],
    },
  ],
};

const FITNESS_FAMILY: CanonicalFamily = {
  vertical: "beauty",
  label: "Fitness & Wellness",
  defaultMediaKinds: ["entrance", "gym_floor", "machines", "studio", "reception", "logo"],
  defaultCardTemplate: "GymCard",
  categories: [
    {
      key: "gym",
      label: "Gym",
      aliases: ["gymnasium", "fitness center", "health club", "fitness club"],
      subcategories: [
        {
          key: "general_gym",
          label: "General Gym",
          aliases: ["fitness gym"],
          canonicalTypes: [{
            key: "general_gym",
            label: "General Gym",
            subtypes: [],
            allowedMediaKinds: ["entrance", "gym_floor", "machines", "studio", "locker", "reception", "logo"],
            requiredFields: ["name", "address", "vertical", "category"],
            optionalFields: ["phone", "membership_price"],
            allowedCardTemplates: ["GymCard"],
            aliases: ["gym", "fitness center", "health club"],
          }],
        },
        {
          key: "crossfit",
          label: "CrossFit",
          aliases: ["crossfit box"],
          canonicalTypes: [{
            key: "crossfit_gym",
            label: "CrossFit Gym",
            subtypes: [],
            allowedMediaKinds: ["entrance", "gym_floor", "machines", "studio", "logo"],
            requiredFields: ["name", "address", "vertical", "category"],
            optionalFields: ["phone"],
            allowedCardTemplates: ["GymCard"],
            aliases: ["crossfit box", "functional fitness"],
          }],
        },
        {
          key: "yoga_studio",
          label: "Yoga Studio",
          aliases: ["yoga center"],
          canonicalTypes: [{
            key: "yoga_studio",
            label: "Yoga Studio",
            subtypes: [],
            allowedMediaKinds: ["entrance", "studio", "reception", "logo"],
            requiredFields: ["name", "address", "vertical", "category"],
            optionalFields: ["phone"],
            allowedCardTemplates: ["GymCard"],
            aliases: ["yoga center", "meditation studio"],
          }],
        },
        {
          key: "pilates_studio",
          label: "Pilates Studio",
          aliases: ["pilates center"],
          canonicalTypes: [{
            key: "pilates_studio",
            label: "Pilates Studio",
            subtypes: [],
            allowedMediaKinds: ["entrance", "studio", "machines", "logo"],
            requiredFields: ["name", "address", "vertical", "category"],
            optionalFields: ["phone"],
            allowedCardTemplates: ["GymCard"],
            aliases: ["pilates center"],
          }],
        },
      ],
    },
    {
      key: "personal_training",
      label: "Personal Training",
      aliases: ["personal trainer", "pt"],
      subcategories: [
        {
          key: "personal_trainer",
          label: "Personal Trainer",
          aliases: ["pt", "fitness coach"],
          canonicalTypes: [{
            key: "personal_trainer",
            label: "Personal Trainer",
            subtypes: [],
            allowedMediaKinds: ["gym_floor", "studio", "logo"],
            requiredFields: ["name", "vertical", "category"],
            optionalFields: ["phone", "certifications"],
            allowedCardTemplates: ["GymCard", "ServiceCard"],
            aliases: ["fitness trainer", "fitness coach"],
          }],
        },
      ],
    },
  ],
};

const SERVICES_FAMILY: CanonicalFamily = {
  vertical: "services",
  label: "Services",
  defaultMediaKinds: ["exterior", "interior", "logo"],
  defaultCardTemplate: "ServiceCard",
  categories: [
    {
      key: "home_services",
      label: "Home Services",
      aliases: ["household services"],
      subcategories: [
        {
          key: "cleaning",
          label: "Cleaning",
          aliases: ["house cleaning", "maid service"],
          canonicalTypes: [{
            key: "cleaning_service",
            label: "Cleaning Service",
            subtypes: [
              { key: "residential", label: "Residential Cleaning", aliases: ["home cleaning"] },
              { key: "commercial", label: "Commercial Cleaning", aliases: ["office cleaning"] },
              { key: "deep_cleaning", label: "Deep Cleaning", aliases: ["spring cleaning"] },
            ],
            allowedMediaKinds: ["exterior", "interior", "logo"],
            requiredFields: ["name", "vertical", "category"],
            optionalFields: ["phone", "service_area"],
            allowedCardTemplates: ["ServiceCard"],
            aliases: ["cleaner", "cleaning company"],
          }],
        },
        {
          key: "plumbing",
          label: "Plumbing",
          aliases: ["plumber"],
          canonicalTypes: [{
            key: "plumbing_service",
            label: "Plumbing Service",
            subtypes: [],
            allowedMediaKinds: ["exterior", "logo"],
            requiredFields: ["name", "vertical", "category"],
            optionalFields: ["phone", "service_area"],
            allowedCardTemplates: ["ServiceCard"],
            aliases: ["plumber"],
          }],
        },
        {
          key: "electrical",
          label: "Electrical",
          aliases: ["electrician"],
          canonicalTypes: [{
            key: "electrical_service",
            label: "Electrical Service",
            subtypes: [],
            allowedMediaKinds: ["exterior", "logo"],
            requiredFields: ["name", "vertical", "category"],
            optionalFields: ["phone", "service_area"],
            allowedCardTemplates: ["ServiceCard"],
            aliases: ["electrician"],
          }],
        },
        {
          key: "ac_repair",
          label: "AC Repair",
          aliases: ["hvac", "air conditioning"],
          canonicalTypes: [{
            key: "ac_repair_service",
            label: "AC Repair Service",
            subtypes: [],
            allowedMediaKinds: ["exterior", "logo"],
            requiredFields: ["name", "vertical", "category"],
            optionalFields: ["phone"],
            allowedCardTemplates: ["ServiceCard"],
            aliases: ["hvac service", "air conditioning repair"],
          }],
        },
        {
          key: "movers",
          label: "Movers",
          aliases: ["moving company", "relocation"],
          canonicalTypes: [{
            key: "moving_service",
            label: "Moving Service",
            subtypes: [],
            allowedMediaKinds: ["exterior", "vehicle", "logo"],
            requiredFields: ["name", "vertical", "category"],
            optionalFields: ["phone"],
            allowedCardTemplates: ["ServiceCard"],
            aliases: ["moving company", "relocation service"],
          }],
        },
        {
          key: "handyman",
          label: "Handyman",
          aliases: ["maintenance", "repair"],
          canonicalTypes: [{
            key: "handyman_service",
            label: "Handyman Service",
            subtypes: [],
            allowedMediaKinds: ["exterior", "logo"],
            requiredFields: ["name", "vertical", "category"],
            optionalFields: ["phone"],
            allowedCardTemplates: ["ServiceCard"],
            aliases: ["maintenance service"],
          }],
        },
        {
          key: "pest_control",
          label: "Pest Control",
          aliases: ["exterminator"],
          canonicalTypes: [{
            key: "pest_control_service",
            label: "Pest Control Service",
            subtypes: [],
            allowedMediaKinds: ["exterior", "vehicle", "logo"],
            requiredFields: ["name", "vertical", "category"],
            optionalFields: ["phone"],
            allowedCardTemplates: ["ServiceCard"],
            aliases: ["exterminator"],
          }],
        },
      ],
    },
    {
      key: "professional_services",
      label: "Professional Services",
      aliases: ["business services"],
      subcategories: [
        {
          key: "legal",
          label: "Legal",
          aliases: ["lawyer", "attorney", "law firm"],
          canonicalTypes: [{
            key: "legal_service",
            label: "Legal Service",
            subtypes: [],
            allowedMediaKinds: ["exterior", "interior", "logo"],
            requiredFields: ["name", "vertical", "category"],
            optionalFields: ["phone", "email", "specialization"],
            allowedCardTemplates: ["ServiceCard"],
            aliases: ["lawyer", "law firm", "attorney"],
          }],
        },
        {
          key: "accounting",
          label: "Accounting",
          aliases: ["accountant", "bookkeeping"],
          canonicalTypes: [{
            key: "accounting_service",
            label: "Accounting Service",
            subtypes: [],
            allowedMediaKinds: ["exterior", "interior", "logo"],
            requiredFields: ["name", "vertical", "category"],
            optionalFields: ["phone", "email"],
            allowedCardTemplates: ["ServiceCard"],
            aliases: ["accountant", "bookkeeper"],
          }],
        },
        {
          key: "tutoring",
          label: "Tutoring",
          aliases: ["tutor", "private lessons"],
          canonicalTypes: [{
            key: "tutoring_service",
            label: "Tutoring Service",
            subtypes: [],
            allowedMediaKinds: ["exterior", "interior", "logo"],
            requiredFields: ["name", "vertical", "category"],
            optionalFields: ["phone", "subjects"],
            allowedCardTemplates: ["ServiceCard"],
            aliases: ["tutor", "teacher"],
          }],
        },
      ],
    },
    {
      key: "vehicle_services",
      label: "Vehicle Services",
      aliases: ["auto services", "car services"],
      subcategories: [
        {
          key: "car_repair",
          label: "Car Repair",
          aliases: ["auto repair", "mechanic", "garage"],
          canonicalTypes: [{
            key: "car_repair_service",
            label: "Car Repair Service",
            subtypes: [],
            allowedMediaKinds: ["exterior", "interior", "logo"],
            requiredFields: ["name", "address", "vertical", "category"],
            optionalFields: ["phone"],
            allowedCardTemplates: ["ServiceCard"],
            aliases: ["auto mechanic", "garage"],
          }],
        },
        {
          key: "car_wash",
          label: "Car Wash",
          aliases: ["auto wash"],
          canonicalTypes: [{
            key: "car_wash_service",
            label: "Car Wash Service",
            subtypes: [],
            allowedMediaKinds: ["exterior", "interior", "logo"],
            requiredFields: ["name", "address", "vertical", "category"],
            optionalFields: ["phone"],
            allowedCardTemplates: ["ServiceCard"],
            aliases: ["auto wash", "vehicle wash"],
          }],
        },
      ],
    },
  ],
};

const BEAUTY_FAMILY: CanonicalFamily = {
  vertical: "beauty",
  label: "Beauty & Wellness",
  defaultMediaKinds: ["exterior", "interior", "logo"],
  defaultCardTemplate: "BeautyCard",
  categories: [
    {
      key: "salon",
      label: "Salon",
      aliases: ["hair salon", "beauty salon", "beauty parlor"],
      subcategories: [
        {
          key: "hair_salon",
          label: "Hair Salon",
          aliases: ["hairdresser", "barber"],
          canonicalTypes: [{
            key: "hair_salon",
            label: "Hair Salon",
            subtypes: [
              { key: "barber", label: "Barber", aliases: ["barbershop"] },
              { key: "unisex", label: "Unisex Salon", aliases: [] },
              { key: "ladies", label: "Ladies Salon", aliases: ["women salon"] },
            ],
            allowedMediaKinds: ["exterior", "interior", "logo"],
            requiredFields: ["name", "address", "vertical", "category"],
            optionalFields: ["phone"],
            allowedCardTemplates: ["BeautyCard", "ServiceCard"],
            aliases: ["hairdresser"],
          }],
        },
        {
          key: "nail_salon",
          label: "Nail Salon",
          aliases: ["nail bar", "manicure"],
          canonicalTypes: [{
            key: "nail_salon",
            label: "Nail Salon",
            subtypes: [],
            allowedMediaKinds: ["exterior", "interior", "logo"],
            requiredFields: ["name", "address", "vertical", "category"],
            optionalFields: ["phone"],
            allowedCardTemplates: ["BeautyCard", "ServiceCard"],
            aliases: ["nail bar"],
          }],
        },
      ],
    },
    {
      key: "spa",
      label: "Spa",
      aliases: ["day spa", "wellness center", "wellness spa"],
      subcategories: [
        {
          key: "day_spa",
          label: "Day Spa",
          aliases: ["wellness spa"],
          canonicalTypes: [{
            key: "day_spa",
            label: "Day Spa",
            subtypes: [],
            allowedMediaKinds: ["exterior", "interior", "treatment_room", "reception", "logo"],
            requiredFields: ["name", "address", "vertical", "category"],
            optionalFields: ["phone"],
            allowedCardTemplates: ["BeautyCard", "ServiceCard"],
            aliases: ["spa center", "wellness center"],
          }],
        },
      ],
    },
  ],
};

const PROPERTY_FAMILY: CanonicalFamily = {
  vertical: "property",
  label: "Property & Real Estate",
  defaultMediaKinds: ["listing_hero", "interior", "floor_plan", "neighborhood", "logo"],
  defaultCardTemplate: "PropertyCard",
  categories: [
    {
      key: "rent",
      label: "Rental",
      aliases: ["for rent", "lease", "to let"],
      subcategories: [
        {
          key: "apartment_rent",
          label: "Apartment Rental",
          aliases: ["flat for rent"],
          canonicalTypes: [{
            key: "apartment_rent",
            label: "Apartment for Rent",
            subtypes: [
              { key: "studio", label: "Studio", aliases: [] },
              { key: "1br", label: "1 Bedroom", aliases: ["1bed"] },
              { key: "2br", label: "2 Bedroom", aliases: ["2bed"] },
              { key: "3br_plus", label: "3+ Bedroom", aliases: ["3bed", "4bed"] },
              { key: "penthouse", label: "Penthouse", aliases: [] },
            ],
            allowedMediaKinds: ["listing_hero", "interior", "exterior", "floor_plan", "neighborhood", "amenities", "logo"],
            requiredFields: ["name", "address", "vertical", "category", "price", "bedrooms"],
            optionalFields: ["phone", "sqft", "furnished"],
            allowedCardTemplates: ["PropertyCard"],
            aliases: ["flat for rent", "apartment lease"],
          }],
        },
        {
          key: "villa_rent",
          label: "Villa Rental",
          aliases: ["house for rent"],
          canonicalTypes: [{
            key: "villa_rent",
            label: "Villa for Rent",
            subtypes: [],
            allowedMediaKinds: ["listing_hero", "interior", "exterior", "pool", "floor_plan", "neighborhood", "amenities", "logo"],
            requiredFields: ["name", "address", "vertical", "category", "price", "bedrooms"],
            optionalFields: ["phone", "sqft"],
            allowedCardTemplates: ["PropertyCard"],
            aliases: ["house for rent", "villa lease"],
          }],
        },
      ],
    },
    {
      key: "sale",
      label: "Sale",
      aliases: ["for sale", "buy", "purchase"],
      subcategories: [
        {
          key: "apartment_sale",
          label: "Apartment Sale",
          aliases: ["flat for sale"],
          canonicalTypes: [{
            key: "apartment_sale",
            label: "Apartment for Sale",
            subtypes: [
              { key: "ready", label: "Ready", aliases: ["completed"] },
              { key: "off_plan", label: "Off-Plan", aliases: ["under construction"] },
            ],
            allowedMediaKinds: ["listing_hero", "interior", "exterior", "floor_plan", "neighborhood", "amenities", "logo"],
            requiredFields: ["name", "address", "vertical", "category", "price"],
            optionalFields: ["phone", "sqft", "bedrooms"],
            allowedCardTemplates: ["PropertyCard"],
            aliases: ["flat for sale", "apartment purchase"],
          }],
        },
        {
          key: "villa_sale",
          label: "Villa Sale",
          aliases: ["house for sale"],
          canonicalTypes: [{
            key: "villa_sale",
            label: "Villa for Sale",
            subtypes: [],
            allowedMediaKinds: ["listing_hero", "interior", "exterior", "pool", "floor_plan", "neighborhood", "amenities", "logo"],
            requiredFields: ["name", "address", "vertical", "category", "price"],
            optionalFields: ["phone", "sqft", "bedrooms"],
            allowedCardTemplates: ["PropertyCard"],
            aliases: ["house for sale"],
          }],
        },
      ],
    },
    {
      key: "commercial",
      label: "Commercial",
      aliases: ["office", "commercial space"],
      subcategories: [
        {
          key: "office",
          label: "Office",
          aliases: ["office space", "workspace"],
          canonicalTypes: [{
            key: "commercial_office",
            label: "Commercial Office",
            subtypes: [],
            allowedMediaKinds: ["listing_hero", "interior", "exterior", "floor_plan", "logo"],
            requiredFields: ["name", "address", "vertical", "category", "price"],
            optionalFields: ["phone", "sqft"],
            allowedCardTemplates: ["PropertyCard"],
            aliases: ["office space", "workspace"],
          }],
        },
      ],
    },
  ],
};

const GROCERY_FAMILY: CanonicalFamily = {
  vertical: "grocery",
  label: "Grocery & Supermarket",
  defaultMediaKinds: ["exterior", "interior", "product", "logo"],
  defaultCardTemplate: "GroceryCard",
  categories: [
    {
      key: "supermarket",
      label: "Supermarket",
      aliases: ["grocery store", "hypermarket"],
      subcategories: [
        {
          key: "general_supermarket",
          label: "General Supermarket",
          aliases: ["grocery"],
          canonicalTypes: [{
            key: "general_supermarket",
            label: "General Supermarket",
            subtypes: [],
            allowedMediaKinds: ["exterior", "interior", "product", "storefront", "logo"],
            requiredFields: ["name", "address", "vertical", "category"],
            optionalFields: ["phone", "delivery_available"],
            allowedCardTemplates: ["GroceryCard"],
            aliases: ["grocery store", "supermarket"],
          }],
        },
      ],
    },
    {
      key: "specialty_store",
      label: "Specialty Store",
      aliases: ["specialty food"],
      subcategories: [
        {
          key: "organic_store",
          label: "Organic Store",
          aliases: ["health food store", "bio store"],
          canonicalTypes: [{
            key: "organic_store",
            label: "Organic Store",
            subtypes: [],
            allowedMediaKinds: ["exterior", "interior", "product", "logo"],
            requiredFields: ["name", "address", "vertical", "category"],
            optionalFields: ["phone"],
            allowedCardTemplates: ["GroceryCard"],
            aliases: ["health food store", "bio store"],
          }],
        },
        {
          key: "butcher",
          label: "Butcher",
          aliases: ["meat shop"],
          canonicalTypes: [{
            key: "butcher_shop",
            label: "Butcher Shop",
            subtypes: [],
            allowedMediaKinds: ["exterior", "interior", "product", "logo"],
            requiredFields: ["name", "address", "vertical", "category"],
            optionalFields: ["phone"],
            allowedCardTemplates: ["GroceryCard"],
            aliases: ["meat shop", "butchery"],
          }],
        },
        {
          key: "fish_market",
          label: "Fish Market",
          aliases: ["seafood market"],
          canonicalTypes: [{
            key: "fish_market",
            label: "Fish Market",
            subtypes: [],
            allowedMediaKinds: ["exterior", "interior", "product", "logo"],
            requiredFields: ["name", "address", "vertical", "category"],
            optionalFields: ["phone"],
            allowedCardTemplates: ["GroceryCard"],
            aliases: ["seafood market"],
          }],
        },
      ],
    },
  ],
};

const SHOPS_FAMILY: CanonicalFamily = {
  vertical: "shops",
  label: "Retail & Shopping",
  defaultMediaKinds: ["storefront", "interior", "product", "window_display", "logo"],
  defaultCardTemplate: "ShopCard",
  categories: [
    {
      key: "fashion",
      label: "Fashion & Apparel",
      aliases: ["clothing store", "apparel"],
      subcategories: [
        {
          key: "general_fashion",
          label: "Fashion Store",
          aliases: ["clothing", "apparel store"],
          canonicalTypes: [{
            key: "fashion_store",
            label: "Fashion Store",
            subtypes: [
              { key: "men", label: "Men's Fashion", aliases: [] },
              { key: "women", label: "Women's Fashion", aliases: [] },
              { key: "kids", label: "Kids' Fashion", aliases: [] },
              { key: "unisex", label: "Unisex", aliases: [] },
            ],
            allowedMediaKinds: ["storefront", "interior", "product", "window_display", "logo"],
            requiredFields: ["name", "address", "vertical", "category"],
            optionalFields: ["phone", "brands"],
            allowedCardTemplates: ["ShopCard"],
            aliases: ["clothing store", "boutique"],
          }],
        },
      ],
    },
    {
      key: "electronics",
      label: "Electronics",
      aliases: ["tech store", "gadget shop"],
      subcategories: [
        {
          key: "general_electronics",
          label: "Electronics Store",
          aliases: ["tech shop"],
          canonicalTypes: [{
            key: "electronics_store",
            label: "Electronics Store",
            subtypes: [],
            allowedMediaKinds: ["storefront", "interior", "product", "logo"],
            requiredFields: ["name", "address", "vertical", "category"],
            optionalFields: ["phone"],
            allowedCardTemplates: ["ShopCard"],
            aliases: ["tech store", "gadget shop"],
          }],
        },
      ],
    },
    {
      key: "jewelry",
      label: "Jewelry & Watches",
      aliases: ["jeweler", "watch shop"],
      subcategories: [
        {
          key: "general_jewelry",
          label: "Jewelry Store",
          aliases: ["jeweler"],
          canonicalTypes: [{
            key: "jewelry_store",
            label: "Jewelry Store",
            subtypes: [],
            allowedMediaKinds: ["storefront", "interior", "product", "logo"],
            requiredFields: ["name", "address", "vertical", "category"],
            optionalFields: ["phone"],
            allowedCardTemplates: ["ShopCard"],
            aliases: ["jeweler", "watch shop"],
          }],
        },
      ],
    },
  ],
};

const MOBILITY_FAMILY: CanonicalFamily = {
  vertical: "mobility",
  label: "Transport & Mobility",
  defaultMediaKinds: ["vehicle", "driver_portrait", "logo"],
  defaultCardTemplate: "TaxiCard",
  categories: [
    {
      key: "taxi",
      label: "Taxi & Ride-Hailing",
      aliases: ["ride", "cab"],
      subcategories: [
        {
          key: "ride_hailing",
          label: "Ride Hailing",
          aliases: ["ride share", "uber-like"],
          canonicalTypes: [{
            key: "ride_hailing",
            label: "Ride Hailing",
            subtypes: [
              { key: "economy", label: "Economy", aliases: ["standard"] },
              { key: "comfort", label: "Comfort", aliases: ["premium"] },
              { key: "luxury", label: "Luxury", aliases: ["vip"] },
            ],
            allowedMediaKinds: ["vehicle", "driver_portrait", "logo"],
            requiredFields: ["name", "vertical", "category"],
            optionalFields: ["phone", "vehicle_types"],
            allowedCardTemplates: ["TaxiCard"],
            aliases: ["taxi", "cab", "ride share"],
          }],
        },
      ],
    },
    {
      key: "rental",
      label: "Car Rental",
      aliases: ["vehicle rental"],
      subcategories: [
        {
          key: "car_rental",
          label: "Car Rental",
          aliases: ["rent a car"],
          canonicalTypes: [{
            key: "car_rental",
            label: "Car Rental",
            subtypes: [],
            allowedMediaKinds: ["vehicle", "storefront", "logo"],
            requiredFields: ["name", "address", "vertical", "category"],
            optionalFields: ["phone"],
            allowedCardTemplates: ["TaxiCard", "ServiceCard"],
            aliases: ["rent a car", "vehicle rental"],
          }],
        },
      ],
    },
  ],
};

const UTILITY_FAMILY: CanonicalFamily = {
  vertical: "utility",
  label: "Utilities & Essentials",
  defaultMediaKinds: ["exterior", "logo"],
  defaultCardTemplate: "UtilityCard",
  categories: [
    {
      key: "fuel",
      label: "Fuel Station",
      aliases: ["gas station", "petrol station"],
      subcategories: [
        {
          key: "fuel_station",
          label: "Fuel Station",
          aliases: ["gas station"],
          canonicalTypes: [{
            key: "fuel_station",
            label: "Fuel Station",
            subtypes: [],
            allowedMediaKinds: ["exterior", "fuel_station", "logo"],
            requiredFields: ["name", "address", "vertical", "category"],
            optionalFields: ["phone", "fuel_types"],
            allowedCardTemplates: ["UtilityCard"],
            aliases: ["gas station", "petrol station"],
          }],
        },
      ],
    },
    {
      key: "atm",
      label: "ATM",
      aliases: ["cash machine"],
      subcategories: [
        {
          key: "atm",
          label: "ATM",
          aliases: ["cash point"],
          canonicalTypes: [{
            key: "atm",
            label: "ATM",
            subtypes: [],
            allowedMediaKinds: ["atm_machine", "exterior", "logo"],
            requiredFields: ["name", "address", "vertical", "category"],
            optionalFields: ["bank_name"],
            allowedCardTemplates: ["UtilityCard"],
            aliases: ["cash machine", "cash point"],
          }],
        },
      ],
    },
    {
      key: "parking",
      label: "Parking",
      aliases: ["car park", "garage"],
      subcategories: [
        {
          key: "parking",
          label: "Parking",
          aliases: ["car park"],
          canonicalTypes: [{
            key: "parking",
            label: "Parking",
            subtypes: [],
            allowedMediaKinds: ["parking_lot", "exterior", "logo"],
            requiredFields: ["name", "address", "vertical", "category"],
            optionalFields: ["hourly_rate"],
            allowedCardTemplates: ["UtilityCard"],
            aliases: ["car park", "parking garage"],
          }],
        },
      ],
    },
    {
      key: "ev_charger",
      label: "EV Charger",
      aliases: ["electric vehicle charger", "charging station"],
      subcategories: [
        {
          key: "ev_charger",
          label: "EV Charger",
          aliases: ["charging point"],
          canonicalTypes: [{
            key: "ev_charger",
            label: "EV Charger",
            subtypes: [],
            allowedMediaKinds: ["exterior", "logo"],
            requiredFields: ["name", "address", "vertical", "category"],
            optionalFields: ["charger_types", "power_kw"],
            allowedCardTemplates: ["UtilityCard"],
            aliases: ["charging station"],
          }],
        },
      ],
    },
  ],
};

const EXPERIENCES_FAMILY: CanonicalFamily = {
  vertical: "experiences",
  label: "Experiences & Activities",
  defaultMediaKinds: ["event_venue", "activity", "landscape", "logo"],
  defaultCardTemplate: "ExperienceCard",
  categories: [
    {
      key: "entertainment",
      label: "Entertainment",
      aliases: ["fun", "leisure"],
      subcategories: [
        {
          key: "theme_park",
          label: "Theme Park",
          aliases: ["amusement park"],
          canonicalTypes: [{
            key: "theme_park",
            label: "Theme Park",
            subtypes: [],
            allowedMediaKinds: ["event_venue", "activity", "exterior", "logo"],
            requiredFields: ["name", "address", "vertical", "category"],
            optionalFields: ["phone", "ticket_price"],
            allowedCardTemplates: ["ExperienceCard"],
            aliases: ["amusement park"],
          }],
        },
        {
          key: "cinema",
          label: "Cinema",
          aliases: ["movie theater", "theatre"],
          canonicalTypes: [{
            key: "cinema",
            label: "Cinema",
            subtypes: [],
            allowedMediaKinds: ["exterior", "interior", "logo"],
            requiredFields: ["name", "address", "vertical", "category"],
            optionalFields: ["phone"],
            allowedCardTemplates: ["ExperienceCard"],
            aliases: ["movie theater"],
          }],
        },
      ],
    },
    {
      key: "tours",
      label: "Tours & Activities",
      aliases: ["sightseeing"],
      subcategories: [
        {
          key: "desert_safari",
          label: "Desert Safari",
          aliases: ["dune bashing"],
          canonicalTypes: [{
            key: "desert_safari",
            label: "Desert Safari",
            subtypes: [],
            allowedMediaKinds: ["activity", "landscape", "vehicle", "logo"],
            requiredFields: ["name", "vertical", "category"],
            optionalFields: ["phone", "price"],
            allowedCardTemplates: ["ExperienceCard"],
            aliases: ["dune safari"],
          }],
        },
        {
          key: "water_sports",
          label: "Water Sports",
          aliases: ["aquatic activities"],
          canonicalTypes: [{
            key: "water_sports",
            label: "Water Sports",
            subtypes: [],
            allowedMediaKinds: ["activity", "landscape", "logo"],
            requiredFields: ["name", "vertical", "category"],
            optionalFields: ["phone", "price"],
            allowedCardTemplates: ["ExperienceCard"],
            aliases: ["aquatic sports"],
          }],
        },
      ],
    },
  ],
};

export const CANONICAL_REGISTRY: CanonicalFamily[] = [
  FOOD_FAMILY,
  STAY_FAMILY,
  HEALTH_FAMILY,
  FITNESS_FAMILY,
  SERVICES_FAMILY,
  BEAUTY_FAMILY,
  PROPERTY_FAMILY,
  GROCERY_FAMILY,
  SHOPS_FAMILY,
  MOBILITY_FAMILY,
  UTILITY_FAMILY,
  EXPERIENCES_FAMILY,
];

export const REGISTRY_VERTICALS: readonly CanonicalVertical[] = CANONICAL_REGISTRY.map(f => f.vertical);

const verticalSet = new Set<string>(REGISTRY_VERTICALS);

const aliasIndex = new Map<string, { path: string; confidence: number }>();
const nodeIndex = new Map<string, CanonicalNode>();
const verticalIndex = new Map<string, CanonicalFamily>();
const typeToMediaKinds = new Map<string, Set<MediaKind>>();
const typeToTemplates = new Map<string, Set<CardTemplate>>();
const _subcategoryAliases: Record<string, string> = SUBCATEGORY_ALIASES;
const _subToPath = new Map<string, string>();

function buildIndexes() {
  for (const family of CANONICAL_REGISTRY) {
    verticalIndex.set(family.vertical, family);
    for (const cat of family.categories) {
      for (const alias of cat.aliases) {
        aliasIndex.set(alias.toLowerCase(), { path: `${family.vertical}.${cat.key}`, confidence: 0.9 });
      }
      for (const sub of cat.subcategories) {
        const subPath = `${family.vertical}.${cat.key}.${sub.key}`;
        _subToPath.set(sub.key, subPath);
        for (const alias of sub.aliases) {
          aliasIndex.set(alias.toLowerCase(), { path: subPath, confidence: 0.85 });
        }
        for (const ct of sub.canonicalTypes) {
          const path = `${family.vertical}.${cat.key}.${sub.key}.${ct.key}`;
          const node: CanonicalNode = {
            vertical: family.vertical,
            category: cat.key,
            subcategory: sub.key,
            canonicalType: ct.key,
            canonicalSubtype: null,
            path,
          };
          nodeIndex.set(path, node);
          typeToMediaKinds.set(ct.key, new Set(ct.allowedMediaKinds));
          typeToTemplates.set(ct.key, new Set(ct.allowedCardTemplates));

          for (const alias of ct.aliases) {
            aliasIndex.set(alias.toLowerCase(), { path, confidence: 0.8 });
          }

          for (const st of ct.subtypes) {
            const subPath = `${path}.${st.key}`;
            const subNode: CanonicalNode = {
              ...node,
              canonicalSubtype: st.key,
              path: subPath,
            };
            nodeIndex.set(subPath, subNode);
            for (const alias of st.aliases) {
              aliasIndex.set(alias.toLowerCase(), { path: subPath, confidence: 0.75 });
            }
          }
        }
      }
    }
  }
}

buildIndexes();

export function isValidVertical(v: string): v is CanonicalVertical {
  return verticalSet.has(v);
}

export function getFamily(vertical: CanonicalVertical): CanonicalFamily | null {
  return verticalIndex.get(vertical) ?? null;
}

export function resolveAlias(label: string): { path: string; confidence: number } | null {
  const normalized = label.toLowerCase().trim();
  const fromRegistry = aliasIndex.get(normalized);
  if (fromRegistry) return fromRegistry;
  const subAlias = _subcategoryAliases[normalized];
  if (subAlias) {
    const subEntry = _subToPath.get(subAlias);
    if (subEntry) return { path: subEntry, confidence: 0.7 };
  }
  return null;
}

export function getNode(path: string): CanonicalNode | null {
  return nodeIndex.get(path) ?? null;
}

export function getAllowedMediaKinds(canonicalType: string): MediaKind[] {
  const set = typeToMediaKinds.get(canonicalType);
  return set ? Array.from(set) : [];
}

export function isMediaKindAllowed(canonicalType: string, kind: MediaKind): boolean {
  const set = typeToMediaKinds.get(canonicalType);
  return set ? set.has(kind) : false;
}

export function getAllowedCardTemplates(canonicalType: string): CardTemplate[] {
  const set = typeToTemplates.get(canonicalType);
  return set ? Array.from(set) : [];
}

export function isCardTemplateAllowed(canonicalType: string, template: CardTemplate): boolean {
  const set = typeToTemplates.get(canonicalType);
  return set ? set.has(template) : false;
}

export function isValidCategoryChain(vertical: string, category: string, subcategory: string): boolean {
  const family = verticalIndex.get(vertical);
  if (!family) return false;
  const cat = family.categories.find(c => c.key === category);
  if (!cat) return false;
  return cat.subcategories.some(s => s.key === subcategory);
}

export function getCanonicalTypeForSubcategory(
  vertical: string,
  category: string,
  subcategory: string,
): CanonicalType | null {
  const family = verticalIndex.get(vertical);
  if (!family) return null;
  const cat = family.categories.find(c => c.key === category);
  if (!cat) return null;
  const sub = cat.subcategories.find(s => s.key === subcategory);
  if (!sub || sub.canonicalTypes.length === 0) return null;
  return sub.canonicalTypes[0];
}

export function getDefaultCardTemplate(vertical: string): CardTemplate {
  const family = verticalIndex.get(vertical);
  return family?.defaultCardTemplate ?? "GenericCard";
}

export function getDefaultMediaKinds(vertical: string): MediaKind[] {
  const family = verticalIndex.get(vertical);
  return family?.defaultMediaKinds ?? ["generic"];
}

export function validateCanonicalNode(node: {
  vertical: string;
  category: string;
  subcategory: string;
  canonicalType: string;
  canonicalSubtype?: string | null;
}): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!isValidVertical(node.vertical)) {
    errors.push(`Invalid vertical "${node.vertical}"`);
    return { valid: false, errors };
  }

  const family = verticalIndex.get(node.vertical);
  if (!family) {
    errors.push(`No family for vertical "${node.vertical}"`);
    return { valid: false, errors };
  }

  const cat = family.categories.find(c => c.key === node.category);
  if (!cat) {
    errors.push(`Category "${node.category}" not found in vertical "${node.vertical}"`);
    return { valid: false, errors };
  }

  const sub = cat.subcategories.find(s => s.key === node.subcategory);
  if (!sub) {
    errors.push(`Subcategory "${node.subcategory}" not found in category "${node.category}"`);
    return { valid: false, errors };
  }

  const ct = sub.canonicalTypes.find(t => t.key === node.canonicalType);
  if (!ct) {
    errors.push(`Canonical type "${node.canonicalType}" not valid for subcategory "${node.subcategory}"`);
    return { valid: false, errors };
  }

  if (node.canonicalSubtype) {
    const st = ct.subtypes.find(s => s.key === node.canonicalSubtype);
    if (!st) {
      errors.push(`Canonical subtype "${node.canonicalSubtype}" not valid for type "${node.canonicalType}"`);
      return { valid: false, errors };
    }
  }

  return { valid: true, errors };
}

export const FORBIDDEN_CROSS_ASSIGNMENTS: Record<string, CanonicalVertical[]> = {
  restaurant: ["shops", "property", "mobility", "beauty", "healthcare"],
  hotel: ["food", "shops", "mobility", "beauty", "healthcare"],
  gym: ["food", "stay", "property", "healthcare"],
  clinic: ["food", "stay", "beauty", "shops"],
  taxi: ["food", "stay", "property", "healthcare", "beauty"],
  apartment: ["food", "stay", "shops", "mobility"],
};
