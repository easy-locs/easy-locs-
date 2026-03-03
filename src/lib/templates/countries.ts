// Worldwide country registry for template system
// Extends the base Country type with all countries

export type WorldCountry =
  // Europe
  | "FR" | "BE" | "ES" | "IT" | "DE" | "PT" | "NL" | "AT" | "CH" | "LU"
  | "IE" | "GB" | "SE" | "NO" | "DK" | "FI" | "PL" | "CZ" | "RO" | "HU"
  | "GR" | "BG" | "HR" | "SK" | "SI" | "LT" | "LV" | "EE" | "CY" | "MT"
  // Americas
  | "US" | "CA" | "MX" | "BR" | "AR" | "CL" | "CO" | "PE"
  // Africa
  | "MA" | "TN" | "DZ" | "SN" | "CI" | "CM" | "GA" | "CG" | "CD" | "MG"
  | "MU" | "ZA" | "NG" | "KE" | "GH"
  // Middle East
  | "AE" | "SA" | "QA" | "BH" | "KW" | "OM" | "LB" | "JO" | "IL" | "TR"
  // Asia-Pacific
  | "JP" | "KR" | "CN" | "IN" | "SG" | "MY" | "TH" | "VN" | "PH" | "ID"
  | "AU" | "NZ";

export interface CountryInfo {
  code: WorldCountry;
  name: Record<string, string>; // locale → name
  currency: string;
  currencySymbol: string;
  region: "europe" | "americas" | "africa" | "middle-east" | "asia-pacific";
  legalSystem: string;
  active: boolean; // whether templates are available
}

export const countries: CountryInfo[] = [
  // Europe — Active
  { code: "FR", name: { fr: "France", en: "France", es: "Francia", de: "Frankreich", it: "Francia", pt: "França" }, currency: "EUR", currencySymbol: "€", region: "europe", legalSystem: "Code civil", active: true },
  { code: "BE", name: { fr: "Belgique", en: "Belgium", es: "Bélgica", de: "Belgien", it: "Belgio", pt: "Bélgica" }, currency: "EUR", currencySymbol: "€", region: "europe", legalSystem: "Code civil belge", active: true },
  { code: "ES", name: { fr: "Espagne", en: "Spain", es: "España", de: "Spanien", it: "Spagna", pt: "Espanha" }, currency: "EUR", currencySymbol: "€", region: "europe", legalSystem: "Ley de Arrendamientos Urbanos", active: true },
  { code: "IT", name: { fr: "Italie", en: "Italy", es: "Italia", de: "Italien", it: "Italia", pt: "Itália" }, currency: "EUR", currencySymbol: "€", region: "europe", legalSystem: "Codice Civile", active: true },
  { code: "DE", name: { fr: "Allemagne", en: "Germany", es: "Alemania", de: "Deutschland", it: "Germania", pt: "Alemanha" }, currency: "EUR", currencySymbol: "€", region: "europe", legalSystem: "Bürgerliches Gesetzbuch", active: true },
  { code: "PT", name: { fr: "Portugal", en: "Portugal", es: "Portugal", de: "Portugal", it: "Portogallo", pt: "Portugal" }, currency: "EUR", currencySymbol: "€", region: "europe", legalSystem: "Código Civil", active: true },
  { code: "NL", name: { fr: "Pays-Bas", en: "Netherlands", es: "Países Bajos", de: "Niederlande", it: "Paesi Bassi", pt: "Países Baixos" }, currency: "EUR", currencySymbol: "€", region: "europe", legalSystem: "Burgerlijk Wetboek", active: true },
  { code: "CH", name: { fr: "Suisse", en: "Switzerland", es: "Suiza", de: "Schweiz", it: "Svizzera", pt: "Suíça" }, currency: "CHF", currencySymbol: "CHF", region: "europe", legalSystem: "Code des obligations", active: true },
  { code: "LU", name: { fr: "Luxembourg", en: "Luxembourg", es: "Luxemburgo", de: "Luxemburg", it: "Lussemburgo", pt: "Luxemburgo" }, currency: "EUR", currencySymbol: "€", region: "europe", legalSystem: "Code civil", active: true },
  { code: "GB", name: { fr: "Royaume-Uni", en: "United Kingdom", es: "Reino Unido", de: "Vereinigtes Königreich", it: "Regno Unito", pt: "Reino Unido" }, currency: "GBP", currencySymbol: "£", region: "europe", legalSystem: "Common law", active: true },
  { code: "AT", name: { fr: "Autriche", en: "Austria", es: "Austria", de: "Österreich", it: "Austria", pt: "Áustria" }, currency: "EUR", currencySymbol: "€", region: "europe", legalSystem: "ABGB", active: true },
  // Americas
  { code: "US", name: { fr: "États-Unis", en: "United States", es: "Estados Unidos", de: "Vereinigte Staaten", it: "Stati Uniti", pt: "Estados Unidos" }, currency: "USD", currencySymbol: "$", region: "americas", legalSystem: "Common law (state-specific)", active: true },
  { code: "CA", name: { fr: "Canada", en: "Canada", es: "Canadá", de: "Kanada", it: "Canada", pt: "Canadá" }, currency: "CAD", currencySymbol: "CA$", region: "americas", legalSystem: "Common law / Code civil (QC)", active: true },
  { code: "BR", name: { fr: "Brésil", en: "Brazil", es: "Brasil", de: "Brasilien", it: "Brasile", pt: "Brasil" }, currency: "BRL", currencySymbol: "R$", region: "americas", legalSystem: "Código Civil", active: true },
  { code: "MX", name: { fr: "Mexique", en: "Mexico", es: "México", de: "Mexiko", it: "Messico", pt: "México" }, currency: "MXN", currencySymbol: "MX$", region: "americas", legalSystem: "Código Civil Federal", active: true },
  // Africa
  { code: "MA", name: { fr: "Maroc", en: "Morocco", es: "Marruecos", de: "Marokko", it: "Marocco", pt: "Marrocos" }, currency: "MAD", currencySymbol: "DH", region: "africa", legalSystem: "Dahir des obligations et contrats", active: true },
  { code: "TN", name: { fr: "Tunisie", en: "Tunisia", es: "Túnez", de: "Tunesien", it: "Tunisia", pt: "Tunísia" }, currency: "TND", currencySymbol: "DT", region: "africa", legalSystem: "Code des obligations", active: true },
  { code: "SN", name: { fr: "Sénégal", en: "Senegal", es: "Senegal", de: "Senegal", it: "Senegal", pt: "Senegal" }, currency: "XOF", currencySymbol: "FCFA", region: "africa", legalSystem: "Code civil OHADA", active: true },
  { code: "CI", name: { fr: "Côte d'Ivoire", en: "Ivory Coast", es: "Costa de Marfil", de: "Elfenbeinküste", it: "Costa d'Avorio", pt: "Costa do Marfim" }, currency: "XOF", currencySymbol: "FCFA", region: "africa", legalSystem: "Code civil OHADA", active: true },
  { code: "ZA", name: { fr: "Afrique du Sud", en: "South Africa", es: "Sudáfrica", de: "Südafrika", it: "Sudafrica", pt: "África do Sul" }, currency: "ZAR", currencySymbol: "R", region: "africa", legalSystem: "Rental Housing Act", active: true },
  // Middle East
  { code: "AE", name: { fr: "Émirats arabes unis", en: "United Arab Emirates", es: "Emiratos Árabes", de: "Vereinigte Arabische Emirate", it: "Emirati Arabi", pt: "Emirados Árabes" }, currency: "AED", currencySymbol: "AED", region: "middle-east", legalSystem: "RERA / Dubai Law", active: true },
  { code: "SA", name: { fr: "Arabie saoudite", en: "Saudi Arabia", es: "Arabia Saudita", de: "Saudi-Arabien", it: "Arabia Saudita", pt: "Arábia Saudita" }, currency: "SAR", currencySymbol: "SAR", region: "middle-east", legalSystem: "Ejar system", active: true },
  { code: "TR", name: { fr: "Turquie", en: "Turkey", es: "Turquía", de: "Türkei", it: "Turchia", pt: "Turquia" }, currency: "TRY", currencySymbol: "₺", region: "middle-east", legalSystem: "Borçlar Kanunu", active: true },
  // Americas — additional
  { code: "AR", name: { fr: "Argentine", en: "Argentina", es: "Argentina", de: "Argentinien", it: "Argentina", pt: "Argentina" }, currency: "ARS", currencySymbol: "ARS", region: "americas", legalSystem: "Ley 27.551", active: true },
  { code: "CL", name: { fr: "Chili", en: "Chile", es: "Chile", de: "Chile", it: "Cile", pt: "Chile" }, currency: "CLP", currencySymbol: "CLP", region: "americas", legalSystem: "Ley 18.101", active: true },
  { code: "CO", name: { fr: "Colombie", en: "Colombia", es: "Colombia", de: "Kolumbien", it: "Colombia", pt: "Colômbia" }, currency: "COP", currencySymbol: "COP", region: "americas", legalSystem: "Ley 820 de 2003", active: true },
  { code: "PE", name: { fr: "Pérou", en: "Peru", es: "Perú", de: "Peru", it: "Perù", pt: "Peru" }, currency: "PEN", currencySymbol: "S/.", region: "americas", legalSystem: "Código Civil", active: true },
  // Africa — additional
  { code: "DZ", name: { fr: "Algérie", en: "Algeria", es: "Argelia", de: "Algerien", it: "Algeria", pt: "Argélia" }, currency: "DZD", currencySymbol: "DZD", region: "africa", legalSystem: "Code civil algérien", active: true },
  { code: "CM", name: { fr: "Cameroun", en: "Cameroon", es: "Camerún", de: "Kamerun", it: "Camerun", pt: "Camarões" }, currency: "XAF", currencySymbol: "FCFA", region: "africa", legalSystem: "Droit OHADA", active: true },
  { code: "NG", name: { fr: "Nigéria", en: "Nigeria", es: "Nigeria", de: "Nigeria", it: "Nigeria", pt: "Nigéria" }, currency: "NGN", currencySymbol: "₦", region: "africa", legalSystem: "Tenancy Law", active: true },
  { code: "KE", name: { fr: "Kenya", en: "Kenya", es: "Kenia", de: "Kenia", it: "Kenya", pt: "Quénia" }, currency: "KES", currencySymbol: "KES", region: "africa", legalSystem: "Landlord and Tenant Act", active: true },
  { code: "GH", name: { fr: "Ghana", en: "Ghana", es: "Ghana", de: "Ghana", it: "Ghana", pt: "Gana" }, currency: "GHS", currencySymbol: "GHS", region: "africa", legalSystem: "Rent Act 220", active: true },
  // Middle East — additional
  { code: "QA", name: { fr: "Qatar", en: "Qatar", es: "Catar", de: "Katar", it: "Qatar", pt: "Catar" }, currency: "QAR", currencySymbol: "QAR", region: "middle-east", legalSystem: "Law No. 4 of 2008", active: true },
  { code: "IL", name: { fr: "Israël", en: "Israel", es: "Israel", de: "Israel", it: "Israele", pt: "Israel" }, currency: "ILS", currencySymbol: "₪", region: "middle-east", legalSystem: "Rent Law", active: true },
  // Asia-Pacific
  { code: "JP", name: { fr: "Japon", en: "Japan", es: "Japón", de: "Japan", it: "Giappone", pt: "Japão" }, currency: "JPY", currencySymbol: "¥", region: "asia-pacific", legalSystem: "Civil Code / Land Lease Act", active: true },
  { code: "KR", name: { fr: "Corée du Sud", en: "South Korea", es: "Corea del Sur", de: "Südkorea", it: "Corea del Sud", pt: "Coreia do Sul" }, currency: "KRW", currencySymbol: "₩", region: "asia-pacific", legalSystem: "주택임대차보호법", active: true },
  { code: "IN", name: { fr: "Inde", en: "India", es: "India", de: "Indien", it: "India", pt: "Índia" }, currency: "INR", currencySymbol: "₹", region: "asia-pacific", legalSystem: "Rent Control Act", active: true },
  { code: "TH", name: { fr: "Thaïlande", en: "Thailand", es: "Tailandia", de: "Thailand", it: "Thailandia", pt: "Tailândia" }, currency: "THB", currencySymbol: "฿", region: "asia-pacific", legalSystem: "Civil and Commercial Code", active: true },
  { code: "MY", name: { fr: "Malaisie", en: "Malaysia", es: "Malasia", de: "Malaysia", it: "Malesia", pt: "Malásia" }, currency: "MYR", currencySymbol: "RM", region: "asia-pacific", legalSystem: "National Land Code", active: true },
  { code: "VN", name: { fr: "Viêt Nam", en: "Vietnam", es: "Vietnam", de: "Vietnam", it: "Vietnam", pt: "Vietnã" }, currency: "VND", currencySymbol: "VND", region: "asia-pacific", legalSystem: "Bộ luật Dân sự", active: true },
  { code: "PH", name: { fr: "Philippines", en: "Philippines", es: "Filipinas", de: "Philippinen", it: "Filippine", pt: "Filipinas" }, currency: "PHP", currencySymbol: "₱", region: "asia-pacific", legalSystem: "Rent Control Act", active: true },
  { code: "ID", name: { fr: "Indonésie", en: "Indonesia", es: "Indonesia", de: "Indonesien", it: "Indonesia", pt: "Indonésia" }, currency: "IDR", currencySymbol: "IDR", region: "asia-pacific", legalSystem: "KUH Perdata", active: true },
  { code: "AU", name: { fr: "Australie", en: "Australia", es: "Australia", de: "Australien", it: "Australia", pt: "Austrália" }, currency: "AUD", currencySymbol: "A$", region: "asia-pacific", legalSystem: "Residential Tenancies Act", active: true },
  { code: "SG", name: { fr: "Singapour", en: "Singapore", es: "Singapur", de: "Singapur", it: "Singapore", pt: "Singapura" }, currency: "SGD", currencySymbol: "S$", region: "asia-pacific", legalSystem: "Common law", active: true },
  { code: "NZ", name: { fr: "Nouvelle-Zélande", en: "New Zealand", es: "Nueva Zelanda", de: "Neuseeland", it: "Nuova Zelanda", pt: "Nova Zelândia" }, currency: "NZD", currencySymbol: "NZ$", region: "asia-pacific", legalSystem: "Residential Tenancies Act 1986", active: true },
];

export function getCountryInfo(code: string): CountryInfo | undefined {
  return countries.find(c => c.code === code);
}

export function getCountriesByRegion(region: CountryInfo["region"]): CountryInfo[] {
  return countries.filter(c => c.region === region);
}

export function getActiveCountries(): CountryInfo[] {
  return countries.filter(c => c.active);
}

export function getAllCountries(): CountryInfo[] {
  return countries;
}

export function getCountryName(code: string, locale: string = "fr"): string {
  const info = getCountryInfo(code);
  return info?.name[locale] || info?.name.en || code;
}
