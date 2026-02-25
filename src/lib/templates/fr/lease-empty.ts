import type { DocumentTemplate } from "../types";

const durationOptions = [
  { value: "3", label: "3 ans (personne physique)" },
  { value: "6", label: "6 ans (personne morale / SCI)" },
];

export const frLeaseEmpty: DocumentTemplate = {
  id: "fr-lease-empty",
  version: "1.0.0",
  country: "FR",
  category: "rental",
  docType: "lease-empty",
  label: "Bail d'habitation vide",
  description: "Contrat de bail non meublé conforme à la loi ALUR.",
  legalBasis: "Loi n° 89-462 du 6 juillet 1989 modifiée par la loi ALUR du 24 mars 2014",
  needsLegalReview: false,
  active: true,
  fields: [
    { key: "landlordName", label: "Nom du bailleur", type: "text", required: true, validation: { minLength: 2 } },
    { key: "landlordAddress", label: "Adresse du bailleur", type: "text", required: true, validation: { minLength: 5 } },
    { key: "tenantName", label: "Nom du locataire", type: "text", required: true, validation: { minLength: 2 } },
    { key: "propertyAddress", label: "Adresse du bien", type: "text", required: true, validation: { minLength: 5 } },
    { key: "propertyType", label: "Type de bien", type: "select", required: true, options: [
      { value: "Appartement", label: "Appartement" },
      { value: "Maison", label: "Maison" },
      { value: "Studio", label: "Studio" },
    ] },
    { key: "surface", label: "Surface habitable (m²)", type: "number", required: true, validation: { min: 9, max: 10000 } },
    { key: "rentAmount", label: "Loyer mensuel HC (€)", type: "number", required: true, validation: { min: 1 } },
    { key: "chargesAmount", label: "Provisions pour charges (€)", type: "number", required: true, validation: { min: 0 }, defaultValue: 0 },
    { key: "depositAmount", label: "Dépôt de garantie (€)", type: "number", required: true, validation: {
      min: 0,
      custom: (val, all) => {
        const deposit = Number(val);
        const rent = Number(all.rentAmount);
        if (rent > 0 && deposit > rent) return "Pour un bail vide, le dépôt ne peut excéder 1 mois de loyer HC.";
        return null;
      }
    } },
    { key: "startDate", label: "Date de début", type: "date", required: true },
    { key: "duration", label: "Durée (années)", type: "select", required: true, options: durationOptions, defaultValue: "3" },
  ],
  clauses: [
    { id: "parties", label: "Article 1 — Parties", required: true, text: "Entre le bailleur {landlordName}, demeurant au {landlordAddress}, et le locataire {tenantName}." },
    { id: "object", label: "Article 2 — Objet du bail", required: true, text: "Le présent bail porte sur un logement de type {propertyType}, situé au {propertyAddress}, d'une surface de {surface} m²." },
    { id: "duration", label: "Article 3 — Durée", required: true, text: "Le bail est consenti pour une durée de {duration} an(s) à compter du {startDate}." },
    { id: "rent", label: "Article 4 — Loyer et charges", required: true, text: "Le loyer mensuel est fixé à {rentAmount} € hors charges. Les provisions pour charges s'élèvent à {chargesAmount} €." },
    { id: "deposit", label: "Article 5 — Dépôt de garantie", required: true, text: "Un dépôt de garantie de {depositAmount} € est versé à la signature." },
  ],
};
