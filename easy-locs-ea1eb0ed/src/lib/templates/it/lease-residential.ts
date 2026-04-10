import type { DocumentTemplate } from "../types";

export const itLeaseResidential: DocumentTemplate = {
  id: "it-lease-residential",
  version: "1.0.0",
  country: "IT",
  category: "rental",
  docType: "lease-residential",
  label: "Contratto di locazione abitativa (Italia)",
  description: "Contratto di locazione ad uso abitativo conforme alla Legge 431/1998.",
  legalBasis: "Legge n. 431/1998; Codice Civile artt. 1571–1614; D.Lgs. 23/2011 (cedolare secca)",
  needsLegalReview: false,
  active: true,
  fields: [
    { key: "landlordName", label: "Nome del locatore", type: "text", required: true, validation: { minLength: 2 }, group: "Locatore" },
    { key: "landlordCF", label: "Codice fiscale del locatore", type: "text", required: true, group: "Locatore" },
    { key: "landlordAddress", label: "Residenza del locatore", type: "text", required: true, group: "Locatore" },
    { key: "tenantName", label: "Nome del conduttore", type: "text", required: true, validation: { minLength: 2 }, group: "Conduttore" },
    { key: "tenantCF", label: "Codice fiscale del conduttore", type: "text", required: true, group: "Conduttore" },
    { key: "tenantEmail", label: "Email del conduttore", type: "email", required: false, group: "Conduttore" },
    { key: "propertyAddress", label: "Indirizzo dell'immobile", type: "text", required: true, group: "Immobile" },
    { key: "cadastralData", label: "Dati catastali (foglio, particella, subalterno)", type: "text", required: true, placeholder: "Foglio 10, Part. 234, Sub. 5", group: "Immobile" },
    { key: "surface", label: "Superficie (m²)", type: "number", required: true, validation: { min: 1 }, group: "Immobile" },
    { key: "rooms", label: "Numero di vani", type: "number", required: true, validation: { min: 1 }, group: "Immobile" },
    { key: "energyClass", label: "Classe energetica (APE)", type: "select", required: true, options: [
      { value: "A4", label: "A4" }, { value: "A3", label: "A3" }, { value: "A2", label: "A2" }, { value: "A1", label: "A1" },
      { value: "B", label: "B" }, { value: "C", label: "C" }, { value: "D", label: "D" },
      { value: "E", label: "E" }, { value: "F", label: "F" }, { value: "G", label: "G" },
    ], group: "Certificazioni" },
    { key: "contractType", label: "Tipo di contratto", type: "select", required: true, options: [
      { value: "libero", label: "Canone libero (4+4)" },
      { value: "concordato", label: "Canone concordato (3+2)" },
      { value: "transitorio", label: "Transitorio (1-18 mesi)" },
      { value: "studenti", label: "Studenti universitari (6-36 mesi)" },
    ], defaultValue: "libero", group: "Tipo" },
    { key: "rentAmount", label: "Canone mensile (€)", type: "number", required: true, validation: { min: 1 }, group: "Condizioni economiche" },
    { key: "condominiumCharges", label: "Spese condominiali (€/mese)", type: "number", required: true, defaultValue: 0, group: "Condizioni economiche" },
    { key: "depositAmount", label: "Deposito cauzionale (€)", type: "number", required: true, validation: {
      min: 0,
      custom: (val, all) => {
        const dep = Number(val);
        const rent = Number(all.rentAmount);
        if (rent > 0 && dep > rent * 3) return "Il deposito cauzionale non può superare 3 mensilità (art. 11 L. 392/1978).";
        return null;
      }
    }, group: "Condizioni economiche" },
    { key: "cedolareSecca", label: "Cedolare secca?", type: "select", required: true, options: [
      { value: "si", label: "Sì (21% o 10% concordato)" },
      { value: "no", label: "No (regime ordinario + imposta di registro)" },
    ], defaultValue: "no", group: "Fiscalità" },
    { key: "paymentDay", label: "Giorno di pagamento", type: "number", required: true, validation: { min: 1, max: 28 }, defaultValue: 5, group: "Condizioni economiche" },
    { key: "startDate", label: "Data di decorrenza", type: "date", required: true, group: "Durata" },
  ],
  clauses: [
    { id: "parti", label: "Art. 1 — Parti", required: true,
      text: "TRA:\n\nIl locatore: {landlordName}, C.F. {landlordCF}, residente in {landlordAddress}\n\nE:\n\nIl conduttore: {tenantName}, C.F. {tenantCF}" },
    { id: "oggetto", label: "Art. 2 — Oggetto della locazione", required: true,
      text: "Il locatore concede in locazione al conduttore l'immobile sito in {propertyAddress}, censito al catasto come {cadastralData}, superficie {surface} m², composto da {rooms} vani.\n\nAttestato di Prestazione Energetica (APE): classe {energyClass}.\n\nL'immobile è destinato esclusivamente ad uso abitativo." },
    { id: "durata", label: "Art. 3 — Durata", required: true,
      text: "Il contratto è stipulato ai sensi della Legge 431/1998, tipo {contractType}, con decorrenza dal {startDate}.\n\n• Canone libero: durata 4 anni + rinnovo automatico di 4 anni (4+4)\n• Canone concordato: durata 3 anni + rinnovo automatico di 2 anni (3+2)\n• Transitorio: durata concordata (max 18 mesi)\n• Studenti: durata concordata (6-36 mesi)\n\nAlla prima scadenza il locatore può esercitare il diniego di rinnovo solo per i motivi previsti dall'art. 3 della L. 431/1998." },
    { id: "canone", label: "Art. 4 — Canone", required: true,
      text: "Il canone di locazione è fissato in {rentAmount} € mensili, da corrispondere entro il giorno {paymentDay} di ogni mese.\n\nSpese condominiali: {condominiumCharges} €/mese (a carico del conduttore le spese ordinarie).\n\nAggiornamento ISTAT: il canone sarà aggiornato annualmente nella misura del 75% della variazione dell'indice FOI dei prezzi al consumo (100% per canone concordato)." },
    { id: "deposito", label: "Art. 5 — Deposito cauzionale", required: true,
      text: "Il conduttore versa un deposito cauzionale di {depositAmount} € pari a {depositMonths} mensilità.\n\nIl deposito è infruttifero di interessi legali (art. 11 L. 392/1978) e sarà restituito al termine della locazione, detratte eventuali somme dovute per danni o morosità." },
    { id: "cedolare", label: "Art. 6 — Regime fiscale", required: true,
      text: "Regime fiscale scelto: {cedolareSecca}.\n\nIn caso di cedolare secca (D.Lgs. 23/2011), il locatore rinuncia alla facoltà di richiedere l'aggiornamento ISTAT del canone per tutta la durata dell'opzione. L'imposta sostitutiva è del 21% (o 10% per canone concordato).\n\nLa registrazione del contratto presso l'Agenzia delle Entrate è obbligatoria entro 30 giorni dalla stipula." },
    { id: "manutenzione", label: "Art. 7 — Manutenzione", required: true,
      text: "Il conduttore è responsabile della piccola manutenzione ordinaria (art. 1576 c.c.).\n\nIl locatore è tenuto alle riparazioni straordinarie necessarie per la conservazione dell'immobile (art. 1575 c.c.).\n\nIl conduttore non può apportare modifiche senza il consenso scritto del locatore." },
    { id: "recesso", label: "Art. 8 — Recesso del conduttore", required: true,
      text: "Il conduttore può recedere dal contratto per gravi motivi, con preavviso di 6 mesi comunicato con lettera raccomandata A/R (art. 3, comma 6, L. 431/1998).\n\nLe parti possono concordare ulteriori ipotesi di recesso." },
    { id: "risoluzione", label: "Art. 9 — Risoluzione", required: true,
      text: "Il contratto si risolve di diritto in caso di:\n\n• Morosità del conduttore superiore a 20 giorni per almeno 2 mensilità (art. 5 L. 392/1978)\n• Grave inadempimento degli obblighi contrattuali\n• Sublocazione non autorizzata\n• Uso dell'immobile per fini diversi dall'abitazione" },
    { id: "foro", label: "Art. 10 — Foro competente", required: true,
      text: "Per qualsiasi controversia derivante dal presente contratto è competente il Tribunale del luogo in cui si trova l'immobile.\n\nLe parti possono ricorrere preventivamente alla mediazione obbligatoria (D.Lgs. 28/2010)." },
  ],
};

export const itRentReceipt: DocumentTemplate = {
  id: "it-rent-receipt",
  version: "1.0.0",
  country: "IT",
  category: "rental",
  docType: "rent-receipt",
  label: "Ricevuta di affitto (Italia)",
  description: "Ricevuta di pagamento del canone di locazione.",
  legalBasis: "Codice Civile art. 1199; DPR 642/1972 (imposta di bollo per importi > 77,47 €)",
  needsLegalReview: false,
  active: true,
  fields: [
    { key: "landlordName", label: "Nome del locatore", type: "text", required: true, group: "Locatore" },
    { key: "landlordCF", label: "Codice fiscale", type: "text", required: true, group: "Locatore" },
    { key: "tenantName", label: "Nome del conduttore", type: "text", required: true, group: "Conduttore" },
    { key: "propertyAddress", label: "Indirizzo dell'immobile", type: "text", required: true, group: "Immobile" },
    { key: "rentAmount", label: "Canone (€)", type: "number", required: true, group: "Importi" },
    { key: "condominiumCharges", label: "Spese condominiali (€)", type: "number", required: true, defaultValue: 0, group: "Importi" },
    { key: "period", label: "Periodo", type: "text", required: true, placeholder: "Gennaio 2026", group: "Periodo" },
    { key: "paymentDate", label: "Data di pagamento", type: "date", required: true, group: "Periodo" },
  ],
  clauses: [
    { id: "ricevuta", label: "Ricevuta", required: true,
      text: "RICEVUTA DI PAGAMENTO CANONE DI LOCAZIONE\n\nIl sottoscritto {landlordName}, C.F. {landlordCF}, locatore dell'immobile sito in {propertyAddress},\n\nDICHIARA di aver ricevuto da {tenantName} le seguenti somme per il periodo di {period}:\n\n• Canone di locazione: {rentAmount} €\n• Spese condominiali: {condominiumCharges} €\n• TOTALE: {totalAmount} €\n\nData di pagamento: {paymentDate}\n\nNota: per importi superiori a € 77,47 è dovuta l'imposta di bollo di € 2,00 (DPR 642/1972).\n\nLuogo e data: ____________\n\nFirma del locatore:" },
  ],
};
