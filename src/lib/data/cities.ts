/**
 * Global city dataset — major cities worldwide.
 * Centralized, searchable, reusable across onboarding/settings/forms.
 */
export interface City {
  name: string;
  country_code: string;
  region?: string;
  lat: number;
  lng: number;
  population?: number;
}

export const CITIES: City[] = [
  // UAE
  { name: "Dubai", country_code: "AE", region: "Dubai", lat: 25.2048, lng: 55.2708, population: 3500000 },
  { name: "Abu Dhabi", country_code: "AE", region: "Abu Dhabi", lat: 24.4539, lng: 54.3773, population: 1500000 },
  { name: "Sharjah", country_code: "AE", region: "Sharjah", lat: 25.3463, lng: 55.4209, population: 1400000 },
  { name: "Ajman", country_code: "AE", region: "Ajman", lat: 25.4052, lng: 55.5136, population: 500000 },
  { name: "Ras Al Khaimah", country_code: "AE", region: "Ras Al Khaimah", lat: 25.7895, lng: 55.9432, population: 400000 },
  // France
  { name: "Paris", country_code: "FR", region: "Île-de-France", lat: 48.8566, lng: 2.3522, population: 2100000 },
  { name: "Lyon", country_code: "FR", region: "Auvergne-Rhône-Alpes", lat: 45.7640, lng: 4.8357, population: 520000 },
  { name: "Marseille", country_code: "FR", region: "PACA", lat: 43.2965, lng: 5.3698, population: 870000 },
  { name: "Toulouse", country_code: "FR", region: "Occitanie", lat: 43.6047, lng: 1.4442, population: 480000 },
  { name: "Nice", country_code: "FR", region: "PACA", lat: 43.7102, lng: 7.2620, population: 340000 },
  { name: "Bordeaux", country_code: "FR", region: "Nouvelle-Aquitaine", lat: 44.8378, lng: -0.5792, population: 260000 },
  // Morocco
  { name: "Casablanca", country_code: "MA", region: "Casablanca-Settat", lat: 33.5731, lng: -7.5898, population: 3700000 },
  { name: "Marrakech", country_code: "MA", region: "Marrakech-Safi", lat: 31.6295, lng: -7.9811, population: 930000 },
  { name: "Rabat", country_code: "MA", region: "Rabat-Salé-Kénitra", lat: 34.0209, lng: -6.8416, population: 580000 },
  { name: "Tangier", country_code: "MA", region: "Tanger-Tétouan-Al Hoceïma", lat: 35.7595, lng: -5.8340, population: 950000 },
  // Thailand
  { name: "Bangkok", country_code: "TH", lat: 13.7563, lng: 100.5018, population: 10500000 },
  { name: "Phuket", country_code: "TH", lat: 7.8804, lng: 98.3923, population: 400000 },
  { name: "Chiang Mai", country_code: "TH", lat: 18.7883, lng: 98.9853, population: 130000 },
  { name: "Pattaya", country_code: "TH", lat: 12.9236, lng: 100.8825, population: 120000 },
  // Malaysia
  { name: "Kuala Lumpur", country_code: "MY", lat: 3.1390, lng: 101.6869, population: 1800000 },
  { name: "Penang", country_code: "MY", lat: 5.4164, lng: 100.3327, population: 750000 },
  { name: "Johor Bahru", country_code: "MY", lat: 1.4927, lng: 103.7414, population: 500000 },
  // Spain
  { name: "Madrid", country_code: "ES", lat: 40.4168, lng: -3.7038, population: 3300000 },
  { name: "Barcelona", country_code: "ES", lat: 41.3851, lng: 2.1734, population: 1600000 },
  { name: "Valencia", country_code: "ES", lat: 39.4699, lng: -0.3763, population: 800000 },
  // UK
  { name: "London", country_code: "GB", lat: 51.5074, lng: -0.1278, population: 9000000 },
  { name: "Manchester", country_code: "GB", lat: 53.4808, lng: -2.2426, population: 550000 },
  { name: "Birmingham", country_code: "GB", lat: 52.4862, lng: -1.8904, population: 1100000 },
  // USA
  { name: "New York", country_code: "US", region: "New York", lat: 40.7128, lng: -74.0060, population: 8300000 },
  { name: "Los Angeles", country_code: "US", region: "California", lat: 34.0522, lng: -118.2437, population: 3900000 },
  { name: "Miami", country_code: "US", region: "Florida", lat: 25.7617, lng: -80.1918, population: 450000 },
  { name: "Chicago", country_code: "US", region: "Illinois", lat: 41.8781, lng: -87.6298, population: 2700000 },
  // India
  { name: "Mumbai", country_code: "IN", region: "Maharashtra", lat: 19.0760, lng: 72.8777, population: 12500000 },
  { name: "Delhi", country_code: "IN", region: "Delhi", lat: 28.7041, lng: 77.1025, population: 11000000 },
  { name: "Bangalore", country_code: "IN", region: "Karnataka", lat: 12.9716, lng: 77.5946, population: 8400000 },
  // Saudi Arabia
  { name: "Riyadh", country_code: "SA", lat: 24.7136, lng: 46.6753, population: 7600000 },
  { name: "Jeddah", country_code: "SA", lat: 21.4858, lng: 39.1925, population: 4000000 },
  // Egypt
  { name: "Cairo", country_code: "EG", lat: 30.0444, lng: 31.2357, population: 10000000 },
  // Turkey
  { name: "Istanbul", country_code: "TR", lat: 41.0082, lng: 28.9784, population: 15000000 },
  // Germany
  { name: "Berlin", country_code: "DE", lat: 52.5200, lng: 13.4050, population: 3600000 },
  { name: "Munich", country_code: "DE", lat: 48.1351, lng: 11.5820, population: 1500000 },
  // Italy
  { name: "Rome", country_code: "IT", lat: 41.9028, lng: 12.4964, population: 2800000 },
  { name: "Milan", country_code: "IT", lat: 45.4642, lng: 9.1900, population: 1400000 },
  // Japan
  { name: "Tokyo", country_code: "JP", lat: 35.6762, lng: 139.6503, population: 14000000 },
  // Singapore
  { name: "Singapore", country_code: "SG", lat: 1.3521, lng: 103.8198, population: 5700000 },
  // Pakistan
  { name: "Karachi", country_code: "PK", lat: 24.8607, lng: 67.0011, population: 16000000 },
  { name: "Lahore", country_code: "PK", lat: 31.5204, lng: 74.3587, population: 11000000 },
  // Philippines
  { name: "Manila", country_code: "PH", lat: 14.5995, lng: 120.9842, population: 1800000 },
  // Nigeria
  { name: "Lagos", country_code: "NG", lat: 6.5244, lng: 3.3792, population: 15000000 },
  // South Africa
  { name: "Johannesburg", country_code: "ZA", lat: -26.2041, lng: 28.0473, population: 5600000 },
  { name: "Cape Town", country_code: "ZA", lat: -33.9249, lng: 18.4241, population: 4700000 },
  // Lebanon
  { name: "Beirut", country_code: "LB", lat: 33.8938, lng: 35.5018, population: 2400000 },
  // Tunisia
  { name: "Tunis", country_code: "TN", lat: 36.8065, lng: 10.1815, population: 700000 },
  // Canada
  { name: "Toronto", country_code: "CA", lat: 43.6532, lng: -79.3832, population: 2900000 },
  { name: "Montreal", country_code: "CA", lat: 45.5017, lng: -73.5673, population: 1700000 },
  // Australia
  { name: "Sydney", country_code: "AU", lat: -33.8688, lng: 151.2093, population: 5300000 },
  { name: "Melbourne", country_code: "AU", lat: -37.8136, lng: 144.9631, population: 5000000 },
  // Brazil
  { name: "São Paulo", country_code: "BR", lat: -23.5505, lng: -46.6333, population: 12300000 },
  { name: "Rio de Janeiro", country_code: "BR", lat: -22.9068, lng: -43.1729, population: 6700000 },
  // Ivory Coast
  { name: "Abidjan", country_code: "CI", lat: 5.3600, lng: -4.0083, population: 5000000 },
  // Senegal
  { name: "Dakar", country_code: "SN", lat: 14.7167, lng: -17.4677, population: 1100000 },
  // Qatar
  { name: "Doha", country_code: "QA", lat: 25.2854, lng: 51.5310, population: 1200000 },
  // Kuwait
  { name: "Kuwait City", country_code: "KW", lat: 29.3759, lng: 47.9774, population: 2400000 },
  // Oman
  { name: "Muscat", country_code: "OM", lat: 23.5880, lng: 58.3829, population: 1500000 },
  // Jordan
  { name: "Amman", country_code: "JO", lat: 31.9454, lng: 35.9284, population: 4000000 },
];

/** Search cities by name, optionally filtered by country */
export function searchCities(query: string, countryCode?: string): City[] {
  const q = query.toLowerCase().trim();
  if (q.length < 1) return [];
  return CITIES.filter(
    (c) =>
      c.name.toLowerCase().includes(q) &&
      (!countryCode || c.country_code === countryCode)
  ).slice(0, 20);
}

/** Get all cities for a country */
export function getCitiesByCountry(countryCode: string): City[] {
  return CITIES.filter((c) => c.country_code === countryCode);
}
