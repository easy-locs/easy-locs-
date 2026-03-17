import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SENDGRID_API_KEY = Deno.env.get("SENDGRID_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const INTERNAL_SECRET = Deno.env.get("INTERNAL_NOTIFICATION_SECRET") || "";
if (!INTERNAL_SECRET) {
  console.warn("[send-notification-email] INTERNAL_NOTIFICATION_SECRET is not set — internal auth will reject all requests until provisioned.");
}

interface EmailRequest {
  event_type: string;
  recipient_email: string;
  recipient_name?: string;
  data: Record<string, any>;
  locale?: string;
}

/* ══════════════════════════════════════════════════════════════
   TEMPLATES — Each key is unique. Seasonal booking events use
   "seasonal_booking_*" prefix, marketplace uses "marketplace_booking_*",
   generic lifecycle uses plain names.
   ══════════════════════════════════════════════════════════════ */
const TEMPLATES: Record<string, Record<string, { subject: string; title: string; body: string }>> = {
  /* ─── Tenant lifecycle ─── */
  new_tenant: {
    fr: { subject: "Bienvenue — Accédez à votre espace locataire", title: "🏠 Bienvenue sur Easy-Locs", body: "Votre espace locataire est prêt. Connectez-vous pour accéder à vos documents, payer votre loyer et communiquer avec votre bailleur." },
    en: { subject: "Welcome — Access your tenant portal", title: "🏠 Welcome to Easy-Locs", body: "Your tenant portal is ready. Log in to access your documents, pay rent and communicate with your landlord." },
    es: { subject: "Bienvenido — Acceda a su portal de inquilino", title: "🏠 Bienvenido a Easy-Locs", body: "Su portal de inquilino está listo. Inicie sesión para acceder a sus documentos, pagar el alquiler y comunicarse con su arrendador." },
    de: { subject: "Willkommen — Zugang zu Ihrem Mieterportal", title: "🏠 Willkommen bei Easy-Locs", body: "Ihr Mieterportal ist bereit. Melden Sie sich an, um auf Ihre Dokumente zuzugreifen, Miete zu zahlen und mit Ihrem Vermieter zu kommunizieren." },
    it: { subject: "Benvenuto — Accedi al tuo portale inquilino", title: "🏠 Benvenuto su Easy-Locs", body: "Il tuo portale inquilino è pronto. Accedi per consultare i tuoi documenti, pagare l'affitto e comunicare con il tuo locatore." },
    pt: { subject: "Bem-vindo — Acesse seu portal de inquilino", title: "🏠 Bem-vindo ao Easy-Locs", body: "Seu portal de inquilino está pronto. Faça login para acessar seus documentos, pagar o aluguel e se comunicar com seu proprietário." },
  },

  /* ─── Rent ─── */
  rent_due: {
    fr: { subject: "Appel de loyer — {month}", title: "🏠 Appel de loyer", body: "Votre loyer du mois de {month} est dû. Montant total : {amount}." },
    en: { subject: "Rent Due — {month}", title: "🏠 Rent Due", body: "Your rent for {month} is due. Total amount: {amount}." },
    es: { subject: "Alquiler pendiente — {month}", title: "🏠 Alquiler pendiente", body: "Su alquiler de {month} está pendiente. Monto total: {amount}." },
    de: { subject: "Miete fällig — {month}", title: "🏠 Miete fällig", body: "Ihre Miete für {month} ist fällig. Gesamtbetrag: {amount}." },
    it: { subject: "Affitto dovuto — {month}", title: "🏠 Affitto dovuto", body: "Il suo affitto per {month} è dovuto. Importo totale: {amount}." },
    pt: { subject: "Aluguel devido — {month}", title: "🏠 Aluguel devido", body: "Seu aluguel de {month} está vencido. Valor total: {amount}." },
    ar: { subject: "إيجار مستحق — {month}", title: "🏠 إيجار مستحق", body: "إيجارك لشهر {month} مستحق. المبلغ الإجمالي: {amount}." },
    ja: { subject: "家賃のお支払い — {month}", title: "🏠 家賃のお支払い", body: "{month}の家賃のお支払い期限です。合計金額: {amount}。" },
    tr: { subject: "Kira ödeme — {month}", title: "🏠 Kira ödeme", body: "{month} ayı kiranız vadesi gelmiştir. Toplam tutar: {amount}." },
    nl: { subject: "Huur verschuldigd — {month}", title: "🏠 Huur verschuldigd", body: "Uw huur voor {month} is verschuldigd. Totaalbedrag: {amount}." },
    pl: { subject: "Czynsz wymagalny — {month}", title: "🏠 Czynsz wymagalny", body: "Czynsz za {month} jest wymagalny. Łączna kwota: {amount}." },
  },
  rent_payment_received: {
    fr: { subject: "Paiement reçu — {month}", title: "💰 Paiement confirmé", body: "Le paiement du loyer de {month} a été enregistré. Montant : {amount}." },
    en: { subject: "Payment Received — {month}", title: "💰 Payment Confirmed", body: "Rent payment for {month} has been recorded. Amount: {amount}." },
    es: { subject: "Pago recibido — {month}", title: "💰 Pago confirmado", body: "El pago del alquiler de {month} ha sido registrado. Monto: {amount}." },
    de: { subject: "Zahlung erhalten — {month}", title: "💰 Zahlung bestätigt", body: "Die Mietzahlung für {month} wurde verbucht. Betrag: {amount}." },
    it: { subject: "Pagamento ricevuto — {month}", title: "💰 Pagamento confermato", body: "Il pagamento dell'affitto di {month} è stato registrato. Importo: {amount}." },
    pt: { subject: "Pagamento recebido — {month}", title: "💰 Pagamento confirmado", body: "O pagamento do aluguel de {month} foi registrado. Valor: {amount}." },
  },
  receipt_ready: {
    fr: { subject: "Votre quittance est disponible — {month}", title: "📄 Quittance disponible", body: "Votre quittance de loyer pour {month} est disponible dans votre espace locataire." },
    en: { subject: "Your receipt is ready — {month}", title: "📄 Receipt Ready", body: "Your rent receipt for {month} is available in your tenant portal." },
    es: { subject: "Su recibo está disponible — {month}", title: "📄 Recibo disponible", body: "Su recibo de alquiler de {month} está disponible en su portal de inquilino." },
    de: { subject: "Ihre Quittung ist bereit — {month}", title: "📄 Quittung verfügbar", body: "Ihre Mietquittung für {month} ist in Ihrem Mieterportal verfügbar." },
    it: { subject: "La tua ricevuta è pronta — {month}", title: "📄 Ricevuta disponibile", body: "La tua ricevuta d'affitto per {month} è disponibile nel tuo portale inquilino." },
    pt: { subject: "Seu recibo está disponível — {month}", title: "📄 Recibo disponível", body: "Seu recibo de aluguel de {month} está disponível no seu portal de inquilino." },
  },

  /* ─── Lease ─── */
  lease_signed: {
    fr: { subject: "Bail signé — {property}", title: "📝 Bail signé", body: "Le bail pour {property} a été signé par toutes les parties." },
    en: { subject: "Lease Signed — {property}", title: "📝 Lease Signed", body: "The lease for {property} has been signed by all parties." },
    es: { subject: "Contrato firmado — {property}", title: "📝 Contrato firmado", body: "El contrato de {property} ha sido firmado por todas las partes." },
    de: { subject: "Mietvertrag unterzeichnet — {property}", title: "📝 Mietvertrag unterzeichnet", body: "Der Mietvertrag für {property} wurde von allen Parteien unterzeichnet." },
    it: { subject: "Contratto firmato — {property}", title: "📝 Contratto firmato", body: "Il contratto per {property} è stato firmato da tutte le parti." },
    pt: { subject: "Contrato assinado — {property}", title: "📝 Contrato assinado", body: "O contrato de {property} foi assinado por todas as partes." },
  },

  /* ─── Interventions ─── */
  intervention: {
    fr: { subject: "Nouvelle intervention — {title}", title: "🔧 Intervention signalée", body: "Une nouvelle intervention a été créée : {title}. Priorité : {priority}." },
    en: { subject: "New Intervention — {title}", title: "🔧 Intervention Reported", body: "A new intervention has been created: {title}. Priority: {priority}." },
    es: { subject: "Nueva intervención — {title}", title: "🔧 Intervención reportada", body: "Se ha creado una nueva intervención: {title}. Prioridad: {priority}." },
    de: { subject: "Neue Intervention — {title}", title: "🔧 Intervention gemeldet", body: "Eine neue Intervention wurde erstellt: {title}. Priorität: {priority}." },
    it: { subject: "Nuovo intervento — {title}", title: "🔧 Intervento segnalato", body: "È stato creato un nuovo intervento: {title}. Priorità: {priority}." },
    pt: { subject: "Nova intervenção — {title}", title: "🔧 Intervenção reportada", body: "Uma nova intervenção foi criada: {title}. Prioridade: {priority}." },
  },
  maintenance_update: {
    fr: { subject: "Mise à jour maintenance — {title}", title: "🔧 Mise à jour maintenance", body: "La demande de maintenance « {title} » a été mise à jour. Statut : {status}." },
    en: { subject: "Maintenance Update — {title}", title: "🔧 Maintenance Update", body: 'Maintenance request "{title}" has been updated. Status: {status}.' },
    es: { subject: "Actualización de mantenimiento — {title}", title: "🔧 Actualización mantenimiento", body: "La solicitud de mantenimiento « {title} » ha sido actualizada. Estado: {status}." },
    de: { subject: "Wartungsupdate — {title}", title: "🔧 Wartungsupdate", body: 'Die Wartungsanfrage „{title}" wurde aktualisiert. Status: {status}.' },
    it: { subject: "Aggiornamento manutenzione — {title}", title: "🔧 Aggiornamento manutenzione", body: "La richiesta di manutenzione « {title} » è stata aggiornata. Stato: {status}." },
    pt: { subject: "Atualização de manutenção — {title}", title: "🔧 Atualização manutenção", body: "A solicitação de manutenção « {title} » foi atualizada. Status: {status}." },
  },

  /* ─── Documents ─── */
  document_signed: {
    fr: { subject: "Document signé — {title}", title: "✅ Document signé", body: "Le document « {title} » a été signé avec succès." },
    en: { subject: "Document Signed — {title}", title: "✅ Document Signed", body: 'The document "{title}" has been successfully signed.' },
    es: { subject: "Documento firmado — {title}", title: "✅ Documento firmado", body: "El documento « {title} » ha sido firmado con éxito." },
    de: { subject: "Dokument unterzeichnet — {title}", title: "✅ Dokument unterzeichnet", body: 'Das Dokument „{title}" wurde erfolgreich unterzeichnet.' },
    it: { subject: "Documento firmato — {title}", title: "✅ Documento firmato", body: "Il documento « {title} » è stato firmato con successo." },
    pt: { subject: "Documento assinado — {title}", title: "✅ Documento assinado", body: "O documento « {title} » foi assinado com sucesso." },
  },
  document_uploaded: {
    fr: { subject: "Nouveau document disponible — {title}", title: "📄 Nouveau document", body: "Un nouveau document est disponible : {title}. Consultez-le dans votre espace." },
    en: { subject: "New Document Available — {title}", title: "📄 New Document", body: "A new document is available: {title}. Check your portal." },
    es: { subject: "Nuevo documento disponible — {title}", title: "📄 Nuevo documento", body: "Un nuevo documento está disponible: {title}. Consúltelo en su portal." },
    de: { subject: "Neues Dokument verfügbar — {title}", title: "📄 Neues Dokument", body: "Ein neues Dokument ist verfügbar: {title}. Prüfen Sie es in Ihrem Portal." },
    it: { subject: "Nuovo documento disponibile — {title}", title: "📄 Nuovo documento", body: "Un nuovo documento è disponibile: {title}. Consultalo nel tuo portale." },
    pt: { subject: "Novo documento disponível — {title}", title: "📄 Novo documento", body: "Um novo documento está disponível: {title}. Confira no seu portal." },
  },
  signature_request: {
    fr: { subject: "Signature requise — {title}", title: "✍️ Signature requise", body: "Le document « {title} » nécessite votre signature. Connectez-vous pour signer." },
    en: { subject: "Signature Required — {title}", title: "✍️ Signature Required", body: 'The document "{title}" requires your signature. Log in to sign.' },
    es: { subject: "Firma requerida — {title}", title: "✍️ Firma requerida", body: "El documento « {title} » requiere su firma. Inicie sesión para firmar." },
    de: { subject: "Unterschrift erforderlich — {title}", title: "✍️ Unterschrift erforderlich", body: 'Das Dokument „{title}" erfordert Ihre Unterschrift. Melden Sie sich an, um zu unterschreiben.' },
    it: { subject: "Firma richiesta — {title}", title: "✍️ Firma richiesta", body: "Il documento « {title} » richiede la tua firma. Accedi per firmare." },
    pt: { subject: "Assinatura necessária — {title}", title: "✍️ Assinatura necessária", body: "O documento « {title} » requer sua assinatura. Faça login para assinar." },
  },

  /* ─── Dunning ─── */
  dunning: {
    fr: { subject: "Relance de loyer impayé — {month}", title: "⚠️ Relance de loyer", body: "Le loyer du mois de {month} reste impayé. Montant dû : {amount}. Merci de régulariser rapidement." },
    en: { subject: "Unpaid Rent Reminder — {month}", title: "⚠️ Rent Reminder", body: "Rent for {month} remains unpaid. Amount due: {amount}. Please settle promptly." },
    es: { subject: "Recordatorio de alquiler impago — {month}", title: "⚠️ Recordatorio de alquiler", body: "El alquiler de {month} sigue impago. Monto adeudado: {amount}. Regularice lo antes posible." },
    de: { subject: "Mietrückstand — {month}", title: "⚠️ Mietrückstand", body: "Die Miete für {month} ist noch offen. Fälliger Betrag: {amount}. Bitte begleichen Sie umgehend." },
    it: { subject: "Sollecito affitto non pagato — {month}", title: "⚠️ Sollecito affitto", body: "L'affitto di {month} è ancora non pagato. Importo dovuto: {amount}. Si prega di regolarizzare." },
    pt: { subject: "Lembrete de aluguel em atraso — {month}", title: "⚠️ Lembrete de aluguel", body: "O aluguel de {month} continua em aberto. Valor devido: {amount}. Favor regularizar." },
  },

  /* ─── Seasonal booking lifecycle ─── */
  booking_request: {
    fr: { subject: "Nouvelle demande de réservation — {guest_name}", title: "📩 Demande de réservation", body: "{guest_name} souhaite réserver du {check_in} au {check_out}. {property}" },
    en: { subject: "New Booking Request — {guest_name}", title: "📩 Booking Request", body: "{guest_name} wants to book from {check_in} to {check_out}. {property}" },
    es: { subject: "Nueva solicitud de reserva — {guest_name}", title: "📩 Solicitud de reserva", body: "{guest_name} quiere reservar del {check_in} al {check_out}. {property}" },
    de: { subject: "Neue Buchungsanfrage — {guest_name}", title: "📩 Buchungsanfrage", body: "{guest_name} möchte vom {check_in} bis {check_out} buchen. {property}" },
    it: { subject: "Nuova richiesta di prenotazione — {guest_name}", title: "📩 Richiesta di prenotazione", body: "{guest_name} vuole prenotare dal {check_in} al {check_out}. {property}" },
    pt: { subject: "Nova solicitação de reserva — {guest_name}", title: "📩 Solicitação de reserva", body: "{guest_name} quer reservar de {check_in} a {check_out}. {property}" },
  },
  seasonal_booking_confirmed: {
    fr: { subject: "✅ Réservation confirmée — {check_in} au {check_out}", title: "🏖️ Réservation confirmée", body: "Votre réservation du {check_in} au {check_out} pour {property} est confirmée. Bienvenue !" },
    en: { subject: "✅ Booking Confirmed — {check_in} to {check_out}", title: "🏖️ Booking Confirmed", body: "Your booking from {check_in} to {check_out} for {property} is confirmed. Welcome!" },
    es: { subject: "✅ Reserva confirmada — {check_in} al {check_out}", title: "🏖️ Reserva confirmada", body: "Su reserva del {check_in} al {check_out} para {property} está confirmada. ¡Bienvenido!" },
    de: { subject: "✅ Buchung bestätigt — {check_in} bis {check_out}", title: "🏖️ Buchung bestätigt", body: "Ihre Buchung vom {check_in} bis {check_out} für {property} ist bestätigt. Willkommen!" },
    it: { subject: "✅ Prenotazione confermata — {check_in} al {check_out}", title: "🏖️ Prenotazione confermata", body: "La tua prenotazione dal {check_in} al {check_out} per {property} è confermata. Benvenuto!" },
    pt: { subject: "✅ Reserva confirmada — {check_in} a {check_out}", title: "🏖️ Reserva confirmada", body: "Sua reserva de {check_in} a {check_out} para {property} está confirmada. Bem-vindo!" },
  },
  seasonal_booking_cancelled: {
    fr: { subject: "❌ Réservation annulée — {property}", title: "❌ Réservation annulée", body: "La réservation du {check_in} au {check_out} pour {property} a été annulée." },
    en: { subject: "❌ Booking Cancelled — {property}", title: "❌ Booking Cancelled", body: "The booking from {check_in} to {check_out} for {property} has been cancelled." },
    es: { subject: "❌ Reserva cancelada — {property}", title: "❌ Reserva cancelada", body: "La reserva del {check_in} al {check_out} para {property} ha sido cancelada." },
    de: { subject: "❌ Buchung storniert — {property}", title: "❌ Buchung storniert", body: "Die Buchung vom {check_in} bis {check_out} für {property} wurde storniert." },
    it: { subject: "❌ Prenotazione cancellata — {property}", title: "❌ Prenotazione cancellata", body: "La prenotazione dal {check_in} al {check_out} per {property} è stata cancellata." },
    pt: { subject: "❌ Reserva cancelada — {property}", title: "❌ Reserva cancelada", body: "A reserva de {check_in} a {check_out} para {property} foi cancelada." },
  },

  /* ─── Marketplace / Concierge booking lifecycle ─── */
  marketplace_booking_created: {
    fr: { subject: "📦 Nouvelle réservation — {service_title}", title: "📦 Réservation reçue", body: "{booker_name} a réservé {service_title}.\n\n📅 Date : {service_date}\n💰 Total : {total_price} {currency}\n📧 Contact : {booker_email}" },
    en: { subject: "📦 New Booking — {service_title}", title: "📦 Booking Received", body: "{booker_name} booked {service_title}.\n\n📅 Date: {service_date}\n💰 Total: {total_price} {currency}\n📧 Contact: {booker_email}" },
    es: { subject: "📦 Nueva reserva — {service_title}", title: "📦 Reserva recibida", body: "{booker_name} reservó {service_title}.\n\n📅 Fecha: {service_date}\n💰 Total: {total_price} {currency}\n📧 Contacto: {booker_email}" },
    de: { subject: "📦 Neue Buchung — {service_title}", title: "📦 Buchung erhalten", body: "{booker_name} hat {service_title} gebucht.\n\n📅 Datum: {service_date}\n💰 Gesamt: {total_price} {currency}\n📧 Kontakt: {booker_email}" },
    it: { subject: "📦 Nuova prenotazione — {service_title}", title: "📦 Prenotazione ricevuta", body: "{booker_name} ha prenotato {service_title}.\n\n📅 Data: {service_date}\n💰 Totale: {total_price} {currency}\n📧 Contatto: {booker_email}" },
    pt: { subject: "📦 Nova reserva — {service_title}", title: "📦 Reserva recebida", body: "{booker_name} reservou {service_title}.\n\n📅 Data: {service_date}\n💰 Total: {total_price} {currency}\n📧 Contato: {booker_email}" },
  },
  marketplace_booking_confirmed: {
    fr: { subject: "✅ Réservation confirmée — {service_title}", title: "✅ Réservation confirmée", body: "Votre réservation pour {service_title} est confirmée.\n\n📅 Date : {service_date}\n💰 Total : {total_price} {currency}\n\nNous avons hâte de vous accueillir !" },
    en: { subject: "✅ Booking Confirmed — {service_title}", title: "✅ Booking Confirmed", body: "Your booking for {service_title} is confirmed.\n\n📅 Date: {service_date}\n💰 Total: {total_price} {currency}\n\nWe look forward to welcoming you!" },
    es: { subject: "✅ Reserva confirmada — {service_title}", title: "✅ Reserva confirmada", body: "Su reserva para {service_title} está confirmada.\n\n📅 Fecha: {service_date}\n💰 Total: {total_price} {currency}\n\n¡Le esperamos!" },
    de: { subject: "✅ Buchung bestätigt — {service_title}", title: "✅ Buchung bestätigt", body: "Ihre Buchung für {service_title} ist bestätigt.\n\n📅 Datum: {service_date}\n💰 Gesamt: {total_price} {currency}\n\nWir freuen uns auf Sie!" },
    it: { subject: "✅ Prenotazione confermata — {service_title}", title: "✅ Prenotazione confermata", body: "La tua prenotazione per {service_title} è confermata.\n\n📅 Data: {service_date}\n💰 Totale: {total_price} {currency}\n\nNon vediamo l'ora di accoglierti!" },
    pt: { subject: "✅ Reserva confirmada — {service_title}", title: "✅ Reserva confirmada", body: "Sua reserva para {service_title} está confirmada.\n\n📅 Data: {service_date}\n💰 Total: {total_price} {currency}\n\nEsperamos por você!" },
  },
  marketplace_booking_cancelled: {
    fr: { subject: "❌ Réservation annulée — {service_title}", title: "❌ Réservation annulée", body: "Votre réservation pour {service_title} (date : {service_date}) a été annulée.\n\nN'hésitez pas à nous contacter pour toute question." },
    en: { subject: "❌ Booking Cancelled — {service_title}", title: "❌ Booking Cancelled", body: "Your booking for {service_title} (date: {service_date}) has been cancelled.\n\nPlease contact us if you have any questions." },
    es: { subject: "❌ Reserva cancelada — {service_title}", title: "❌ Reserva cancelada", body: "Su reserva para {service_title} (fecha: {service_date}) ha sido cancelada.\n\nNo dude en contactarnos." },
    de: { subject: "❌ Buchung storniert — {service_title}", title: "❌ Buchung storniert", body: "Ihre Buchung für {service_title} (Datum: {service_date}) wurde storniert.\n\nKontaktieren Sie uns bei Fragen." },
    it: { subject: "❌ Prenotazione cancellata — {service_title}", title: "❌ Prenotazione cancellata", body: "La tua prenotazione per {service_title} (data: {service_date}) è stata cancellata.\n\nContattaci per domande." },
    pt: { subject: "❌ Reserva cancelada — {service_title}", title: "❌ Reserva cancelada", body: "Sua reserva para {service_title} (data: {service_date}) foi cancelada.\n\nEntre em contato conosco." },
  },
  marketplace_booking_completed: {
    fr: { subject: "🏁 Service terminé — {service_title}", title: "🏁 Service complété", body: "Votre réservation pour {service_title} est terminée.\n\nMerci de votre confiance ! Nous serions ravis de recevoir votre avis." },
    en: { subject: "🏁 Service Completed — {service_title}", title: "🏁 Service Completed", body: "Your booking for {service_title} is completed.\n\nThank you for your trust! We'd love to hear your feedback." },
    es: { subject: "🏁 Servicio completado — {service_title}", title: "🏁 Servicio completado", body: "Su reserva para {service_title} ha finalizado.\n\n¡Gracias por su confianza! Nos encantaría recibir su opinión." },
    de: { subject: "🏁 Service abgeschlossen — {service_title}", title: "🏁 Service abgeschlossen", body: "Ihre Buchung für {service_title} ist abgeschlossen.\n\nVielen Dank für Ihr Vertrauen! Wir freuen uns über Ihre Bewertung." },
    it: { subject: "🏁 Servizio completato — {service_title}", title: "🏁 Servizio completato", body: "La tua prenotazione per {service_title} è completata.\n\nGrazie per la fiducia! Ci piacerebbe ricevere il tuo feedback." },
    pt: { subject: "🏁 Serviço concluído — {service_title}", title: "🏁 Serviço concluído", body: "Sua reserva para {service_title} foi concluída.\n\nObrigado pela confiança! Adoraríamos receber sua avaliação." },
  },

  /* ─── Payment ─── */
  payment_link_sent: {
    fr: { subject: "💳 Lien de paiement — {service_title}", title: "💳 Demande de paiement", body: "Un paiement de {amount} est demandé pour {service_title}.\n\nCliquez ci-dessous pour procéder au paiement sécurisé." },
    en: { subject: "💳 Payment Link — {service_title}", title: "💳 Payment Request", body: "A payment of {amount} is requested for {service_title}.\n\nClick below to proceed with secure payment." },
    es: { subject: "💳 Enlace de pago — {service_title}", title: "💳 Solicitud de pago", body: "Se solicita un pago de {amount} por {service_title}.\n\nHaga clic abajo para proceder con el pago seguro." },
    de: { subject: "💳 Zahlungslink — {service_title}", title: "💳 Zahlungsanforderung", body: "Eine Zahlung von {amount} wird für {service_title} angefordert.\n\nKlicken Sie unten, um die sichere Zahlung durchzuführen." },
    it: { subject: "💳 Link di pagamento — {service_title}", title: "💳 Richiesta di pagamento", body: "Un pagamento di {amount} è richiesto per {service_title}.\n\nClicca qui sotto per procedere al pagamento sicuro." },
    pt: { subject: "💳 Link de pagamento — {service_title}", title: "💳 Solicitação de pagamento", body: "Um pagamento de {amount} é solicitado para {service_title}.\n\nClique abaixo para prosseguir com o pagamento seguro." },
  },
  booking_payment_received: {
    fr: { subject: "💰 Paiement confirmé — {service_title}", title: "💰 Paiement confirmé", body: "Le paiement de {amount} pour {service_title} a été confirmé. Merci !" },
    en: { subject: "💰 Payment Confirmed — {service_title}", title: "💰 Payment Confirmed", body: "Payment of {amount} for {service_title} has been confirmed. Thank you!" },
    es: { subject: "💰 Pago confirmado — {service_title}", title: "💰 Pago confirmado", body: "El pago de {amount} por {service_title} ha sido confirmado. ¡Gracias!" },
    de: { subject: "💰 Zahlung bestätigt — {service_title}", title: "💰 Zahlung bestätigt", body: "Die Zahlung von {amount} für {service_title} wurde bestätigt. Vielen Dank!" },
    it: { subject: "💰 Pagamento confermato — {service_title}", title: "💰 Pagamento confermato", body: "Il pagamento di {amount} per {service_title} è stato confermato. Grazie!" },
    pt: { subject: "💰 Pagamento confirmado — {service_title}", title: "💰 Pagamento confirmado", body: "O pagamento de {amount} por {service_title} foi confirmado. Obrigado!" },
  },
  invoice_generated: {
    fr: { subject: "📄 Facture générée — {service_title}", title: "📄 Facture disponible", body: "Votre facture pour {service_title} est disponible. Montant : {amount}." },
    en: { subject: "📄 Invoice Generated — {service_title}", title: "📄 Invoice Available", body: "Your invoice for {service_title} is available. Amount: {amount}." },
    es: { subject: "📄 Factura generada — {service_title}", title: "📄 Factura disponible", body: "Su factura para {service_title} está disponible. Monto: {amount}." },
    de: { subject: "📄 Rechnung erstellt — {service_title}", title: "📄 Rechnung verfügbar", body: "Ihre Rechnung für {service_title} ist verfügbar. Betrag: {amount}." },
    it: { subject: "📄 Fattura generata — {service_title}", title: "📄 Fattura disponibile", body: "La tua fattura per {service_title} è disponibile. Importo: {amount}." },
    pt: { subject: "📄 Fatura gerada — {service_title}", title: "📄 Fatura disponível", body: "Sua fatura para {service_title} está disponível. Valor: {amount}." },
  },

  /* ─── Generic / Communication Center ─── */
  marketplace_notification: {
    fr: { subject: "{subject}", title: "{subject}", body: "{message}" },
    en: { subject: "{subject}", title: "{subject}", body: "{message}" },
    es: { subject: "{subject}", title: "{subject}", body: "{message}" },
    de: { subject: "{subject}", title: "{subject}", body: "{message}" },
    it: { subject: "{subject}", title: "{subject}", body: "{message}" },
    pt: { subject: "{subject}", title: "{subject}", body: "{message}" },
  },
  account_alert: {
    fr: { subject: "Alerte compte — {message}", title: "🔔 Alerte compte", body: "{message}" },
    en: { subject: "Account Alert — {message}", title: "🔔 Account Alert", body: "{message}" },
    es: { subject: "Alerta de cuenta — {message}", title: "🔔 Alerta de cuenta", body: "{message}" },
    de: { subject: "Kontowarnung — {message}", title: "🔔 Kontowarnung", body: "{message}" },
    it: { subject: "Avviso account — {message}", title: "🔔 Avviso account", body: "{message}" },
    pt: { subject: "Alerta de conta — {message}", title: "🔔 Alerta de conta", body: "{message}" },
  },

  /* ─── Real Estate Leads ─── */
  real_estate_lead: {
    fr: { subject: "🏠 Nouvelle demande immobilière — {lead_name}", title: "🏠 Nouvelle demande immobilière", body: "{lead_name} est intéressé(e) par votre bien « {listing_title} » ({listing_type}).\n\n📧 Email : {lead_email}\n📱 Téléphone : {lead_phone}\n\n💬 Message : {lead_message}" },
    en: { subject: "🏠 New Property Inquiry — {lead_name}", title: "🏠 New Property Inquiry", body: "{lead_name} is interested in your property \"{listing_title}\" ({listing_type}).\n\n📧 Email: {lead_email}\n📱 Phone: {lead_phone}\n\n💬 Message: {lead_message}" },
    es: { subject: "🏠 Nueva consulta inmobiliaria — {lead_name}", title: "🏠 Nueva consulta inmobiliaria", body: "{lead_name} está interesado/a en su propiedad \"{listing_title}\" ({listing_type}).\n\n📧 Email: {lead_email}\n📱 Teléfono: {lead_phone}\n\n💬 Mensaje: {lead_message}" },
    de: { subject: "🏠 Neue Immobilienanfrage — {lead_name}", title: "🏠 Neue Immobilienanfrage", body: "{lead_name} interessiert sich für Ihre Immobilie \"{listing_title}\" ({listing_type}).\n\n📧 E-Mail: {lead_email}\n📱 Telefon: {lead_phone}\n\n💬 Nachricht: {lead_message}" },
    it: { subject: "🏠 Nuova richiesta immobiliare — {lead_name}", title: "🏠 Nuova richiesta immobiliare", body: "{lead_name} è interessato/a al tuo immobile \"{listing_title}\" ({listing_type}).\n\n📧 Email: {lead_email}\n📱 Telefono: {lead_phone}\n\n💬 Messaggio: {lead_message}" },
    pt: { subject: "🏠 Nova consulta imobiliária — {lead_name}", title: "🏠 Nova consulta imobiliária", body: "{lead_name} está interessado(a) no seu imóvel \"{listing_title}\" ({listing_type}).\n\n📧 Email: {lead_email}\n📱 Telefone: {lead_phone}\n\n💬 Mensagem: {lead_message}" },
  },
};

/* ── Backwards compatibility aliases for old event_type names ── */
const EVENT_TYPE_ALIASES: Record<string, string> = {
  payment_received: "rent_payment_received",
  booking_confirmed: "seasonal_booking_confirmed",
  booking_cancelled: "seasonal_booking_cancelled",
  booking_created: "marketplace_booking_created",
  booking_completed: "marketplace_booking_completed",
};

function interpolate(text: string, data: Record<string, any>): string {
  return text.replace(/\{(\w+)\}/g, (_, key) => {
    const val = data[key];
    return val !== undefined && val !== null && val !== "" ? String(val) : "";
  });
}

function sanitizeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
    .replace(/on\w+\s*=/gi, "")
    .replace(/javascript:/gi, "");
}

function safeUrl(url: string | undefined): string | undefined {
  if (!url) return undefined;
  try {
    const parsed = new URL(url);
    if (!["https:", "http:"].includes(parsed.protocol)) return undefined;
    return parsed.href;
  } catch { return undefined; }
}

function buildHtml(title: string, body: string, ctaUrl?: string, ctaLabel?: string, locale?: string, detailsHtml?: string): string {
  const safeTitle = sanitizeHtml(title);
  const safeBody = sanitizeHtml(body).replace(/\n/g, "<br>");
  const lang = locale || "fr";

  const footerTexts: Record<string, string> = {
    fr: "Cet email est envoyé automatiquement par Easy-Locs®. Vous pouvez répondre directement à cet email.",
    en: "This email was sent automatically by Easy-Locs®. You can reply directly to this email.",
    es: "Este correo fue enviado automáticamente por Easy-Locs®. Puede responder directamente.",
    de: "Diese E-Mail wurde automatisch von Easy-Locs® gesendet. Sie können direkt antworten.",
    it: "Questa email è stata inviata automaticamente da Easy-Locs®. Puoi rispondere direttamente.",
    pt: "Este email foi enviado automaticamente pelo Easy-Locs®. Você pode responder diretamente.",
    ar: "تم إرسال هذا البريد الإلكتروني تلقائيًا بواسطة Easy-Locs®. يمكنك الرد مباشرة.",
    ja: "このメールはEasy-Locs®から自動送信されました。直接返信できます。",
    tr: "Bu e-posta Easy-Locs® tarafından otomatik olarak gönderilmiştir. Doğrudan yanıtlayabilirsiniz.",
    nl: "Deze e-mail is automatisch verzonden door Easy-Locs®. U kunt direct antwoorden.",
    pl: "Ten e-mail został wysłany automatycznie przez Easy-Locs®. Możesz odpowiedzieć bezpośrednio.",
  };
  const ctaTexts: Record<string, string> = {
    fr: "Accéder à mon espace", en: "Go to my dashboard", es: "Acceder a mi espacio",
    de: "Zum Dashboard", it: "Vai alla dashboard", pt: "Acessar painel",
  };
  const footer = footerTexts[lang] || footerTexts.en;
  const defaultCta = ctaTexts[lang] || ctaTexts.en;

  const detailsBlock = detailsHtml ? `
    <table role="presentation" style="width:100%;border-collapse:collapse;margin:20px 0;background:#f8f6f1;border-radius:8px;overflow:hidden;">
      ${detailsHtml}
    </table>` : "";

  return `<!DOCTYPE html>
<html lang="${lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>
body{margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',sans-serif;background:#f0ede8;-webkit-font-smoothing:antialiased}
.wrapper{max-width:600px;margin:0 auto;padding:24px 16px}
.card{background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06)}
.header{background:linear-gradient(135deg,#1a1a2e 0%,#16213e 100%);padding:40px 32px 32px;text-align:center}
.brand{color:#c9a84c;font-size:13px;font-weight:800;letter-spacing:2px;margin-bottom:12px;text-transform:uppercase}
.header h1{color:#ffffff;font-size:22px;font-weight:700;margin:0;line-height:1.3}
.body-content{padding:32px 32px 24px}
.body-content p{color:#2d2d2d;font-size:15px;line-height:1.7;margin:0 0 16px}
.highlight-box{background:#f8f6f1;border-left:4px solid #c9a84c;border-radius:0 8px 8px 0;padding:16px 20px;margin:20px 0}
.highlight-box p{margin:0;color:#333;font-size:14px;line-height:1.6}
.cta-wrapper{text-align:center;padding:8px 0 16px}
.cta-btn{display:inline-block;background:linear-gradient(135deg,#c9a84c 0%,#b8963f 100%);color:#1a1a2e !important;font-weight:700;padding:14px 36px;border-radius:10px;text-decoration:none;font-size:15px;letter-spacing:0.3px;box-shadow:0 4px 12px rgba(201,168,76,0.3)}
.footer{padding:24px 32px;text-align:center;border-top:1px solid #eee}
.footer p{color:#999;font-size:11px;line-height:1.5;margin:0}
.footer .brand-sm{color:#c9a84c;font-weight:700;font-size:11px}
@media(prefers-color-scheme:dark){
  body{background:#1a1a2e !important}
  .card{background:#1e1e2e !important;box-shadow:0 4px 24px rgba(0,0,0,0.4) !important}
  .body-content p{color:#e0e0e0 !important}
  .highlight-box{background:#252540 !important;border-left-color:#c9a84c !important}
  .highlight-box p{color:#d0d0d0 !important}
  .footer{border-top-color:#333 !important}
}
</style></head>
<body>
<div class="wrapper"><div class="card">
<div class="header"><div class="brand">EASY-LOCS®</div><h1>${safeTitle}</h1></div>
<div class="body-content">
<div class="highlight-box"><p>${safeBody}</p></div>
${detailsBlock}
${ctaUrl ? `<div class="cta-wrapper"><a href="${ctaUrl}" class="cta-btn">${sanitizeHtml(ctaLabel || defaultCta)}</a></div>` : ""}
</div>
<div class="footer"><p class="brand-sm">EASY-LOCS®</p><p>${footer}</p></div>
</div></div>
</body></html>`;
}

/** Build HTML detail rows for booking info */
function buildDetailsHtml(data: Record<string, any>, locale: string): string {
  const labels: Record<string, Record<string, string>> = {
    fr: { ref: "Réf.", service: "Service", date: "Date", amount: "Montant", property: "Bien", guest: "Client" },
    en: { ref: "Ref.", service: "Service", date: "Date", amount: "Amount", property: "Property", guest: "Client" },
    es: { ref: "Ref.", service: "Servicio", date: "Fecha", amount: "Monto", property: "Propiedad", guest: "Cliente" },
    de: { ref: "Ref.", service: "Service", date: "Datum", amount: "Betrag", property: "Objekt", guest: "Kunde" },
    it: { ref: "Rif.", service: "Servizio", date: "Data", amount: "Importo", property: "Proprietà", guest: "Cliente" },
    pt: { ref: "Ref.", service: "Serviço", date: "Data", amount: "Valor", property: "Imóvel", guest: "Cliente" },
  };
  const l = labels[locale] || labels.en;
  const rows: string[] = [];
  const addRow = (label: string, value: string | undefined) => {
    if (value) rows.push(`<tr><td style="padding:10px 16px;color:#888;font-size:13px;border-bottom:1px solid #eee;width:35%">${sanitizeHtml(label)}</td><td style="padding:10px 16px;font-size:13px;color:#333;border-bottom:1px solid #eee;font-weight:500">${sanitizeHtml(value)}</td></tr>`);
  };
  addRow(l.ref, data.booking_id?.toString()?.slice(0, 8));
  addRow(l.service, data.service_title);
  addRow(l.date, data.service_date || data.check_in);
  addRow(l.amount, data.total_price ? `${data.total_price} ${data.currency || "EUR"}` : data.amount);
  addRow(l.property, data.property);
  addRow(l.guest, data.booker_name || data.guest_name);
  return rows.join("");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "");
    const isInternalCall = INTERNAL_SECRET !== "" && token !== "" && token === INTERNAL_SECRET;

    if (!isInternalCall) {
      if (!authHeader.startsWith("Bearer ")) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: { user: callerUser }, error: userErr } = await userClient.auth.getUser();
      if (userErr || !callerUser) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      (req as any).__callerId = callerUser.id;
    }

    const { event_type: rawEventType, recipient_email: rawRecipientEmail, recipient_name, data, locale = "fr" } = await req.json() as EmailRequest;

    // Resolve aliases for backwards compat
    const event_type = EVENT_TYPE_ALIASES[rawEventType] || rawEventType;

    if (!isInternalCall) {
      const resolvedOrgId = data?.org_id;
      if (!resolvedOrgId) {
        return new Response(JSON.stringify({ error: "org_id is required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      const { data: membership } = await supabaseAdmin
        .from("org_members").select("id")
        .eq("user_id", (req as any).__callerId).eq("org_id", resolvedOrgId)
        .maybeSingle();
      if (!membership) {
        return new Response(JSON.stringify({ error: "Forbidden: not an org member" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Fallback: if recipient_email is empty but org_id is provided, resolve from org owner profile
    let recipient_email = rawRecipientEmail;
    if (!recipient_email && data?.org_id) {
      const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      const { data: org } = await supabaseAdmin
        .from("orgs").select("owner_user_id, email")
        .eq("id", data.org_id).maybeSingle();
      if (org?.email) {
        recipient_email = org.email;
      } else if (org?.owner_user_id) {
        const { data: profile } = await supabaseAdmin
          .from("profiles").select("email")
          .eq("id", org.owner_user_id).maybeSingle();
        if (profile?.email) recipient_email = profile.email;
      }
    }

    if (!event_type || !recipient_email) {
      return new Response(JSON.stringify({ error: "Missing event_type or recipient_email" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const templateGroup = TEMPLATES[event_type];
    if (!templateGroup) {
      return new Response(JSON.stringify({ error: `Unknown event_type: ${event_type}` }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if we have a native template for this locale
    const hasNativeTemplate = !!templateGroup[locale];
    const template = templateGroup[locale] || templateGroup["en"] || templateGroup["fr"];
    let subject = interpolate(template.subject, data);
    let title = interpolate(template.title, data);
    let body = interpolate(template.body, data);

    // Dynamic AI translation for unsupported locales (e.g., Thai, Vietnamese, Hindi, Russian...)
    if (!hasNativeTemplate && locale !== "en" && locale !== "fr") {
      const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
      if (LOVABLE_API_KEY) {
        const LOCALE_NAMES: Record<string, string> = {
          th: "Thai", vi: "Vietnamese", hi: "Hindi", ru: "Russian", ko: "Korean",
          ja: "Japanese", zh: "Chinese", ar: "Arabic", tr: "Turkish", id: "Indonesian",
          ms: "Malay", sv: "Swedish", da: "Danish", fi: "Finnish", el: "Greek",
          cs: "Czech", hu: "Hungarian", ro: "Romanian", hr: "Croatian", bg: "Bulgarian",
          sk: "Slovak", uk: "Ukrainian", he: "Hebrew", fa: "Persian", ur: "Urdu",
          bn: "Bengali", ta: "Tamil", sw: "Swahili", am: "Amharic", ka: "Georgian",
          km: "Khmer", lo: "Lao", my: "Burmese", ne: "Nepali", si: "Sinhala",
          mn: "Mongolian", kk: "Kazakh", uz: "Uzbek", tl: "Filipino", af: "Afrikaans",
        };
        const targetLang = LOCALE_NAMES[locale] || locale;
        try {
          const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${LOVABLE_API_KEY}` },
            body: JSON.stringify({
              model: "google/gemini-2.5-flash-lite",
              messages: [
                { role: "system", content: `Translate the following email content to ${targetLang}. Return a JSON object with keys: "subject", "title", "body". Keep the same formatting, emojis, and tone. Return ONLY the JSON.` },
                { role: "user", content: JSON.stringify({ subject, title, body }) },
              ],
              max_tokens: 2000, temperature: 0.1,
            }),
          });
          if (aiRes.ok) {
            const aiData = await aiRes.json();
            const content = aiData.choices?.[0]?.message?.content?.trim() || "";
            // Parse JSON from AI response (may have markdown code fence)
            const jsonStr = content.replace(/^```json?\n?/i, "").replace(/\n?```$/i, "").trim();
            try {
              const parsed = JSON.parse(jsonStr);
              if (parsed.subject) subject = parsed.subject;
              if (parsed.title) title = parsed.title;
              if (parsed.body) body = parsed.body;
              console.log(`[send-notification-email] AI translated to ${targetLang}`);
            } catch { console.warn("[send-notification-email] AI translation parse failed"); }
          }
        } catch (e) { console.error("[send-notification-email] AI translation error:", e); }
      }
    }

    const ctaUrl = safeUrl(data.cta_url);
    const ctaLabel = data.cta_label || undefined;
    const detailsHtml = buildDetailsHtml(data, locale);
    const html = buildHtml(title, body, ctaUrl, ctaLabel, locale, detailsHtml);

    if (!SENDGRID_API_KEY) {
      console.log("[send-notification-email] No SendGrid key, logging email:", { to: recipient_email, subject });
      return new Response(JSON.stringify({ success: true, mode: "dry_run", subject }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sgRes = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SENDGRID_API_KEY}`,
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: recipient_email, name: recipient_name || "" }] }],
        from: { email: "noreply@easy-locs.com", name: "Easy-Locs" },
        subject,
        content: [{ type: "text/html", value: html }],
      }),
    });

    if (!sgRes.ok) {
      const errText = await sgRes.text();
      console.error("[send-notification-email] SendGrid error:", errText);
      return new Response(JSON.stringify({ error: "Email send failed" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    await supabaseAdmin.from("audit_logs").insert({
      action: `email_sent:${event_type}`,
      metadata_json: { recipient_email, subject, locale },
    });

    return new Response(JSON.stringify({ success: true, subject }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[send-notification-email] Error:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
