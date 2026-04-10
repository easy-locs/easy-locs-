import type { DocumentTemplate } from "../types";

export const frChangeDirector: DocumentTemplate = {
  id: "fr-change-director",
  version: "1.0.0",
  country: "FR",
  category: "company",
  docType: "change-director",
  label: "Changement de dirigeant",
  description: "Procès-verbal de décision pour le changement de dirigeant.",
  legalBasis: "Code de commerce",
  needsLegalReview: false,
  active: true,
  fields: [
    { key: "companyName", label: "Dénomination sociale", type: "text", required: true },
    { key: "companyForm", label: "Forme juridique", type: "select", required: true, options: [
      { value: "SAS", label: "SAS" }, { value: "SARL", label: "SARL" }, { value: "SCI", label: "SCI" },
    ] },
    { key: "registeredOffice", label: "Siège social", type: "text", required: true },
    { key: "siret", label: "SIRET", type: "text", required: true },
    { key: "outgoingName", label: "Dirigeant sortant", type: "text", required: true },
    { key: "incomingName", label: "Nouveau dirigeant", type: "text", required: true },
    { key: "incomingAddress", label: "Adresse du nouveau dirigeant", type: "text", required: true },
    { key: "effectiveDate", label: "Date d'effet", type: "date", required: true },
    { key: "decisionDate", label: "Date de la décision", type: "date", required: true },
  ],
  clauses: [
    { id: "resolution", label: "Résolution", required: true, text: "L'assemblée décide de mettre fin aux fonctions de {outgoingName} et de nommer {incomingName}, demeurant au {incomingAddress}, en qualité de dirigeant à compter du {effectiveDate}." },
  ],
};

export const frChangeOffice: DocumentTemplate = {
  id: "fr-change-office",
  version: "1.0.0",
  country: "FR",
  category: "company",
  docType: "change-office",
  label: "Transfert de siège social",
  description: "Procès-verbal de décision pour le transfert du siège social.",
  legalBasis: "Code de commerce",
  needsLegalReview: false,
  active: true,
  fields: [
    { key: "companyName", label: "Dénomination sociale", type: "text", required: true },
    { key: "companyForm", label: "Forme juridique", type: "select", required: true, options: [
      { value: "SAS", label: "SAS" }, { value: "SARL", label: "SARL" }, { value: "SCI", label: "SCI" },
    ] },
    { key: "siret", label: "SIRET", type: "text", required: true },
    { key: "oldAddress", label: "Ancien siège social", type: "text", required: true },
    { key: "newAddress", label: "Nouveau siège social", type: "text", required: true },
    { key: "effectiveDate", label: "Date d'effet", type: "date", required: true },
    { key: "decisionDate", label: "Date de la décision", type: "date", required: true },
  ],
  clauses: [
    { id: "resolution", label: "Résolution", required: true, text: "L'assemblée décide de transférer le siège social de {oldAddress} à {newAddress}, à compter du {effectiveDate}. L'article des statuts relatif au siège social est modifié en conséquence." },
  ],
};

export const frChangeActivity: DocumentTemplate = {
  id: "fr-change-activity",
  version: "1.0.0",
  country: "FR",
  category: "company",
  docType: "change-activity",
  label: "Modification d'activité",
  description: "Procès-verbal de décision pour la modification de l'objet social.",
  legalBasis: "Code de commerce",
  needsLegalReview: false,
  active: true,
  fields: [
    { key: "companyName", label: "Dénomination sociale", type: "text", required: true },
    { key: "companyForm", label: "Forme juridique", type: "select", required: true, options: [
      { value: "SAS", label: "SAS" }, { value: "SARL", label: "SARL" }, { value: "SCI", label: "SCI" },
    ] },
    { key: "siret", label: "SIRET", type: "text", required: true },
    { key: "oldActivity", label: "Ancien objet social", type: "textarea", required: true },
    { key: "newActivity", label: "Nouvel objet social", type: "textarea", required: true },
    { key: "decisionDate", label: "Date de la décision", type: "date", required: true },
  ],
  clauses: [
    { id: "resolution", label: "Résolution", required: true, text: "L'assemblée décide de modifier l'objet social comme suit : \n\nAncien objet : {oldActivity}\n\nNouvel objet : {newActivity}\n\nL'article des statuts est modifié en conséquence." },
  ],
};
