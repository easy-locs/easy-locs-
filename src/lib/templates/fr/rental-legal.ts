import type { DocumentTemplate } from "../types";

/* ─── Congé du bailleur ─── */
export const frCongesBailleur: DocumentTemplate = {
  id: "fr-conges-bailleur",
  version: "1.0.0",
  country: "FR",
  category: "rental",
  docType: "conges-bailleur",
  label: "Congé du bailleur",
  description: "Lettre de congé délivrée par le bailleur au locataire (vente, reprise, motif légitime).",
  legalBasis: "Loi n° 89-462 du 6 juillet 1989, art. 15",
  needsLegalReview: false,
  active: true,
  fields: [
    { key: "landlordName", label: "Nom du bailleur", type: "text", required: true, group: "Bailleur" },
    { key: "landlordAddress", label: "Adresse du bailleur", type: "text", required: true, group: "Bailleur" },
    { key: "tenantName", label: "Nom du locataire", type: "text", required: true, group: "Locataire" },
    { key: "tenantAddress", label: "Adresse du locataire", type: "text", required: true, group: "Locataire" },
    { key: "propertyAddress", label: "Adresse du logement", type: "text", required: true, group: "Bien" },
    { key: "leaseStartDate", label: "Date de début du bail", type: "date", required: true, group: "Bail" },
    { key: "leaseEndDate", label: "Date d'échéance du bail", type: "date", required: true, group: "Bail" },
    { key: "motif", label: "Motif du congé", type: "select", required: true, options: [
      { value: "reprise", label: "Reprise personnelle" },
      { value: "vente", label: "Vente du logement" },
      { value: "motif-legitime", label: "Motif légitime et sérieux" },
    ], group: "Congé" },
    { key: "motifDetail", label: "Détail du motif", type: "textarea", required: true, placeholder: "Précisez les circonstances justifiant le congé…", validation: { minLength: 20 }, group: "Congé" },
    { key: "beneficiaireName", label: "Nom du bénéficiaire de la reprise (si reprise)", type: "text", required: false, group: "Congé" },
    { key: "beneficiaireLink", label: "Lien de parenté avec le bénéficiaire", type: "text", required: false, placeholder: "Conjoint, ascendant, descendant…", group: "Congé" },
    { key: "salePrice", label: "Prix de vente proposé (€) (si vente)", type: "number", required: false, group: "Congé" },
    { key: "sendDate", label: "Date d'envoi", type: "date", required: true, group: "Congé" },
  ],
  clauses: [
    { id: "header", label: "En-tête", required: true, text: "Lettre recommandée avec accusé de réception\n\n{landlordName}\n{landlordAddress}\n\nÀ l'attention de {tenantName}\n{tenantAddress}\n\nFait le {sendDate}" },
    { id: "conge", label: "Notification du congé", required: true, text: "Objet : Congé pour {motif}\n\nMadame, Monsieur,\n\nConformément à l'article 15 de la loi n° 89-462 du 6 juillet 1989, je vous notifie par la présente mon intention de ne pas renouveler le bail portant sur le logement situé au {propertyAddress}, conclu le {leaseStartDate} et arrivant à échéance le {leaseEndDate}." },
    { id: "motif-detail", label: "Motif détaillé", required: true, text: "Ce congé est motivé par : {motifDetail}" },
    { id: "reprise", label: "Bénéficiaire (reprise)", required: false, conditional: (data) => data.motif === "reprise", text: "Le logement sera repris au bénéfice de {beneficiaireName} ({beneficiaireLink})." },
    { id: "vente", label: "Offre de vente", required: false, conditional: (data) => data.motif === "vente", text: "Conformément à la loi, le présent congé vaut offre de vente au prix de {salePrice} €. Vous disposez d'un délai de deux mois à compter de la réception pour accepter ou refuser cette offre." },
    { id: "preavis", label: "Préavis", required: true, text: "Ce congé prend effet à l'expiration du bail, soit le {leaseEndDate}, sous réserve du respect du délai de préavis de six mois.\n\nVeuillez agréer, Madame, Monsieur, l'expression de mes salutations distinguées." },
  ],
};

/* ─── Congé du locataire ─── */
export const frCongesLocataire: DocumentTemplate = {
  id: "fr-conges-locataire",
  version: "1.0.0",
  country: "FR",
  category: "rental",
  docType: "conges-locataire",
  label: "Congé du locataire",
  description: "Lettre de congé donnée par le locataire au bailleur.",
  legalBasis: "Loi n° 89-462 du 6 juillet 1989, art. 15",
  needsLegalReview: false,
  active: true,
  fields: [
    { key: "tenantName", label: "Nom du locataire", type: "text", required: true, group: "Locataire" },
    { key: "tenantAddress", label: "Adresse actuelle du locataire", type: "text", required: true, group: "Locataire" },
    { key: "landlordName", label: "Nom du bailleur", type: "text", required: true, group: "Bailleur" },
    { key: "landlordAddress", label: "Adresse du bailleur", type: "text", required: true, group: "Bailleur" },
    { key: "propertyAddress", label: "Adresse du logement loué", type: "text", required: true, group: "Bien" },
    { key: "leaseStartDate", label: "Date de début du bail", type: "date", required: true, group: "Bail" },
    { key: "preavisDuration", label: "Durée du préavis", type: "select", required: true, options: [
      { value: "3", label: "3 mois (bail vide)" },
      { value: "1", label: "1 mois (bail meublé / zone tendue / motif réduit)" },
    ], defaultValue: "3", group: "Congé" },
    { key: "motifReduit", label: "Motif de préavis réduit (si 1 mois)", type: "select", required: false, options: [
      { value: "zone-tendue", label: "Zone tendue" },
      { value: "mutation", label: "Mutation professionnelle" },
      { value: "perte-emploi", label: "Perte d'emploi" },
      { value: "rsa", label: "Bénéficiaire RSA / AAH" },
      { value: "sante", label: "État de santé (+ 60 ans)" },
      { value: "premier-emploi", label: "Premier emploi" },
      { value: "meuble", label: "Bail meublé" },
    ], group: "Congé" },
    { key: "departureDate", label: "Date de départ souhaitée", type: "date", required: true, group: "Congé" },
    { key: "sendDate", label: "Date d'envoi", type: "date", required: true, group: "Congé" },
  ],
  clauses: [
    { id: "header", label: "En-tête", required: true, text: "Lettre recommandée avec accusé de réception\n\n{tenantName}\n{tenantAddress}\n\nÀ l'attention de {landlordName}\n{landlordAddress}\n\nFait le {sendDate}" },
    { id: "conge", label: "Congé", required: true, text: "Objet : Congé — préavis de {preavisDuration} mois\n\nMadame, Monsieur,\n\nPar la présente, je vous informe de ma décision de quitter le logement situé au {propertyAddress}, que j'occupe en vertu du bail signé le {leaseStartDate}.\n\nConformément à l'article 15 de la loi du 6 juillet 1989, je respecte un préavis de {preavisDuration} mois. Mon départ effectif est prévu le {departureDate}." },
    { id: "motif", label: "Motif réduit", required: false, conditional: (data) => data.preavisDuration === "1" && !!data.motifReduit, text: "Ce préavis réduit à 1 mois est justifié par le motif suivant : {motifReduit}." },
    { id: "signature", label: "Signature", required: true, text: "Je me tiens à votre disposition pour convenir d'une date d'état des lieux de sortie.\n\nVeuillez agréer, Madame, Monsieur, l'expression de mes salutations distinguées." },
  ],
};

/* ─── Caution solidaire ─── */
export const frCautionSolidaire: DocumentTemplate = {
  id: "fr-caution-solidaire",
  version: "1.0.0",
  country: "FR",
  category: "rental",
  docType: "caution-solidaire",
  label: "Acte de cautionnement solidaire",
  description: "Engagement de caution solidaire pour un bail d'habitation.",
  legalBasis: "Code civil, art. 2288 et suivants ; Loi n° 89-462, art. 22-1",
  needsLegalReview: false,
  active: true,
  fields: [
    { key: "guarantorName", label: "Nom complet du garant", type: "text", required: true, group: "Garant" },
    { key: "guarantorAddress", label: "Adresse du garant", type: "text", required: true, group: "Garant" },
    { key: "guarantorBirthDate", label: "Date de naissance du garant", type: "date", required: true, group: "Garant" },
    { key: "guarantorBirthPlace", label: "Lieu de naissance du garant", type: "text", required: true, group: "Garant" },
    { key: "tenantName", label: "Nom du locataire", type: "text", required: true, group: "Locataire" },
    { key: "landlordName", label: "Nom du bailleur", type: "text", required: true, group: "Bailleur" },
    { key: "propertyAddress", label: "Adresse du logement", type: "text", required: true, group: "Bien" },
    { key: "rentAmount", label: "Loyer mensuel HC (€)", type: "number", required: true, validation: { min: 1 }, group: "Bail" },
    { key: "chargesAmount", label: "Charges mensuelles (€)", type: "number", required: true, validation: { min: 0 }, defaultValue: 0, group: "Bail" },
    { key: "leaseDuration", label: "Durée du bail (années)", type: "select", required: true, options: [
      { value: "1", label: "1 an (meublé)" },
      { value: "3", label: "3 ans (vide)" },
      { value: "6", label: "6 ans (personne morale)" },
    ], defaultValue: "3", group: "Bail" },
    { key: "cautionDate", label: "Date de l'acte", type: "date", required: true },
  ],
  clauses: [
    { id: "engagement", label: "Engagement de caution", required: true, text: "ACTE DE CAUTIONNEMENT SOLIDAIRE\n\nJe soussigné(e) {guarantorName}, né(e) le {guarantorBirthDate} à {guarantorBirthPlace}, demeurant au {guarantorAddress}, déclare me porter caution solidaire et indivisible au profit de {landlordName}, pour garantir le paiement des loyers, charges et accessoires dus par {tenantName} au titre du bail portant sur le logement situé au {propertyAddress}." },
    { id: "montant", label: "Montant garanti", required: true, text: "Le loyer mensuel est de {rentAmount} € hors charges, avec des charges de {chargesAmount} €.\n\nLe présent cautionnement est consenti pour toute la durée du bail de {leaseDuration} an(s), y compris les renouvellements ou reconductions tacites." },
    { id: "mention-manuscrite", label: "Mention manuscrite obligatoire", required: true, text: "MENTION MANUSCRITE OBLIGATOIRE (à recopier à la main) :\n\n« Je me porte caution solidaire de {tenantName} pour le paiement du loyer et des charges du logement situé au {propertyAddress}, d'un montant mensuel de {rentAmount} € hors charges et {chargesAmount} € de charges, soit un total de [total] € par mois. Je m'engage à rembourser au bailleur les sommes dues en cas de défaillance du locataire, pour la durée du bail de {leaseDuration} an(s) et de ses renouvellements. »" },
    { id: "signature", label: "Signatures", required: true, text: "Fait à _____________, le {cautionDate}\n\nSignature du garant :\n\n\n\nSignature du bailleur (bon pour acceptation) :" },
  ],
};

/* ─── Attestation d'hébergement ─── */
export const frAttestationHebergement: DocumentTemplate = {
  id: "fr-attestation-hebergement",
  version: "1.0.0",
  country: "FR",
  category: "rental",
  docType: "attestation-hebergement",
  label: "Attestation d'hébergement",
  description: "Attestation sur l'honneur d'hébergement à titre gratuit.",
  legalBasis: "Code pénal, art. 441-7 (faux et usage de faux)",
  needsLegalReview: false,
  active: true,
  fields: [
    { key: "hostName", label: "Nom complet de l'hébergeant", type: "text", required: true, group: "Hébergeant" },
    { key: "hostBirthDate", label: "Date de naissance", type: "date", required: true, group: "Hébergeant" },
    { key: "hostBirthPlace", label: "Lieu de naissance", type: "text", required: true, group: "Hébergeant" },
    { key: "hostAddress", label: "Adresse du logement", type: "text", required: true, group: "Hébergeant" },
    { key: "guestName", label: "Nom complet de l'hébergé(e)", type: "text", required: true, group: "Hébergé" },
    { key: "guestBirthDate", label: "Date de naissance de l'hébergé(e)", type: "date", required: true, group: "Hébergé" },
    { key: "guestBirthPlace", label: "Lieu de naissance de l'hébergé(e)", type: "text", required: true, group: "Hébergé" },
    { key: "startDate", label: "Hébergé(e) depuis le", type: "date", required: true },
    { key: "attestationDate", label: "Date de l'attestation", type: "date", required: true },
  ],
  clauses: [
    { id: "declaration", label: "Déclaration", required: true, text: "ATTESTATION D'HÉBERGEMENT\n\nJe soussigné(e) {hostName}, né(e) le {hostBirthDate} à {hostBirthPlace}, certifie sur l'honneur héberger à mon domicile situé au {hostAddress}, à titre gratuit :\n\n{guestName}, né(e) le {guestBirthDate} à {guestBirthPlace},\n\net ce depuis le {startDate}." },
    { id: "engagement", label: "Engagement", required: true, text: "Je certifie sur l'honneur l'exactitude de la présente attestation et suis informé(e) qu'une fausse déclaration m'expose à des sanctions pénales (article 441-7 du Code pénal).\n\nFait pour servir et valoir ce que de droit.\n\nFait à _____________, le {attestationDate}\n\nSignature :" },
  ],
};

/* ─── Commandement de payer ─── */
export const frCommandementPayer: DocumentTemplate = {
  id: "fr-commandement-payer",
  version: "1.0.0",
  country: "FR",
  category: "rental",
  docType: "commandement-payer",
  label: "Commandement de payer (modèle)",
  description: "Modèle de commandement de payer visant la clause résolutoire du bail.",
  legalBasis: "Loi n° 89-462 du 6 juillet 1989, art. 24",
  needsLegalReview: true,
  active: true,
  fields: [
    { key: "landlordName", label: "Nom du bailleur", type: "text", required: true, group: "Bailleur" },
    { key: "landlordAddress", label: "Adresse du bailleur", type: "text", required: true, group: "Bailleur" },
    { key: "tenantName", label: "Nom du locataire", type: "text", required: true, group: "Locataire" },
    { key: "tenantAddress", label: "Adresse du locataire", type: "text", required: true, group: "Locataire" },
    { key: "propertyAddress", label: "Adresse du logement", type: "text", required: true, group: "Bien" },
    { key: "unpaidMonths", label: "Mois impayés", type: "textarea", required: true, placeholder: "Janvier 2026 : 850 €\nFévrier 2026 : 850 €", group: "Impayés" },
    { key: "totalAmount", label: "Montant total dû (€)", type: "number", required: true, validation: { min: 1 }, group: "Impayés" },
    { key: "commandmentDate", label: "Date du commandement", type: "date", required: true },
  ],
  clauses: [
    { id: "header", label: "En-tête", required: true, text: "COMMANDEMENT DE PAYER VISANT LA CLAUSE RÉSOLUTOIRE\n(à faire délivrer par huissier de justice)\n\nDélivré à la requête de {landlordName}, demeurant au {landlordAddress}.\nÀ {tenantName}, demeurant au {tenantAddress}." },
    { id: "commandment", label: "Commandement", required: true, text: "En vertu du bail en date du ______ portant sur le logement situé au {propertyAddress}, et en application de la clause résolutoire prévue audit bail,\n\nIl est fait commandement à {tenantName} d'avoir à payer dans un délai de DEUX MOIS la somme de {totalAmount} € correspondant aux loyers et charges impayés suivants :\n\n{unpaidMonths}" },
    { id: "avertissement", label: "Avertissement", required: true, text: "AVERTISSEMENT : Conformément à l'article 24 de la loi du 6 juillet 1989, à défaut de paiement dans le délai de deux mois, le bail sera résilié de plein droit.\n\nLe locataire est informé qu'il peut saisir le Fonds de Solidarité pour le Logement (FSL) de son département.\n\nFait le {commandmentDate}." },
  ],
};

/* ─── Quittance de dépôt de garantie ─── */
export const frRestitutionDepot: DocumentTemplate = {
  id: "fr-restitution-depot",
  version: "1.0.0",
  country: "FR",
  category: "rental",
  docType: "restitution-depot",
  label: "Restitution du dépôt de garantie",
  description: "Courrier de restitution (totale ou partielle) du dépôt de garantie au locataire.",
  legalBasis: "Loi n° 89-462 du 6 juillet 1989, art. 22",
  needsLegalReview: false,
  active: true,
  fields: [
    { key: "landlordName", label: "Nom du bailleur", type: "text", required: true },
    { key: "landlordAddress", label: "Adresse du bailleur", type: "text", required: true },
    { key: "tenantName", label: "Nom du locataire", type: "text", required: true },
    { key: "tenantNewAddress", label: "Nouvelle adresse du locataire", type: "text", required: true },
    { key: "propertyAddress", label: "Adresse du logement quitté", type: "text", required: true },
    { key: "depositAmount", label: "Montant du dépôt initial (€)", type: "number", required: true, validation: { min: 0 } },
    { key: "retainedAmount", label: "Montant retenu (€)", type: "number", required: true, validation: { min: 0 }, defaultValue: 0 },
    { key: "retainedDetail", label: "Détail des retenues", type: "textarea", required: false, placeholder: "Réparations locatives : 200 €\nLoyers impayés : 0 €\nCharges : 50 €…" },
    { key: "exitDate", label: "Date de sortie des lieux", type: "date", required: true },
    { key: "sendDate", label: "Date du courrier", type: "date", required: true },
  ],
  clauses: [
    { id: "restitution", label: "Restitution", required: true, text: "{landlordName}\n{landlordAddress}\n\nÀ l'attention de {tenantName}\n{tenantNewAddress}\n\nFait le {sendDate}\n\nObjet : Restitution du dépôt de garantie\n\nMadame, Monsieur,\n\nSuite à votre départ du logement situé au {propertyAddress} en date du {exitDate}, je procède à la restitution de votre dépôt de garantie.\n\nDépôt initial : {depositAmount} €\nRetenues justifiées : {retainedAmount} €\n\n{retainedDetail}\n\nMontant restitué : {depositAmount} - {retainedAmount} = [montant net] €\n\nConformément à l'article 22 de la loi du 6 juillet 1989, cette restitution intervient dans le délai légal d'un mois (état des lieux conforme) ou deux mois (différences constatées).\n\nVeuillez agréer, Madame, Monsieur, l'expression de mes salutations distinguées." },
  ],
};
