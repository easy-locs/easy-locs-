import type { DocumentTemplate } from "../types";

export const frFormalNotice: DocumentTemplate = {
  id: "fr-formal-notice",
  version: "1.0.0",
  country: "FR",
  category: "legal",
  docType: "formal-notice",
  label: "Mise en demeure",
  description: "Lettre de mise en demeure formelle conforme au droit français.",
  legalBasis: "Code civil, art. 1344 et suivants",
  needsLegalReview: false,
  active: true,
  fields: [
    { key: "senderName", label: "Nom de l'expéditeur", type: "text", required: true },
    { key: "senderAddress", label: "Adresse de l'expéditeur", type: "text", required: true },
    { key: "recipientName", label: "Nom du destinataire", type: "text", required: true },
    { key: "recipientAddress", label: "Adresse du destinataire", type: "text", required: true },
    { key: "subject", label: "Objet de la mise en demeure", type: "text", required: true, placeholder: "Ex: Loyers impayés, travaux non réalisés…" },
    { key: "amount", label: "Montant réclamé (€)", type: "number", required: false, validation: { min: 0 } },
    { key: "factDescription", label: "Exposé des faits", type: "textarea", required: true, validation: { minLength: 20, maxLength: 3000 } },
    { key: "deadline", label: "Délai accordé (jours)", type: "number", required: true, validation: { min: 1, max: 90 }, defaultValue: 15 },
    { key: "sendDate", label: "Date d'envoi", type: "date", required: true },
  ],
  clauses: [
    { id: "header", label: "En-tête", required: true, text: "Lettre recommandée avec accusé de réception" },
    { id: "formal-demand", label: "Mise en demeure", required: true, text: "Par la présente, je vous mets en demeure de {subject} dans un délai de {deadline} jours à compter de la réception de ce courrier." },
    { id: "consequences", label: "Conséquences", required: true, text: "À défaut de régularisation dans le délai imparti, je me réserve le droit de saisir les juridictions compétentes pour obtenir l'exécution forcée et/ou des dommages-intérêts." },
  ],
};
