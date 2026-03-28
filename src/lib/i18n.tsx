import React, { createContext, useContext, useState, useCallback, useEffect, useRef, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { interpolate, resolvePlural, trackMissingKey } from "./i18n-utils";
import { landingKeysEn, landingKeysFr } from "./i18n-landing";

// Lazy-loaded locale data is merged at runtime — no more eager imports
// fr + en are always inline; other locales load their heavy packs on demand

export type Locale = "fr" | "en" | "es" | "de" | "it" | "pt" | "nl" | "pl" | "tr" | "ar" | "ja" | "ko" | "zh" | "hi" | "th" | "vi" | "id" | "ms" | "sv" | "da" | "nb" | "fi" | "el" | "cs" | "hu" | "ro" | "hr" | "bg" | "sk" | "he" | "uk";

/* ─── Country → Locale mapping ─── */
export const COUNTRY_LOCALE_MAP: Record<string, Locale> = {
  FR: "fr", BE: "fr", CH: "fr", LU: "fr", MC: "fr", SN: "fr", CI: "fr", MA: "fr", TN: "fr",
  DZ: "fr", CM: "fr", GA: "fr", CG: "fr", CD: "fr", MG: "fr", MU: "fr", LB: "fr",
  ES: "es", MX: "es", AR: "es", CL: "es", CO: "es", PE: "es",
  DE: "de", AT: "de",
  IT: "it",
  PT: "pt", BR: "pt",
  NL: "nl",
  PL: "pl",
  TR: "tr",
  JP: "ja",
  KR: "ko", CN: "zh",
  IN: "hi", TH: "th", VN: "vi", ID: "id", MY: "ms",
  SE: "sv", DK: "da", NO: "nb", FI: "fi",
  GR: "el", CZ: "cs", HU: "hu", RO: "ro", HR: "hr", BG: "bg", SK: "sk",
  IL: "he", UA: "uk",
  US: "en", GB: "en", IE: "en", AU: "en", NZ: "en", CA: "en", SG: "en", ZA: "en",
  AE: "en", SA: "en", QA: "en", BH: "en", KW: "en", OM: "en",
  NG: "en", KE: "en", GH: "en", PH: "en", JO: "en",
};

export const COUNTRY_CURRENCY_MAP: Record<string, string> = {
  // Europe – Eurozone
  FR: "EUR", BE: "EUR", ES: "EUR", DE: "EUR", IT: "EUR", PT: "EUR", LU: "EUR", MC: "EUR", AT: "EUR", IE: "EUR", NL: "EUR", FI: "EUR", GR: "EUR",
  SK: "EUR", SI: "EUR", EE: "EUR", LV: "EUR", LT: "EUR", MT: "EUR", CY: "EUR", HR: "EUR",
  // Europe – Non-euro
  SE: "SEK", DK: "DKK", NO: "NOK", PL: "PLN", CZ: "CZK", HU: "HUF", RO: "RON", BG: "BGN",
  GB: "GBP", CH: "CHF", UA: "UAH", RS: "RSD", IS: "ISK", GE: "GEL", MD: "MDL",
  // Americas
  US: "USD", CA: "CAD", BR: "BRL", MX: "MXN", AR: "ARS", CL: "CLP", CO: "COP", PE: "PEN",
  UY: "UYU", BO: "BOB", PY: "PYG", VE: "VES", DO: "DOP", CR: "CRC", GT: "GTQ", PA: "PAB", JM: "JMD", TT: "TTD",
  // Africa
  MA: "MAD", TN: "TND", DZ: "DZD", SN: "XOF", CI: "XOF", CM: "XAF", ZA: "ZAR", NG: "NGN", KE: "KES", GH: "GHS",
  EG: "EGP", ET: "ETB", TZ: "TZS", UG: "UGX", MU: "MUR", RW: "RWF",
  // Middle East
  AE: "AED", SA: "SAR", QA: "QAR", BH: "BHD", KW: "KWD", OM: "OMR", JO: "JOD", IL: "ILS", LB: "LBP", IQ: "IQD",
  TR: "TRY",
  // Asia-Pacific
  JP: "JPY", CN: "CNY", KR: "KRW", IN: "INR", SG: "SGD", MY: "MYR", TH: "THB", VN: "VND", PH: "PHP", ID: "IDR",
  TW: "TWD", HK: "HKD", BD: "BDT", PK: "PKR", LK: "LKR", NP: "NPR", MM: "MMK", KH: "KHR", KZ: "KZT",
  // Oceania
  AU: "AUD", NZ: "NZD", FJ: "FJD", PG: "PGK",
};

/* ─── Shared onboarding keys (used by all locales) ─── */
const obFr = {
  "ob.welcome": "Bienvenue sur Easy-Locs",
  "ob.select_profile_country": "Sélectionnez votre profil et votre pays",
  "ob.you_are": "Vous êtes…",
  "ob.landlord": "Bailleur / Propriétaire",
  "ob.landlord_desc": "Gérez vos biens, locataires et documents",
  "ob.tenant": "Locataire",
  "ob.tenant_desc": "Accédez à vos quittances et payez votre loyer",
  "ob.your_country": "Votre pays",
  "ob.soon": "Bientôt",
  "ob.owner_info": "Vos informations de propriétaire / bailleur",
  "ob.individual": "Personne physique",
  "ob.company": "Société",
  "ob.full_name": "Nom complet",
  "ob.company_name": "Raison sociale",
  "ob.address": "Adresse",
  "ob.address_placeholder": "Saisissez une adresse…",
  "ob.postal_code": "Code postal",
  "ob.city": "Ville",
  "ob.phone": "Téléphone",
  "ob.email": "Email",
  "ob.tax_id": "N° fiscal (SIRET, NIF…)",
  "ob.describe_property": "Décrivez votre premier bien",
  "ob.property_name": "Nom du bien",
  "ob.surface": "Surface (m²)",
  "ob.rooms": "Pièces",
  "ob.monthly_rent": "Loyer mensuel",
  "ob.charges": "Charges",
  "ob.deposit": "Dépôt de garantie",
  "ob.furnished": "Meublé",
  "ob.rental_mode": "Mode de location",
  "ob.long_term": "Longue durée",
  "ob.long_term_desc": "Baux classiques avec locataires",
  "ob.short_term": "Courte durée",
  "ob.short_term_desc": "Airbnb, Booking, locations saisonnières",
  "ob.mixed": "Mixte",
  "ob.mixed_desc": "Les deux modes combinés",
  "ob.connect_ota": "Connectez vos comptes Airbnb et Booking",
  "ob.airbnb_desc": "Synchronisez vos annonces et réservations",
  "ob.booking_desc": "Importez vos réservations automatiquement",
  "ob.connect": "Connecter",
  "ob.ota_coming_soon": "L'intégration OAuth complète sera disponible prochainement. Vous pouvez passer cette étape.",
  "ob.add_first_tenant": "Ajoutez votre premier locataire",
  "ob.lease_start": "Date début bail",
  "ob.inventory_desc": "Réalisez l'état des lieux d'entrée",
  "ob.inventory_available": "L'état des lieux sera disponible dans votre espace",
  "ob.inventory_details": "Vous pourrez le réaliser pièce par pièce avec photos, relevés de compteurs et signatures.",
  "ob.docs_auto": "Vos documents seront générés automatiquement",
  "ob.doc_lease": "Bail conforme au pays sélectionné",
  "ob.doc_annexes": "Annexes légales obligatoires",
  "ob.doc_inventory": "État des lieux",
  "ob.doc_receipts": "Quittances mensuelles",
  "ob.activation_desc": "Votre espace est prêt ! Voici ce qui sera activé :",
  "ob.act_receipts": "Génération automatique des quittances mensuelles",
  "ob.act_alerts": "Alertes de loyer impayé",
  "ob.act_reminders": "Rappels d'assurance et documents",
  "ob.act_email": "Envoi automatique par email",
  "ob.act_esign": "Signature électronique",
  "ob.finish_title": "Configuration terminée !",
  "ob.finish_desc": "Votre espace est prêt.",
  "common.error": "Erreur",
};

const obEn: Record<string, string> = {
  "ob.welcome": "Welcome to Easy-Locs",
  "ob.select_profile_country": "Select your profile and country",
  "ob.you_are": "You are…",
  "ob.landlord": "Landlord / Owner",
  "ob.landlord_desc": "Manage your properties, tenants and documents",
  "ob.tenant": "Tenant",
  "ob.tenant_desc": "Access your receipts and pay your rent",
  "ob.your_country": "Your country",
  "ob.soon": "Soon",
  "ob.owner_info": "Your owner / landlord information",
  "ob.individual": "Individual",
  "ob.company": "Company",
  "ob.full_name": "Full name",
  "ob.company_name": "Company name",
  "ob.address": "Address",
  "ob.address_placeholder": "Enter an address…",
  "ob.postal_code": "Postal code",
  "ob.city": "City",
  "ob.phone": "Phone",
  "ob.email": "Email",
  "ob.tax_id": "Tax ID (VAT, EIN…)",
  "ob.describe_property": "Describe your first property",
  "ob.property_name": "Property name",
  "ob.surface": "Area (m²)",
  "ob.rooms": "Rooms",
  "ob.monthly_rent": "Monthly rent",
  "ob.charges": "Charges",
  "ob.deposit": "Security deposit",
  "ob.furnished": "Furnished",
  "ob.rental_mode": "Rental mode",
  "ob.long_term": "Long term",
  "ob.long_term_desc": "Standard leases with tenants",
  "ob.short_term": "Short term",
  "ob.short_term_desc": "Airbnb, Booking, seasonal rentals",
  "ob.mixed": "Mixed",
  "ob.mixed_desc": "Both modes combined",
  "ob.connect_ota": "Connect your Airbnb and Booking accounts",
  "ob.airbnb_desc": "Sync your listings and reservations",
  "ob.booking_desc": "Import your reservations automatically",
  "ob.connect": "Connect",
  "ob.ota_coming_soon": "Full OAuth integration coming soon. You can skip this step.",
  "ob.add_first_tenant": "Add your first tenant",
  "ob.lease_start": "Lease start date",
  "ob.inventory_desc": "Perform the entry inventory report",
  "ob.inventory_available": "The inventory report will be available in your workspace",
  "ob.inventory_details": "You can complete it room by room with photos, meter readings and signatures.",
  "ob.docs_auto": "Your documents will be generated automatically",
  "ob.doc_lease": "Lease compliant with selected country",
  "ob.doc_annexes": "Required legal annexes",
  "ob.doc_inventory": "Inventory report",
  "ob.doc_receipts": "Monthly receipts",
  "ob.activation_desc": "Your workspace is ready! Here's what will be activated:",
  "ob.act_receipts": "Automatic monthly receipt generation",
  "ob.act_alerts": "Unpaid rent alerts",
  "ob.act_reminders": "Insurance and document reminders",
  "ob.act_email": "Automatic email sending",
  "ob.act_esign": "Electronic signature",
  "ob.finish_title": "Setup complete!",
  "ob.finish_desc": "Your workspace is ready.",
  "common.error": "Error",
};

const obEs: Record<string, string> = {
  "ob.welcome": "Bienvenido a Easy-Locs",
  "ob.select_profile_country": "Seleccione su perfil y país",
  "ob.you_are": "Usted es…",
  "ob.landlord": "Propietario / Arrendador",
  "ob.landlord_desc": "Gestione sus inmuebles, inquilinos y documentos",
  "ob.tenant": "Inquilino",
  "ob.tenant_desc": "Acceda a sus recibos y pague su alquiler",
  "ob.your_country": "Su país",
  "ob.soon": "Próximamente",
  "ob.owner_info": "Datos del propietario / arrendador",
  "ob.individual": "Persona física",
  "ob.company": "Empresa",
  "ob.full_name": "Nombre completo",
  "ob.company_name": "Razón social",
  "ob.address": "Dirección",
  "ob.address_placeholder": "Introduzca una dirección…",
  "ob.postal_code": "Código postal",
  "ob.city": "Ciudad",
  "ob.phone": "Teléfono",
  "ob.email": "Email",
  "ob.tax_id": "NIF / CIF",
  "ob.describe_property": "Describa su primer inmueble",
  "ob.property_name": "Nombre del inmueble",
  "ob.surface": "Superficie (m²)",
  "ob.rooms": "Habitaciones",
  "ob.monthly_rent": "Alquiler mensual",
  "ob.charges": "Gastos",
  "ob.deposit": "Fianza",
  "ob.furnished": "Amueblado",
  "ob.rental_mode": "Modo de alquiler",
  "ob.long_term": "Larga duración",
  "ob.long_term_desc": "Contratos clásicos con inquilinos",
  "ob.short_term": "Corta duración",
  "ob.short_term_desc": "Airbnb, Booking, alquiler vacacional",
  "ob.mixed": "Mixto",
  "ob.mixed_desc": "Ambos modos combinados",
  "ob.connect_ota": "Conecte sus cuentas de Airbnb y Booking",
  "ob.airbnb_desc": "Sincronice sus anuncios y reservas",
  "ob.booking_desc": "Importe sus reservas automáticamente",
  "ob.connect": "Conectar",
  "ob.ota_coming_soon": "La integración OAuth completa estará disponible pronto. Puede omitir este paso.",
  "ob.add_first_tenant": "Añada su primer inquilino",
  "ob.lease_start": "Inicio del contrato",
  "ob.inventory_desc": "Realice el inventario de entrada",
  "ob.inventory_available": "El inventario estará disponible en su espacio",
  "ob.inventory_details": "Podrá completarlo habitación por habitación con fotos, lecturas de contadores y firmas.",
  "ob.docs_auto": "Sus documentos se generarán automáticamente",
  "ob.doc_lease": "Contrato conforme al país seleccionado",
  "ob.doc_annexes": "Anexos legales obligatorios",
  "ob.doc_inventory": "Inventario",
  "ob.doc_receipts": "Recibos mensuales",
  "ob.activation_desc": "¡Su espacio está listo! Esto es lo que se activará:",
  "ob.act_receipts": "Generación automática de recibos mensuales",
  "ob.act_alerts": "Alertas de alquiler impagado",
  "ob.act_reminders": "Recordatorios de seguros y documentos",
  "ob.act_email": "Envío automático por email",
  "ob.act_esign": "Firma electrónica",
  "ob.finish_title": "¡Configuración completada!",
  "ob.finish_desc": "Su espacio está listo.",
  "common.error": "Error",
};

const obDe: Record<string, string> = {
  "ob.welcome": "Willkommen bei Easy-Locs",
  "ob.select_profile_country": "Wählen Sie Ihr Profil und Land",
  "ob.you_are": "Sie sind…",
  "ob.landlord": "Vermieter / Eigentümer",
  "ob.landlord_desc": "Verwalten Sie Ihre Immobilien, Mieter und Dokumente",
  "ob.tenant": "Mieter",
  "ob.tenant_desc": "Greifen Sie auf Ihre Quittungen zu und zahlen Sie Ihre Miete",
  "ob.your_country": "Ihr Land",
  "ob.soon": "Demnächst",
  "ob.owner_info": "Ihre Vermieter-/Eigentümerdaten",
  "ob.individual": "Privatperson",
  "ob.company": "Unternehmen",
  "ob.full_name": "Vollständiger Name",
  "ob.company_name": "Firmenname",
  "ob.address": "Adresse",
  "ob.address_placeholder": "Adresse eingeben…",
  "ob.postal_code": "Postleitzahl",
  "ob.city": "Stadt",
  "ob.phone": "Telefon",
  "ob.email": "E-Mail",
  "ob.tax_id": "Steuer-Nr. (USt-IdNr.)",
  "ob.describe_property": "Beschreiben Sie Ihre erste Immobilie",
  "ob.property_name": "Immobilienname",
  "ob.surface": "Fläche (m²)",
  "ob.rooms": "Zimmer",
  "ob.monthly_rent": "Monatsmiete",
  "ob.charges": "Nebenkosten",
  "ob.deposit": "Kaution",
  "ob.furnished": "Möbliert",
  "ob.rental_mode": "Vermietungsmodus",
  "ob.long_term": "Langfristig",
  "ob.long_term_desc": "Klassische Mietverträge mit Mietern",
  "ob.short_term": "Kurzfristig",
  "ob.short_term_desc": "Airbnb, Booking, Ferienvermietung",
  "ob.mixed": "Gemischt",
  "ob.mixed_desc": "Beide Modi kombiniert",
  "ob.connect_ota": "Verbinden Sie Ihre Airbnb- und Booking-Konten",
  "ob.airbnb_desc": "Synchronisieren Sie Ihre Inserate und Buchungen",
  "ob.booking_desc": "Importieren Sie Ihre Buchungen automatisch",
  "ob.connect": "Verbinden",
  "ob.ota_coming_soon": "Vollständige OAuth-Integration kommt bald. Sie können diesen Schritt überspringen.",
  "ob.add_first_tenant": "Fügen Sie Ihren ersten Mieter hinzu",
  "ob.lease_start": "Mietbeginn",
  "ob.inventory_desc": "Führen Sie die Einzugs-Bestandsaufnahme durch",
  "ob.inventory_available": "Die Bestandsaufnahme ist in Ihrem Bereich verfügbar",
  "ob.inventory_details": "Sie können sie Raum für Raum mit Fotos, Zählerständen und Unterschriften erstellen.",
  "ob.docs_auto": "Ihre Dokumente werden automatisch erstellt",
  "ob.doc_lease": "Mietvertrag gemäß ausgewähltem Land",
  "ob.doc_annexes": "Erforderliche rechtliche Anhänge",
  "ob.doc_inventory": "Bestandsaufnahme",
  "ob.doc_receipts": "Monatliche Quittungen",
  "ob.activation_desc": "Ihr Bereich ist bereit! Folgendes wird aktiviert:",
  "ob.act_receipts": "Automatische monatliche Quittungserstellung",
  "ob.act_alerts": "Mietrückstandswarnungen",
  "ob.act_reminders": "Versicherungs- und Dokumentenerinnerungen",
  "ob.act_email": "Automatischer E-Mail-Versand",
  "ob.act_esign": "Elektronische Unterschrift",
  "ob.finish_title": "Einrichtung abgeschlossen!",
  "ob.finish_desc": "Ihr Bereich ist bereit.",
  "common.error": "Fehler",
};

const obIt: Record<string, string> = {
  "ob.welcome": "Benvenuto su Easy-Locs",
  "ob.select_profile_country": "Seleziona il tuo profilo e il tuo paese",
  "ob.you_are": "Tu sei…",
  "ob.landlord": "Proprietario / Locatore",
  "ob.landlord_desc": "Gestisci i tuoi immobili, inquilini e documenti",
  "ob.tenant": "Inquilino",
  "ob.tenant_desc": "Accedi alle tue ricevute e paga l'affitto",
  "ob.your_country": "Il tuo paese",
  "ob.soon": "Prossimamente",
  "ob.owner_info": "I tuoi dati di proprietario / locatore",
  "ob.individual": "Persona fisica",
  "ob.company": "Società",
  "ob.full_name": "Nome completo",
  "ob.company_name": "Ragione sociale",
  "ob.address": "Indirizzo",
  "ob.address_placeholder": "Inserisci un indirizzo…",
  "ob.postal_code": "CAP",
  "ob.city": "Città",
  "ob.phone": "Telefono",
  "ob.email": "Email",
  "ob.tax_id": "Codice fiscale / P.IVA",
  "ob.describe_property": "Descrivi il tuo primo immobile",
  "ob.property_name": "Nome dell'immobile",
  "ob.surface": "Superficie (m²)",
  "ob.rooms": "Stanze",
  "ob.monthly_rent": "Affitto mensile",
  "ob.charges": "Spese",
  "ob.deposit": "Deposito cauzionale",
  "ob.furnished": "Arredato",
  "ob.rental_mode": "Modalità di affitto",
  "ob.long_term": "Lungo termine",
  "ob.long_term_desc": "Contratti classici con inquilini",
  "ob.short_term": "Breve termine",
  "ob.short_term_desc": "Airbnb, Booking, affitti stagionali",
  "ob.mixed": "Misto",
  "ob.mixed_desc": "Entrambe le modalità",
  "ob.connect_ota": "Collega i tuoi account Airbnb e Booking",
  "ob.airbnb_desc": "Sincronizza i tuoi annunci e prenotazioni",
  "ob.booking_desc": "Importa le tue prenotazioni automaticamente",
  "ob.connect": "Collega",
  "ob.ota_coming_soon": "L'integrazione OAuth completa sarà disponibile presto. Puoi saltare questo passaggio.",
  "ob.add_first_tenant": "Aggiungi il tuo primo inquilino",
  "ob.lease_start": "Inizio contratto",
  "ob.inventory_desc": "Effettua l'inventario di ingresso",
  "ob.inventory_available": "L'inventario sarà disponibile nel tuo spazio",
  "ob.inventory_details": "Potrai completarlo stanza per stanza con foto, letture contatori e firme.",
  "ob.docs_auto": "I tuoi documenti saranno generati automaticamente",
  "ob.doc_lease": "Contratto conforme al paese selezionato",
  "ob.doc_annexes": "Allegati legali obbligatori",
  "ob.doc_inventory": "Inventario",
  "ob.doc_receipts": "Ricevute mensili",
  "ob.activation_desc": "Il tuo spazio è pronto! Ecco cosa verrà attivato:",
  "ob.act_receipts": "Generazione automatica ricevute mensili",
  "ob.act_alerts": "Avvisi di affitto non pagato",
  "ob.act_reminders": "Promemoria assicurazioni e documenti",
  "ob.act_email": "Invio automatico email",
  "ob.act_esign": "Firma elettronica",
  "ob.finish_title": "Configurazione completata!",
  "ob.finish_desc": "Il tuo spazio è pronto.",
  "common.error": "Errore",
};

const obPt: Record<string, string> = {
  "ob.welcome": "Bem-vindo ao Easy-Locs",
  "ob.select_profile_country": "Selecione o seu perfil e país",
  "ob.you_are": "Você é…",
  "ob.landlord": "Proprietário / Locador",
  "ob.landlord_desc": "Gerencie seus imóveis, inquilinos e documentos",
  "ob.tenant": "Inquilino",
  "ob.tenant_desc": "Acesse seus recibos e pague seu aluguel",
  "ob.your_country": "Seu país",
  "ob.soon": "Em breve",
  "ob.owner_info": "Seus dados de proprietário / locador",
  "ob.individual": "Pessoa física",
  "ob.company": "Empresa",
  "ob.full_name": "Nome completo",
  "ob.company_name": "Razão social",
  "ob.address": "Endereço",
  "ob.address_placeholder": "Digite um endereço…",
  "ob.postal_code": "CEP",
  "ob.city": "Cidade",
  "ob.phone": "Telefone",
  "ob.email": "Email",
  "ob.tax_id": "CPF / CNPJ",
  "ob.describe_property": "Descreva seu primeiro imóvel",
  "ob.property_name": "Nome do imóvel",
  "ob.surface": "Área (m²)",
  "ob.rooms": "Cômodos",
  "ob.monthly_rent": "Aluguel mensal",
  "ob.charges": "Encargos",
  "ob.deposit": "Caução",
  "ob.furnished": "Mobiliado",
  "ob.rental_mode": "Modo de locação",
  "ob.long_term": "Longo prazo",
  "ob.long_term_desc": "Contratos clássicos com inquilinos",
  "ob.short_term": "Curto prazo",
  "ob.short_term_desc": "Airbnb, Booking, aluguel temporário",
  "ob.mixed": "Misto",
  "ob.mixed_desc": "Ambos os modos combinados",
  "ob.connect_ota": "Conecte suas contas Airbnb e Booking",
  "ob.airbnb_desc": "Sincronize seus anúncios e reservas",
  "ob.booking_desc": "Importe suas reservas automaticamente",
  "ob.connect": "Conectar",
  "ob.ota_coming_soon": "A integração OAuth completa estará disponível em breve. Você pode pular esta etapa.",
  "ob.add_first_tenant": "Adicione seu primeiro inquilino",
  "ob.lease_start": "Início do contrato",
  "ob.inventory_desc": "Realize a vistoria de entrada",
  "ob.inventory_available": "A vistoria estará disponível no seu espaço",
  "ob.inventory_details": "Você poderá completá-la cômodo por cômodo com fotos, leituras de medidores e assinaturas.",
  "ob.docs_auto": "Seus documentos serão gerados automaticamente",
  "ob.doc_lease": "Contrato conforme o país selecionado",
  "ob.doc_annexes": "Anexos legais obrigatórios",
  "ob.doc_inventory": "Vistoria",
  "ob.doc_receipts": "Recibos mensais",
  "ob.activation_desc": "Seu espaço está pronto! Veja o que será ativado:",
  "ob.act_receipts": "Geração automática de recibos mensais",
  "ob.act_alerts": "Alertas de aluguel não pago",
  "ob.act_reminders": "Lembretes de seguros e documentos",
  "ob.act_email": "Envio automático por email",
  "ob.act_esign": "Assinatura eletrônica",
  "ob.finish_title": "Configuração concluída!",
  "ob.finish_desc": "Seu espaço está pronto.",
  "common.error": "Erro",
};

/* ─── Page-specific keys — lazy-loaded from separate files ─── */
let pageFr: Record<string, string> = {};
let pageEn: Record<string, string> = {};
let pageEs: Record<string, string> = {};
let pageDe: Record<string, string> = {};
let pageIt: Record<string, string> = {};
let pagePt: Record<string, string> = {};

let pageTranslationsLoaded = false;
let pageTranslationsPromise: Promise<void> | null = null;

async function loadPageTranslations(): Promise<void> {
  if (pageTranslationsLoaded) return;
  if (pageTranslationsPromise) return pageTranslationsPromise;

  pageTranslationsPromise = (async () => {
    try {
      // Page translations consolidated — no separate files needed
      pageTranslationsLoaded = true;
    } catch (e) {
      pageTranslationsLoaded = false;
      console.warn("[i18n] Failed to load page translations", e);
    } finally {
      pageTranslationsPromise = null;
    }
  })();

  return pageTranslationsPromise;
}

// Trigger load immediately (not idle) to prevent raw keys on first paint
if (typeof window !== "undefined") {
  void loadPageTranslations();
}

const translations: Record<Locale, Record<string, string>> = {
  fr: {
    "nav.dashboard": "Tableau de bord", "nav.properties": "Biens", "nav.tenants": "Locataires",
    "nav.documents": "Documents", "nav.payments": "Paiements", "nav.inventory": "États des lieux",
    "nav.receipts": "Quittances", "nav.leases": "Baux", "nav.reminders": "Rappels",
    "nav.vault": "Coffre-fort", "nav.settings": "Paramètres", "nav.seasonal": "Location saisonnière",
    "nav.finances": "Finances", "nav.expenses": "Dépenses", "nav.assistant": "Assistant",
    "nav.buildings": "Immeubles", "nav.candidates": "Candidats", "nav.notices": "Avis d'échéance",
    "nav.dunning": "Relances", "nav.furniture": "Mobilier", "nav.charges": "Régul. charges",
    "nav.fiscal": "Bilan fiscal", "nav.company": "Entreprise", "nav.interventions": "Interventions",
    "nav.tasks": "Tâches", "nav.notes": "Notes", "nav.messages": "Messages",
    "nav.billing": "Abonnement", "nav.logout": "Déconnexion", "nav.channel_manager": "Channel Manager",
    "section.essential": "L'ESSENTIEL", "section.rental": "SAISONNIER", "section.more": "LE PLUS",
    "section.property": "GESTION LOCATIVE", "section.finance": "FINANCE", "section.communication": "COMMUNICATION", "section.services": "SERVICES", "section.company": "ENTREPRISE",
    "section.real_estate": "Immobilier", "section.long_term": "Gestion longue durée",
    "nav.long_term": "Gestion locative", "nav.rent_calls": "Appels de loyer", "nav.real_estate_listings": "Ventes / Annonces",
    "nav.calendar": "Calendrier", "nav.all_documents": "Tous les documents", "nav.notifications": "Notifications",
    "nav.subscription": "Abonnement / Plan",
    "settings.organization": "Organisation", "settings.team": "Équipe", "settings.payment_providers": "Fournisseurs de paiement",
    "nav.local_services": "Activités & Services", "nav.accounting": "Comptabilité", "nav.marketplace": "Marketplace", "nav.collaboration": "Collaboration", "nav.pricing": "Tarification", "nav.concierge": "Conciergerie", "nav.listings": "Annonces",
    "page.communication.filter_seasonal": "Saisonnier", "page.communication.filter_market": "Marketplace", "page.communication.filter_concierge": "Conciergerie", "page.communication.all_properties": "Tous les biens",
     "nav.explore": "Explorer", "nav.more": "Plus", "nav.portfolio": "Portfolio", "nav.rentals": "Locations", "nav.team": "Équipe",
     "nav.dashboard_short": "Accueil", "nav.properties_short": "Biens", "nav.market_short": "Services", "nav.messages_short": "Chat",
    "badge.landlord": "Espace bailleur", "badge.tenant": "Espace locataire",
    "sidebar.workspace": "Espace de travail", "sidebar.select_country": "Sélectionnez un pays pour commencer",
    "dashboard.hello": "Bonjour 👋", "dashboard.summary": "Voici un résumé de votre situation.",
    "dashboard.properties": "Biens", "dashboard.tenants_count": "locataire(s)",
    "dashboard.collected": "Encaissé ce mois", "dashboard.unpaid": "impayés",
    "dashboard.documents": "Documents", "dashboard.generated": "générés",
    "dashboard.vault": "Coffre-fort", "dashboard.files": "fichier(s)",
    "dashboard.quick_actions": "Actions rapides", "dashboard.generate_receipt": "Générer une quittance",
    "dashboard.create_lease": "Créer un bail", "dashboard.view_reminders": "Voir les rappels",
    "dashboard.my_vault": "Mon coffre-fort", "dashboard.ai_question": "Que dois-je faire maintenant ?",
    "dashboard.ai_desc": "Votre assistant analyse votre situation et vous propose des actions.",
    "dashboard.alerts": "Alertes & actions", "dashboard.all_good": "Tout est à jour ! 🎉",
    "dashboard.unpaid_this_month": "loyer(s) impayé(s) ce mois",
    "dashboard.active_reminders": "rappel(s) actif(s)", "dashboard.occupancy": "Taux d'occupation",
    "dashboard.vacant": "vacant(s)", "dashboard.revenue_trend": "Tendance revenus (6 mois)",
    "dashboard.legal_disclaimer": "Cette application fournit une assistance administrative uniquement.",
    "common.save": "Enregistrer", "common.cancel": "Annuler", "common.delete": "Supprimer",
    "common.edit": "Modifier", "common.add": "Ajouter", "common.search": "Rechercher",
    "common.back": "Retour", "common.loading": "Chargement...", "common.no_data": "Aucune donnée",
    "common.paid": "Payé", "common.unpaid": "Impayé", "common.active": "Actif",
    "common.terminated": "Résilié", "common.all": "Tous", "common.month": "Mois", "common.year": "Année",
    "common.continue": "Continuer", "common.skip": "Passer", "common.finish": "Terminer",
    "common.properties": "Biens", "common.property": "Bien",
    "page.dashboard.countries_short": "pays",
    "onboarding.title": "Configuration de votre espace",
    "onboarding.step0": "Plan & Pays", "onboarding.step1": "Profil propriétaire",
    "onboarding.step2": "Ajouter un bien", "onboarding.step3": "Connexion OTA",
    "onboarding.step4": "Ajouter un locataire", "onboarding.step5": "État des lieux",
    "onboarding.step6": "Documents", "onboarding.step7": "Activation",
    "trial.free": "Essai gratuit", "trial.days_left": "jour(s) restant(s)",
    "trial.choose_plan": "Choisir un plan",
    "gating.feature_locked": "Fonctionnalité verrouillée",
    "gating.upgrade_required": "Cette fonctionnalité nécessite le plan {tier}. Passez à un plan supérieur pour y accéder.",
    "gating.upgrade_now": "Voir les plans",
    "ob.ical_url": "URL iCal",
    "ob.ical_placeholder": "Collez l'URL iCal de votre annonce",
    "ob.sync_ical": "Synchroniser",
    "ob.ical_success": "réservations importées",
    "ob.ical_info": "Trouvez l'URL iCal dans les paramètres de votre annonce Airbnb ou Booking.com",
    "reviews.title": "Avis", "reviews.subtitle": "Donnez votre avis sur votre expérience locative",
    "reviews.rating": "Note", "reviews.comment": "Commentaire", "reviews.submit": "Publier l'avis",
    "reviews.no_reviews": "Aucun avis pour le moment", "reviews.your_review": "Votre avis",
    "reviews.edit": "Modifier", "reviews.delete": "Supprimer", "reviews.reply": "Réponse du bailleur",
    "reviews.write_reply": "Répondre", "reviews.updated": "Avis mis à jour", "reviews.submitted": "Avis publié !",
    "reviews.stars": "étoile(s)", "nav.reviews": "Avis", "nav.requests": "Demandes",
    "nav.reporting": "Reporting", "nav.seller_hub": "Hub Vendeur", "nav.deal_analytics": "Analyse deals", "nav.live_tracking": "Suivi en direct", "nav.ai_assistant": "Assistant IA",
    "nav.property_mgmt": "Gestion", "nav.sales": "Ventes / Annonces", "nav.deals": "Deals", "nav.tracking": "Suivi", "nav.plan": "Abonnement",
    "page.reporting.title": "Tableau de bord financier", "page.reporting.subtitle": "Vue consolidée revenus, dépenses et résultat net",
    "page.reporting.expected_revenue": "Revenus attendus", "page.reporting.collected": "Encaissé", "page.reporting.unpaid": "Impayés",
    "page.reporting.expenses": "Dépenses", "page.reporting.net_income": "Résultat net", "page.reporting.collection_rate": "Taux encaissement",
    "page.reporting.overview": "Vue d'ensemble", "page.reporting.by_property": "Par bien", "page.reporting.expenses_tab": "Dépenses",
    "page.reporting.monthly_evolution": "Évolution mensuelle", "page.reporting.no_properties": "Aucun bien pour cette période",
    "page.reporting.expense_breakdown": "Répartition", "page.reporting.expense_detail": "Détail",
    "page.reporting.no_expenses": "Aucune dépense enregistrée pour",
    "page.reporting.property": "Bien", "page.reporting.country": "Pays", "page.reporting.revenue": "Revenus",
    ...obFr, ...pageFr,
    "geo_enable_location": "Activer la géolocalisation",
    "geo_enable_location_desc": "Autorisez l'accès pour des résultats proches de vous",
    "geo_enable_btn": "Activer",
    "landing.remote.svc.activities": "Activités & excursions",
    "landing.remote.svc.concierge": "Services de conciergerie",
    "landing.remote.svc.property": "Gestion immobilière",
  },
  en: {
    "nav.dashboard": "Dashboard", "nav.properties": "Properties", "nav.tenants": "Tenants",
    "nav.documents": "Documents", "nav.payments": "Payments", "nav.inventory": "Inventory Reports",
    "nav.receipts": "Receipts", "nav.leases": "Leases", "nav.reminders": "Reminders",
    "nav.vault": "Vault", "nav.settings": "Settings", "nav.seasonal": "Seasonal Rentals",
    "nav.finances": "Finances", "nav.expenses": "Expenses", "nav.assistant": "Assistant",
    "nav.buildings": "Buildings", "nav.candidates": "Candidates", "nav.notices": "Payment Notices",
    "nav.dunning": "Dunning", "nav.furniture": "Furniture", "nav.charges": "Charges Regularization",
    "nav.fiscal": "Tax Report", "nav.company": "Company", "nav.interventions": "Interventions",
    "nav.tasks": "Tasks", "nav.notes": "Notes", "nav.messages": "Messages",
    "nav.billing": "Billing", "nav.logout": "Log out", "nav.channel_manager": "Channel Manager",
    "section.essential": "ESSENTIALS", "section.rental": "SEASONAL", "section.more": "MORE",
    "section.property": "PROPERTY MANAGEMENT", "section.finance": "FINANCE", "section.communication": "COMMUNICATION", "section.services": "SERVICES", "section.company": "COMPANY",
    "section.real_estate": "Real Estate", "section.long_term": "Long-term Rental",
    "nav.long_term": "Long-term Rental", "nav.rent_calls": "Rent Calls", "nav.real_estate_listings": "Sales / Listings",
    "nav.calendar": "Calendar", "nav.all_documents": "All Documents", "nav.notifications": "Notifications",
    "nav.subscription": "Subscription / Plan",
    "settings.organization": "Organization", "settings.team": "Team", "settings.payment_providers": "Payment Providers",
    "nav.local_services": "Activities & Services", "nav.accounting": "Accounting", "nav.marketplace": "Marketplace", "nav.collaboration": "Collaboration", "nav.pricing": "Pricing", "nav.concierge": "Concierge", "nav.listings": "Listings",
    "nav.property_mgmt": "Property Management", "nav.sales": "Sales / Listings", "nav.deals": "Deals", "nav.tracking": "Tracking", "nav.plan": "Plan",
    "page.communication.filter_seasonal": "Seasonal", "page.communication.filter_market": "Marketplace", "page.communication.filter_concierge": "Concierge", "page.communication.all_properties": "All properties",
     "nav.explore": "Explore", "nav.more": "More", "nav.portfolio": "Portfolio", "nav.rentals": "Rentals", "nav.team": "Team",
     "nav.dashboard_short": "Home", "nav.properties_short": "Props", "nav.market_short": "Market", "nav.messages_short": "Chat",
    "badge.landlord": "Landlord area", "badge.tenant": "Tenant area",
    "sidebar.workspace": "Workspace", "sidebar.select_country": "Select a country to start",
    "dashboard.hello": "Hello 👋", "dashboard.summary": "Here's an overview of your situation.",
    "dashboard.properties": "Properties", "dashboard.tenants_count": "tenant(s)",
    "dashboard.collected": "Collected this month", "dashboard.unpaid": "unpaid",
    "dashboard.documents": "Documents", "dashboard.generated": "generated",
    "dashboard.vault": "Vault", "dashboard.files": "file(s)",
    "dashboard.quick_actions": "Quick Actions", "dashboard.generate_receipt": "Generate receipt",
    "dashboard.create_lease": "Create lease", "dashboard.view_reminders": "View reminders",
    "dashboard.my_vault": "My vault", "dashboard.ai_question": "What should I do now?",
    "dashboard.ai_desc": "Your assistant analyzes your situation and suggests actions.",
    "dashboard.alerts": "Alerts & Actions", "dashboard.all_good": "Everything is up to date! 🎉",
    "dashboard.unpaid_this_month": "unpaid rent(s) this month",
    "dashboard.active_reminders": "active reminder(s)", "dashboard.occupancy": "Occupancy rate",
    "dashboard.vacant": "vacant", "dashboard.revenue_trend": "Revenue trend (6 months)",
    "dashboard.legal_disclaimer": "This application provides administrative assistance only.",
    "common.save": "Save", "common.cancel": "Cancel", "common.delete": "Delete",
    "common.edit": "Edit", "common.add": "Add", "common.search": "Search",
    "common.back": "Back", "common.loading": "Loading...", "common.no_data": "No data",
    "common.paid": "Paid", "common.unpaid": "Unpaid", "common.active": "Active",
    "common.terminated": "Terminated", "common.all": "All", "common.month": "Month", "common.year": "Year",
    "common.continue": "Continue", "common.skip": "Skip", "common.finish": "Finish",
    "common.properties": "Properties", "common.property": "Property",
    "page.dashboard.countries_short": "countries",
    "onboarding.title": "Setting up your workspace",
    "onboarding.step0": "Plan & Country", "onboarding.step1": "Owner Profile",
    "onboarding.step2": "Add Property", "onboarding.step3": "OTA Connection",
    "onboarding.step4": "Add Tenant", "onboarding.step5": "Inventory Report",
    "onboarding.step6": "Documents", "onboarding.step7": "Activation",
    "trial.free": "Free trial", "trial.days_left": "day(s) left",
    "trial.choose_plan": "Choose a plan",
    "gating.feature_locked": "Feature locked",
    "gating.upgrade_required": "This feature requires the {tier} plan. Upgrade to access it.",
    "gating.upgrade_now": "View plans",
    "ob.ical_url": "iCal URL",
    "ob.ical_placeholder": "Paste your listing's iCal URL",
    "ob.sync_ical": "Sync",
    "ob.ical_success": "reservations imported",
    "ob.ical_info": "Find the iCal URL in your Airbnb or Booking.com listing settings",
    "reviews.title": "Reviews", "reviews.subtitle": "Share your rental experience",
    "reviews.rating": "Rating", "reviews.comment": "Comment", "reviews.submit": "Submit review",
    "reviews.no_reviews": "No reviews yet", "reviews.your_review": "Your review",
    "reviews.edit": "Edit", "reviews.delete": "Delete", "reviews.reply": "Landlord reply",
    "reviews.write_reply": "Reply", "reviews.updated": "Review updated", "reviews.submitted": "Review submitted!",
    "landing.remote.svc.activities": "Activities & tours",
    "landing.remote.svc.concierge": "Concierge services",
    "landing.remote.svc.property": "Property management",
    "reviews.stars": "star(s)", "nav.reviews": "Reviews", "nav.requests": "Requests",
    "nav.reporting": "Reporting", "nav.seller_hub": "Seller Hub", "nav.deal_analytics": "Deal Analytics", "nav.live_tracking": "Live Tracking", "nav.ai_assistant": "AI Assistant",
    "page.reporting.title": "Financial Dashboard", "page.reporting.subtitle": "Consolidated view of revenue, expenses and net income",
    "page.reporting.expected_revenue": "Expected Revenue", "page.reporting.collected": "Collected", "page.reporting.unpaid": "Unpaid",
    "page.reporting.expenses": "Expenses", "page.reporting.net_income": "Net Income", "page.reporting.collection_rate": "Collection Rate",
    "page.reporting.overview": "Overview", "page.reporting.by_property": "By Property", "page.reporting.expenses_tab": "Expenses",
    "page.reporting.monthly_evolution": "Monthly Evolution", "page.reporting.no_properties": "No properties for this period",
    "page.reporting.expense_breakdown": "Breakdown", "page.reporting.expense_detail": "Detail",
    "page.reporting.no_expenses": "No expenses recorded for",
    "page.reporting.property": "Property", "page.reporting.country": "Country", "page.reporting.revenue": "Revenue",
    ...obEn, ...pageEn,
    "geo_enable_location": "Enable location",
    "geo_enable_location_desc": "Allow access for nearby results",
    "geo_enable_btn": "Enable",
  },
  es: {
    "nav.dashboard": "Panel", "nav.properties": "Inmuebles", "nav.tenants": "Inquilinos",
    "nav.documents": "Documentos", "nav.payments": "Pagos", "nav.inventory": "Inventarios",
    "nav.receipts": "Recibos", "nav.leases": "Contratos", "nav.reminders": "Recordatorios",
    "nav.vault": "Bóveda", "nav.settings": "Configuración", "nav.seasonal": "Alquiler vacacional",
    "nav.finances": "Finanzas", "nav.expenses": "Gastos", "nav.assistant": "Asistente",
    "nav.buildings": "Edificios", "nav.candidates": "Candidatos", "nav.notices": "Avisos de pago",
    "nav.dunning": "Reclamaciones", "nav.furniture": "Mobiliario", "nav.charges": "Regularización",
    "nav.fiscal": "Informe fiscal", "nav.company": "Empresa", "nav.interventions": "Intervenciones",
    "nav.tasks": "Tareas", "nav.notes": "Notas", "nav.messages": "Mensajes",
     "nav.billing": "Suscripción", "nav.logout": "Cerrar sesión",
     "nav.explore": "Explorar", "nav.more": "Más",
     "section.essential": "ESENCIAL", "section.rental": "ALQUILER", "section.more": "MÁS",
    "badge.landlord": "Área propietario", "badge.tenant": "Área inquilino",
    "dashboard.hello": "Hola 👋", "dashboard.summary": "Resumen de tu situación.",
    "dashboard.properties": "Inmuebles", "dashboard.tenants_count": "inquilino(s)",
    "dashboard.collected": "Cobrado este mes", "dashboard.unpaid": "impagados",
    "dashboard.documents": "Documentos", "dashboard.generated": "generados",
    "dashboard.vault": "Bóveda", "dashboard.files": "archivo(s)",
    "dashboard.quick_actions": "Acciones rápidas", "dashboard.generate_receipt": "Generar recibo",
    "dashboard.create_lease": "Crear contrato", "dashboard.view_reminders": "Ver recordatorios",
    "dashboard.my_vault": "Mi bóveda", "dashboard.ai_question": "¿Qué debo hacer ahora?",
    "dashboard.ai_desc": "Tu asistente analiza tu situación y propone acciones.",
    "dashboard.alerts": "Alertas y acciones", "dashboard.all_good": "¡Todo está al día! 🎉",
    "dashboard.unpaid_this_month": "alquiler(es) impagado(s) este mes",
    "dashboard.active_reminders": "recordatorio(s) activo(s)", "dashboard.occupancy": "Tasa de ocupación",
    "dashboard.vacant": "vacante(s)", "dashboard.revenue_trend": "Tendencia ingresos (6 meses)",
    "dashboard.legal_disclaimer": "Esta aplicación proporciona asistencia administrativa únicamente.",
    "common.save": "Guardar", "common.cancel": "Cancelar", "common.delete": "Eliminar",
    "common.edit": "Editar", "common.add": "Añadir", "common.search": "Buscar",
    "common.back": "Volver", "common.loading": "Cargando...", "common.no_data": "Sin datos",
    "common.paid": "Pagado", "common.unpaid": "Impago", "common.active": "Activo",
    "common.terminated": "Rescindido", "common.all": "Todos", "common.month": "Mes", "common.year": "Año",
    "common.continue": "Continuar", "common.skip": "Omitir", "common.finish": "Finalizar",
    "onboarding.title": "Configuración de tu espacio",
    "onboarding.step0": "Plan y País", "onboarding.step1": "Perfil propietario",
    "onboarding.step2": "Añadir inmueble", "onboarding.step3": "Conexión OTA",
    "onboarding.step4": "Añadir inquilino", "onboarding.step5": "Inventario",
    "onboarding.step6": "Documentos", "onboarding.step7": "Activación",
    "trial.free": "Prueba gratuita", "trial.days_left": "día(s) restante(s)",
    "trial.choose_plan": "Elegir un plan",
    "gating.feature_locked": "Función bloqueada",
    "gating.upgrade_required": "Esta función requiere el plan {tier}. Actualice para acceder.",
    "gating.upgrade_now": "Ver planes",
    "ob.ical_url": "URL iCal",
    "ob.ical_placeholder": "Pegue la URL iCal de su anuncio",
    "ob.sync_ical": "Sincronizar",
    "ob.ical_success": "reservas importadas",
    "ob.ical_info": "Encuentre la URL iCal en la configuración de su anuncio de Airbnb o Booking.com",
    "reviews.title": "Reseñas", "reviews.subtitle": "Comparte tu experiencia de alquiler",
    "reviews.rating": "Puntuación", "reviews.comment": "Comentario", "reviews.submit": "Enviar reseña",
    "reviews.no_reviews": "Sin reseñas aún", "reviews.your_review": "Tu reseña",
    "reviews.edit": "Editar", "reviews.delete": "Eliminar", "reviews.reply": "Respuesta del propietario",
    "reviews.write_reply": "Responder", "reviews.updated": "Reseña actualizada", "reviews.submitted": "¡Reseña enviada!",
    "reviews.stars": "estrella(s)", "nav.reviews": "Reseñas", "nav.requests": "Solicitudes",
    ...obEs, ...pageEs,
  },
  de: {
    "nav.dashboard": "Dashboard", "nav.properties": "Immobilien", "nav.tenants": "Mieter",
    "nav.documents": "Dokumente", "nav.payments": "Zahlungen", "nav.inventory": "Bestandsaufnahmen",
    "nav.receipts": "Quittungen", "nav.leases": "Mietverträge", "nav.reminders": "Erinnerungen",
    "nav.vault": "Tresor", "nav.settings": "Einstellungen", "nav.seasonal": "Ferienvermietung",
    "nav.finances": "Finanzen", "nav.expenses": "Ausgaben", "nav.assistant": "Assistent",
    "nav.buildings": "Gebäude", "nav.candidates": "Bewerber", "nav.notices": "Zahlungshinweise",
    "nav.dunning": "Mahnungen", "nav.furniture": "Möbel", "nav.charges": "Nebenkostenabrechnung",
    "nav.fiscal": "Steuerbericht", "nav.company": "Unternehmen", "nav.interventions": "Eingriffe",
    "nav.tasks": "Aufgaben", "nav.notes": "Notizen", "nav.messages": "Nachrichten",
     "nav.billing": "Abonnement", "nav.logout": "Abmelden",
     "nav.explore": "Entdecken", "nav.more": "Mehr",
     "section.essential": "WESENTLICH", "section.rental": "VERMIETUNG", "section.more": "MEHR",
    "badge.landlord": "Vermieterbereich", "badge.tenant": "Mieterbereich",
    "dashboard.hello": "Hallo 👋", "dashboard.summary": "Hier ist eine Übersicht Ihrer Situation.",
    "dashboard.properties": "Immobilien", "dashboard.tenants_count": "Mieter",
    "dashboard.collected": "Diesen Monat eingezogen", "dashboard.unpaid": "unbezahlt",
    "dashboard.documents": "Dokumente", "dashboard.generated": "erstellt",
    "dashboard.vault": "Tresor", "dashboard.files": "Datei(en)",
    "dashboard.quick_actions": "Schnellaktionen", "dashboard.generate_receipt": "Quittung erstellen",
    "dashboard.create_lease": "Mietvertrag erstellen", "dashboard.view_reminders": "Erinnerungen anzeigen",
    "dashboard.my_vault": "Mein Tresor", "dashboard.ai_question": "Was soll ich jetzt tun?",
    "dashboard.ai_desc": "Ihr Assistent analysiert Ihre Situation und schlägt Aktionen vor.",
    "dashboard.alerts": "Alarme & Aktionen", "dashboard.all_good": "Alles auf dem neuesten Stand! 🎉",
    "dashboard.unpaid_this_month": "unbezahlte Miete(n) diesen Monat",
    "dashboard.active_reminders": "aktive Erinnerung(en)", "dashboard.occupancy": "Auslastung",
    "dashboard.vacant": "leer", "dashboard.revenue_trend": "Umsatztrend (6 Monate)",
    "dashboard.legal_disclaimer": "Diese Anwendung bietet nur administrative Unterstützung.",
    "common.save": "Speichern", "common.cancel": "Abbrechen", "common.delete": "Löschen",
    "common.edit": "Bearbeiten", "common.add": "Hinzufügen", "common.search": "Suchen",
    "common.back": "Zurück", "common.loading": "Laden...", "common.no_data": "Keine Daten",
    "common.paid": "Bezahlt", "common.unpaid": "Unbezahlt", "common.active": "Aktiv",
    "common.terminated": "Beendet", "common.all": "Alle", "common.month": "Monat", "common.year": "Jahr",
    "common.continue": "Weiter", "common.skip": "Überspringen", "common.finish": "Abschließen",
    "onboarding.title": "Einrichtung Ihres Arbeitsbereichs",
    "onboarding.step0": "Plan & Land", "onboarding.step1": "Eigentümerprofil",
    "onboarding.step2": "Immobilie hinzufügen", "onboarding.step3": "OTA-Verbindung",
    "onboarding.step4": "Mieter hinzufügen", "onboarding.step5": "Bestandsaufnahme",
    "onboarding.step6": "Dokumente", "onboarding.step7": "Aktivierung",
    "trial.free": "Kostenlose Testversion", "trial.days_left": "Tag(e) verbleibend",
    "trial.choose_plan": "Plan wählen",
    "gating.feature_locked": "Funktion gesperrt",
    "gating.upgrade_required": "Diese Funktion erfordert den {tier}-Plan. Upgrade für Zugang.",
    "gating.upgrade_now": "Pläne ansehen",
    "ob.ical_url": "iCal-URL",
    "ob.ical_placeholder": "iCal-URL Ihres Inserats einfügen",
    "ob.sync_ical": "Synchronisieren",
    "ob.ical_success": "Reservierungen importiert",
    "ob.ical_info": "Die iCal-URL finden Sie in den Einstellungen Ihres Airbnb- oder Booking.com-Inserats",
    "reviews.title": "Bewertungen", "reviews.subtitle": "Teilen Sie Ihre Mieterfahrung",
    "reviews.rating": "Bewertung", "reviews.comment": "Kommentar", "reviews.submit": "Bewertung abgeben",
    "reviews.no_reviews": "Noch keine Bewertungen", "reviews.your_review": "Ihre Bewertung",
    "reviews.edit": "Bearbeiten", "reviews.delete": "Löschen", "reviews.reply": "Antwort des Vermieters",
    "reviews.write_reply": "Antworten", "reviews.updated": "Bewertung aktualisiert", "reviews.submitted": "Bewertung abgegeben!",
    "reviews.stars": "Stern(e)", "nav.reviews": "Bewertungen", "nav.requests": "Anfragen",
    ...obDe, ...pageDe,
  },
  it: {
    "nav.dashboard": "Cruscotto", "nav.properties": "Immobili", "nav.tenants": "Inquilini",
    "nav.documents": "Documenti", "nav.payments": "Pagamenti", "nav.inventory": "Inventari",
    "nav.receipts": "Ricevute", "nav.leases": "Contratti", "nav.reminders": "Promemoria",
    "nav.vault": "Cassaforte", "nav.settings": "Impostazioni", "nav.seasonal": "Affitto stagionale",
    "nav.finances": "Finanze", "nav.expenses": "Spese", "nav.assistant": "Assistente",
    "nav.buildings": "Edifici", "nav.candidates": "Candidati", "nav.notices": "Avvisi di pagamento",
    "nav.dunning": "Solleciti", "nav.furniture": "Arredamento", "nav.charges": "Regolarizzazione",
    "nav.fiscal": "Report fiscale", "nav.company": "Azienda", "nav.interventions": "Interventi",
    "nav.tasks": "Attività", "nav.notes": "Note", "nav.messages": "Messaggi",
     "nav.billing": "Abbonamento", "nav.logout": "Esci",
     "nav.explore": "Esplora", "nav.more": "Altro",
     "section.essential": "ESSENZIALE", "section.rental": "AFFITTO", "section.more": "ALTRO",
    "badge.landlord": "Area proprietario", "badge.tenant": "Area inquilino",
    "dashboard.hello": "Ciao 👋", "dashboard.summary": "Ecco un riepilogo della tua situazione.",
    "dashboard.properties": "Immobili", "dashboard.tenants_count": "inquilino/i",
    "dashboard.collected": "Incassato questo mese", "dashboard.unpaid": "non pagati",
    "dashboard.documents": "Documenti", "dashboard.generated": "generati",
    "dashboard.vault": "Cassaforte", "dashboard.files": "file",
    "dashboard.quick_actions": "Azioni rapide", "dashboard.generate_receipt": "Genera ricevuta",
    "dashboard.create_lease": "Crea contratto", "dashboard.view_reminders": "Vedi promemoria",
    "dashboard.my_vault": "La mia cassaforte", "dashboard.ai_question": "Cosa devo fare adesso?",
    "dashboard.ai_desc": "Il tuo assistente analizza la tua situazione e propone azioni.",
    "dashboard.alerts": "Avvisi e azioni", "dashboard.all_good": "Tutto aggiornato! 🎉",
    "dashboard.unpaid_this_month": "affitto/i non pagato/i questo mese",
    "dashboard.active_reminders": "promemoria attivo/i", "dashboard.occupancy": "Tasso di occupazione",
    "dashboard.vacant": "vacante/i", "dashboard.revenue_trend": "Tendenza ricavi (6 mesi)",
    "dashboard.legal_disclaimer": "Questa applicazione fornisce solo assistenza amministrativa.",
    "common.save": "Salva", "common.cancel": "Annulla", "common.delete": "Elimina",
    "common.edit": "Modifica", "common.add": "Aggiungi", "common.search": "Cerca",
    "common.back": "Indietro", "common.loading": "Caricamento...", "common.no_data": "Nessun dato",
    "common.paid": "Pagato", "common.unpaid": "Non pagato", "common.active": "Attivo",
    "common.terminated": "Terminato", "common.all": "Tutti", "common.month": "Mese", "common.year": "Anno",
    "common.continue": "Continua", "common.skip": "Salta", "common.finish": "Fine",
    "onboarding.title": "Configurazione dello spazio",
    "onboarding.step0": "Piano e Paese", "onboarding.step1": "Profilo proprietario",
    "onboarding.step2": "Aggiungi immobile", "onboarding.step3": "Connessione OTA",
    "onboarding.step4": "Aggiungi inquilino", "onboarding.step5": "Inventario",
    "onboarding.step6": "Documenti", "onboarding.step7": "Attivazione",
    "trial.free": "Prova gratuita", "trial.days_left": "giorno/i rimanente/i",
    "trial.choose_plan": "Scegli un piano",
    "gating.feature_locked": "Funzione bloccata",
    "gating.upgrade_required": "Questa funzione richiede il piano {tier}. Aggiorna per accedere.",
    "gating.upgrade_now": "Vedi i piani",
    "ob.ical_url": "URL iCal",
    "ob.ical_placeholder": "Incolla l'URL iCal del tuo annuncio",
    "ob.sync_ical": "Sincronizza",
    "ob.ical_success": "prenotazioni importate",
    "ob.ical_info": "Trova l'URL iCal nelle impostazioni del tuo annuncio Airbnb o Booking.com",
    "reviews.title": "Recensioni", "reviews.subtitle": "Condividi la tua esperienza di affitto",
    "reviews.rating": "Valutazione", "reviews.comment": "Commento", "reviews.submit": "Invia recensione",
    "reviews.no_reviews": "Nessuna recensione ancora", "reviews.your_review": "La tua recensione",
    "reviews.edit": "Modifica", "reviews.delete": "Elimina", "reviews.reply": "Risposta del proprietario",
    "reviews.write_reply": "Rispondi", "reviews.updated": "Recensione aggiornata", "reviews.submitted": "Recensione inviata!",
    "reviews.stars": "stella/e", "nav.reviews": "Recensioni", "nav.requests": "Richieste",
    ...obIt, ...pageIt,
  },
  pt: {
    "nav.dashboard": "Painel", "nav.properties": "Imóveis", "nav.tenants": "Inquilinos",
    "nav.documents": "Documentos", "nav.payments": "Pagamentos", "nav.inventory": "Inventários",
    "nav.receipts": "Recibos", "nav.leases": "Contratos", "nav.reminders": "Lembretes",
    "nav.vault": "Cofre", "nav.settings": "Configurações", "nav.seasonal": "Aluguel temporário",
    "nav.finances": "Finanças", "nav.expenses": "Despesas", "nav.assistant": "Assistente",
    "nav.buildings": "Edifícios", "nav.candidates": "Candidatos", "nav.notices": "Avisos de pagamento",
    "nav.dunning": "Cobranças", "nav.furniture": "Mobiliário", "nav.charges": "Regularização",
    "nav.fiscal": "Relatório fiscal", "nav.company": "Empresa", "nav.interventions": "Intervenções",
    "nav.tasks": "Tarefas", "nav.notes": "Notas", "nav.messages": "Mensagens",
     "nav.billing": "Assinatura", "nav.logout": "Sair",
     "nav.explore": "Explorar", "nav.more": "Mais",
     "section.essential": "ESSENCIAL", "section.rental": "ALUGUEL", "section.more": "MAIS",
    "badge.landlord": "Área do proprietário", "badge.tenant": "Área do inquilino",
    "dashboard.hello": "Olá 👋", "dashboard.summary": "Aqui está um resumo da sua situação.",
    "dashboard.properties": "Imóveis", "dashboard.tenants_count": "inquilino(s)",
    "dashboard.collected": "Recebido este mês", "dashboard.unpaid": "não pagos",
    "dashboard.documents": "Documentos", "dashboard.generated": "gerados",
    "dashboard.vault": "Cofre", "dashboard.files": "arquivo(s)",
    "dashboard.quick_actions": "Ações rápidas", "dashboard.generate_receipt": "Gerar recibo",
    "dashboard.create_lease": "Criar contrato", "dashboard.view_reminders": "Ver lembretes",
    "dashboard.my_vault": "Meu cofre", "dashboard.ai_question": "O que devo fazer agora?",
    "dashboard.ai_desc": "Seu assistente analisa sua situação e sugere ações.",
    "dashboard.alerts": "Alertas e ações", "dashboard.all_good": "Tudo atualizado! 🎉",
    "dashboard.unpaid_this_month": "aluguel(is) não pago(s) este mês",
    "dashboard.active_reminders": "lembrete(s) ativo(s)", "dashboard.occupancy": "Taxa de ocupação",
    "dashboard.vacant": "vago(s)", "dashboard.revenue_trend": "Tendência receita (6 meses)",
    "dashboard.legal_disclaimer": "Este aplicativo fornece apenas assistência administrativa.",
    "common.save": "Salvar", "common.cancel": "Cancelar", "common.delete": "Excluir",
    "common.edit": "Editar", "common.add": "Adicionar", "common.search": "Pesquisar",
    "common.back": "Voltar", "common.loading": "Carregando...", "common.no_data": "Sem dados",
    "common.paid": "Pago", "common.unpaid": "Não pago", "common.active": "Ativo",
    "common.terminated": "Encerrado", "common.all": "Todos", "common.month": "Mês", "common.year": "Ano",
    "common.continue": "Continuar", "common.skip": "Pular", "common.finish": "Finalizar",
    "onboarding.title": "Configuração do espaço",
    "onboarding.step0": "Plano e País", "onboarding.step1": "Perfil do proprietário",
    "onboarding.step2": "Adicionar imóvel", "onboarding.step3": "Conexão OTA",
    "onboarding.step4": "Adicionar inquilino", "onboarding.step5": "Inventário",
    "onboarding.step6": "Documentos", "onboarding.step7": "Ativação",
    "trial.free": "Teste gratuito", "trial.days_left": "dia(s) restante(s)",
    "trial.choose_plan": "Escolher um plano",
    "gating.feature_locked": "Recurso bloqueado",
    "gating.upgrade_required": "Este recurso requer o plano {tier}. Atualize para acessar.",
    "gating.upgrade_now": "Ver planos",
    "ob.ical_url": "URL iCal",
    "ob.ical_placeholder": "Cole a URL iCal do seu anúncio",
    "ob.sync_ical": "Sincronizar",
    "ob.ical_success": "reservas importadas",
    "ob.ical_info": "Encontre a URL iCal nas configurações do seu anúncio Airbnb ou Booking.com",
    "reviews.title": "Avaliações", "reviews.subtitle": "Compartilhe sua experiência de aluguel",
    "reviews.rating": "Nota", "reviews.comment": "Comentário", "reviews.submit": "Enviar avaliação",
    "reviews.no_reviews": "Nenhuma avaliação ainda", "reviews.your_review": "Sua avaliação",
    "reviews.edit": "Editar", "reviews.delete": "Excluir", "reviews.reply": "Resposta do proprietário",
    "reviews.write_reply": "Responder", "reviews.updated": "Avaliação atualizada", "reviews.submitted": "Avaliação enviada!",
    "reviews.stars": "estrela(s)", "nav.reviews": "Avaliações", "nav.requests": "Pedidos",
    ...obPt, ...pagePt,
  },
  nl: {
    "nav.dashboard": "Dashboard", "nav.properties": "Vastgoed", "nav.tenants": "Huurders",
    "nav.documents": "Documenten", "nav.payments": "Betalingen", "nav.inventory": "Inventarissen",
    "nav.receipts": "Kwitanties", "nav.leases": "Huurcontracten", "nav.reminders": "Herinneringen",
    "nav.vault": "Kluis", "nav.settings": "Instellingen", "nav.seasonal": "Vakantieverhuur",
    "nav.finances": "Financiën", "nav.expenses": "Kosten", "nav.assistant": "Assistent",
    "nav.buildings": "Gebouwen", "nav.candidates": "Kandidaten", "nav.notices": "Betalingsherinneringen",
    "nav.dunning": "Aanmaningen", "nav.furniture": "Meubilair", "nav.charges": "Afrekening",
    "nav.fiscal": "Belastingrapport", "nav.company": "Bedrijf", "nav.interventions": "Interventies",
    "nav.tasks": "Taken", "nav.notes": "Notities", "nav.messages": "Berichten",
     "nav.billing": "Abonnement", "nav.logout": "Uitloggen",
     "nav.explore": "Ontdekken", "nav.more": "Meer",
     "section.essential": "ESSENTIEEL", "section.rental": "VERHUUR", "section.more": "MEER",
    "badge.landlord": "Verhuurdersgebied", "badge.tenant": "Huurdersgebied",
    "dashboard.hello": "Hallo 👋", "dashboard.summary": "Hier is een overzicht van uw situatie.",
    "dashboard.properties": "Vastgoed", "dashboard.tenants_count": "huurder(s)",
    "dashboard.collected": "Geïnd deze maand", "dashboard.unpaid": "onbetaald",
    "dashboard.quick_actions": "Snelle acties", "dashboard.generate_receipt": "Kwitantie genereren",
    "dashboard.create_lease": "Huurcontract maken", "dashboard.view_reminders": "Herinneringen bekijken",
    "dashboard.alerts": "Waarschuwingen & acties", "dashboard.all_good": "Alles is bijgewerkt! 🎉",
    "common.save": "Opslaan", "common.cancel": "Annuleren", "common.delete": "Verwijderen",
    "common.edit": "Bewerken", "common.add": "Toevoegen", "common.search": "Zoeken",
    "common.back": "Terug", "common.loading": "Laden...", "common.no_data": "Geen gegevens",
    "common.paid": "Betaald", "common.unpaid": "Onbetaald", "common.active": "Actief",
    "common.continue": "Doorgaan", "common.skip": "Overslaan", "common.finish": "Voltooien",
    "common.error": "Fout",
    // Landing
    "landing.nav.features": "Functies", "landing.nav.pricing": "Prijzen",
    "landing.nav.login": "Inloggen", "landing.nav.signup": "Registreren",
    "landing.hero.badge": "Vastgoedbeheer in 50+ landen",
    "landing.hero.title": "Beheer uw vastgoed", "landing.hero.title_highlight": "wereldwijd",
    "landing.hero.subtitle": "Huurcontracten, kwitanties, inventarissen en documenten — automatisch gegenereerd en juridisch conform per land.",
    "landing.hero.cta": "Gratis starten", "landing.hero.pricing": "Bekijk prijzen",
    "landing.pricing.title": "Eenvoudige", "landing.pricing.title_highlight": "prijzen",
    "landing.pricing.subtitle": "Eén abonnement, alle functies, alle landen.",
    "landing.pricing.no_commitment": "Geen verplichtingen — op elk moment opzegbaar",
    "landing.pricing.monthly": "Maandelijks", "landing.pricing.annual": "Jaarlijks",
    "landing.pricing.per_month": "maand", "landing.pricing.per_year": "jaar",
    "landing.pricing.save_annual": "-17% besparing",
    "landing.pricing.plan_name": "Easy-Locs Onbeperkt", "landing.pricing.plan_desc": "Alles inbegrepen, zonder limiet.",
    "landing.pricing.access_desc": "Volledige toegang tot alle functies, alle landen, onbeperkt.",
    "landing.pricing.cta": "Gratis starten",
    "landing.pricing.feat_countries": "Alle landen ter wereld",
    "landing.pricing.feat_properties": "Onbeperkt vastgoed",
    "landing.pricing.feat_tenants": "Onbeperkt huurders",
    "landing.pricing.feat_rental_modes": "Lange duur + Airbnb",
    "landing.pricing.feat_ota_sync": "Airbnb, Booking & OTA sync",
    "landing.pricing.feat_legal_docs": "Juridische documenten per land",
    "landing.pricing.feat_leases": "Huurcontracten, inventarissen, kwitanties",
    "landing.pricing.feat_esign": "Elektronische handtekening",
    "landing.pricing.feat_archive": "Veilige langdurige archivering",
    "landing.pricing.feat_pdf": "Gepersonaliseerde AI-assistent",
    "landing.pricing.feat_support": "Prioriteitsondersteuning",
    "landing.pricing.payment_card": "Kaart", "landing.pricing.payment_sepa": "SEPA",
    "landing.pricing.legal_1": "Prijzen in euro, inclusief btw (21%).",
    "landing.pricing.legal_2": "Abonnementen worden automatisch verlengd. Op elk moment opzegbaar.",
    "landing.footer.desc": "SaaS-platform voor vastgoedbeheer in 50+ landen.",
    "landing.footer.product": "Product", "landing.footer.features": "Functies",
    "landing.footer.pricing": "Prijzen", "landing.footer.legal": "Juridisch",
    "landing.footer.contact": "Contact", "landing.footer.copyright": "Alle rechten voorbehouden.",
    // Auth
    "auth.login.title": "Inloggen", "auth.login.subtitle": "Toegang tot uw Easy-Locs-ruimte.",
    "auth.login.password_tab": "Wachtwoord", "auth.login.otp_tab": "Code per email",
    "auth.login.email": "E-mail", "auth.login.password": "Wachtwoord",
    "auth.login.submit": "Inloggen", "auth.login.forgot": "Wachtwoord vergeten?",
    "auth.login.create_account": "Account aanmaken",
    "auth.signup.title": "Account aanmaken", "auth.signup.subtitle": "Sluit u gratis aan bij Easy-Locs.",
    "auth.signup.name": "Volledige naam", "auth.signup.email": "E-mail",
    "auth.signup.password": "Wachtwoord", "auth.signup.submit": "Mijn account aanmaken",
    "auth.signup.has_account": "Heeft u al een account?", "auth.signup.login": "Inloggen",
    "auth.social.or": "of doorgaan met",
    // Settings
    "page.settings.title": "Instellingen", "page.settings.subtitle": "Beheer uw profiel en organisatie.",
    "page.settings.profile": "Profiel", "page.settings.full_name": "Volledige naam",
    "page.settings.email": "E-mail", "page.settings.country": "Land",
    "page.settings.save_profile": "Profiel opslaan", "page.settings.saving": "Opslaan...",
    "page.settings.org_title": "Organisatie & Documentpersonalisatie",
    "page.settings.org_name": "Organisatienaam", "page.settings.address": "Adres",
    "page.settings.postal_code": "Postcode", "page.settings.city": "Stad",
    "page.settings.phone": "Telefoon", "page.settings.contact_email": "Contact e-mail",
    "page.settings.save_org": "Organisatie opslaan",
    "page.settings.signature": "Mijn handtekening",
    "page.settings.save_signature": "Handtekening opslaan",
    "page.settings.profile_updated": "Profiel bijgewerkt",
    "page.settings.org_updated": "Organisatie bijgewerkt",
  },
  pl: {
    "nav.dashboard": "Panel", "nav.properties": "Nieruchomości", "nav.tenants": "Najemcy",
    "nav.documents": "Dokumenty", "nav.payments": "Płatności", "nav.inventory": "Inwentaryzacje",
    "nav.receipts": "Pokwitowania", "nav.leases": "Umowy najmu", "nav.reminders": "Przypomnienia",
    "nav.vault": "Sejf", "nav.settings": "Ustawienia", "nav.seasonal": "Wynajem krótkoterminowy",
    "nav.finances": "Finanse", "nav.expenses": "Wydatki", "nav.assistant": "Asystent",
    "nav.buildings": "Budynki", "nav.candidates": "Kandydaci", "nav.notices": "Zawiadomienia",
    "nav.dunning": "Wezwania do zapłaty", "nav.furniture": "Meble", "nav.charges": "Rozliczenie",
    "nav.fiscal": "Raport podatkowy", "nav.company": "Firma", "nav.interventions": "Interwencje",
    "nav.tasks": "Zadania", "nav.notes": "Notatki", "nav.messages": "Wiadomości",
     "nav.billing": "Subskrypcja", "nav.logout": "Wyloguj",
     "nav.explore": "Odkrywaj", "nav.more": "Więcej",
     "section.essential": "PODSTAWOWE", "section.rental": "WYNAJEM", "section.more": "WIĘCEJ",
    "badge.landlord": "Panel właściciela", "badge.tenant": "Panel najemcy",
    "dashboard.hello": "Cześć 👋", "dashboard.summary": "Podsumowanie Twojej sytuacji.",
    "dashboard.properties": "Nieruchomości", "dashboard.tenants_count": "najemca(ów)",
    "dashboard.collected": "Zebrano w tym miesiącu", "dashboard.unpaid": "niezapłacone",
    "dashboard.quick_actions": "Szybkie akcje", "dashboard.generate_receipt": "Wygeneruj pokwitowanie",
    "dashboard.create_lease": "Utwórz umowę", "dashboard.view_reminders": "Zobacz przypomnienia",
    "dashboard.alerts": "Alerty i akcje", "dashboard.all_good": "Wszystko aktualne! 🎉",
    "common.save": "Zapisz", "common.cancel": "Anuluj", "common.delete": "Usuń",
    "common.edit": "Edytuj", "common.add": "Dodaj", "common.search": "Szukaj",
    "common.back": "Wstecz", "common.loading": "Ładowanie...", "common.no_data": "Brak danych",
    "common.paid": "Zapłacone", "common.unpaid": "Niezapłacone", "common.active": "Aktywne",
    "common.continue": "Kontynuuj", "common.skip": "Pomiń", "common.finish": "Zakończ",
    "common.error": "Błąd",
    // Landing
    "landing.nav.features": "Funkcje", "landing.nav.pricing": "Cennik",
    "landing.nav.login": "Logowanie", "landing.nav.signup": "Rejestracja",
    "landing.hero.badge": "Zarządzanie nieruchomościami w 50+ krajach",
    "landing.hero.title": "Zarządzaj swoimi nieruchomościami", "landing.hero.title_highlight": "na całym świecie",
    "landing.hero.subtitle": "Umowy najmu, pokwitowania, inwentaryzacje i dokumenty — automatycznie generowane i prawnie zgodne w każdym kraju.",
    "landing.hero.cta": "Zacznij za darmo", "landing.hero.pricing": "Zobacz cennik",
    "landing.pricing.title": "Prosty", "landing.pricing.title_highlight": "cennik",
    "landing.pricing.subtitle": "Jedna subskrypcja, wszystkie funkcje, wszystkie kraje.",
    "landing.pricing.no_commitment": "Bez zobowiązań — anuluj w dowolnym momencie",
    "landing.pricing.monthly": "Miesięcznie", "landing.pricing.annual": "Rocznie",
    "landing.pricing.per_month": "miesiąc", "landing.pricing.per_year": "rok",
    "landing.pricing.save_annual": "-17% oszczędności",
    "landing.pricing.plan_name": "Easy-Locs Bez Limitu", "landing.pricing.plan_desc": "Wszystko w cenie, bez ograniczeń.",
    "landing.pricing.access_desc": "Pełny dostęp do wszystkich funkcji, wszystkich krajów, bez limitu.",
    "landing.pricing.cta": "Zacznij za darmo",
    "landing.pricing.feat_countries": "Wszystkie kraje świata",
    "landing.pricing.feat_properties": "Nieograniczona liczba nieruchomości",
    "landing.pricing.feat_tenants": "Nieograniczona liczba najemców",
    "landing.pricing.feat_rental_modes": "Długoterminowe + Airbnb",
    "landing.pricing.feat_ota_sync": "Synchronizacja Airbnb, Booking i OTA",
    "landing.pricing.feat_legal_docs": "Dokumenty prawne dla każdego kraju",
    "landing.pricing.feat_leases": "Umowy, inwentaryzacje, pokwitowania",
    "landing.pricing.feat_esign": "Podpis elektroniczny",
    "landing.pricing.feat_archive": "Bezpieczna długoterminowa archiwizacja",
    "landing.pricing.feat_pdf": "Spersonalizowany asystent AI",
    "landing.pricing.feat_support": "Wsparcie priorytetowe",
    "landing.pricing.payment_card": "Karta", "landing.pricing.payment_sepa": "SEPA",
    "landing.pricing.legal_1": "Ceny w euro, z VAT (23%).",
    "landing.pricing.legal_2": "Subskrypcje odnawiają się automatycznie. Anuluj w dowolnym momencie.",
    "landing.footer.desc": "Platforma SaaS do zarządzania nieruchomościami w 50+ krajach.",
    "landing.footer.product": "Produkt", "landing.footer.features": "Funkcje",
    "landing.footer.pricing": "Cennik", "landing.footer.legal": "Prawne",
    "landing.footer.contact": "Kontakt", "landing.footer.copyright": "Wszelkie prawa zastrzeżone.",
    // Auth
    "auth.login.title": "Logowanie", "auth.login.subtitle": "Uzyskaj dostęp do swojej przestrzeni Easy-Locs.",
    "auth.login.password_tab": "Hasło", "auth.login.otp_tab": "Kod e-mail",
    "auth.login.email": "E-mail", "auth.login.password": "Hasło",
    "auth.login.submit": "Zaloguj się", "auth.login.forgot": "Zapomniałeś hasła?",
    "auth.login.create_account": "Utwórz konto",
    "auth.signup.title": "Utwórz konto", "auth.signup.subtitle": "Dołącz do Easy-Locs za darmo.",
    "auth.signup.name": "Imię i nazwisko", "auth.signup.email": "E-mail",
    "auth.signup.password": "Hasło", "auth.signup.submit": "Utwórz moje konto",
    "auth.signup.has_account": "Masz już konto?", "auth.signup.login": "Zaloguj się",
    "auth.social.or": "lub kontynuuj przez",
    // Settings
    "page.settings.title": "Ustawienia", "page.settings.subtitle": "Zarządzaj swoim profilem i organizacją.",
    "page.settings.profile": "Profil", "page.settings.full_name": "Pełne imię",
    "page.settings.email": "E-mail", "page.settings.country": "Kraj",
    "page.settings.save_profile": "Zapisz profil", "page.settings.saving": "Zapisywanie...",
    "page.settings.org_title": "Organizacja i personalizacja dokumentów",
    "page.settings.org_name": "Nazwa organizacji", "page.settings.address": "Adres",
    "page.settings.postal_code": "Kod pocztowy", "page.settings.city": "Miasto",
    "page.settings.phone": "Telefon", "page.settings.contact_email": "E-mail kontaktowy",
    "page.settings.save_org": "Zapisz organizację",
    "page.settings.signature": "Mój podpis",
    "page.settings.save_signature": "Zapisz podpis",
    "page.settings.profile_updated": "Profil zaktualizowany",
    "page.settings.org_updated": "Organizacja zaktualizowana",
  },
  tr: {
    "nav.dashboard": "Panel", "nav.properties": "Mülkler", "nav.tenants": "Kiracılar",
    "nav.documents": "Belgeler", "nav.payments": "Ödemeler", "nav.inventory": "Envanterler",
    "nav.receipts": "Makbuzlar", "nav.leases": "Kira Sözleşmeleri", "nav.reminders": "Hatırlatmalar",
    "nav.vault": "Kasa", "nav.settings": "Ayarlar", "nav.seasonal": "Kısa dönem kiralama",
    "nav.finances": "Finans", "nav.expenses": "Giderler", "nav.assistant": "Asistan",
    "nav.buildings": "Binalar", "nav.candidates": "Adaylar", "nav.notices": "Ödeme bildirimleri",
    "nav.dunning": "İhtarnameler", "nav.furniture": "Mobilya", "nav.charges": "Hesap kesimi",
    "nav.fiscal": "Vergi raporu", "nav.company": "Şirket", "nav.interventions": "Müdahaleler",
    "nav.tasks": "Görevler", "nav.notes": "Notlar", "nav.messages": "Mesajlar",
     "nav.billing": "Abonelik", "nav.logout": "Çıkış",
     "nav.explore": "Keşfet", "nav.more": "Diğer",
     "section.essential": "TEMEL", "section.rental": "KİRALAMA", "section.more": "DİĞER",
    "badge.landlord": "Ev sahibi paneli", "badge.tenant": "Kiracı paneli",
    "dashboard.hello": "Merhaba 👋", "dashboard.summary": "Durumunuzun özeti.",
    "dashboard.properties": "Mülkler", "dashboard.tenants_count": "kiracı",
    "dashboard.collected": "Bu ay tahsil edilen", "dashboard.unpaid": "ödenmemiş",
    "dashboard.quick_actions": "Hızlı işlemler", "dashboard.generate_receipt": "Makbuz oluştur",
    "dashboard.create_lease": "Sözleşme oluştur", "dashboard.view_reminders": "Hatırlatmaları gör",
    "dashboard.alerts": "Uyarılar ve işlemler", "dashboard.all_good": "Her şey güncel! 🎉",
    "common.save": "Kaydet", "common.cancel": "İptal", "common.delete": "Sil",
    "common.edit": "Düzenle", "common.add": "Ekle", "common.search": "Ara",
    "common.back": "Geri", "common.loading": "Yükleniyor...", "common.no_data": "Veri yok",
    "common.paid": "Ödendi", "common.unpaid": "Ödenmedi", "common.active": "Aktif",
    "common.continue": "Devam", "common.skip": "Atla", "common.finish": "Bitir",
    "common.error": "Hata",
    // Landing
    "landing.nav.features": "Özellikler", "landing.nav.pricing": "Fiyatlar",
    "landing.nav.login": "Giriş", "landing.nav.signup": "Kayıt ol",
    "landing.hero.badge": "50+ ülkede mülk yönetimi",
    "landing.hero.title": "Mülklerinizi yönetin", "landing.hero.title_highlight": "dünya genelinde",
    "landing.hero.subtitle": "Kira sözleşmeleri, makbuzlar, envanterler ve belgeler — otomatik oluşturulur ve her ülkeye uygun.",
    "landing.hero.cta": "Ücretsiz başla", "landing.hero.pricing": "Fiyatları gör",
    "landing.pricing.title": "Basit", "landing.pricing.title_highlight": "fiyatlandırma",
    "landing.pricing.subtitle": "Tek abonelik, tüm özellikler, tüm ülkeler.",
    "landing.pricing.no_commitment": "Taahhüt yok — istediğiniz zaman iptal edin",
    "landing.pricing.monthly": "Aylık", "landing.pricing.annual": "Yıllık",
    "landing.pricing.per_month": "ay", "landing.pricing.per_year": "yıl",
    "landing.pricing.save_annual": "%17 tasarruf",
    "landing.pricing.plan_name": "Easy-Locs Sınırsız", "landing.pricing.plan_desc": "Her şey dahil, sınırsız.",
    "landing.pricing.access_desc": "Tüm özellikler, tüm ülkeler, sınırsız erişim.",
    "landing.pricing.cta": "Ücretsiz başla",
    "landing.pricing.feat_countries": "Dünyadaki tüm ülkeler",
    "landing.pricing.feat_properties": "Sınırsız mülk",
    "landing.pricing.feat_tenants": "Sınırsız kiracı",
    "landing.pricing.feat_rental_modes": "Uzun dönem + Airbnb",
    "landing.pricing.feat_ota_sync": "Airbnb, Booking ve OTA senkronizasyonu",
    "landing.pricing.feat_legal_docs": "Ülkelere özel yasal belgeler",
    "landing.pricing.feat_leases": "Sözleşmeler, envanterler, makbuzlar",
    "landing.pricing.feat_esign": "Elektronik imza",
    "landing.pricing.feat_archive": "Güvenli uzun vadeli arşivleme",
    "landing.pricing.feat_pdf": "Kişiselleştirilmiş AI asistanı",
    "landing.pricing.feat_support": "Öncelikli destek",
    "landing.pricing.payment_card": "Kart", "landing.pricing.payment_sepa": "SEPA",
    "landing.pricing.legal_1": "Euro cinsinden fiyatlar, KDV dahil.",
    "landing.pricing.legal_2": "Abonelikler otomatik yenilenir. İstediğiniz zaman iptal edin.",
    "landing.footer.desc": "50+ ülkede mülk yönetimi SaaS platformu.",
    "landing.footer.product": "Ürün", "landing.footer.features": "Özellikler",
    "landing.footer.pricing": "Fiyatlar", "landing.footer.legal": "Yasal",
    "landing.footer.contact": "İletişim", "landing.footer.copyright": "Tüm hakları saklıdır.",
    // Auth
    "auth.login.title": "Giriş yap", "auth.login.subtitle": "Easy-Locs alanınıza erişin.",
    "auth.login.password_tab": "Şifre", "auth.login.otp_tab": "E-posta kodu",
    "auth.login.email": "E-posta", "auth.login.password": "Şifre",
    "auth.login.submit": "Giriş yap", "auth.login.forgot": "Şifrenizi mi unuttunuz?",
    "auth.login.create_account": "Hesap oluştur",
    "auth.signup.title": "Hesap oluştur", "auth.signup.subtitle": "Easy-Locs'a ücretsiz katılın.",
    "auth.signup.name": "Tam ad", "auth.signup.email": "E-posta",
    "auth.signup.password": "Şifre", "auth.signup.submit": "Hesabımı oluştur",
    "auth.signup.has_account": "Zaten hesabınız var mı?", "auth.signup.login": "Giriş yap",
    "auth.social.or": "veya şununla devam edin",
    // Settings
    "page.settings.title": "Ayarlar", "page.settings.subtitle": "Profilinizi ve organizasyonunuzu yönetin.",
    "page.settings.profile": "Profil", "page.settings.full_name": "Tam ad",
    "page.settings.email": "E-posta", "page.settings.country": "Ülke",
    "page.settings.save_profile": "Profili kaydet", "page.settings.saving": "Kaydediliyor...",
    "page.settings.org_title": "Organizasyon ve belge kişiselleştirme",
    "page.settings.org_name": "Organizasyon adı", "page.settings.address": "Adres",
    "page.settings.postal_code": "Posta kodu", "page.settings.city": "Şehir",
    "page.settings.phone": "Telefon", "page.settings.contact_email": "İletişim e-postası",
    "page.settings.save_org": "Organizasyonu kaydet",
    "page.settings.signature": "İmzam",
    "page.settings.save_signature": "İmzayı kaydet",
    "page.settings.profile_updated": "Profil güncellendi",
    "page.settings.org_updated": "Organizasyon güncellendi",
  },
  ar: {
    "nav.dashboard": "لوحة التحكم", "nav.properties": "العقارات", "nav.tenants": "المستأجرون",
    "nav.documents": "المستندات", "nav.payments": "المدفوعات", "nav.inventory": "الجرد",
    "nav.receipts": "الإيصالات", "nav.leases": "عقود الإيجار", "nav.reminders": "التذكيرات",
    "nav.vault": "الخزنة", "nav.settings": "الإعدادات", "nav.seasonal": "إيجار موسمي",
    "nav.finances": "المالية", "nav.expenses": "المصاريف", "nav.assistant": "المساعد",
    "nav.buildings": "المباني", "nav.candidates": "المرشحون", "nav.notices": "إشعارات الدفع",
    "nav.dunning": "التحصيل", "nav.furniture": "الأثاث", "nav.charges": "التسوية",
    "nav.fiscal": "التقرير الضريبي", "nav.company": "الشركة", "nav.interventions": "التدخلات",
    "nav.tasks": "المهام", "nav.notes": "الملاحظات", "nav.messages": "الرسائل",
     "nav.billing": "الاشتراك", "nav.logout": "تسجيل الخروج",
     "nav.explore": "استكشاف", "nav.more": "المزيد",
     "section.essential": "أساسي", "section.rental": "الإيجار", "section.more": "المزيد",
    "badge.landlord": "لوحة المالك", "badge.tenant": "لوحة المستأجر",
    "dashboard.hello": "مرحباً 👋", "dashboard.summary": "ملخص حالتك.",
    "dashboard.properties": "عقارات", "dashboard.tenants_count": "مستأجر(ون)",
    "dashboard.collected": "تم تحصيله هذا الشهر", "dashboard.unpaid": "غير مدفوع",
    "dashboard.quick_actions": "إجراءات سريعة", "dashboard.generate_receipt": "إنشاء إيصال",
    "dashboard.create_lease": "إنشاء عقد", "dashboard.view_reminders": "عرض التذكيرات",
    "dashboard.alerts": "تنبيهات وإجراءات", "dashboard.all_good": "كل شيء محدث! 🎉",
    "common.save": "حفظ", "common.cancel": "إلغاء", "common.delete": "حذف",
    "common.edit": "تعديل", "common.add": "إضافة", "common.search": "بحث",
    "common.back": "رجوع", "common.loading": "جاري التحميل...", "common.no_data": "لا توجد بيانات",
    "common.paid": "مدفوع", "common.unpaid": "غير مدفوع", "common.active": "نشط",
    "common.continue": "متابعة", "common.skip": "تخطي", "common.finish": "إنهاء",
    "common.error": "خطأ",
    // Landing
    "landing.nav.features": "الميزات", "landing.nav.pricing": "الأسعار",
    "landing.nav.login": "تسجيل الدخول", "landing.nav.signup": "إنشاء حساب",
    "landing.hero.badge": "إدارة العقارات في أكثر من 50 دولة",
    "landing.hero.title": "إدارة عقاراتك", "landing.hero.title_highlight": "حول العالم",
    "landing.hero.subtitle": "عقود الإيجار والإيصالات والجرد والمستندات — يتم إنشاؤها تلقائياً ومتوافقة قانونياً لكل دولة.",
    "landing.hero.cta": "ابدأ مجاناً", "landing.hero.pricing": "عرض الأسعار",
    "landing.pricing.title": "أسعار", "landing.pricing.title_highlight": "بسيطة",
    "landing.pricing.subtitle": "اشتراك واحد، جميع الميزات، جميع الدول.",
    "landing.pricing.no_commitment": "بدون التزام — إلغاء في أي وقت",
    "landing.pricing.monthly": "شهري", "landing.pricing.annual": "سنوي",
    "landing.pricing.per_month": "شهر", "landing.pricing.per_year": "سنة",
    "landing.pricing.save_annual": "توفير 17%",
    "landing.pricing.plan_name": "Easy-Locs غير محدود", "landing.pricing.plan_desc": "كل شيء مشمول، بدون حدود.",
    "landing.pricing.access_desc": "وصول كامل لجميع الميزات، جميع الدول، بدون حدود.",
    "landing.pricing.cta": "ابدأ مجاناً",
    "landing.pricing.feat_countries": "جميع دول العالم",
    "landing.pricing.feat_properties": "عقارات غير محدودة",
    "landing.pricing.feat_tenants": "مستأجرون غير محدودين",
    "landing.pricing.feat_rental_modes": "طويل الأجل + Airbnb",
    "landing.pricing.feat_ota_sync": "مزامنة Airbnb و Booking و OTA",
    "landing.pricing.feat_legal_docs": "مستندات قانونية لكل دولة",
    "landing.pricing.feat_leases": "عقود، جرد، إيصالات",
    "landing.pricing.feat_esign": "توقيع إلكتروني",
    "landing.pricing.feat_archive": "أرشفة آمنة طويلة الأجل",
    "landing.pricing.feat_pdf": "مساعد AI مخصص",
    "landing.pricing.feat_support": "دعم ذو أولوية",
    "landing.pricing.payment_card": "بطاقة", "landing.pricing.payment_sepa": "SEPA",
    "landing.pricing.legal_1": "الأسعار بالأورو شاملة الضريبة.",
    "landing.pricing.legal_2": "يتم تجديد الاشتراكات تلقائياً. إلغاء في أي وقت.",
    "landing.footer.desc": "منصة SaaS لإدارة العقارات في أكثر من 50 دولة.",
    "landing.footer.product": "المنتج", "landing.footer.features": "الميزات",
    "landing.footer.pricing": "الأسعار", "landing.footer.legal": "قانوني",
    "landing.footer.contact": "اتصل بنا", "landing.footer.copyright": "جميع الحقوق محفوظة.",
    // Auth
    "auth.login.title": "تسجيل الدخول", "auth.login.subtitle": "الوصول إلى مساحة Easy-Locs الخاصة بك.",
    "auth.login.password_tab": "كلمة المرور", "auth.login.otp_tab": "رمز بالبريد",
    "auth.login.email": "البريد الإلكتروني", "auth.login.password": "كلمة المرور",
    "auth.login.submit": "تسجيل الدخول", "auth.login.forgot": "نسيت كلمة المرور؟",
    "auth.login.create_account": "إنشاء حساب",
    "auth.signup.title": "إنشاء حساب", "auth.signup.subtitle": "انضم إلى Easy-Locs مجاناً.",
    "auth.signup.name": "الاسم الكامل", "auth.signup.email": "البريد الإلكتروني",
    "auth.signup.password": "كلمة المرور", "auth.signup.submit": "إنشاء حسابي",
    "auth.signup.has_account": "لديك حساب بالفعل؟", "auth.signup.login": "تسجيل الدخول",
    "auth.social.or": "أو المتابعة عبر",
    // Settings
    "page.settings.title": "الإعدادات", "page.settings.subtitle": "إدارة ملفك الشخصي ومنظمتك.",
    "page.settings.profile": "الملف الشخصي", "page.settings.full_name": "الاسم الكامل",
    "page.settings.email": "البريد الإلكتروني", "page.settings.country": "الدولة",
    "page.settings.save_profile": "حفظ الملف الشخصي", "page.settings.saving": "جاري الحفظ...",
    "page.settings.org_title": "المنظمة وتخصيص المستندات",
    "page.settings.org_name": "اسم المنظمة", "page.settings.address": "العنوان",
    "page.settings.postal_code": "الرمز البريدي", "page.settings.city": "المدينة",
    "page.settings.phone": "الهاتف", "page.settings.contact_email": "بريد الاتصال",
    "page.settings.save_org": "حفظ المنظمة",
    "page.settings.signature": "توقيعي",
    "page.settings.save_signature": "حفظ التوقيع",
    "page.settings.profile_updated": "تم تحديث الملف الشخصي",
    "page.settings.org_updated": "تم تحديث المنظمة",
  },
  ja: {
    "nav.dashboard": "ダッシュボード", "nav.properties": "物件", "nav.tenants": "入居者",
    "nav.documents": "書類", "nav.payments": "支払い", "nav.inventory": "棚卸",
    "nav.receipts": "領収書", "nav.leases": "賃貸契約", "nav.reminders": "リマインダー",
    "nav.vault": "金庫", "nav.settings": "設定", "nav.seasonal": "短期賃貸",
    "nav.finances": "財務", "nav.expenses": "経費", "nav.assistant": "アシスタント",
    "nav.buildings": "建物", "nav.candidates": "候補者", "nav.notices": "支払い通知",
    "nav.dunning": "督促", "nav.furniture": "家具", "nav.charges": "精算",
    "nav.fiscal": "税務報告", "nav.company": "会社", "nav.interventions": "修繕",
    "nav.tasks": "タスク", "nav.notes": "メモ", "nav.messages": "メッセージ",
     "nav.billing": "サブスクリプション", "nav.logout": "ログアウト",
     "nav.explore": "探索", "nav.more": "その他",
     "section.essential": "基本", "section.rental": "賃貸", "section.more": "その他",
    "badge.landlord": "オーナー画面", "badge.tenant": "入居者画面",
    "dashboard.hello": "こんにちは 👋", "dashboard.summary": "現在の状況をまとめました。",
    "dashboard.properties": "物件", "dashboard.tenants_count": "入居者",
    "dashboard.collected": "今月の回収額", "dashboard.unpaid": "未払い",
    "dashboard.quick_actions": "クイックアクション", "dashboard.generate_receipt": "領収書を作成",
    "dashboard.create_lease": "契約を作成", "dashboard.view_reminders": "リマインダーを表示",
    "dashboard.alerts": "アラートとアクション", "dashboard.all_good": "すべて最新です！🎉",
    "common.save": "保存", "common.cancel": "キャンセル", "common.delete": "削除",
    "common.edit": "編集", "common.add": "追加", "common.search": "検索",
    "common.back": "戻る", "common.loading": "読み込み中...", "common.no_data": "データなし",
    "common.paid": "支払い済み", "common.unpaid": "未払い", "common.active": "アクティブ",
    "common.continue": "続行", "common.skip": "スキップ", "common.finish": "完了",
    "common.error": "エラー",
    // Landing
    "landing.nav.features": "機能", "landing.nav.pricing": "料金",
    "landing.nav.login": "ログイン", "landing.nav.signup": "登録",
    "landing.hero.badge": "50カ国以上で不動産管理",
    "landing.hero.title": "不動産を管理", "landing.hero.title_highlight": "世界中で",
    "landing.hero.subtitle": "賃貸契約、領収書、棚卸、書類 — 各国の法律に準拠して自動生成されます。",
    "landing.hero.cta": "無料で始める", "landing.hero.pricing": "料金を見る",
    "landing.pricing.title": "シンプルな", "landing.pricing.title_highlight": "料金プラン",
    "landing.pricing.subtitle": "1つのサブスクリプション、すべての機能、すべての国。",
    "landing.pricing.no_commitment": "契約なし — いつでもキャンセル可能",
    "landing.pricing.monthly": "月額", "landing.pricing.annual": "年額",
    "landing.pricing.per_month": "月", "landing.pricing.per_year": "年",
    "landing.pricing.save_annual": "17%節約",
    "landing.pricing.plan_name": "Easy-Locs 無制限", "landing.pricing.plan_desc": "すべて込み、制限なし。",
    "landing.pricing.access_desc": "すべての機能、すべての国、無制限アクセス。",
    "landing.pricing.cta": "無料で始める",
    "landing.pricing.feat_countries": "世界中のすべての国",
    "landing.pricing.feat_properties": "無制限の物件",
    "landing.pricing.feat_tenants": "無制限の入居者",
    "landing.pricing.feat_rental_modes": "長期 + Airbnb",
    "landing.pricing.feat_ota_sync": "Airbnb、Booking、OTA同期",
    "landing.pricing.feat_legal_docs": "各国対応の法律文書",
    "landing.pricing.feat_leases": "契約、棚卸、領収書",
    "landing.pricing.feat_esign": "電子署名",
    "landing.pricing.feat_archive": "安全な長期アーカイブ",
    "landing.pricing.feat_pdf": "パーソナライズAIアシスタント",
    "landing.pricing.feat_support": "優先サポート",
    "landing.pricing.payment_card": "カード", "landing.pricing.payment_sepa": "SEPA",
    "landing.pricing.legal_1": "ユーロ建て価格、税込み。",
    "landing.pricing.legal_2": "サブスクリプションは自動更新されます。いつでもキャンセル可能。",
    "landing.footer.desc": "50カ国以上で不動産管理するSaaSプラットフォーム。",
    "landing.footer.product": "製品", "landing.footer.features": "機能",
    "landing.footer.pricing": "料金", "landing.footer.legal": "法的事項",
    "landing.footer.contact": "お問い合わせ", "landing.footer.copyright": "全著作権所有。",
    // Auth
    "auth.login.title": "ログイン", "auth.login.subtitle": "Easy-Locs スペースにアクセス。",
    "auth.login.password_tab": "パスワード", "auth.login.otp_tab": "メールコード",
    "auth.login.email": "メールアドレス", "auth.login.password": "パスワード",
    "auth.login.submit": "ログイン", "auth.login.forgot": "パスワードを忘れた？",
    "auth.login.create_account": "アカウントを作成",
    "auth.signup.title": "アカウント作成", "auth.signup.subtitle": "Easy-Locsに無料で参加。",
    "auth.signup.name": "氏名", "auth.signup.email": "メールアドレス",
    "auth.signup.password": "パスワード", "auth.signup.submit": "アカウントを作成",
    "auth.signup.has_account": "すでにアカウントをお持ちですか？", "auth.signup.login": "ログイン",
    "auth.social.or": "または以下で続行",
    // Settings
    "page.settings.title": "設定", "page.settings.subtitle": "プロフィールと組織を管理します。",
    "page.settings.profile": "プロフィール", "page.settings.full_name": "氏名",
    "page.settings.email": "メールアドレス", "page.settings.country": "国",
    "page.settings.save_profile": "プロフィールを保存", "page.settings.saving": "保存中...",
    "page.settings.org_title": "組織と書類のカスタマイズ",
    "page.settings.org_name": "組織名", "page.settings.address": "住所",
    "page.settings.postal_code": "郵便番号", "page.settings.city": "都市",
    "page.settings.phone": "電話番号", "page.settings.contact_email": "連絡先メール",
    "page.settings.save_org": "組織を保存",
    "page.settings.signature": "マイ署名",
    "page.settings.save_signature": "署名を保存",
    "page.settings.profile_updated": "プロフィールが更新されました",
    "page.settings.org_updated": "組織が更新されました",
  },
  ko: {}, zh: {}, hi: {}, th: {}, vi: {}, id: {}, ms: {},
  sv: {}, da: {}, nb: {}, fi: {}, el: {}, cs: {}, hu: {},
  ro: {}, hr: {}, bg: {}, sk: {}, he: {}, uk: {},
};

interface I18nContextType {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
  availableLocales: { value: Locale; label: string }[];
}

const I18nContext = createContext<I18nContextType | null>(null);

const availableLocales: { value: Locale; label: string }[] = [
  { value: "fr", label: "Français" },
  { value: "en", label: "English" },
  { value: "es", label: "Español" },
  { value: "de", label: "Deutsch" },
  { value: "it", label: "Italiano" },
  { value: "pt", label: "Português" },
  { value: "nl", label: "Nederlands" },
  { value: "pl", label: "Polski" },
  { value: "tr", label: "Türkçe" },
  { value: "ar", label: "العربية" },
  { value: "ja", label: "日本語" },
  { value: "ko", label: "한국어" },
  { value: "zh", label: "中文" },
  { value: "hi", label: "हिन्दी" },
  { value: "th", label: "ไทย" },
  { value: "vi", label: "Tiếng Việt" },
  { value: "id", label: "Bahasa Indonesia" },
  { value: "ms", label: "Bahasa Melayu" },
  { value: "sv", label: "Svenska" },
  { value: "da", label: "Dansk" },
  { value: "nb", label: "Norsk" },
  { value: "fi", label: "Suomi" },
  { value: "el", label: "Ελληνικά" },
  { value: "cs", label: "Čeština" },
  { value: "hu", label: "Magyar" },
  { value: "ro", label: "Română" },
  { value: "hr", label: "Hrvatski" },
  { value: "bg", label: "Български" },
  { value: "sk", label: "Slovenčina" },
  { value: "he", label: "עברית" },
  { value: "uk", label: "Українська" },
];

const safeGetStoredLocale = (): Locale | null => {
  if (typeof window === "undefined") return null;
  try {
    const saved = window.localStorage.getItem("app_locale") as Locale | null;
    return saved && translations[saved] ? saved : null;
  } catch {
    return null;
  }
};

const detectInitialLocale = (): Locale => {
  const stored = safeGetStoredLocale();
  if (stored) return stored;

  if (typeof navigator !== "undefined") {
    const browserLang = (navigator.language || "").split("-")[0]?.toLowerCase() as Locale;
    if (browserLang && translations[browserLang]) return browserLang;

    const browserCountry = (navigator.language || "").split("-")[1]?.toUpperCase();
    if (browserCountry && COUNTRY_LOCALE_MAP[browserCountry] && translations[COUNTRY_LOCALE_MAP[browserCountry]]) {
      return COUNTRY_LOCALE_MAP[browserCountry];
    }
  }

  return "en";
};

// Lazy-loaded extra data per locale (populated on demand)
const lazyData = new Map<Locale, Record<string, string>>();

const readLocaleMessages = (mod: unknown, exportKey: string, locale: Locale): Record<string, string> => {
  if (!mod || typeof mod !== "object") return {};
  const namespace = (mod as Record<string, unknown>)[exportKey];
  if (!namespace || typeof namespace !== "object") return {};
  const localeMessages = (namespace as Record<string, unknown>)[locale];
  return localeMessages && typeof localeMessages === "object"
    ? (localeMessages as Record<string, string>)
    : {};
};

async function loadLocaleExtras(locale: Locale): Promise<Record<string, string>> {
  if (locale === "fr" || locale === "en") return {};
  if (lazyData.has(locale)) return lazyData.get(locale)!;

  try {
    const [nkRes] = await Promise.allSettled([
      import("./i18n-validation"),
    ]);

    const merged = {
      ...readLocaleMessages(nkRes.status === "fulfilled" ? nkRes.value : undefined, "notifKeys", locale),
    };

    lazyData.set(locale, merged);
    return merged;
  } catch (e) {
    console.warn(`[i18n] Failed to load extras for ${locale}`, e);
    return {};
  }
}

// Pre-load en/fr supplementary data synchronously at startup
let enExtras: Record<string, string> = {};
let frExtras: Record<string, string> = {};

// Load en/fr extras lazily too, but eagerly triggered
const loadCoreExtras = async () => {
  const [nkRes] = await Promise.allSettled([
    import("./i18n-validation"),
  ]);

  enExtras = {
    ...readLocaleMessages(nkRes.status === "fulfilled" ? nkRes.value : undefined, "notifKeys", "en"),
  };

  frExtras = {
    ...readLocaleMessages(nkRes.status === "fulfilled" ? nkRes.value : undefined, "notifKeys", "fr"),
  };
};

// Trigger core extras load after initial render
if (typeof window !== "undefined") {
  if (typeof window.requestIdleCallback === "function") {
    window.requestIdleCallback(() => {
      void loadCoreExtras();
    });
  } else {
    setTimeout(() => {
      void loadCoreExtras();
    }, 500);
  }
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(detectInitialLocale);
  const [, forceUpdate] = useState(0);
  const loadingRef = useRef<string | null>(null);

  // Set HTML lang attribute on initial render
  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.lang = locale;
    document.documentElement.dir = (locale === "ar" || locale === "he") ? "rtl" : "ltr";
  }, [locale]);

  // Load lazy locale data when locale changes
  useEffect(() => {
    if (locale === "fr" || locale === "en") return;
    if (lazyData.has(locale)) return;
    if (loadingRef.current === locale) return;
    loadingRef.current = locale;
    loadLocaleExtras(locale).then(() => {
      loadingRef.current = null;
      forceUpdate(n => n + 1);
    });
  }, [locale]);

  /* Sync locale from profile on login */
  useEffect(() => {
    const syncLocale = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;
      const { data } = await supabase
        .from("profiles")
        .select("locale")
        .eq("id", session.user.id)
        .single();
      if (data?.locale && translations[data.locale as Locale]) {
        setLocaleState(data.locale as Locale);
        try {
          localStorage.setItem("app_locale", data.locale);
        } catch {
          // ignore storage errors
        }
      }
    };
    syncLocale();
  }, []);

  const setLocale = useCallback(async (l: Locale) => {
    setLocaleState(l);
    try {
      localStorage.setItem("app_locale", l);
    } catch {
      // ignore storage errors
    }
    // Update HTML lang attribute for proper multilingual rendering
    if (typeof document !== "undefined") {
      document.documentElement.lang = l;
      document.documentElement.dir = (l === "ar" || l === "he") ? "rtl" : "ltr";
    }
    // Pre-load extras for the new locale
    loadLocaleExtras(l);
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      await supabase.from("profiles").update({ locale: l }).eq("id", session.user.id);
    }
  }, []);

  const t = useCallback((key: string, vars?: Record<string, string | number>): string => {
    // Lookup helper across all sources including page translations
    const pageMap: Record<string, Record<string, string>> = { fr: pageFr, en: pageEn, es: pageEs, de: pageDe, it: pageIt, pt: pagePt };
    const lookup = (k: string): string | undefined =>
      translations[locale]?.[k] || lazyData.get(locale)?.[k] || pageMap[locale]?.[k] ||
      translations.en?.[k] || enExtras[k] || pageEn[k] ||
      translations.fr?.[k] || frExtras[k] || pageFr[k] || undefined;

    // If count is provided, try plural resolution
    let resolved: string | undefined;
    if (vars && typeof vars.count === "number") {
      resolved = resolvePlural(key, vars.count, lookup);
    } else {
      resolved = lookup(key);
    }

    if (resolved) return interpolate(resolved, vars);

    // Missing key — generate readable fallback from key name
    if (import.meta.env.DEV && !key.startsWith("pricing.")) {
      console.warn(`[i18n] Missing key: "${key}" (locale: ${locale})`);
    }
    trackMissingKey(key, locale);
    // Auto-generate readable text from the last segment of the key
    const lastSegment = key.split(".").pop() || key;
    return lastSegment
      .replace(/_/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());
  }, [locale]);

  return (
    <I18nContext.Provider value={{ locale, setLocale, t, availableLocales }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}

/**
 * tSafe — Safe translation with explicit fallback.
 * Use when a visible default is required even if the key is missing.
 */
export function tSafe(t: (key: string, vars?: Record<string, any>) => string, key: string, fallback: string, vars?: Record<string, any>): string {
  const result = t(key, vars);
  // If t() returned the raw key (missing translation), use the fallback
  return result === key ? fallback : result;
}
