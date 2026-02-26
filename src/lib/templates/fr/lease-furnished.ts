import type { DocumentTemplate } from "../types";

export const frLeaseFurnished: DocumentTemplate = {
  id: "fr-lease-furnished",
  version: "2.0.0",
  country: "FR",
  category: "rental",
  docType: "lease-furnished",
  label: "Bail meublé",
  description: "Contrat de bail meublé conforme à la loi ALUR et au décret n° 2015-981.",
  legalBasis: "Loi n° 89-462, art. 25-3 à 25-11 ; Décret n° 2015-981 du 31 juillet 2015",
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
    // Bien
    { key: "propertyAddress", label: "Adresse du bien", type: "text", required: true, validation: { minLength: 5 }, group: "Le logement" },
    { key: "propertyType", label: "Type de bien", type: "select", required: true, options: [
      { value: "Appartement meublé", label: "Appartement meublé" },
      { value: "Studio meublé", label: "Studio meublé" },
      { value: "Chambre meublée", label: "Chambre meublée" },
      { value: "Maison meublée", label: "Maison meublée" },
    ], group: "Le logement" },
    { key: "surface", label: "Surface habitable (m²)", type: "number", required: true, validation: { min: 9 }, group: "Le logement" },
    { key: "rooms", label: "Nombre de pièces principales", type: "number", required: true, validation: { min: 1 }, defaultValue: 1, group: "Le logement" },
    { key: "floor", label: "Étage", type: "number", required: false, group: "Le logement" },
    { key: "heating", label: "Type de chauffage", type: "select", required: true, options: [
      { value: "individuel-gaz", label: "Individuel gaz" },
      { value: "individuel-electrique", label: "Individuel électrique" },
      { value: "collectif", label: "Collectif" },
    ], defaultValue: "individuel-electrique", group: "Le logement" },
    { key: "annexes", label: "Annexes (cave, parking…)", type: "textarea", required: false, group: "Le logement" },
    // Mobilier obligatoire
    { key: "furnitureList", label: "Liste du mobilier fourni", type: "textarea", required: true, placeholder: "Literie avec couette/couverture\nVolets ou rideaux occultants\nPlaques de cuisson\nFour ou micro-ondes\nRéfrigérateur\nVaisselle et ustensiles\nTable et chaises\nÉtagères de rangement\nLuminaires\nMatériel d'entretien ménager", group: "Mobilier" },
    // Conditions financières
    { key: "rentAmount", label: "Loyer mensuel HC (€)", type: "number", required: true, validation: { min: 1 }, group: "Conditions financières" },
    { key: "chargesAmount", label: "Provisions pour charges (€)", type: "number", required: true, validation: { min: 0 }, defaultValue: 0, group: "Conditions financières" },
    { key: "chargesMode", label: "Mode de charges", type: "select", required: true, options: [
      { value: "provisions", label: "Provisions avec régularisation" },
      { value: "forfait", label: "Forfait (pas de régularisation)" },
    ], defaultValue: "forfait", group: "Conditions financières" },
    { key: "depositAmount", label: "Dépôt de garantie (€)", type: "number", required: true, validation: {
      min: 0,
      custom: (val, all) => {
        const deposit = Number(val);
        const rent = Number(all.rentAmount);
        if (rent > 0 && deposit > rent * 2) return "Pour un bail meublé, le dépôt ne peut excéder 2 mois de loyer HC (art. 25-6).";
        return null;
      }
    }, group: "Conditions financières" },
    { key: "paymentDay", label: "Jour de paiement", type: "number", required: true, validation: { min: 1, max: 28 }, defaultValue: 5, group: "Conditions financières" },
    { key: "paymentMethod", label: "Mode de paiement", type: "select", required: true, options: [
      { value: "virement", label: "Virement bancaire" },
      { value: "prelevement", label: "Prélèvement automatique" },
      { value: "cheque", label: "Chèque" },
    ], defaultValue: "virement", group: "Conditions financières" },
    // DPE
    { key: "dpeLetter", label: "Classe DPE", type: "select", required: true, options: [
      { value: "A", label: "A" }, { value: "B", label: "B" }, { value: "C", label: "C" },
      { value: "D", label: "D" }, { value: "E", label: "E" }, { value: "F", label: "F" }, { value: "G", label: "G" },
    ], group: "Diagnostics" },
    { key: "gesLetter", label: "Classe GES", type: "select", required: false, options: [
      { value: "A", label: "A" }, { value: "B", label: "B" }, { value: "C", label: "C" },
      { value: "D", label: "D" }, { value: "E", label: "E" }, { value: "F", label: "F" }, { value: "G", label: "G" },
    ], group: "Diagnostics" },
    // Dates
    { key: "startDate", label: "Date de début", type: "date", required: true, group: "Durée" },
    { key: "duration", label: "Durée", type: "select", required: true, options: [
      { value: "1", label: "1 an (standard)" },
      { value: "9m", label: "9 mois (bail étudiant — non renouvelable)" },
      { value: "1-10m", label: "1 à 10 mois (bail mobilité)" },
    ], defaultValue: "1", group: "Durée" },
  ],
  clauses: [
    { id: "parties", label: "Article 1 — Désignation des parties", required: true,
      text: "ENTRE :\n\nLe bailleur : {landlordName}, demeurant au {landlordAddress}\n\nET :\n\nLe locataire : {tenantName}" },
    { id: "objet", label: "Article 2 — Objet du bail", required: true,
      text: "Le bailleur donne en location au locataire un logement meublé de type {propertyType}, situé au {propertyAddress}, d'une surface habitable de {surface} m², comprenant {rooms} pièce(s) principale(s).\n\nÉtage : {floor}\nChauffage : {heating}\nAnnexes : {annexes}" },
    { id: "mobilier", label: "Article 3 — Mobilier et équipements", required: true,
      text: "Le logement est loué meublé conformément au décret n° 2015-981 du 31 juillet 2015 définissant les éléments de mobilier d'un logement meublé.\n\nListe du mobilier fourni :\n{furnitureList}\n\nUn inventaire détaillé et chiffré du mobilier est annexé au présent bail. Le locataire est tenu de restituer le mobilier en bon état d'usage." },
    { id: "destination", label: "Article 4 — Destination des lieux", required: true,
      text: "Les lieux loués sont destinés exclusivement à l'habitation principale du locataire. Le locataire s'interdit d'exercer dans les lieux toute activité commerciale ou de sous-louer sans l'accord écrit du bailleur." },
    { id: "duration", label: "Article 5 — Durée du bail", required: true,
      text: "Le bail est consenti pour une durée de {duration} à compter du {startDate}.\n\nPour un bail d'un an : à l'expiration, le bail est reconduit tacitement pour un an.\nPour un bail étudiant de 9 mois : le bail n'est pas reconduit tacitement.\nPour un bail mobilité : le bail n'est ni renouvelé ni reconduit." },
    { id: "loyer", label: "Article 6 — Loyer et charges", required: true,
      text: "Le loyer mensuel est fixé à {rentAmount} € hors charges. Les charges s'élèvent à {chargesAmount} € par mois en {chargesMode}.\n\nLe loyer est payable d'avance le {paymentDay} de chaque mois par {paymentMethod}.\n\nRévision : le loyer est révisable annuellement selon l'IRL (art. 17-1 de la loi du 6 juillet 1989)." },
    { id: "depot", label: "Article 7 — Dépôt de garantie", required: true,
      text: "Un dépôt de garantie de {depositAmount} € est versé à la signature.\n\nRestitution : dans un délai d'un mois (état des lieux conforme) ou deux mois (différences constatées) après remise des clés.\n\nNote : pour les baux mobilité, aucun dépôt de garantie ne peut être exigé." },
    { id: "diagnostics", label: "Article 8 — Diagnostics", required: true,
      text: "Sont annexés au bail :\n• DPE : classe {dpeLetter} (GES : {gesLetter})\n• CREP (plomb) — bâtiments avant 1949\n• État des risques et pollutions (ERP)\n• Diagnostic électricité et gaz (installations > 15 ans)\n• Diagnostic bruit" },
    { id: "travaux", label: "Article 9 — Entretien et réparations", required: true,
      text: "Le locataire est tenu des réparations locatives et de l'entretien courant du logement et du mobilier (décret n° 87-712).\n\nLe bailleur est tenu de procéder aux réparations non locatives et de maintenir le logement en état de servir à l'usage prévu." },
    { id: "assurance", label: "Article 10 — Assurance", required: true,
      text: "Le locataire est tenu de s'assurer contre les risques locatifs et d'en justifier annuellement. À défaut, le bailleur peut résilier le bail après mise en demeure restée sans effet pendant un mois." },
    { id: "conge", label: "Article 11 — Congé", required: true,
      text: "Le locataire peut donner congé à tout moment avec un préavis d'un mois (bail meublé).\n\nLe bailleur peut donner congé pour l'échéance du bail avec un préavis de 3 mois pour : reprise personnelle, vente, ou motif légitime et sérieux (art. 25-8 de la loi du 6 juillet 1989)." },
    { id: "resiliation", label: "Article 12 — Clause résolutoire", required: true,
      text: "Le bail sera résilié de plein droit :\n• Deux mois après commandement de payer demeuré infructueux\n• Un mois après commandement pour défaut d'assurance\n• En cas de troubles de voisinage constatés par décision de justice" },
    { id: "edl", label: "Article 13 — État des lieux et inventaire", required: true,
      text: "Un état des lieux d'entrée et un inventaire détaillé du mobilier seront établis contradictoirement. L'état des lieux de sortie sera comparé à celui d'entrée pour déterminer les réparations locatives à la charge du locataire." },
    { id: "election", label: "Article 14 — Élection de domicile", required: true,
      text: "Pour l'exécution du présent bail, le bailleur élit domicile à son adresse ci-dessus mentionnée et le locataire dans les lieux loués." },
  ],
};
