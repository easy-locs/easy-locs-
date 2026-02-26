import type { DocumentTemplate } from "../types";

const durationOptions = [
  { value: "3", label: "3 ans (personne physique)" },
  { value: "6", label: "6 ans (personne morale / SCI)" },
];

export const frLeaseEmpty: DocumentTemplate = {
  id: "fr-lease-empty",
  version: "2.0.0",
  country: "FR",
  category: "rental",
  docType: "lease-empty",
  label: "Bail d'habitation vide",
  description: "Contrat de bail non meublé conforme à la loi ALUR et au décret n° 2015-587.",
  legalBasis: "Loi n° 89-462 du 6 juillet 1989 modifiée par la loi ALUR du 24 mars 2014 ; Décret n° 2015-587 du 29 mai 2015",
  needsLegalReview: false,
  active: true,
  fields: [
    // Bailleur
    { key: "landlordName", label: "Nom du bailleur", type: "text", required: true, validation: { minLength: 2 }, group: "Bailleur" },
    { key: "landlordAddress", label: "Adresse du bailleur", type: "text", required: true, validation: { minLength: 5 }, group: "Bailleur" },
    { key: "landlordEmail", label: "Email du bailleur", type: "email", required: false, group: "Bailleur" },
    { key: "landlordPhone", label: "Téléphone du bailleur", type: "phone", required: false, group: "Bailleur" },
    // Locataire
    { key: "tenantName", label: "Nom du locataire", type: "text", required: true, validation: { minLength: 2 }, group: "Locataire" },
    { key: "tenantBirthDate", label: "Date de naissance", type: "date", required: false, group: "Locataire" },
    { key: "tenantBirthPlace", label: "Lieu de naissance", type: "text", required: false, group: "Locataire" },
    { key: "tenantEmail", label: "Email du locataire", type: "email", required: false, group: "Locataire" },
    { key: "tenantPhone", label: "Téléphone du locataire", type: "phone", required: false, group: "Locataire" },
    // Bien
    { key: "propertyAddress", label: "Adresse du bien", type: "text", required: true, validation: { minLength: 5 }, group: "Le logement" },
    { key: "propertyType", label: "Type de bien", type: "select", required: true, options: [
      { value: "Appartement", label: "Appartement" },
      { value: "Maison", label: "Maison" },
      { value: "Studio", label: "Studio" },
    ], group: "Le logement" },
    { key: "surface", label: "Surface habitable (m²)", type: "number", required: true, validation: { min: 9, max: 10000 }, group: "Le logement" },
    { key: "rooms", label: "Nombre de pièces principales", type: "number", required: true, validation: { min: 1 }, defaultValue: 1, group: "Le logement" },
    { key: "floor", label: "Étage", type: "number", required: false, group: "Le logement" },
    { key: "buildingFloors", label: "Nombre d'étages du bâtiment", type: "number", required: false, group: "Le logement" },
    { key: "buildYear", label: "Année de construction", type: "number", required: false, group: "Le logement" },
    { key: "heating", label: "Type de chauffage", type: "select", required: true, options: [
      { value: "individuel-gaz", label: "Individuel gaz" },
      { value: "individuel-electrique", label: "Individuel électrique" },
      { value: "collectif", label: "Collectif" },
      { value: "pompe-chaleur", label: "Pompe à chaleur" },
    ], defaultValue: "individuel-gaz", group: "Le logement" },
    { key: "hotWater", label: "Production d'eau chaude", type: "select", required: true, options: [
      { value: "individuel", label: "Individuelle" },
      { value: "collectif", label: "Collective" },
    ], defaultValue: "individuel", group: "Le logement" },
    { key: "annexes", label: "Annexes (cave, parking, grenier…)", type: "textarea", required: false, placeholder: "Cave n°12 au sous-sol\nPlace de parking n°45", group: "Le logement" },
    { key: "equipments", label: "Équipements du logement", type: "textarea", required: false, placeholder: "Cuisine équipée, interphone, volets roulants, double vitrage…", group: "Le logement" },
    // Conditions financières
    { key: "rentAmount", label: "Loyer mensuel HC (€)", type: "number", required: true, validation: { min: 1 }, group: "Conditions financières" },
    { key: "chargesAmount", label: "Provisions pour charges (€)", type: "number", required: true, validation: { min: 0 }, defaultValue: 0, group: "Conditions financières" },
    { key: "chargesMode", label: "Mode de charges", type: "select", required: true, options: [
      { value: "provisions", label: "Provisions avec régularisation annuelle" },
      { value: "forfait", label: "Forfait de charges" },
    ], defaultValue: "provisions", group: "Conditions financières" },
    { key: "depositAmount", label: "Dépôt de garantie (€)", type: "number", required: true, validation: {
      min: 0,
      custom: (val, all) => {
        const deposit = Number(val);
        const rent = Number(all.rentAmount);
        if (rent > 0 && deposit > rent) return "Pour un bail vide, le dépôt ne peut excéder 1 mois de loyer HC (art. 22 loi 89-462).";
        return null;
      }
    }, group: "Conditions financières" },
    { key: "paymentDay", label: "Jour de paiement du loyer", type: "number", required: true, validation: { min: 1, max: 28 }, defaultValue: 5, group: "Conditions financières" },
    { key: "paymentMethod", label: "Mode de paiement", type: "select", required: true, options: [
      { value: "virement", label: "Virement bancaire" },
      { value: "prelevement", label: "Prélèvement automatique" },
      { value: "cheque", label: "Chèque" },
    ], defaultValue: "virement", group: "Conditions financières" },
    // Zone tendue
    { key: "zoneTendue", label: "Zone tendue ?", type: "select", required: true, options: [
      { value: "oui", label: "Oui" },
      { value: "non", label: "Non" },
    ], defaultValue: "non", group: "Encadrement des loyers" },
    { key: "loyerReference", label: "Loyer de référence majoré (€/m²) — si zone tendue", type: "number", required: false, group: "Encadrement des loyers" },
    { key: "complementLoyer", label: "Complément de loyer (€) — si applicable", type: "number", required: false, group: "Encadrement des loyers" },
    { key: "complementMotif", label: "Justification du complément de loyer", type: "textarea", required: false, placeholder: "Terrasse, vue exceptionnelle, hauteur sous plafond…", group: "Encadrement des loyers" },
    // DPE
    { key: "dpeLetter", label: "Classe DPE", type: "select", required: true, options: [
      { value: "A", label: "A" }, { value: "B", label: "B" }, { value: "C", label: "C" },
      { value: "D", label: "D" }, { value: "E", label: "E" }, { value: "F", label: "F" },
      { value: "G", label: "G" },
    ], group: "Diagnostics" },
    { key: "gesLetter", label: "Classe GES", type: "select", required: false, options: [
      { value: "A", label: "A" }, { value: "B", label: "B" }, { value: "C", label: "C" },
      { value: "D", label: "D" }, { value: "E", label: "E" }, { value: "F", label: "F" },
      { value: "G", label: "G" },
    ], group: "Diagnostics" },
    { key: "dpeDate", label: "Date du diagnostic", type: "date", required: false, group: "Diagnostics" },
    // Dates
    { key: "startDate", label: "Date de début", type: "date", required: true, group: "Durée" },
    { key: "duration", label: "Durée (années)", type: "select", required: true, options: durationOptions, defaultValue: "3", group: "Durée" },
  ],
  clauses: [
    { id: "parties", label: "Article 1 — Désignation des parties", required: true,
      text: "ENTRE :\n\nLe bailleur : {landlordName}, demeurant au {landlordAddress}\n\nET :\n\nLe locataire : {tenantName}" },
    { id: "objet", label: "Article 2 — Objet du bail", required: true,
      text: "Le bailleur donne en location au locataire qui accepte, un logement de type {propertyType}, situé au {propertyAddress}, d'une surface habitable de {surface} m², comprenant {rooms} pièce(s) principale(s).\n\nÉtage : {floor}\nChauffage : {heating}\nProduction d'eau chaude : {hotWater}" },
    { id: "annexes", label: "Article 3 — Annexes et équipements", required: true,
      text: "Annexes : {annexes}\n\nÉquipements : {equipments}" },
    { id: "destination", label: "Article 4 — Destination des lieux", required: true,
      text: "Les lieux loués sont destinés exclusivement à l'usage d'habitation principale du locataire. Le locataire s'interdit d'exercer dans les lieux toute activité commerciale, artisanale ou industrielle." },
    { id: "duration", label: "Article 5 — Durée du bail", required: true,
      text: "Le présent bail est consenti et accepté pour une durée de {duration} an(s) à compter du {startDate}.\n\nÀ défaut de congé donné par l'une ou l'autre des parties dans les formes et délais légaux, le bail est reconduit tacitement pour la même durée." },
    { id: "loyer", label: "Article 6 — Loyer", required: true,
      text: "Le loyer mensuel est fixé à {rentAmount} € hors charges.\n\nIl est payable d'avance le {paymentDay} de chaque mois par {paymentMethod}.\n\nLe loyer sera révisé chaque année à la date anniversaire du bail en fonction de la variation de l'Indice de Référence des Loyers (IRL) publié par l'INSEE (art. 17-1 de la loi du 6 juillet 1989)." },
    { id: "charges", label: "Article 7 — Charges locatives", required: true,
      text: "Les charges locatives sont fixées à {chargesAmount} € par mois en {chargesMode}.\n\nElles comprennent les charges récupérables au sens du décret n° 87-713 du 26 août 1987 : ascenseur, eau froide/chaude, chauffage collectif, entretien parties communes, taxe d'enlèvement des ordures ménagères.\n\nUne régularisation annuelle sera effectuée sur justificatifs (art. 23 de la loi du 6 juillet 1989)." },
    { id: "depot", label: "Article 8 — Dépôt de garantie", required: true,
      text: "Un dépôt de garantie de {depositAmount} € est versé à la signature du bail.\n\nIl sera restitué dans un délai d'un mois à compter de la remise des clés si l'état des lieux de sortie est conforme, ou dans un délai de deux mois en cas de différences constatées, déduction faite des sommes justifiées restant dues (art. 22 de la loi du 6 juillet 1989).\n\nÀ défaut de restitution dans les délais, le dépôt produit des intérêts de retard de 10% du loyer par mois de retard." },
    { id: "zone-tendue", label: "Article 9 — Encadrement des loyers", required: false,
      conditional: (data) => data.zoneTendue === "oui",
      text: "Le logement est situé en zone tendue. Le loyer de référence majoré est de {loyerReference} €/m².\n\nComplément de loyer : {complementLoyer} €\nJustification : {complementMotif}\n\nLe locataire peut contester le complément de loyer devant la commission départementale de conciliation dans un délai de 3 mois (art. 140 de la loi ALUR)." },
    { id: "diagnostics", label: "Article 10 — Diagnostics techniques", required: true,
      text: "Conformément à la réglementation en vigueur, les diagnostics suivants sont annexés au présent bail :\n\n• Diagnostic de Performance Énergétique (DPE) : classe {dpeLetter} (GES : {gesLetter}) — réalisé le {dpeDate}\n• Constat de risque d'exposition au plomb (CREP) — bâtiments avant 1949\n• État des risques et pollutions (ERP)\n• Diagnostic amiante (parties privatives) — bâtiments avant 1997\n• Diagnostic électricité et gaz (installations de plus de 15 ans)\n• Diagnostic bruit — zones d'exposition au bruit des aérodromes" },
    { id: "travaux", label: "Article 11 — Travaux et entretien", required: true,
      text: "Le locataire prend les lieux dans l'état où ils se trouvent, tel que constaté dans l'état des lieux d'entrée.\n\nIl est tenu de les maintenir en bon état d'entretien courant et de procéder aux menues réparations (décret n° 87-712 du 26 août 1987).\n\nLe bailleur est tenu de procéder à toutes les réparations autres que locatives, nécessaires au maintien en état et à l'entretien normal des locaux loués (art. 6 de la loi du 6 juillet 1989).\n\nLe locataire ne peut effectuer de travaux de transformation sans l'accord écrit préalable du bailleur." },
    { id: "assurance", label: "Article 12 — Assurance", required: true,
      text: "Le locataire est tenu de s'assurer contre les risques locatifs (incendie, dégâts des eaux, explosion) et de justifier de cette assurance lors de la remise des clés puis chaque année à la demande du bailleur.\n\nÀ défaut de justification, le bailleur peut résilier le bail ou souscrire une assurance pour le compte du locataire, dont le coût sera répercuté (art. 7 de la loi du 6 juillet 1989)." },
    { id: "conge", label: "Article 13 — Congé", required: true,
      text: "Le locataire peut donner congé à tout moment, avec un préavis de 3 mois (réduit à 1 mois en zone tendue, mutation, perte d'emploi, RSA/AAH, ou état de santé justifié pour les plus de 60 ans).\n\nLe bailleur peut donner congé pour la fin du bail, avec un préavis de 6 mois, pour l'un des motifs suivants : reprise personnelle, vente du logement, ou motif légitime et sérieux (art. 15 de la loi du 6 juillet 1989)." },
    { id: "solidarite", label: "Article 14 — Clause de solidarité", required: true,
      text: "En cas de pluralité de locataires, ceux-ci sont tenus solidairement et indivisiblement des obligations du présent bail, notamment le paiement du loyer et des charges.\n\nCette solidarité prend fin à la date d'effet du congé régulièrement délivré et au terme d'un délai de 6 mois après celui-ci (art. 8-1 de la loi du 6 juillet 1989)." },
    { id: "edl", label: "Article 15 — État des lieux", required: true,
      text: "Un état des lieux sera établi contradictoirement et amiablement par les parties lors de la remise et de la restitution des clés, conformément aux dispositions de l'article 3-2 de la loi du 6 juillet 1989 et du décret n° 2016-382 du 30 mars 2016.\n\nÀ défaut d'état des lieux d'entrée, le locataire est présumé avoir reçu les lieux en bon état." },
    { id: "resiliation", label: "Article 16 — Clause résolutoire", required: true,
      text: "Le présent bail sera résilié de plein droit :\n\n• À défaut de paiement du loyer et des charges aux termes convenus, deux mois après un commandement de payer demeuré infructueux\n• À défaut de justification d'assurance locative, un mois après un commandement demeuré infructueux\n• En cas de non-respect de l'obligation d'user paisiblement des locaux\n\n(Article 24 de la loi du 6 juillet 1989)" },
    { id: "election", label: "Article 17 — Élection de domicile", required: true,
      text: "Pour l'exécution du présent bail, les parties font élection de domicile :\n\n• Le bailleur : à son adresse ci-dessus mentionnée\n• Le locataire : dans les lieux loués" },
  ],
};
