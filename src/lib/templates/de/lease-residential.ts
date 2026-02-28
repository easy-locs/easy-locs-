import type { DocumentTemplate } from "../types";

export const deLeaseResidential: DocumentTemplate = {
  id: "de-lease-residential",
  version: "1.0.0",
  country: "DE",
  category: "rental",
  docType: "lease-residential",
  label: "Wohnungsmietvertrag (Deutschland)",
  description: "Standardmietvertrag für Wohnraum gemäß BGB §§ 535 ff.",
  legalBasis: "Bürgerliches Gesetzbuch (BGB) §§ 535–580a; Mietpreisbremse: MietNovG 2015; Betriebskostenverordnung (BetrKV)",
  needsLegalReview: false,
  active: true,
  fields: [
    { key: "landlordName", label: "Name des Vermieters", type: "text", required: true, validation: { minLength: 2 }, group: "Vermieter" },
    { key: "landlordAddress", label: "Anschrift des Vermieters", type: "text", required: true, group: "Vermieter" },
    { key: "landlordEmail", label: "E-Mail des Vermieters", type: "email", required: false, group: "Vermieter" },
    { key: "tenantName", label: "Name des Mieters", type: "text", required: true, validation: { minLength: 2 }, group: "Mieter" },
    { key: "tenantAddress", label: "Aktuelle Anschrift des Mieters", type: "text", required: false, group: "Mieter" },
    { key: "tenantEmail", label: "E-Mail des Mieters", type: "email", required: false, group: "Mieter" },
    { key: "propertyAddress", label: "Adresse der Mietwohnung", type: "text", required: true, group: "Mietobjekt" },
    { key: "floor", label: "Stockwerk", type: "text", required: false, group: "Mietobjekt" },
    { key: "surface", label: "Wohnfläche (m²)", type: "number", required: true, validation: { min: 1 }, group: "Mietobjekt" },
    { key: "rooms", label: "Anzahl der Zimmer", type: "number", required: true, validation: { min: 1 }, group: "Mietobjekt" },
    { key: "extras", label: "Zubehörräume (Keller, Stellplatz…)", type: "textarea", required: false, group: "Mietobjekt" },
    { key: "energyCertificate", label: "Energieausweis-Klasse", type: "select", required: true, options: [
      { value: "A+", label: "A+" }, { value: "A", label: "A" }, { value: "B", label: "B" },
      { value: "C", label: "C" }, { value: "D", label: "D" }, { value: "E", label: "E" },
      { value: "F", label: "F" }, { value: "G", label: "G" }, { value: "H", label: "H" },
    ], group: "Energieausweis" },
    { key: "coldRent", label: "Kaltmiete (€/Monat)", type: "number", required: true, validation: { min: 1 }, group: "Miete" },
    { key: "operatingCosts", label: "Betriebskostenvorauszahlung (€/Monat)", type: "number", required: true, defaultValue: 0, group: "Miete" },
    { key: "heatingCosts", label: "Heizkostenvorauszahlung (€/Monat)", type: "number", required: true, defaultValue: 0, group: "Miete" },
    { key: "depositAmount", label: "Kaution (€)", type: "number", required: true, validation: {
      min: 0,
      custom: (val, all) => {
        const dep = Number(val);
        const rent = Number(all.coldRent);
        if (rent > 0 && dep > rent * 3) return "Die Kaution darf maximal 3 Monatskaltmieten betragen (§ 551 BGB).";
        return null;
      }
    }, group: "Miete" },
    { key: "mietpreisbremse", label: "Mietpreisbremse anwendbar?", type: "select", required: true, options: [
      { value: "ja", label: "Ja" },
      { value: "nein", label: "Nein" },
    ], defaultValue: "nein", group: "Miete" },
    { key: "paymentDay", label: "Zahlungstermin (Tag)", type: "number", required: true, validation: { min: 1, max: 28 }, defaultValue: 3, group: "Miete" },
    { key: "startDate", label: "Mietbeginn", type: "date", required: true, group: "Laufzeit" },
    { key: "duration", label: "Mietdauer", type: "select", required: true, options: [
      { value: "unbefristet", label: "Unbefristet" },
      { value: "befristet", label: "Befristet (Zeitmietvertrag § 575 BGB)" },
    ], defaultValue: "unbefristet", group: "Laufzeit" },
  ],
  clauses: [
    { id: "parteien", label: "§ 1 — Vertragsparteien", required: true,
      text: "ZWISCHEN:\n\nVermieter: {landlordName}, wohnhaft {landlordAddress}\n\nUND:\n\nMieter: {tenantName}" },
    { id: "mietobjekt", label: "§ 2 — Mietobjekt", required: true,
      text: "Der Vermieter vermietet dem Mieter die Wohnung in {propertyAddress}, {floor}, mit einer Wohnfläche von ca. {surface} m² und {rooms} Zimmer(n).\n\nZubehörräume: {extras}\n\nEnergieausweis: Klasse {energyCertificate}" },
    { id: "mietzweck", label: "§ 3 — Nutzung", required: true,
      text: "Die Mieträume dürfen ausschließlich zu Wohnzwecken genutzt werden. Eine gewerbliche Nutzung oder Untervermietung bedarf der vorherigen schriftlichen Zustimmung des Vermieters (§ 540 BGB)." },
    { id: "mietdauer", label: "§ 4 — Mietdauer und Kündigung", required: true,
      text: "Das Mietverhältnis beginnt am {startDate} und wird auf {duration} Dauer geschlossen.\n\nBei unbefristetem Mietvertrag:\n• Kündigungsfrist für den Mieter: 3 Monate (§ 573c BGB)\n• Kündigungsfrist für den Vermieter: 3 Monate (< 5 Jahre), 6 Monate (5–8 Jahre), 9 Monate (> 8 Jahre)\n• Der Vermieter benötigt einen gesetzlich anerkannten Kündigungsgrund (§ 573 BGB): Eigenbedarf, Pflichtverletzung des Mieters, oder wirtschaftliche Verwertung" },
    { id: "miete", label: "§ 5 — Miete", required: true,
      text: "Die monatliche Miete setzt sich wie folgt zusammen:\n\n• Kaltmiete (Nettomiete): {coldRent} €\n• Betriebskostenvorauszahlung: {operatingCosts} €\n• Heizkostenvorauszahlung: {heatingCosts} €\n• Warmmiete (gesamt): {totalRent} €\n\nDie Miete ist bis zum {paymentDay}. eines jeden Monats im Voraus zu entrichten.\n\nDie Betriebskosten werden jährlich abgerechnet (§ 556 BGB). Die Abrechnung muss spätestens 12 Monate nach Ende des Abrechnungszeitraums erfolgen." },
    { id: "kaution", label: "§ 6 — Kaution", required: true,
      text: "Der Mieter leistet eine Mietkaution in Höhe von {depositAmount} €.\n\nDie Kaution kann in drei gleichen monatlichen Raten gezahlt werden, die erste Rate bei Mietbeginn (§ 551 Abs. 2 BGB).\n\nDer Vermieter hat die Kaution getrennt von seinem Vermögen bei einem Kreditinstitut anzulegen. Die Zinsen stehen dem Mieter zu (§ 551 Abs. 3 BGB).\n\nDie Rückzahlung erfolgt innerhalb einer angemessenen Frist (i.d.R. 3–6 Monate) nach Beendigung des Mietverhältnisses." },
    { id: "zustand", label: "§ 7 — Wohnungsübergabe", required: true,
      text: "Bei Ein- und Auszug wird ein Übergabeprotokoll erstellt, das den Zustand der Wohnung und die Zählerstände dokumentiert.\n\nDer Mieter übernimmt die Wohnung im gegenwärtigen Zustand." },
    { id: "instandhaltung", label: "§ 8 — Instandhaltung", required: true,
      text: "Der Vermieter ist zur Instandhaltung der Mietsache verpflichtet (§ 535 Abs. 1 BGB).\n\nKleinreparaturen bis zu einem Einzelbetrag von 120 € und einem Jahreshöchstbetrag von 6 % der Jahresnettomiete können dem Mieter übertragen werden.\n\nSchönheitsreparaturen: Der Mieter ist nur dann zur Durchführung verpflichtet, wenn die entsprechende Klausel wirksam vereinbart wurde." },
    { id: "mietpreisbremse", label: "§ 9 — Mietpreisbremse", required: false,
      conditional: (data) => data.mietpreisbremse === "ja",
      text: "Die Wohnung befindet sich in einem Gebiet mit angespanntem Wohnungsmarkt. Die Miete darf höchstens 10 % über der ortsüblichen Vergleichsmiete liegen (§§ 556d ff. BGB).\n\nAusnahmen gelten für Neubauten und umfassend modernisierte Wohnungen." },
    { id: "mieterhoehung", label: "§ 10 — Mieterhöhung", required: true,
      text: "Mieterhöhungen sind bis zur ortsüblichen Vergleichsmiete möglich (§ 558 BGB). Die Miete darf innerhalb von 3 Jahren um maximal 20 % (15 % in Gebieten mit Kappungsgrenze) steigen.\n\nMieterhöhungen nach Modernisierung: Maximal 8 % der aufgewendeten Kosten pro Jahr (§ 559 BGB)." },
    { id: "schlussbestimmungen", label: "§ 11 — Schlussbestimmungen", required: true,
      text: "Änderungen und Ergänzungen dieses Vertrages bedürfen der Schriftform.\n\nSollte eine Bestimmung unwirksam sein, bleibt die Wirksamkeit der übrigen Bestimmungen unberührt.\n\nEs gilt deutsches Recht. Erfüllungsort und Gerichtsstand ist der Ort der Mietsache." },
  ],
};

export const deRentReceipt: DocumentTemplate = {
  id: "de-rent-receipt",
  version: "1.0.0",
  country: "DE",
  category: "rental",
  docType: "rent-receipt",
  label: "Mietquittung (Deutschland)",
  description: "Quittung über erhaltene Mietzahlung gemäß BGB.",
  legalBasis: "BGB § 368",
  needsLegalReview: false,
  active: true,
  fields: [
    { key: "landlordName", label: "Name des Vermieters", type: "text", required: true, group: "Vermieter" },
    { key: "tenantName", label: "Name des Mieters", type: "text", required: true, group: "Mieter" },
    { key: "propertyAddress", label: "Adresse der Mietwohnung", type: "text", required: true, group: "Mietobjekt" },
    { key: "coldRent", label: "Kaltmiete (€)", type: "number", required: true, group: "Beträge" },
    { key: "operatingCosts", label: "Betriebskosten (€)", type: "number", required: true, defaultValue: 0, group: "Beträge" },
    { key: "heatingCosts", label: "Heizkosten (€)", type: "number", required: true, defaultValue: 0, group: "Beträge" },
    { key: "period", label: "Zeitraum", type: "text", required: true, placeholder: "Januar 2026", group: "Zeitraum" },
    { key: "paymentDate", label: "Zahlungsdatum", type: "date", required: true, group: "Zeitraum" },
  ],
  clauses: [
    { id: "quittung", label: "Mietquittung", required: true,
      text: "MIETQUITTUNG\n\nHiermit bestätigt {landlordName} den Erhalt der Mietzahlung von {tenantName} für die Wohnung {propertyAddress} für den Zeitraum {period}:\n\n• Kaltmiete: {coldRent} €\n• Betriebskosten: {operatingCosts} €\n• Heizkosten: {heatingCosts} €\n• Gesamtbetrag: {totalAmount} €\n\nZahlungsdatum: {paymentDate}\n\nOrt, Datum: ____________\n\nUnterschrift des Vermieters:" },
  ],
};
