import type { DocumentTemplate } from "../types";

export const frTermination: DocumentTemplate = {
  id: "fr-termination",
  version: "1.0.0",
  country: "FR",
  category: "legal",
  docType: "termination",
  label: "Résiliation de contrat",
  description: "Lettre de résiliation de contrat (assurance, abonnement, bail…).",
  legalBasis: "Loi Hamon, Loi Chatel, Code de la consommation",
  needsLegalReview: false,
  active: true,
  fields: [
    { key: "senderName", label: "Nom de l'expéditeur", type: "text", required: true },
    { key: "senderAddress", label: "Adresse de l'expéditeur", type: "text", required: true },
    { key: "recipientName", label: "Nom du prestataire / société", type: "text", required: true },
    { key: "recipientAddress", label: "Adresse du prestataire", type: "text", required: true },
    { key: "contractType", label: "Type de contrat", type: "select", required: true, options: [
      { value: "assurance", label: "Assurance" },
      { value: "abonnement", label: "Abonnement / service" },
      { value: "bail", label: "Bail / location" },
      { value: "autre", label: "Autre" },
    ] },
    { key: "contractRef", label: "Référence du contrat", type: "text", required: true },
    { key: "contractDate", label: "Date de souscription", type: "date", required: false },
    { key: "reason", label: "Motif de résiliation", type: "textarea", required: true, validation: { minLength: 10, maxLength: 2000 } },
    { key: "effectiveDate", label: "Date de résiliation souhaitée", type: "date", required: true },
    { key: "sendDate", label: "Date d'envoi", type: "date", required: true },
  ],
  clauses: [
    { id: "header", label: "En-tête", required: true, text: "Lettre recommandée avec accusé de réception" },
    { id: "termination-request", label: "Demande de résiliation", required: true, text: "Je vous informe par la présente de ma décision de résilier le contrat référencé {contractRef} à effet du {effectiveDate}." },
    { id: "legal-basis", label: "Base légale", required: true, text: "Cette résiliation est effectuée conformément aux dispositions légales en vigueur et aux conditions générales du contrat.", conditional: () => true },
  ],
};
