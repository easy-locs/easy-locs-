import type { DocumentTemplate } from "../types";

export const plLeaseResidential: DocumentTemplate = {
  id: "pl-lease-residential",
  version: "1.0.0",
  country: "PL",
  category: "rental",
  docType: "lease-residential",
  label: "Umowa najmu lokalu mieszkalnego (Polska)",
  description: "Umowa najmu zgodna z polskim Kodeksem cywilnym i Ustawą o ochronie praw lokatorów.",
  legalBasis: "Kodeks cywilny art. 659–692; Ustawa z dnia 21 czerwca 2001 r. o ochronie praw lokatorów",
  needsLegalReview: false,
  active: true,
  fields: [
    { key: "landlordName", label: "Imię i nazwisko wynajmującego", type: "text", required: true, validation: { minLength: 2 }, group: "Wynajmujący" },
    { key: "landlordAddress", label: "Adres wynajmującego", type: "text", required: true, group: "Wynajmujący" },
    { key: "landlordPesel", label: "PESEL wynajmującego", type: "text", required: false, group: "Wynajmujący" },
    { key: "tenantName", label: "Imię i nazwisko najemcy", type: "text", required: true, validation: { minLength: 2 }, group: "Najemca" },
    { key: "tenantAddress", label: "Adres najemcy", type: "text", required: false, group: "Najemca" },
    { key: "tenantPesel", label: "PESEL najemcy", type: "text", required: false, group: "Najemca" },
    { key: "propertyAddress", label: "Adres lokalu", type: "text", required: true, group: "Lokal" },
    { key: "propertyType", label: "Typ lokalu", type: "select", required: true, options: [
      { value: "Mieszkanie", label: "Mieszkanie" },
      { value: "Dom", label: "Dom" },
      { value: "Kawalerka", label: "Kawalerka" },
    ], group: "Lokal" },
    { key: "surface", label: "Powierzchnia (m²)", type: "number", required: true, validation: { min: 1 }, group: "Lokal" },
    { key: "rooms", label: "Liczba pokoi", type: "number", required: true, validation: { min: 1 }, group: "Lokal" },
    { key: "furnished", label: "Umeblowane?", type: "select", required: true, options: [
      { value: "nie", label: "Nie" }, { value: "tak", label: "Tak" },
    ], defaultValue: "nie", group: "Lokal" },
    { key: "rentAmount", label: "Czynsz miesięczny (zł)", type: "number", required: true, validation: { min: 1 }, group: "Warunki finansowe" },
    { key: "chargesAmount", label: "Opłaty eksploatacyjne (zł)", type: "number", required: true, validation: { min: 0 }, defaultValue: 0, group: "Warunki finansowe" },
    { key: "depositAmount", label: "Kaucja (zł)", type: "number", required: true, validation: {
      min: 0,
      custom: (val, all) => {
        const deposit = Number(val); const rent = Number(all.rentAmount);
        if (rent > 0 && deposit > rent * 12) return "Kaucja nie może przekraczać 12-krotności czynszu.";
        return null;
      }
    }, group: "Warunki finansowe" },
    { key: "paymentDay", label: "Dzień płatności", type: "number", required: true, validation: { min: 1, max: 28 }, defaultValue: 10, group: "Warunki finansowe" },
    { key: "startDate", label: "Data rozpoczęcia", type: "date", required: true, group: "Okres" },
    { key: "duration", label: "Czas trwania", type: "select", required: true, options: [
      { value: "indefinite", label: "Czas nieokreślony" },
      { value: "12", label: "12 miesięcy" },
      { value: "24", label: "24 miesiące" },
    ], defaultValue: "indefinite", group: "Okres" },
  ],
  clauses: [
    { id: "parties", label: "§1 — Strony umowy", required: true,
      text: "UMOWA NAJMU LOKALU MIESZKALNEGO\n\nZawarta w dniu {startDate} pomiędzy:\n\nWynajmującym: {landlordName}, zam. {landlordAddress}\na\nNajemcą: {tenantName}, zam. {tenantAddress}" },
    { id: "przedmiot", label: "§2 — Przedmiot najmu", required: true,
      text: "Wynajmujący oddaje w najem lokal typu {propertyType} przy {propertyAddress}, o powierzchni {surface} m², liczba pokoi: {rooms}." },
    { id: "czynsz", label: "§3 — Czynsz i opłaty", required: true,
      text: "Czynsz miesięczny: {rentAmount} zł, płatny do {paymentDay} dnia każdego miesiąca.\nOpłaty eksploatacyjne: {chargesAmount} zł.\nKaucja: {depositAmount} zł." },
    { id: "okres", label: "§4 — Okres najmu", required: true,
      text: "Umowa zostaje zawarta na {duration}. Wypowiedzenie zgodnie z przepisami Ustawy o ochronie praw lokatorów." },
    { id: "obowiazki", label: "§5 — Obowiązki stron", required: true,
      text: "Wynajmujący zobowiązuje się utrzymywać lokal w stanie nadającym się do umówionego użytku. Najemca zobowiązuje się do terminowego regulowania czynszu i dbania o lokal." },
  ],
};

export const plRentReceipt: DocumentTemplate = {
  id: "pl-rent-receipt",
  version: "1.0.0",
  country: "PL",
  category: "rental",
  docType: "rent-receipt",
  label: "Potwierdzenie zapłaty czynszu (Polska)",
  description: "Potwierdzenie zapłaty czynszu zgodne z polskim prawem.",
  needsLegalReview: false,
  active: true,
  fields: [
    { key: "landlordName", label: "Wynajmujący", type: "text", required: true, group: "Wynajmujący" },
    { key: "tenantName", label: "Najemca", type: "text", required: true, group: "Najemca" },
    { key: "propertyAddress", label: "Adres lokalu", type: "text", required: true, group: "Lokal" },
    { key: "rentAmount", label: "Czynsz (zł)", type: "number", required: true, group: "Kwoty" },
    { key: "chargesAmount", label: "Opłaty (zł)", type: "number", required: true, defaultValue: 0, group: "Kwoty" },
    { key: "period", label: "Okres", type: "text", required: true, placeholder: "Styczeń 2026", group: "Okres" },
    { key: "paymentDate", label: "Data zapłaty", type: "date", required: true, group: "Okres" },
    { key: "paymentMethod", label: "Metoda płatności", type: "select", required: true, options: [
      { value: "przelew", label: "Przelew bankowy" },
      { value: "gotowka", label: "Gotówka" },
    ], group: "Płatność" },
  ],
  clauses: [
    { id: "potwierdzenie", label: "Potwierdzenie", required: true,
      text: "POTWIERDZENIE ZAPŁATY CZYNSZU\n\nNiniejszym potwierdzam, {landlordName}, że otrzymałem/am od {tenantName} kwotę:\n\n• Czynsz: {rentAmount} zł\n• Opłaty: {chargesAmount} zł\n• RAZEM: {totalAmount} zł\n\nza okres {period}, zapłacone dnia {paymentDate} metodą {paymentMethod}.\n\nPodpis wynajmującego:" },
  ],
};
