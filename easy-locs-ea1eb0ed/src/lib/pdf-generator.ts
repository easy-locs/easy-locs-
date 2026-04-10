import type jsPDFType from "jspdf";
import type { DocumentTemplate } from "./templates/types";
import { getCountryEntry } from "@/lib/global-country-registry";

type jsPDF = jsPDFType;

const MARGIN = 20;
const PAGE_WIDTH = 210;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
const LINE_HEIGHT = 5.5;
const FONT_BODY = 10;
const FONT_LABEL = 8.5;
const FONT_SECTION = 12;
const FONT_TITLE = 16;
const HEADER_HEIGHT = 42;         /* Safe Y after header */
const FOOTER_SAFE_Y = 272;       /* Never render content below this Y */
const COLOR_PRIMARY: [number, number, number] = [26, 39, 68];
const COLOR_GOLD: [number, number, number] = [212, 163, 74];
const COLOR_BODY: [number, number, number] = [40, 40, 40];
const COLOR_MUTED: [number, number, number] = [110, 110, 110];

// ====== COUNTRY-AWARE LOCALE MAPS ======
const COUNTRY_LOCALE: Record<string, string> = {
  FR: "fr-FR", BE: "fr-BE", ES: "es-ES", IT: "it-IT", DE: "de-DE",
  PT: "pt-PT", NL: "nl-NL", GB: "en-GB", CH: "fr-CH", AT: "de-AT", LU: "fr-LU",
  PL: "pl-PL", SE: "sv-SE", DK: "da-DK", NO: "nb-NO", FI: "fi-FI",
  GR: "el-GR", CZ: "cs-CZ", HU: "hu-HU", RO: "ro-RO", HR: "hr-HR",
  IE: "en-IE", BG: "bg-BG", SK: "sk-SK",
  AE: "en-AE", SA: "en-SA", QA: "en-QA", BH: "en-BH", KW: "en-KW", OM: "en-OM",
  TR: "tr-TR", JP: "ja-JP", KR: "ko-KR", CN: "zh-CN", IN: "en-IN",
  SG: "en-SG", MY: "en-MY", TH: "th-TH", VN: "vi-VN", PH: "en-PH", ID: "id-ID",
  AU: "en-AU", NZ: "en-NZ", US: "en-US", CA: "en-CA",
  BR: "pt-BR", MX: "es-MX", AR: "es-AR", CL: "es-CL", CO: "es-CO", PE: "es-PE",
  MA: "fr-MA", TN: "fr-TN", DZ: "fr-DZ", SN: "fr-SN", CI: "fr-CI", CM: "fr-CM",
  ZA: "en-ZA", NG: "en-NG", KE: "en-KE", GH: "en-GH",
  IL: "he-IL", JO: "en-JO", LB: "fr-LB",
};

const COUNTRY_CURRENCY: Record<string, string> = {
  FR: "EUR", BE: "EUR", ES: "EUR", IT: "EUR", DE: "EUR", PT: "EUR",
  NL: "EUR", AT: "EUR", LU: "EUR", FI: "EUR", GR: "EUR", IE: "EUR",
  SK: "EUR", HR: "EUR", SI: "EUR", EE: "EUR", LV: "EUR", LT: "EUR", MT: "EUR", CY: "EUR",
  BG: "BGN", CH: "CHF", GB: "GBP",
  PL: "PLN", SE: "SEK", DK: "DKK", NO: "NOK", CZ: "CZK", HU: "HUF", RO: "RON",
  AE: "AED", SA: "SAR", QA: "QAR", BH: "BHD", KW: "KWD", OM: "OMR",
  TR: "TRY", JP: "JPY", KR: "KRW", CN: "CNY", IN: "INR",
  SG: "SGD", MY: "MYR", TH: "THB", VN: "VND", PH: "PHP", ID: "IDR",
  AU: "AUD", NZ: "NZD", US: "USD", CA: "CAD",
  BR: "BRL", MX: "MXN", AR: "ARS", CL: "CLP", CO: "COP", PE: "PEN",
  MA: "MAD", TN: "TND", DZ: "DZD", SN: "XOF", CI: "XOF", CM: "XAF",
  ZA: "ZAR", NG: "NGN", KE: "KES", GH: "GHS",
  IL: "ILS", JO: "JOD", LB: "LBP",
};

const GOVERNMENT_AUTHORITIES: Record<string, string> = {
  FR: "République Française — Service Public",
  ES: "Gobierno de España — LAU",
  DE: "Bundesrepublik Deutschland — BGB",
  IT: "Repubblica Italiana — Legge 431/1998",
  PT: "República Portuguesa — NRAU",
  GB: "United Kingdom — Housing Act",
  US: "United States — State Housing Forms",
  CA: "Canada — Provincial Tenancy Board",
  AE: "Government of Dubai — DLD/RERA",
  JP: "日本国 — 借地借家法",
  KR: "대한민국 — 주택임대차보호법",
  CN: "中华人民共和国 — 租赁管理规定",
  BR: "República Federativa do Brasil — Lei do Inquilinato",
  MX: "Estados Unidos Mexicanos — Código Civil",
};

const COUNTRY_FORM_CODES: Record<string, string> = {
  AE: "Ejari Unified Tenancy Contract",
  FR: "Bail d'habitation type",
  ES: "Contrato LAU",
  DE: "Wohnraummietvertrag (BGB)",
  IT: "Contratto abitativo L.431/1998",
  PT: "Contrato NRAU",
};

const PDF_LABELS: Record<string, { legalBasis: string; signedIn: string; madeDate: string; landlordLabel: string; tenantLabel: string; copies: string; disclaimer: string }> = {
  fr: { legalBasis: "Base legale", signedIn: "Fait a", madeDate: "le", landlordLabel: "Le bailleur / L'expediteur", tenantLabel: "Le locataire / Le destinataire", copies: "Fait en deux exemplaires originaux.", disclaimer: "Document genere a titre informatif. Il ne remplace pas un conseil juridique." },
  en: { legalBasis: "Legal basis", signedIn: "Signed in", madeDate: "on", landlordLabel: "The landlord / Sender", tenantLabel: "The tenant / Recipient", copies: "Made in two original copies.", disclaimer: "Document generated for informational purposes. It does not replace legal advice." },
  es: { legalBasis: "Base legal", signedIn: "Firmado en", madeDate: "el", landlordLabel: "El arrendador / Remitente", tenantLabel: "El inquilino / Destinatario", copies: "Hecho en dos ejemplares originales.", disclaimer: "Documento generado con fines informativos. No sustituye el asesoramiento juridico." },
  de: { legalBasis: "Rechtsgrundlage", signedIn: "Erstellt in", madeDate: "am", landlordLabel: "Der Vermieter / Absender", tenantLabel: "Der Mieter / Empfanger", copies: "Erstellt in zwei Originalausfertigungen.", disclaimer: "Dokument zu Informationszwecken erstellt. Es ersetzt keine Rechtsberatung." },
  it: { legalBasis: "Base giuridica", signedIn: "Fatto a", madeDate: "il", landlordLabel: "Il locatore / Mittente", tenantLabel: "Il conduttore / Destinatario", copies: "Fatto in due copie originali.", disclaimer: "Documento generato a scopo informativo. Non sostituisce la consulenza legale." },
  pt: { legalBasis: "Base legal", signedIn: "Feito em", madeDate: "em", landlordLabel: "O senhorio / Remetente", tenantLabel: "O inquilino / Destinatario", copies: "Feito em dois exemplares originais.", disclaimer: "Documento gerado para fins informativos. Nao substitui aconselhamento juridico." },
  nl: { legalBasis: "Rechtsgrondslag", signedIn: "Opgesteld te", madeDate: "op", landlordLabel: "De verhuurder / Afzender", tenantLabel: "De huurder / Ontvanger", copies: "Opgesteld in twee originele exemplaren.", disclaimer: "Document gegenereerd voor informatieve doeleinden. Het vervangt geen juridisch advies." },
  pl: { legalBasis: "Podstawa prawna", signedIn: "Sporzadzono w", madeDate: "dnia", landlordLabel: "Wynajmujacy / Nadawca", tenantLabel: "Najemca / Odbiorca", copies: "Sporzadzono w dwoch oryginalnych egzemplarzach.", disclaimer: "Dokument wygenerowany w celach informacyjnych. Nie zastepuje porady prawnej." },
  tr: { legalBasis: "Yasal dayanak", signedIn: "Imzalanan yer", madeDate: "tarih", landlordLabel: "Ev sahibi / Gonderen", tenantLabel: "Kiraci / Alici", copies: "Iki orijinal kopya halinde duzenlenmistir.", disclaimer: "Bu belge bilgi amacli olusturulmustur. Hukuki danismanligin yerini almaz." },
  ar: { legalBasis: "Al-asas al-qanuni", signedIn: "Muharrar fi", madeDate: "bi-tarikh", landlordLabel: "Al-mu'ajjir / Al-mursil", tenantLabel: "Al-musta'jir / Al-mursil ilayh", copies: "Hurrirat min nuskhatain asliyatayn.", disclaimer: "Wathiqa li-aghrad al-ma'lumat faqat. La tahllu mahall al-istishara al-qanuniyya." },
  ja: { legalBasis: "Hoteki konkyo", signedIn: "Sakusei basho", madeDate: "hi", landlordLabel: "Kashiushi / Sashidashinin", tenantLabel: "Karinushi / Jushinsha", copies: "Honjo 2-bu sakusei.", disclaimer: "Kono bunsho wa joho mokuteki de sakusei saremashita. Horitsu sodan no kawari ni wa narimasen." },
  ko: { legalBasis: "Beobjeok geungeo", signedIn: "Jakseong jangso", madeDate: "il", landlordLabel: "Imdaein / Balsinin", tenantLabel: "Imchain / Susinin", copies: "Won-bon 2bu jakseong.", disclaimer: "Bon munseo-neun jeongbo mogjeog-euro saengseong-doeeossseubnida." },
  zh: { legalBasis: "Fa lv yi ju", signedIn: "Qian shu di dian", madeDate: "ri qi", landlordLabel: "Chu zu ren / Fa song ren", tenantLabel: "Cheng zu ren / Shou jian ren", copies: "Yi shi liang fen.", disclaimer: "Ben wen jian jin gong xin xi can kao. Bu ti dai fa lv zi xun." },
  hi: { legalBasis: "Kanooni aadhaar", signedIn: "Sthan", madeDate: "dinank", landlordLabel: "Makaan maalik / Bhejne wala", tenantLabel: "Kirayedaar / Praaptkarta", copies: "Do molik pratiyon mein.", disclaimer: "Yah dastavez kewal soochna ke liye hai. Yah kanooni salah ki jagah nahi leta." },
  sv: { legalBasis: "Rattslig grund", signedIn: "Upprattat i", madeDate: "den", landlordLabel: "Hyresvarden / Avsandare", tenantLabel: "Hyresgasten / Mottagare", copies: "Upprattat i tva originalexemplar.", disclaimer: "Dokument genererat i informationssyfte. Det ersatter inte juridisk radgivning." },
  da: { legalBasis: "Retsgrundlag", signedIn: "Underskrevet i", madeDate: "den", landlordLabel: "Udlejeren / Afsender", tenantLabel: "Lejeren / Modtager", copies: "Udfaerdiget i to originale eksemplarer.", disclaimer: "Dokument genereret til informationsformaal. Det erstatter ikke juridisk raadgivning." },
  nb: { legalBasis: "Rettsgrunnlag", signedIn: "Undertegnet i", madeDate: "den", landlordLabel: "Utleier / Avsender", tenantLabel: "Leietaker / Mottaker", copies: "Utferdiget i to originaleksemplarer.", disclaimer: "Dokument generert for informasjonsformaal. Det erstatter ikke juridisk raadgivning." },
  fi: { legalBasis: "Oikeusperuste", signedIn: "Allekirjoitettu", madeDate: "pvm", landlordLabel: "Vuokranantaja / Lahettaja", tenantLabel: "Vuokralainen / Vastaanottaja", copies: "Laadittu kahtena alkuperaisena kappaleena.", disclaimer: "Asiakirja on laadittu tiedoksi. Se ei korvaa oikeudellista neuvontaa." },
  el: { legalBasis: "Nomiki vasi", signedIn: "Ypografi stin", madeDate: "imerominia", landlordLabel: "O ekmistitís / Apostoleas", tenantLabel: "O enoikiastís / Paralíptis", copies: "Syntáchthike se dyo protótypa antígrafa.", disclaimer: "To engrafo dimiourgíthike gia pliroforiakoús skopoús. Den antikathista ti nomikí symvoulí." },
  cs: { legalBasis: "Pravni zaklad", signedIn: "Vyhotoveno v", madeDate: "dne", landlordLabel: "Pronajimatel / Odesilatel", tenantLabel: "Najemce / Prijemce", copies: "Vyhotoveno ve dvou originalech.", disclaimer: "Dokument byl vytvoren pro informacni ucely. Nenahrazuje pravni poradenstvi." },
  hu: { legalBasis: "Jogi alap", signedIn: "Kelt", madeDate: "datum", landlordLabel: "A berbeado / Felado", tenantLabel: "A berlo / Cimzett", copies: "Ket eredeti peldanyban keszult.", disclaimer: "A dokumentum tajekoztatasi celbol keszult. Nem helyettesiti a jogi tanacsadast." },
  ro: { legalBasis: "Baza legala", signedIn: "Intocmit la", madeDate: "data", landlordLabel: "Locatorul / Expeditor", tenantLabel: "Locatarul / Destinatar", copies: "Intocmit in doua exemplare originale.", disclaimer: "Document generat in scop informativ. Nu inlocuieste consultanta juridica." },
  hr: { legalBasis: "Pravna osnova", signedIn: "Sastavljeno u", madeDate: "dana", landlordLabel: "Najmodavac / Posiljatelj", tenantLabel: "Najmoprimac / Primatelj", copies: "Sastavljeno u dva izvornika.", disclaimer: "Dokument je izraden u informativne svrhe. Ne zamjenjuje pravni savjet." },
  bg: { legalBasis: "Pravno osnovanie", signedIn: "Sastaveno v", madeDate: "data", landlordLabel: "Naemodate / Podatel", tenantLabel: "Naematel / Poluchatel", copies: "Sastaveno v dva originala.", disclaimer: "Dokumentat e sazdaden za informatsionni tseli. Ne zamestia pravna konsultatsia." },
  sk: { legalBasis: "Pravny zaklad", signedIn: "Vyhotovene v", madeDate: "dna", landlordLabel: "Prenajimatel / Odosielatel", tenantLabel: "Najomca / Prijemca", copies: "Vyhotovene v dvoch originaloch.", disclaimer: "Dokument bol vytvoreny na informacne ucely. Nenahradzuje pravne poradenstvo." },
  he: { legalBasis: "Basis mishpati", signedIn: "Nechtam be", madeDate: "be-ta'arikh", landlordLabel: "Ha-mas'kir / Ha-shole'ach", tenantLabel: "Ha-sokher / Ha-mekabel", copies: "Ne'erakh bi-shnei otamim mekori'im.", disclaimer: "Ha-mismakh hufak le-tzorkhei meida bilvad. Eino mehalef ye'utz mishpati." },
  uk: { legalBasis: "Pravova pidstava", signedIn: "Skladeno v", madeDate: "data", landlordLabel: "Orendodavets / Vidpravnyk", tenantLabel: "Orendar / Otrymuvach", copies: "Skladeno u dvokh prymirnykakh.", disclaimer: "Dokument stvoreno z informatsiinymy tsilyamy. Vin ne zaminye yurydychnu konsultatsiyu." },
};

const COUNTRY_LANG: Record<string, string> = {
  FR: "fr", BE: "fr", ES: "es", IT: "it", DE: "de", PT: "pt",
  NL: "nl", GB: "en", CH: "fr", AT: "de", LU: "fr",
  PL: "pl", SE: "sv", DK: "da", NO: "nb", FI: "fi",
  GR: "el", CZ: "cs", HU: "hu", RO: "ro", HR: "hr",
  IE: "en", BG: "bg", SK: "sk",
  AE: "en", SA: "en", QA: "en",
  TR: "tr", JP: "ja", KR: "ko", CN: "zh", IN: "hi",
  MA: "fr", TN: "fr", DZ: "fr", SN: "fr", CI: "fr", CM: "fr",
  US: "en", CA: "en", AU: "en", NZ: "en",
  BR: "pt", MX: "es", AR: "es", CL: "es", CO: "es", PE: "es",
  TH: "th", VN: "vi", ID: "en", MY: "en", PH: "en",
  SG: "en", ZA: "en", NG: "en", KE: "en", GH: "en",
  IL: "he", JO: "en", LB: "fr", UA: "uk",
};

function getLang(country?: string): string {
  return COUNTRY_LANG[country || "FR"] || "en";
}

function getPdfLabels(country?: string) {
  const lang = getLang(country);
  return PDF_LABELS[lang] || PDF_LABELS.en;
}

/** Sanitize text: normalize unicode, replace smart quotes & special chars for jsPDF Helvetica compatibility.
 *  Preserves CJK, Arabic, Devanagari, Thai, Korean, Hebrew, Cyrillic and other scripts for worldwide use. */
function sanitize(text: string): string {
  return text
    .normalize("NFC")
    .replace(/[\u2018\u2019\u201A]/g, "'")
    .replace(/[\u201C\u201D\u201E\u00AB\u00BB]/g, '"')
    .replace(/\u2026/g, "...")
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/\u00A0/g, " ")
    .replace(/\u202F/g, " ")
    .replace(/\t/g, "    ")
    // Box-drawing characters -> ASCII
    .replace(/[\u2550\u2551\u2554\u2557\u255A\u255D\u2500\u2502\u250C\u2510\u2514\u2518\u2552\u2555\u2558\u255B\u2553\u2556\u2559\u255C\u255E\u2561\u255F\u2562\u256A\u256B\u256C]/g, "-")
    .replace(/[\u2022\u2023\u25E6\u25AA\u25AB\u2043\u2219]/g, "-") // bullets
    .replace(/\u00B0/g, "deg") // degree
    .replace(/\u00B2/g, "2") // superscript 2 (m²)
    .replace(/\u20AC/g, "EUR") // euro sign
    .replace(/\u00A3/g, "GBP") // pound sign
    // Replace accented Latin characters that Helvetica can't render
    .replace(/[\u00E0\u00E2\u00E4]/g, "a")
    .replace(/[\u00E9\u00E8\u00EA\u00EB]/g, "e")
    .replace(/[\u00EE\u00EF]/g, "i")
    .replace(/[\u00F4\u00F6]/g, "o")
    .replace(/[\u00F9\u00FB\u00FC]/g, "u")
    .replace(/\u00E7/g, "c")
    .replace(/[\u00C0\u00C2\u00C4]/g, "A")
    .replace(/[\u00C9\u00C8\u00CA\u00CB]/g, "E")
    .replace(/[\u00CE\u00CF]/g, "I")
    .replace(/[\u00D4\u00D6]/g, "O")
    .replace(/[\u00D9\u00DB\u00DC]/g, "U")
    .replace(/\u00C7/g, "C")
    .replace(/\u0153/g, "oe")
    .replace(/\u0152/g, "OE")
    .replace(/\u00F1/g, "n").replace(/\u00D1/g, "N") // ñ/Ñ
    .replace(/\u00DF/g, "ss") // ß
    // Remove ONLY control chars and obscure symbols — preserve CJK, Arabic, Devanagari, Thai, Korean, Hebrew, Cyrillic, etc.
    .replace(/[\u0000-\u001F\u007F\uFFFD\uFEFF]/g, "");
}

function formatDateLocalized(dateStr: string, country?: string): string {
  if (!dateStr) return "";
  const locale = COUNTRY_LOCALE[country || "FR"] || "en-GB";
  const d = new Date(dateStr);
  return d.toLocaleDateString(locale, { day: "numeric", month: "long", year: "numeric" });
}

function formatCurrencyLocalized(amount: number, country?: string): string {
  const locale = COUNTRY_LOCALE[country || "FR"] || "en-GB";
  const currency = COUNTRY_CURRENCY[country || "FR"] || "EUR";
  return new Intl.NumberFormat(locale, { style: "currency", currency }).format(amount);
}

function interpolate(text: string, data: Record<string, unknown>, country?: string): string {
  return text.replace(/\{(\w+)\}/g, (_, key) => {
    const val = data[key];
    if (val === undefined || val === null || val === "") return "";
    const isAmountKey = key.toLowerCase().includes("amount") || key === "total" || key === "capital" || key === "depositAmount";
    if (typeof val === "number" && isAmountKey) {
      return formatCurrencyLocalized(Number(val), country);
    }
    if (typeof val === "string" && /^\d{4}-\d{2}-\d{2}/.test(val)) {
      return formatDateLocalized(val, country);
    }
    return String(val);
  });
}

function setFont(doc: jsPDF, style: "normal" | "bold" | "italic", size: number, color: [number, number, number]) {
  doc.setFont("helvetica", style);
  doc.setFontSize(size);
  doc.setTextColor(color[0], color[1], color[2]);
}

function checkPageBreak(doc: jsPDF, y: number, needed: number = 30): number {
  if (y + needed > FOOTER_SAFE_Y) {
    doc.addPage();
    addPageHeader(doc);
    return HEADER_HEIGHT - 12;
  }
  return y;
}

/** Lightweight header for continuation pages */
function addPageHeader(doc: jsPDF) {
  doc.setFillColor(...COLOR_GOLD);
  doc.rect(0, 0, PAGE_WIDTH, 3, "F");
  setFont(doc, "bold", 8, COLOR_PRIMARY);
  doc.text("EASY-LOCS", MARGIN, 12);
  setFont(doc, "normal", 4, COLOR_PRIMARY);
  doc.text("\u00AE", MARGIN + doc.getTextWidth("EASY-LOCS") + 0.5, 9.5);
  doc.setDrawColor(...COLOR_GOLD);
  doc.setLineWidth(0.2);
  doc.line(MARGIN, 15, PAGE_WIDTH - MARGIN, 15);
}

function addHeader(doc: jsPDF, title: string, country: string, docType: string): number {
  const countryEntry = getCountryEntry(country);

  // Gold top bar — slightly taller for premium feel
  doc.setFillColor(...COLOR_GOLD);
  doc.rect(0, 0, PAGE_WIDTH, 7, "F");

  // Thin accent line below gold
  doc.setFillColor(...COLOR_PRIMARY);
  doc.rect(0, 7, PAGE_WIDTH, 1.5, "F");

  // Brand name — left aligned, consistent position
  setFont(doc, "bold", FONT_TITLE, COLOR_PRIMARY);
  doc.text("EASY-LOCS", MARGIN, 20);
  setFont(doc, "normal", 5, COLOR_PRIMARY);
  doc.text("\u00AE", MARGIN + doc.getTextWidth("EASY-LOCS") + 0.5, 17);

  // Authority info — right aligned
  if (countryEntry) {
    const authority = GOVERNMENT_AUTHORITIES[country] || `${countryEntry.name} — Housing Authority`;
    const formCode = COUNTRY_FORM_CODES[country] || "Government housing template";
    setFont(doc, "bold", 8, COLOR_MUTED);
    doc.text(sanitize(authority), PAGE_WIDTH - MARGIN, 17, { align: "right" });
    setFont(doc, "normal", 7, COLOR_MUTED);
    doc.text(
      sanitize(`${formCode} · ${countryEntry.taxIdLabel}`),
      PAGE_WIDTH - MARGIN,
      22,
      { align: "right" }
    );
  }

  // Document title — below brand with subtle background
  doc.setFillColor(245, 247, 250);
  doc.rect(MARGIN, 26, CONTENT_WIDTH, 10, "F");
  setFont(doc, "bold", 11, COLOR_PRIMARY);
  const titleClean = sanitize(title);
  const titleLines = doc.splitTextToSize(titleClean, CONTENT_WIDTH - 6);
  doc.text(titleLines[0] || "", MARGIN + 3, 32);

  // Separator line
  doc.setDrawColor(...COLOR_GOLD);
  doc.setLineWidth(0.5);
  doc.line(MARGIN, 37, PAGE_WIDTH - MARGIN, 37);

  // Date generated — right aligned below separator
  setFont(doc, "normal", 7, COLOR_MUTED);
  const today = new Date().toLocaleDateString(COUNTRY_LOCALE[country] || "en-GB", { day: "numeric", month: "long", year: "numeric" });
  doc.text(sanitize(today), PAGE_WIDTH - MARGIN, 42, { align: "right" });

  return HEADER_HEIGHT + 4; /* 46 — safe start Y for content */
}

function addFooter(doc: jsPDF, country?: string) {
  const labels = getPdfLabels(country);
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);

    // Subtle separator
    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.3);
    doc.line(MARGIN, 274, PAGE_WIDTH - MARGIN, 274);

    // Disclaimer line
    setFont(doc, "italic", 7, COLOR_MUTED);
    doc.text(sanitize(labels.disclaimer), MARGIN, 279);

    // Brand centered
    setFont(doc, "bold", 8, COLOR_PRIMARY);
    const brandText = "EASY-LOCS";
    const brandWidth = doc.getTextWidth(brandText);
    const brandX = (PAGE_WIDTH - brandWidth) / 2;
    doc.text(brandText, brandX, 284);
    setFont(doc, "normal", 4, COLOR_PRIMARY);
    doc.text("\u00AE", brandX + brandWidth + 0.5, 281.5);

    // Page number — right
    setFont(doc, "normal", 7, COLOR_MUTED);
    doc.text(`Page ${i}/${pageCount}`, PAGE_WIDTH - MARGIN, 284, { align: "right" });

    // Bottom bar — dual color
    doc.setFillColor(...COLOR_GOLD);
    doc.rect(0, 287, PAGE_WIDTH, 2, "F");
    doc.setFillColor(...COLOR_PRIMARY);
    doc.rect(0, 289, PAGE_WIDTH, 4, "F");
  }
}

function addSection(doc: jsPDF, title: string, y: number): number {
  y = checkPageBreak(doc, y, 22);
  // Section background strip
  doc.setFillColor(245, 247, 250);
  doc.rect(MARGIN, y - 5, CONTENT_WIDTH, 9, "F");
  setFont(doc, "bold", FONT_SECTION, COLOR_PRIMARY);
  doc.text(sanitize(title), MARGIN + 2, y);
  // Gold accent line under section title
  doc.setDrawColor(...COLOR_GOLD);
  doc.setLineWidth(0.4);
  doc.line(MARGIN, y + 4, MARGIN + 45, y + 4);
  // Thin full-width line
  doc.setDrawColor(230, 230, 230);
  doc.setLineWidth(0.15);
  doc.line(MARGIN + 46, y + 4, PAGE_WIDTH - MARGIN, y + 4);
  return y + 11;
}

function addField(doc: jsPDF, label: string, value: string, y: number): number {
  y = checkPageBreak(doc, y, 16);
  setFont(doc, "bold", FONT_LABEL, COLOR_MUTED);
  doc.text(sanitize(label), MARGIN, y);
  setFont(doc, "normal", FONT_BODY, COLOR_BODY);
  doc.text(sanitize(value || "\u2014"), MARGIN, y + 5);
  return y + 14;
}

function addParagraph(doc: jsPDF, text: string, y: number): number {
  y = checkPageBreak(doc, y, 15);
  setFont(doc, "normal", FONT_BODY, COLOR_BODY);
  const cleanText = sanitize(text);
  const lines: string[] = doc.splitTextToSize(cleanText, CONTENT_WIDTH);
  for (const line of lines) {
    y = checkPageBreak(doc, y, LINE_HEIGHT + 2);
    doc.text(line, MARGIN, y);
    y += LINE_HEIGHT;
  }
  return y + 3;
}

// ====== UAE EJARI OFFICIAL FORMAT ======
const COLOR_UAE_GREEN: [number, number, number] = [0, 100, 60];
const COLOR_UAE_RED: [number, number, number] = [190, 30, 45];

function addUaeTableRow(doc: jsPDF, label: string, value: string, y: number, labelWidth: number = 55): number {
  y = checkPageBreak(doc, y, 12);
  // Draw row border
  doc.setDrawColor(180, 180, 180);
  doc.setLineWidth(0.2);
  doc.rect(MARGIN, y - 4.5, CONTENT_WIDTH, 10);
  doc.line(MARGIN + labelWidth, y - 4.5, MARGIN + labelWidth, y + 5.5);

  setFont(doc, "bold", 8.5, COLOR_PRIMARY);
  doc.text(sanitize(label), MARGIN + 2, y);
  setFont(doc, "normal", 9, COLOR_BODY);
  const lines = doc.splitTextToSize(sanitize(value || "—"), CONTENT_WIDTH - labelWidth - 4);
  doc.text(lines[0] || "—", MARGIN + labelWidth + 2, y);
  return y + 10;
}

function generateUaeEjariPdf(
  JsPDF: typeof jsPDFType,
  template: DocumentTemplate,
  data: Record<string, unknown>,
  signatures?: { landlord?: string; tenant?: string },
  stamp?: string,
  options?: { skipTenantSignature?: boolean; country?: string }
): jsPDF {
  const doc = new JsPDF();
  let y = 0;

  // === TOP BANNER: UAE Government style ===
  doc.setFillColor(0, 100, 60); // UAE green
  doc.rect(0, 0, PAGE_WIDTH, 12, "F");

  // Red accent stripe
  doc.setFillColor(190, 30, 45);
  doc.rect(0, 12, PAGE_WIDTH, 2, "F");

  // Title area
  setFont(doc, "bold", 8, [255, 255, 255]);
  doc.text("GOVERNMENT OF DUBAI", PAGE_WIDTH / 2, 5, { align: "center" });
  setFont(doc, "normal", 6.5, [255, 255, 255]);
  doc.text("Dubai Land Department — Real Estate Regulatory Agency (RERA)", PAGE_WIDTH / 2, 9.5, { align: "center" });

  y = 22;

  // Document title
  setFont(doc, "bold", 16, COLOR_PRIMARY);
  doc.text("TENANCY CONTRACT", PAGE_WIDTH / 2, y, { align: "center" });
  y += 6;
  setFont(doc, "normal", 9, COLOR_MUTED);
  doc.text("Unified Tenancy Contract — Ejari Registration", PAGE_WIDTH / 2, y, { align: "center" });
  y += 4;

  // Contract number & Ejari ref
  doc.setDrawColor(...COLOR_UAE_GREEN);
  doc.setLineWidth(0.5);
  doc.line(MARGIN, y, PAGE_WIDTH - MARGIN, y);
  y += 6;

  const ejariNum = String(data.ejariNumber || "Pending registration");
  setFont(doc, "bold", 8.5, COLOR_MUTED);
  doc.text("Ejari No.:", MARGIN, y);
  setFont(doc, "normal", 9, COLOR_BODY);
  doc.text(sanitize(ejariNum), MARGIN + 22, y);

  const todayFormatted = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  setFont(doc, "bold", 8.5, COLOR_MUTED);
  doc.text("Date:", PAGE_WIDTH - MARGIN - 50, y);
  setFont(doc, "normal", 9, COLOR_BODY);
  doc.text(todayFormatted, PAGE_WIDTH - MARGIN - 38, y);
  y += 10;

  // === SECTION 1: PARTIES ===
  y = addUaeSection(doc, "SECTION 1 — PARTIES TO THE CONTRACT", y);

  // Landlord sub-header
  setFont(doc, "bold", 9, COLOR_UAE_GREEN);
  doc.text("LANDLORD (First Party)", MARGIN, y);
  y += 6;
  y = addUaeTableRow(doc, "Full Name", String(data.landlordName || ""), y);
  y = addUaeTableRow(doc, "Nationality", String(data.landlordNationality || ""), y);
  y = addUaeTableRow(doc, "Emirates ID / Passport", String(data.landlordEmiratesId || ""), y);
  y = addUaeTableRow(doc, "Address", String(data.landlordAddress || ""), y);
  if (data.landlordPhone) y = addUaeTableRow(doc, "Phone", String(data.landlordPhone), y);
  if (data.landlordEmail) y = addUaeTableRow(doc, "Email", String(data.landlordEmail), y);
  y += 4;

  // Tenant sub-header
  setFont(doc, "bold", 9, COLOR_UAE_GREEN);
  doc.text("TENANT (Second Party)", MARGIN, y);
  y += 6;
  y = addUaeTableRow(doc, "Full Name", String(data.tenantName || ""), y);
  y = addUaeTableRow(doc, "Nationality", String(data.tenantNationality || ""), y);
  y = addUaeTableRow(doc, "Emirates ID / Passport", String(data.tenantEmiratesId || ""), y);
  if (data.tenantAddress) y = addUaeTableRow(doc, "Address", String(data.tenantAddress), y);
  if (data.tenantPhone) y = addUaeTableRow(doc, "Phone", String(data.tenantPhone), y);
  if (data.tenantEmail) y = addUaeTableRow(doc, "Email", String(data.tenantEmail), y);
  y += 6;

  // === SECTION 2: PROPERTY ===
  y = addUaeSection(doc, "SECTION 2 — PROPERTY DETAILS", y);
  y = addUaeTableRow(doc, "Property Address", String(data.propertyAddress || ""), y);
  y = addUaeTableRow(doc, "Property Type", String(data.propertyType || ""), y);
  y = addUaeTableRow(doc, "Area (sq ft)", String(data.surface || ""), y);
  y = addUaeTableRow(doc, "Bedrooms", String(data.rooms || ""), y);
  y = addUaeTableRow(doc, "Condition", String(data.furnished || ""), y);
  if (data.makaniNumber) y = addUaeTableRow(doc, "Makani Number", String(data.makaniNumber), y);
  if (data.dewaNumber) y = addUaeTableRow(doc, "DEWA Premises No.", String(data.dewaNumber), y);
  y += 6;

  // === SECTION 3: RENT ===
  y = addUaeSection(doc, "SECTION 3 — RENT & PAYMENT TERMS", y);
  const rentAmt = Number(data.rentAmount || 0);
  y = addUaeTableRow(doc, "Annual Rent", `AED ${rentAmt.toLocaleString("en-AE")}`, y);
  y = addUaeTableRow(doc, "Payment Mode", String(data.paymentMode || ""), y);
  y = addUaeTableRow(doc, "Security Deposit", `AED ${Number(data.depositAmount || 0).toLocaleString("en-AE")}`, y);
  y += 2;
  setFont(doc, "italic", 8, COLOR_MUTED);
  const depositNote = sanitize("The security deposit shall be refunded upon vacating the property in its original condition, less any deductions for damages.");
  doc.text(depositNote, MARGIN, y);
  y += 8;

  // === SECTION 4: DURATION ===
  y = addUaeSection(doc, "SECTION 4 — CONTRACT DURATION", y);
  const startFmt = data.startDate ? formatDateLocalized(String(data.startDate), "AE") : "";
  const endFmt = data.endDate ? formatDateLocalized(String(data.endDate), "AE") : "";
  y = addUaeTableRow(doc, "Start Date", startFmt, y);
  y = addUaeTableRow(doc, "End Date", endFmt, y);
  y += 6;

  // === SECTION 5: TERMS & CONDITIONS ===
  y = addUaeSection(doc, "SECTION 5 — TERMS & CONDITIONS", y);

  const terms = [
    "5.1 Either party must provide 90 days' written notice before the end of the tenancy period as per RERA regulations.",
    "5.2 Early termination by the tenant requires payment of 2 months' rent as penalty unless otherwise agreed in writing.",
    "5.3 The landlord shall not increase the rent during the contract period unless permitted by RERA's rental index.",
    "5.4 The landlord is responsible for structural maintenance and major repairs.",
    "5.5 The tenant is responsible for minor repairs and maintenance of fixtures and fittings.",
    "5.6 Sub-letting is not permitted without the written consent of the landlord.",
  ];
  for (const term of terms) {
    y = checkPageBreak(doc, y, 12);
    setFont(doc, "normal", 9, COLOR_BODY);
    const lines = doc.splitTextToSize(sanitize(term), CONTENT_WIDTH);
    for (const line of lines) {
      doc.text(line, MARGIN, y);
      y += LINE_HEIGHT;
    }
    y += 2;
  }
  y += 4;

  // === SECTION 6: EJARI ===
  y = addUaeSection(doc, "SECTION 6 — EJARI REGISTRATION", y);
  setFont(doc, "normal", 9, COLOR_BODY);
  const ejariText = sanitize("This contract must be registered with the Ejari system within 14 days of signing, as required by Dubai Land Department regulations.");
  const ejariLines = doc.splitTextToSize(ejariText, CONTENT_WIDTH);
  for (const line of ejariLines) {
    doc.text(line, MARGIN, y);
    y += LINE_HEIGHT;
  }
  y += 4;

  // === SECTION 7: LEGAL ===
  y = checkPageBreak(doc, y, 20);
  y = addUaeSection(doc, "SECTION 7 — GOVERNING LAW", y);
  setFont(doc, "normal", 9, COLOR_BODY);
  const govText = sanitize("This contract is governed by the laws of the United Arab Emirates, specifically Dubai Law No. 26 of 2007 concerning the regulation of the relationship between landlords and tenants. Any disputes shall be referred to the Rental Disputes Settlement Centre (RDSC).");
  const govLines = doc.splitTextToSize(govText, CONTENT_WIDTH);
  for (const line of govLines) {
    y = checkPageBreak(doc, y, LINE_HEIGHT + 2);
    doc.text(line, MARGIN, y);
    y += LINE_HEIGHT;
  }
  y += 10;

  // === SIGNATURES ===
  y = checkPageBreak(doc, y, 60);
  doc.setDrawColor(...COLOR_UAE_GREEN);
  doc.setLineWidth(0.5);
  doc.line(MARGIN, y, PAGE_WIDTH - MARGIN, y);
  y += 8;

  const colWidth = CONTENT_WIDTH / 2 - 5;
  const sigY = y;

  // Landlord
  setFont(doc, "bold", 9, COLOR_PRIMARY);
  doc.text("FIRST PARTY (Landlord)", MARGIN, sigY);
  setFont(doc, "normal", 9, COLOR_BODY);
  doc.text(sanitize(String(data.landlordName || "")), MARGIN, sigY + 6);
  setFont(doc, "normal", 8, COLOR_MUTED);
  doc.text("Signature:", MARGIN, sigY + 14);
  if (signatures?.landlord) {
    try { doc.addImage(signatures.landlord, "PNG", MARGIN, sigY + 17, colWidth, 22); } catch {}
  } else {
    doc.setDrawColor(200, 200, 200);
    doc.setLineDashPattern([2, 2], 0);
    doc.rect(MARGIN, sigY + 17, colWidth, 22);
    doc.setLineDashPattern([], 0);
  }
  if (stamp) {
    try { doc.addImage(stamp, "PNG", MARGIN + colWidth - 26, sigY + 15, 24, 24); } catch {}
  }

  // Tenant
  if (!options?.skipTenantSignature) {
    const col2X = MARGIN + colWidth + 10;
    setFont(doc, "bold", 9, COLOR_PRIMARY);
    doc.text("SECOND PARTY (Tenant)", col2X, sigY);
    setFont(doc, "normal", 9, COLOR_BODY);
    doc.text(sanitize(String(data.tenantName || "")), col2X, sigY + 6);
    setFont(doc, "normal", 8, COLOR_MUTED);
    doc.text("Signature:", col2X, sigY + 14);
    if (signatures?.tenant) {
      try { doc.addImage(signatures.tenant, "PNG", col2X, sigY + 17, colWidth, 22); } catch {}
    } else {
      doc.setDrawColor(200, 200, 200);
      doc.setLineDashPattern([2, 2], 0);
      doc.rect(col2X, sigY + 17, colWidth, 22);
      doc.setLineDashPattern([], 0);
    }
  }

  // Footer
  addUaeFooter(doc);
  return doc;
}

function addUaeSection(doc: jsPDF, title: string, y: number): number {
  y = checkPageBreak(doc, y, 18);
  doc.setFillColor(240, 245, 240);
  doc.rect(MARGIN, y - 5, CONTENT_WIDTH, 9, "F");
  setFont(doc, "bold", 10, COLOR_UAE_GREEN);
  doc.text(sanitize(title), MARGIN + 2, y);
  doc.setDrawColor(...COLOR_UAE_GREEN);
  doc.setLineWidth(0.3);
  doc.line(MARGIN, y + 4, PAGE_WIDTH - MARGIN, y + 4);
  return y + 10;
}

function addUaeFooter(doc: jsPDF) {
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    // Bottom stripe
    doc.setFillColor(0, 100, 60);
    doc.rect(0, 286, PAGE_WIDTH, 2, "F");
    doc.setFillColor(190, 30, 45);
    doc.rect(0, 288, PAGE_WIDTH, 1.5, "F");
    doc.setFillColor(0, 0, 0);
    doc.rect(0, 289.5, PAGE_WIDTH, 7.5, "F");

    // Footer text
    setFont(doc, "normal", 6.5, [255, 255, 255]);
    doc.text("Unified Tenancy Contract — Ejari System — Dubai Land Department", PAGE_WIDTH / 2, 294, { align: "center" });

    // Page number
    setFont(doc, "normal", 7, [200, 200, 200]);
    doc.text(`Page ${i}/${pageCount}`, PAGE_WIDTH - MARGIN, 294, { align: "right" });

    // Easy-Locs branding
    setFont(doc, "bold", 7, [255, 255, 255]);
    doc.text("EASY-LOCS", MARGIN, 294);
    setFont(doc, "normal", 3.5, [255, 255, 255]);
    doc.text("\u00AE", MARGIN + 18, 292);
  }
}

// ====== UNIVERSAL TEMPLATE-BASED GENERATOR ======
export async function generateFromTemplate(
  template: DocumentTemplate,
  data: Record<string, unknown>,
  signatures?: { landlord?: string; tenant?: string },
  stamp?: string,
  options?: { skipTenantSignature?: boolean; country?: string }
): Promise<jsPDF> {
  const { default: JsPDF } = await import("jspdf");
  const country = options?.country || template.country || "FR";

  // UAE Ejari: use dedicated official format
  if (country === "AE" && (template.docType === "lease-residential" || template.docType === "ejari-contract")) {
    return generateUaeEjariPdf(JsPDF, template, data, signatures, stamp, options);
  }

  const labels = getPdfLabels(country);
  const locale = COUNTRY_LOCALE[country] || "en-GB";
  const doc = new JsPDF();
  let y = addHeader(doc, template.label.toUpperCase(), country, template.docType);

  // Legal basis
  if (template.legalBasis) {
    setFont(doc, "italic", 8, COLOR_MUTED);
    doc.text(sanitize(`${labels.legalBasis} : ${template.legalBasis}`), MARGIN, y);
    y += 9;
  }

  // Compute total for rental docs
  const countryEntry = getCountryEntry(country);
  const enrichedData: Record<string, unknown> = {
    ...data,
    currency: String((countryEntry?.currencySymbol || "")).trim(),
    noticePeriod: String(data.noticePeriod || "as required by local law"),
  };
  if (data.rentAmount !== undefined && data.chargesAmount !== undefined) {
    enrichedData.total = Number(data.rentAmount) + Number(data.chargesAmount);
  }
  if (enrichedData.totalAmount === undefined && enrichedData.total !== undefined) {
    enrichedData.totalAmount = enrichedData.total;
  }

  // Render clauses
  for (const clause of template.clauses) {
    if (clause.conditional && !clause.conditional(enrichedData)) continue;
    y = addSection(doc, clause.label, y);
    const resolved = interpolate(clause.text, enrichedData, country);
    y = addParagraph(doc, resolved, y);
    y += 2;
  }

  // Signature block
  y += 8;
  y = checkPageBreak(doc, y, 55);
  y = addParagraph(doc, labels.copies, y);

  setFont(doc, "normal", FONT_BODY, COLOR_BODY);
  const todayStr = new Date().toLocaleDateString(locale);
  doc.text(sanitize(`${labels.signedIn} ________________, ${labels.madeDate} ${todayStr}`), MARGIN, y);
  y += 14;

  // Dual signature columns
  const colWidth = CONTENT_WIDTH / 2 - 5;
  const sigStartY = y;

  // Landlord / Sender column
  setFont(doc, "bold", FONT_LABEL, COLOR_MUTED);
  doc.text(labels.landlordLabel, MARGIN, sigStartY);
  setFont(doc, "normal", FONT_BODY, COLOR_BODY);
  const landlordName = sanitize(String(data.landlordName || data.senderName || data.hostName || data.presidentName || data.gerantName || ""));
  if (landlordName) doc.text(landlordName, MARGIN, sigStartY + 6);

  if (signatures?.landlord) {
    try {
      doc.addImage(signatures.landlord, "PNG", MARGIN, sigStartY + 10, colWidth, 25);
    } catch { /* ignore invalid image */ }
  } else {
    doc.setDrawColor(200, 200, 200);
    doc.setLineDashPattern([2, 2], 0);
    doc.rect(MARGIN, sigStartY + 10, colWidth, 25);
    doc.setLineDashPattern([], 0);
  }

  // Company stamp (tampon) next to landlord signature
  if (stamp) {
    try {
      doc.addImage(stamp, "PNG", MARGIN + colWidth - 28, sigStartY + 8, 26, 26);
    } catch { /* ignore invalid stamp image */ }
  }

  // Tenant / Recipient column (only if not skipped)
  if (!options?.skipTenantSignature) {
    const col2X = MARGIN + colWidth + 10;
    setFont(doc, "bold", FONT_LABEL, COLOR_MUTED);
    doc.text(labels.tenantLabel, col2X, sigStartY);
    setFont(doc, "normal", FONT_BODY, COLOR_BODY);
    const tenantName = sanitize(String(data.tenantName || data.recipientName || data.guestName || data.guarantorName || ""));
    if (tenantName) doc.text(tenantName, col2X, sigStartY + 6);

    if (signatures?.tenant) {
      try {
        doc.addImage(signatures.tenant, "PNG", col2X, sigStartY + 10, colWidth, 25);
      } catch { /* ignore invalid image */ }
    } else {
      doc.setDrawColor(200, 200, 200);
      doc.setLineDashPattern([2, 2], 0);
      doc.rect(col2X, sigStartY + 10, colWidth, 25);
      doc.setLineDashPattern([], 0);
    }
  }

  addFooter(doc, country);
  return doc;
}

// Utility exports

export function downloadPDF(doc: jsPDF, filename: string) {
  doc.save(filename);
}

export function pdfToDataUri(doc: jsPDF): string {
  return doc.output("datauristring");
}
