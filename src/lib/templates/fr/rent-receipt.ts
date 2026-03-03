import type { DocumentTemplate } from "../types";

export const frRentReceipt: DocumentTemplate = {
  id: "fr-rent-receipt",
  version: "3.0.0",
  country: "FR",
  category: "rental",
  docType: "rent-receipt",
  label: "Quittance de loyer",
  description: "Quittance de loyer conforme à la loi n° 89-462 du 6 juillet 1989, article 21.",
  legalBasis: "Loi n° 89-462 du 6 juillet 1989, art. 21",
  needsLegalReview: false,
  active: true,
  fields: [
    // Bailleur
    { key: "landlordName", label: "Nom du bailleur", type: "text", required: true, validation: { minLength: 2, maxLength: 100 }, group: "Bailleur" },
    { key: "landlordAddress", label: "Adresse complète du bailleur", type: "text", required: false, group: "Bailleur" },
    { key: "landlordSiret", label: "SIRET du bailleur (si applicable)", type: "text", required: false, group: "Bailleur" },
    // Locataire
    { key: "tenantName", label: "Nom du locataire", type: "text", required: true, validation: { minLength: 2, maxLength: 100 }, group: "Locataire" },
    { key: "tenantAddress", label: "Adresse du locataire (si différente)", type: "text", required: false, group: "Locataire" },
    // Bien
    { key: "propertyAddress", label: "Adresse complète du bien loué", type: "text", required: true, validation: { minLength: 5, maxLength: 200 }, group: "Bien" },
    { key: "propertyDescription", label: "Désignation du bien", type: "text", required: false, placeholder: "Appartement T3, 2ème étage gauche", group: "Bien" },
    // Montants
    { key: "rentAmount", label: "Loyer hors charges (€)", type: "number", required: true, validation: { min: 1, max: 100000 }, group: "Montants" },
    { key: "chargesAmount", label: "Provisions pour charges (€)", type: "number", required: true, validation: { min: 0, max: 50000 }, defaultValue: 0, group: "Montants" },
    { key: "cafAmount", label: "Montant APL/CAF déduit (€)", type: "number", required: false, validation: { min: 0 }, defaultValue: 0, group: "Montants" },
    // Période
    { key: "periodStart", label: "Début de période", type: "date", required: true, group: "Période" },
    { key: "periodEnd", label: "Fin de période", type: "date", required: true, group: "Période" },
    { key: "paymentDate", label: "Date de paiement effectif", type: "date", required: true, group: "Période" },
    { key: "paymentMethod", label: "Mode de paiement", type: "select", required: false, options: [
      { value: "virement", label: "Virement bancaire" },
      { value: "cheque", label: "Chèque" },
      { value: "especes", label: "Espèces" },
      { value: "prelevement", label: "Prélèvement automatique" },
      { value: "en_ligne", label: "Paiement en ligne" },
    ], group: "Période" },
  ],
  clauses: [
    {
      id: "receipt-header",
      label: "Identification des parties",
      required: true,
      text: "QUITTANCE DE LOYER\n\nJe soussigné(e) {landlordName}, bailleur du logement désigné ci-après, déclare avoir reçu de {tenantName}, locataire, la somme détaillée ci-dessous au titre du paiement du loyer et des charges pour la période mentionnée.\n\nBailleur : {landlordName}\nAdresse : {landlordAddress}\n\nLocataire : {tenantName}\nLogement : {propertyAddress}\n{propertyDescription}",
    },
    {
      id: "receipt-detail",
      label: "Detail du reglement",
      required: true,
      text: "DETAIL DU PAIEMENT\n\nPeriode concernee : du {periodStart} au {periodEnd}\n\n-----------------------------------------\n  Loyer nu (hors charges)    : {rentAmount}\n  Provisions pour charges    : {chargesAmount}\n  -----------------------------------------\n  TOTAL DU                   : {total}\n-----------------------------------------\n\nDate du paiement : {paymentDate}\nMode de paiement : {paymentMethod}",
    },
    {
      id: "receipt-caf",
      label: "Deduction APL/CAF",
      required: false,
      conditional: (data) => Number(data.cafAmount) > 0,
      text: "DEDUCTION AIDE AU LOGEMENT\n\nMontant de l'aide au logement (APL/AL) deduit : {cafAmount} euros\n\nLe montant ci-dessus a ete verse directement au bailleur par l'organisme payeur (CAF/MSA). Le solde restant a la charge du locataire est de {total} - {cafAmount} = [montant net] euros.",
    },
    {
      id: "receipt-declaration",
      label: "Attestation de paiement",
      required: true,
      text: "ATTESTATION\n\nJe soussigne(e) {landlordName}, proprietaire du logement situe au {propertyAddress}, declare avoir recu de {tenantName} la somme de {total} au titre du paiement du loyer et des charges locatives pour la periode du {periodStart} au {periodEnd}, et lui en donne quittance, sous reserve de tous droits.\n\nCette quittance est delivree en application de l'article 21 de la loi n 89-462 du 6 juillet 1989 qui dispose que le bailleur est tenu de transmettre gratuitement une quittance au locataire qui en fait la demande.\n\nLa quittance porte sur le loyer et les charges dans les proportions prevues au bail. Elle ne prejuge pas du paiement des termes precedents eventuellement restes impayes ni des sommes dues au titre de la regularisation annuelle des charges.",
    },
    {
      id: "receipt-conservation",
      label: "Conservation du document",
      required: true,
      text: "INFORMATIONS IMPORTANTES\n\nLa presente quittance annule et remplace tout recu provisoire delivre pour la meme periode.\nCe document constitue une piece justificative de paiement de loyer. Il est conseille de le conserver pendant toute la duree de la location et au minimum 3 ans apres le depart du logement.\nEn cas de paiement partiel, un recu mentionnant le montant verse sera delivre en lieu et place de la presente quittance (art. 21 al. 2 de la loi du 6 juillet 1989).\nLa quittance est un droit du locataire : le bailleur ne peut conditionner sa delivrance au paiement de sommes autres que le loyer et les charges.",
    },
  ],
};
