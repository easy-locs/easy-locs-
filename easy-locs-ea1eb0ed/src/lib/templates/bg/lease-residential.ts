import type { DocumentTemplate } from "../types";

export const bgLeaseResidential: DocumentTemplate = {
  id: "bg-lease-residential",
  version: "1.0.0",
  country: "BG",
  category: "rental",
  docType: "lease-residential",
  label: "Договор за наем (България)",
  description: "Договор за наем съгласно Закона за задълженията и договорите.",
  legalBasis: "Закон за задълженията и договорите, чл. 228–239",
  needsLegalReview: false,
  active: true,
  fields: [
    { key: "landlordName", label: "Име на наемодателя", type: "text", required: true, validation: { minLength: 2 }, group: "Наемодател" },
    { key: "landlordAddress", label: "Адрес на наемодателя", type: "text", required: true, group: "Наемодател" },
    { key: "tenantName", label: "Име на наемателя", type: "text", required: true, validation: { minLength: 2 }, group: "Наемател" },
    { key: "propertyAddress", label: "Адрес на имота", type: "text", required: true, group: "Имот" },
    { key: "surface", label: "Площ (m²)", type: "number", required: true, validation: { min: 1 }, group: "Имот" },
    { key: "rooms", label: "Стаи", type: "number", required: true, validation: { min: 1 }, group: "Имот" },
    { key: "rentAmount", label: "Месечен наем (лв)", type: "number", required: true, validation: { min: 1 }, group: "Финанси" },
    { key: "depositAmount", label: "Депозит (лв)", type: "number", required: true, validation: { min: 0 }, group: "Финанси" },
    { key: "startDate", label: "Начална дата", type: "date", required: true, group: "Срок" },
    { key: "duration", label: "Срок", type: "select", required: true, options: [
      { value: "12", label: "12 месеца" },
      { value: "24", label: "24 месеца" },
    ], defaultValue: "12", group: "Срок" },
  ],
  clauses: [
    { id: "parties", label: "Чл. 1 — Страни", required: true,
      text: "ДОГОВОР ЗА НАЕМ\n\nНаемодател: {landlordName}, {landlordAddress}\nНаемател: {tenantName}" },
    { id: "imot", label: "Чл. 2 — Имот", required: true,
      text: "Имотът се намира на адрес {propertyAddress}, {surface} m², {rooms} стаи." },
    { id: "naem", label: "Чл. 3 — Наем", required: true,
      text: "Месечен наем: {rentAmount} лв. Депозит: {depositAmount} лв." },
    { id: "srok", label: "Чл. 4 — Срок", required: true,
      text: "Договорът е за {duration} месеца от {startDate}. Предизвестие: 1 месец." },
  ],
};

export const bgRentReceipt: DocumentTemplate = {
  id: "bg-rent-receipt",
  version: "1.0.0",
  country: "BG",
  category: "rental",
  docType: "rent-receipt",
  label: "Разписка за наем (България)",
  description: "Разписка за платен наем.",
  needsLegalReview: false,
  active: true,
  fields: [
    { key: "landlordName", label: "Наемодател", type: "text", required: true, group: "Наемодател" },
    { key: "tenantName", label: "Наемател", type: "text", required: true, group: "Наемател" },
    { key: "propertyAddress", label: "Адрес", type: "text", required: true, group: "Имот" },
    { key: "rentAmount", label: "Наем (лв)", type: "number", required: true, group: "Суми" },
    { key: "chargesAmount", label: "Такси (лв)", type: "number", required: true, defaultValue: 0, group: "Суми" },
    { key: "period", label: "Период", type: "text", required: true, placeholder: "Януари 2026", group: "Период" },
    { key: "paymentDate", label: "Дата на плащане", type: "date", required: true, group: "Период" },
  ],
  clauses: [
    { id: "razpiska", label: "Разписка", required: true,
      text: "РАЗПИСКА ЗА НАЕМ\n\n{landlordName} потвърждава получаването от {tenantName}:\n\n• Наем: {rentAmount} лв\n• Такси: {chargesAmount} лв\n• ОБЩО: {totalAmount} лв\n\nза период {period}, платено на {paymentDate}.\n\nПодпис:" },
  ],
};
