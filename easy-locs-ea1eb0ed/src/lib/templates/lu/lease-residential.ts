import type { DocumentTemplate } from "../types";

export const luLeaseResidential: DocumentTemplate = {
  id: "lu-lease-residential",
  version: "1.0.0",
  country: "LU",
  category: "rental",
  docType: "lease-residential",
  label: "Contrat de bail à usage d'habitation (Luxembourg)",
  description: "Bail d'habitation conforme à la loi luxembourgeoise sur le bail à loyer.",
  legalBasis: "Loi du 21 septembre 2006 sur le bail à usage d'habitation ; Code civil luxembourgeois art. 1714 ss.",
  needsLegalReview: false,
  active: true,
  fields: [
    { key: "landlordName", label: "Nom du bailleur", type: "text", required: true, group: "Bailleur" },
    { key: "landlordAddress", label: "Adresse du bailleur", type: "text", required: true, group: "Bailleur" },
    { key: "tenantName", label: "Nom du locataire", type: "text", required: true, group: "Locataire" },
    { key: "tenantEmail", label: "Email du locataire", type: "email", required: false, group: "Locataire" },
    { key: "propertyAddress", label: "Adresse du bien", type: "text", required: true, group: "Le bien" },
    { key: "surface", label: "Surface (m²)", type: "number", required: true, validation: { min: 1 }, group: "Le bien" },
    { key: "rooms", label: "Nombre de pièces", type: "number", required: true, validation: { min: 1 }, group: "Le bien" },
    { key: "furnished", label: "Meublé ?", type: "select", required: true, options: [
      { value: "non", label: "Non meublé" }, { value: "oui", label: "Meublé" },
    ], defaultValue: "non", group: "Le bien" },
    { key: "energyClass", label: "Certificat de performance énergétique", type: "select", required: true, options: [
      { value: "A", label: "A" }, { value: "B", label: "B" }, { value: "C", label: "C" },
      { value: "D", label: "D" }, { value: "E", label: "E" }, { value: "F", label: "F" },
      { value: "G", label: "G" }, { value: "H", label: "H" }, { value: "I", label: "I" },
    ], group: "Énergie" },
    { key: "rentAmount", label: "Loyer mensuel (€)", type: "number", required: true, validation: {
      min: 1,
      custom: (val) => {
        // Art. 3 loi 2006: le loyer annuel ne peut dépasser 5% du capital investi
        return null; // Validation informative uniquement
      }
    }, group: "Conditions financières" },
    { key: "chargesAmount", label: "Charges (€)", type: "number", required: true, defaultValue: 0, group: "Conditions financières" },
    { key: "depositAmount", label: "Garantie locative (€)", type: "number", required: true, validation: {
      min: 0,
      custom: (val, all) => {
        const dep = Number(val);
        const rent = Number(all.rentAmount);
        if (rent > 0 && dep > rent * 3) return "La garantie ne peut excéder 3 mois de loyer (art. 5 loi 2006).";
        return null;
      }
    }, group: "Conditions financières" },
    { key: "paymentDay", label: "Jour de paiement", type: "number", required: true, validation: { min: 1, max: 28 }, defaultValue: 1, group: "Conditions financières" },
    { key: "startDate", label: "Date de début", type: "date", required: true, group: "Durée" },
    { key: "duration", label: "Durée", type: "select", required: true, options: [
      { value: "indeterminee", label: "Indéterminée" },
      { value: "1", label: "1 an" },
      { value: "2", label: "2 ans" },
      { value: "3", label: "3 ans" },
    ], defaultValue: "indeterminee", group: "Durée" },
  ],
  clauses: [
    { id: "parties", label: "Article 1 — Parties", required: true,
      text: "ENTRE :\n\nLe bailleur : {landlordName}, domicilié à {landlordAddress}\n\nET :\n\nLe locataire : {tenantName}" },
    { id: "objet", label: "Article 2 — Objet", required: true,
      text: "Le bailleur donne en location le bien situé à {propertyAddress}, d'une surface de {surface} m², comprenant {rooms} pièce(s). {furnished}.\n\nCertificat énergétique : classe {energyClass}." },
    { id: "duree", label: "Article 3 — Durée", required: true,
      text: "Le bail prend effet le {startDate} pour une durée {duration}.\n\nBail à durée indéterminée : chaque partie peut résilier moyennant un préavis de 3 mois.\n\nLe bailleur ne peut résilier qu'en invoquant un motif légitime : besoin personnel, vente du bien, manquement grave du locataire." },
    { id: "loyer", label: "Article 4 — Loyer", required: true,
      text: "Le loyer mensuel est de {rentAmount} €, charges non comprises.\nCharges : {chargesAmount} €/mois.\n\nPayable le {paymentDay} de chaque mois.\n\nConformément à l'article 3 de la loi du 21 septembre 2006, le loyer annuel ne peut en principe excéder 5% du capital investi dans le logement.\n\nAdaptation du loyer : possible tous les 2 ans, dans les limites de la loi, selon l'évolution du coût de la vie." },
    { id: "garantie", label: "Article 5 — Garantie", required: true,
      text: "Le locataire constitue une garantie de {depositAmount} €, soit {depositMonths} mois de loyer.\n\nElle est déposée sur un compte bloqué au nom du locataire. Les intérêts sont à son profit.\n\nRestitution dans les 3 mois suivant la restitution des clés." },
    { id: "etat-lieux", label: "Article 6 — État des lieux", required: true,
      text: "Un état des lieux détaillé est dressé contradictoirement à l'entrée et à la sortie, aux frais partagés.\n\nÀ défaut d'état des lieux d'entrée, le locataire est présumé avoir reçu le bien en bon état." },
    { id: "entretien", label: "Article 7 — Entretien", required: true,
      text: "Le locataire est tenu des réparations locatives et de l'entretien courant.\n\nLe bailleur est responsable des grosses réparations et du maintien du bien en état d'habitabilité conforme aux normes luxembourgeoises." },
    { id: "commission", label: "Article 8 — Commission de loyers", required: true,
      text: "En cas de litige sur le montant du loyer, chaque partie peut saisir la Commission des loyers de la commune où se situe le bien.\n\nLa Commission peut fixer un loyer équitable si le loyer demandé excède le plafond légal de 5% du capital investi." },
  ],
};

export const luRentReceipt: DocumentTemplate = {
  id: "lu-rent-receipt",
  version: "1.0.0",
  country: "LU",
  category: "rental",
  docType: "rent-receipt",
  label: "Quittance de loyer (Luxembourg)",
  description: "Quittance conforme au droit luxembourgeois.",
  legalBasis: "Code civil luxembourgeois",
  needsLegalReview: false,
  active: true,
  fields: [
    { key: "landlordName", label: "Nom du bailleur", type: "text", required: true, group: "Bailleur" },
    { key: "tenantName", label: "Nom du locataire", type: "text", required: true, group: "Locataire" },
    { key: "propertyAddress", label: "Adresse du bien", type: "text", required: true, group: "Bien" },
    { key: "rentAmount", label: "Loyer (€)", type: "number", required: true, group: "Montants" },
    { key: "chargesAmount", label: "Charges (€)", type: "number", required: true, defaultValue: 0, group: "Montants" },
    { key: "period", label: "Période", type: "text", required: true, placeholder: "Janvier 2026", group: "Période" },
    { key: "paymentDate", label: "Date de paiement", type: "date", required: true, group: "Période" },
  ],
  clauses: [
    { id: "quittance", label: "Quittance", required: true,
      text: "QUITTANCE DE LOYER\n\nJe soussigné(e) {landlordName}, bailleur du bien situé à {propertyAddress},\n\nreconnais avoir reçu de {tenantName} :\n\n• Loyer : {rentAmount} €\n• Charges : {chargesAmount} €\n• Total : {totalAmount} €\n\npour la période de {period}.\n\nDate de paiement : {paymentDate}\n\nFait à ____________, le ____________\nSignature :" },
  ],
};
