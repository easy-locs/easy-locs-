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
  // Asia-Pacific
  { code: "JP", name: { fr: "Japon", en: "Japan", es: "Japón", de: "Japan", it: "Giappone", pt: "Japão" }, currency: "JPY", currencySymbol: "¥", region: "asia-pacific", legalSystem: "Civil Code / Land Lease Act", active: true },
  { code: "AU", name: { fr: "Australie", en: "Australia", es: "Australia", de: "Australien", it: "Australia", pt: "Austrália" }, currency: "AUD", currencySymbol: "A$", region: "asia-pacific", legalSystem: "Residential Tenancies Act", active: true },
  { code: "SG", name: { fr: "Singapour", en: "Singapore", es: "Singapur", de: "Singapur", it: "Singapore", pt: "Singapura" }, currency: "SGD", currencySymbol: "S$", region: "asia-pacific", legalSystem: "Common law", active: true },
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
