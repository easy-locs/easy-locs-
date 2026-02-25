import type { DocumentTemplate } from "../types";

export const frLeaseFurnished: DocumentTemplate = {
  id: "fr-lease-furnished",
  version: "1.0.0",
  country: "FR",
  category: "rental",
  docType: "lease-furnished",
  label: "Bail meublé",
  description: "Contrat de bail meublé conforme à la loi ALUR et au décret n° 2015-981.",
  legalBasis: "Loi n° 89-462, art. 25-3 à 25-11 ; Décret n° 2015-981 du 31 juillet 2015",
  needsLegalReview: false,
  active: true,
  fields: [
    { key: "landlordName", label: "Nom du bailleur", type: "text", required: true, validation: { minLength: 2 } },
    { key: "landlordAddress", label: "Adresse du bailleur", type: "text", required: true, validation: { minLength: 5 } },
    { key: "tenantName", label: "Nom du locataire", type: "text", required: true, validation: { minLength: 2 } },
    { key: "propertyAddress", label: "Adresse du bien", type: "text", required: true, validation: { minLength: 5 } },
    { key: "propertyType", label: "Type de bien", type: "select", required: true, options: [
      { value: "Appartement meublé", label: "Appartement meublé" },
      { value: "Studio meublé", label: "Studio meublé" },
      { value: "Chambre meublée", label: "Chambre meublée" },
    ] },
    { key: "surface", label: "Surface habitable (m²)", type: "number", required: true, validation: { min: 9 } },
    { key: "rentAmount", label: "Loyer mensuel HC (€)", type: "number", required: true, validation: { min: 1 } },
    { key: "chargesAmount", label: "Provisions pour charges (€)", type: "number", required: true, validation: { min: 0 }, defaultValue: 0 },
    { key: "depositAmount", label: "Dépôt de garantie (€)", type: "number", required: true, validation: {
      min: 0,
      custom: (val, all) => {
        const deposit = Number(val);
        const rent = Number(all.rentAmount);
        if (rent > 0 && deposit > rent * 2) return "Pour un bail meublé, le dépôt ne peut excéder 2 mois de loyer HC.";
        return null;
      }
    } },
    { key: "startDate", label: "Date de début", type: "date", required: true },
    { key: "duration", label: "Durée", type: "select", required: true, options: [
      { value: "1", label: "1 an (standard)" },
      { value: "9", label: "9 mois (bail étudiant)" },
    ], defaultValue: "1" },
  ],
  clauses: [
    { id: "parties", label: "Article 1 — Parties", required: true, text: "Entre le bailleur {landlordName}, demeurant au {landlordAddress}, et le locataire {tenantName}." },
    { id: "object", label: "Article 2 — Objet", required: true, text: "Le bail porte sur un logement meublé de type {propertyType}, situé au {propertyAddress}, d'une surface de {surface} m²." },
    { id: "furniture", label: "Article 3 — Mobilier", required: true, text: "Le logement est loué meublé conformément au décret n° 2015-981 définissant les éléments de mobilier obligatoires." },
    { id: "duration", label: "Article 4 — Durée", required: true, text: "Le bail est consenti pour une durée de {duration} an(s) à compter du {startDate}." },
    { id: "rent", label: "Article 5 — Loyer", required: true, text: "Le loyer mensuel est de {rentAmount} € HC, charges de {chargesAmount} €." },
    { id: "deposit", label: "Article 6 — Dépôt", required: true, text: "Un dépôt de garantie de {depositAmount} € est versé à la signature." },
  ],
};
