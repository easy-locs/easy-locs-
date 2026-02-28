import type { DocumentTemplate } from "../types";

export const nlLeaseResidential: DocumentTemplate = {
  id: "nl-lease-residential",
  version: "1.0.0",
  country: "NL",
  category: "rental",
  docType: "lease-residential",
  label: "Huurovereenkomst woonruimte (Nederland)",
  description: "Huurovereenkomst conform het Burgerlijk Wetboek Boek 7, Titel 4.",
  legalBasis: "Burgerlijk Wetboek Boek 7, Titel 4, artt. 7:201–7:282; Uitvoeringswet huurprijzen woonruimte; Besluit huurprijzen woonruimte",
  needsLegalReview: false,
  active: true,
  fields: [
    { key: "landlordName", label: "Naam verhuurder", type: "text", required: true, validation: { minLength: 2 }, group: "Verhuurder" },
    { key: "landlordAddress", label: "Adres verhuurder", type: "text", required: true, group: "Verhuurder" },
    { key: "landlordEmail", label: "E-mail verhuurder", type: "email", required: false, group: "Verhuurder" },
    { key: "tenantName", label: "Naam huurder", type: "text", required: true, validation: { minLength: 2 }, group: "Huurder" },
    { key: "tenantAddress", label: "Huidig adres huurder", type: "text", required: false, group: "Huurder" },
    { key: "tenantEmail", label: "E-mail huurder", type: "email", required: false, group: "Huurder" },
    { key: "propertyAddress", label: "Adres gehuurde", type: "text", required: true, group: "Het gehuurde" },
    { key: "surface", label: "Woonoppervlakte (m²)", type: "number", required: true, validation: { min: 1 }, group: "Het gehuurde" },
    { key: "rooms", label: "Aantal kamers", type: "number", required: true, validation: { min: 1 }, group: "Het gehuurde" },
    { key: "energyLabel", label: "Energielabel", type: "select", required: true, options: [
      { value: "A++++", label: "A++++" }, { value: "A+++", label: "A+++" }, { value: "A++", label: "A++" },
      { value: "A+", label: "A+" }, { value: "A", label: "A" }, { value: "B", label: "B" },
      { value: "C", label: "C" }, { value: "D", label: "D" }, { value: "E", label: "E" },
      { value: "F", label: "F" }, { value: "G", label: "G" },
    ], group: "Energielabel" },
    { key: "sectorType", label: "Sector", type: "select", required: true, options: [
      { value: "gereguleerd", label: "Gereguleerde sector (sociale huur)" },
      { value: "vrij", label: "Vrije sector (geliberaliseerd)" },
    ], defaultValue: "vrij", group: "Huurprijs" },
    { key: "rentAmount", label: "Kale huurprijs (€/maand)", type: "number", required: true, validation: { min: 1 }, group: "Huurprijs" },
    { key: "serviceCosts", label: "Servicekosten (€/maand)", type: "number", required: true, defaultValue: 0, group: "Huurprijs" },
    { key: "depositAmount", label: "Waarborgsom (€)", type: "number", required: true, validation: {
      min: 0,
      custom: (val, all) => {
        const dep = Number(val);
        const rent = Number(all.rentAmount);
        if (rent > 0 && dep > rent * 3) return "De waarborgsom bedraagt gebruikelijk maximaal 3 maanden kale huur.";
        return null;
      }
    }, group: "Huurprijs" },
    { key: "paymentDay", label: "Betaaldag", type: "number", required: true, validation: { min: 1, max: 28 }, defaultValue: 1, group: "Huurprijs" },
    { key: "startDate", label: "Ingangsdatum", type: "date", required: true, group: "Looptijd" },
    { key: "duration", label: "Looptijd", type: "select", required: true, options: [
      { value: "onbepaald", label: "Onbepaalde tijd" },
      { value: "2", label: "2 jaar (tijdelijk, max. zelfstandig)" },
      { value: "1", label: "1 jaar" },
    ], defaultValue: "onbepaald", group: "Looptijd" },
  ],
  clauses: [
    { id: "partijen", label: "Artikel 1 — Partijen", required: true,
      text: "TUSSEN:\n\nVerhuurder: {landlordName}, wonende te {landlordAddress}\n\nEN:\n\nHuurder: {tenantName}" },
    { id: "gehuurde", label: "Artikel 2 — Het gehuurde", required: true,
      text: "Verhuurder verhuurt aan huurder de woonruimte gelegen aan {propertyAddress}, met een woonoppervlakte van {surface} m² en {rooms} kamer(s).\n\nEnergielabel: {energyLabel}\n\nHet gehuurde is uitsluitend bestemd voor bewoning door huurder." },
    { id: "looptijd", label: "Artikel 3 — Duur en opzegging", required: true,
      text: "De huurovereenkomst gaat in op {startDate} en wordt aangegaan voor {duration} tijd.\n\nBij onbepaalde tijd: opzegging door huurder met inachtneming van een termijn van ten minste 1 maand. Opzegging door verhuurder met inachtneming van 3 maanden + 1 maand per huurjaar (max. 6 maanden). De verhuurder kan alleen opzeggen op basis van wettelijke gronden (art. 7:274 BW): dringend eigen gebruik, slecht huurderschap, sloop/renovatie, of redelijk aanbod.\n\nTijdelijk contract (max. 2 jaar zelfstandig): eindigt van rechtswege. Verhuurder moet huurder schriftelijk informeren, niet eerder dan 3 maanden en uiterlijk 1 maand voor het einde." },
    { id: "huurprijs", label: "Artikel 4 — Huurprijs", required: true,
      text: "De kale huurprijs bedraagt {rentAmount} € per maand.\nServicekosten: {serviceCosts} € per maand.\nTotaal: {totalRent} € per maand.\n\nBetaling geschiedt uiterlijk op de {paymentDay}e van elke maand.\n\nJaarlijkse huurverhoging:\n• Gereguleerde sector: conform het jaarlijkse huurverhogingspercentage vastgesteld door de minister\n• Vrije sector: volgens contractuele afspraken (bijv. CPI + opslag)" },
    { id: "waarborgsom", label: "Artikel 5 — Waarborgsom", required: true,
      text: "Huurder betaalt een waarborgsom van {depositAmount} €.\n\nDe waarborgsom wordt binnen 14 dagen na het einde van de huurovereenkomst en na oplevering gerestitueerd, verminderd met eventuele vorderingen van verhuurder (art. 7:261a BW, per 1 juli 2023)." },
    { id: "onderhoud", label: "Artikel 6 — Onderhoud", required: true,
      text: "Verhuurder draagt zorg voor het verhelpen van gebreken aan het gehuurde (art. 7:206 BW).\n\nKlein onderhoud (Besluit kleine herstellingen) is voor rekening van huurder.\n\nHuurder mag geen veranderingen aanbrengen zonder schriftelijke toestemming van verhuurder, tenzij het veranderingen betreft die bij het einde van de huur zonder noemenswaardige kosten ongedaan kunnen worden gemaakt (art. 7:215 BW)." },
    { id: "gebreken", label: "Artikel 7 — Gebreken", required: true,
      text: "Bij gebreken die het genot beperken, kan huurder:\n• Verhuurder verzoeken tot herstel\n• Huurvermindering vorderen\n• Bij ernstige gebreken: de huurcommissie of rechter inschakelen\n\n(Art. 7:207 BW)" },
    { id: "slotbepalingen", label: "Artikel 8 — Slotbepalingen", required: true,
      text: "Op deze overeenkomst is Nederlands recht van toepassing.\n\nGeschillen kunnen worden voorgelegd aan de Huurcommissie (gereguleerde sector) of de bevoegde rechter.\n\nWijzigingen van deze overeenkomst zijn slechts geldig indien schriftelijk overeengekomen." },
  ],
};

export const nlRentReceipt: DocumentTemplate = {
  id: "nl-rent-receipt",
  version: "1.0.0",
  country: "NL",
  category: "rental",
  docType: "rent-receipt",
  label: "Huurkwitantie (Nederland)",
  description: "Kwitantie van ontvangen huur.",
  legalBasis: "Burgerlijk Wetboek art. 6:48",
  needsLegalReview: false,
  active: true,
  fields: [
    { key: "landlordName", label: "Naam verhuurder", type: "text", required: true, group: "Verhuurder" },
    { key: "tenantName", label: "Naam huurder", type: "text", required: true, group: "Huurder" },
    { key: "propertyAddress", label: "Adres gehuurde", type: "text", required: true, group: "Gehuurde" },
    { key: "rentAmount", label: "Kale huur (€)", type: "number", required: true, group: "Bedragen" },
    { key: "serviceCosts", label: "Servicekosten (€)", type: "number", required: true, defaultValue: 0, group: "Bedragen" },
    { key: "period", label: "Periode", type: "text", required: true, placeholder: "Januari 2026", group: "Periode" },
    { key: "paymentDate", label: "Betaaldatum", type: "date", required: true, group: "Periode" },
  ],
  clauses: [
    { id: "kwitantie", label: "Kwitantie", required: true,
      text: "HUURKWITANTIE\n\nOndergetekende {landlordName}, verhuurder van het pand {propertyAddress},\n\nverklaart van {tenantName} te hebben ontvangen:\n\n• Kale huur: {rentAmount} €\n• Servicekosten: {serviceCosts} €\n• Totaal: {totalAmount} €\n\nvoor de periode {period}.\n\nBetaaldatum: {paymentDate}\n\nPlaats en datum: ____________\n\nHandtekening verhuurder:" },
  ],
};
