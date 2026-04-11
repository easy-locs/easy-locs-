import { resolveAlias } from "@/lib/taxonomy/canonical-registry";

export interface AliasResolution {
  canonicalPath: string;
  confidence: number;
  matchedLabel: string;
  isAmbiguous: boolean;
}

const SOURCE_LABEL_MAP: Record<string, { canonicalPath: string; confidence: number }> = {
  "gymnasium": { canonicalPath: "fitness.gym.general_gym.general_gym", confidence: 0.95 },
  "fitness club": { canonicalPath: "fitness.gym.general_gym.general_gym", confidence: 0.95 },
  "fitness center": { canonicalPath: "fitness.gym.general_gym.general_gym", confidence: 0.95 },
  "health club": { canonicalPath: "fitness.gym.general_gym.general_gym", confidence: 0.90 },
  "health center": { canonicalPath: "health.clinic.general.general_clinic", confidence: 0.80 },
  "medical center": { canonicalPath: "health.clinic.general.general_clinic", confidence: 0.90 },
  "medical clinic": { canonicalPath: "health.clinic.general.general_clinic", confidence: 0.95 },
  "wellness center": { canonicalPath: "beauty.spa.day_spa.day_spa", confidence: 0.70 },
  "wellness spa": { canonicalPath: "beauty.spa.day_spa.day_spa", confidence: 0.85 },
  "restaurant & cafe": { canonicalPath: "food.restaurant.casual_dining.casual_dining_restaurant", confidence: 0.70 },
  "restaurant and cafe": { canonicalPath: "food.restaurant.casual_dining.casual_dining_restaurant", confidence: 0.70 },
  "restaurant": { canonicalPath: "food.restaurant.casual_dining.casual_dining_restaurant", confidence: 0.85 },
  "cafe": { canonicalPath: "food.cafe.coffee_shop.coffee_shop", confidence: 0.85 },
  "coffee shop": { canonicalPath: "food.cafe.coffee_shop.coffee_shop", confidence: 0.95 },
  "bakery": { canonicalPath: "food.cafe.bakery.bakery", confidence: 0.95 },
  "pizzeria": { canonicalPath: "food.restaurant.fast_food.fast_food_restaurant", confidence: 0.90 },
  "burger joint": { canonicalPath: "food.restaurant.fast_food.fast_food_restaurant", confidence: 0.85 },
  "sushi bar": { canonicalPath: "food.restaurant.cuisine.cuisine_restaurant", confidence: 0.85 },
  "hotel": { canonicalPath: "stay.hotel.business_hotel.business_hotel", confidence: 0.80 },
  "resort": { canonicalPath: "stay.hotel.resort.resort", confidence: 0.90 },
  "resort apartments": { canonicalPath: "stay.aparthotel.serviced_apartment.serviced_apartment", confidence: 0.80 },
  "serviced apartments": { canonicalPath: "stay.aparthotel.serviced_apartment.serviced_apartment", confidence: 0.95 },
  "apart hotel": { canonicalPath: "stay.aparthotel.serviced_apartment.serviced_apartment", confidence: 0.95 },
  "boutique hotel": { canonicalPath: "stay.hotel.boutique_hotel.boutique_hotel", confidence: 0.95 },
  "guest house": { canonicalPath: "stay.holiday_rental.holiday_home.holiday_home", confidence: 0.80 },
  "hostel": { canonicalPath: "stay.holiday_rental.holiday_home.holiday_home", confidence: 0.75 },
  "dentist": { canonicalPath: "health.clinic.dental.dental_clinic", confidence: 0.95 },
  "dental clinic": { canonicalPath: "health.clinic.dental.dental_clinic", confidence: 0.95 },
  "dental office": { canonicalPath: "health.clinic.dental.dental_clinic", confidence: 0.95 },
  "hospital": { canonicalPath: "health.hospital.general_hospital.general_hospital", confidence: 0.95 },
  "pharmacy": { canonicalPath: "health.pharmacy.retail_pharmacy.retail_pharmacy", confidence: 0.95 },
  "drugstore": { canonicalPath: "health.pharmacy.retail_pharmacy.retail_pharmacy", confidence: 0.90 },
  "gym": { canonicalPath: "fitness.gym.general_gym.general_gym", confidence: 0.95 },
  "crossfit box": { canonicalPath: "fitness.gym.crossfit.crossfit_gym", confidence: 0.95 },
  "yoga studio": { canonicalPath: "fitness.gym.yoga_studio.yoga_studio", confidence: 0.95 },
  "pilates studio": { canonicalPath: "fitness.gym.pilates_studio.pilates_studio", confidence: 0.95 },
  "personal trainer": { canonicalPath: "fitness.personal_training.personal_trainer.personal_trainer", confidence: 0.95 },
  "hair salon": { canonicalPath: "beauty.salon.hair_salon.hair_salon", confidence: 0.95 },
  "barber": { canonicalPath: "beauty.salon.hair_salon.hair_salon", confidence: 0.90 },
  "barbershop": { canonicalPath: "beauty.salon.hair_salon.hair_salon", confidence: 0.95 },
  "nail salon": { canonicalPath: "beauty.salon.nail_salon.nail_salon", confidence: 0.95 },
  "day spa": { canonicalPath: "beauty.spa.day_spa.day_spa", confidence: 0.95 },
  "spa": { canonicalPath: "beauty.spa.day_spa.day_spa", confidence: 0.85 },
  "supermarket": { canonicalPath: "grocery.supermarket.general_supermarket.general_supermarket", confidence: 0.95 },
  "grocery store": { canonicalPath: "grocery.supermarket.general_supermarket.general_supermarket", confidence: 0.95 },
  "mini mart": { canonicalPath: "grocery.supermarket.general_supermarket.general_supermarket", confidence: 0.85 },
  "butcher": { canonicalPath: "grocery.specialty_store.butcher.butcher_shop", confidence: 0.95 },
  "fish market": { canonicalPath: "grocery.specialty_store.fish_market.fish_market", confidence: 0.95 },
  "plumber": { canonicalPath: "services.home_services.plumbing.plumbing_service", confidence: 0.95 },
  "electrician": { canonicalPath: "services.home_services.electrical.electrical_service", confidence: 0.95 },
  "cleaning service": { canonicalPath: "services.home_services.cleaning.cleaning_service", confidence: 0.95 },
  "maid service": { canonicalPath: "services.home_services.cleaning.cleaning_service", confidence: 0.90 },
  "moving company": { canonicalPath: "services.home_services.movers.moving_service", confidence: 0.95 },
  "lawyer": { canonicalPath: "services.professional_services.legal.legal_service", confidence: 0.95 },
  "law firm": { canonicalPath: "services.professional_services.legal.legal_service", confidence: 0.95 },
  "accountant": { canonicalPath: "services.professional_services.accounting.accounting_service", confidence: 0.95 },
  "car repair": { canonicalPath: "services.vehicle_services.car_repair.car_repair_service", confidence: 0.95 },
  "auto mechanic": { canonicalPath: "services.vehicle_services.car_repair.car_repair_service", confidence: 0.90 },
  "car wash": { canonicalPath: "services.vehicle_services.car_wash.car_wash_service", confidence: 0.95 },
  "gas station": { canonicalPath: "utility.fuel.fuel_station.fuel_station", confidence: 0.95 },
  "petrol station": { canonicalPath: "utility.fuel.fuel_station.fuel_station", confidence: 0.95 },
  "atm": { canonicalPath: "utility.atm.atm.atm", confidence: 0.95 },
  "parking": { canonicalPath: "utility.parking.parking.parking", confidence: 0.90 },
  "ev charger": { canonicalPath: "utility.ev_charger.ev_charger.ev_charger", confidence: 0.95 },
  "taxi": { canonicalPath: "mobility.taxi.ride_hailing.ride_hailing", confidence: 0.90 },
  "car rental": { canonicalPath: "mobility.rental.car_rental.car_rental", confidence: 0.95 },
  "theme park": { canonicalPath: "experiences.entertainment.theme_park.theme_park", confidence: 0.95 },
  "cinema": { canonicalPath: "experiences.entertainment.cinema.cinema", confidence: 0.95 },
  "movie theater": { canonicalPath: "experiences.entertainment.cinema.cinema", confidence: 0.95 },
  "desert safari": { canonicalPath: "experiences.tours.desert_safari.desert_safari", confidence: 0.95 },
};

const AMBIGUOUS_LABELS = new Set([
  "wellness center",
  "health center",
  "restaurant & cafe",
  "restaurant and cafe",
  "resort apartments",
  "guest house",
  "hostel",
]);

export function resolveSourceLabel(rawLabel: string): AliasResolution | null {
  const normalized = rawLabel.toLowerCase().trim();

  const directMatch = SOURCE_LABEL_MAP[normalized];
  if (directMatch) {
    return {
      canonicalPath: directMatch.canonicalPath,
      confidence: directMatch.confidence,
      matchedLabel: normalized,
      isAmbiguous: AMBIGUOUS_LABELS.has(normalized),
    };
  }

  for (const [label, mapping] of Object.entries(SOURCE_LABEL_MAP)) {
    if (normalized.includes(label)) {
      return {
        canonicalPath: mapping.canonicalPath,
        confidence: mapping.confidence * 0.85,
        matchedLabel: label,
        isAmbiguous: AMBIGUOUS_LABELS.has(label),
      };
    }
  }

  const registryResult = resolveAlias(normalized);
  if (registryResult) {
    return {
      canonicalPath: registryResult.path,
      confidence: registryResult.confidence,
      matchedLabel: normalized,
      isAmbiguous: false,
    };
  }

  return null;
}

export function isAmbiguousLabel(label: string): boolean {
  return AMBIGUOUS_LABELS.has(label.toLowerCase().trim());
}

export function getAllSourceLabels(): string[] {
  return Object.keys(SOURCE_LABEL_MAP);
}
