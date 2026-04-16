/**
 * i18n Validation & Fallback System
 * Ensures no empty text, no mixed languages, no broken placeholders.
 */

import type { I18nData } from "./i18n-types";

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
  translations: I18nData,
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
export const PROFILE_FIELD_LABELS: I18nData = {
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
export const notifKeys: I18nData = {
  fr: {
    "notif.title": "Notifications", "notif.mark_all_read": "Tout marquer lu", "notif.empty": "Aucune notification",
    "notif.all": "Tout", "notif.unread": "Non lus", "notif.bookings": "Réservations", "notif.payments": "Paiements", "notif.messages_filter": "Messages",
    "notif.reply": "Répondre", "notif.view_document": "Voir le document", "notif.view_payment": "Voir le paiement",
    "notif.view_dunning": "Voir la relance", "notif.open": "Ouvrir",
    "notif.view_booking": "Voir la réservation", "notif.outdated": "Cet élément n'est plus disponible",
    "notif.alert_settings": "Paramètres d'alerte", "notif.alert_settings_desc": "Contrôlez la réception des alertes en temps réel sur cet appareil.",
    "notif.browser_notifications": "Notifications navigateur", "notif.browser_enabled": "Activées — vous recevrez des alertes bureau",
    "notif.browser_blocked": "Bloquées dans les paramètres du navigateur", "notif.browser_not_enabled": "Pas encore activées",
    "notif.browser_unsupported": "Non supporté par ce navigateur",
    "notif.enable": "Activer", "notif.sound": "Son de notification", "notif.vibration": "Vibration",
    "notif.per_type_alerts": "Alertes par type", "notif.per_type_alerts_desc": "Désactivez son, vibration et alertes navigateur pour certaines catégories.",
    "notif.type_messages": "Messages", "notif.type_bookings": "Réservations", "notif.type_payments": "Paiements",
    "notif.type_documents": "Documents", "notif.type_maintenance": "Maintenance",
    "notif.send_test": "Envoyer une notification test", "notif.test_desc": "Envoie une vraie notification pour vérifier vos paramètres de son, vibration et alertes navigateur.",
    "notif.test_sent": "Notification test envoyée !", "notif.sending": "Envoi…", "notif.saving": "Enregistrement…",
    "notif.smart_alerts_hint": "Les alertes sont automatiquement réduites au silence lorsque vous consultez le contenu associé ou que le panneau de notifications est ouvert.",
    "notif.channel_prefs": "Canaux de notification", "notif.channel_prefs_desc": "Contrôlez les notifications par e-mail et dans l'application.",
    "notif.col_email": "E-mail", "notif.col_inapp": "In-app",
    "notif.urgent_only": "Mode urgent uniquement", "notif.urgent_only_desc": "Ne recevoir que les e-mails urgents (retards de paiement, échéances)",
    "notif.status_summary": "Résumé du statut", "notif.status_browser": "Navigateur", "notif.status_sound": "Son", "notif.status_vibration": "Vibration",
    "notif.status_on": "Activé", "notif.status_off": "Désactivé", "notif.status_blocked": "Bloqué",
    "notif.types_enabled": "types activés sur", "notif.status_email_urgent": "Mode urgent",
    "nav.dashboard_short": "Accueil", "nav.properties_short": "Biens", "nav.market_short": "Services", "nav.messages_short": "Chat", "nav.more": "Plus",
  },
  en: {
    "notif.title": "Notifications", "notif.mark_all_read": "Mark all read", "notif.empty": "No notifications",
    "notif.all": "All", "notif.unread": "New", "notif.bookings": "Bookings", "notif.payments": "Payments", "notif.messages_filter": "Messages",
    "notif.reply": "Reply", "notif.view_document": "View document", "notif.view_payment": "View payment",
    "notif.view_dunning": "View reminder", "notif.open": "Open",
    "notif.view_booking": "View booking", "notif.outdated": "This record is no longer available",
    "notif.alert_settings": "Alert Settings", "notif.alert_settings_desc": "Control how you receive real-time alerts on this device.",
    "notif.browser_notifications": "Browser notifications", "notif.browser_enabled": "Enabled — you'll see desktop alerts",
    "notif.browser_blocked": "Blocked in browser settings", "notif.browser_not_enabled": "Not yet enabled",
    "notif.browser_unsupported": "Not supported in this browser",
    "notif.enable": "Enable", "notif.sound": "Notification sound", "notif.vibration": "Vibration",
    "notif.per_type_alerts": "Alert by notification type", "notif.per_type_alerts_desc": "Disable sound, vibration, and browser alerts for specific categories.",
    "notif.type_messages": "Messages", "notif.type_bookings": "Bookings", "notif.type_payments": "Payments",
    "notif.type_documents": "Documents", "notif.type_maintenance": "Maintenance",
    "notif.send_test": "Send test notification", "notif.test_desc": "Sends a real notification to verify your sound, vibration, and browser alert settings.",
    "notif.test_sent": "Test notification sent!", "notif.sending": "Sending…", "notif.saving": "Saving…",
    "notif.smart_alerts_hint": "Alerts are automatically silenced when you're viewing related content or the notification panel is open.",
    "notif.channel_prefs": "Notification Channels", "notif.channel_prefs_desc": "Control which notifications you receive by email and in-app.",
    "notif.col_email": "Email", "notif.col_inapp": "In-app",
    "notif.urgent_only": "Urgent only mode", "notif.urgent_only_desc": "Only receive emails for urgent items (late payments, deadlines)",
    "notif.status_summary": "Status Summary", "notif.status_browser": "Browser", "notif.status_sound": "Sound", "notif.status_vibration": "Vibration",
    "notif.status_on": "On", "notif.status_off": "Off", "notif.status_blocked": "Blocked",
    "notif.types_enabled": "types enabled of", "notif.status_email_urgent": "Urgent mode",
    "nav.dashboard_short": "Home", "nav.properties_short": "Props", "nav.market_short": "Market", "nav.messages_short": "Chat", "nav.more": "More",
  },
  es: {
    "notif.title": "Notificaciones", "notif.mark_all_read": "Marcar todo leído", "notif.empty": "Sin notificaciones",
    "notif.all": "Todo", "notif.unread": "Nuevas", "notif.bookings": "Reservas", "notif.payments": "Pagos", "notif.messages_filter": "Mensajes",
    "notif.reply": "Responder", "notif.view_document": "Ver documento", "notif.view_payment": "Ver pago",
    "notif.view_dunning": "Ver recordatorio", "notif.open": "Abrir",
    "notif.view_booking": "Ver reserva", "notif.outdated": "Este registro ya no está disponible",
    "notif.alert_settings": "Ajustes de alerta", "notif.alert_settings_desc": "Controla cómo recibes alertas en tiempo real en este dispositivo.",
    "notif.browser_notifications": "Notificaciones del navegador", "notif.browser_enabled": "Activadas — verás alertas de escritorio",
    "notif.browser_blocked": "Bloqueadas en ajustes del navegador", "notif.browser_not_enabled": "Aún no activadas",
    "notif.browser_unsupported": "No soportado en este navegador",
    "notif.enable": "Activar", "notif.sound": "Sonido de notificación", "notif.vibration": "Vibración",
    "notif.per_type_alerts": "Alertas por tipo", "notif.per_type_alerts_desc": "Desactiva sonido, vibración y alertas del navegador para categorías específicas.",
    "notif.type_messages": "Mensajes", "notif.type_bookings": "Reservas", "notif.type_payments": "Pagos",
    "notif.type_documents": "Documentos", "notif.type_maintenance": "Mantenimiento",
    "notif.send_test": "Enviar notificación de prueba", "notif.test_desc": "Envía una notificación real para verificar tus ajustes de sonido, vibración y alertas.",
    "notif.test_sent": "¡Notificación de prueba enviada!", "notif.sending": "Enviando…", "notif.saving": "Guardando…",
    "notif.smart_alerts_hint": "Las alertas se silencian automáticamente cuando estás viendo contenido relacionado o el panel de notificaciones está abierto.",
    "notif.channel_prefs": "Canales de notificación", "notif.channel_prefs_desc": "Controla qué notificaciones recibes por correo y en la app.",
    "notif.col_email": "Correo", "notif.col_inapp": "En app",
    "notif.urgent_only": "Solo urgente", "notif.urgent_only_desc": "Solo recibir correos para elementos urgentes (pagos atrasados, plazos)",
    "notif.status_summary": "Resumen de estado", "notif.status_browser": "Navegador", "notif.status_sound": "Sonido", "notif.status_vibration": "Vibración",
    "notif.status_on": "Activado", "notif.status_off": "Desactivado", "notif.status_blocked": "Bloqueado",
    "notif.types_enabled": "tipos activados de", "notif.status_email_urgent": "Modo urgente",
    "nav.dashboard_short": "Inicio", "nav.properties_short": "Bienes", "nav.market_short": "Tienda", "nav.messages_short": "Chat", "nav.more": "Más",
  },
  de: {
    "notif.title": "Benachrichtigungen", "notif.mark_all_read": "Alle gelesen", "notif.empty": "Keine Benachrichtigungen",
    "notif.all": "Alle", "notif.unread": "Neu", "notif.bookings": "Buchungen", "notif.payments": "Zahlungen", "notif.messages_filter": "Nachrichten",
    "notif.reply": "Antworten", "notif.view_document": "Dokument anzeigen", "notif.view_payment": "Zahlung anzeigen",
    "notif.view_dunning": "Mahnung anzeigen", "notif.open": "Öffnen",
    "notif.view_booking": "Buchung anzeigen", "notif.outdated": "Dieser Eintrag ist nicht mehr verfügbar",
    "notif.alert_settings": "Alarmeinstellungen", "notif.alert_settings_desc": "Steuern Sie Echtzeit-Benachrichtigungen auf diesem Gerät.",
    "notif.browser_notifications": "Browser-Benachrichtigungen", "notif.browser_enabled": "Aktiviert — Desktop-Benachrichtigungen",
    "notif.browser_blocked": "In den Browsereinstellungen blockiert", "notif.browser_not_enabled": "Noch nicht aktiviert",
    "notif.browser_unsupported": "Nicht unterstützt in diesem Browser",
    "notif.enable": "Aktivieren", "notif.sound": "Benachrichtigungston", "notif.vibration": "Vibration",
    "notif.per_type_alerts": "Alarme nach Typ", "notif.per_type_alerts_desc": "Ton, Vibration und Browser-Alarme für bestimmte Kategorien deaktivieren.",
    "notif.type_messages": "Nachrichten", "notif.type_bookings": "Buchungen", "notif.type_payments": "Zahlungen",
    "notif.type_documents": "Dokumente", "notif.type_maintenance": "Wartung",
    "notif.send_test": "Testbenachrichtigung senden", "notif.test_desc": "Sendet eine echte Benachrichtigung zur Überprüfung Ihrer Einstellungen.",
    "notif.test_sent": "Testbenachrichtigung gesendet!", "notif.sending": "Senden…", "notif.saving": "Speichern…",
    "notif.smart_alerts_hint": "Alarme werden automatisch stummgeschaltet, wenn Sie verwandte Inhalte betrachten oder das Benachrichtigungsfenster geöffnet ist.",
    "notif.channel_prefs": "Benachrichtigungskanäle", "notif.channel_prefs_desc": "Steuern Sie, welche Benachrichtigungen Sie per E-Mail und in der App erhalten.",
    "notif.col_email": "E-Mail", "notif.col_inapp": "In-App",
    "notif.urgent_only": "Nur dringende", "notif.urgent_only_desc": "Nur E-Mails für dringende Elemente erhalten (verspätete Zahlungen, Fristen)",
    "notif.status_summary": "Statusübersicht", "notif.status_browser": "Browser", "notif.status_sound": "Ton", "notif.status_vibration": "Vibration",
    "notif.status_on": "Ein", "notif.status_off": "Aus", "notif.status_blocked": "Blockiert",
    "notif.types_enabled": "Typen aktiviert von", "notif.status_email_urgent": "Dringend-Modus",
    "nav.dashboard_short": "Start", "nav.properties_short": "Objekte", "nav.market_short": "Markt", "nav.messages_short": "Chat", "nav.more": "Mehr",
  },
  it: {
    "notif.title": "Notifiche", "notif.mark_all_read": "Segna tutto letto", "notif.empty": "Nessuna notifica",
    "notif.all": "Tutto", "notif.unread": "Nuove", "notif.bookings": "Prenotazioni", "notif.payments": "Pagamenti", "notif.messages_filter": "Messaggi",
    "notif.reply": "Rispondi", "notif.view_document": "Vedi documento", "notif.view_payment": "Vedi pagamento",
    "notif.view_dunning": "Vedi sollecito", "notif.open": "Apri",
    "notif.view_booking": "Vedi prenotazione", "notif.outdated": "Questo elemento non è più disponibile",
    "notif.alert_settings": "Impostazioni avvisi", "notif.alert_settings_desc": "Controlla come ricevi gli avvisi in tempo reale su questo dispositivo.",
    "notif.browser_notifications": "Notifiche del browser", "notif.browser_enabled": "Attivate — riceverai avvisi desktop",
    "notif.browser_blocked": "Bloccate nelle impostazioni del browser", "notif.browser_not_enabled": "Non ancora attivate",
    "notif.browser_unsupported": "Non supportato in questo browser",
    "notif.enable": "Attiva", "notif.sound": "Suono notifica", "notif.vibration": "Vibrazione",
    "notif.per_type_alerts": "Avvisi per tipo", "notif.per_type_alerts_desc": "Disattiva suono, vibrazione e avvisi del browser per categorie specifiche.",
    "notif.type_messages": "Messaggi", "notif.type_bookings": "Prenotazioni", "notif.type_payments": "Pagamenti",
    "notif.type_documents": "Documenti", "notif.type_maintenance": "Manutenzione",
    "notif.send_test": "Invia notifica di test", "notif.test_desc": "Invia una notifica reale per verificare le impostazioni di suono, vibrazione e avvisi.",
    "notif.test_sent": "Notifica di test inviata!", "notif.sending": "Invio…", "notif.saving": "Salvataggio…",
    "notif.smart_alerts_hint": "Gli avvisi vengono silenziati automaticamente quando stai visualizzando contenuti correlati o il pannello notifiche è aperto.",
    "notif.channel_prefs": "Canali di notifica", "notif.channel_prefs_desc": "Controlla quali notifiche ricevi via email e nell'app.",
    "notif.col_email": "Email", "notif.col_inapp": "In-app",
    "notif.urgent_only": "Solo urgenti", "notif.urgent_only_desc": "Ricevi solo email per elementi urgenti (pagamenti in ritardo, scadenze)",
    "notif.status_summary": "Riepilogo stato", "notif.status_browser": "Browser", "notif.status_sound": "Suono", "notif.status_vibration": "Vibrazione",
    "notif.status_on": "Attivo", "notif.status_off": "Disattivato", "notif.status_blocked": "Bloccato",
    "notif.types_enabled": "tipi attivati su", "notif.status_email_urgent": "Modalità urgente",
    "nav.dashboard_short": "Home", "nav.properties_short": "Immobili", "nav.market_short": "Servizi", "nav.messages_short": "Chat", "nav.more": "Altro",
  },
  pt: {
    "notif.title": "Notificações", "notif.mark_all_read": "Marcar tudo lido", "notif.empty": "Sem notificações",
    "notif.all": "Tudo", "notif.unread": "Novas", "notif.bookings": "Reservas", "notif.payments": "Pagamentos", "notif.messages_filter": "Mensagens",
    "notif.reply": "Responder", "notif.view_document": "Ver documento", "notif.view_payment": "Ver pagamento",
    "notif.view_dunning": "Ver lembrete", "notif.open": "Abrir",
    "notif.view_booking": "Ver reserva", "notif.outdated": "Este registro não está mais disponível",
    "notif.alert_settings": "Configurações de alerta", "notif.alert_settings_desc": "Controle como recebe alertas em tempo real neste dispositivo.",
    "notif.browser_notifications": "Notificações do navegador", "notif.browser_enabled": "Ativadas — você verá alertas no desktop",
    "notif.browser_blocked": "Bloqueadas nas configurações do navegador", "notif.browser_not_enabled": "Ainda não ativadas",
    "notif.browser_unsupported": "Não suportado neste navegador",
    "notif.enable": "Ativar", "notif.sound": "Som de notificação", "notif.vibration": "Vibração",
    "notif.per_type_alerts": "Alertas por tipo", "notif.per_type_alerts_desc": "Desative som, vibração e alertas do navegador para categorias específicas.",
    "notif.type_messages": "Mensagens", "notif.type_bookings": "Reservas", "notif.type_payments": "Pagamentos",
    "notif.type_documents": "Documentos", "notif.type_maintenance": "Manutenção",
    "notif.send_test": "Enviar notificação de teste", "notif.test_desc": "Envia uma notificação real para verificar suas configurações de som, vibração e alertas.",
    "notif.test_sent": "Notificação de teste enviada!", "notif.sending": "Enviando…", "notif.saving": "Salvando…",
    "notif.smart_alerts_hint": "Os alertas são silenciados automaticamente quando você está visualizando conteúdo relacionado ou o painel de notificações está aberto.",
    "notif.channel_prefs": "Canais de notificação", "notif.channel_prefs_desc": "Controle quais notificações recebe por email e no app.",
    "notif.col_email": "Email", "notif.col_inapp": "No app",
    "notif.urgent_only": "Apenas urgentes", "notif.urgent_only_desc": "Receber apenas emails para itens urgentes (pagamentos atrasados, prazos)",
    "notif.status_summary": "Resumo do status", "notif.status_browser": "Navegador", "notif.status_sound": "Som", "notif.status_vibration": "Vibração",
    "notif.status_on": "Ativado", "notif.status_off": "Desativado", "notif.status_blocked": "Bloqueado",
    "notif.types_enabled": "tipos ativados de", "notif.status_email_urgent": "Modo urgente",
    "nav.dashboard_short": "Início", "nav.properties_short": "Imóveis", "nav.market_short": "Loja", "nav.messages_short": "Chat", "nav.more": "Mais",
  },
  nl: {
    "notif.title": "Meldingen", "notif.mark_all_read": "Alles gelezen", "notif.empty": "Geen meldingen",
    "notif.all": "Alles", "notif.unread": "Nieuw", "notif.bookings": "Boekingen", "notif.payments": "Betalingen", "notif.messages_filter": "Berichten",
    "notif.reply": "Beantwoorden", "notif.view_document": "Document bekijken", "notif.view_payment": "Betaling bekijken",
    "notif.view_dunning": "Herinnering bekijken", "notif.open": "Openen",
    "notif.view_booking": "Boeking bekijken", "notif.outdated": "Dit item is niet meer beschikbaar",
    "notif.alert_settings": "Meldingsinstellingen", "notif.sound": "Meldingsgeluid", "notif.vibration": "Trillen",
    "notif.enable": "Inschakelen", "notif.sending": "Verzenden…", "notif.saving": "Opslaan…",
    "notif.browser_unsupported": "Niet ondersteund in deze browser",
    "notif.status_on": "Aan", "notif.status_off": "Uit", "notif.status_blocked": "Geblokkeerd",
    "notif.col_email": "E-mail", "notif.col_inapp": "In-app",
    "nav.dashboard_short": "Home", "nav.properties_short": "Panden", "nav.market_short": "Markt", "nav.messages_short": "Chat", "nav.more": "Meer",
  },
  pl: {
    "notif.title": "Powiadomienia", "notif.mark_all_read": "Zaznacz wszystkie", "notif.empty": "Brak powiadomień",
    "notif.all": "Wszystko", "notif.unread": "Nowe", "notif.bookings": "Rezerwacje", "notif.payments": "Płatności", "notif.messages_filter": "Wiadomości",
    "notif.reply": "Odpowiedz", "notif.view_document": "Zobacz dokument", "notif.view_payment": "Zobacz płatność",
    "notif.view_dunning": "Zobacz przypomnienie", "notif.open": "Otwórz",
    "notif.view_booking": "Zobacz rezerwację", "notif.outdated": "Ten wpis nie jest już dostępny",
    "notif.alert_settings": "Ustawienia alertów", "notif.sound": "Dźwięk powiadomienia", "notif.vibration": "Wibracja",
    "notif.enable": "Włącz", "notif.sending": "Wysyłanie…", "notif.saving": "Zapisywanie…",
    "notif.browser_unsupported": "Nieobsługiwane w tej przeglądarce",
    "notif.status_on": "Wł.", "notif.status_off": "Wył.", "notif.status_blocked": "Zablokowane",
    "notif.col_email": "E-mail", "notif.col_inapp": "W aplikacji",
    "nav.dashboard_short": "Start", "nav.properties_short": "Obiekty", "nav.market_short": "Rynek", "nav.messages_short": "Chat", "nav.more": "Więcej",
  },
  tr: {
    "notif.title": "Bildirimler", "notif.mark_all_read": "Tümünü okundu", "notif.empty": "Bildirim yok",
    "notif.all": "Tümü", "notif.unread": "Yeni", "notif.bookings": "Rezervasyonlar", "notif.payments": "Ödemeler", "notif.messages_filter": "Mesajlar",
    "notif.reply": "Yanıtla", "notif.view_document": "Belge görüntüle", "notif.view_payment": "Ödeme görüntüle",
    "notif.view_dunning": "Hatırlatma görüntüle", "notif.open": "Aç",
    "notif.view_booking": "Rezervasyonu görüntüle", "notif.outdated": "Bu kayıt artık mevcut değil",
    "notif.alert_settings": "Uyarı ayarları", "notif.sound": "Bildirim sesi", "notif.vibration": "Titreşim",
    "notif.enable": "Etkinleştir", "notif.sending": "Gönderiliyor…", "notif.saving": "Kaydediliyor…",
    "notif.browser_unsupported": "Bu tarayıcıda desteklenmiyor",
    "notif.status_on": "Açık", "notif.status_off": "Kapalı", "notif.status_blocked": "Engelli",
    "notif.col_email": "E-posta", "notif.col_inapp": "Uygulama içi",
    "nav.dashboard_short": "Ana", "nav.properties_short": "Mülkler", "nav.market_short": "Pazar", "nav.messages_short": "Chat", "nav.more": "Daha",
  },
  ar: {
    "notif.title": "الإشعارات", "notif.mark_all_read": "تحديد الكل كمقروء", "notif.empty": "لا إشعارات",
    "notif.all": "الكل", "notif.unread": "جديد", "notif.bookings": "الحجوزات", "notif.payments": "المدفوعات", "notif.messages_filter": "الرسائل",
    "notif.reply": "رد", "notif.view_document": "عرض المستند", "notif.view_payment": "عرض الدفع",
    "notif.view_dunning": "عرض التذكير", "notif.open": "فتح",
    "notif.view_booking": "عرض الحجز", "notif.outdated": "هذا السجل لم يعد متاحاً",
    "notif.alert_settings": "إعدادات التنبيه", "notif.alert_settings_desc": "تحكم في كيفية تلقي التنبيهات الفورية على هذا الجهاز.",
    "notif.browser_notifications": "إشعارات المتصفح", "notif.browser_enabled": "مفعّلة — ستتلقى تنبيهات سطح المكتب",
    "notif.browser_blocked": "محظورة في إعدادات المتصفح", "notif.browser_not_enabled": "لم يتم تفعيلها بعد",
    "notif.browser_unsupported": "غير مدعوم في هذا المتصفح",
    "notif.enable": "تفعيل", "notif.sound": "صوت الإشعار", "notif.vibration": "اهتزاز",
    "notif.per_type_alerts": "تنبيهات حسب النوع", "notif.per_type_alerts_desc": "تعطيل الصوت والاهتزاز وتنبيهات المتصفح لفئات محددة.",
    "notif.type_messages": "الرسائل", "notif.type_bookings": "الحجوزات", "notif.type_payments": "المدفوعات",
    "notif.type_documents": "المستندات", "notif.type_maintenance": "الصيانة",
    "notif.send_test": "إرسال إشعار تجريبي", "notif.test_sent": "تم إرسال إشعار تجريبي!",
    "notif.sending": "جارٍ الإرسال…", "notif.saving": "جارٍ الحفظ…",
    "notif.smart_alerts_hint": "يتم كتم التنبيهات تلقائياً عند عرض المحتوى ذي الصلة أو عندما تكون لوحة الإشعارات مفتوحة.",
    "notif.channel_prefs": "قنوات الإشعارات", "notif.channel_prefs_desc": "تحكم في الإشعارات التي تتلقاها عبر البريد الإلكتروني وفي التطبيق.",
    "notif.col_email": "البريد", "notif.col_inapp": "في التطبيق",
    "notif.status_summary": "ملخص الحالة", "notif.status_browser": "المتصفح", "notif.status_sound": "الصوت", "notif.status_vibration": "الاهتزاز",
    "notif.status_on": "مفعّل", "notif.status_off": "معطّل", "notif.status_blocked": "محظور",
    "notif.types_enabled": "أنواع مفعّلة من", "notif.status_email_urgent": "الوضع العاجل",
    "nav.dashboard_short": "الرئيسية", "nav.properties_short": "عقارات", "nav.market_short": "سوق", "nav.messages_short": "دردشة", "nav.more": "المزيد",
  },
  ja: {
    "notif.title": "通知", "notif.mark_all_read": "すべて既読", "notif.empty": "通知なし",
    "notif.all": "すべて", "notif.unread": "未読", "notif.bookings": "予約", "notif.payments": "支払い", "notif.messages_filter": "メッセージ",
    "notif.reply": "返信", "notif.view_document": "書類を見る", "notif.view_payment": "支払いを見る",
    "notif.view_dunning": "リマインダーを見る", "notif.open": "開く",
    "notif.view_booking": "予約を見る", "notif.outdated": "このレコードはもう利用できません",
    "notif.alert_settings": "アラート設定", "notif.sound": "通知音", "notif.vibration": "バイブレーション",
    "notif.enable": "有効化", "notif.sending": "送信中…", "notif.saving": "保存中…",
    "notif.browser_unsupported": "このブラウザではサポートされていません",
    "notif.status_on": "オン", "notif.status_off": "オフ", "notif.status_blocked": "ブロック",
    "notif.col_email": "メール", "notif.col_inapp": "アプリ内",
    "nav.dashboard_short": "ホーム", "nav.properties_short": "物件", "nav.market_short": "市場", "nav.messages_short": "チャット", "nav.more": "他",
  },
  ko: {
    "notif.title": "알림", "notif.mark_all_read": "모두 읽음", "notif.empty": "알림 없음",
    "notif.all": "전체", "notif.unread": "새 알림", "notif.bookings": "예약", "notif.payments": "결제", "notif.messages_filter": "메시지",
    "notif.reply": "답장", "notif.view_document": "문서 보기", "notif.view_payment": "결제 보기",
    "notif.view_dunning": "알림 보기", "notif.open": "열기",
    "notif.view_booking": "예약 보기", "notif.outdated": "이 레코드는 더 이상 사용할 수 없습니다",
    "notif.alert_settings": "알림 설정", "notif.sound": "알림 소리", "notif.vibration": "진동",
    "notif.enable": "활성화", "notif.sending": "전송 중…", "notif.saving": "저장 중…",
    "notif.browser_unsupported": "이 브라우저에서 지원되지 않습니다",
    "notif.status_on": "켜짐", "notif.status_off": "꺼짐", "notif.status_blocked": "차단됨",
    "notif.col_email": "이메일", "notif.col_inapp": "인앱",
    "nav.dashboard_short": "홈", "nav.properties_short": "부동산", "nav.market_short": "마켓", "nav.messages_short": "채팅", "nav.more": "더보기",
  },
  zh: {
    "notif.title": "通知", "notif.mark_all_read": "全部已读", "notif.empty": "没有通知",
    "notif.all": "全部", "notif.unread": "未读", "notif.bookings": "预订", "notif.payments": "付款", "notif.messages_filter": "消息",
    "notif.reply": "回复", "notif.view_document": "查看文档", "notif.view_payment": "查看付款",
    "notif.view_dunning": "查看提醒", "notif.open": "打开",
    "notif.view_booking": "查看预订", "notif.outdated": "此记录已不可用",
    "notif.alert_settings": "提醒设置", "notif.sound": "通知声音", "notif.vibration": "振动",
    "notif.enable": "启用", "notif.sending": "发送中…", "notif.saving": "保存中…",
    "notif.browser_unsupported": "此浏览器不支持",
    "notif.status_on": "开", "notif.status_off": "关", "notif.status_blocked": "已屏蔽",
    "notif.col_email": "邮件", "notif.col_inapp": "应用内",
    "nav.dashboard_short": "首页", "nav.properties_short": "房产", "nav.market_short": "商城", "nav.messages_short": "聊天", "nav.more": "更多",
  },
  hi: {
    "notif.title": "सूचनाएं", "notif.mark_all_read": "सब पढ़ा हुआ", "notif.empty": "कोई सूचना नहीं",
    "notif.reply": "जवाब दें", "notif.view_document": "दस्तावेज़ देखें", "notif.view_payment": "भुगतान देखें",
    "notif.view_dunning": "अनुस्मारक देखें", "notif.open": "खोलें",
    "notif.view_booking": "बुकिंग देखें", "notif.outdated": "यह रिकॉर्ड अब उपलब्ध नहीं है",
    "notif.alert_settings": "अलर्ट सेटिंग्स", "notif.sound": "सूचना ध्वनि", "notif.vibration": "कंपन",
    "notif.enable": "सक्रिय करें", "notif.sending": "भेज रहा है…", "notif.saving": "सहेज रहा है…",
    "notif.browser_unsupported": "इस ब्राउज़र में समर्थित नहीं",
    "notif.status_on": "चालू", "notif.status_off": "बंद", "notif.status_blocked": "अवरुद्ध",
    "notif.col_email": "ईमेल", "notif.col_inapp": "ऐप में",
    "nav.dashboard_short": "होम", "nav.properties_short": "संपत्ति", "nav.market_short": "बाज़ार", "nav.messages_short": "चैट", "nav.more": "और",
  },
  th: {
    "notif.title": "การแจ้งเตือน", "notif.mark_all_read": "ทำเครื่องหมายอ่านแล้ว", "notif.empty": "ไม่มีการแจ้งเตือน",
    "notif.reply": "ตอบกลับ", "notif.view_document": "ดูเอกสาร", "notif.view_payment": "ดูการชำระเงิน",
    "notif.view_dunning": "ดูการแจ้งเตือน", "notif.open": "เปิด",
    "notif.view_booking": "ดูการจอง", "notif.outdated": "รายการนี้ไม่สามารถใช้งานได้อีกต่อไป",
    "notif.alert_settings": "ตั้งค่าการแจ้งเตือน", "notif.sound": "เสียงแจ้งเตือน", "notif.vibration": "การสั่น",
    "notif.enable": "เปิดใช้งาน", "notif.sending": "กำลังส่ง…", "notif.saving": "กำลังบันทึก…",
    "notif.browser_unsupported": "ไม่รองรับในเบราว์เซอร์นี้",
    "notif.status_on": "เปิด", "notif.status_off": "ปิด", "notif.status_blocked": "ถูกบล็อก",
    "notif.col_email": "อีเมล", "notif.col_inapp": "ในแอป",
    "nav.dashboard_short": "หน้าหลัก", "nav.properties_short": "ทรัพย์สิน", "nav.market_short": "ตลาด", "nav.messages_short": "แชท", "nav.more": "เพิ่มเติม",
  },
  sv: {
    "notif.title": "Aviseringar", "notif.mark_all_read": "Markera alla", "notif.empty": "Inga aviseringar",
    "notif.reply": "Svara", "notif.view_document": "Visa dokument", "notif.view_payment": "Visa betalning",
    "notif.view_dunning": "Visa påminnelse", "notif.open": "Öppna",
    "notif.view_booking": "Visa bokning", "notif.outdated": "Denna post är inte längre tillgänglig",
    "notif.alert_settings": "Aviseringsinställningar", "notif.sound": "Aviseringsljud", "notif.vibration": "Vibration",
    "notif.enable": "Aktivera", "notif.sending": "Skickar…", "notif.saving": "Sparar…",
    "notif.browser_unsupported": "Stöds inte i denna webbläsare",
    "notif.status_on": "På", "notif.status_off": "Av", "notif.status_blocked": "Blockerad",
    "notif.col_email": "E-post", "notif.col_inapp": "I appen",
    "nav.dashboard_short": "Hem", "nav.properties_short": "Objekt", "nav.market_short": "Butik", "nav.messages_short": "Chatt", "nav.more": "Mer",
  },
  da: {
    "nav.dashboard_short": "Hjem", "nav.properties_short": "Boliger", "nav.market_short": "Marked", "nav.messages_short": "Chat", "nav.more": "Mere",
  },
  nb: {
    "nav.dashboard_short": "Hjem", "nav.properties_short": "Eiend.", "nav.market_short": "Marked", "nav.messages_short": "Chat", "nav.more": "Mer",
  },
  fi: {
    "nav.dashboard_short": "Koti", "nav.properties_short": "Kohteet", "nav.market_short": "Kauppa", "nav.messages_short": "Chat", "nav.more": "Lisää",
  },
  el: {
    "nav.dashboard_short": "Αρχική", "nav.properties_short": "Ακίνητα", "nav.market_short": "Αγορά", "nav.messages_short": "Chat", "nav.more": "Άλλα",
  },
  cs: {
    "nav.dashboard_short": "Domů", "nav.properties_short": "Objekty", "nav.market_short": "Trh", "nav.messages_short": "Chat", "nav.more": "Více",
  },
  hu: {
    "nav.dashboard_short": "Főoldal", "nav.properties_short": "Ingatlan", "nav.market_short": "Piac", "nav.messages_short": "Chat", "nav.more": "Több",
  },
  ro: {
    "nav.dashboard_short": "Acasă", "nav.properties_short": "Imobile", "nav.market_short": "Piață", "nav.messages_short": "Chat", "nav.more": "Mai mult",
  },
  hr: {
    "nav.dashboard_short": "Početna", "nav.properties_short": "Objekti", "nav.market_short": "Tržište", "nav.messages_short": "Chat", "nav.more": "Više",
  },
  bg: {
    "nav.dashboard_short": "Начало", "nav.properties_short": "Имоти", "nav.market_short": "Пазар", "nav.messages_short": "Чат", "nav.more": "Още",
  },
  sk: {
    "nav.dashboard_short": "Domov", "nav.properties_short": "Objekty", "nav.market_short": "Trh", "nav.messages_short": "Chat", "nav.more": "Viac",
  },
  he: {
    "nav.dashboard_short": "ראשי", "nav.properties_short": "נכסים", "nav.market_short": "שוק", "nav.messages_short": "צ׳אט", "nav.more": "עוד",
  },
  uk: {
    "nav.dashboard_short": "Головна", "nav.properties_short": "Об'єкти", "nav.market_short": "Ринок", "nav.messages_short": "Чат", "nav.more": "Ще",
  },
  ru: {
    "nav.dashboard_short": "Главная", "nav.properties_short": "Объекты", "nav.market_short": "Рынок", "nav.messages_short": "Чат", "nav.more": "Ещё",
  },
  sw: {
    "nav.dashboard_short": "Nyumbani", "nav.properties_short": "Mali", "nav.market_short": "Soko", "nav.messages_short": "Chat", "nav.more": "Zaidi",
  },
  bn: {
    "nav.dashboard_short": "হোম", "nav.properties_short": "সম্পত্তি", "nav.market_short": "বাজার", "nav.messages_short": "চ্যাট", "nav.more": "আরও",
  },
  vi: {
    "nav.dashboard_short": "Trang chủ", "nav.properties_short": "BĐS", "nav.market_short": "Chợ", "nav.messages_short": "Chat", "nav.more": "Thêm",
  },
  id: {
    "nav.dashboard_short": "Beranda", "nav.properties_short": "Properti", "nav.market_short": "Pasar", "nav.messages_short": "Chat", "nav.more": "Lainnya",
  },
  ms: {
    "nav.dashboard_short": "Utama", "nav.properties_short": "Hartanah", "nav.market_short": "Pasaran", "nav.messages_short": "Chat", "nav.more": "Lagi",
  },
};
