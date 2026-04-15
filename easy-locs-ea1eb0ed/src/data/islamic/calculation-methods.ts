export interface CalculationMethod {
  id: number;
  name: string;
  label: string;
  countries: string[];
}

export const CALCULATION_METHODS: CalculationMethod[] = [
  { id: 2, name: "ISNA", label: "Islamic Society of North America", countries: ["US", "CA"] },
  { id: 3, name: "MWL", label: "Muslim World League", countries: ["EU", "GB", "DE", "NL", "BE"] },
  { id: 5, name: "Egyptian", label: "Egyptian General Authority of Survey", countries: ["EG", "SD", "LY"] },
  { id: 1, name: "Karachi", label: "University of Islamic Sciences, Karachi", countries: ["PK", "BD", "IN", "AF"] },
  { id: 4, name: "Makkah", label: "Umm al-Qura University, Makkah", countries: ["SA", "QA", "BH", "OM", "YE", "KW"] },
  { id: 7, name: "Tehran", label: "Institute of Geophysics, Tehran", countries: ["IR"] },
  { id: 8, name: "Gulf", label: "Gulf Region", countries: ["AE"] },
  { id: 9, name: "Kuwait", label: "Kuwait", countries: ["KW"] },
  { id: 10, name: "Qatar", label: "Qatar", countries: ["QA"] },
  { id: 11, name: "Singapore", label: "MUIS, Singapore", countries: ["SG", "MY", "BN"] },
  { id: 12, name: "France", label: "Union des Organisations Islamiques de France", countries: ["FR"] },
  { id: 13, name: "Turkey", label: "Diyanet İşleri Başkanlığı, Turkey", countries: ["TR"] },
  { id: 14, name: "Russia", label: "Spiritual Administration of Muslims of Russia", countries: ["RU"] },
  { id: 15, name: "Moonsighting", label: "Moonsighting Committee Worldwide", countries: [] },
  { id: 0, name: "Shia", label: "Shia Ithna-Ashari, Leva Institute, Qum", countries: [] },
];

export const ASR_METHODS = [
  { id: 0, name: "Shafi'i / Hanbali / Maliki", label: "Standard (ombre = objet)" },
  { id: 1, name: "Hanafi", label: "Hanafi (ombre = 2× objet)" },
];

const COUNTRY_METHOD_MAP: Record<string, number> = {
  US: 2, CA: 2,
  KW: 9, QA: 10,
  AE: 8,
  SA: 4, BH: 4, OM: 4, YE: 4,
  EG: 5, SD: 5, LY: 5,
  PK: 1, BD: 1, IN: 1, AF: 1,
  IR: 7,
  SG: 11, MY: 11, BN: 11,
  FR: 12,
  TR: 13,
  RU: 14,
  GB: 3, DE: 3, NL: 3, BE: 3,
};

export function getDefaultMethod(country: string): number {
  const upper = country.toUpperCase();
  return COUNTRY_METHOD_MAP[upper] ?? 3;
}

export function getDefaultAsrMethod(country: string): number {
  const hanafi = ["PK", "BD", "IN", "AF", "TR"];
  return hanafi.includes(country.toUpperCase()) ? 1 : 0;
}
