// Liste des principaux Journaux d'Annonces Légales (JAL) habilités en France
// Source : Préfectures, arrêtés annuels d'habilitation

export interface JALPublisher {
  name: string;
  departments: string[]; // départements couverts
  website?: string;
  priceRange?: string; // fourchette indicative
}

export const JAL_PUBLISHERS: JALPublisher[] = [
  // Nationaux / Multi-départements
  { name: "Le Parisien / Aujourd'hui en France", departments: ["75", "77", "78", "91", "92", "93", "94", "95"], website: "https://annonces-legales.leparisien.fr" },
  { name: "Les Échos", departments: ["75", "92", "93", "94", "78", "91", "95"], website: "https://annonces-legales.lesechos.fr" },
  { name: "Le Figaro", departments: ["75", "92"], website: "https://annonces.lefigaro.fr" },
  { name: "Le Monde", departments: ["75"], website: "https://www.lemonde.fr" },
  { name: "Libération", departments: ["75"], website: "https://annonces.liberation.fr" },

  // Île-de-France
  { name: "Le Républicain", departments: ["91", "77"], website: "https://www.lerepublicain.net" },
  { name: "La Gazette du Val-d'Oise", departments: ["95"] },
  { name: "Le Courrier des Yvelines", departments: ["78"] },

  // Auvergne-Rhône-Alpes
  { name: "Le Progrès", departments: ["01", "42", "69", "71"], website: "https://annonces-legales.leprogres.fr" },
  { name: "Le Dauphiné Libéré", departments: ["07", "26", "38", "73", "74"], website: "https://annonces-legales.ledauphine.com" },
  { name: "La Tribune de Lyon", departments: ["69"], website: "https://www.tribunedelyon.fr" },
  { name: "Lyon Capitale", departments: ["69"] },
  { name: "Tout Lyon Affiches", departments: ["69"] },

  // Provence-Alpes-Côte d'Azur
  { name: "La Provence", departments: ["13", "84"], website: "https://annonces-legales.laprovence.com" },
  { name: "Nice-Matin", departments: ["06", "83"], website: "https://annonces-legales.nicematin.com" },
  { name: "La Marseillaise", departments: ["13", "30", "34", "84"] },
  { name: "Var-Matin", departments: ["83"] },

  // Occitanie
  { name: "La Dépêche du Midi", departments: ["09", "12", "31", "32", "46", "65", "81", "82"], website: "https://annonces-legales.ladepeche.fr" },
  { name: "Midi Libre", departments: ["11", "30", "34", "48", "66"], website: "https://annonces-legales.midilibre.fr" },
  { name: "L'Indépendant", departments: ["11", "66"] },

  // Nouvelle-Aquitaine
  { name: "Sud Ouest", departments: ["24", "33", "40", "47", "64"], website: "https://annonces-legales.sudouest.fr" },
  { name: "La Charente Libre", departments: ["16"] },
  { name: "La Nouvelle République", departments: ["36", "37", "41", "79", "86", "87"], website: "https://annonces-legales.lanouvellerepublique.fr" },

  // Bretagne
  { name: "Ouest-France", departments: ["22", "29", "35", "44", "49", "53", "56", "72", "85"], website: "https://annonces-legales.ouest-france.fr" },
  { name: "Le Télégramme", departments: ["22", "29", "56"], website: "https://annonces-legales.letelegramme.fr" },

  // Pays de la Loire
  { name: "Presse Océan", departments: ["44"] },

  // Normandie
  { name: "Paris Normandie", departments: ["27", "76"], website: "https://annonces-legales.parisnormandie.fr" },
  { name: "Liberté Le Bonhomme Libre", departments: ["14"] },

  // Hauts-de-France
  { name: "La Voix du Nord", departments: ["59", "62"], website: "https://annonces-legales.lavoixdunord.fr" },
  { name: "Le Courrier Picard", departments: ["60", "80"], website: "https://annonces-legales.courrier-picard.fr" },
  { name: "L'Union – L'Ardennais", departments: ["02", "08", "51"] },

  // Grand Est
  { name: "L'Est Républicain", departments: ["21", "25", "39", "54", "55", "57", "70", "88", "90"], website: "https://annonces-legales.estrepublicain.fr" },
  { name: "Dernières Nouvelles d'Alsace (DNA)", departments: ["67", "68"], website: "https://annonces-legales.dna.fr" },
  { name: "L'Alsace", departments: ["68"] },

  // Bourgogne-Franche-Comté
  { name: "Le Bien Public", departments: ["21"] },
  { name: "Le Journal de Saône-et-Loire", departments: ["71"] },

  // Centre-Val de Loire
  { name: "La République du Centre", departments: ["28", "45"] },
  { name: "Le Berry Républicain", departments: ["18", "36"] },

  // Corse
  { name: "Corse-Matin", departments: ["2A", "2B"] },

  // DOM-TOM
  { name: "France-Antilles", departments: ["971", "972"] },
  { name: "Le Quotidien de la Réunion", departments: ["974"] },
];

export function getJALByDepartment(department: string): JALPublisher[] {
  return JAL_PUBLISHERS.filter(j => j.departments.includes(department));
}

export function getAllJALNames(): string[] {
  return [...new Set(JAL_PUBLISHERS.map(j => j.name))].sort();
}
