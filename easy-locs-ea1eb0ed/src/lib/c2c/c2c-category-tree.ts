export type C2CAttributeType = "text" | "number" | "select" | "boolean" | "multi-select";

export interface C2CAttributeField {
  key: string;
  label: string;
  type: C2CAttributeType;
  required: boolean;
  options?: string[];
  unit?: string;
  min?: number;
  max?: number;
  placeholder?: string;
}

export interface C2CSubcategory {
  value: string;
  label: string;
  emoji: string;
  attributes: C2CAttributeField[];
}

export interface C2CCategory {
  key: string;
  label: string;
  emoji: string;
  subcategories: C2CSubcategory[];
}

export function getAttributeSchema(categoryKey: string, subcategoryValue: string): C2CAttributeField[] {
  const cat = C2C_CATEGORY_TREE.find(c => c.key === categoryKey);
  if (!cat) return [];
  const sub = cat.subcategories.find(s => s.value === subcategoryValue);
  return sub?.attributes ?? [];
}

export function findC2CCategory(key: string): C2CCategory | undefined {
  return C2C_CATEGORY_TREE.find(c => c.key === key);
}

export function findC2CSubcategory(subcategoryValue: string): { category: C2CCategory; subcategory: C2CSubcategory } | undefined {
  for (const cat of C2C_CATEGORY_TREE) {
    const sub = cat.subcategories.find(s => s.value === subcategoryValue);
    if (sub) return { category: cat, subcategory: sub };
  }
  return undefined;
}

export function getAllC2CSubcategoryValues(): string[] {
  return C2C_CATEGORY_TREE.flatMap(c => c.subcategories.map(s => s.value));
}

const vehicleBaseAttrs: C2CAttributeField[] = [
  { key: "marque", label: "Marque", type: "text", required: true, placeholder: "Ex: BMW, Peugeot..." },
  { key: "modele", label: "Modèle", type: "text", required: true, placeholder: "Ex: Série 3, 308..." },
  { key: "annee", label: "Année", type: "number", required: true, min: 1950, max: 2027 },
  { key: "kilometrage", label: "Kilométrage", type: "number", required: false, unit: "km" },
  { key: "carburant", label: "Carburant", type: "select", required: false, options: ["Essence", "Diesel", "Électrique", "Hybride", "GPL", "Autre"] },
  { key: "boite", label: "Boîte de vitesse", type: "select", required: false, options: ["Manuelle", "Automatique", "Semi-auto"] },
  { key: "puissance", label: "Puissance fiscale", type: "number", required: false, unit: "CV" },
  { key: "couleur", label: "Couleur", type: "text", required: false },
  { key: "nb_portes", label: "Nombre de portes", type: "select", required: false, options: ["2", "3", "4", "5"] },
];

const immobilierBaseAttrs: C2CAttributeField[] = [
  { key: "surface_m2", label: "Surface", type: "number", required: true, unit: "m²" },
  { key: "nb_pieces", label: "Nombre de pièces", type: "number", required: true },
  { key: "etage", label: "Étage", type: "number", required: false },
  { key: "meuble", label: "Meublé", type: "boolean", required: false },
  { key: "parking", label: "Parking", type: "boolean", required: false },
  { key: "balcon", label: "Balcon / Terrasse", type: "boolean", required: false },
  { key: "ascenseur", label: "Ascenseur", type: "boolean", required: false },
  { key: "dpe", label: "DPE", type: "select", required: false, options: ["A", "B", "C", "D", "E", "F", "G", "Vierge"] },
];

const electroniqueBaseAttrs: C2CAttributeField[] = [
  { key: "marque", label: "Marque", type: "text", required: true, placeholder: "Ex: Apple, Samsung..." },
  { key: "modele", label: "Modèle", type: "text", required: false },
  { key: "stockage", label: "Stockage", type: "select", required: false, options: ["16 Go", "32 Go", "64 Go", "128 Go", "256 Go", "512 Go", "1 To", "2 To", "Autre"] },
  { key: "etat_batterie", label: "État batterie", type: "select", required: false, options: ["Excellente", "Bonne", "Moyenne", "Faible"] },
  { key: "garantie", label: "Sous garantie", type: "boolean", required: false },
];

const modeBaseAttrs: C2CAttributeField[] = [
  { key: "taille", label: "Taille", type: "text", required: false, placeholder: "Ex: S, M, L, 42..." },
  { key: "marque", label: "Marque", type: "text", required: false },
  { key: "matiere", label: "Matière", type: "text", required: false },
  { key: "couleur", label: "Couleur", type: "text", required: false },
];

const maisonBaseAttrs: C2CAttributeField[] = [
  { key: "dimensions", label: "Dimensions", type: "text", required: false, placeholder: "L x l x H" },
  { key: "matiere", label: "Matière", type: "text", required: false },
  { key: "couleur", label: "Couleur", type: "text", required: false },
];

const loisirsBaseAttrs: C2CAttributeField[] = [
  { key: "taille", label: "Taille", type: "text", required: false },
  { key: "marque", label: "Marque", type: "text", required: false },
  { key: "discipline", label: "Discipline / Sport", type: "text", required: false },
];

const multimediaBaseAttrs: C2CAttributeField[] = [
  { key: "genre", label: "Genre", type: "text", required: false },
  { key: "format", label: "Format", type: "select", required: false, options: ["Livre", "DVD", "Blu-ray", "Vinyle", "CD", "Jeu vidéo", "Autre"] },
  { key: "langue", label: "Langue", type: "text", required: false },
];

const familleBaseAttrs: C2CAttributeField[] = [
  { key: "age_cible", label: "Âge cible", type: "text", required: false, placeholder: "Ex: 0-3 mois, 2-4 ans..." },
  { key: "taille", label: "Taille", type: "text", required: false },
];

const animauxBaseAttrs: C2CAttributeField[] = [
  { key: "race", label: "Race", type: "text", required: false },
  { key: "age", label: "Âge", type: "text", required: false },
  { key: "vaccine", label: "Vacciné", type: "boolean", required: false },
];

const emploiBaseAttrs: C2CAttributeField[] = [
  { key: "type_contrat", label: "Type de contrat", type: "select", required: false, options: ["CDI", "CDD", "Intérim", "Stage", "Freelance", "Autre"] },
  { key: "secteur", label: "Secteur d'activité", type: "text", required: false },
  { key: "salaire", label: "Salaire / Tarif", type: "text", required: false },
];

const materielProBaseAttrs: C2CAttributeField[] = [
  { key: "marque", label: "Marque", type: "text", required: false },
  { key: "etat", label: "État", type: "select", required: false, options: ["Neuf", "Comme neuf", "Bon état", "État correct", "Pour pièces"] },
  { key: "annee", label: "Année", type: "number", required: false },
];

const flexibleAttrs: C2CAttributeField[] = [
  { key: "details", label: "Détails supplémentaires", type: "text", required: false },
];

export const C2C_CATEGORY_TREE: C2CCategory[] = [
  {
    key: "vehicules",
    label: "Véhicules",
    emoji: "🚗",
    subcategories: [
      { value: "voitures", label: "Voitures", emoji: "🚗", attributes: vehicleBaseAttrs },
      { value: "motos", label: "Motos & Scooters", emoji: "🏍️", attributes: vehicleBaseAttrs.filter(a => a.key !== "nb_portes") },
      { value: "utilitaires", label: "Utilitaires", emoji: "🚐", attributes: vehicleBaseAttrs },
      { value: "bateaux", label: "Bateaux", emoji: "⛵", attributes: [
        { key: "marque", label: "Marque", type: "text", required: false },
        { key: "longueur", label: "Longueur", type: "number", required: false, unit: "m" },
        { key: "annee", label: "Année", type: "number", required: false },
        { key: "motorisation", label: "Motorisation", type: "text", required: false },
      ]},
      { value: "camping_cars", label: "Camping-cars", emoji: "🚌", attributes: vehicleBaseAttrs },
      { value: "pieces_auto", label: "Pièces auto", emoji: "🔧", attributes: [
        { key: "marque", label: "Marque compatible", type: "text", required: false },
        { key: "modele", label: "Modèle compatible", type: "text", required: false },
        { key: "type_piece", label: "Type de pièce", type: "text", required: true },
      ]},
    ],
  },
  {
    key: "immobilier",
    label: "Immobilier",
    emoji: "🏠",
    subcategories: [
      { value: "vente_appart", label: "Vente appartement", emoji: "🏢", attributes: immobilierBaseAttrs },
      { value: "vente_maison", label: "Vente maison", emoji: "🏡", attributes: immobilierBaseAttrs },
      { value: "location", label: "Location", emoji: "🔑", attributes: [...immobilierBaseAttrs, { key: "loyer_charges", label: "Charges comprises", type: "boolean", required: false }] },
      { value: "colocation", label: "Colocation", emoji: "👥", attributes: [...immobilierBaseAttrs, { key: "nb_colocataires", label: "Nombre de colocataires", type: "number", required: false }] },
      { value: "bureaux", label: "Bureaux & Commerces", emoji: "🏬", attributes: immobilierBaseAttrs },
      { value: "terrains", label: "Terrains", emoji: "🌍", attributes: [
        { key: "surface_m2", label: "Surface", type: "number", required: true, unit: "m²" },
        { key: "constructible", label: "Constructible", type: "boolean", required: false },
        { key: "viabilise", label: "Viabilisé", type: "boolean", required: false },
      ]},
    ],
  },
  {
    key: "electronique",
    label: "Électronique",
    emoji: "📱",
    subcategories: [
      { value: "telephones", label: "Téléphones", emoji: "📱", attributes: electroniqueBaseAttrs },
      { value: "ordinateurs", label: "Ordinateurs", emoji: "💻", attributes: [...electroniqueBaseAttrs, { key: "ram", label: "RAM", type: "select", required: false, options: ["4 Go", "8 Go", "16 Go", "32 Go", "64 Go", "Autre"] }] },
      { value: "tablettes", label: "Tablettes", emoji: "📟", attributes: electroniqueBaseAttrs },
      { value: "consoles", label: "Consoles & Jeux vidéo", emoji: "🎮", attributes: electroniqueBaseAttrs },
      { value: "tv_son", label: "TV & Son", emoji: "📺", attributes: [
        { key: "marque", label: "Marque", type: "text", required: false },
        { key: "taille_ecran", label: "Taille écran", type: "text", required: false, placeholder: 'Ex: 55"' },
        { key: "resolution", label: "Résolution", type: "select", required: false, options: ["HD", "Full HD", "4K", "8K", "Autre"] },
      ]},
      { value: "photo_video", label: "Photo & Vidéo", emoji: "📸", attributes: electroniqueBaseAttrs },
      { value: "accessoires_elec", label: "Accessoires", emoji: "🔌", attributes: [
        { key: "marque", label: "Marque", type: "text", required: false },
        { key: "compatible_avec", label: "Compatible avec", type: "text", required: false },
      ]},
    ],
  },
  {
    key: "mode",
    label: "Mode",
    emoji: "👗",
    subcategories: [
      { value: "vetements_femme", label: "Vêtements femme", emoji: "👗", attributes: modeBaseAttrs },
      { value: "vetements_homme", label: "Vêtements homme", emoji: "👔", attributes: modeBaseAttrs },
      { value: "chaussures", label: "Chaussures", emoji: "👟", attributes: [...modeBaseAttrs, { key: "pointure", label: "Pointure", type: "number", required: false }] },
      { value: "sacs", label: "Sacs & Maroquinerie", emoji: "👜", attributes: modeBaseAttrs },
      { value: "montres", label: "Montres", emoji: "⌚", attributes: [
        { key: "marque", label: "Marque", type: "text", required: true },
        { key: "mouvement", label: "Mouvement", type: "select", required: false, options: ["Quartz", "Automatique", "Mécanique", "Solaire"] },
        { key: "matiere_bracelet", label: "Matière bracelet", type: "text", required: false },
      ]},
      { value: "bijoux", label: "Bijoux", emoji: "💍", attributes: [
        { key: "matiere", label: "Matière", type: "select", required: false, options: ["Or", "Argent", "Platine", "Acier", "Fantaisie", "Autre"] },
        { key: "type_bijou", label: "Type", type: "select", required: false, options: ["Bague", "Collier", "Bracelet", "Boucles d'oreilles", "Autre"] },
      ]},
    ],
  },
  {
    key: "maison_jardin",
    label: "Maison & Jardin",
    emoji: "🏡",
    subcategories: [
      { value: "meubles", label: "Meubles", emoji: "🪑", attributes: maisonBaseAttrs },
      { value: "electromenager", label: "Électroménager", emoji: "🫙", attributes: [
        { key: "marque", label: "Marque", type: "text", required: false },
        { key: "etat_fonctionnement", label: "Fonctionne", type: "boolean", required: true },
        { key: "classe_energetique", label: "Classe énergie", type: "select", required: false, options: ["A+++", "A++", "A+", "A", "B", "C", "D"] },
      ]},
      { value: "decoration", label: "Décoration", emoji: "🎀", attributes: maisonBaseAttrs },
      { value: "bricolage", label: "Bricolage", emoji: "🔧", attributes: maisonBaseAttrs },
      { value: "jardinage", label: "Jardinage", emoji: "🌿", attributes: maisonBaseAttrs },
      { value: "luminaires", label: "Luminaires", emoji: "💡", attributes: maisonBaseAttrs },
    ],
  },
  {
    key: "loisirs_sports",
    label: "Loisirs & Sports",
    emoji: "⚽",
    subcategories: [
      { value: "velos", label: "Vélos", emoji: "🚲", attributes: [...loisirsBaseAttrs, { key: "type_velo", label: "Type", type: "select", required: false, options: ["VTT", "Route", "Ville", "Électrique", "BMX", "Enfant", "Autre"] }] },
      { value: "fitness", label: "Fitness & Musculation", emoji: "🏋️", attributes: loisirsBaseAttrs },
      { value: "sports_collectifs", label: "Sports collectifs", emoji: "⚽", attributes: loisirsBaseAttrs },
      { value: "camping_rando", label: "Camping & Randonnée", emoji: "⛺", attributes: loisirsBaseAttrs },
      { value: "instruments_musique", label: "Instruments de musique", emoji: "🎸", attributes: [
        { key: "type_instrument", label: "Type", type: "select", required: false, options: ["Guitare", "Piano/Clavier", "Batterie", "Violon", "Basse", "Cuivre", "Bois", "Autre"] },
        { key: "marque", label: "Marque", type: "text", required: false },
      ]},
      { value: "jeux_jouets", label: "Jeux & Jouets", emoji: "🧸", attributes: [
        { key: "age_recommande", label: "Âge recommandé", type: "text", required: false },
        { key: "marque", label: "Marque", type: "text", required: false },
      ]},
    ],
  },
  {
    key: "multimedia",
    label: "Multimédia",
    emoji: "📀",
    subcategories: [
      { value: "livres", label: "Livres", emoji: "📚", attributes: multimediaBaseAttrs },
      { value: "dvd_bluray", label: "DVD & Blu-ray", emoji: "💿", attributes: multimediaBaseAttrs },
      { value: "vinyles", label: "Vinyles", emoji: "🎵", attributes: multimediaBaseAttrs },
      { value: "jeux_video", label: "Jeux vidéo", emoji: "🎮", attributes: [
        { key: "plateforme", label: "Plateforme", type: "select", required: false, options: ["PS5", "PS4", "Xbox Series", "Xbox One", "Nintendo Switch", "PC", "Autre"] },
        { key: "genre", label: "Genre", type: "text", required: false },
      ]},
    ],
  },
  {
    key: "famille",
    label: "Famille",
    emoji: "👶",
    subcategories: [
      { value: "puericulture", label: "Puériculture", emoji: "🍼", attributes: familleBaseAttrs },
      { value: "vetements_enfant", label: "Vêtements enfant", emoji: "👕", attributes: familleBaseAttrs },
      { value: "jouets_enfant", label: "Jouets enfant", emoji: "🧸", attributes: familleBaseAttrs },
      { value: "materiel_scolaire", label: "Matériel scolaire", emoji: "📚", attributes: familleBaseAttrs },
    ],
  },
  {
    key: "animaux",
    label: "Animaux",
    emoji: "🐾",
    subcategories: [
      { value: "chiens", label: "Chiens", emoji: "🐕", attributes: animauxBaseAttrs },
      { value: "chats", label: "Chats", emoji: "🐈", attributes: animauxBaseAttrs },
      { value: "oiseaux", label: "Oiseaux", emoji: "🐦", attributes: animauxBaseAttrs },
      { value: "accessoires_animaux", label: "Accessoires animaux", emoji: "🦴", attributes: [
        { key: "type_animal", label: "Pour quel animal", type: "select", required: false, options: ["Chien", "Chat", "Oiseau", "Poisson", "Rongeur", "Reptile", "Autre"] },
      ]},
      { value: "alimentation_animaux", label: "Alimentation animaux", emoji: "🥣", attributes: [
        { key: "type_animal", label: "Pour quel animal", type: "select", required: false, options: ["Chien", "Chat", "Oiseau", "Poisson", "Rongeur", "Autre"] },
        { key: "poids", label: "Poids", type: "text", required: false },
      ]},
    ],
  },
  {
    key: "emploi_services",
    label: "Emploi & Services",
    emoji: "💼",
    subcategories: [
      { value: "offres_emploi", label: "Offres d'emploi", emoji: "📋", attributes: emploiBaseAttrs },
      { value: "demandes_emploi", label: "Demandes d'emploi", emoji: "🙋", attributes: emploiBaseAttrs },
      { value: "cours", label: "Cours particuliers", emoji: "📖", attributes: [
        { key: "matiere", label: "Matière", type: "text", required: true },
        { key: "niveau", label: "Niveau", type: "select", required: false, options: ["Primaire", "Collège", "Lycée", "Supérieur", "Adulte", "Tous niveaux"] },
        { key: "tarif_horaire", label: "Tarif horaire", type: "number", required: false },
      ]},
      { value: "aide_menagere", label: "Aide ménagère", emoji: "🧹", attributes: emploiBaseAttrs },
      { value: "garde_enfant", label: "Garde d'enfant", emoji: "👶", attributes: emploiBaseAttrs },
    ],
  },
  {
    key: "materiel_pro",
    label: "Matériel Pro",
    emoji: "🏗️",
    subcategories: [
      { value: "btp", label: "BTP", emoji: "🏗️", attributes: materielProBaseAttrs },
      { value: "agricole", label: "Agricole", emoji: "🚜", attributes: materielProBaseAttrs },
      { value: "restauration_pro", label: "Restauration", emoji: "🍳", attributes: materielProBaseAttrs },
      { value: "medical_pro", label: "Médical", emoji: "🏥", attributes: materielProBaseAttrs },
      { value: "informatique_pro", label: "Informatique pro", emoji: "🖥️", attributes: materielProBaseAttrs },
    ],
  },
  {
    key: "autres",
    label: "Autres",
    emoji: "📦",
    subcategories: [
      { value: "billetterie", label: "Billetterie", emoji: "🎫", attributes: [
        { key: "date_evenement", label: "Date de l'événement", type: "text", required: false },
        { key: "lieu", label: "Lieu", type: "text", required: false },
        { key: "nb_places", label: "Nombre de places", type: "number", required: false },
      ]},
      { value: "art", label: "Art", emoji: "🎨", attributes: [
        { key: "type_oeuvre", label: "Type d'œuvre", type: "select", required: false, options: ["Peinture", "Sculpture", "Photographie", "Gravure", "Dessin", "Autre"] },
        { key: "artiste", label: "Artiste", type: "text", required: false },
        { key: "dimensions", label: "Dimensions", type: "text", required: false },
      ]},
      { value: "collections", label: "Collections", emoji: "🏆", attributes: [
        { key: "type_collection", label: "Type", type: "text", required: false },
        { key: "epoque", label: "Époque / Année", type: "text", required: false },
      ]},
      { value: "divers", label: "Divers", emoji: "📦", attributes: flexibleAttrs },
    ],
  },
];

export const C2C_CONDITIONS = [
  { value: "new", label: "Neuf", emoji: "✨" },
  { value: "like_new", label: "Comme neuf", emoji: "👌" },
  { value: "good", label: "Bon état", emoji: "👍" },
  { value: "fair", label: "État correct", emoji: "🤏" },
  { value: "for_parts", label: "Pour pièces", emoji: "🔧" },
] as const;

export const C2C_PRICE_TYPES = [
  { value: "fixed", label: "Prix fixe", emoji: "💰" },
  { value: "negotiable", label: "Prix négociable", emoji: "🤝" },
  { value: "free", label: "Gratuit", emoji: "🎁" },
  { value: "exchange", label: "Échange", emoji: "🔄" },
  { value: "on_demand", label: "Prix sur demande", emoji: "❓" },
] as const;

export const C2C_DELIVERY_OPTIONS = [
  { value: "hand", label: "Remise en main propre", emoji: "🤝" },
  { value: "ship", label: "Envoi possible", emoji: "📦" },
  { value: "both", label: "Les deux", emoji: "✅" },
] as const;

export const C2C_REPORT_REASONS = [
  { value: "scam", label: "Arnaque" },
  { value: "inappropriate", label: "Contenu inapproprié" },
  { value: "duplicate", label: "Doublon" },
  { value: "prohibited", label: "Produit interdit" },
  { value: "other", label: "Autre" },
] as const;

export const PROHIBITED_KEYWORDS = [
  "arme", "armes", "pistolet", "fusil", "munition",
  "drogue", "cannabis", "cocaïne", "héroïne", "stupéfiant",
  "contrefaçon", "faux", "copie", "réplique",
  "volé", "volée", "volés",
  "faux papier", "faux document",
];
