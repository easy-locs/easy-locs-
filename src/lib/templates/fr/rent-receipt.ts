import type { DocumentTemplate } from "../types";

export const frRentReceipt: DocumentTemplate = {
  id: "fr-rent-receipt",
  version: "2.0.0",
  country: "FR",
  category: "rental",
  docType: "rent-receipt",
  label: "Quittance de loyer",
  description: "Quittance de loyer conforme à la loi du 6 juillet 1989, avec détail loyer/charges.",
  legalBasis: "Loi n° 89-462 du 6 juillet 1989, art. 21",
  needsLegalReview: false,
  active: true,
  fields: [
    // Bailleur
    { key: "landlordName", label: "Nom du bailleur", type: "text", required: true, validation: { minLength: 2, maxLength: 100 }, group: "Bailleur" },
    { key: "landlordAddress", label: "Adresse du bailleur", type: "text", required: false, group: "Bailleur" },
    // Locataire
    { key: "tenantName", label: "Nom du locataire", type: "text", required: true, validation: { minLength: 2, maxLength: 100 }, group: "Locataire" },
    // Bien
    { key: "propertyAddress", label: "Adresse du bien", type: "text", required: true, validation: { minLength: 5, maxLength: 200 }, group: "Bien" },
    // Montants
    { key: "rentAmount", label: "Loyer hors charges (€)", type: "number", required: true, validation: { min: 1, max: 100000 }, group: "Montants" },
    { key: "chargesAmount", label: "Charges (€)", type: "number", required: true, validation: { min: 0, max: 50000 }, defaultValue: 0, group: "Montants" },
    // Période
    { key: "periodStart", label: "Début de période", type: "date", required: true, group: "Période" },
    { key: "periodEnd", label: "Fin de période", type: "date", required: true, group: "Période" },
    { key: "paymentDate", label: "Date de paiement", type: "date", required: true, group: "Période" },
    { key: "paymentMethod", label: "Mode de paiement", type: "select", required: false, options: [
      { value: "virement", label: "Virement bancaire" },
      { value: "cheque", label: "Chèque" },
      { value: "especes", label: "Espèces" },
      { value: "prelevement", label: "Prélèvement automatique" },
    ], group: "Période" },
  ],
  clauses: [
    {
      id: "receipt-header",
      label: "Quittance de loyer",
      required: true,
      text: "QUITTANCE DE LOYER\n\nBailleur : {landlordName}\nAdresse : {landlordAddress}\n\nLocataire : {tenantName}\nLogement : {propertyAddress}",
    },
    {
      id: "receipt-detail",
      label: "Détail du règlement",
      required: true,
      text: "Période : du {periodStart} au {periodEnd}\n\nDétail :\n• Loyer hors charges : {rentAmount}\n• Provisions pour charges : {chargesAmount}\n• TOTAL : {total}\n\nDate de paiement : {paymentDate}\nMode de paiement : {paymentMethod}\n\nCette quittance atteste du paiement effectif du loyer et des charges pour la période indiquée.",
    },
    {
      id: "receipt-declaration",
      label: "Déclaration de réception",
      required: true,
      text: "Je soussigné(e) {landlordName}, propriétaire du logement situé au {propertyAddress}, déclare avoir reçu de {tenantName} la somme de {total} au titre du loyer et des charges pour la période du {periodStart} au {periodEnd}.\n\nCette quittance est délivrée conformément à l'article 21 de la loi n° 89-462 du 6 juillet 1989. Elle ne préjuge pas du paiement des termes précédents éventuellement restés impayés.",
    },
    {
      id: "receipt-cancellation",
      label: "Réserve de droits",
      required: true,
      text: "La présente quittance annule tous les reçus qui auraient pu être établis précédemment pour la même période. Elle est délivrée sous réserve de tous droits et sans préjudice.\n\nConservez ce document : il constitue une pièce justificative de paiement.",
    },
  ],
};
