import type { DocumentTemplate } from "../types";

export const atLeaseResidential: DocumentTemplate = {
  id: "at-lease-residential",
  version: "1.0.0",
  country: "AT",
  category: "rental",
  docType: "lease-residential",
  label: "Mietvertrag Wohnung (Österreich)",
  description: "Mietvertrag für Wohnungen gemäß ABGB und MRG.",
  legalBasis: "Allgemeines Bürgerliches Gesetzbuch (ABGB) §§ 1090 ff.; Mietrechtsgesetz (MRG) ; Richtwertgesetz (RichtWG)",
  needsLegalReview: false,
  active: true,
  fields: [
    { key: "landlordName", label: "Name des Vermieters", type: "text", required: true, group: "Vermieter" },
    { key: "landlordAddress", label: "Anschrift des Vermieters", type: "text", required: true, group: "Vermieter" },
    { key: "tenantName", label: "Name des Mieters", type: "text", required: true, group: "Mieter" },
    { key: "tenantEmail", label: "E-Mail des Mieters", type: "email", required: false, group: "Mieter" },
    { key: "propertyAddress", label: "Adresse der Wohnung", type: "text", required: true, group: "Mietobjekt" },
    { key: "surface", label: "Nutzfläche (m²)", type: "number", required: true, validation: { min: 1 }, group: "Mietobjekt" },
    { key: "rooms", label: "Anzahl der Zimmer", type: "number", required: true, validation: { min: 1 }, group: "Mietobjekt" },
    { key: "mrgApplicable", label: "MRG anwendbar?", type: "select", required: true, options: [
      { value: "voll", label: "Vollanwendung MRG (Altbau vor 1945)" },
      { value: "teil", label: "Teilanwendung MRG (Neubau ab 1945)" },
      { value: "nein", label: "Nicht anwendbar (Ein-/Zweifamilienhaus)" },
    ], defaultValue: "teil", group: "Mietobjekt" },
    { key: "energyClass", label: "Energieausweis-Klasse", type: "select", required: true, options: [
      { value: "A++", label: "A++" }, { value: "A+", label: "A+" }, { value: "A", label: "A" },
      { value: "B", label: "B" }, { value: "C", label: "C" }, { value: "D", label: "D" },
      { value: "E", label: "E" }, { value: "F", label: "F" }, { value: "G", label: "G" },
    ], group: "Energieausweis" },
    { key: "coldRent", label: "Hauptmietzins netto (€/Monat)", type: "number", required: true, validation: { min: 1 }, group: "Mietzins" },
    { key: "operatingCosts", label: "Betriebskosten (€/Monat)", type: "number", required: true, defaultValue: 0, group: "Mietzins" },
    { key: "vat", label: "USt (10%)", type: "number", required: false, defaultValue: 0, group: "Mietzins" },
    { key: "depositAmount", label: "Kaution (€)", type: "number", required: true, validation: {
      min: 0,
      custom: (val, all) => {
        const dep = Number(val);
        const rent = Number(all.coldRent);
        if (rent > 0 && dep > rent * 6) return "Die Kaution sollte üblicherweise nicht mehr als 6 Monatsmieten betragen.";
        return null;
      }
    }, group: "Mietzins" },
    { key: "paymentDay", label: "Zahlungstermin (Tag)", type: "number", required: true, validation: { min: 1, max: 28 }, defaultValue: 1, group: "Mietzins" },
    { key: "startDate", label: "Mietbeginn", type: "date", required: true, group: "Laufzeit" },
    { key: "duration", label: "Mietdauer", type: "select", required: true, options: [
      { value: "unbefristet", label: "Unbefristet" },
      { value: "3", label: "3 Jahre (befristet, Mindestdauer MRG)" },
      { value: "5", label: "5 Jahre" },
    ], defaultValue: "unbefristet", group: "Laufzeit" },
  ],
  clauses: [
    { id: "parteien", label: "§ 1 — Vertragsparteien", required: true,
      text: "ZWISCHEN:\n\nVermieter: {landlordName}, {landlordAddress}\n\nUND:\n\nMieter: {tenantName}" },
    { id: "mietobjekt", label: "§ 2 — Mietobjekt", required: true,
      text: "Vermietet wird die Wohnung in {propertyAddress}, Nutzfläche ca. {surface} m², {rooms} Zimmer.\n\nAnwendbarkeit des MRG: {mrgApplicable}\nEnergieausweis: Klasse {energyClass}" },
    { id: "dauer", label: "§ 3 — Mietdauer", required: true,
      text: "Das Mietverhältnis beginnt am {startDate} auf {duration} Dauer.\n\nBefristete Mietverträge im MRG-Vollanwendungsbereich: Mindestdauer 3 Jahre (§ 29 MRG). Der Mieter kann nach Ablauf des ersten Jahres unter Einhaltung einer 3-monatigen Kündigungsfrist kündigen.\n\nUnbefristete Verträge: Der Mieter kann unter Einhaltung einer einmonatigen Frist zum Monatsletzten kündigen. Der Vermieter kann nur aus wichtigem Grund kündigen (§ 30 MRG)." },
    { id: "mietzins", label: "§ 4 — Mietzins", required: true,
      text: "Der monatliche Mietzins setzt sich zusammen aus:\n\n• Hauptmietzins netto: {coldRent} €\n• Betriebskosten: {operatingCosts} €\n• USt (10%): {vat} €\n\nZahlung bis zum {paymentDay}. jeden Monats.\n\nIm MRG-Vollanwendungsbereich unterliegt der Hauptmietzins dem Richtwertgesetz. Der Richtwert wird jährlich per Verordnung des Justizministeriums angepasst.\n\nWertanpassung: Der Mietzins wird entsprechend dem Verbraucherpreisindex (VPI) der Statistik Austria angepasst." },
    { id: "kaution", label: "§ 5 — Kaution", required: true,
      text: "Der Mieter leistet eine Kaution von {depositAmount} €.\n\nDie Kaution ist auf einem Sparbuch oder Treuhandkonto anzulegen. Die Zinsen stehen dem Mieter zu.\n\nRückzahlung nach Beendigung des Mietverhältnisses und Übergabe, abzüglich allfälliger berechtigter Forderungen." },
    { id: "erhaltung", label: "§ 6 — Erhaltung und Verbesserung", required: true,
      text: "Der Vermieter ist zur Erhaltung des Mietgegenstandes in brauchbarem Zustand verpflichtet (§ 3 MRG).\n\nDer Mieter hat Schäden, die durch ihn oder seine Mitbewohner verursacht werden, unverzüglich zu beheben.\n\nWesentliche Veränderungen bedürfen der Zustimmung des Vermieters (§ 9 MRG)." },
    { id: "kuendigung", label: "§ 7 — Kündigung durch den Vermieter", required: true,
      text: "Der Vermieter kann im MRG-Bereich nur gerichtlich und aus wichtigem Grund kündigen (§ 30 MRG):\n\n• Zahlungsverzug trotz Mahnung\n• Erheblich nachteiliger Gebrauch\n• Nicht regelmäßige Benützung\n• Eigenbedarf des Vermieters\n• Vertragswidrige Untervermietung\n\nDie Kündigungsfrist beträgt mindestens 1 Monat zum Monatsletzten." },
    { id: "gebuehren", label: "§ 8 — Vertragsgebühren", required: true,
      text: "Die Vergebührung des Mietvertrages erfolgt gemäß dem Gebührengesetz (GebG). Die Gebühr beträgt 1% des Bruttomietzinses auf die Vertragsdauer (max. 36 Monate bei unbefristeten Verträgen).\n\nDie Kosten werden, soweit nicht anders vereinbart, von beiden Parteien je zur Hälfte getragen." },
  ],
};

export const atRentReceipt: DocumentTemplate = {
  id: "at-rent-receipt",
  version: "1.0.0",
  country: "AT",
  category: "rental",
  docType: "rent-receipt",
  label: "Mietquittung (Österreich)",
  description: "Quittung über erhaltene Mietzahlung.",
  legalBasis: "ABGB § 1426",
  needsLegalReview: false,
  active: true,
  fields: [
    { key: "landlordName", label: "Name des Vermieters", type: "text", required: true, group: "Vermieter" },
    { key: "tenantName", label: "Name des Mieters", type: "text", required: true, group: "Mieter" },
    { key: "propertyAddress", label: "Adresse der Wohnung", type: "text", required: true, group: "Mietobjekt" },
    { key: "coldRent", label: "Hauptmietzins (€)", type: "number", required: true, group: "Beträge" },
    { key: "operatingCosts", label: "Betriebskosten (€)", type: "number", required: true, defaultValue: 0, group: "Beträge" },
    { key: "period", label: "Zeitraum", type: "text", required: true, placeholder: "Jänner 2026", group: "Zeitraum" },
    { key: "paymentDate", label: "Zahlungsdatum", type: "date", required: true, group: "Zeitraum" },
  ],
  clauses: [
    { id: "quittung", label: "Mietquittung", required: true,
      text: "MIETQUITTUNG\n\n{landlordName} bestätigt den Erhalt der Mietzahlung von {tenantName} für die Wohnung {propertyAddress} für den Zeitraum {period}:\n\n• Hauptmietzins: {coldRent} €\n• Betriebskosten: {operatingCosts} €\n• Gesamtbetrag: {totalAmount} €\n\nZahlungsdatum: {paymentDate}\n\nOrt, Datum: ____________\nUnterschrift:" },
  ],
};
