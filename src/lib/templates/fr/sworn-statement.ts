import type { DocumentTemplate } from "../types";

export const frSwornStatement: DocumentTemplate = {
  id: "fr-sworn-statement",
  version: "1.0.0",
  country: "FR",
  category: "administrative",
  docType: "sworn-statement",
  label: "Attestation sur l'honneur",
  description: "Déclaration solennelle utilisable pour diverses démarches administratives.",
  legalBasis: "Article 441-7 du Code pénal",
  needsLegalReview: false,
  active: true,
  fields: [
    { key: "fullName", label: "Nom complet", type: "text", required: true, validation: { minLength: 2, maxLength: 100 } },
    { key: "birthDate", label: "Date de naissance", type: "date", required: true },
    { key: "birthPlace", label: "Lieu de naissance", type: "text", required: true },
    { key: "address", label: "Adresse actuelle", type: "text", required: true, validation: { minLength: 5 } },
    { key: "statement", label: "Déclaration", type: "textarea", required: true, placeholder: "Je soussigné(e) certifie sur l'honneur que…", validation: { minLength: 10, maxLength: 2000 } },
  ],
  clauses: [
    { id: "declaration", label: "Déclaration", required: true, text: "Je soussigné(e) {fullName}, né(e) le {birthDate} à {birthPlace}, demeurant au {address}, atteste sur l'honneur que : {statement}" },
    { id: "penal-warning", label: "Avertissement pénal", required: true, text: "Je suis informé(e) que toute fausse déclaration de ma part m'expose à des sanctions pénales prévues par l'article 441-7 du Code pénal (un an d'emprisonnement et 15 000 euros d'amende)." },
  ],
};
