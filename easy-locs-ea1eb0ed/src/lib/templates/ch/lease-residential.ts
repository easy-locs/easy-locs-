import type { DocumentTemplate } from "../types";

export const chLeaseResidential: DocumentTemplate = {
  id: "ch-lease-residential",
  version: "1.0.0",
  country: "CH",
  category: "rental",
  docType: "lease-residential",
  label: "Contrat de bail à loyer (Suisse)",
  description: "Contrat de bail d'habitation conforme au Code des obligations suisse.",
  legalBasis: "Code des obligations (CO) art. 253–274g ; OBLF (Ordonnance sur le bail à loyer)",
  needsLegalReview: false,
  active: true,
  fields: [
    { key: "landlordName", label: "Nom du bailleur", type: "text", required: true, group: "Bailleur" },
    { key: "landlordAddress", label: "Adresse du bailleur", type: "text", required: true, group: "Bailleur" },
    { key: "tenantName", label: "Nom du locataire", type: "text", required: true, group: "Locataire" },
    { key: "tenantAddress", label: "Adresse actuelle du locataire", type: "text", required: false, group: "Locataire" },
    { key: "propertyAddress", label: "Adresse de l'objet loué", type: "text", required: true, group: "Objet loué" },
    { key: "canton", label: "Canton", type: "select", required: true, options: [
      { value: "GE", label: "Genève" }, { value: "VD", label: "Vaud" }, { value: "VS", label: "Valais" },
      { value: "FR", label: "Fribourg" }, { value: "NE", label: "Neuchâtel" }, { value: "JU", label: "Jura" },
      { value: "BE", label: "Berne" }, { value: "ZH", label: "Zurich" }, { value: "BS", label: "Bâle-Ville" },
      { value: "LU", label: "Lucerne" }, { value: "TI", label: "Tessin" }, { value: "other", label: "Autre" },
    ], group: "Objet loué" },
    { key: "surface", label: "Surface (m²)", type: "number", required: true, validation: { min: 1 }, group: "Objet loué" },
    { key: "rooms", label: "Nombre de pièces", type: "number", required: true, validation: { min: 1 }, group: "Objet loué" },
    { key: "rentAmount", label: "Loyer net mensuel (CHF)", type: "number", required: true, validation: { min: 1 }, group: "Conditions financières" },
    { key: "chargesAmount", label: "Charges mensuelles (CHF)", type: "number", required: true, defaultValue: 0, group: "Conditions financières" },
    { key: "chargesMode", label: "Mode de charges", type: "select", required: true, options: [
      { value: "acomptes", label: "Acomptes avec décompte annuel" },
      { value: "forfait", label: "Forfait" },
    ], defaultValue: "acomptes", group: "Conditions financières" },
    { key: "depositAmount", label: "Garantie de loyer (CHF)", type: "number", required: true, validation: {
      min: 0,
      custom: (val, all) => {
        const dep = Number(val);
        const rent = Number(all.rentAmount);
        if (rent > 0 && dep > rent * 3) return "La garantie ne peut excéder 3 mois de loyer net (art. 257e CO).";
        return null;
      }
    }, group: "Conditions financières" },
    { key: "previousRent", label: "Loyer du précédent locataire (CHF)", type: "number", required: false, group: "Conditions financières" },
    { key: "paymentDay", label: "Jour de paiement", type: "number", required: true, validation: { min: 1, max: 28 }, defaultValue: 1, group: "Conditions financières" },
    { key: "startDate", label: "Début du bail", type: "date", required: true, group: "Durée" },
    { key: "duration", label: "Durée", type: "select", required: true, options: [
      { value: "indeterminee", label: "Durée indéterminée" },
      { value: "1", label: "1 an (déterminée)" },
      { value: "2", label: "2 ans" },
      { value: "3", label: "3 ans" },
    ], defaultValue: "indeterminee", group: "Durée" },
  ],
  clauses: [
    { id: "parties", label: "Art. 1 — Parties contractantes", required: true,
      text: "ENTRE :\n\nLe bailleur : {landlordName}, domicilié à {landlordAddress}\n\nET :\n\nLe locataire : {tenantName}" },
    { id: "objet", label: "Art. 2 — Objet loué", required: true,
      text: "Le bailleur remet à bail au locataire l'objet loué sis à {propertyAddress}, canton de {canton}, d'une surface de {surface} m², comprenant {rooms} pièce(s).\n\nL'objet loué est destiné exclusivement à l'habitation du locataire et de sa famille." },
    { id: "duree", label: "Art. 3 — Durée et résiliation", required: true,
      text: "Le bail commence le {startDate} pour une durée {duration}.\n\nBail à durée indéterminée : chaque partie peut le résilier en respectant les termes locaux officiels et un préavis de 3 mois (art. 266c CO).\n\nLa résiliation doit être notifiée sur formule officielle agréée par le canton.\n\nLa résiliation est annulable si elle contrevient aux règles de la bonne foi (art. 271–271a CO). Le locataire peut demander une prolongation du bail pour motif de rigueur (art. 272 CO)." },
    { id: "loyer", label: "Art. 4 — Loyer", required: true,
      text: "Le loyer net mensuel est de {rentAmount} CHF.\nCharges : {chargesAmount} CHF en {chargesMode}.\nTotal mensuel : {totalRent} CHF.\n\nLoyer du précédent locataire : {previousRent} CHF.\n\nLe loyer est payable d'avance le {paymentDay} de chaque mois.\n\nLe locataire peut contester le loyer initial dans les 30 jours suivant la prise de possession s'il l'estime abusif, en saisissant l'autorité de conciliation (art. 270 CO).\n\nLe loyer peut être adapté en fonction du taux hypothécaire de référence, de l'IPC ou de l'augmentation des charges (art. 269a CO)." },
    { id: "garantie", label: "Art. 5 — Garantie", required: true,
      text: "Le locataire constitue une garantie de {depositAmount} CHF, déposée sur un compte de consignation bloqué à son nom dans un établissement bancaire (art. 257e CO).\n\nLa garantie est restituée lorsque les deux parties sont d'accord ou à l'issue du délai d'un an si le bailleur n'a pas fait valoir ses prétentions en justice." },
    { id: "entretien", label: "Art. 6 — Entretien", required: true,
      text: "Le locataire est tenu de l'entretien courant et des menues réparations (art. 259 CO).\n\nLe bailleur est tenu de maintenir l'objet loué dans un état approprié à l'usage prévu et d'effectuer les réparations nécessaires (art. 256 CO).\n\nEn cas de défaut de la chose louée, le locataire peut exiger la remise en état, une réduction de loyer ou des dommages-intérêts (art. 259a CO)." },
    { id: "sous-location", label: "Art. 7 — Sous-location", required: true,
      text: "Le locataire ne peut sous-louer tout ou partie de l'objet loué sans le consentement écrit du bailleur (art. 262 CO).\n\nLe bailleur ne peut refuser son consentement que pour un motif valable." },
    { id: "restitution", label: "Art. 8 — Restitution", required: true,
      text: "À l'échéance du bail, le locataire restitue l'objet loué dans l'état résultant d'un usage conforme au contrat (art. 267 CO).\n\nUn état des lieux contradictoire est dressé. Le bailleur doit signaler immédiatement les défauts constatés." },
    { id: "conciliation", label: "Art. 9 — Conciliation", required: true,
      text: "Tout litige relatif au présent bail doit être soumis préalablement à l'autorité de conciliation en matière de baux et loyers du canton de {canton} (art. 274a CO).\n\nLe droit suisse est applicable." },
  ],
};

export const chRentReceipt: DocumentTemplate = {
  id: "ch-rent-receipt",
  version: "1.0.0",
  country: "CH",
  category: "rental",
  docType: "rent-receipt",
  label: "Quittance de loyer (Suisse)",
  description: "Quittance de loyer conforme au CO suisse.",
  legalBasis: "CO art. 88",
  needsLegalReview: false,
  active: true,
  fields: [
    { key: "landlordName", label: "Nom du bailleur", type: "text", required: true, group: "Bailleur" },
    { key: "tenantName", label: "Nom du locataire", type: "text", required: true, group: "Locataire" },
    { key: "propertyAddress", label: "Adresse de l'objet loué", type: "text", required: true, group: "Bien" },
    { key: "rentAmount", label: "Loyer net (CHF)", type: "number", required: true, group: "Montants" },
    { key: "chargesAmount", label: "Charges (CHF)", type: "number", required: true, defaultValue: 0, group: "Montants" },
    { key: "period", label: "Période", type: "text", required: true, placeholder: "Janvier 2026", group: "Période" },
    { key: "paymentDate", label: "Date de paiement", type: "date", required: true, group: "Période" },
  ],
  clauses: [
    { id: "quittance", label: "Quittance", required: true,
      text: "QUITTANCE DE LOYER\n\nJe soussigné(e) {landlordName}, bailleur de l'objet loué sis à {propertyAddress},\n\natteste avoir reçu de {tenantName} :\n\n• Loyer net : {rentAmount} CHF\n• Charges : {chargesAmount} CHF\n• Total : {totalAmount} CHF\n\npour la période de {period}.\n\nDate de paiement : {paymentDate}\n\nFait à ____________, le ____________\n\nSignature du bailleur :" },
  ],
};
