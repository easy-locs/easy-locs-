import type { DocumentTemplate } from "../types";

export const frRentReceipt: DocumentTemplate = {
  id: "fr-rent-receipt",
  version: "1.0.0",
  country: "FR",
  category: "rental",
  docType: "rent-receipt",
  label: "Quittance de loyer",
  description: "Quittance de loyer conforme à la loi du 6 juillet 1989.",
  legalBasis: "Loi n° 89-462 du 6 juillet 1989, art. 21",
  needsLegalReview: false,
  active: true,
  fields: [
    { key: "landlordName", label: "Nom du bailleur", type: "text", required: true, validation: { minLength: 2, maxLength: 100 } },
    { key: "tenantName", label: "Nom du locataire", type: "text", required: true, validation: { minLength: 2, maxLength: 100 } },
    { key: "propertyAddress", label: "Adresse du bien", type: "text", required: true, validation: { minLength: 5, maxLength: 200 } },
    { key: "rentAmount", label: "Loyer hors charges (€)", type: "number", required: true, validation: { min: 1, max: 100000 } },
    { key: "chargesAmount", label: "Charges (€)", type: "number", required: true, validation: { min: 0, max: 50000 }, defaultValue: 0 },
    { key: "periodStart", label: "Début de période", type: "date", required: true },
    { key: "periodEnd", label: "Fin de période", type: "date", required: true },
    { key: "paymentDate", label: "Date de paiement", type: "date", required: true },
  ],
  clauses: [
    {
      id: "receipt-declaration",
      label: "Déclaration de réception",
      required: true,
      text: "Je soussigné(e) {landlordName}, propriétaire du logement situé au {propertyAddress}, déclare avoir reçu de {tenantName} la somme de {total} au titre du loyer et des charges pour la période du {periodStart} au {periodEnd}.",
    },
    {
      id: "receipt-cancellation",
      label: "Annulation des précédents reçus",
      required: true,
      text: "Cette quittance annule tous les reçus qui auraient pu être établis précédemment pour la même période. Elle est délivrée sous réserve de tous droits et sans préjudice.",
    },
  ],
};
