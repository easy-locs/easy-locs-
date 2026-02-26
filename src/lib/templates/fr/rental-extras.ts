import type { DocumentTemplate } from "../types";

export const frInventory: DocumentTemplate = {
  id: "fr-inventory",
  version: "1.0.0",
  country: "FR",
  category: "rental",
  docType: "inventory",
  label: "État des lieux",
  description: "État des lieux d'entrée ou de sortie pour un logement.",
  legalBasis: "Loi n°89-462 du 6 juillet 1989, art. 3-2",
  needsLegalReview: false,
  active: true,
  fields: [
    { key: "inventoryType", label: "Type", type: "select", required: true, options: [
      { value: "entree", label: "Entrée" }, { value: "sortie", label: "Sortie" },
    ] },
    { key: "propertyAddress", label: "Adresse du logement", type: "text", required: true },
    { key: "propertyType", label: "Type de logement", type: "select", required: true, options: [
      { value: "appartement", label: "Appartement" }, { value: "maison", label: "Maison" }, { value: "studio", label: "Studio" },
    ] },
    { key: "landlordName", label: "Nom du bailleur", type: "text", required: true },
    { key: "tenantName", label: "Nom du locataire", type: "text", required: true },
    { key: "inventoryDate", label: "Date de l'état des lieux", type: "date", required: true },
    { key: "meterElec", label: "Compteur électricité (kWh)", type: "number", required: false },
    { key: "meterGas", label: "Compteur gaz (m³)", type: "number", required: false },
    { key: "meterWater", label: "Compteur eau (m³)", type: "number", required: false },
    { key: "keysCount", label: "Nombre de clés remises", type: "number", required: true, validation: { min: 1 } },
    { key: "rooms", label: "Description pièce par pièce", type: "textarea", required: true, placeholder: "Entrée : bon état, sol carrelage…\nSéjour : bon état, murs peinture blanche…", validation: { minLength: 20 } },
    { key: "observations", label: "Observations générales", type: "textarea", required: false },
  ],
  clauses: [
    { id: "header", label: "En-tête", required: true, text: "ÉTAT DES LIEUX D'{inventoryType}\n\nÉtabli le {inventoryDate} entre :\n- Le bailleur : {landlordName}\n- Le locataire : {tenantName}\n\nConcernant le logement situé au : {propertyAddress} ({propertyType})" },
    { id: "meters", label: "Relevés compteurs", required: true, text: "Relevés des compteurs :\n- Électricité : {meterElec} kWh\n- Gaz : {meterGas} m³\n- Eau : {meterWater} m³" },
    { id: "keys", label: "Clés", required: true, text: "Nombre de clés remises : {keysCount}" },
    { id: "rooms-detail", label: "Détail par pièce", required: true, text: "{rooms}" },
    { id: "observations-clause", label: "Observations", required: false, text: "Observations : {observations}" },
  ],
};

export const frRentRevision: DocumentTemplate = {
  id: "fr-rent-revision",
  version: "1.0.0",
  country: "FR",
  category: "rental",
  docType: "rent-revision",
  label: "Révision de loyer (IRL)",
  description: "Courrier de notification de révision annuelle du loyer basée sur l'IRL.",
  legalBasis: "Loi n°89-462 du 6 juillet 1989, art. 17-1",
  needsLegalReview: false,
  active: true,
  fields: [
    { key: "landlordName", label: "Nom du bailleur", type: "text", required: true },
    { key: "landlordAddress", label: "Adresse du bailleur", type: "text", required: true },
    { key: "tenantName", label: "Nom du locataire", type: "text", required: true },
    { key: "propertyAddress", label: "Adresse du logement", type: "text", required: true },
    { key: "currentRent", label: "Loyer actuel hors charges (€)", type: "number", required: true, validation: { min: 1 } },
    { key: "irlOld", label: "Ancien IRL de référence", type: "number", required: true, validation: { min: 1 } },
    { key: "irlNew", label: "Nouvel IRL de référence", type: "number", required: true, validation: { min: 1 } },
    { key: "revisionDate", label: "Date de la révision", type: "date", required: true },
    { key: "effectiveDate", label: "Date d'effet du nouveau loyer", type: "date", required: true },
  ],
  clauses: [
    { id: "notification", label: "Notification", required: true, text: "Objet : Révision annuelle du loyer\n\nMadame, Monsieur {tenantName},\n\nConformément aux dispositions de l'article 17-1 de la loi du 6 juillet 1989 et aux termes du contrat de bail, je procède à la révision annuelle de votre loyer pour le logement situé au {propertyAddress}.\n\nLoyer actuel : {currentRent} €\nAncien IRL : {irlOld}\nNouvel IRL : {irlNew}\n\nLe nouveau loyer révisé prendra effet à compter du {effectiveDate}." },
  ],
};

export const frChargesRegularization: DocumentTemplate = {
  id: "fr-charges-regularization",
  version: "1.0.0",
  country: "FR",
  category: "rental",
  docType: "charges-regularization",
  label: "Régularisation des charges",
  description: "Décompte annuel de régularisation des charges locatives.",
  legalBasis: "Loi n°89-462 du 6 juillet 1989, art. 23",
  needsLegalReview: false,
  active: true,
  fields: [
    { key: "landlordName", label: "Nom du bailleur", type: "text", required: true },
    { key: "tenantName", label: "Nom du locataire", type: "text", required: true },
    { key: "propertyAddress", label: "Adresse du logement", type: "text", required: true },
    { key: "periodStart", label: "Début de période", type: "date", required: true },
    { key: "periodEnd", label: "Fin de période", type: "date", required: true },
    { key: "totalCharges", label: "Total des charges réelles (€)", type: "number", required: true, validation: { min: 0 } },
    { key: "provisionsPaid", label: "Total des provisions versées (€)", type: "number", required: true, validation: { min: 0 } },
    { key: "chargesDetail", label: "Détail des charges", type: "textarea", required: true, placeholder: "Eau froide : 120 €\nOrdures ménagères : 80 €\nEntretien parties communes : 150 €…" },
  ],
  clauses: [
    { id: "regularization", label: "Régularisation", required: true, text: "RÉGULARISATION DES CHARGES LOCATIVES\n\nBailleur : {landlordName}\nLocataire : {tenantName}\nLogement : {propertyAddress}\nPériode : du {periodStart} au {periodEnd}\n\nDétail des charges récupérables :\n{chargesDetail}\n\nTotal des charges réelles : {totalCharges} €\nTotal des provisions versées : {provisionsPaid} €" },
  ],
};

export const frUnpaidNotice: DocumentTemplate = {
  id: "fr-unpaid-notice",
  version: "1.0.0",
  country: "FR",
  category: "rental",
  docType: "unpaid-notice",
  label: "Relance de loyer impayé",
  description: "Courrier de relance amiable pour loyer impayé.",
  legalBasis: "Code civil, art. 1728",
  needsLegalReview: false,
  active: true,
  fields: [
    { key: "landlordName", label: "Nom du bailleur", type: "text", required: true },
    { key: "landlordAddress", label: "Adresse du bailleur", type: "text", required: true },
    { key: "tenantName", label: "Nom du locataire", type: "text", required: true },
    { key: "tenantAddress", label: "Adresse du locataire", type: "text", required: true },
    { key: "unpaidMonth", label: "Mois impayé", type: "text", required: true, placeholder: "Janvier 2026" },
    { key: "unpaidAmount", label: "Montant impayé (€)", type: "number", required: true, validation: { min: 1 } },
    { key: "dueDate", label: "Date d'échéance initiale", type: "date", required: true },
    { key: "noticeDate", label: "Date du courrier", type: "date", required: true },
  ],
  clauses: [
    { id: "notice", label: "Relance", required: true, text: "{landlordName}\n{landlordAddress}\n\nÀ l'attention de {tenantName}\n{tenantAddress}\n\nFait le {noticeDate}\n\nObjet : Relance pour loyer impayé — {unpaidMonth}\n\nMadame, Monsieur,\n\nSauf erreur ou omission de ma part, je constate que le loyer du mois de {unpaidMonth}, d'un montant de {unpaidAmount} €, échu le {dueDate}, n'a toujours pas été réglé à ce jour.\n\nJe vous prie de bien vouloir procéder au règlement de cette somme dans les plus brefs délais.\n\nÀ défaut de régularisation sous 8 jours, je me verrai contraint(e) d'engager les démarches nécessaires au recouvrement de cette créance.\n\nVeuillez agréer, Madame, Monsieur, l'expression de mes salutations distinguées." },
  ],
};
