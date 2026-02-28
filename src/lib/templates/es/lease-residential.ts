import type { DocumentTemplate } from "../types";

export const esLeaseResidential: DocumentTemplate = {
  id: "es-lease-residential",
  version: "1.0.0",
  country: "ES",
  category: "rental",
  docType: "lease-residential",
  label: "Contrato de arrendamiento de vivienda (España)",
  description: "Contrato de alquiler de vivienda habitual conforme a la LAU.",
  legalBasis: "Ley 29/1994, de 24 de noviembre, de Arrendamientos Urbanos (LAU), modificada por el RDL 7/2019",
  needsLegalReview: false,
  active: true,
  fields: [
    { key: "landlordName", label: "Nombre del arrendador", type: "text", required: true, validation: { minLength: 2 }, group: "Arrendador" },
    { key: "landlordDNI", label: "DNI/NIE del arrendador", type: "text", required: true, group: "Arrendador" },
    { key: "landlordAddress", label: "Domicilio del arrendador", type: "text", required: true, group: "Arrendador" },
    { key: "landlordEmail", label: "Email del arrendador", type: "email", required: false, group: "Arrendador" },
    { key: "tenantName", label: "Nombre del arrendatario", type: "text", required: true, validation: { minLength: 2 }, group: "Arrendatario" },
    { key: "tenantDNI", label: "DNI/NIE del arrendatario", type: "text", required: true, group: "Arrendatario" },
    { key: "tenantEmail", label: "Email del arrendatario", type: "email", required: false, group: "Arrendatario" },
    { key: "propertyAddress", label: "Dirección de la vivienda", type: "text", required: true, group: "La vivienda" },
    { key: "propertyReference", label: "Referencia catastral", type: "text", required: true, group: "La vivienda" },
    { key: "surface", label: "Superficie útil (m²)", type: "number", required: true, validation: { min: 1 }, group: "La vivienda" },
    { key: "rooms", label: "Número de habitaciones", type: "number", required: true, validation: { min: 1 }, group: "La vivienda" },
    { key: "furnished", label: "¿Amueblada?", type: "select", required: true, options: [
      { value: "no", label: "Sin amueblar" },
      { value: "si", label: "Amueblada" },
    ], defaultValue: "no", group: "La vivienda" },
    { key: "energyCertificate", label: "Certificado energético", type: "select", required: true, options: [
      { value: "A", label: "A" }, { value: "B", label: "B" }, { value: "C", label: "C" },
      { value: "D", label: "D" }, { value: "E", label: "E" }, { value: "F", label: "F" }, { value: "G", label: "G" },
    ], group: "Certificaciones" },
    { key: "rentAmount", label: "Renta mensual (€)", type: "number", required: true, validation: { min: 1 }, group: "Condiciones económicas" },
    { key: "chargesAmount", label: "Gastos de comunidad (€)", type: "number", required: true, defaultValue: 0, group: "Condiciones económicas" },
    { key: "depositAmount", label: "Fianza (€)", type: "number", required: true, validation: {
      min: 0,
      custom: (val, all) => {
        const dep = Number(val);
        const rent = Number(all.rentAmount);
        if (dep < rent) return "La fianza legal mínima es de 1 mensualidad de renta (art. 36.1 LAU).";
        if (dep > rent * 2) return "La fianza no puede exceder de 2 mensualidades para vivienda habitual (art. 36.1 LAU).";
        return null;
      }
    }, group: "Condiciones económicas" },
    { key: "additionalGuarantee", label: "Garantías adicionales (€)", type: "number", required: false, validation: {
      min: 0,
      custom: (val, all) => {
        const g = Number(val);
        const rent = Number(all.rentAmount);
        if (g > rent * 2) return "Las garantías adicionales no pueden exceder de 2 mensualidades (art. 36.5 LAU, contratos ≤ 5 años).";
        return null;
      }
    }, group: "Condiciones económicas" },
    { key: "paymentDay", label: "Día de pago", type: "number", required: true, validation: { min: 1, max: 28 }, defaultValue: 1, group: "Condiciones económicas" },
    { key: "paymentMethod", label: "Forma de pago", type: "select", required: true, options: [
      { value: "transferencia", label: "Transferencia bancaria" },
      { value: "domiciliacion", label: "Domiciliación bancaria" },
    ], defaultValue: "transferencia", group: "Condiciones económicas" },
    { key: "startDate", label: "Fecha de inicio", type: "date", required: true, group: "Duración" },
    { key: "duration", label: "Duración pactada (años)", type: "select", required: true, options: [
      { value: "1", label: "1 año (prórroga obligatoria hasta 5)" },
      { value: "2", label: "2 años" },
      { value: "3", label: "3 años" },
      { value: "5", label: "5 años" },
    ], defaultValue: "1", group: "Duración" },
  ],
  clauses: [
    { id: "parties", label: "Primera — Partes contratantes", required: true,
      text: "REUNIDOS:\n\nDe una parte, como ARRENDADOR: {landlordName}, con DNI/NIE {landlordDNI}, domiciliado en {landlordAddress}.\n\nDe otra parte, como ARRENDATARIO: {tenantName}, con DNI/NIE {tenantDNI}." },
    { id: "objeto", label: "Segunda — Objeto del contrato", required: true,
      text: "El arrendador cede en arrendamiento al arrendatario la vivienda sita en {propertyAddress}, referencia catastral {propertyReference}, con una superficie útil de {surface} m², compuesta de {rooms} habitación(es).\n\nCertificado de eficiencia energética: clase {energyCertificate}.\n\nLa vivienda se destina exclusivamente a vivienda habitual del arrendatario, conforme al artículo 2.1 de la LAU." },
    { id: "duracion", label: "Tercera — Duración", required: true,
      text: "El contrato se pacta por una duración de {duration} año(s), con fecha de inicio {startDate}.\n\nConforme al art. 9 LAU (RDL 7/2019), si el plazo pactado es inferior a 5 años (o 7 años si el arrendador es persona jurídica), el contrato se prorrogará obligatoriamente por plazos anuales hasta alcanzar dicho plazo mínimo, salvo que el arrendatario manifieste su voluntad de no renovar con 30 días de antelación.\n\nUna vez transcurrido el plazo mínimo, si ninguna de las partes notifica su voluntad de no renovar con 4 meses (arrendador) o 2 meses (arrendatario) de antelación, el contrato se prorrogará por plazos anuales sucesivos hasta un máximo de 3 años más (art. 10 LAU)." },
    { id: "renta", label: "Cuarta — Renta", required: true,
      text: "La renta mensual se fija en {rentAmount} €, pagadera dentro de los primeros {paymentDay} días de cada mes mediante {paymentMethod}.\n\nGastos de comunidad: {chargesAmount} €/mes.\n\nLa renta se actualizará anualmente conforme al Índice de Garantía de Competitividad (IGC) o el índice que legalmente corresponda (art. 18 LAU, RDL 7/2019)." },
    { id: "fianza", label: "Quinta — Fianza y garantías", required: true,
      text: "El arrendatario entrega la cantidad de {depositAmount} € en concepto de fianza legal (art. 36 LAU).\n\nLa fianza será depositada por el arrendador en el organismo correspondiente de la Comunidad Autónoma.\n\nAl término del contrato, la fianza será devuelta en el plazo de un mes desde la entrega de llaves, deducidos los importes debidos por desperfectos o impago." },
    { id: "obras", label: "Sexta — Obras y conservación", required: true,
      text: "El arrendador realizará las reparaciones necesarias para conservar la vivienda en condiciones de habitabilidad (art. 21 LAU), salvo las causadas por el arrendatario.\n\nEl arrendatario realizará las pequeñas reparaciones derivadas del desgaste por uso ordinario (art. 21.4 LAU).\n\nEl arrendatario no podrá realizar obras que modifiquen la configuración de la vivienda sin consentimiento escrito del arrendador (art. 23 LAU)." },
    { id: "desistimiento", label: "Séptima — Desistimiento del arrendatario", required: true,
      text: "El arrendatario podrá desistir del contrato una vez transcurridos 6 meses, comunicándolo con 30 días de antelación (art. 11 LAU).\n\nLas partes pueden pactar una indemnización de 1 mensualidad por cada año de contrato restante, prorrateándose por meses." },
    { id: "resolucion", label: "Octava — Causas de resolución", required: true,
      text: "Serán causas de resolución (art. 27 LAU):\n\n• Falta de pago de la renta o cantidades asimiladas\n• Subarriendo no consentido\n• Daños causados dolosamente\n• Obras no consentidas\n• Actividades molestas, insalubres, nocivas o peligrosas\n• Cese de la vivienda como habitual sin justa causa" },
    { id: "legislacion", label: "Novena — Legislación aplicable", required: true,
      text: "El presente contrato se rige por la Ley 29/1994 de Arrendamientos Urbanos, modificada por el Real Decreto-ley 7/2019, y supletoriamente por el Código Civil.\n\nPara cualquier controversia, las partes se someten a los Juzgados y Tribunales del lugar donde radique la finca." },
  ],
};

export const esRentReceipt: DocumentTemplate = {
  id: "es-rent-receipt",
  version: "1.0.0",
  country: "ES",
  category: "rental",
  docType: "rent-receipt",
  label: "Recibo de alquiler (España)",
  description: "Recibo de pago de la renta conforme a la LAU.",
  legalBasis: "Ley 29/1994, art. 17",
  needsLegalReview: false,
  active: true,
  fields: [
    { key: "landlordName", label: "Nombre del arrendador", type: "text", required: true, group: "Arrendador" },
    { key: "landlordDNI", label: "DNI/NIE", type: "text", required: true, group: "Arrendador" },
    { key: "tenantName", label: "Nombre del arrendatario", type: "text", required: true, group: "Arrendatario" },
    { key: "propertyAddress", label: "Dirección de la vivienda", type: "text", required: true, group: "Vivienda" },
    { key: "rentAmount", label: "Renta (€)", type: "number", required: true, group: "Importes" },
    { key: "chargesAmount", label: "Gastos comunidad (€)", type: "number", required: true, defaultValue: 0, group: "Importes" },
    { key: "period", label: "Período", type: "text", required: true, placeholder: "Enero 2026", group: "Período" },
    { key: "paymentDate", label: "Fecha de pago", type: "date", required: true, group: "Período" },
  ],
  clauses: [
    { id: "recibo", label: "Recibo", required: true,
      text: "RECIBO DE ALQUILER\n\n{landlordName}, con DNI/NIE {landlordDNI}, arrendador de la vivienda sita en {propertyAddress},\n\nDECLARA haber recibido de {tenantName} las siguientes cantidades correspondientes al período de {period}:\n\n• Renta mensual: {rentAmount} €\n• Gastos de comunidad: {chargesAmount} €\n• TOTAL: {totalAmount} €\n\nFecha de pago: {paymentDate}\n\nEl presente recibo acredita el pago íntegro de las cantidades indicadas.\n\nEn ____________, a ____________\n\nFirma del arrendador:" },
  ],
};
