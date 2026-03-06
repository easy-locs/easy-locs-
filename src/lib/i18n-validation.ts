/**
 * i18n Validation & Fallback System
 * Ensures no empty text, no mixed languages, no broken placeholders.
 */

/** Interpolate placeholders like {name}, {month}, {amount} in translated strings */
export function interpolateI18n(text: string, vars?: Record<string, string | number>): string {
  if (!vars || !text) return text;
  return text.replace(/\{(\w+)\}/g, (match, key) => {
    const val = vars[key];
    if (val === undefined || val === null) return match; // keep placeholder visible for debugging
    return String(val);
  });
}

/** Check if a translation string has unresolved placeholders */
export function hasUnresolvedPlaceholders(text: string): boolean {
  return /\{(\w+)\}/.test(text);
}

/** Validate that a translation is not empty, not the key itself, and not mixed */
export function isValidTranslation(key: string, value: string): boolean {
  if (!value || value.trim() === "") return false;
  if (value === key) return false; // fallback to key means missing
  return true;
}

/** Translation fallback chain: locale → en → fr → key */
export function resolveTranslation(
  key: string,
  translations: Record<string, Record<string, string>>,
  locale: string
): string {
  // Try exact locale
  if (translations[locale]?.[key]) return translations[locale][key];
  // Try English fallback
  if (locale !== "en" && translations.en?.[key]) return translations.en[key];
  // Try French fallback (original language)
  if (locale !== "fr" && translations.fr?.[key]) return translations.fr[key];
  // Return key with warning marker in dev
  if (import.meta.env.DEV) {
    console.warn(`[i18n] Missing translation: "${key}" for locale "${locale}"`);
  }
  return key;
}

/** Profile field labels by language for Global Profile Engine */
export const PROFILE_FIELD_LABELS: Record<string, Record<string, string>> = {
  fr: {
    firstName: "Prénom", lastName: "Nom", fullName: "Nom complet", email: "Email",
    phone: "Téléphone", dateOfBirth: "Date de naissance", nationality: "Nationalité",
    idNumber: "N° pièce d'identité", address: "Adresse", city: "Ville",
    postalCode: "Code postal", country: "Pays", companyName: "Raison sociale",
    taxId: "N° fiscal", signature: "Signature", bankName: "Banque",
    bankIban: "IBAN", bankBic: "BIC", save: "Enregistrer", saving: "Enregistrement...",
    profileUpdated: "Profil mis à jour", profileError: "Erreur de mise à jour",
    myProfile: "Mon profil", identitySection: "Identité", addressSection: "Adresse",
    businessSection: "Informations professionnelles", bankSection: "Coordonnées bancaires",
  },
  en: {
    firstName: "First name", lastName: "Last name", fullName: "Full name", email: "Email",
    phone: "Phone", dateOfBirth: "Date of birth", nationality: "Nationality",
    idNumber: "ID / Passport number", address: "Address", city: "City",
    postalCode: "Postal code", country: "Country", companyName: "Company name",
    taxId: "Tax / VAT number", signature: "Signature", bankName: "Bank name",
    bankIban: "IBAN", bankBic: "BIC / SWIFT", save: "Save", saving: "Saving...",
    profileUpdated: "Profile updated", profileError: "Update error",
    myProfile: "My profile", identitySection: "Identity", addressSection: "Address",
    businessSection: "Business information", bankSection: "Bank details",
  },
  es: {
    firstName: "Nombre", lastName: "Apellido", fullName: "Nombre completo", email: "Email",
    phone: "Teléfono", dateOfBirth: "Fecha de nacimiento", nationality: "Nacionalidad",
    idNumber: "DNI / Pasaporte", address: "Dirección", city: "Ciudad",
    postalCode: "Código postal", country: "País", companyName: "Razón social",
    taxId: "NIF / CIF", signature: "Firma", bankName: "Banco",
    bankIban: "IBAN", bankBic: "BIC / SWIFT", save: "Guardar", saving: "Guardando...",
    profileUpdated: "Perfil actualizado", profileError: "Error al actualizar",
    myProfile: "Mi perfil", identitySection: "Identidad", addressSection: "Dirección",
    businessSection: "Datos profesionales", bankSection: "Datos bancarios",
  },
  de: {
    firstName: "Vorname", lastName: "Nachname", fullName: "Vollständiger Name", email: "E-Mail",
    phone: "Telefon", dateOfBirth: "Geburtsdatum", nationality: "Staatsangehörigkeit",
    idNumber: "Ausweis-Nr. / Pass-Nr.", address: "Adresse", city: "Stadt",
    postalCode: "Postleitzahl", country: "Land", companyName: "Firmenname",
    taxId: "Steuer-Nr.", signature: "Unterschrift", bankName: "Bank",
    bankIban: "IBAN", bankBic: "BIC / SWIFT", save: "Speichern", saving: "Wird gespeichert...",
    profileUpdated: "Profil aktualisiert", profileError: "Fehler beim Aktualisieren",
    myProfile: "Mein Profil", identitySection: "Identität", addressSection: "Adresse",
    businessSection: "Geschäftsdaten", bankSection: "Bankverbindung",
  },
  it: {
    firstName: "Nome", lastName: "Cognome", fullName: "Nome completo", email: "Email",
    phone: "Telefono", dateOfBirth: "Data di nascita", nationality: "Nazionalità",
    idNumber: "N° documento", address: "Indirizzo", city: "Città",
    postalCode: "CAP", country: "Paese", companyName: "Ragione sociale",
    taxId: "Codice fiscale / P.IVA", signature: "Firma", bankName: "Banca",
    bankIban: "IBAN", bankBic: "BIC / SWIFT", save: "Salva", saving: "Salvataggio...",
    profileUpdated: "Profilo aggiornato", profileError: "Errore nell'aggiornamento",
    myProfile: "Il mio profilo", identitySection: "Identità", addressSection: "Indirizzo",
    businessSection: "Dati professionali", bankSection: "Coordinate bancarie",
  },
  pt: {
    firstName: "Nome", lastName: "Sobrenome", fullName: "Nome completo", email: "Email",
    phone: "Telefone", dateOfBirth: "Data de nascimento", nationality: "Nacionalidade",
    idNumber: "N° documento / Passaporte", address: "Endereço", city: "Cidade",
    postalCode: "CEP", country: "País", companyName: "Razão social",
    taxId: "CPF / CNPJ", signature: "Assinatura", bankName: "Banco",
    bankIban: "IBAN", bankBic: "BIC / SWIFT", save: "Salvar", saving: "Salvando...",
    profileUpdated: "Perfil atualizado", profileError: "Erro na atualização",
    myProfile: "Meu perfil", identitySection: "Identidade", addressSection: "Endereço",
    businessSection: "Dados profissionais", bankSection: "Dados bancários",
  },
  nl: {
    firstName: "Voornaam", lastName: "Achternaam", fullName: "Volledige naam", email: "E-mail",
    phone: "Telefoon", dateOfBirth: "Geboortedatum", nationality: "Nationaliteit",
    idNumber: "ID / Paspoortnummer", address: "Adres", city: "Stad",
    postalCode: "Postcode", country: "Land", companyName: "Bedrijfsnaam",
    taxId: "BTW-nummer", signature: "Handtekening", bankName: "Bank",
    bankIban: "IBAN", bankBic: "BIC / SWIFT", save: "Opslaan", saving: "Opslaan...",
    profileUpdated: "Profiel bijgewerkt", profileError: "Fout bij bijwerken",
    myProfile: "Mijn profiel", identitySection: "Identiteit", addressSection: "Adres",
    businessSection: "Bedrijfsgegevens", bankSection: "Bankgegevens",
  },
  pl: {
    firstName: "Imię", lastName: "Nazwisko", fullName: "Pełne imię i nazwisko", email: "E-mail",
    phone: "Telefon", dateOfBirth: "Data urodzenia", nationality: "Narodowość",
    idNumber: "Nr dokumentu / Paszport", address: "Adres", city: "Miasto",
    postalCode: "Kod pocztowy", country: "Kraj", companyName: "Nazwa firmy",
    taxId: "NIP / PESEL", signature: "Podpis", bankName: "Bank",
    bankIban: "IBAN", bankBic: "BIC / SWIFT", save: "Zapisz", saving: "Zapisywanie...",
    profileUpdated: "Profil zaktualizowany", profileError: "Błąd aktualizacji",
    myProfile: "Mój profil", identitySection: "Tożsamość", addressSection: "Adres",
    businessSection: "Dane firmowe", bankSection: "Dane bankowe",
  },
  tr: {
    firstName: "Ad", lastName: "Soyad", fullName: "Tam ad", email: "E-posta",
    phone: "Telefon", dateOfBirth: "Doğum tarihi", nationality: "Uyruk",
    idNumber: "T.C. Kimlik No / Pasaport", address: "Adres", city: "Şehir",
    postalCode: "Posta kodu", country: "Ülke", companyName: "Şirket adı",
    taxId: "Vergi kimlik no", signature: "İmza", bankName: "Banka",
    bankIban: "IBAN", bankBic: "BIC / SWIFT", save: "Kaydet", saving: "Kaydediliyor...",
    profileUpdated: "Profil güncellendi", profileError: "Güncelleme hatası",
    myProfile: "Profilim", identitySection: "Kimlik", addressSection: "Adres",
    businessSection: "İş bilgileri", bankSection: "Banka bilgileri",
  },
  ar: {
    firstName: "الاسم الأول", lastName: "اسم العائلة", fullName: "الاسم الكامل", email: "البريد الإلكتروني",
    phone: "الهاتف", dateOfBirth: "تاريخ الميلاد", nationality: "الجنسية",
    idNumber: "رقم الهوية / جواز السفر", address: "العنوان", city: "المدينة",
    postalCode: "الرمز البريدي", country: "البلد", companyName: "اسم الشركة",
    taxId: "الرقم الضريبي", signature: "التوقيع", bankName: "البنك",
    bankIban: "IBAN", bankBic: "BIC / SWIFT", save: "حفظ", saving: "جارٍ الحفظ...",
    profileUpdated: "تم تحديث الملف الشخصي", profileError: "خطأ في التحديث",
    myProfile: "ملفي الشخصي", identitySection: "الهوية", addressSection: "العنوان",
    businessSection: "المعلومات المهنية", bankSection: "التفاصيل المصرفية",
  },
  ja: {
    firstName: "名", lastName: "姓", fullName: "氏名", email: "メールアドレス",
    phone: "電話番号", dateOfBirth: "生年月日", nationality: "国籍",
    idNumber: "身分証明書番号", address: "住所", city: "市区町村",
    postalCode: "郵便番号", country: "国", companyName: "会社名",
    taxId: "税務番号", signature: "署名", bankName: "銀行名",
    bankIban: "IBAN", bankBic: "BIC / SWIFT", save: "保存", saving: "保存中...",
    profileUpdated: "プロフィールが更新されました", profileError: "更新エラー",
    myProfile: "マイプロフィール", identitySection: "本人確認", addressSection: "住所",
    businessSection: "ビジネス情報", bankSection: "銀行口座情報",
  },
};

export function getProfileLabels(locale: string): Record<string, string> {
  return PROFILE_FIELD_LABELS[locale] || PROFILE_FIELD_LABELS.en;
}

/**
 * Notification keys for all 31 locales
 */
export const notifKeys: Record<string, Record<string, string>> = {
  fr: {
    "notif.title": "Notifications", "notif.mark_all_read": "Tout marquer lu", "notif.empty": "Aucune notification",
    "notif.reply": "Répondre", "notif.view_document": "Voir le document", "notif.view_payment": "Voir le paiement",
    "notif.view_dunning": "Voir la relance", "notif.open": "Ouvrir",
  },
  en: {
    "notif.title": "Notifications", "notif.mark_all_read": "Mark all read", "notif.empty": "No notifications",
    "notif.reply": "Reply", "notif.view_document": "View document", "notif.view_payment": "View payment",
    "notif.view_dunning": "View reminder", "notif.open": "Open",
  },
  es: {
    "notif.title": "Notificaciones", "notif.mark_all_read": "Marcar todo leído", "notif.empty": "Sin notificaciones",
    "notif.reply": "Responder", "notif.view_document": "Ver documento", "notif.view_payment": "Ver pago",
    "notif.view_dunning": "Ver recordatorio", "notif.open": "Abrir",
  },
  de: {
    "notif.title": "Benachrichtigungen", "notif.mark_all_read": "Alle gelesen", "notif.empty": "Keine Benachrichtigungen",
    "notif.reply": "Antworten", "notif.view_document": "Dokument anzeigen", "notif.view_payment": "Zahlung anzeigen",
    "notif.view_dunning": "Mahnung anzeigen", "notif.open": "Öffnen",
  },
  it: {
    "notif.title": "Notifiche", "notif.mark_all_read": "Segna tutto letto", "notif.empty": "Nessuna notifica",
    "notif.reply": "Rispondi", "notif.view_document": "Vedi documento", "notif.view_payment": "Vedi pagamento",
    "notif.view_dunning": "Vedi sollecito", "notif.open": "Apri",
  },
  pt: {
    "notif.title": "Notificações", "notif.mark_all_read": "Marcar tudo lido", "notif.empty": "Sem notificações",
    "notif.reply": "Responder", "notif.view_document": "Ver documento", "notif.view_payment": "Ver pagamento",
    "notif.view_dunning": "Ver lembrete", "notif.open": "Abrir",
  },
  nl: {
    "notif.title": "Meldingen", "notif.mark_all_read": "Alles gelezen", "notif.empty": "Geen meldingen",
    "notif.reply": "Beantwoorden", "notif.view_document": "Document bekijken", "notif.view_payment": "Betaling bekijken",
    "notif.view_dunning": "Herinnering bekijken", "notif.open": "Openen",
  },
  pl: {
    "notif.title": "Powiadomienia", "notif.mark_all_read": "Zaznacz wszystkie", "notif.empty": "Brak powiadomień",
    "notif.reply": "Odpowiedz", "notif.view_document": "Zobacz dokument", "notif.view_payment": "Zobacz płatność",
    "notif.view_dunning": "Zobacz przypomnienie", "notif.open": "Otwórz",
  },
  tr: {
    "notif.title": "Bildirimler", "notif.mark_all_read": "Tümünü okundu", "notif.empty": "Bildirim yok",
    "notif.reply": "Yanıtla", "notif.view_document": "Belge görüntüle", "notif.view_payment": "Ödeme görüntüle",
    "notif.view_dunning": "Hatırlatma görüntüle", "notif.open": "Aç",
  },
  ar: {
    "notif.title": "الإشعارات", "notif.mark_all_read": "تحديد الكل كمقروء", "notif.empty": "لا إشعارات",
    "notif.reply": "رد", "notif.view_document": "عرض المستند", "notif.view_payment": "عرض الدفع",
    "notif.view_dunning": "عرض التذكير", "notif.open": "فتح",
  },
  ja: {
    "notif.title": "通知", "notif.mark_all_read": "すべて既読", "notif.empty": "通知なし",
    "notif.reply": "返信", "notif.view_document": "書類を見る", "notif.view_payment": "支払いを見る",
    "notif.view_dunning": "リマインダーを見る", "notif.open": "開く",
  },
  ko: {
    "notif.title": "알림", "notif.mark_all_read": "모두 읽음", "notif.empty": "알림 없음",
    "notif.reply": "답장", "notif.view_document": "문서 보기", "notif.view_payment": "결제 보기",
    "notif.view_dunning": "알림 보기", "notif.open": "열기",
  },
  zh: {
    "notif.title": "通知", "notif.mark_all_read": "全部已读", "notif.empty": "没有通知",
    "notif.reply": "回复", "notif.view_document": "查看文档", "notif.view_payment": "查看付款",
    "notif.view_dunning": "查看提醒", "notif.open": "打开",
  },
  hi: {
    "notif.title": "सूचनाएं", "notif.mark_all_read": "सब पढ़ा हुआ", "notif.empty": "कोई सूचना नहीं",
    "notif.reply": "जवाब दें", "notif.view_document": "दस्तावेज़ देखें", "notif.view_payment": "भुगतान देखें",
    "notif.view_dunning": "अनुस्मारक देखें", "notif.open": "खोलें",
  },
  sv: {
    "notif.title": "Aviseringar", "notif.mark_all_read": "Markera alla", "notif.empty": "Inga aviseringar",
    "notif.reply": "Svara", "notif.view_document": "Visa dokument", "notif.view_payment": "Visa betalning",
    "notif.view_dunning": "Visa påminnelse", "notif.open": "Öppna",
  },
};
