/**
 * Global Country Registry — Single source of truth for all country-specific configuration.
 * Every module (i18n, documents, PDFs, forms, emails) MUST reference this registry.
 */

export interface CountryEntry {
  code: string;
  name: string;
  flag: string;
  defaultLanguage: string;
  supportedLanguages: string[];
  currency: string;
  currencySymbol: string;
  locale: string; // Intl locale (e.g. "fr-FR")
  dateFormat: string; // display format
  timezone: string;
  addressFormat: "european" | "anglo" | "asian" | "arabic";
  phonePrefix: string;
  phoneFormat: string; // placeholder
  measurementUnit: "metric" | "imperial";
  region: "europe" | "americas" | "africa" | "middle_east" | "asia_pacific";
  taxIdLabel: string;
  taxIdFormat?: string;
  legalDocumentTypes: string[];
}

import { EXTRA_COUNTRIES } from "./global-country-registry-extra";

const BASE_REGISTRY: CountryEntry[] = [
  // ─── EUROPE ───
  { code: "FR", name: "France", flag: "🇫🇷", defaultLanguage: "fr", supportedLanguages: ["fr", "en"], currency: "EUR", currencySymbol: "€", locale: "fr-FR", dateFormat: "dd/MM/yyyy", timezone: "Europe/Paris", addressFormat: "european", phonePrefix: "+33", phoneFormat: "06 12 34 56 78", measurementUnit: "metric", region: "europe", taxIdLabel: "SIRET / NIF", legalDocumentTypes: ["lease-empty", "lease-furnished", "lease-commercial", "rent-receipt", "inventory", "formal-notice", "termination", "sworn-statement"] },
  { code: "BE", name: "Belgique", flag: "🇧🇪", defaultLanguage: "fr", supportedLanguages: ["fr", "nl", "de", "en"], currency: "EUR", currencySymbol: "€", locale: "fr-BE", dateFormat: "dd/MM/yyyy", timezone: "Europe/Brussels", addressFormat: "european", phonePrefix: "+32", phoneFormat: "0470 12 34 56", measurementUnit: "metric", region: "europe", taxIdLabel: "Numéro d'entreprise", legalDocumentTypes: ["lease-residential", "rent-receipt"] },
  { code: "ES", name: "España", flag: "🇪🇸", defaultLanguage: "es", supportedLanguages: ["es", "en"], currency: "EUR", currencySymbol: "€", locale: "es-ES", dateFormat: "dd/MM/yyyy", timezone: "Europe/Madrid", addressFormat: "european", phonePrefix: "+34", phoneFormat: "612 34 56 78", measurementUnit: "metric", region: "europe", taxIdLabel: "NIF / CIF", legalDocumentTypes: ["lease-residential", "rent-receipt"] },
  { code: "IT", name: "Italia", flag: "🇮🇹", defaultLanguage: "it", supportedLanguages: ["it", "en"], currency: "EUR", currencySymbol: "€", locale: "it-IT", dateFormat: "dd/MM/yyyy", timezone: "Europe/Rome", addressFormat: "european", phonePrefix: "+39", phoneFormat: "320 123 4567", measurementUnit: "metric", region: "europe", taxIdLabel: "Codice fiscale / P.IVA", legalDocumentTypes: ["lease-residential", "rent-receipt"] },
  { code: "DE", name: "Deutschland", flag: "🇩🇪", defaultLanguage: "de", supportedLanguages: ["de", "en"], currency: "EUR", currencySymbol: "€", locale: "de-DE", dateFormat: "dd.MM.yyyy", timezone: "Europe/Berlin", addressFormat: "european", phonePrefix: "+49", phoneFormat: "0170 1234567", measurementUnit: "metric", region: "europe", taxIdLabel: "Steuer-Nr. / USt-IdNr.", legalDocumentTypes: ["lease-residential", "rent-receipt"] },
  { code: "PT", name: "Portugal", flag: "🇵🇹", defaultLanguage: "pt", supportedLanguages: ["pt", "en"], currency: "EUR", currencySymbol: "€", locale: "pt-PT", dateFormat: "dd/MM/yyyy", timezone: "Europe/Lisbon", addressFormat: "european", phonePrefix: "+351", phoneFormat: "912 345 678", measurementUnit: "metric", region: "europe", taxIdLabel: "NIF", legalDocumentTypes: ["lease-residential", "rent-receipt"] },
  { code: "NL", name: "Nederland", flag: "🇳🇱", defaultLanguage: "nl", supportedLanguages: ["nl", "en"], currency: "EUR", currencySymbol: "€", locale: "nl-NL", dateFormat: "dd-MM-yyyy", timezone: "Europe/Amsterdam", addressFormat: "european", phonePrefix: "+31", phoneFormat: "06 12345678", measurementUnit: "metric", region: "europe", taxIdLabel: "BTW-nummer", legalDocumentTypes: ["lease-residential", "rent-receipt"] },
  { code: "GB", name: "United Kingdom", flag: "🇬🇧", defaultLanguage: "en", supportedLanguages: ["en", "fr", "ar"], currency: "GBP", currencySymbol: "£", locale: "en-GB", dateFormat: "dd/MM/yyyy", timezone: "Europe/London", addressFormat: "anglo", phonePrefix: "+44", phoneFormat: "07700 900000", measurementUnit: "imperial", region: "europe", taxIdLabel: "National Insurance No.", legalDocumentTypes: ["lease-residential", "rent-receipt"] },
  { code: "CH", name: "Suisse", flag: "🇨🇭", defaultLanguage: "fr", supportedLanguages: ["fr", "de", "it", "en"], currency: "CHF", currencySymbol: "CHF", locale: "fr-CH", dateFormat: "dd.MM.yyyy", timezone: "Europe/Zurich", addressFormat: "european", phonePrefix: "+41", phoneFormat: "079 123 45 67", measurementUnit: "metric", region: "europe", taxIdLabel: "AVS / IDE", legalDocumentTypes: ["lease-residential", "rent-receipt"] },
  { code: "AT", name: "Österreich", flag: "🇦🇹", defaultLanguage: "de", supportedLanguages: ["de", "en"], currency: "EUR", currencySymbol: "€", locale: "de-AT", dateFormat: "dd.MM.yyyy", timezone: "Europe/Vienna", addressFormat: "european", phonePrefix: "+43", phoneFormat: "0664 1234567", measurementUnit: "metric", region: "europe", taxIdLabel: "UID-Nummer", legalDocumentTypes: ["lease-residential", "rent-receipt"] },
  { code: "LU", name: "Luxembourg", flag: "🇱🇺", defaultLanguage: "fr", supportedLanguages: ["fr", "de", "en"], currency: "EUR", currencySymbol: "€", locale: "fr-LU", dateFormat: "dd/MM/yyyy", timezone: "Europe/Luxembourg", addressFormat: "european", phonePrefix: "+352", phoneFormat: "621 123 456", measurementUnit: "metric", region: "europe", taxIdLabel: "Numéro TVA", legalDocumentTypes: ["lease-residential", "rent-receipt"] },
  { code: "PL", name: "Polska", flag: "🇵🇱", defaultLanguage: "pl", supportedLanguages: ["pl", "en"], currency: "PLN", currencySymbol: "zł", locale: "pl-PL", dateFormat: "dd.MM.yyyy", timezone: "Europe/Warsaw", addressFormat: "european", phonePrefix: "+48", phoneFormat: "501 234 567", measurementUnit: "metric", region: "europe", taxIdLabel: "NIP / PESEL", legalDocumentTypes: ["lease-residential", "rent-receipt"] },
  { code: "SE", name: "Sverige", flag: "🇸🇪", defaultLanguage: "sv", supportedLanguages: ["sv", "en"], currency: "SEK", currencySymbol: "kr", locale: "sv-SE", dateFormat: "yyyy-MM-dd", timezone: "Europe/Stockholm", addressFormat: "european", phonePrefix: "+46", phoneFormat: "070 123 45 67", measurementUnit: "metric", region: "europe", taxIdLabel: "Personnummer", legalDocumentTypes: ["lease-residential", "rent-receipt"] },
  { code: "DK", name: "Danmark", flag: "🇩🇰", defaultLanguage: "da", supportedLanguages: ["da", "en"], currency: "DKK", currencySymbol: "kr", locale: "da-DK", dateFormat: "dd.MM.yyyy", timezone: "Europe/Copenhagen", addressFormat: "european", phonePrefix: "+45", phoneFormat: "20 12 34 56", measurementUnit: "metric", region: "europe", taxIdLabel: "CPR-nummer", legalDocumentTypes: ["lease-residential", "rent-receipt"] },
  { code: "NO", name: "Norge", flag: "🇳🇴", defaultLanguage: "nb", supportedLanguages: ["nb", "en"], currency: "NOK", currencySymbol: "kr", locale: "nb-NO", dateFormat: "dd.MM.yyyy", timezone: "Europe/Oslo", addressFormat: "european", phonePrefix: "+47", phoneFormat: "412 34 567", measurementUnit: "metric", region: "europe", taxIdLabel: "Fødselsnummer", legalDocumentTypes: ["lease-residential", "rent-receipt"] },
  { code: "FI", name: "Suomi", flag: "🇫🇮", defaultLanguage: "fi", supportedLanguages: ["fi", "en"], currency: "EUR", currencySymbol: "€", locale: "fi-FI", dateFormat: "d.M.yyyy", timezone: "Europe/Helsinki", addressFormat: "european", phonePrefix: "+358", phoneFormat: "040 1234567", measurementUnit: "metric", region: "europe", taxIdLabel: "Henkilötunnus", legalDocumentTypes: ["lease-residential", "rent-receipt"] },
  { code: "GR", name: "Ελλάδα", flag: "🇬🇷", defaultLanguage: "el", supportedLanguages: ["el", "en"], currency: "EUR", currencySymbol: "€", locale: "el-GR", dateFormat: "dd/MM/yyyy", timezone: "Europe/Athens", addressFormat: "european", phonePrefix: "+30", phoneFormat: "691 234 5678", measurementUnit: "metric", region: "europe", taxIdLabel: "ΑΦΜ", legalDocumentTypes: ["lease-residential", "rent-receipt"] },
  { code: "CZ", name: "Česko", flag: "🇨🇿", defaultLanguage: "cs", supportedLanguages: ["cs", "en"], currency: "CZK", currencySymbol: "Kč", locale: "cs-CZ", dateFormat: "dd.MM.yyyy", timezone: "Europe/Prague", addressFormat: "european", phonePrefix: "+420", phoneFormat: "601 234 567", measurementUnit: "metric", region: "europe", taxIdLabel: "IČO / DIČ", legalDocumentTypes: ["lease-residential", "rent-receipt"] },
  { code: "HU", name: "Magyarország", flag: "🇭🇺", defaultLanguage: "hu", supportedLanguages: ["hu", "en"], currency: "HUF", currencySymbol: "Ft", locale: "hu-HU", dateFormat: "yyyy.MM.dd", timezone: "Europe/Budapest", addressFormat: "european", phonePrefix: "+36", phoneFormat: "20 123 4567", measurementUnit: "metric", region: "europe", taxIdLabel: "Adószám", legalDocumentTypes: ["lease-residential", "rent-receipt"] },
  { code: "RO", name: "România", flag: "🇷🇴", defaultLanguage: "ro", supportedLanguages: ["ro", "en"], currency: "RON", currencySymbol: "lei", locale: "ro-RO", dateFormat: "dd.MM.yyyy", timezone: "Europe/Bucharest", addressFormat: "european", phonePrefix: "+40", phoneFormat: "0712 345 678", measurementUnit: "metric", region: "europe", taxIdLabel: "CNP / CUI", legalDocumentTypes: ["lease-residential", "rent-receipt"] },
  { code: "HR", name: "Hrvatska", flag: "🇭🇷", defaultLanguage: "hr", supportedLanguages: ["hr", "en"], currency: "EUR", currencySymbol: "€", locale: "hr-HR", dateFormat: "dd.MM.yyyy", timezone: "Europe/Zagreb", addressFormat: "european", phonePrefix: "+385", phoneFormat: "091 234 5678", measurementUnit: "metric", region: "europe", taxIdLabel: "OIB", legalDocumentTypes: ["lease-residential", "rent-receipt"] },
  { code: "IE", name: "Ireland", flag: "🇮🇪", defaultLanguage: "en", supportedLanguages: ["en", "fr"], currency: "EUR", currencySymbol: "€", locale: "en-IE", dateFormat: "dd/MM/yyyy", timezone: "Europe/Dublin", addressFormat: "anglo", phonePrefix: "+353", phoneFormat: "085 123 4567", measurementUnit: "metric", region: "europe", taxIdLabel: "PPS Number", legalDocumentTypes: ["lease-residential", "rent-receipt"] },
  { code: "BG", name: "България", flag: "🇧🇬", defaultLanguage: "bg", supportedLanguages: ["bg", "en"], currency: "BGN", currencySymbol: "лв", locale: "bg-BG", dateFormat: "dd.MM.yyyy", timezone: "Europe/Sofia", addressFormat: "european", phonePrefix: "+359", phoneFormat: "088 123 4567", measurementUnit: "metric", region: "europe", taxIdLabel: "ЕИК / ЕГН", legalDocumentTypes: ["lease-residential", "rent-receipt"] },
  { code: "SK", name: "Slovensko", flag: "🇸🇰", defaultLanguage: "sk", supportedLanguages: ["sk", "en"], currency: "EUR", currencySymbol: "€", locale: "sk-SK", dateFormat: "dd.MM.yyyy", timezone: "Europe/Bratislava", addressFormat: "european", phonePrefix: "+421", phoneFormat: "0901 234 567", measurementUnit: "metric", region: "europe", taxIdLabel: "IČO / DIČ", legalDocumentTypes: ["lease-residential", "rent-receipt"] },

  // ─── AMERICAS ───
  { code: "US", name: "United States", flag: "🇺🇸", defaultLanguage: "en", supportedLanguages: ["en", "es"], currency: "USD", currencySymbol: "$", locale: "en-US", dateFormat: "MM/dd/yyyy", timezone: "America/New_York", addressFormat: "anglo", phonePrefix: "+1", phoneFormat: "(555) 123-4567", measurementUnit: "imperial", region: "americas", taxIdLabel: "SSN / EIN", legalDocumentTypes: ["lease-residential", "rent-receipt"] },
  { code: "CA", name: "Canada", flag: "🇨🇦", defaultLanguage: "en", supportedLanguages: ["en", "fr"], currency: "CAD", currencySymbol: "C$", locale: "en-CA", dateFormat: "yyyy-MM-dd", timezone: "America/Toronto", addressFormat: "anglo", phonePrefix: "+1", phoneFormat: "(555) 123-4567", measurementUnit: "metric", region: "americas", taxIdLabel: "SIN / BN", legalDocumentTypes: ["lease-residential", "rent-receipt"] },
  { code: "BR", name: "Brasil", flag: "🇧🇷", defaultLanguage: "pt", supportedLanguages: ["pt", "en"], currency: "BRL", currencySymbol: "R$", locale: "pt-BR", dateFormat: "dd/MM/yyyy", timezone: "America/Sao_Paulo", addressFormat: "european", phonePrefix: "+55", phoneFormat: "(11) 91234-5678", measurementUnit: "metric", region: "americas", taxIdLabel: "CPF / CNPJ", legalDocumentTypes: ["lease-residential", "rent-receipt"] },
  { code: "MX", name: "México", flag: "🇲🇽", defaultLanguage: "es", supportedLanguages: ["es", "en"], currency: "MXN", currencySymbol: "$", locale: "es-MX", dateFormat: "dd/MM/yyyy", timezone: "America/Mexico_City", addressFormat: "european", phonePrefix: "+52", phoneFormat: "55 1234 5678", measurementUnit: "metric", region: "americas", taxIdLabel: "RFC / CURP", legalDocumentTypes: ["lease-residential", "rent-receipt"] },
  { code: "AR", name: "Argentina", flag: "🇦🇷", defaultLanguage: "es", supportedLanguages: ["es", "en"], currency: "ARS", currencySymbol: "$", locale: "es-AR", dateFormat: "dd/MM/yyyy", timezone: "America/Buenos_Aires", addressFormat: "european", phonePrefix: "+54", phoneFormat: "11 1234-5678", measurementUnit: "metric", region: "americas", taxIdLabel: "CUIT / CUIL", legalDocumentTypes: ["lease-residential", "rent-receipt"] },
  { code: "CL", name: "Chile", flag: "🇨🇱", defaultLanguage: "es", supportedLanguages: ["es", "en"], currency: "CLP", currencySymbol: "$", locale: "es-CL", dateFormat: "dd-MM-yyyy", timezone: "America/Santiago", addressFormat: "european", phonePrefix: "+56", phoneFormat: "9 1234 5678", measurementUnit: "metric", region: "americas", taxIdLabel: "RUT", legalDocumentTypes: ["lease-residential", "rent-receipt"] },
  { code: "CO", name: "Colombia", flag: "🇨🇴", defaultLanguage: "es", supportedLanguages: ["es", "en"], currency: "COP", currencySymbol: "$", locale: "es-CO", dateFormat: "dd/MM/yyyy", timezone: "America/Bogota", addressFormat: "european", phonePrefix: "+57", phoneFormat: "310 1234567", measurementUnit: "metric", region: "americas", taxIdLabel: "NIT / CC", legalDocumentTypes: ["lease-residential", "rent-receipt"] },
  { code: "PE", name: "Perú", flag: "🇵🇪", defaultLanguage: "es", supportedLanguages: ["es", "en"], currency: "PEN", currencySymbol: "S/", locale: "es-PE", dateFormat: "dd/MM/yyyy", timezone: "America/Lima", addressFormat: "european", phonePrefix: "+51", phoneFormat: "912 345 678", measurementUnit: "metric", region: "americas", taxIdLabel: "DNI / RUC", legalDocumentTypes: ["lease-residential", "rent-receipt"] },

  // ─── AFRICA ───
  { code: "MA", name: "Maroc", flag: "🇲🇦", defaultLanguage: "fr", supportedLanguages: ["fr", "ar", "en"], currency: "MAD", currencySymbol: "MAD", locale: "fr-MA", dateFormat: "dd/MM/yyyy", timezone: "Africa/Casablanca", addressFormat: "european", phonePrefix: "+212", phoneFormat: "0612-345678", measurementUnit: "metric", region: "africa", taxIdLabel: "CIN / ICE", legalDocumentTypes: ["lease-residential", "rent-receipt"] },
  { code: "TN", name: "Tunisie", flag: "🇹🇳", defaultLanguage: "fr", supportedLanguages: ["fr", "ar", "en"], currency: "TND", currencySymbol: "DT", locale: "fr-TN", dateFormat: "dd/MM/yyyy", timezone: "Africa/Tunis", addressFormat: "european", phonePrefix: "+216", phoneFormat: "20 123 456", measurementUnit: "metric", region: "africa", taxIdLabel: "CIN / MF", legalDocumentTypes: ["lease-residential", "rent-receipt"] },
  { code: "DZ", name: "Algérie", flag: "🇩🇿", defaultLanguage: "fr", supportedLanguages: ["fr", "ar", "en"], currency: "DZD", currencySymbol: "DA", locale: "fr-DZ", dateFormat: "dd/MM/yyyy", timezone: "Africa/Algiers", addressFormat: "european", phonePrefix: "+213", phoneFormat: "0551 23 45 67", measurementUnit: "metric", region: "africa", taxIdLabel: "NIF", legalDocumentTypes: ["lease-residential", "rent-receipt"] },
  { code: "SN", name: "Sénégal", flag: "🇸🇳", defaultLanguage: "fr", supportedLanguages: ["fr", "wo", "en"], currency: "XOF", currencySymbol: "CFA", locale: "fr-SN", dateFormat: "dd/MM/yyyy", timezone: "Africa/Dakar", addressFormat: "european", phonePrefix: "+221", phoneFormat: "77 123 45 67", measurementUnit: "metric", region: "africa", taxIdLabel: "NINEA", legalDocumentTypes: ["lease-residential", "rent-receipt"] },
  { code: "CI", name: "Côte d'Ivoire", flag: "🇨🇮", defaultLanguage: "fr", supportedLanguages: ["fr", "en"], currency: "XOF", currencySymbol: "CFA", locale: "fr-CI", dateFormat: "dd/MM/yyyy", timezone: "Africa/Abidjan", addressFormat: "european", phonePrefix: "+225", phoneFormat: "01 23 45 67 89", measurementUnit: "metric", region: "africa", taxIdLabel: "CC / NCC", legalDocumentTypes: ["lease-residential", "rent-receipt"] },
  { code: "CM", name: "Cameroun", flag: "🇨🇲", defaultLanguage: "fr", supportedLanguages: ["fr", "en"], currency: "XAF", currencySymbol: "FCFA", locale: "fr-CM", dateFormat: "dd/MM/yyyy", timezone: "Africa/Douala", addressFormat: "european", phonePrefix: "+237", phoneFormat: "6 50 12 34 56", measurementUnit: "metric", region: "africa", taxIdLabel: "NIU", legalDocumentTypes: ["lease-residential", "rent-receipt"] },
  { code: "NG", name: "Nigeria", flag: "🇳🇬", defaultLanguage: "en", supportedLanguages: ["en", "ha", "yo"], currency: "NGN", currencySymbol: "₦", locale: "en-NG", dateFormat: "dd/MM/yyyy", timezone: "Africa/Lagos", addressFormat: "anglo", phonePrefix: "+234", phoneFormat: "0801 234 5678", measurementUnit: "metric", region: "africa", taxIdLabel: "TIN / NIN", legalDocumentTypes: ["lease-residential", "rent-receipt"] },
  { code: "KE", name: "Kenya", flag: "🇰🇪", defaultLanguage: "en", supportedLanguages: ["en", "sw"], currency: "KES", currencySymbol: "KSh", locale: "en-KE", dateFormat: "dd/MM/yyyy", timezone: "Africa/Nairobi", addressFormat: "anglo", phonePrefix: "+254", phoneFormat: "0712 345678", measurementUnit: "metric", region: "africa", taxIdLabel: "KRA PIN", legalDocumentTypes: ["lease-residential", "rent-receipt"] },
  { code: "GH", name: "Ghana", flag: "🇬🇭", defaultLanguage: "en", supportedLanguages: ["en", "fr"], currency: "GHS", currencySymbol: "GH₵", locale: "en-GH", dateFormat: "dd/MM/yyyy", timezone: "Africa/Accra", addressFormat: "anglo", phonePrefix: "+233", phoneFormat: "024 123 4567", measurementUnit: "metric", region: "africa", taxIdLabel: "TIN / Ghana Card", legalDocumentTypes: ["lease-residential", "rent-receipt"] },
  { code: "ZA", name: "South Africa", flag: "🇿🇦", defaultLanguage: "en", supportedLanguages: ["en", "fr"], currency: "ZAR", currencySymbol: "R", locale: "en-ZA", dateFormat: "yyyy/MM/dd", timezone: "Africa/Johannesburg", addressFormat: "anglo", phonePrefix: "+27", phoneFormat: "071 234 5678", measurementUnit: "metric", region: "africa", taxIdLabel: "ID / Tax Ref", legalDocumentTypes: ["lease-residential", "rent-receipt"] },

  // ─── MIDDLE EAST ───
  { code: "AE", name: "United Arab Emirates", flag: "🇦🇪", defaultLanguage: "en", supportedLanguages: ["en", "ar"], currency: "AED", currencySymbol: "AED", locale: "en-AE", dateFormat: "dd/MM/yyyy", timezone: "Asia/Dubai", addressFormat: "arabic", phonePrefix: "+971", phoneFormat: "050 123 4567", measurementUnit: "metric", region: "middle_east", taxIdLabel: "Emirates ID", legalDocumentTypes: ["lease-residential", "rent-receipt", "ejari-contract"] },
  { code: "SA", name: "Saudi Arabia", flag: "🇸🇦", defaultLanguage: "en", supportedLanguages: ["en", "ar"], currency: "SAR", currencySymbol: "SAR", locale: "en-SA", dateFormat: "dd/MM/yyyy", timezone: "Asia/Riyadh", addressFormat: "arabic", phonePrefix: "+966", phoneFormat: "050 123 4567", measurementUnit: "metric", region: "middle_east", taxIdLabel: "Iqama / National ID", legalDocumentTypes: ["lease-residential", "rent-receipt"] },
  { code: "QA", name: "Qatar", flag: "🇶🇦", defaultLanguage: "en", supportedLanguages: ["en", "ar"], currency: "QAR", currencySymbol: "QAR", locale: "en-QA", dateFormat: "dd/MM/yyyy", timezone: "Asia/Qatar", addressFormat: "arabic", phonePrefix: "+974", phoneFormat: "3012 3456", measurementUnit: "metric", region: "middle_east", taxIdLabel: "QID", legalDocumentTypes: ["lease-residential", "rent-receipt"] },
  { code: "TR", name: "Türkiye", flag: "🇹🇷", defaultLanguage: "tr", supportedLanguages: ["tr", "en"], currency: "TRY", currencySymbol: "₺", locale: "tr-TR", dateFormat: "dd.MM.yyyy", timezone: "Europe/Istanbul", addressFormat: "european", phonePrefix: "+90", phoneFormat: "0532 123 45 67", measurementUnit: "metric", region: "middle_east", taxIdLabel: "T.C. Kimlik No.", legalDocumentTypes: ["lease-residential", "rent-receipt"] },
  { code: "IL", name: "Israel", flag: "🇮🇱", defaultLanguage: "he", supportedLanguages: ["he", "en", "ar"], currency: "ILS", currencySymbol: "₪", locale: "he-IL", dateFormat: "dd/MM/yyyy", timezone: "Asia/Jerusalem", addressFormat: "european", phonePrefix: "+972", phoneFormat: "050-123-4567", measurementUnit: "metric", region: "middle_east", taxIdLabel: "Teudat Zehut", legalDocumentTypes: ["lease-residential", "rent-receipt"] },
  { code: "JO", name: "Jordan", flag: "🇯🇴", defaultLanguage: "en", supportedLanguages: ["en", "ar"], currency: "JOD", currencySymbol: "JD", locale: "en-JO", dateFormat: "dd/MM/yyyy", timezone: "Asia/Amman", addressFormat: "arabic", phonePrefix: "+962", phoneFormat: "079 123 4567", measurementUnit: "metric", region: "middle_east", taxIdLabel: "National ID", legalDocumentTypes: ["lease-residential", "rent-receipt"] },
  { code: "LB", name: "Lebanon", flag: "🇱🇧", defaultLanguage: "fr", supportedLanguages: ["fr", "en", "ar"], currency: "LBP", currencySymbol: "L£", locale: "fr-LB", dateFormat: "dd/MM/yyyy", timezone: "Asia/Beirut", addressFormat: "arabic", phonePrefix: "+961", phoneFormat: "03 123 456", measurementUnit: "metric", region: "middle_east", taxIdLabel: "National ID / RC", legalDocumentTypes: ["lease-residential", "rent-receipt"] },
  { code: "KW", name: "Kuwait", flag: "🇰🇼", defaultLanguage: "en", supportedLanguages: ["en", "ar"], currency: "KWD", currencySymbol: "KD", locale: "en-KW", dateFormat: "dd/MM/yyyy", timezone: "Asia/Kuwait", addressFormat: "arabic", phonePrefix: "+965", phoneFormat: "5012 3456", measurementUnit: "metric", region: "middle_east", taxIdLabel: "Civil ID", legalDocumentTypes: ["lease-residential", "rent-receipt"] },
  { code: "BH", name: "Bahrain", flag: "🇧🇭", defaultLanguage: "en", supportedLanguages: ["en", "ar"], currency: "BHD", currencySymbol: "BD", locale: "en-BH", dateFormat: "dd/MM/yyyy", timezone: "Asia/Bahrain", addressFormat: "arabic", phonePrefix: "+973", phoneFormat: "3612 3456", measurementUnit: "metric", region: "middle_east", taxIdLabel: "CPR", legalDocumentTypes: ["lease-residential", "rent-receipt"] },
  { code: "OM", name: "Oman", flag: "🇴🇲", defaultLanguage: "en", supportedLanguages: ["en", "ar"], currency: "OMR", currencySymbol: "OMR", locale: "en-OM", dateFormat: "dd/MM/yyyy", timezone: "Asia/Muscat", addressFormat: "arabic", phonePrefix: "+968", phoneFormat: "9123 4567", measurementUnit: "metric", region: "middle_east", taxIdLabel: "National ID", legalDocumentTypes: ["lease-residential", "rent-receipt"] },

  // ─── ASIA-PACIFIC ───
  { code: "JP", name: "日本", flag: "🇯🇵", defaultLanguage: "ja", supportedLanguages: ["ja", "en"], currency: "JPY", currencySymbol: "¥", locale: "ja-JP", dateFormat: "yyyy/MM/dd", timezone: "Asia/Tokyo", addressFormat: "asian", phonePrefix: "+81", phoneFormat: "090-1234-5678", measurementUnit: "metric", region: "asia_pacific", taxIdLabel: "マイナンバー", legalDocumentTypes: ["lease-residential", "rent-receipt"] },
  { code: "KR", name: "대한민국", flag: "🇰🇷", defaultLanguage: "ko", supportedLanguages: ["ko", "en"], currency: "KRW", currencySymbol: "₩", locale: "ko-KR", dateFormat: "yyyy.MM.dd", timezone: "Asia/Seoul", addressFormat: "asian", phonePrefix: "+82", phoneFormat: "010-1234-5678", measurementUnit: "metric", region: "asia_pacific", taxIdLabel: "주민등록번호", legalDocumentTypes: ["lease-residential", "rent-receipt"] },
  { code: "CN", name: "中国", flag: "🇨🇳", defaultLanguage: "zh", supportedLanguages: ["zh", "en"], currency: "CNY", currencySymbol: "¥", locale: "zh-CN", dateFormat: "yyyy-MM-dd", timezone: "Asia/Shanghai", addressFormat: "asian", phonePrefix: "+86", phoneFormat: "138 0000 0000", measurementUnit: "metric", region: "asia_pacific", taxIdLabel: "身份证号", legalDocumentTypes: ["lease-residential", "rent-receipt"] },
  { code: "IN", name: "India", flag: "🇮🇳", defaultLanguage: "en", supportedLanguages: ["en", "hi", "bn"], currency: "INR", currencySymbol: "₹", locale: "en-IN", dateFormat: "dd/MM/yyyy", timezone: "Asia/Kolkata", addressFormat: "anglo", phonePrefix: "+91", phoneFormat: "98765 43210", measurementUnit: "metric", region: "asia_pacific", taxIdLabel: "PAN / Aadhaar", legalDocumentTypes: ["lease-residential", "rent-receipt"] },
  { code: "SG", name: "Singapore", flag: "🇸🇬", defaultLanguage: "en", supportedLanguages: ["en", "zh", "ms"], currency: "SGD", currencySymbol: "S$", locale: "en-SG", dateFormat: "dd/MM/yyyy", timezone: "Asia/Singapore", addressFormat: "anglo", phonePrefix: "+65", phoneFormat: "8123 4567", measurementUnit: "metric", region: "asia_pacific", taxIdLabel: "NRIC / FIN", legalDocumentTypes: ["lease-residential", "rent-receipt"] },
  { code: "MY", name: "Malaysia", flag: "🇲🇾", defaultLanguage: "ms", supportedLanguages: ["ms", "en", "zh"], currency: "MYR", currencySymbol: "RM", locale: "ms-MY", dateFormat: "dd/MM/yyyy", timezone: "Asia/Kuala_Lumpur", addressFormat: "anglo", phonePrefix: "+60", phoneFormat: "012-345 6789", measurementUnit: "metric", region: "asia_pacific", taxIdLabel: "IC / SST ID", legalDocumentTypes: ["lease-residential", "rent-receipt"] },
  { code: "TH", name: "ประเทศไทย", flag: "🇹🇭", defaultLanguage: "th", supportedLanguages: ["th", "en"], currency: "THB", currencySymbol: "฿", locale: "th-TH", dateFormat: "dd/MM/yyyy", timezone: "Asia/Bangkok", addressFormat: "asian", phonePrefix: "+66", phoneFormat: "081 234 5678", measurementUnit: "metric", region: "asia_pacific", taxIdLabel: "Thai National ID", legalDocumentTypes: ["lease-residential", "rent-receipt"] },
  { code: "VN", name: "Việt Nam", flag: "🇻🇳", defaultLanguage: "vi", supportedLanguages: ["vi", "en"], currency: "VND", currencySymbol: "₫", locale: "vi-VN", dateFormat: "dd/MM/yyyy", timezone: "Asia/Ho_Chi_Minh", addressFormat: "asian", phonePrefix: "+84", phoneFormat: "091 234 56 78", measurementUnit: "metric", region: "asia_pacific", taxIdLabel: "CMND / CCCD", legalDocumentTypes: ["lease-residential", "rent-receipt"] },
  { code: "PH", name: "Philippines", flag: "🇵🇭", defaultLanguage: "en", supportedLanguages: ["en", "tl"], currency: "PHP", currencySymbol: "₱", locale: "en-PH", dateFormat: "MM/dd/yyyy", timezone: "Asia/Manila", addressFormat: "anglo", phonePrefix: "+63", phoneFormat: "0917 123 4567", measurementUnit: "metric", region: "asia_pacific", taxIdLabel: "TIN / PhilSys ID", legalDocumentTypes: ["lease-residential", "rent-receipt"] },
  { code: "ID", name: "Indonesia", flag: "🇮🇩", defaultLanguage: "id", supportedLanguages: ["id", "en"], currency: "IDR", currencySymbol: "Rp", locale: "id-ID", dateFormat: "dd/MM/yyyy", timezone: "Asia/Jakarta", addressFormat: "asian", phonePrefix: "+62", phoneFormat: "0812 3456 7890", measurementUnit: "metric", region: "asia_pacific", taxIdLabel: "NIK / NPWP", legalDocumentTypes: ["lease-residential", "rent-receipt"] },
  { code: "AU", name: "Australia", flag: "🇦🇺", defaultLanguage: "en", supportedLanguages: ["en", "zh", "ar"], currency: "AUD", currencySymbol: "A$", locale: "en-AU", dateFormat: "dd/MM/yyyy", timezone: "Australia/Sydney", addressFormat: "anglo", phonePrefix: "+61", phoneFormat: "0412 345 678", measurementUnit: "metric", region: "asia_pacific", taxIdLabel: "TFN / ABN", legalDocumentTypes: ["lease-residential", "rent-receipt"] },
  { code: "NZ", name: "New Zealand", flag: "🇳🇿", defaultLanguage: "en", supportedLanguages: ["en", "zh"], currency: "NZD", currencySymbol: "NZ$", locale: "en-NZ", dateFormat: "dd/MM/yyyy", timezone: "Pacific/Auckland", addressFormat: "anglo", phonePrefix: "+64", phoneFormat: "021 123 4567", measurementUnit: "metric", region: "asia_pacific", taxIdLabel: "IRD number", legalDocumentTypes: ["lease-residential", "rent-receipt"] },
  { code: "PK", name: "Pakistan", flag: "🇵🇰", defaultLanguage: "ur", supportedLanguages: ["ur", "en"], currency: "PKR", currencySymbol: "₨", locale: "ur-PK", dateFormat: "dd/MM/yyyy", timezone: "Asia/Karachi", addressFormat: "anglo", phonePrefix: "+92", phoneFormat: "0300 1234567", measurementUnit: "metric", region: "asia_pacific", taxIdLabel: "CNIC / NTN", legalDocumentTypes: ["lease-residential", "rent-receipt"] },
  { code: "BD", name: "Bangladesh", flag: "🇧🇩", defaultLanguage: "bn", supportedLanguages: ["bn", "en"], currency: "BDT", currencySymbol: "৳", locale: "bn-BD", dateFormat: "dd/MM/yyyy", timezone: "Asia/Dhaka", addressFormat: "anglo", phonePrefix: "+880", phoneFormat: "01712-345678", measurementUnit: "metric", region: "asia_pacific", taxIdLabel: "NID / TIN", legalDocumentTypes: ["lease-residential", "rent-receipt"] },
  { code: "LK", name: "Sri Lanka", flag: "🇱🇰", defaultLanguage: "en", supportedLanguages: ["en", "hi"], currency: "LKR", currencySymbol: "Rs", locale: "en-LK", dateFormat: "dd/MM/yyyy", timezone: "Asia/Colombo", addressFormat: "anglo", phonePrefix: "+94", phoneFormat: "071 234 5678", measurementUnit: "metric", region: "asia_pacific", taxIdLabel: "NIC / TIN", legalDocumentTypes: ["lease-residential", "rent-receipt"] },
  { code: "NP", name: "Nepal", flag: "🇳🇵", defaultLanguage: "en", supportedLanguages: ["en", "hi"], currency: "NPR", currencySymbol: "₨", locale: "en-NP", dateFormat: "dd/MM/yyyy", timezone: "Asia/Kathmandu", addressFormat: "anglo", phonePrefix: "+977", phoneFormat: "984-1234567", measurementUnit: "metric", region: "asia_pacific", taxIdLabel: "PAN", legalDocumentTypes: ["lease-residential", "rent-receipt"] },
  { code: "KH", name: "Cambodia", flag: "🇰🇭", defaultLanguage: "en", supportedLanguages: ["en", "fr"], currency: "KHR", currencySymbol: "៛", locale: "en-KH", dateFormat: "dd/MM/yyyy", timezone: "Asia/Phnom_Penh", addressFormat: "asian", phonePrefix: "+855", phoneFormat: "012 345 678", measurementUnit: "metric", region: "asia_pacific", taxIdLabel: "National ID", legalDocumentTypes: ["lease-residential", "rent-receipt"] },
  { code: "MM", name: "Myanmar", flag: "🇲🇲", defaultLanguage: "en", supportedLanguages: ["en", "zh"], currency: "MMK", currencySymbol: "K", locale: "en-MM", dateFormat: "dd/MM/yyyy", timezone: "Asia/Yangon", addressFormat: "asian", phonePrefix: "+95", phoneFormat: "09 123456789", measurementUnit: "metric", region: "asia_pacific", taxIdLabel: "NRC", legalDocumentTypes: ["lease-residential", "rent-receipt"] },
  { code: "TW", name: "Taiwan", flag: "🇹🇼", defaultLanguage: "zh", supportedLanguages: ["zh", "en"], currency: "TWD", currencySymbol: "NT$", locale: "zh-TW", dateFormat: "yyyy/MM/dd", timezone: "Asia/Taipei", addressFormat: "asian", phonePrefix: "+886", phoneFormat: "0912 345 678", measurementUnit: "metric", region: "asia_pacific", taxIdLabel: "統一編號", legalDocumentTypes: ["lease-residential", "rent-receipt"] },
  { code: "HK", name: "Hong Kong", flag: "🇭🇰", defaultLanguage: "zh", supportedLanguages: ["zh", "en"], currency: "HKD", currencySymbol: "HK$", locale: "zh-HK", dateFormat: "dd/MM/yyyy", timezone: "Asia/Hong_Kong", addressFormat: "anglo", phonePrefix: "+852", phoneFormat: "9123 4567", measurementUnit: "metric", region: "asia_pacific", taxIdLabel: "HKID", legalDocumentTypes: ["lease-residential", "rent-receipt"] },
  { code: "KZ", name: "Kazakhstan", flag: "🇰🇿", defaultLanguage: "ru", supportedLanguages: ["ru", "en"], currency: "KZT", currencySymbol: "₸", locale: "ru-KZ", dateFormat: "dd.MM.yyyy", timezone: "Asia/Almaty", addressFormat: "european", phonePrefix: "+7", phoneFormat: "701 123 4567", measurementUnit: "metric", region: "asia_pacific", taxIdLabel: "ИИН / БИН", legalDocumentTypes: ["lease-residential", "rent-receipt"] },

  // ─── EXTRA AMERICAS ───
  { code: "UY", name: "Uruguay", flag: "🇺🇾", defaultLanguage: "es", supportedLanguages: ["es", "en"], currency: "UYU", currencySymbol: "$U", locale: "es-UY", dateFormat: "dd/MM/yyyy", timezone: "America/Montevideo", addressFormat: "european", phonePrefix: "+598", phoneFormat: "094 123 456", measurementUnit: "metric", region: "americas", taxIdLabel: "RUT / CI", legalDocumentTypes: ["lease-residential", "rent-receipt"] },
  { code: "EC", name: "Ecuador", flag: "🇪🇨", defaultLanguage: "es", supportedLanguages: ["es", "en"], currency: "USD", currencySymbol: "$", locale: "es-EC", dateFormat: "dd/MM/yyyy", timezone: "America/Guayaquil", addressFormat: "european", phonePrefix: "+593", phoneFormat: "099 123 4567", measurementUnit: "metric", region: "americas", taxIdLabel: "RUC / CI", legalDocumentTypes: ["lease-residential", "rent-receipt"] },
  { code: "VE", name: "Venezuela", flag: "🇻🇪", defaultLanguage: "es", supportedLanguages: ["es", "en"], currency: "VES", currencySymbol: "Bs", locale: "es-VE", dateFormat: "dd/MM/yyyy", timezone: "America/Caracas", addressFormat: "european", phonePrefix: "+58", phoneFormat: "0412-1234567", measurementUnit: "metric", region: "americas", taxIdLabel: "RIF / CI", legalDocumentTypes: ["lease-residential", "rent-receipt"] },
  { code: "DO", name: "República Dominicana", flag: "🇩🇴", defaultLanguage: "es", supportedLanguages: ["es", "en"], currency: "DOP", currencySymbol: "RD$", locale: "es-DO", dateFormat: "dd/MM/yyyy", timezone: "America/Santo_Domingo", addressFormat: "european", phonePrefix: "+1", phoneFormat: "(809) 123-4567", measurementUnit: "metric", region: "americas", taxIdLabel: "Cédula / RNC", legalDocumentTypes: ["lease-residential", "rent-receipt"] },
  { code: "CR", name: "Costa Rica", flag: "🇨🇷", defaultLanguage: "es", supportedLanguages: ["es", "en"], currency: "CRC", currencySymbol: "₡", locale: "es-CR", dateFormat: "dd/MM/yyyy", timezone: "America/Costa_Rica", addressFormat: "european", phonePrefix: "+506", phoneFormat: "8123 4567", measurementUnit: "metric", region: "americas", taxIdLabel: "Cédula / DIMEX", legalDocumentTypes: ["lease-residential", "rent-receipt"] },
  { code: "PA", name: "Panamá", flag: "🇵🇦", defaultLanguage: "es", supportedLanguages: ["es", "en"], currency: "PAB", currencySymbol: "B/.", locale: "es-PA", dateFormat: "dd/MM/yyyy", timezone: "America/Panama", addressFormat: "european", phonePrefix: "+507", phoneFormat: "6123-4567", measurementUnit: "metric", region: "americas", taxIdLabel: "Cédula / RUC", legalDocumentTypes: ["lease-residential", "rent-receipt"] },
  { code: "GT", name: "Guatemala", flag: "🇬🇹", defaultLanguage: "es", supportedLanguages: ["es", "en"], currency: "GTQ", currencySymbol: "Q", locale: "es-GT", dateFormat: "dd/MM/yyyy", timezone: "America/Guatemala", addressFormat: "european", phonePrefix: "+502", phoneFormat: "5123 4567", measurementUnit: "metric", region: "americas", taxIdLabel: "DPI / NIT", legalDocumentTypes: ["lease-residential", "rent-receipt"] },
  { code: "JM", name: "Jamaica", flag: "🇯🇲", defaultLanguage: "en", supportedLanguages: ["en", "es"], currency: "JMD", currencySymbol: "J$", locale: "en-JM", dateFormat: "dd/MM/yyyy", timezone: "America/Jamaica", addressFormat: "anglo", phonePrefix: "+1", phoneFormat: "(876) 123-4567", measurementUnit: "metric", region: "americas", taxIdLabel: "TRN", legalDocumentTypes: ["lease-residential", "rent-receipt"] },
  { code: "TT", name: "Trinidad & Tobago", flag: "🇹🇹", defaultLanguage: "en", supportedLanguages: ["en", "es", "hi"], currency: "TTD", currencySymbol: "TT$", locale: "en-TT", dateFormat: "dd/MM/yyyy", timezone: "America/Port_of_Spain", addressFormat: "anglo", phonePrefix: "+1", phoneFormat: "(868) 123-4567", measurementUnit: "metric", region: "americas", taxIdLabel: "NIS / BIR", legalDocumentTypes: ["lease-residential", "rent-receipt"] },

  // ─── EXTRA AFRICA ───
  { code: "EG", name: "Egypt", flag: "🇪🇬", defaultLanguage: "ar", supportedLanguages: ["ar", "en"], currency: "EGP", currencySymbol: "E£", locale: "ar-EG", dateFormat: "dd/MM/yyyy", timezone: "Africa/Cairo", addressFormat: "arabic", phonePrefix: "+20", phoneFormat: "010 1234 5678", measurementUnit: "metric", region: "africa", taxIdLabel: "National ID / TIN", legalDocumentTypes: ["lease-residential", "rent-receipt"] },
  { code: "ET", name: "Ethiopia", flag: "🇪🇹", defaultLanguage: "am", supportedLanguages: ["am", "en"], currency: "ETB", currencySymbol: "Br", locale: "am-ET", dateFormat: "dd/MM/yyyy", timezone: "Africa/Addis_Ababa", addressFormat: "anglo", phonePrefix: "+251", phoneFormat: "091 123 4567", measurementUnit: "metric", region: "africa", taxIdLabel: "TIN", legalDocumentTypes: ["lease-residential", "rent-receipt"] },
  { code: "TZ", name: "Tanzania", flag: "🇹🇿", defaultLanguage: "sw", supportedLanguages: ["sw", "en"], currency: "TZS", currencySymbol: "TSh", locale: "sw-TZ", dateFormat: "dd/MM/yyyy", timezone: "Africa/Dar_es_Salaam", addressFormat: "anglo", phonePrefix: "+255", phoneFormat: "0712 345 678", measurementUnit: "metric", region: "africa", taxIdLabel: "TIN / NIDA", legalDocumentTypes: ["lease-residential", "rent-receipt"] },
  { code: "UG", name: "Uganda", flag: "🇺🇬", defaultLanguage: "en", supportedLanguages: ["en", "sw"], currency: "UGX", currencySymbol: "USh", locale: "en-UG", dateFormat: "dd/MM/yyyy", timezone: "Africa/Kampala", addressFormat: "anglo", phonePrefix: "+256", phoneFormat: "077 123 4567", measurementUnit: "metric", region: "africa", taxIdLabel: "TIN / NIN", legalDocumentTypes: ["lease-residential", "rent-receipt"] },
  { code: "RW", name: "Rwanda", flag: "🇷🇼", defaultLanguage: "en", supportedLanguages: ["en", "fr"], currency: "RWF", currencySymbol: "FRw", locale: "en-RW", dateFormat: "dd/MM/yyyy", timezone: "Africa/Kigali", addressFormat: "anglo", phonePrefix: "+250", phoneFormat: "078 123 4567", measurementUnit: "metric", region: "africa", taxIdLabel: "NID / TIN", legalDocumentTypes: ["lease-residential", "rent-receipt"] },
  { code: "MU", name: "Mauritius", flag: "🇲🇺", defaultLanguage: "en", supportedLanguages: ["en", "fr"], currency: "MUR", currencySymbol: "₨", locale: "en-MU", dateFormat: "dd/MM/yyyy", timezone: "Indian/Mauritius", addressFormat: "anglo", phonePrefix: "+230", phoneFormat: "5123 4567", measurementUnit: "metric", region: "africa", taxIdLabel: "NIC / BRN", legalDocumentTypes: ["lease-residential", "rent-receipt"] },
  { code: "MG", name: "Madagascar", flag: "🇲🇬", defaultLanguage: "fr", supportedLanguages: ["fr", "en"], currency: "MGA", currencySymbol: "Ar", locale: "fr-MG", dateFormat: "dd/MM/yyyy", timezone: "Indian/Antananarivo", addressFormat: "european", phonePrefix: "+261", phoneFormat: "032 12 345 67", measurementUnit: "metric", region: "africa", taxIdLabel: "NIF / CIN", legalDocumentTypes: ["lease-residential", "rent-receipt"] },
  { code: "GA", name: "Gabon", flag: "🇬🇦", defaultLanguage: "fr", supportedLanguages: ["fr", "en"], currency: "XAF", currencySymbol: "FCFA", locale: "fr-GA", dateFormat: "dd/MM/yyyy", timezone: "Africa/Libreville", addressFormat: "european", phonePrefix: "+241", phoneFormat: "06 12 34 56", measurementUnit: "metric", region: "africa", taxIdLabel: "NIF", legalDocumentTypes: ["lease-residential", "rent-receipt"] },
  { code: "CG", name: "Congo", flag: "🇨🇬", defaultLanguage: "fr", supportedLanguages: ["fr", "en"], currency: "XAF", currencySymbol: "FCFA", locale: "fr-CG", dateFormat: "dd/MM/yyyy", timezone: "Africa/Brazzaville", addressFormat: "european", phonePrefix: "+242", phoneFormat: "06 123 4567", measurementUnit: "metric", region: "africa", taxIdLabel: "NIF", legalDocumentTypes: ["lease-residential", "rent-receipt"] },
  { code: "CD", name: "RD Congo", flag: "🇨🇩", defaultLanguage: "fr", supportedLanguages: ["fr", "en"], currency: "CDF", currencySymbol: "FC", locale: "fr-CD", dateFormat: "dd/MM/yyyy", timezone: "Africa/Kinshasa", addressFormat: "european", phonePrefix: "+243", phoneFormat: "099 123 4567", measurementUnit: "metric", region: "africa", taxIdLabel: "NIF / Carte d'identité", legalDocumentTypes: ["lease-residential", "rent-receipt"] },

  // ─── EXTRA MIDDLE EAST ───
  { code: "IQ", name: "Iraq", flag: "🇮🇶", defaultLanguage: "ar", supportedLanguages: ["ar", "en"], currency: "IQD", currencySymbol: "ع.د", locale: "ar-IQ", dateFormat: "dd/MM/yyyy", timezone: "Asia/Baghdad", addressFormat: "arabic", phonePrefix: "+964", phoneFormat: "0771 234 5678", measurementUnit: "metric", region: "middle_east", taxIdLabel: "National ID", legalDocumentTypes: ["lease-residential", "rent-receipt"] },

  // ─── EXTRA EUROPE ───
  { code: "UA", name: "Ukraine", flag: "🇺🇦", defaultLanguage: "uk", supportedLanguages: ["uk", "ru", "en"], currency: "UAH", currencySymbol: "₴", locale: "uk-UA", dateFormat: "dd.MM.yyyy", timezone: "Europe/Kyiv", addressFormat: "european", phonePrefix: "+380", phoneFormat: "050 123 4567", measurementUnit: "metric", region: "europe", taxIdLabel: "ІПН", legalDocumentTypes: ["lease-residential", "rent-receipt"] },
  { code: "RU", name: "Russia", flag: "🇷🇺", defaultLanguage: "ru", supportedLanguages: ["ru", "en"], currency: "RUB", currencySymbol: "₽", locale: "ru-RU", dateFormat: "dd.MM.yyyy", timezone: "Europe/Moscow", addressFormat: "european", phonePrefix: "+7", phoneFormat: "912 345-67-89", measurementUnit: "metric", region: "europe", taxIdLabel: "ИНН / Паспорт", legalDocumentTypes: ["lease-residential", "rent-receipt"] },
  { code: "RS", name: "Serbia", flag: "🇷🇸", defaultLanguage: "en", supportedLanguages: ["en", "de", "ru"], currency: "RSD", currencySymbol: "din.", locale: "sr-RS", dateFormat: "dd.MM.yyyy", timezone: "Europe/Belgrade", addressFormat: "european", phonePrefix: "+381", phoneFormat: "069 123 4567", measurementUnit: "metric", region: "europe", taxIdLabel: "JMBG / PIB", legalDocumentTypes: ["lease-residential", "rent-receipt"] },
  { code: "GE", name: "Georgia", flag: "🇬🇪", defaultLanguage: "en", supportedLanguages: ["en", "ru"], currency: "GEL", currencySymbol: "₾", locale: "ka-GE", dateFormat: "dd.MM.yyyy", timezone: "Asia/Tbilisi", addressFormat: "european", phonePrefix: "+995", phoneFormat: "555 12 34 56", measurementUnit: "metric", region: "europe", taxIdLabel: "Personal No.", legalDocumentTypes: ["lease-residential", "rent-receipt"] },
  { code: "SI", name: "Slovenia", flag: "🇸🇮", defaultLanguage: "sl", supportedLanguages: ["sl", "en"], currency: "EUR", currencySymbol: "€", locale: "sl-SI", dateFormat: "dd.MM.yyyy", timezone: "Europe/Ljubljana", addressFormat: "european", phonePrefix: "+386", phoneFormat: "031 123 456", measurementUnit: "metric", region: "europe", taxIdLabel: "EMŠO / DDV", legalDocumentTypes: ["lease-residential", "rent-receipt"] },
  { code: "LT", name: "Lithuania", flag: "🇱🇹", defaultLanguage: "lt", supportedLanguages: ["lt", "en"], currency: "EUR", currencySymbol: "€", locale: "lt-LT", dateFormat: "yyyy-MM-dd", timezone: "Europe/Vilnius", addressFormat: "european", phonePrefix: "+370", phoneFormat: "612 34567", measurementUnit: "metric", region: "europe", taxIdLabel: "Asmens kodas", legalDocumentTypes: ["lease-residential", "rent-receipt"] },
  { code: "LV", name: "Latvia", flag: "🇱🇻", defaultLanguage: "lv", supportedLanguages: ["lv", "en"], currency: "EUR", currencySymbol: "€", locale: "lv-LV", dateFormat: "dd.MM.yyyy", timezone: "Europe/Riga", addressFormat: "european", phonePrefix: "+371", phoneFormat: "2012 3456", measurementUnit: "metric", region: "europe", taxIdLabel: "Personas kods", legalDocumentTypes: ["lease-residential", "rent-receipt"] },
  { code: "EE", name: "Estonia", flag: "🇪🇪", defaultLanguage: "et", supportedLanguages: ["et", "en"], currency: "EUR", currencySymbol: "€", locale: "et-EE", dateFormat: "dd.MM.yyyy", timezone: "Europe/Tallinn", addressFormat: "european", phonePrefix: "+372", phoneFormat: "5123 4567", measurementUnit: "metric", region: "europe", taxIdLabel: "Isikukood", legalDocumentTypes: ["lease-residential", "rent-receipt"] },
  { code: "IS", name: "Iceland", flag: "🇮🇸", defaultLanguage: "en", supportedLanguages: ["en", "da"], currency: "ISK", currencySymbol: "kr", locale: "is-IS", dateFormat: "dd.MM.yyyy", timezone: "Atlantic/Reykjavik", addressFormat: "european", phonePrefix: "+354", phoneFormat: "612 3456", measurementUnit: "metric", region: "europe", taxIdLabel: "Kennitala", legalDocumentTypes: ["lease-residential", "rent-receipt"] },
  { code: "MT", name: "Malta", flag: "🇲🇹", defaultLanguage: "en", supportedLanguages: ["en", "it"], currency: "EUR", currencySymbol: "€", locale: "en-MT", dateFormat: "dd/MM/yyyy", timezone: "Europe/Malta", addressFormat: "european", phonePrefix: "+356", phoneFormat: "7912 3456", measurementUnit: "metric", region: "europe", taxIdLabel: "ID Card / VAT", legalDocumentTypes: ["lease-residential", "rent-receipt"] },
  { code: "CY", name: "Cyprus", flag: "🇨🇾", defaultLanguage: "en", supportedLanguages: ["en", "el"], currency: "EUR", currencySymbol: "€", locale: "en-CY", dateFormat: "dd/MM/yyyy", timezone: "Asia/Nicosia", addressFormat: "european", phonePrefix: "+357", phoneFormat: "96 123456", measurementUnit: "metric", region: "europe", taxIdLabel: "TIC / ARC", legalDocumentTypes: ["lease-residential", "rent-receipt"] },
  { code: "AL", name: "Albania", flag: "🇦🇱", defaultLanguage: "en", supportedLanguages: ["en", "it"], currency: "ALL", currencySymbol: "L", locale: "sq-AL", dateFormat: "dd.MM.yyyy", timezone: "Europe/Tirane", addressFormat: "european", phonePrefix: "+355", phoneFormat: "069 123 4567", measurementUnit: "metric", region: "europe", taxIdLabel: "NIPT / ID", legalDocumentTypes: ["lease-residential", "rent-receipt"] },
  { code: "MK", name: "North Macedonia", flag: "🇲🇰", defaultLanguage: "en", supportedLanguages: ["en", "de"], currency: "MKD", currencySymbol: "ден", locale: "mk-MK", dateFormat: "dd.MM.yyyy", timezone: "Europe/Skopje", addressFormat: "european", phonePrefix: "+389", phoneFormat: "070 123 456", measurementUnit: "metric", region: "europe", taxIdLabel: "EMBG", legalDocumentTypes: ["lease-residential", "rent-receipt"] },
  { code: "BA", name: "Bosnia & Herzegovina", flag: "🇧🇦", defaultLanguage: "en", supportedLanguages: ["en", "de"], currency: "BAM", currencySymbol: "KM", locale: "bs-BA", dateFormat: "dd.MM.yyyy", timezone: "Europe/Sarajevo", addressFormat: "european", phonePrefix: "+387", phoneFormat: "061 123 456", measurementUnit: "metric", region: "europe", taxIdLabel: "JMBG / JIB", legalDocumentTypes: ["lease-residential", "rent-receipt"] },
  { code: "ME", name: "Montenegro", flag: "🇲🇪", defaultLanguage: "en", supportedLanguages: ["en", "de", "ru"], currency: "EUR", currencySymbol: "€", locale: "sr-ME", dateFormat: "dd.MM.yyyy", timezone: "Europe/Podgorica", addressFormat: "european", phonePrefix: "+382", phoneFormat: "067 123 456", measurementUnit: "metric", region: "europe", taxIdLabel: "JMBG / PIB", legalDocumentTypes: ["lease-residential", "rent-receipt"] },
  { code: "XK", name: "Kosovo", flag: "🇽🇰", defaultLanguage: "en", supportedLanguages: ["en", "de"], currency: "EUR", currencySymbol: "€", locale: "sq-XK", dateFormat: "dd.MM.yyyy", timezone: "Europe/Belgrade", addressFormat: "european", phonePrefix: "+383", phoneFormat: "044 123 456", measurementUnit: "metric", region: "europe", taxIdLabel: "NUI / NF", legalDocumentTypes: ["lease-residential", "rent-receipt"] },
  { code: "MD", name: "Moldova", flag: "🇲🇩", defaultLanguage: "ro", supportedLanguages: ["ro", "ru", "en"], currency: "MDL", currencySymbol: "lei", locale: "ro-MD", dateFormat: "dd.MM.yyyy", timezone: "Europe/Chisinau", addressFormat: "european", phonePrefix: "+373", phoneFormat: "069 123 456", measurementUnit: "metric", region: "europe", taxIdLabel: "IDNP / IDNO", legalDocumentTypes: ["lease-residential", "rent-receipt"] },

  // ─── EXTRA AMERICAS ───
  { code: "BO", name: "Bolivia", flag: "🇧🇴", defaultLanguage: "es", supportedLanguages: ["es", "en"], currency: "BOB", currencySymbol: "Bs", locale: "es-BO", dateFormat: "dd/MM/yyyy", timezone: "America/La_Paz", addressFormat: "european", phonePrefix: "+591", phoneFormat: "7123 4567", measurementUnit: "metric", region: "americas", taxIdLabel: "CI / NIT", legalDocumentTypes: ["lease-residential", "rent-receipt"] },
  { code: "PY", name: "Paraguay", flag: "🇵🇾", defaultLanguage: "es", supportedLanguages: ["es", "en"], currency: "PYG", currencySymbol: "₲", locale: "es-PY", dateFormat: "dd/MM/yyyy", timezone: "America/Asuncion", addressFormat: "european", phonePrefix: "+595", phoneFormat: "0981 123456", measurementUnit: "metric", region: "americas", taxIdLabel: "CI / RUC", legalDocumentTypes: ["lease-residential", "rent-receipt"] },
  { code: "HN", name: "Honduras", flag: "🇭🇳", defaultLanguage: "es", supportedLanguages: ["es", "en"], currency: "HNL", currencySymbol: "L", locale: "es-HN", dateFormat: "dd/MM/yyyy", timezone: "America/Tegucigalpa", addressFormat: "european", phonePrefix: "+504", phoneFormat: "9123-4567", measurementUnit: "metric", region: "americas", taxIdLabel: "DNI / RTN", legalDocumentTypes: ["lease-residential", "rent-receipt"] },
  { code: "SV", name: "El Salvador", flag: "🇸🇻", defaultLanguage: "es", supportedLanguages: ["es", "en"], currency: "USD", currencySymbol: "$", locale: "es-SV", dateFormat: "dd/MM/yyyy", timezone: "America/El_Salvador", addressFormat: "european", phonePrefix: "+503", phoneFormat: "7123-4567", measurementUnit: "metric", region: "americas", taxIdLabel: "DUI / NIT", legalDocumentTypes: ["lease-residential", "rent-receipt"] },
  { code: "NI", name: "Nicaragua", flag: "🇳🇮", defaultLanguage: "es", supportedLanguages: ["es", "en"], currency: "NIO", currencySymbol: "C$", locale: "es-NI", dateFormat: "dd/MM/yyyy", timezone: "America/Managua", addressFormat: "european", phonePrefix: "+505", phoneFormat: "8123-4567", measurementUnit: "metric", region: "americas", taxIdLabel: "Cédula / RUC", legalDocumentTypes: ["lease-residential", "rent-receipt"] },
  { code: "CU", name: "Cuba", flag: "🇨🇺", defaultLanguage: "es", supportedLanguages: ["es"], currency: "CUP", currencySymbol: "$", locale: "es-CU", dateFormat: "dd/MM/yyyy", timezone: "America/Havana", addressFormat: "european", phonePrefix: "+53", phoneFormat: "5 1234567", measurementUnit: "metric", region: "americas", taxIdLabel: "CI", legalDocumentTypes: ["lease-residential", "rent-receipt"] },

  // ─── EXTRA AFRICA ───
  { code: "BF", name: "Burkina Faso", flag: "🇧🇫", defaultLanguage: "fr", supportedLanguages: ["fr", "en"], currency: "XOF", currencySymbol: "CFA", locale: "fr-BF", dateFormat: "dd/MM/yyyy", timezone: "Africa/Ouagadougou", addressFormat: "european", phonePrefix: "+226", phoneFormat: "70 12 34 56", measurementUnit: "metric", region: "africa", taxIdLabel: "IFU / CNIB", legalDocumentTypes: ["lease-residential", "rent-receipt"] },
  { code: "ML", name: "Mali", flag: "🇲🇱", defaultLanguage: "fr", supportedLanguages: ["fr", "en"], currency: "XOF", currencySymbol: "CFA", locale: "fr-ML", dateFormat: "dd/MM/yyyy", timezone: "Africa/Bamako", addressFormat: "european", phonePrefix: "+223", phoneFormat: "70 12 34 56", measurementUnit: "metric", region: "africa", taxIdLabel: "NIF / NINA", legalDocumentTypes: ["lease-residential", "rent-receipt"] },
  { code: "NE", name: "Niger", flag: "🇳🇪", defaultLanguage: "fr", supportedLanguages: ["fr", "en"], currency: "XOF", currencySymbol: "CFA", locale: "fr-NE", dateFormat: "dd/MM/yyyy", timezone: "Africa/Niamey", addressFormat: "european", phonePrefix: "+227", phoneFormat: "90 12 34 56", measurementUnit: "metric", region: "africa", taxIdLabel: "NIF", legalDocumentTypes: ["lease-residential", "rent-receipt"] },
  { code: "BJ", name: "Bénin", flag: "🇧🇯", defaultLanguage: "fr", supportedLanguages: ["fr", "en"], currency: "XOF", currencySymbol: "CFA", locale: "fr-BJ", dateFormat: "dd/MM/yyyy", timezone: "Africa/Porto-Novo", addressFormat: "european", phonePrefix: "+229", phoneFormat: "90 12 34 56", measurementUnit: "metric", region: "africa", taxIdLabel: "IFU / CIP", legalDocumentTypes: ["lease-residential", "rent-receipt"] },
  { code: "TG", name: "Togo", flag: "🇹🇬", defaultLanguage: "fr", supportedLanguages: ["fr", "en"], currency: "XOF", currencySymbol: "CFA", locale: "fr-TG", dateFormat: "dd/MM/yyyy", timezone: "Africa/Lome", addressFormat: "european", phonePrefix: "+228", phoneFormat: "90 12 34 56", measurementUnit: "metric", region: "africa", taxIdLabel: "NIF", legalDocumentTypes: ["lease-residential", "rent-receipt"] },
  { code: "GN", name: "Guinée", flag: "🇬🇳", defaultLanguage: "fr", supportedLanguages: ["fr", "en"], currency: "GNF", currencySymbol: "FG", locale: "fr-GN", dateFormat: "dd/MM/yyyy", timezone: "Africa/Conakry", addressFormat: "european", phonePrefix: "+224", phoneFormat: "622 12 34 56", measurementUnit: "metric", region: "africa", taxIdLabel: "NIF", legalDocumentTypes: ["lease-residential", "rent-receipt"] },
  { code: "TD", name: "Tchad", flag: "🇹🇩", defaultLanguage: "fr", supportedLanguages: ["fr", "ar", "en"], currency: "XAF", currencySymbol: "FCFA", locale: "fr-TD", dateFormat: "dd/MM/yyyy", timezone: "Africa/Ndjamena", addressFormat: "european", phonePrefix: "+235", phoneFormat: "66 12 34 56", measurementUnit: "metric", region: "africa", taxIdLabel: "NIF", legalDocumentTypes: ["lease-residential", "rent-receipt"] },

  // ─── EXTRA ASIA ───
  { code: "UZ", name: "Uzbekistan", flag: "🇺🇿", defaultLanguage: "ru", supportedLanguages: ["ru", "en"], currency: "UZS", currencySymbol: "сўм", locale: "uz-UZ", dateFormat: "dd.MM.yyyy", timezone: "Asia/Tashkent", addressFormat: "european", phonePrefix: "+998", phoneFormat: "90 123 45 67", measurementUnit: "metric", region: "asia_pacific", taxIdLabel: "STIR / Passport", legalDocumentTypes: ["lease-residential", "rent-receipt"] },
  { code: "AZ", name: "Azerbaijan", flag: "🇦🇿", defaultLanguage: "ru", supportedLanguages: ["ru", "en"], currency: "AZN", currencySymbol: "₼", locale: "az-AZ", dateFormat: "dd.MM.yyyy", timezone: "Asia/Baku", addressFormat: "european", phonePrefix: "+994", phoneFormat: "050 123 45 67", measurementUnit: "metric", region: "asia_pacific", taxIdLabel: "VÖEN / FIN", legalDocumentTypes: ["lease-residential", "rent-receipt"] },
  { code: "MN", name: "Mongolia", flag: "🇲🇳", defaultLanguage: "ru", supportedLanguages: ["ru", "en"], currency: "MNT", currencySymbol: "₮", locale: "mn-MN", dateFormat: "yyyy.MM.dd", timezone: "Asia/Ulaanbaatar", addressFormat: "asian", phonePrefix: "+976", phoneFormat: "8012 3456", measurementUnit: "metric", region: "asia_pacific", taxIdLabel: "Регистрийн дугаар", legalDocumentTypes: ["lease-residential", "rent-receipt"] },
  { code: "LA", name: "Laos", flag: "🇱🇦", defaultLanguage: "en", supportedLanguages: ["en", "fr"], currency: "LAK", currencySymbol: "₭", locale: "lo-LA", dateFormat: "dd/MM/yyyy", timezone: "Asia/Vientiane", addressFormat: "asian", phonePrefix: "+856", phoneFormat: "020 1234 5678", measurementUnit: "metric", region: "asia_pacific", taxIdLabel: "TIN", legalDocumentTypes: ["lease-residential", "rent-receipt"] },
  { code: "BN", name: "Brunei", flag: "🇧🇳", defaultLanguage: "ms", supportedLanguages: ["ms", "en"], currency: "BND", currencySymbol: "B$", locale: "ms-BN", dateFormat: "dd/MM/yyyy", timezone: "Asia/Brunei", addressFormat: "anglo", phonePrefix: "+673", phoneFormat: "712 3456", measurementUnit: "metric", region: "asia_pacific", taxIdLabel: "IC", legalDocumentTypes: ["lease-residential", "rent-receipt"] },
  { code: "FJ", name: "Fiji", flag: "🇫🇯", defaultLanguage: "en", supportedLanguages: ["en", "hi"], currency: "FJD", currencySymbol: "FJ$", locale: "en-FJ", dateFormat: "dd/MM/yyyy", timezone: "Pacific/Fiji", addressFormat: "anglo", phonePrefix: "+679", phoneFormat: "912 3456", measurementUnit: "metric", region: "asia_pacific", taxIdLabel: "TIN", legalDocumentTypes: ["lease-residential", "rent-receipt"] },
];

// ─── Merge base + extra ───
const REGISTRY: CountryEntry[] = [...BASE_REGISTRY, ...EXTRA_COUNTRIES];

// ─── Indexed lookups ───

const byCode = new Map<string, CountryEntry>();
for (const c of REGISTRY) byCode.set(c.code, c);

export function getCountryEntry(code: string): CountryEntry | undefined {
  return byCode.get(code);
}

export function getCountryEntryOrDefault(code: string): CountryEntry {
  return byCode.get(code) || byCode.get("FR")!;
}

export function getAllCountryEntries(): CountryEntry[] {
  return REGISTRY;
}

export function getCountriesByRegion(region: CountryEntry["region"]): CountryEntry[] {
  return REGISTRY.filter(c => c.region === region);
}

export function getCountryFlag(code: string): string {
  return byCode.get(code)?.flag || "🏳️";
}

export function getCountryLabel(code: string): string {
  const c = byCode.get(code);
  return c ? `${c.flag} ${c.name}` : code;
}

/**
 * Get localized country name using browser's Intl.DisplayNames API.
 * Falls back to registry name if not available.
 */
let _displayNames: Intl.DisplayNames | null = null;
let _displayNamesLocale: string = "";

function getDisplayNames(locale?: string): Intl.DisplayNames | null {
  const targetLocale = locale || navigator.language || "en";
  if (_displayNames && _displayNamesLocale === targetLocale) return _displayNames;
  try {
    _displayNames = new Intl.DisplayNames([targetLocale], { type: "region" });
    _displayNamesLocale = targetLocale;
    return _displayNames;
  } catch {
    return null;
  }
}

export function getLocalizedCountryName(code: string, locale?: string): string {
  const dn = getDisplayNames(locale);
  if (dn) {
    try {
      const localized = dn.of(code);
      if (localized) return localized;
    } catch { /* fallback */ }
  }
  return byCode.get(code)?.name || code;
}

export function getLocalizedCountryLabel(code: string, locale?: string): string {
  const c = byCode.get(code);
  const name = getLocalizedCountryName(code, locale);
  return c ? `${c.flag} ${name}` : code;
}

// ─── Formatting helpers ───

export function formatCurrency(amount: number, countryCode: string): string {
  const c = getCountryEntryOrDefault(countryCode);
  return new Intl.NumberFormat(c.locale, { style: "currency", currency: c.currency }).format(amount);
}

export function formatDate(date: string | Date, countryCode: string): string {
  const c = getCountryEntryOrDefault(countryCode);
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString(c.locale, { day: "numeric", month: "long", year: "numeric" });
}

export function formatPhone(phone: string, countryCode: string): string {
  const c = getCountryEntryOrDefault(countryCode);
  if (phone.startsWith("+")) return phone;
  return `${c.phonePrefix} ${phone}`;
}

// ─── Validation helpers ───

export function getRequiredDocumentFields(countryCode: string, docType: string): string[] {
  const c = getCountryEntryOrDefault(countryCode);
  const base = ["landlordName", "tenantName", "propertyAddress"];

  if (docType.includes("lease")) {
    base.push("rentAmount", "startDate", "leaseType");
    if (c.code === "AE") base.push("landlordEmiratesId", "tenantEmiratesId");
    if (c.code === "FR") base.push("depositAmount");
  }

  if (docType === "rent-receipt") {
    base.push("rentAmount", "periodStart", "periodEnd", "paymentDate");
  }

  return base;
}

/** Check if all required fields are present and non-empty */
export function validateDocumentData(
  countryCode: string,
  docType: string,
  data: Record<string, unknown>
): { valid: boolean; missingFields: string[] } {
  const required = getRequiredDocumentFields(countryCode, docType);
  const missing = required.filter(key => {
    const val = data[key];
    return val === undefined || val === null || val === "" || val === 0;
  });
  return { valid: missing.length === 0, missingFields: missing };
}

/** Get all supported country codes */
export function getAllCountryCodes(): string[] {
  return REGISTRY.map(c => c.code);
}

/** Country labels map for dropdowns */
export function getCountryLabelsMap(): Record<string, string> {
  const map: Record<string, string> = {};
  for (const c of REGISTRY) map[c.code] = `${c.flag} ${c.name}`;
  return map;
}
