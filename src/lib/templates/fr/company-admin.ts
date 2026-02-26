import type { DocumentTemplate } from "../types";

export const frPVAGO: DocumentTemplate = {
  id: "fr-pv-ago",
  version: "1.0.0",
  country: "FR",
  category: "company",
  docType: "pv-ago",
  label: "PV d'Assemblée Générale Ordinaire",
  description: "Procès-verbal d'assemblée générale ordinaire annuelle.",
  legalBasis: "Code de commerce, art. L225-100 et suivants",
  needsLegalReview: false,
  active: true,
  fields: [
    { key: "companyName", label: "Dénomination sociale", type: "text", required: true },
    { key: "companyForm", label: "Forme juridique", type: "select", required: true, options: [
      { value: "SAS", label: "SAS" }, { value: "SARL", label: "SARL" }, { value: "SCI", label: "SCI" },
    ] },
    { key: "registeredOffice", label: "Siège social", type: "text", required: true },
    { key: "siret", label: "SIRET", type: "text", required: true },
    { key: "capital", label: "Capital social (€)", type: "number", required: true, validation: { min: 1 } },
    { key: "meetingDate", label: "Date de l'assemblée", type: "date", required: true },
    { key: "meetingPlace", label: "Lieu de l'assemblée", type: "text", required: true },
    { key: "presidentName", label: "Président de séance", type: "text", required: true },
    { key: "attendees", label: "Associés présents", type: "textarea", required: true, placeholder: "M. Dupont (500 parts)\nMme Martin (300 parts)" },
    { key: "agenda", label: "Ordre du jour", type: "textarea", required: true, placeholder: "1. Approbation des comptes\n2. Affectation du résultat\n3. Questions diverses" },
    { key: "resolutions", label: "Résolutions votées", type: "textarea", required: true },
  ],
  clauses: [
    { id: "header", label: "En-tête", required: true, text: "PROCÈS-VERBAL DE L'ASSEMBLÉE GÉNÉRALE ORDINAIRE\n\n{companyName} — {companyForm}\nCapital : {capital} €\nSiège : {registeredOffice}\nSIRET : {siret}\n\nRéunie le {meetingDate} à {meetingPlace}" },
    { id: "attendance", label: "Feuille de présence", required: true, text: "Associés présents ou représentés :\n{attendees}\n\nLa présidence de séance est assurée par {presidentName}." },
    { id: "agenda-clause", label: "Ordre du jour", required: true, text: "Ordre du jour :\n{agenda}" },
    { id: "resolutions-clause", label: "Résolutions", required: true, text: "Résolutions :\n{resolutions}" },
  ],
};

export const frAccountsApproval: DocumentTemplate = {
  id: "fr-accounts-approval",
  version: "1.0.0",
  country: "FR",
  category: "company",
  docType: "accounts-approval",
  label: "Approbation des comptes annuels",
  description: "PV d'approbation des comptes et affectation du résultat.",
  legalBasis: "Code de commerce, art. L232-1",
  needsLegalReview: false,
  active: true,
  fields: [
    { key: "companyName", label: "Dénomination sociale", type: "text", required: true },
    { key: "companyForm", label: "Forme juridique", type: "select", required: true, options: [
      { value: "SAS", label: "SAS" }, { value: "SARL", label: "SARL" }, { value: "SCI", label: "SCI" },
    ] },
    { key: "siret", label: "SIRET", type: "text", required: true },
    { key: "registeredOffice", label: "Siège social", type: "text", required: true },
    { key: "fiscalYear", label: "Exercice clos le", type: "date", required: true },
    { key: "revenue", label: "Chiffre d'affaires (€)", type: "number", required: true },
    { key: "netResult", label: "Résultat net (€)", type: "number", required: true },
    { key: "resultAllocation", label: "Affectation du résultat", type: "select", required: true, options: [
      { value: "report", label: "Report à nouveau" },
      { value: "dividends", label: "Distribution de dividendes" },
      { value: "reserves", label: "Mise en réserves" },
    ] },
    { key: "meetingDate", label: "Date de l'assemblée", type: "date", required: true },
    { key: "presidentName", label: "Président de séance", type: "text", required: true },
  ],
  clauses: [
    { id: "approval", label: "Approbation", required: true, text: "L'assemblée approuve les comptes de l'exercice clos le {fiscalYear} présentant un chiffre d'affaires de {revenue} € et un résultat net de {netResult} €." },
    { id: "allocation", label: "Affectation", required: true, text: "L'assemblée décide d'affecter le résultat de {netResult} € en {resultAllocation}." },
    { id: "quitus", label: "Quitus", required: true, text: "L'assemblée donne quitus à {presidentName} de sa gestion au titre de l'exercice écoulé." },
  ],
};

export const frShareTransfer: DocumentTemplate = {
  id: "fr-share-transfer",
  version: "1.0.0",
  country: "FR",
  category: "company",
  docType: "share-transfer",
  label: "Cession de parts sociales",
  description: "Acte de cession de parts sociales entre associés ou à un tiers.",
  legalBasis: "Code de commerce ; Code civil, art. 1589 et suivants",
  needsLegalReview: false,
  active: true,
  fields: [
    { key: "companyName", label: "Dénomination sociale", type: "text", required: true },
    { key: "companyForm", label: "Forme juridique", type: "select", required: true, options: [
      { value: "SAS", label: "SAS" }, { value: "SARL", label: "SARL" }, { value: "SCI", label: "SCI" },
    ] },
    { key: "siret", label: "SIRET", type: "text", required: true },
    { key: "capital", label: "Capital social (€)", type: "number", required: true },
    { key: "sellerName", label: "Cédant (nom)", type: "text", required: true },
    { key: "sellerAddress", label: "Adresse du cédant", type: "text", required: true },
    { key: "buyerName", label: "Cessionnaire (nom)", type: "text", required: true },
    { key: "buyerAddress", label: "Adresse du cessionnaire", type: "text", required: true },
    { key: "sharesCount", label: "Nombre de parts cédées", type: "number", required: true, validation: { min: 1 } },
    { key: "sharePrice", label: "Prix de cession par part (€)", type: "number", required: true, validation: { min: 0 } },
    { key: "transferDate", label: "Date de cession", type: "date", required: true },
  ],
  clauses: [
    { id: "transfer", label: "Cession", required: true, text: "ACTE DE CESSION DE PARTS SOCIALES\n\n{companyName} — {companyForm}\nCapital : {capital} €\nSIRET : {siret}\n\n{sellerName}, demeurant au {sellerAddress} (ci-après le « Cédant »), cède à {buyerName}, demeurant au {buyerAddress} (ci-après le « Cessionnaire »), {sharesCount} parts sociales au prix unitaire de {sharePrice} €, soit un prix total de cession à calculer.\n\nDate d'effet : {transferDate}" },
    { id: "conditions", label: "Conditions", required: true, text: "Le cessionnaire déclare avoir pris connaissance des statuts de la société et s'engage à en respecter toutes les dispositions. La cession sera opposable à la société après dépôt au greffe." },
  ],
};

export const frCapitalIncrease: DocumentTemplate = {
  id: "fr-capital-increase",
  version: "1.0.0",
  country: "FR",
  category: "company",
  docType: "capital-increase",
  label: "Augmentation de capital",
  description: "PV de décision d'augmentation du capital social.",
  legalBasis: "Code de commerce",
  needsLegalReview: false,
  active: true,
  fields: [
    { key: "companyName", label: "Dénomination sociale", type: "text", required: true },
    { key: "companyForm", label: "Forme juridique", type: "select", required: true, options: [
      { value: "SAS", label: "SAS" }, { value: "SARL", label: "SARL" }, { value: "SCI", label: "SCI" },
    ] },
    { key: "siret", label: "SIRET", type: "text", required: true },
    { key: "currentCapital", label: "Capital actuel (€)", type: "number", required: true, validation: { min: 1 } },
    { key: "increaseAmount", label: "Montant de l'augmentation (€)", type: "number", required: true, validation: { min: 1 } },
    { key: "method", label: "Modalité", type: "select", required: true, options: [
      { value: "numeraire", label: "Apport en numéraire" },
      { value: "nature", label: "Apport en nature" },
      { value: "incorporation", label: "Incorporation de réserves" },
    ] },
    { key: "decisionDate", label: "Date de la décision", type: "date", required: true },
    { key: "presidentName", label: "Président de séance", type: "text", required: true },
  ],
  clauses: [
    { id: "resolution", label: "Résolution", required: true, text: "L'assemblée des associés de {companyName} ({companyForm}), SIRET {siret}, décide d'augmenter le capital social de {increaseAmount} €, le portant de {currentCapital} € à un nouveau montant.\n\nModalité : {method}\n\nLes statuts sont modifiés en conséquence." },
  ],
};

export const frDissolution: DocumentTemplate = {
  id: "fr-dissolution",
  version: "1.0.0",
  country: "FR",
  category: "company",
  docType: "dissolution",
  label: "Dissolution amiable",
  description: "PV de décision de dissolution anticipée amiable de la société.",
  legalBasis: "Code de commerce ; Code civil, art. 1844-7",
  needsLegalReview: false,
  active: true,
  fields: [
    { key: "companyName", label: "Dénomination sociale", type: "text", required: true },
    { key: "companyForm", label: "Forme juridique", type: "select", required: true, options: [
      { value: "SAS", label: "SAS" }, { value: "SARL", label: "SARL" }, { value: "SCI", label: "SCI" },
    ] },
    { key: "siret", label: "SIRET", type: "text", required: true },
    { key: "registeredOffice", label: "Siège social", type: "text", required: true },
    { key: "capital", label: "Capital social (€)", type: "number", required: true },
    { key: "dissolutionDate", label: "Date de dissolution", type: "date", required: true },
    { key: "liquidatorName", label: "Nom du liquidateur", type: "text", required: true },
    { key: "liquidatorAddress", label: "Adresse du liquidateur", type: "text", required: true },
    { key: "decisionDate", label: "Date de la décision", type: "date", required: true },
  ],
  clauses: [
    { id: "dissolution", label: "Dissolution", required: true, text: "L'assemblée des associés de {companyName} ({companyForm}), SIRET {siret}, au capital de {capital} €, siège au {registeredOffice}, décide la dissolution anticipée amiable de la société à compter du {dissolutionDate}." },
    { id: "liquidator", label: "Liquidateur", required: true, text: "Est nommé(e) liquidateur amiable : {liquidatorName}, demeurant au {liquidatorAddress}.\n\nLe liquidateur disposera des pouvoirs les plus étendus pour réaliser les opérations de liquidation, conformément aux statuts et à la loi." },
    { id: "publication", label: "Publicité", required: true, text: "La publication de la dissolution sera effectuée dans un journal d'annonces légales du département du siège social et le dossier sera déposé au greffe du tribunal de commerce compétent." },
  ],
};
