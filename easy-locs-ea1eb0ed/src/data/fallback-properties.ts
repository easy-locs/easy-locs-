import { bannerCover } from "@/lib/image/category-covers";

export interface FallbackProperty {
  id: string;
  slug: string;
  title: string;
  vertical: "property";
  intent: "buy" | "rent" | "project";
  subcategory: string;
  area: string;
  city: string;
  country: string;
  image: string;
  bedrooms: number;
  bathrooms: number;
  sizeSqft: number;
  totalPrice?: number;
  pricePerSqft?: number;
  annualRent?: number;
  monthlyRent?: number;
  currency: string;
  furnished?: "furnished" | "unfurnished" | "semi_furnished";
  availableNow?: boolean;
  isOffPlan?: boolean;
  readyStatus?: string;
  developer?: string;
  brokerName?: string;
  completionDate?: string;
  paymentPlan?: string;
  cheques?: number;
  amenities?: string[];
  photoCount?: number;
  latitude: number;
  longitude: number;
  ranking_score: number;
}

const IMG = {
    apt1: bannerCover("buy_apartment"),
    apt2: bannerCover("buy_apartment"),
    apt3: bannerCover("rent_apartment"),
    villa1: bannerCover("buy_villa"),
    villa2: bannerCover("buy_villa"),
    villa3: bannerCover("buy_villa"),
    town1: bannerCover("buy_townhouse"),
    pent1: bannerCover("buy_penthouse"),
    office1: bannerCover("buy_office"),
    project1: bannerCover("developer_project"),
    project2: bannerCover("developer_project"),
    project3: bannerCover("developer_project"),
    project4: bannerCover("developer_project"),
    project5: bannerCover("developer_project"),
    project6: bannerCover("developer_project"),
    land1: bannerCover("buy_land"),
    comm1: bannerCover("buy_office"),
  };

export const FALLBACK_PROPERTIES: FallbackProperty[] = [
  {
    id: "prop-buy-1", slug: "luxury-apartment-dubai-marina", title: "Luxury 2BR Apartment with Sea View",
    vertical: "property", intent: "buy", subcategory: "buy_apartment", area: "Dubai Marina", city: "Dubai", country: "AE",
    image: IMG.apt1, bedrooms: 2, bathrooms: 2, sizeSqft: 1450, totalPrice: 2_800_000, pricePerSqft: 1931,
    currency: "AED", readyStatus: "Ready", brokerName: "Emirates Properties", latitude: 25.0804, longitude: 55.1403, ranking_score: 95,
  },
  {
    id: "prop-buy-2", slug: "palm-jumeirah-villa", title: "5BR Garden Villa — Palm Jumeirah",
    vertical: "property", intent: "buy", subcategory: "buy_villa", area: "Palm Jumeirah", city: "Dubai", country: "AE",
    image: IMG.villa1, bedrooms: 5, bathrooms: 6, sizeSqft: 6800, totalPrice: 18_500_000, pricePerSqft: 2721,
    currency: "AED", readyStatus: "Ready", brokerName: "Luxhabitat", latitude: 25.1124, longitude: 55.1390, ranking_score: 98,
  },
  {
    id: "prop-buy-3", slug: "downtown-penthouse", title: "Penthouse with Burj Khalifa View",
    vertical: "property", intent: "buy", subcategory: "buy_penthouse", area: "Downtown Dubai", city: "Dubai", country: "AE",
    image: IMG.pent1, bedrooms: 4, bathrooms: 5, sizeSqft: 5200, totalPrice: 25_000_000, pricePerSqft: 4808,
    currency: "AED", readyStatus: "Ready", brokerName: "Knight Frank", latitude: 25.1972, longitude: 55.2744, ranking_score: 96,
  },
  {
    id: "prop-buy-4", slug: "arabian-ranches-townhouse", title: "3BR Townhouse — Arabian Ranches III",
    vertical: "property", intent: "buy", subcategory: "buy_townhouse", area: "Arabian Ranches", city: "Dubai", country: "AE",
    image: IMG.town1, bedrooms: 3, bathrooms: 3, sizeSqft: 2100, totalPrice: 2_200_000, pricePerSqft: 1048,
    currency: "AED", readyStatus: "Ready", brokerName: "Emaar Properties", latitude: 25.0609, longitude: 55.2707, ranking_score: 88,
  },
  {
    id: "prop-buy-5", slug: "business-bay-office", title: "Premium Office Space — Business Bay",
    vertical: "property", intent: "buy", subcategory: "buy_office", area: "Business Bay", city: "Dubai", country: "AE",
    image: IMG.office1, bedrooms: 0, bathrooms: 2, sizeSqft: 2800, totalPrice: 4_200_000, pricePerSqft: 1500,
    currency: "AED", readyStatus: "Ready", brokerName: "CBRE", latitude: 25.1860, longitude: 55.2621, ranking_score: 82,
  },
  {
    id: "prop-buy-6", slug: "jbr-apartment-beachfront", title: "1BR Beachfront Apartment — JBR",
    vertical: "property", intent: "buy", subcategory: "buy_apartment", area: "JBR", city: "Dubai", country: "AE",
    image: IMG.apt2, bedrooms: 1, bathrooms: 1, sizeSqft: 850, totalPrice: 1_650_000, pricePerSqft: 1941,
    currency: "AED", readyStatus: "Ready", brokerName: "Haus & Haus", latitude: 25.0783, longitude: 55.1336, ranking_score: 90,
  },
  {
    id: "prop-rent-1", slug: "marina-2br-rent", title: "Spacious 2BR — Full Marina View",
    vertical: "property", intent: "rent", subcategory: "rent_apartment", area: "Dubai Marina", city: "Dubai", country: "AE",
    image: IMG.apt3, bedrooms: 2, bathrooms: 2, sizeSqft: 1350, annualRent: 130_000, monthlyRent: 10_833,
    currency: "AED", furnished: "furnished", availableNow: true, cheques: 4, brokerName: "Allsopp & Allsopp",
    latitude: 25.0804, longitude: 55.1403, ranking_score: 92,
  },
  {
    id: "prop-rent-2", slug: "jumeirah-village-villa", title: "4BR Villa — Jumeirah Village Circle",
    vertical: "property", intent: "rent", subcategory: "rent_villa", area: "JVC", city: "Dubai", country: "AE",
    image: IMG.villa2, bedrooms: 4, bathrooms: 4, sizeSqft: 3200, annualRent: 180_000, monthlyRent: 15_000,
    currency: "AED", furnished: "unfurnished", availableNow: true, cheques: 2, brokerName: "Better Homes",
    latitude: 25.0555, longitude: 55.2107, ranking_score: 87,
  },
  {
    id: "prop-rent-3", slug: "difc-office-rent", title: "Fitted Office — DIFC Gate Village",
    vertical: "property", intent: "rent", subcategory: "rent_office", area: "DIFC", city: "Dubai", country: "AE",
    image: IMG.office1, bedrooms: 0, bathrooms: 2, sizeSqft: 1800, annualRent: 250_000, monthlyRent: 20_833,
    currency: "AED", furnished: "furnished", availableNow: false,
    latitude: 25.2102, longitude: 55.2797, ranking_score: 85,
  },
  {
    id: "prop-rent-4", slug: "downtown-1br-rent", title: "1BR Furnished — The Address Downtown",
    vertical: "property", intent: "rent", subcategory: "rent_apartment", area: "Downtown Dubai", city: "Dubai", country: "AE",
    image: IMG.apt1, bedrooms: 1, bathrooms: 1, sizeSqft: 780, annualRent: 95_000, monthlyRent: 7_917,
    currency: "AED", furnished: "furnished", availableNow: true, cheques: 4,
    latitude: 25.1972, longitude: 55.2744, ranking_score: 91,
  },
  {
    id: "prop-rent-5", slug: "damac-hills-townhouse-rent", title: "3BR Townhouse — DAMAC Hills 2",
    vertical: "property", intent: "rent", subcategory: "rent_townhouse", area: "DAMAC Hills 2", city: "Dubai", country: "AE",
    image: IMG.town1, bedrooms: 3, bathrooms: 3, sizeSqft: 1900, annualRent: 75_000, monthlyRent: 6_250,
    currency: "AED", furnished: "unfurnished", availableNow: true, cheques: 6,
    latitude: 25.0190, longitude: 55.2470, ranking_score: 80,
  },
  {
    id: "prop-rent-6", slug: "springs-villa-rent", title: "3BR + Maid — The Springs",
    vertical: "property", intent: "rent", subcategory: "rent_villa", area: "The Springs", city: "Dubai", country: "AE",
    image: IMG.villa3, bedrooms: 3, bathrooms: 3, sizeSqft: 2400, annualRent: 120_000, monthlyRent: 10_000,
    currency: "AED", furnished: "semi_furnished", availableNow: true, cheques: 4, brokerName: "Betterhomes",
    latitude: 25.0460, longitude: 55.2000, ranking_score: 84,
  },
  {
    id: "prop-proj-1", slug: "the-oasis-emaar", title: "The Oasis by Emaar",
    vertical: "property", intent: "project", subcategory: "offplan", area: "Dubai South", city: "Dubai", country: "AE",
    image: IMG.project1, bedrooms: 0, bathrooms: 0, sizeSqft: 0, totalPrice: 5_000_000,
    currency: "AED", isOffPlan: true, developer: "Emaar Properties", completionDate: "Q4 2027", paymentPlan: "60/40",
    latitude: 24.8966, longitude: 55.1716, ranking_score: 94,
  },
  {
    id: "prop-proj-2", slug: "damac-lagoons", title: "DAMAC Lagoons — Mediterranean Villas",
    vertical: "property", intent: "project", subcategory: "offplan", area: "DAMAC Hills 2", city: "Dubai", country: "AE",
    image: IMG.project2, bedrooms: 0, bathrooms: 0, sizeSqft: 0, totalPrice: 1_200_000,
    currency: "AED", isOffPlan: true, developer: "DAMAC Properties", completionDate: "Q2 2028", paymentPlan: "70/30",
    latitude: 25.0190, longitude: 55.2470, ranking_score: 91,
  },
  {
    id: "prop-proj-3", slug: "sobha-hartland-2", title: "Sobha Hartland II",
    vertical: "property", intent: "project", subcategory: "developer_project", area: "MBR City", city: "Dubai", country: "AE",
    image: IMG.project3, bedrooms: 0, bathrooms: 0, sizeSqft: 0, totalPrice: 1_800_000,
    currency: "AED", isOffPlan: true, developer: "Sobha Realty", completionDate: "Q1 2027", paymentPlan: "80/20",
    latitude: 25.1700, longitude: 55.3100, ranking_score: 89,
  },
  {
    id: "prop-proj-4", slug: "tilal-al-ghaf-majid", title: "Tilal Al Ghaf — Harmony Villas",
    vertical: "property", intent: "project", subcategory: "offplan", area: "Tilal Al Ghaf", city: "Dubai", country: "AE",
    image: IMG.project4, bedrooms: 0, bathrooms: 0, sizeSqft: 0, totalPrice: 3_500_000,
    currency: "AED", isOffPlan: true, developer: "Majid Al Futtaim", completionDate: "Q3 2026", paymentPlan: "50/50",
    latitude: 25.0200, longitude: 55.2600, ranking_score: 93,
  },
  {
    id: "prop-proj-5", slug: "azizi-riviera", title: "Azizi Riviera — Waterfront Living",
    vertical: "property", intent: "project", subcategory: "developer_project", area: "MBR City", city: "Dubai", country: "AE",
    image: IMG.project5, bedrooms: 0, bathrooms: 0, sizeSqft: 0, totalPrice: 750_000,
    currency: "AED", isOffPlan: true, developer: "Azizi Developments", completionDate: "Q4 2026", paymentPlan: "60/40",
    latitude: 25.1800, longitude: 55.3200, ranking_score: 86,
  },
  {
    id: "prop-proj-6", slug: "binghatti-ghost", title: "Binghatti Ghost — Business Bay",
    vertical: "property", intent: "project", subcategory: "investment", area: "Business Bay", city: "Dubai", country: "AE",
    image: IMG.project6, bedrooms: 0, bathrooms: 0, sizeSqft: 0, totalPrice: 1_400_000,
    currency: "AED", isOffPlan: true, developer: "Binghatti", completionDate: "Q2 2027", paymentPlan: "70/30",
    latitude: 25.1860, longitude: 55.2621, ranking_score: 88,
  },
];
