/**
 * Country-specific configuration for property management forms.
 * Adapts labels, property types, heating types, lease types,
 * currency formatting, and postal code lookup per country.
 */

export interface CountryConfig {
  code: string;
  currency: string;
  currencySymbol: string;
  locale: string;
  propertyTypes: { value: string; label: string }[];
  heatingTypes: { value: string; label: string }[];
  leaseTypes: { value: string; label: string }[];
  labels: {
    property: string;
    properties: string;
    tenant: string;
    tenants: string;
    rent: string;
    charges: string;
    deposit: string;
    furnished: string;
    leaseStart: string;
    leaseEnd: string;
    leaseType: string;
    surface: string;
    rooms: string;
    floor: string;
    heating: string;
    propertyName: string;
    propertyType: string;
    postalCode: string;
    city: string;
    address: string;
    building: string;
    lotNumber: string;
    notes: string;
    guarantor: string;
    guarantorPhone: string;
    nationality: string;
    profession: string;
    birthDate: string;
    birthPlace: string;
    fullName: string;
    email: string;
    phone: string;
    selectProperty: string;
    addProperty: string;
    addTenant: string;
    editProperty: string;
    editTenant: string;
    save: string;
    active: string;
    terminated: string;
    all: string;
    paid: string;
    unpaid: string;
    overview: string;
    payments: string;
    inventory: string;
    rentTracking: string;
    monthCalls: string;
    allProperties: string;
    noProperty: string;
    noTenant: string;
    rentalManagement: string;
    rentalDesc: string;
    occupied: string;
    revenueMonth: string;
    unpaidCount: string;
    vacant: string;
    quickActions: string;
    generateReceipt: string;
    housingBenefit: string;
  };
  defaultNationality: string;
  surfaceUnit: string;
}

const frLabels = {
  property: "Bien", properties: "Biens", tenant: "Locataire", tenants: "Locataires",
  rent: "Loyer HC", charges: "Charges", deposit: "Dépôt de garantie", furnished: "Meublé",
  leaseStart: "Début du bail", leaseEnd: "Fin du bail", leaseType: "Type de bail",
  surface: "Surface", rooms: "Pièces", floor: "Étage", heating: "Chauffage",
  propertyName: "Nom du bien", propertyType: "Type", postalCode: "Code postal", city: "Ville",
  address: "Adresse", building: "Immeuble / Résidence", lotNumber: "N° de lot", notes: "Notes",
  guarantor: "Nom du garant", guarantorPhone: "Tél. du garant", nationality: "Nationalité",
  profession: "Profession", birthDate: "Date de naissance", birthPlace: "Lieu de naissance",
  fullName: "Nom complet", email: "Email", phone: "Téléphone",
  selectProperty: "— Sélectionner un bien —", addProperty: "Ajouter le bien", addTenant: "Ajouter le locataire",
  editProperty: "Modifier le bien", editTenant: "Modifier le locataire", save: "Enregistrer",
  active: "Actif", terminated: "Résilié", all: "Tous", paid: "Payé", unpaid: "Impayé",
  overview: "Vue d'ensemble", payments: "Loyers & Paiements", inventory: "États des lieux",
  rentTracking: "Suivi des loyers", monthCalls: "Appels du mois", allProperties: "Tous les biens",
  noProperty: "Aucun bien", noTenant: "Aucun locataire",
  rentalManagement: "Gestion locative", rentalDesc: "Biens, locataires, baux, quittances, paiements — tout au même endroit.",
  occupied: "Occupés", revenueMonth: "Revenus/mois", unpaidCount: "Impayés", vacant: "vacant",
  quickActions: "Actions rapides", generateReceipt: "Générer une quittance",
  housingBenefit: "APL / CAF",
};

const enLabels: typeof frLabels = {
  property: "Property", properties: "Properties", tenant: "Tenant", tenants: "Tenants",
  rent: "Rent (excl. charges)", charges: "Service charges", deposit: "Security deposit", furnished: "Furnished",
  leaseStart: "Lease start", leaseEnd: "Lease end", leaseType: "Lease type",
  surface: "Surface area", rooms: "Rooms", floor: "Floor", heating: "Heating",
  propertyName: "Property name", propertyType: "Type", postalCode: "Postal code", city: "City",
  address: "Address", building: "Building / Residence", lotNumber: "Unit number", notes: "Notes",
  guarantor: "Guarantor name", guarantorPhone: "Guarantor phone", nationality: "Nationality",
  profession: "Profession", birthDate: "Date of birth", birthPlace: "Place of birth",
  fullName: "Full name", email: "Email", phone: "Phone",
  selectProperty: "— Select a property —", addProperty: "Add property", addTenant: "Add tenant",
  editProperty: "Edit property", editTenant: "Edit tenant", save: "Save",
  active: "Active", terminated: "Terminated", all: "All", paid: "Paid", unpaid: "Unpaid",
  overview: "Overview", payments: "Rent & Payments", inventory: "Inspections",
  rentTracking: "Rent tracking", monthCalls: "This month's calls", allProperties: "All properties",
  noProperty: "No property", noTenant: "No tenant",
  rentalManagement: "Rental management", rentalDesc: "Properties, tenants, leases, receipts, payments — all in one place.",
  occupied: "Occupied", revenueMonth: "Revenue/month", unpaidCount: "Unpaid", vacant: "vacant",
  quickActions: "Quick actions", generateReceipt: "Generate receipt",
  housingBenefit: "Housing benefit",
};

const esLabels: typeof frLabels = {
  property: "Inmueble", properties: "Inmuebles", tenant: "Inquilino", tenants: "Inquilinos",
  rent: "Alquiler", charges: "Gastos", deposit: "Fianza", furnished: "Amueblado",
  leaseStart: "Inicio contrato", leaseEnd: "Fin contrato", leaseType: "Tipo de contrato",
  surface: "Superficie", rooms: "Habitaciones", floor: "Planta", heating: "Calefacción",
  propertyName: "Nombre del inmueble", propertyType: "Tipo", postalCode: "Código postal", city: "Ciudad",
  address: "Dirección", building: "Edificio / Residencia", lotNumber: "Nº de unidad", notes: "Notas",
  guarantor: "Nombre del avalista", guarantorPhone: "Tel. avalista", nationality: "Nacionalidad",
  profession: "Profesión", birthDate: "Fecha de nacimiento", birthPlace: "Lugar de nacimiento",
  fullName: "Nombre completo", email: "Email", phone: "Teléfono",
  selectProperty: "— Seleccionar inmueble —", addProperty: "Añadir inmueble", addTenant: "Añadir inquilino",
  editProperty: "Editar inmueble", editTenant: "Editar inquilino", save: "Guardar",
  active: "Activo", terminated: "Finalizado", all: "Todos", paid: "Pagado", unpaid: "Impago",
  overview: "Resumen", payments: "Alquileres y Pagos", inventory: "Inspecciones",
  rentTracking: "Seguimiento de alquileres", monthCalls: "Llamadas del mes", allProperties: "Todos los inmuebles",
  noProperty: "Ningún inmueble", noTenant: "Ningún inquilino",
  rentalManagement: "Gestión de alquileres", rentalDesc: "Inmuebles, inquilinos, contratos, recibos, pagos — todo en un solo lugar.",
  occupied: "Ocupados", revenueMonth: "Ingresos/mes", unpaidCount: "Impagos", vacant: "vacante",
  quickActions: "Acciones rápidas", generateReceipt: "Generar recibo",
  housingBenefit: "Ayuda vivienda",
};

const deLabels: typeof frLabels = {
  property: "Objekt", properties: "Objekte", tenant: "Mieter", tenants: "Mieter",
  rent: "Kaltmiete", charges: "Nebenkosten", deposit: "Kaution", furnished: "Möbliert",
  leaseStart: "Mietbeginn", leaseEnd: "Mietende", leaseType: "Vertragsart",
  surface: "Fläche", rooms: "Zimmer", floor: "Stockwerk", heating: "Heizung",
  propertyName: "Objektname", propertyType: "Typ", postalCode: "PLZ", city: "Stadt",
  address: "Adresse", building: "Gebäude / Anlage", lotNumber: "Einheitsnummer", notes: "Notizen",
  guarantor: "Bürge", guarantorPhone: "Tel. Bürge", nationality: "Staatsangehörigkeit",
  profession: "Beruf", birthDate: "Geburtsdatum", birthPlace: "Geburtsort",
  fullName: "Vollständiger Name", email: "E-Mail", phone: "Telefon",
  selectProperty: "— Objekt wählen —", addProperty: "Objekt hinzufügen", addTenant: "Mieter hinzufügen",
  editProperty: "Objekt bearbeiten", editTenant: "Mieter bearbeiten", save: "Speichern",
  active: "Aktiv", terminated: "Beendet", all: "Alle", paid: "Bezahlt", unpaid: "Unbezahlt",
  overview: "Übersicht", payments: "Mieten & Zahlungen", inventory: "Übergabeprotokolle",
  rentTracking: "Mietverfolgung", monthCalls: "Monatliche Aufrufe", allProperties: "Alle Objekte",
  noProperty: "Kein Objekt", noTenant: "Kein Mieter",
  rentalManagement: "Mietverwaltung", rentalDesc: "Objekte, Mieter, Verträge, Quittungen, Zahlungen — alles an einem Ort.",
  occupied: "Belegt", revenueMonth: "Einnahmen/Monat", unpaidCount: "Ausstehend", vacant: "leer",
  quickActions: "Schnellaktionen", generateReceipt: "Quittung erstellen",
  housingBenefit: "Wohngeld",
};

const itLabels: typeof frLabels = {
  property: "Immobile", properties: "Immobili", tenant: "Inquilino", tenants: "Inquilini",
  rent: "Canone", charges: "Spese", deposit: "Cauzione", furnished: "Arredato",
  leaseStart: "Inizio contratto", leaseEnd: "Fine contratto", leaseType: "Tipo contratto",
  surface: "Superficie", rooms: "Stanze", floor: "Piano", heating: "Riscaldamento",
  propertyName: "Nome immobile", propertyType: "Tipo", postalCode: "CAP", city: "Città",
  address: "Indirizzo", building: "Edificio / Complesso", lotNumber: "N° unità", notes: "Note",
  guarantor: "Nome garante", guarantorPhone: "Tel. garante", nationality: "Nazionalità",
  profession: "Professione", birthDate: "Data di nascita", birthPlace: "Luogo di nascita",
  fullName: "Nome completo", email: "Email", phone: "Telefono",
  selectProperty: "— Selezionare immobile —", addProperty: "Aggiungi immobile", addTenant: "Aggiungi inquilino",
  editProperty: "Modifica immobile", editTenant: "Modifica inquilino", save: "Salva",
  active: "Attivo", terminated: "Terminato", all: "Tutti", paid: "Pagato", unpaid: "Non pagato",
  overview: "Panoramica", payments: "Affitti e Pagamenti", inventory: "Verbali",
  rentTracking: "Monitoraggio affitti", monthCalls: "Richieste del mese", allProperties: "Tutti gli immobili",
  noProperty: "Nessun immobile", noTenant: "Nessun inquilino",
  rentalManagement: "Gestione locazioni", rentalDesc: "Immobili, inquilini, contratti, ricevute, pagamenti — tutto in un unico posto.",
  occupied: "Occupati", revenueMonth: "Entrate/mese", unpaidCount: "Insoluti", vacant: "vacante",
  quickActions: "Azioni rapide", generateReceipt: "Genera ricevuta",
  housingBenefit: "Sussidio abitativo",
};

const ptLabels: typeof frLabels = {
  property: "Imóvel", properties: "Imóveis", tenant: "Inquilino", tenants: "Inquilinos",
  rent: "Renda", charges: "Encargos", deposit: "Caução", furnished: "Mobilado",
  leaseStart: "Início contrato", leaseEnd: "Fim contrato", leaseType: "Tipo de contrato",
  surface: "Área", rooms: "Divisões", floor: "Andar", heating: "Aquecimento",
  propertyName: "Nome do imóvel", propertyType: "Tipo", postalCode: "Código postal", city: "Cidade",
  address: "Morada", building: "Edifício / Condomínio", lotNumber: "Nº fração", notes: "Notas",
  guarantor: "Nome do fiador", guarantorPhone: "Tel. fiador", nationality: "Nacionalidade",
  profession: "Profissão", birthDate: "Data de nascimento", birthPlace: "Naturalidade",
  fullName: "Nome completo", email: "Email", phone: "Telefone",
  selectProperty: "— Selecionar imóvel —", addProperty: "Adicionar imóvel", addTenant: "Adicionar inquilino",
  editProperty: "Editar imóvel", editTenant: "Editar inquilino", save: "Guardar",
  active: "Ativo", terminated: "Terminado", all: "Todos", paid: "Pago", unpaid: "Em dívida",
  overview: "Resumo", payments: "Rendas e Pagamentos", inventory: "Vistorias",
  rentTracking: "Acompanhamento de rendas", monthCalls: "Chamadas do mês", allProperties: "Todos os imóveis",
  noProperty: "Nenhum imóvel", noTenant: "Nenhum inquilino",
  rentalManagement: "Gestão de arrendamento", rentalDesc: "Imóveis, inquilinos, contratos, recibos, pagamentos — tudo num só lugar.",
  occupied: "Ocupados", revenueMonth: "Receita/mês", unpaidCount: "Em atraso", vacant: "vago",
  quickActions: "Ações rápidas", generateReceipt: "Gerar recibo",
  housingBenefit: "Subsídio habitação",
};

/* ─── Property types per language group ─── */
const frPropertyTypes = [
  { value: "apartment", label: "Appartement" },
  { value: "house", label: "Maison" },
  { value: "studio", label: "Studio" },
  { value: "commercial", label: "Local commercial" },
  { value: "parking", label: "Parking / Garage" },
];
const enPropertyTypes = [
  { value: "apartment", label: "Apartment / Flat" },
  { value: "house", label: "House" },
  { value: "studio", label: "Studio" },
  { value: "commercial", label: "Commercial premises" },
  { value: "parking", label: "Parking / Garage" },
];
const esPropertyTypes = [
  { value: "apartment", label: "Piso / Apartamento" },
  { value: "house", label: "Casa" },
  { value: "studio", label: "Estudio" },
  { value: "commercial", label: "Local comercial" },
  { value: "parking", label: "Parking / Garaje" },
];
const dePropertyTypes = [
  { value: "apartment", label: "Wohnung" },
  { value: "house", label: "Haus" },
  { value: "studio", label: "Einzimmerwohnung" },
  { value: "commercial", label: "Gewerberaum" },
  { value: "parking", label: "Stellplatz / Garage" },
];
const itPropertyTypes = [
  { value: "apartment", label: "Appartamento" },
  { value: "house", label: "Casa" },
  { value: "studio", label: "Monolocale" },
  { value: "commercial", label: "Locale commerciale" },
  { value: "parking", label: "Posto auto / Garage" },
];
const ptPropertyTypes = [
  { value: "apartment", label: "Apartamento" },
  { value: "house", label: "Moradia" },
  { value: "studio", label: "Estúdio" },
  { value: "commercial", label: "Espaço comercial" },
  { value: "parking", label: "Estacionamento / Garagem" },
];

/* ─── Heating types per language group ─── */
const frHeatingTypes = [
  { value: "individual-gas", label: "Individuel gaz" },
  { value: "individual-electric", label: "Individuel électrique" },
  { value: "collective", label: "Collectif" },
  { value: "heat-pump", label: "Pompe à chaleur" },
  { value: "other", label: "Autre" },
];
const enHeatingTypes = [
  { value: "individual-gas", label: "Individual gas" },
  { value: "individual-electric", label: "Individual electric" },
  { value: "collective", label: "Central / Collective" },
  { value: "heat-pump", label: "Heat pump" },
  { value: "other", label: "Other" },
];
const esHeatingTypes = [
  { value: "individual-gas", label: "Gas individual" },
  { value: "individual-electric", label: "Eléctrico individual" },
  { value: "collective", label: "Central / Colectivo" },
  { value: "heat-pump", label: "Bomba de calor" },
  { value: "other", label: "Otro" },
];
const deHeatingTypes = [
  { value: "individual-gas", label: "Einzelgas" },
  { value: "individual-electric", label: "Einzelelektrisch" },
  { value: "collective", label: "Zentralheizung" },
  { value: "heat-pump", label: "Wärmepumpe" },
  { value: "other", label: "Sonstige" },
];
const itHeatingTypes = [
  { value: "individual-gas", label: "Gas autonomo" },
  { value: "individual-electric", label: "Elettrico autonomo" },
  { value: "collective", label: "Centralizzato" },
  { value: "heat-pump", label: "Pompa di calore" },
  { value: "other", label: "Altro" },
];
const ptHeatingTypes = [
  { value: "individual-gas", label: "Gás individual" },
  { value: "individual-electric", label: "Elétrico individual" },
  { value: "collective", label: "Central / Coletivo" },
  { value: "heat-pump", label: "Bomba de calor" },
  { value: "other", label: "Outro" },
];

/* ─── Lease types per language group ─── */
const frLeaseTypes = [
  { value: "empty", label: "Bail vide" },
  { value: "furnished", label: "Bail meublé" },
  { value: "commercial", label: "Bail commercial" },
];
const enLeaseTypes = [
  { value: "empty", label: "Unfurnished tenancy" },
  { value: "furnished", label: "Furnished tenancy" },
  { value: "commercial", label: "Commercial lease" },
];
const esLeaseTypes = [
  { value: "empty", label: "Sin amueblar" },
  { value: "furnished", label: "Amueblado" },
  { value: "commercial", label: "Local comercial" },
];
const deLeaseTypes = [
  { value: "empty", label: "Unmöbliert" },
  { value: "furnished", label: "Möbliert" },
  { value: "commercial", label: "Gewerbe" },
];
const itLeaseTypes = [
  { value: "empty", label: "Non arredato" },
  { value: "furnished", label: "Arredato" },
  { value: "commercial", label: "Commerciale" },
];
const ptLeaseTypes = [
  { value: "empty", label: "Sem mobília" },
  { value: "furnished", label: "Mobilado" },
  { value: "commercial", label: "Comercial" },
];

/* ─── Currency symbols ─── */
const CURRENCY_SYMBOLS: Record<string, string> = {
  EUR: "€", USD: "$", GBP: "£", CHF: "CHF", CAD: "CA$", AUD: "A$",
  BRL: "R$", MXN: "MX$", MAD: "MAD", TND: "TND", XOF: "CFA",
  ZAR: "R", AED: "AED", SAR: "SAR", TRY: "₺", JPY: "¥", SGD: "S$",
  SEK: "kr", NOK: "kr", DKK: "kr", PLN: "zł", CZK: "Kč", HUF: "Ft",
  RON: "lei", HRK: "kn", BGN: "лв",
};

/* ─── Nationality defaults ─── */
const NATIONALITY_MAP: Record<string, string> = {
  FR: "Française", BE: "Belge", ES: "Española", IT: "Italiana", DE: "Deutsch",
  PT: "Portuguesa", GB: "British", CH: "Suisse", NL: "Nederlandse", AT: "Österreichisch",
  LU: "Luxembourgeoise", IE: "Irish", US: "American", CA: "Canadian",
  MA: "Marocaine", TN: "Tunisienne", SN: "Sénégalaise", CI: "Ivoirienne",
  BR: "Brasileira", MX: "Mexicana", JP: "日本", PL: "Polska", SE: "Svensk",
  DK: "Dansk", NO: "Norsk", FI: "Suomalainen", GR: "Ελληνική",
  CZ: "Česká", RO: "Română", HU: "Magyar", HR: "Hrvatska", BG: "Българска", SK: "Slovenská",
};

/* ─── Surface unit ─── */
const SURFACE_UNITS: Record<string, string> = {
  US: "sq ft", GB: "sq ft", CA: "sq ft",
};

import { COUNTRY_CURRENCY_MAP } from "@/lib/i18n";

/* ─── Locale group from country ─── */
function getLocaleGroup(country: string): "fr" | "en" | "es" | "de" | "it" | "pt" {
  const frGroup = ["FR", "BE", "CH", "LU", "MC", "SN", "CI", "MA", "TN"];
  const esGroup = ["ES", "MX", "AR", "CL", "CO", "PE"];
  const deGroup = ["DE", "AT"];
  const itGroup = ["IT"];
  const ptGroup = ["PT", "BR"];
  if (frGroup.includes(country)) return "fr";
  if (esGroup.includes(country)) return "es";
  if (deGroup.includes(country)) return "de";
  if (itGroup.includes(country)) return "it";
  if (ptGroup.includes(country)) return "pt";
  return "en";
}

export function getCountryConfig(country: string): CountryConfig {
  const group = getLocaleGroup(country);
  const currency = COUNTRY_CURRENCY_MAP[country] || "EUR";
  const currencySymbol = CURRENCY_SYMBOLS[currency] || currency;

  const labelsMap = { fr: frLabels, en: enLabels, es: esLabels, de: deLabels, it: itLabels, pt: ptLabels };
  const propertyTypesMap = { fr: frPropertyTypes, en: enPropertyTypes, es: esPropertyTypes, de: dePropertyTypes, it: itPropertyTypes, pt: ptPropertyTypes };
  const heatingTypesMap = { fr: frHeatingTypes, en: enHeatingTypes, es: esHeatingTypes, de: deHeatingTypes, it: itHeatingTypes, pt: ptHeatingTypes };
  const leaseTypesMap = { fr: frLeaseTypes, en: enLeaseTypes, es: esLeaseTypes, de: deLeaseTypes, it: itLeaseTypes, pt: ptLeaseTypes };

  const localeMap: Record<string, string> = {
    fr: "fr-FR", en: "en-US", es: "es-ES", de: "de-DE", it: "it-IT", pt: "pt-PT",
  };

  return {
    code: country,
    currency,
    currencySymbol,
    locale: localeMap[group] || "en-US",
    propertyTypes: propertyTypesMap[group],
    heatingTypes: heatingTypesMap[group],
    leaseTypes: leaseTypesMap[group],
    labels: labelsMap[group],
    defaultNationality: NATIONALITY_MAP[country] || "",
    surfaceUnit: SURFACE_UNITS[country] || "m²",
  };
}

/** Format a number as currency for the given country */
export function formatCurrency(amount: number, country: string): string {
  const cfg = getCountryConfig(country);
  try {
    return new Intl.NumberFormat(cfg.locale, { style: "currency", currency: cfg.currency }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${cfg.currencySymbol}`;
  }
}
