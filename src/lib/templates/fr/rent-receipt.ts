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
      label: "Détail du règlement",
      required: true,
      text: "DÉTAIL DU PAIEMENT\n\nPériode concernée : du {periodStart} au {periodEnd}\n\n╔══════════════════════════════════════╗\n║ Loyer nu (hors charges)    : {rentAmount}\n║ Provisions pour charges    : {chargesAmount}\n║ ────────────────────────────────────\n║ TOTAL DÛ                   : {total}\n╚══════════════════════════════════════╝\n\nDate du paiement : {paymentDate}\nMode de paiement : {paymentMethod}",
    },
    {
      id: "receipt-caf",
      label: "Déduction APL/CAF",
      required: false,
      conditional: (data) => Number(data.cafAmount) > 0,
      text: "DÉDUCTION AIDE AU LOGEMENT\n\nMontant de l'aide au logement (APL/AL) déduit : {cafAmount} €\n\nLe montant ci-dessus a été versé directement au bailleur par l'organisme payeur (CAF/MSA). Le solde restant à la charge du locataire est de {total} - {cafAmount} = [montant net] €.",
    },
    {
      id: "receipt-declaration",
      label: "Attestation de paiement",
      required: true,
      text: "ATTESTATION\n\nJe soussigné(e) {landlordName}, propriétaire du logement situé au {propertyAddress}, déclare avoir reçu de {tenantName} la somme de {total} au titre du paiement du loyer et des charges locatives pour la période du {periodStart} au {periodEnd}, et lui en donne quittance, sous réserve de tous droits.\n\nCette quittance est délivrée en application de l'article 21 de la loi n° 89-462 du 6 juillet 1989 qui dispose que « le bailleur est tenu de transmettre gratuitement une quittance au locataire qui en fait la demande ».\n\nLa quittance porte sur le loyer et les charges dans les proportions prévues au bail. Elle ne préjuge pas du paiement des termes précédents éventuellement restés impayés ni des sommes dues au titre de la régularisation annuelle des charges.",
    },
    {
      id: "receipt-conservation",
      label: "Conservation du document",
      required: true,
      text: "INFORMATIONS IMPORTANTES\n\n• La présente quittance annule et remplace tout reçu provisoire délivré pour la même période.\n• Ce document constitue une pièce justificative de paiement de loyer. Il est conseillé de le conserver pendant toute la durée de la location et au minimum 3 ans après le départ du logement.\n• En cas de paiement partiel, un reçu mentionnant le montant versé sera délivré en lieu et place de la présente quittance (art. 21 al. 2 de la loi du 6 juillet 1989).\n• La quittance est un droit du locataire : le bailleur ne peut conditionner sa délivrance au paiement de sommes autres que le loyer et les charges.",
    },
  ],
};
