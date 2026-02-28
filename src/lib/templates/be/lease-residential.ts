import type { DocumentTemplate } from "../types";

export const beLeaseResidential: DocumentTemplate = {
  id: "be-lease-residential",
  version: "1.0.0",
  country: "BE",
  category: "rental",
  docType: "lease-residential",
  label: "Bail de résidence principale (Belgique)",
  description: "Contrat de bail de résidence principale conforme à la législation régionale belge (Wallonie, Bruxelles, Flandre).",
  legalBasis: "Code civil belge, Livre III, Titre VIII ; Décret wallon du 15/03/2018 ; Ordonnance bruxelloise du 27/07/2017 ; Décret flamand du 09/11/2018",
  needsLegalReview: false,
  active: true,
  fields: [
    { key: "region", label: "Région", type: "select", required: true, options: [
      { value: "wallonie", label: "Wallonie" },
      { value: "bruxelles", label: "Bruxelles-Capitale" },
      { value: "flandre", label: "Flandre" },
    ], group: "Localisation" },
    { key: "landlordName", label: "Nom du bailleur", type: "text", required: true, validation: { minLength: 2 }, group: "Bailleur" },
    { key: "landlordAddress", label: "Adresse du bailleur", type: "text", required: true, group: "Bailleur" },
    { key: "landlordNationalNumber", label: "Numéro national du bailleur", type: "text", required: false, group: "Bailleur" },
    { key: "landlordEmail", label: "Email du bailleur", type: "email", required: false, group: "Bailleur" },
    { key: "tenantName", label: "Nom du preneur", type: "text", required: true, validation: { minLength: 2 }, group: "Preneur" },
    { key: "tenantAddress", label: "Adresse actuelle du preneur", type: "text", required: false, group: "Preneur" },
    { key: "tenantNationalNumber", label: "Numéro national du preneur", type: "text", required: false, group: "Preneur" },
    { key: "tenantEmail", label: "Email du preneur", type: "email", required: false, group: "Preneur" },
    { key: "propertyAddress", label: "Adresse du bien loué", type: "text", required: true, group: "Le bien" },
    { key: "propertyType", label: "Type de bien", type: "select", required: true, options: [
      { value: "Appartement", label: "Appartement" },
      { value: "Maison", label: "Maison" },
      { value: "Studio", label: "Studio" },
      { value: "Kot", label: "Kot étudiant" },
    ], group: "Le bien" },
    { key: "surface", label: "Superficie (m²)", type: "number", required: true, validation: { min: 9 }, group: "Le bien" },
    { key: "rooms", label: "Nombre de chambres", type: "number", required: true, validation: { min: 1 }, group: "Le bien" },
    { key: "furnished", label: "Meublé ?", type: "select", required: true, options: [
      { value: "non", label: "Non meublé" },
      { value: "oui", label: "Meublé" },
    ], defaultValue: "non", group: "Le bien" },
    { key: "dpeCertificate", label: "Certificat PEB", type: "select", required: true, options: [
      { value: "A++", label: "A++" }, { value: "A+", label: "A+" }, { value: "A", label: "A" },
      { value: "B", label: "B" }, { value: "C", label: "C" }, { value: "D", label: "D" },
      { value: "E", label: "E" }, { value: "F", label: "F" }, { value: "G", label: "G" },
    ], group: "Diagnostics" },
    { key: "rentAmount", label: "Loyer mensuel (€)", type: "number", required: true, validation: { min: 1 }, group: "Conditions financières" },
    { key: "chargesAmount", label: "Charges communes (€)", type: "number", required: true, validation: { min: 0 }, defaultValue: 0, group: "Conditions financières" },
    { key: "chargesMode", label: "Mode de charges", type: "select", required: true, options: [
      { value: "provisions", label: "Provisions avec décompte annuel" },
      { value: "forfait", label: "Forfait" },
    ], defaultValue: "provisions", group: "Conditions financières" },
    { key: "depositAmount", label: "Garantie locative (€)", type: "number", required: true, validation: {
      min: 0,
      custom: (val, all) => {
        const deposit = Number(val);
        const rent = Number(all.rentAmount);
        if (rent > 0 && deposit > rent * 3) return "La garantie locative ne peut excéder 3 mois de loyer (2 mois si sur compte bloqué, 3 mois si garantie bancaire).";
        return null;
      }
    }, group: "Conditions financières" },
    { key: "depositType", label: "Type de garantie", type: "select", required: true, options: [
      { value: "compte-bloque", label: "Compte bloqué individuel (max 2 mois)" },
      { value: "garantie-bancaire", label: "Garantie bancaire (max 3 mois)" },
      { value: "cpas", label: "Garantie via CPAS" },
    ], defaultValue: "compte-bloque", group: "Conditions financières" },
    { key: "paymentDay", label: "Jour de paiement", type: "number", required: true, validation: { min: 1, max: 28 }, defaultValue: 1, group: "Conditions financières" },
    { key: "startDate", label: "Date d'entrée en vigueur", type: "date", required: true, group: "Durée" },
    { key: "duration", label: "Durée du bail", type: "select", required: true, options: [
      { value: "9", label: "9 ans (bail de droit commun)" },
      { value: "3", label: "3 ans (bail de courte durée)" },
      { value: "1", label: "1 an (bail de courte durée)" },
    ], defaultValue: "9", group: "Durée" },
  ],
  clauses: [
    { id: "parties", label: "Article 1 — Parties contractantes", required: true,
      text: "ENTRE :\n\nLe bailleur : {landlordName}, domicilié au {landlordAddress}\n\nET :\n\nLe preneur : {tenantName}, domicilié au {tenantAddress}" },
    { id: "objet", label: "Article 2 — Description du bien", required: true,
      text: "Le bailleur donne en location au preneur un bien de type {propertyType}, situé au {propertyAddress}, d'une superficie de {surface} m², comprenant {rooms} chambre(s).\n\nCertificat PEB : classe {dpeCertificate}" },
    { id: "destination", label: "Article 3 — Destination", required: true,
      text: "Le bien est affecté exclusivement à la résidence principale du preneur. Le preneur ne peut en changer la destination sans l'accord écrit du bailleur." },
    { id: "duree", label: "Article 4 — Durée", required: true,
      text: "Le bail est conclu pour une durée de {duration} an(s) prenant cours le {startDate}.\n\nBail de 9 ans : le preneur peut résilier à tout moment moyennant un préavis de 3 mois. Si le congé intervient durant les 3 premières années, une indemnité de 3, 2 ou 1 mois de loyer est due.\n\nBail de courte durée (≤3 ans) : à l'échéance, le bail est prorogé aux conditions du bail de 9 ans s'il n'est pas résilié." },
    { id: "loyer", label: "Article 5 — Loyer et charges", required: true,
      text: "Le loyer mensuel est fixé à {rentAmount} €, payable le {paymentDay} de chaque mois.\n\nCharges communes : {chargesAmount} € en {chargesMode}.\n\nLe loyer peut être indexé annuellement à la date anniversaire du bail selon la formule :\nNouveau loyer = Loyer de base × (Nouvel indice santé / Indice santé de base)\n\nL'indexation n'est pas automatique et doit être demandée par le bailleur par écrit." },
    { id: "garantie", label: "Article 6 — Garantie locative", required: true,
      text: "Le preneur constitue une garantie locative de {depositAmount} € sous forme de {depositType}.\n\n• Compte bloqué : la garantie est placée sur un compte individualisé au nom du preneur dans une institution financière. Les intérêts sont capitalisés au profit du preneur.\n• À la fin du bail, la garantie est libérée moyennant accord écrit des deux parties ou décision judiciaire." },
    { id: "etat-lieux", label: "Article 7 — État des lieux", required: true,
      text: "Un état des lieux d'entrée détaillé est dressé contradictoirement, à frais partagés, avant l'occupation ou dans le premier mois.\n\nÀ défaut d'état des lieux d'entrée, le preneur est présumé avoir reçu le bien dans l'état où il se trouve à la fin du bail." },
    { id: "entretien", label: "Article 8 — Entretien et réparations", required: true,
      text: "Le preneur est tenu des réparations locatives et de l'entretien courant.\n\nLe bailleur est tenu des grosses réparations (art. 1720 du Code civil) et de maintenir le bien en état conforme aux normes régionales de salubrité et de sécurité." },
    { id: "assurance", label: "Article 9 — Assurance", required: true,
      text: "Le preneur est tenu de s'assurer contre les risques locatifs (incendie, dégâts des eaux) et de fournir une attestation au bailleur.\n\nLe bailleur est responsable de l'assurance de l'immeuble sauf convention contraire." },
    { id: "conge", label: "Article 10 — Résiliation par le bailleur", required: true,
      text: "Le bailleur peut mettre fin au bail :\n\n• Pour occupation personnelle : préavis de 6 mois pour chaque période de 3 ans\n• Pour travaux importants : préavis de 6 mois, travaux d'un coût > 3 ans de loyer\n• Sans motif : uniquement à la fin de chaque triennat, préavis de 6 mois, indemnité de 9 mois (fin 1er triennat), 6 mois (fin 2e triennat)" },
    { id: "enregistrement", label: "Article 11 — Enregistrement", required: true,
      text: "Le bail doit être enregistré dans les 2 mois suivant sa signature. Les frais d'enregistrement sont à charge du bailleur.\n\nEn Belgique, l'enregistrement d'un bail de résidence principale est gratuit.\n\nL'enregistrement est obligatoire et rend le bail opposable aux tiers." },
    { id: "clause-resolutoire", label: "Article 12 — Clause résolutoire", required: true,
      text: "Le bail sera résilié de plein droit en cas de manquement grave du preneur à ses obligations, après mise en demeure restée sans effet pendant un mois.\n\nEn cas de non-paiement du loyer, le bailleur doit obtenir un jugement auprès du Juge de paix avant toute expulsion." },
  ],
};

export const beRentReceipt: DocumentTemplate = {
  id: "be-rent-receipt",
  version: "1.0.0",
  country: "BE",
  category: "rental",
  docType: "rent-receipt",
  label: "Quittance de loyer (Belgique)",
  description: "Quittance de loyer conforme au droit belge.",
  legalBasis: "Code civil belge, art. 1315",
  needsLegalReview: false,
  active: true,
  fields: [
    { key: "landlordName", label: "Nom du bailleur", type: "text", required: true, group: "Bailleur" },
    { key: "landlordAddress", label: "Adresse du bailleur", type: "text", required: true, group: "Bailleur" },
    { key: "tenantName", label: "Nom du preneur", type: "text", required: true, group: "Preneur" },
    { key: "propertyAddress", label: "Adresse du bien", type: "text", required: true, group: "Bien" },
    { key: "rentAmount", label: "Loyer (€)", type: "number", required: true, group: "Montants" },
    { key: "chargesAmount", label: "Charges (€)", type: "number", required: true, defaultValue: 0, group: "Montants" },
    { key: "period", label: "Période", type: "text", required: true, placeholder: "Janvier 2026", group: "Période" },
    { key: "paymentDate", label: "Date de paiement", type: "date", required: true, group: "Période" },
    { key: "paymentMethod", label: "Mode de paiement", type: "select", required: true, options: [
      { value: "virement", label: "Virement bancaire" },
      { value: "domiciliation", label: "Domiciliation" },
      { value: "especes", label: "Espèces" },
    ], group: "Paiement" },
  ],
  clauses: [
    { id: "quittance", label: "Quittance", required: true,
      text: "QUITTANCE DE LOYER\n\nJe soussigné(e) {landlordName}, bailleur du bien situé au {propertyAddress},\n\nreconnais avoir reçu de {tenantName} la somme de :\n\n• Loyer : {rentAmount} €\n• Charges : {chargesAmount} €\n• TOTAL : {totalAmount} €\n\npour la période de {period}, reçu le {paymentDate} par {paymentMethod}.\n\nLe bailleur ne pourra plus réclamer les sommes mentionnées dans la présente quittance.\n\nFait à ____________, le ____________\n\nSignature du bailleur :" },
  ],
};
