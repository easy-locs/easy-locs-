import type { DocumentTemplate } from "../types";

/* ─── Inventario de la vivienda ─── */
export const esInventario: DocumentTemplate = {
  id: "es-inventario",
  version: "1.0.0",
  country: "ES",
  category: "rental",
  docType: "inventory",
  label: "Inventario de la vivienda",
  description: "Acta de inventario detallado para la entrega y devolución del inmueble conforme a la LAU.",
  legalBasis: "Ley 29/1994 de Arrendamientos Urbanos (LAU); Código Civil arts. 1554 y siguientes",
  needsLegalReview: false,
  active: true,
  fields: [
    { key: "inventoryType", label: "Tipo de inventario", type: "select", required: true, options: [
      { value: "entrada", label: "Entrada (entrega de llaves)" },
      { value: "salida", label: "Salida (devolución de llaves)" },
    ], group: "Tipo" },
    { key: "propertyAddress", label: "Dirección de la vivienda", type: "text", required: true, group: "Vivienda" },
    { key: "landlordName", label: "Nombre del arrendador", type: "text", required: true, group: "Partes" },
    { key: "tenantName", label: "Nombre del arrendatario", type: "text", required: true, group: "Partes" },
    { key: "inventoryDate", label: "Fecha del inventario", type: "date", required: true, group: "Datos" },
    { key: "meterElec", label: "Lectura contador eléctrico (kWh)", type: "number", required: false, group: "Contadores" },
    { key: "meterGas", label: "Lectura contador gas (m³)", type: "number", required: false, group: "Contadores" },
    { key: "meterWater", label: "Lectura contador agua (m³)", type: "number", required: false, group: "Contadores" },
    { key: "keysCount", label: "Número de llaves entregadas", type: "number", required: true, group: "Llaves" },
    { key: "keysDetail", label: "Detalle de llaves", type: "textarea", required: false, placeholder: "2 llaves portal\n2 llaves puerta\n1 llave buzón\n1 mando garaje", group: "Llaves" },
    { key: "roomsDescription", label: "Descripción habitación por habitación", type: "textarea", required: true, validation: { minLength: 20 }, placeholder: "RECIBIDOR:\n- Suelo: baldosa — buen estado\n- Paredes: pintura blanca — buen estado\n\nSALÓN:\n- Suelo: tarima — buen estado\n...", group: "Estado" },
    { key: "observations", label: "Observaciones y reservas", type: "textarea", required: false, group: "Observaciones" },
  ],
  clauses: [
    { id: "header", label: "Encabezado", required: true,
      text: "ACTA DE INVENTARIO DE {inventoryType}\n\nFecha: {inventoryDate}\n\nPartes:\n• Arrendador: {landlordName}\n• Arrendatario: {tenantName}\n\nVivienda: {propertyAddress}" },
    { id: "contadores", label: "Lecturas de contadores", required: true,
      text: "LECTURAS DE CONTADORES\n\n• Electricidad: {meterElec} kWh\n• Gas: {meterGas} m³\n• Agua: {meterWater} m³\n\nLas lecturas han sido tomadas en presencia de ambas partes." },
    { id: "llaves", label: "Entrega de llaves", required: true,
      text: "LLAVES Y MEDIOS DE ACCESO\n\nNúmero total de llaves entregadas: {keysCount}\n\nDetalle:\n{keysDetail}" },
    { id: "estado", label: "Estado de la vivienda", required: true,
      text: "DESCRIPCIÓN DETALLADA DEL ESTADO\n(Suelos, paredes, techos, carpintería, instalaciones, equipamiento)\n\n{roomsDescription}" },
    { id: "observaciones", label: "Observaciones", required: false,
      conditional: (data) => !!data.observations && String(data.observations).length > 3,
      text: "OBSERVACIONES Y RESERVAS\n\n{observations}" },
    { id: "firmas", label: "Firmas", required: true,
      text: "Ambas partes manifiestan su conformidad con el contenido del presente inventario.\n\nCada parte recibe un ejemplar.\n\nEn ____________, a ____________\n\nFirma del arrendador:                    Firma del arrendatario:" },
  ],
};

/* ─── Actualización de renta (IPC) ─── */
export const esRevisionRenta: DocumentTemplate = {
  id: "es-revision-renta",
  version: "1.0.0",
  country: "ES",
  category: "rental",
  docType: "rent-revision",
  label: "Actualización anual de la renta",
  description: "Comunicación de actualización de renta conforme al art. 18 LAU y RDL 7/2019.",
  legalBasis: "LAU art. 18 (actualización de renta); RDL 7/2019; IGC o índice legalmente aplicable",
  needsLegalReview: false,
  active: true,
  fields: [
    { key: "landlordName", label: "Nombre del arrendador", type: "text", required: true, group: "Arrendador" },
    { key: "landlordAddress", label: "Domicilio", type: "text", required: true, group: "Arrendador" },
    { key: "tenantName", label: "Nombre del arrendatario", type: "text", required: true, group: "Arrendatario" },
    { key: "tenantAddress", label: "Domicilio", type: "text", required: true, group: "Arrendatario" },
    { key: "propertyAddress", label: "Dirección de la vivienda", type: "text", required: true, group: "Vivienda" },
    { key: "currentRent", label: "Renta actual (€)", type: "number", required: true, group: "Renta" },
    { key: "indexType", label: "Índice de referencia", type: "select", required: true, options: [
      { value: "IGC", label: "IGC (Índice de Garantía de Competitividad)" },
      { value: "IPC", label: "IPC (cuando el IGC no aplique)" },
    ], defaultValue: "IGC", group: "Renta" },
    { key: "indexOld", label: "Índice anterior", type: "number", required: true, group: "Cálculo" },
    { key: "indexNew", label: "Índice nuevo", type: "number", required: true, group: "Cálculo" },
    { key: "effectiveDate", label: "Fecha de efecto", type: "date", required: true, group: "Fechas" },
    { key: "sendDate", label: "Fecha de la comunicación", type: "date", required: true, group: "Fechas" },
  ],
  clauses: [
    { id: "comunicacion", label: "Comunicación", required: true,
      text: "{landlordName}\n{landlordAddress}\n\nSr./Sra. {tenantName}\n{tenantAddress}\n\nFecha: {sendDate}\n\nAsunto: Actualización anual de la renta — Vivienda {propertyAddress}\n\nEstimado/a {tenantName},\n\nDe conformidad con lo dispuesto en el artículo 18 de la Ley de Arrendamientos Urbanos (LAU), le comunico la actualización anual de la renta de su contrato de arrendamiento.\n\nÍndice de referencia: {indexType}\nÍndice anterior: {indexOld}\nÍndice nuevo: {indexNew}\n\nRenta actual: {currentRent} €\nFórmula: Renta nueva = Renta actual × (Índice nuevo / Índice anterior)\n\nLa nueva renta será aplicable a partir del {effectiveDate}.\n\nConforme al RDL 7/2019, la actualización se limita al Índice de Garantía de Competitividad (IGC), no pudiendo superar la variación porcentual del IPC.\n\nAtentamente," },
  ],
};

/* ─── Desistimiento del arrendatario (Early Termination) ─── */
export const esDesistimiento: DocumentTemplate = {
  id: "es-desistimiento",
  version: "1.0.0",
  country: "ES",
  category: "rental",
  docType: "conges-locataire",
  label: "Desistimiento del arrendatario",
  description: "Comunicación de desistimiento del contrato por el arrendatario conforme al art. 11 LAU.",
  legalBasis: "LAU art. 11 (desistimiento); art. 12 (desistimiento en caso de matrimonio/pareja)",
  needsLegalReview: false,
  active: true,
  fields: [
    { key: "tenantName", label: "Nombre del arrendatario", type: "text", required: true, group: "Arrendatario" },
    { key: "tenantDNI", label: "DNI/NIE", type: "text", required: true, group: "Arrendatario" },
    { key: "tenantAddress", label: "Domicilio actual", type: "text", required: true, group: "Arrendatario" },
    { key: "landlordName", label: "Nombre del arrendador", type: "text", required: true, group: "Arrendador" },
    { key: "landlordAddress", label: "Domicilio del arrendador", type: "text", required: true, group: "Arrendador" },
    { key: "propertyAddress", label: "Dirección de la vivienda", type: "text", required: true, group: "Vivienda" },
    { key: "contractDate", label: "Fecha del contrato", type: "date", required: true, group: "Contrato" },
    { key: "departureDate", label: "Fecha de salida deseada", type: "date", required: true, group: "Fechas" },
    { key: "indemnizacion", label: "¿Se pactó indemnización por desistimiento?", type: "select", required: true, options: [
      { value: "si", label: "Sí — 1 mensualidad por año restante" },
      { value: "no", label: "No se pactó" },
    ], defaultValue: "no", group: "Fechas" },
    { key: "sendDate", label: "Fecha de envío", type: "date", required: true, group: "Fechas" },
  ],
  clauses: [
    { id: "desistimiento", label: "Comunicación de desistimiento", required: true,
      text: "{tenantName}\nDNI/NIE: {tenantDNI}\n{tenantAddress}\n\nSr./Sra. {landlordName}\n{landlordAddress}\n\nFecha: {sendDate}\n\nAsunto: Desistimiento del contrato de arrendamiento — {propertyAddress}\n\nEstimado/a {landlordName},\n\nPor medio de la presente, y conforme al artículo 11 de la Ley 29/1994 de Arrendamientos Urbanos, le comunico mi decisión de desistir del contrato de arrendamiento firmado el {contractDate} para la vivienda sita en {propertyAddress}.\n\nDe conformidad con la LAU, una vez transcurridos al menos 6 meses desde el inicio del contrato, el arrendatario puede desistir comunicándolo al arrendador con 30 días de antelación.\n\nMi salida efectiva de la vivienda está prevista para el {departureDate}.\n\nLe solicito:\n• Acordar una fecha para la realización del inventario de salida\n• Proceder a la devolución de la fianza en el plazo legal de un mes\n• Proporcionarme un certificado de no deuda\n\nAtentamente," },
  ],
};

/* ─── Comunicación de no renovación del arrendador ─── */
export const esNoRenovacion: DocumentTemplate = {
  id: "es-no-renovacion",
  version: "1.0.0",
  country: "ES",
  category: "rental",
  docType: "conges-bailleur",
  label: "Comunicación de no renovación (arrendador)",
  description: "Notificación del arrendador de su voluntad de no renovar el contrato conforme al art. 9-10 LAU.",
  legalBasis: "LAU arts. 9, 10 (prórrogas obligatorias y tácitas); RDL 7/2019",
  needsLegalReview: true,
  active: true,
  fields: [
    { key: "landlordName", label: "Nombre del arrendador", type: "text", required: true, group: "Arrendador" },
    { key: "landlordDNI", label: "DNI/NIE", type: "text", required: true, group: "Arrendador" },
    { key: "landlordAddress", label: "Domicilio", type: "text", required: true, group: "Arrendador" },
    { key: "tenantName", label: "Nombre del arrendatario", type: "text", required: true, group: "Arrendatario" },
    { key: "tenantAddress", label: "Domicilio", type: "text", required: true, group: "Arrendatario" },
    { key: "propertyAddress", label: "Dirección de la vivienda", type: "text", required: true, group: "Vivienda" },
    { key: "contractDate", label: "Fecha del contrato", type: "date", required: true, group: "Contrato" },
    { key: "contractEndDate", label: "Fecha de vencimiento", type: "date", required: true, group: "Contrato" },
    { key: "motivo", label: "Motivo (si aplica — necesidad de vivienda)", type: "textarea", required: false, placeholder: "Necesidad del arrendador o familiares de primer grado de usar la vivienda como residencia permanente (art. 9.3 LAU)…", group: "Motivo" },
    { key: "sendDate", label: "Fecha de envío", type: "date", required: true, group: "Fechas" },
  ],
  clauses: [
    { id: "notificacion", label: "Notificación", required: true,
      text: "{landlordName}\nDNI/NIE: {landlordDNI}\n{landlordAddress}\n\nSr./Sra. {tenantName}\n{tenantAddress}\n\nFecha: {sendDate}\n\nAsunto: Comunicación de no renovación del contrato de arrendamiento — {propertyAddress}\n\nEstimado/a {tenantName},\n\nPor medio de la presente, y conforme a los artículos 9 y 10 de la Ley 29/1994 de Arrendamientos Urbanos (modificada por el RDL 7/2019), le comunico mi voluntad de no renovar el contrato de arrendamiento firmado el {contractDate} para la vivienda sita en:\n\n{propertyAddress}\n\nEl contrato vence el {contractEndDate}.\n\nPLAZOS LEGALES DE PREAVISO:\n• Si el contrato está en el periodo obligatorio (≤ 5 años persona física / ≤ 7 años persona jurídica): la no renovación solo procede por necesidad de vivienda del arrendador o familiares de primer grado, con 2 meses de antelación.\n• Si el contrato está en prórroga tácita (art. 10 LAU): el arrendador debe comunicar con 4 meses de antelación.\n\nMotivo:\n{motivo}\n\nLe recuerdo que tiene derecho a permanecer en la vivienda hasta la fecha de vencimiento y que la fianza le será devuelta en el plazo legal de un mes desde la entrega de llaves.\n\nAtentamente," },
  ],
};

/* ─── Certificado de no deuda ─── */
export const esCertificadoNoDeuda: DocumentTemplate = {
  id: "es-certificado-no-deuda",
  version: "1.0.0",
  country: "ES",
  category: "administrative",
  docType: "sworn-statement",
  label: "Certificado de no deuda",
  description: "Certificación del arrendador de que el arrendatario está al corriente de pagos.",
  legalBasis: "Código Civil; buenas prácticas inmobiliarias",
  needsLegalReview: false,
  active: true,
  fields: [
    { key: "landlordName", label: "Nombre del arrendador", type: "text", required: true, group: "Arrendador" },
    { key: "landlordDNI", label: "DNI/NIE", type: "text", required: true, group: "Arrendador" },
    { key: "tenantName", label: "Nombre del arrendatario", type: "text", required: true, group: "Arrendatario" },
    { key: "propertyAddress", label: "Dirección de la vivienda", type: "text", required: true, group: "Vivienda" },
    { key: "contractStartDate", label: "Fecha de inicio del contrato", type: "date", required: true, group: "Contrato" },
    { key: "contractEndDate", label: "Fecha de finalización", type: "date", required: true, group: "Contrato" },
    { key: "issueDate", label: "Fecha de emisión", type: "date", required: true, group: "Fecha" },
  ],
  clauses: [
    { id: "certificado", label: "Certificado", required: true,
      text: "CERTIFICADO DE NO DEUDA\n\nD./Dña. {landlordName}, con DNI/NIE {landlordDNI}, en calidad de arrendador de la vivienda sita en {propertyAddress},\n\nCERTIFICA:\n\nQue D./Dña. {tenantName}, arrendatario de dicha vivienda desde el {contractStartDate} hasta el {contractEndDate}, se encuentra al corriente de todas las obligaciones de pago derivadas del contrato de arrendamiento, incluyendo renta mensual, gastos de comunidad y suministros a su cargo.\n\nNo existen deudas pendientes por ningún concepto relacionado con el contrato de arrendamiento a la fecha de este certificado.\n\nY para que conste a los efectos oportunos, firmo el presente certificado en ____________, a {issueDate}.\n\nFirma del arrendador:\n\n_______________" },
  ],
};
