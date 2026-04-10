import type { DocumentTemplate } from "../types";

export const ptLeaseResidential: DocumentTemplate = {
  id: "pt-lease-residential",
  version: "1.0.0",
  country: "PT",
  category: "rental",
  docType: "lease-residential",
  label: "Contrato de arrendamento habitacional (Portugal)",
  description: "Contrato de arrendamento urbano para habitação conforme o NRAU.",
  legalBasis: "Novo Regime do Arrendamento Urbano (NRAU), Lei n.º 6/2006; Código Civil arts. 1022.º-1113.º; Lei n.º 12/2019 (Mais Habitação)",
  needsLegalReview: false,
  active: true,
  fields: [
    { key: "landlordName", label: "Nome do senhorio", type: "text", required: true, validation: { minLength: 2 }, group: "Senhorio" },
    { key: "landlordNIF", label: "NIF do senhorio", type: "text", required: true, group: "Senhorio" },
    { key: "landlordAddress", label: "Morada do senhorio", type: "text", required: true, group: "Senhorio" },
    { key: "tenantName", label: "Nome do arrendatário", type: "text", required: true, validation: { minLength: 2 }, group: "Arrendatário" },
    { key: "tenantNIF", label: "NIF do arrendatário", type: "text", required: true, group: "Arrendatário" },
    { key: "tenantEmail", label: "Email do arrendatário", type: "email", required: false, group: "Arrendatário" },
    { key: "propertyAddress", label: "Morada do imóvel", type: "text", required: true, group: "Imóvel" },
    { key: "propertyType", label: "Tipo de imóvel", type: "select", required: true, options: [
      { value: "Apartamento", label: "Apartamento (T1, T2…)" },
      { value: "Moradia", label: "Moradia" },
      { value: "Estúdio", label: "Estúdio" },
    ], group: "Imóvel" },
    { key: "surface", label: "Área útil (m²)", type: "number", required: true, validation: { min: 1 }, group: "Imóvel" },
    { key: "rooms", label: "Número de quartos", type: "number", required: true, validation: { min: 0 }, group: "Imóvel" },
    { key: "energyCertificate", label: "Certificado energético", type: "select", required: true, options: [
      { value: "A+", label: "A+" }, { value: "A", label: "A" }, { value: "B", label: "B" }, { value: "B-", label: "B-" },
      { value: "C", label: "C" }, { value: "D", label: "D" }, { value: "E", label: "E" }, { value: "F", label: "F" },
    ], group: "Certificações" },
    { key: "rentAmount", label: "Renda mensal (€)", type: "number", required: true, validation: { min: 1 }, group: "Condições económicas" },
    { key: "depositAmount", label: "Caução (€)", type: "number", required: true, validation: {
      min: 0,
      custom: (val, all) => {
        const dep = Number(val);
        const rent = Number(all.rentAmount);
        if (rent > 0 && dep > rent * 2) return "A caução não pode exceder 2 meses de renda (art. 1076.º do Código Civil).";
        return null;
      }
    }, group: "Condições económicas" },
    { key: "paymentDay", label: "Dia de pagamento", type: "number", required: true, validation: { min: 1, max: 8 }, defaultValue: 1, group: "Condições económicas" },
    { key: "startDate", label: "Data de início", type: "date", required: true, group: "Duração" },
    { key: "duration", label: "Prazo do contrato", type: "select", required: true, options: [
      { value: "1", label: "1 ano" },
      { value: "2", label: "2 anos" },
      { value: "3", label: "3 anos" },
      { value: "5", label: "5 anos" },
      { value: "indeterminado", label: "Prazo indeterminado" },
    ], defaultValue: "1", group: "Duração" },
  ],
  clauses: [
    { id: "partes", label: "Artigo 1.º — Partes", required: true,
      text: "ENTRE:\n\nPrimeiro outorgante (senhorio): {landlordName}, NIF {landlordNIF}, residente em {landlordAddress}\n\nSegundo outorgante (arrendatário): {tenantName}, NIF {tenantNIF}" },
    { id: "objeto", label: "Artigo 2.º — Objeto", required: true,
      text: "O senhorio dá de arrendamento ao arrendatário o imóvel do tipo {propertyType}, sito em {propertyAddress}, com área útil de {surface} m² e {rooms} quarto(s).\n\nCertificado energético: classe {energyCertificate}.\n\nO locado destina-se exclusivamente a habitação permanente do arrendatário." },
    { id: "prazo", label: "Artigo 3.º — Prazo", required: true,
      text: "O contrato é celebrado pelo prazo de {duration}, com início em {startDate}.\n\nPrazo certo: renova-se automaticamente por períodos iguais, salvo oposição de qualquer das partes nos prazos legais.\n• Oposição pelo senhorio: antecedência mínima de 240 dias (contratos ≥ 6 anos) ou 120 dias (contratos < 6 anos)\n• Oposição pelo arrendatário: antecedência mínima de 120 dias (≥ 6 anos) ou 60 dias (< 6 anos)\n\n(Arts. 1096.º e 1097.º do Código Civil)" },
    { id: "renda", label: "Artigo 4.º — Renda", required: true,
      text: "A renda mensal é fixada em {rentAmount} €, devida até ao {paymentDay}.º dia útil do mês a que respeita.\n\nA renda será atualizada anualmente, de acordo com o coeficiente legal fixado por portaria (art. 1077.º do Código Civil)." },
    { id: "caucao", label: "Artigo 5.º — Caução", required: true,
      text: "O arrendatário entrega a título de caução a quantia de {depositAmount} €, correspondente a {depositMonths} mês(es) de renda.\n\nA caução será devolvida no prazo de 30 dias após a restituição do locado, deduzidas as importâncias eventualmente devidas." },
    { id: "obras", label: "Artigo 6.º — Obras e conservação", required: true,
      text: "O senhorio é obrigado a realizar todas as obras de conservação necessárias para manter o locado em condições de habitabilidade (art. 1074.º do Código Civil).\n\nO arrendatário é responsável pelas pequenas reparações decorrentes do uso normal do imóvel.\n\nQualquer obra que altere a estrutura do imóvel carece de autorização escrita do senhorio." },
    { id: "denuncia", label: "Artigo 7.º — Denúncia pelo arrendatário", required: true,
      text: "O arrendatário pode denunciar o contrato a todo o tempo, mediante comunicação ao senhorio com antecedência mínima de 120 dias (contratos de prazo ≥ 1 ano) ou 60 dias (contratos < 1 ano) — art. 1098.º do Código Civil." },
    { id: "resolucao", label: "Artigo 8.º — Resolução", required: true,
      text: "Constituem fundamento de resolução pelo senhorio (art. 1083.º do Código Civil):\n\n• Mora superior a 3 meses no pagamento da renda\n• Utilização do locado para fins diversos do contratado\n• Subarrendamento não autorizado\n• Realização de obras não autorizadas\n• Uso que cause prejuízo substancial ao prédio" },
    { id: "registo", label: "Artigo 9.º — Comunicação às Finanças", required: true,
      text: "O senhorio obriga-se a comunicar o contrato à Autoridade Tributária no prazo legal, através do Portal das Finanças.\n\nO selo do contrato e o imposto de selo são da responsabilidade do senhorio.\n\nO presente contrato está sujeito a legislação portuguesa, nomeadamente o NRAU (Lei 6/2006) e o Código Civil." },
  ],
};

export const ptRentReceipt: DocumentTemplate = {
  id: "pt-rent-receipt",
  version: "1.0.0",
  country: "PT",
  category: "rental",
  docType: "rent-receipt",
  label: "Recibo de renda (Portugal)",
  description: "Recibo eletrónico de renda conforme legislação portuguesa.",
  legalBasis: "Código Civil art. 1075.º; DL 287/2003 (recibos eletrónicos)",
  needsLegalReview: false,
  active: true,
  fields: [
    { key: "landlordName", label: "Nome do senhorio", type: "text", required: true, group: "Senhorio" },
    { key: "landlordNIF", label: "NIF", type: "text", required: true, group: "Senhorio" },
    { key: "tenantName", label: "Nome do arrendatário", type: "text", required: true, group: "Arrendatário" },
    { key: "propertyAddress", label: "Morada do imóvel", type: "text", required: true, group: "Imóvel" },
    { key: "rentAmount", label: "Renda (€)", type: "number", required: true, group: "Valores" },
    { key: "period", label: "Período", type: "text", required: true, placeholder: "Janeiro 2026", group: "Período" },
    { key: "paymentDate", label: "Data de pagamento", type: "date", required: true, group: "Período" },
  ],
  clauses: [
    { id: "recibo", label: "Recibo", required: true,
      text: "RECIBO DE RENDA\n\n{landlordName}, NIF {landlordNIF}, senhorio do imóvel sito em {propertyAddress},\n\nDECLARA ter recebido de {tenantName} a quantia de {rentAmount} € referente à renda do mês de {period}.\n\nData de pagamento: {paymentDate}\n\nNota: O senhorio é obrigado a emitir recibo de quitação (art. 1075.º do Código Civil). Os recibos eletrónicos devem ser emitidos no Portal das Finanças.\n\nLocal e data: ____________\n\nAssinatura do senhorio:" },
  ],
};
