import type { DocumentTemplate, Country } from "./types";
import { frRentReceipt } from "./fr/rent-receipt";
import { frLeaseEmpty } from "./fr/lease-empty";
import { frLeaseFurnished } from "./fr/lease-furnished";
import { frLeaseCommercial } from "./fr/lease-commercial";
import { frSwornStatement } from "./fr/sworn-statement";
import { frFormalNotice } from "./fr/formal-notice";
import { frTermination } from "./fr/termination";
import { frCompanySAS, frCompanySARL, frCompanyEURL, frMicroEntrepreneur, frLegalNotice, frFormM0, frFormP0 } from "./fr/company-creation";
import { frChangeDirector, frChangeOffice, frChangeActivity } from "./fr/company-changes";
import { frPVAGO, frAccountsApproval, frShareTransfer, frCapitalIncrease, frDissolution, frPVAGE, frActeCession, frRapportGestion } from "./fr/company-admin";
import { frInventory, frRentRevision, frChargesRegularization, frUnpaidNotice } from "./fr/rental-extras";
import { frCongesBailleur, frCongesLocataire, frCautionSolidaire, frAttestationHebergement, frCommandementPayer, frRestitutionDepot } from "./fr/rental-legal";
import { frStatutsSAS, frStatutsSARL, frPacteAssocies, frNominationCAC } from "./fr/company-legal";
import { allEuropeTemplates } from "./europe-packs";
import { allWorldTemplates } from "./world-packs";
import { allExtraWorldTemplates } from "./world-packs-extra";
import { allExtraWorldTemplates2 } from "./world-packs-extra2";
import { getAllCountryEntries, getCountryEntry } from "@/lib/global-country-registry";

// ─── COUNTRY-SPECIFIC LEGAL LABELS ───
const COUNTRY_LEGAL_LABELS: Record<string, {
  leaseLabel: string;
  leaseDesc: string;
  receiptLabel: string;
  receiptDesc: string;
  noticeLabel: string;
  noticeDesc: string;
  inventoryLabel: string;
  inventoryDesc: string;
  lang: string;
  clauseParties: string;
  clauseProperty: string;
  clauseRent: string;
  clauseDuration: string;
  clauseReceipt: string;
  clauseNotice: string;
  clauseInventory: string;
  fieldLandlord: string;
  fieldTenant: string;
  fieldAddress: string;
  fieldSurface: string;
  fieldRooms: string;
  fieldRent: string;
  fieldCharges: string;
  fieldDeposit: string;
  fieldStartDate: string;
  fieldDuration: string;
  fieldPeriod: string;
  fieldPaymentDate: string;
}> = {
  fr: { leaseLabel: "Contrat de bail résidentiel", leaseDesc: "Bail d'habitation conforme à la législation locale.", receiptLabel: "Quittance de loyer", receiptDesc: "Attestation de paiement du loyer.", noticeLabel: "Mise en demeure", noticeDesc: "Courrier de mise en demeure.", inventoryLabel: "État des lieux", inventoryDesc: "Constat d'entrée/sortie.", lang: "fr", clauseParties: "§1 — Parties", clauseProperty: "§2 — Bien loué", clauseRent: "§3 — Loyer", clauseDuration: "§4 — Durée", clauseReceipt: "Quittance", clauseNotice: "Mise en demeure", clauseInventory: "État des lieux", fieldLandlord: "Bailleur", fieldTenant: "Locataire", fieldAddress: "Adresse du bien", fieldSurface: "Surface", fieldRooms: "Pièces", fieldRent: "Loyer", fieldCharges: "Charges", fieldDeposit: "Dépôt de garantie", fieldStartDate: "Date de début", fieldDuration: "Durée", fieldPeriod: "Période", fieldPaymentDate: "Date de paiement" },
  en: { leaseLabel: "Residential Lease Agreement", leaseDesc: "Tenancy agreement compliant with local law.", receiptLabel: "Rent Receipt", receiptDesc: "Proof of rent payment.", noticeLabel: "Formal Notice", noticeDesc: "Legal notice letter.", inventoryLabel: "Property Inventory", inventoryDesc: "Check-in/check-out report.", lang: "en", clauseParties: "§1 — Parties", clauseProperty: "§2 — Property", clauseRent: "§3 — Rent", clauseDuration: "§4 — Term", clauseReceipt: "Receipt", clauseNotice: "Notice", clauseInventory: "Inventory", fieldLandlord: "Landlord", fieldTenant: "Tenant", fieldAddress: "Property address", fieldSurface: "Surface area", fieldRooms: "Rooms", fieldRent: "Rent", fieldCharges: "Charges", fieldDeposit: "Security deposit", fieldStartDate: "Start date", fieldDuration: "Duration", fieldPeriod: "Period", fieldPaymentDate: "Payment date" },
  es: { leaseLabel: "Contrato de arrendamiento", leaseDesc: "Contrato de alquiler conforme a la ley local.", receiptLabel: "Recibo de alquiler", receiptDesc: "Comprobante de pago de alquiler.", noticeLabel: "Requerimiento formal", noticeDesc: "Carta de requerimiento legal.", inventoryLabel: "Inventario del inmueble", inventoryDesc: "Acta de entrega/devolución.", lang: "es", clauseParties: "§1 — Partes", clauseProperty: "§2 — Inmueble", clauseRent: "§3 — Renta", clauseDuration: "§4 — Plazo", clauseReceipt: "Recibo", clauseNotice: "Requerimiento", clauseInventory: "Inventario", fieldLandlord: "Arrendador", fieldTenant: "Arrendatario", fieldAddress: "Dirección del inmueble", fieldSurface: "Superficie", fieldRooms: "Habitaciones", fieldRent: "Renta mensual", fieldCharges: "Gastos comunes", fieldDeposit: "Depósito de garantía", fieldStartDate: "Fecha de inicio", fieldDuration: "Duración", fieldPeriod: "Periodo", fieldPaymentDate: "Fecha de pago" },
  de: { leaseLabel: "Wohnungsmietvertrag", leaseDesc: "Mietvertrag gemäß lokaler Gesetzgebung.", receiptLabel: "Mietquittung", receiptDesc: "Zahlungsbestätigung der Miete.", noticeLabel: "Abmahnung", noticeDesc: "Formelles Mahnschreiben.", inventoryLabel: "Übergabeprotokoll", inventoryDesc: "Ein-/Auszugsprotokoll.", lang: "de", clauseParties: "§1 — Vertragsparteien", clauseProperty: "§2 — Mietobjekt", clauseRent: "§3 — Miete", clauseDuration: "§4 — Mietdauer", clauseReceipt: "Quittung", clauseNotice: "Mahnung", clauseInventory: "Protokoll", fieldLandlord: "Vermieter", fieldTenant: "Mieter", fieldAddress: "Adresse des Mietobjekts", fieldSurface: "Fläche", fieldRooms: "Zimmer", fieldRent: "Kaltmiete", fieldCharges: "Nebenkosten", fieldDeposit: "Kaution", fieldStartDate: "Mietbeginn", fieldDuration: "Laufzeit", fieldPeriod: "Zeitraum", fieldPaymentDate: "Zahlungsdatum" },
  it: { leaseLabel: "Contratto di locazione", leaseDesc: "Contratto di affitto conforme alla normativa locale.", receiptLabel: "Ricevuta di affitto", receiptDesc: "Attestazione di pagamento del canone.", noticeLabel: "Diffida formale", noticeDesc: "Lettera di diffida.", inventoryLabel: "Verbale di consegna", inventoryDesc: "Verbale di consegna/riconsegna.", lang: "it", clauseParties: "§1 — Parti", clauseProperty: "§2 — Immobile", clauseRent: "§3 — Canone", clauseDuration: "§4 — Durata", clauseReceipt: "Ricevuta", clauseNotice: "Diffida", clauseInventory: "Verbale", fieldLandlord: "Locatore", fieldTenant: "Conduttore", fieldAddress: "Indirizzo dell'immobile", fieldSurface: "Superficie", fieldRooms: "Vani", fieldRent: "Canone mensile", fieldCharges: "Spese condominiali", fieldDeposit: "Deposito cauzionale", fieldStartDate: "Data di inizio", fieldDuration: "Durata", fieldPeriod: "Periodo", fieldPaymentDate: "Data di pagamento" },
  pt: { leaseLabel: "Contrato de arrendamento", leaseDesc: "Contrato de arrendamento conforme à lei local.", receiptLabel: "Recibo de renda", receiptDesc: "Comprovativo de pagamento de renda.", noticeLabel: "Notificação formal", noticeDesc: "Carta de notificação legal.", inventoryLabel: "Auto de vistoria", inventoryDesc: "Auto de vistoria de entrada/saída.", lang: "pt", clauseParties: "§1 — Partes", clauseProperty: "§2 — Imóvel", clauseRent: "§3 — Renda", clauseDuration: "§4 — Prazo", clauseReceipt: "Recibo", clauseNotice: "Notificação", clauseInventory: "Vistoria", fieldLandlord: "Senhorio", fieldTenant: "Inquilino", fieldAddress: "Morada do imóvel", fieldSurface: "Área", fieldRooms: "Divisões", fieldRent: "Renda mensal", fieldCharges: "Encargos", fieldDeposit: "Caução", fieldStartDate: "Data de início", fieldDuration: "Duração", fieldPeriod: "Período", fieldPaymentDate: "Data de pagamento" },
  ar: { leaseLabel: "عقد إيجار سكني", leaseDesc: "عقد إيجار متوافق مع القانون المحلي.", receiptLabel: "إيصال إيجار", receiptDesc: "إثبات دفع الإيجار.", noticeLabel: "إنذار رسمي", noticeDesc: "خطاب إنذار قانوني.", inventoryLabel: "محضر تسليم", inventoryDesc: "محضر استلام/تسليم.", lang: "ar", clauseParties: "§1 — الأطراف", clauseProperty: "§2 — العقار", clauseRent: "§3 — الإيجار", clauseDuration: "§4 — المدة", clauseReceipt: "إيصال", clauseNotice: "إنذار", clauseInventory: "محضر", fieldLandlord: "المؤجر", fieldTenant: "المستأجر", fieldAddress: "عنوان العقار", fieldSurface: "المساحة", fieldRooms: "الغرف", fieldRent: "الإيجار الشهري", fieldCharges: "الرسوم", fieldDeposit: "التأمين", fieldStartDate: "تاريخ البدء", fieldDuration: "المدة", fieldPeriod: "الفترة", fieldPaymentDate: "تاريخ الدفع" },
  nl: { leaseLabel: "Huurovereenkomst", leaseDesc: "Huurcontract conform lokale wetgeving.", receiptLabel: "Huurkwitantie", receiptDesc: "Betalingsbewijs van huur.", noticeLabel: "Ingebrekestelling", noticeDesc: "Formele aanmaning.", inventoryLabel: "Opnamestaat", inventoryDesc: "Opname bij aanvang/einde huur.", lang: "nl", clauseParties: "§1 — Partijen", clauseProperty: "§2 — Gehuurde", clauseRent: "§3 — Huurprijs", clauseDuration: "§4 — Duur", clauseReceipt: "Kwitantie", clauseNotice: "Aanmaning", clauseInventory: "Opname", fieldLandlord: "Verhuurder", fieldTenant: "Huurder", fieldAddress: "Adres van het gehuurde", fieldSurface: "Oppervlakte", fieldRooms: "Kamers", fieldRent: "Huurprijs", fieldCharges: "Servicekosten", fieldDeposit: "Waarborgsom", fieldStartDate: "Ingangsdatum", fieldDuration: "Looptijd", fieldPeriod: "Periode", fieldPaymentDate: "Betaaldatum" },
  tr: { leaseLabel: "Konut Kira Sözleşmesi", leaseDesc: "Yerel mevzuata uygun kira sözleşmesi.", receiptLabel: "Kira Makbuzu", receiptDesc: "Kira ödeme belgesi.", noticeLabel: "İhtar", noticeDesc: "Resmi ihtar mektubu.", inventoryLabel: "Teslim Tutanağı", inventoryDesc: "Giriş/çıkış tutanağı.", lang: "tr", clauseParties: "§1 — Taraflar", clauseProperty: "§2 — Kiralanan", clauseRent: "§3 — Kira Bedeli", clauseDuration: "§4 — Süre", clauseReceipt: "Makbuz", clauseNotice: "İhtar", clauseInventory: "Tutanak", fieldLandlord: "Kiraya Veren", fieldTenant: "Kiracı", fieldAddress: "Taşınmaz adresi", fieldSurface: "Yüzölçümü", fieldRooms: "Oda", fieldRent: "Aylık kira", fieldCharges: "Aidat", fieldDeposit: "Depozito", fieldStartDate: "Başlangıç tarihi", fieldDuration: "Süre", fieldPeriod: "Dönem", fieldPaymentDate: "Ödeme tarihi" },
  ja: { leaseLabel: "賃貸借契約書", leaseDesc: "現地法に準拠した賃貸契約。", receiptLabel: "家賃領収書", receiptDesc: "家賃支払いの証明。", noticeLabel: "催告書", noticeDesc: "法的通知。", inventoryLabel: "物件確認書", inventoryDesc: "入退去時の物件状態記録。", lang: "ja", clauseParties: "§1 — 当事者", clauseProperty: "§2 — 物件", clauseRent: "§3 — 賃料", clauseDuration: "§4 — 期間", clauseReceipt: "領収書", clauseNotice: "催告", clauseInventory: "確認書", fieldLandlord: "貸主", fieldTenant: "借主", fieldAddress: "物件所在地", fieldSurface: "面積", fieldRooms: "部屋数", fieldRent: "月額賃料", fieldCharges: "共益費", fieldDeposit: "敷金", fieldStartDate: "契約開始日", fieldDuration: "契約期間", fieldPeriod: "対象期間", fieldPaymentDate: "支払日" },
  ko: { leaseLabel: "주거용 임대차 계약서", leaseDesc: "현지 법률에 따른 임대차 계약.", receiptLabel: "임대료 영수증", receiptDesc: "임대료 납부 증명.", noticeLabel: "최고서", noticeDesc: "법적 통지서.", inventoryLabel: "물건 확인서", inventoryDesc: "입퇴거 시 물건 상태 기록.", lang: "ko", clauseParties: "§1 — 당사자", clauseProperty: "§2 — 부동산", clauseRent: "§3 — 임대료", clauseDuration: "§4 — 기간", clauseReceipt: "영수증", clauseNotice: "최고", clauseInventory: "확인서", fieldLandlord: "임대인", fieldTenant: "임차인", fieldAddress: "부동산 주소", fieldSurface: "면적", fieldRooms: "방 수", fieldRent: "월 임대료", fieldCharges: "관리비", fieldDeposit: "보증금", fieldStartDate: "시작일", fieldDuration: "기간", fieldPeriod: "기간", fieldPaymentDate: "납부일" },
  zh: { leaseLabel: "住宅租赁合同", leaseDesc: "符合当地法律的租赁合同。", receiptLabel: "租金收据", receiptDesc: "租金支付证明。", noticeLabel: "催告函", noticeDesc: "法律通知函。", inventoryLabel: "房屋交接单", inventoryDesc: "入住/退房记录。", lang: "zh", clauseParties: "§1 — 双方", clauseProperty: "§2 — 房屋", clauseRent: "§3 — 租金", clauseDuration: "§4 — 期限", clauseReceipt: "收据", clauseNotice: "催告", clauseInventory: "交接单", fieldLandlord: "出租人", fieldTenant: "承租人", fieldAddress: "房屋地址", fieldSurface: "面积", fieldRooms: "房间数", fieldRent: "月租金", fieldCharges: "物业费", fieldDeposit: "押金", fieldStartDate: "起始日期", fieldDuration: "租期", fieldPeriod: "期间", fieldPaymentDate: "付款日期" },
  hi: { leaseLabel: "आवासीय किराया अनुबंध", leaseDesc: "स्थानीय कानून के अनुसार किराया अनुबंध।", receiptLabel: "किराया रसीद", receiptDesc: "किराया भुगतान का प्रमाण।", noticeLabel: "कानूनी नोटिस", noticeDesc: "कानूनी सूचना पत्र।", inventoryLabel: "संपत्ति सूची", inventoryDesc: "प्रवेश/निकास रिपोर्ट।", lang: "hi", clauseParties: "§1 — पक्ष", clauseProperty: "§2 — संपत्ति", clauseRent: "§3 — किराया", clauseDuration: "§4 — अवधि", clauseReceipt: "रसीद", clauseNotice: "नोटिस", clauseInventory: "सूची", fieldLandlord: "मकान मालिक", fieldTenant: "किरायेदार", fieldAddress: "संपत्ति का पता", fieldSurface: "क्षेत्रफल", fieldRooms: "कमरे", fieldRent: "मासिक किराया", fieldCharges: "शुल्क", fieldDeposit: "जमानत राशि", fieldStartDate: "प्रारंभ तिथि", fieldDuration: "अवधि", fieldPeriod: "अवधि", fieldPaymentDate: "भुगतान तिथि" },
};

// Map country default language to label set
const COUNTRY_LANG_MAP: Record<string, string> = {
  FR: "fr", BE: "fr", CH: "fr", LU: "fr", SN: "fr", CI: "fr", CM: "fr", GA: "fr", CG: "fr", CD: "fr", MG: "fr", MA: "fr", TN: "fr", DZ: "fr", BF: "fr", ML: "fr", NE: "fr", TD: "fr", BJ: "fr", TG: "fr", GN: "fr", RW: "fr", MU: "fr", LB: "fr",
  ES: "es", MX: "es", AR: "es", CL: "es", CO: "es", PE: "es", UY: "es", EC: "es", VE: "es", DO: "es", CR: "es", PA: "es", GT: "es", HN: "es", SV: "es", NI: "es", CU: "es", BO: "es", PY: "es",
  IT: "it", DE: "de", AT: "de", PT: "pt", BR: "pt", NL: "nl", TR: "tr", JP: "ja", KR: "ko", CN: "zh", IN: "hi",
  AE: "ar", SA: "ar", QA: "ar", BH: "ar", KW: "ar", OM: "ar", JO: "ar", IQ: "ar", EG: "ar", LY: "ar", SD: "ar",
};

function getLabelsForCountry(countryCode: string): typeof COUNTRY_LEGAL_LABELS["en"] {
  const lang = COUNTRY_LANG_MAP[countryCode] || "en";
  return COUNTRY_LEGAL_LABELS[lang] || COUNTRY_LEGAL_LABELS.en;
}

const allTemplates: DocumentTemplate[] = [
  // France — Rental
  frRentReceipt, frLeaseEmpty, frLeaseFurnished, frLeaseCommercial,
  frInventory, frRentRevision, frChargesRegularization, frUnpaidNotice,
  // France — Rental legal
  frCongesBailleur, frCongesLocataire, frCautionSolidaire, frAttestationHebergement, frCommandementPayer, frRestitutionDepot,
  // France — Administrative
  frSwornStatement, frFormalNotice, frTermination,
  // France — Company creation
  frCompanySAS, frCompanySARL, frCompanyEURL, frMicroEntrepreneur,
  frLegalNotice, frFormM0, frFormP0,
  // France — Company changes
  frChangeDirector, frChangeOffice, frChangeActivity,
  // France — Company admin
  frPVAGO, frAccountsApproval, frShareTransfer, frCapitalIncrease,
  frDissolution, frPVAGE, frActeCession, frRapportGestion,
  // France — Company legal
  frStatutsSAS, frStatutsSARL, frPacteAssocies, frNominationCAC,
  // Europe packs
  ...allEuropeTemplates,
  // World packs
  ...allWorldTemplates,
  ...allExtraWorldTemplates,
  ...allExtraWorldTemplates2,
];

const existingCountries = new Set(allTemplates.map((t) => String(t.country)));

// Generate localized templates for all countries without dedicated packs
const generatedFallbackTemplates: DocumentTemplate[] = getAllCountryEntries()
  .filter((country) => !existingCountries.has(country.code))
  .flatMap((country) => {
    const cc = country.code.toLowerCase();
    const L = getLabelsForCountry(country.code);
    const surfaceUnit = country.measurementUnit === "imperial" ? "sq ft" : "m²";

    return [
      // 1. Lease
      {
        id: `${cc}-lease-residential`,
        version: "1.0.0",
        country: country.code as Country,
        category: "rental" as const,
        docType: "lease-residential",
        label: `${L.leaseLabel} (${country.name})`,
        description: `${L.leaseDesc}`,
        legalBasis: `${country.name} — ${country.taxIdLabel}`,
        needsLegalReview: true,
        active: true,
        fields: [
          { key: "landlordName", label: L.fieldLandlord, type: "text" as const, required: true, group: L.clauseParties },
          { key: "landlordAddress", label: `${L.fieldLandlord} — ${L.fieldAddress}`, type: "text" as const, required: true, group: L.clauseParties },
          { key: "tenantName", label: L.fieldTenant, type: "text" as const, required: true, group: L.clauseParties },
          { key: "tenantAddress", label: `${L.fieldTenant} — ${L.fieldAddress}`, type: "text" as const, required: false, group: L.clauseParties },
          { key: "propertyAddress", label: L.fieldAddress, type: "text" as const, required: true, group: L.clauseProperty },
          { key: "surface", label: `${L.fieldSurface} (${surfaceUnit})`, type: "number" as const, required: true, group: L.clauseProperty },
          { key: "rooms", label: L.fieldRooms, type: "number" as const, required: true, group: L.clauseProperty },
          { key: "rentAmount", label: `${L.fieldRent} (${country.currencySymbol})`, type: "number" as const, required: true, group: L.clauseRent },
          { key: "chargesAmount", label: `${L.fieldCharges} (${country.currencySymbol})`, type: "number" as const, required: false, defaultValue: 0, group: L.clauseRent },
          { key: "depositAmount", label: `${L.fieldDeposit} (${country.currencySymbol})`, type: "number" as const, required: false, defaultValue: 0, group: L.clauseRent },
          { key: "startDate", label: L.fieldStartDate, type: "date" as const, required: true, group: L.clauseDuration },
          { key: "duration", label: L.fieldDuration, type: "select" as const, required: true, group: L.clauseDuration, options: [
            { value: "6", label: "6 months" }, { value: "12", label: "12 months" }, { value: "24", label: "24 months" }, { value: "36", label: "36 months" }, { value: "indefinite", label: "Open-ended" },
          ], defaultValue: "12" },
        ],
        clauses: [
          { id: "parties", label: L.clauseParties, required: true, text: `Between {landlordName}, at {landlordAddress}, and {tenantName}.` },
          { id: "property", label: L.clauseProperty, required: true, text: `Property at {propertyAddress}, ${surfaceUnit}: {surface}, {rooms} room(s).` },
          { id: "rent", label: L.clauseRent, required: true, text: `${L.fieldRent}: {rentAmount} ${country.currencySymbol}. ${L.fieldCharges}: {chargesAmount} ${country.currencySymbol}. ${L.fieldDeposit}: {depositAmount} ${country.currencySymbol}.` },
          { id: "term", label: L.clauseDuration, required: true, text: `Starts {startDate}, duration: {duration}.` },
        ],
      },
      // 2. Rent receipt
      {
        id: `${cc}-rent-receipt`,
        version: "1.0.0",
        country: country.code as Country,
        category: "rental" as const,
        docType: "rent-receipt",
        label: `${L.receiptLabel} (${country.name})`,
        description: `${L.receiptDesc}`,
        needsLegalReview: false,
        active: true,
        fields: [
          { key: "landlordName", label: L.fieldLandlord, type: "text" as const, required: true, group: L.clauseParties },
          { key: "tenantName", label: L.fieldTenant, type: "text" as const, required: true, group: L.clauseParties },
          { key: "propertyAddress", label: L.fieldAddress, type: "text" as const, required: true, group: L.clauseProperty },
          { key: "rentAmount", label: `${L.fieldRent} (${country.currencySymbol})`, type: "number" as const, required: true, group: L.clauseRent },
          { key: "chargesAmount", label: `${L.fieldCharges} (${country.currencySymbol})`, type: "number" as const, required: false, defaultValue: 0, group: L.clauseRent },
          { key: "period", label: L.fieldPeriod, type: "text" as const, required: true, group: L.clauseRent },
          { key: "paymentDate", label: L.fieldPaymentDate, type: "date" as const, required: true, group: L.clauseRent },
        ],
        clauses: [
          { id: "receipt", label: L.clauseReceipt, required: true, text: `{landlordName} acknowledges receipt from {tenantName} for {period}. ${L.fieldRent}: {rentAmount} ${country.currencySymbol}. ${L.fieldCharges}: {chargesAmount} ${country.currencySymbol}.` },
        ],
      },
      // 3. Formal notice
      {
        id: `${cc}-formal-notice`,
        version: "1.0.0",
        country: country.code as Country,
        category: "rental" as const,
        docType: "formal-notice",
        label: `${L.noticeLabel} (${country.name})`,
        description: `${L.noticeDesc}`,
        needsLegalReview: true,
        active: true,
        fields: [
          { key: "landlordName", label: L.fieldLandlord, type: "text" as const, required: true, group: L.clauseParties },
          { key: "landlordAddress", label: `${L.fieldLandlord} — ${L.fieldAddress}`, type: "text" as const, required: true, group: L.clauseParties },
          { key: "tenantName", label: L.fieldTenant, type: "text" as const, required: true, group: L.clauseParties },
          { key: "tenantAddress", label: `${L.fieldTenant} — ${L.fieldAddress}`, type: "text" as const, required: true, group: L.clauseParties },
          { key: "propertyAddress", label: L.fieldAddress, type: "text" as const, required: true, group: L.clauseProperty },
          { key: "amountDue", label: `Amount due (${country.currencySymbol})`, type: "number" as const, required: true, group: L.clauseRent },
          { key: "noticeDate", label: "Date", type: "date" as const, required: true, group: L.clauseNotice },
          { key: "details", label: "Details", type: "textarea" as const, required: false, group: L.clauseNotice },
        ],
        clauses: [
          { id: "notice", label: L.clauseNotice, required: true, text: `{landlordName} formally notifies {tenantName} regarding unpaid amount of {amountDue} ${country.currencySymbol} for property at {propertyAddress}.` },
        ],
      },
      // 4. Property inventory
      {
        id: `${cc}-inventory`,
        version: "1.0.0",
        country: country.code as Country,
        category: "rental" as const,
        docType: "inventory",
        label: `${L.inventoryLabel} (${country.name})`,
        description: `${L.inventoryDesc}`,
        needsLegalReview: false,
        active: true,
        fields: [
          { key: "landlordName", label: L.fieldLandlord, type: "text" as const, required: true, group: L.clauseParties },
          { key: "tenantName", label: L.fieldTenant, type: "text" as const, required: true, group: L.clauseParties },
          { key: "propertyAddress", label: L.fieldAddress, type: "text" as const, required: true, group: L.clauseProperty },
          { key: "reportDate", label: "Date", type: "date" as const, required: true, group: L.clauseInventory },
          { key: "reportType", label: "Type", type: "select" as const, required: true, group: L.clauseInventory, options: [
            { value: "entry", label: "Entry" }, { value: "exit", label: "Exit" },
          ], defaultValue: "entry" },
          { key: "generalNotes", label: "Notes", type: "textarea" as const, required: false, group: L.clauseInventory },
        ],
        clauses: [
          { id: "inventory", label: L.clauseInventory, required: true, text: `Inventory report for {propertyAddress} — {reportType} on {reportDate}. Parties: {landlordName} and {tenantName}. Notes: {generalNotes}.` },
        ],
      },
    ];
  });

allTemplates.push(...generatedFallbackTemplates);

export function getTemplateById(id: string): DocumentTemplate | undefined {
  return allTemplates.find((t) => t.id === id);
}

export function getTemplatesByCountry(country: Country): DocumentTemplate[] {
  return allTemplates.filter((t) => t.country === country);
}

export function getActiveTemplates(country?: Country): DocumentTemplate[] {
  const filtered = country ? allTemplates.filter((t) => t.country === country) : allTemplates;
  return filtered.filter((t) => t.active);
}

export function getAllTemplates(): DocumentTemplate[] {
  return allTemplates;
}

export function getTemplatesByCategory(category: string, country?: Country): DocumentTemplate[] {
  return allTemplates.filter((t) => t.category === category && (!country || t.country === country));
}
