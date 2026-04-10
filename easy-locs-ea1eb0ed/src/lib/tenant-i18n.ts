/**
 * Tenant-portal-specific translations indexed by locale group.
 * The locale group is derived from the property's country code.
 */

export interface TenantLabels {
  // Documents page
  docsTitle: string;
  docsSubtitle: string;
  sendDocument: string;
  docTypeId: string;
  docTypeInsurance: string;
  docTypeIncome: string;
  docTypeTax: string;
  docTypeOther: string;
  uploading: string;
  chooseFile: string;
  docSent: string;
  docSentDesc: string;
  noDocSent: string;
  statusApproved: string;
  statusRejected: string;
  statusPending: string;
  // Requests page
  requestsTitle: string;
  requestsSubtitle: string;
  periodLabel: string;
  requestReceipt: string;
  requestReceiptDesc: string;
  requestAttestation: string;
  requestAttestationDesc: string;
  requestLeaseCopy: string;
  requestLeaseCopyDesc: string;
  requestCharges: string;
  requestChargesDesc: string;
  requestSent: string;
  requestSentDesc: string;
  history: string;
  noRequest: string;
  statusResolved: string;
  // Messages page
  messagesTitle: string;
  messagesSubtitle: string;
  noMessage: string;
  yourMessage: string;
  // Settings page
  settingsTitle: string;
  nameLabel: string;
  mySignature: string;
  signatureDesc: string;
  savedSignature: string;
  profileUpdated: string;
  // Common
  error: string;
  openDoc: string;
  docPathError: string;
  linkUnavailable: string;
  cannotOpenDoc: string;
}

const fr: TenantLabels = {
  docsTitle: "Mes documents",
  docsSubtitle: "Envoyez vos justificatifs à votre bailleur.",
  sendDocument: "Envoyer un document",
  docTypeId: "Pièce d'identité",
  docTypeInsurance: "Attestation d'assurance habitation",
  docTypeIncome: "Justificatif de revenus",
  docTypeTax: "Avis d'imposition",
  docTypeOther: "Autre document",
  uploading: "Envoi...",
  chooseFile: "Choisir un fichier",
  docSent: "Document envoyé",
  docSentDesc: "Votre bailleur sera notifié.",
  noDocSent: "Aucun document envoyé.",
  statusApproved: "Validé",
  statusRejected: "Refusé",
  statusPending: "En attente",
  requestsTitle: "Demandes de documents",
  requestsSubtitle: "Faites une demande rapide à votre bailleur.",
  periodLabel: "Période concernée (optionnel)",
  requestReceipt: "Quittance de loyer",
  requestReceiptDesc: "Demander une quittance pour un mois donné",
  requestAttestation: "Attestation de loyer",
  requestAttestationDesc: "Pour vos démarches administratives (CAF, etc.)",
  requestLeaseCopy: "Copie du bail",
  requestLeaseCopyDesc: "Obtenir une copie de votre contrat de location",
  requestCharges: "Détail des charges",
  requestChargesDesc: "Demander le décompte détaillé des charges",
  requestSent: "Demande envoyée",
  requestSentDesc: "Votre bailleur a été notifié.",
  history: "Historique",
  noRequest: "Aucune demande effectuée.",
  statusResolved: "Traité",
  messagesTitle: "Messages",
  messagesSubtitle: "Échangez avec votre bailleur.",
  noMessage: "Aucun message. Envoyez le premier !",
  yourMessage: "Votre message...",
  settingsTitle: "Paramètres",
  nameLabel: "Nom",
  mySignature: "Ma signature",
  signatureDesc: "Votre signature sera automatiquement utilisée sur les documents que vous signez.",
  savedSignature: "Signature enregistrée",
  profileUpdated: "Profil mis à jour",
  error: "Erreur",
  openDoc: "Ouvrir le document",
  docPathError: "Chemin du document introuvable.",
  linkUnavailable: "Lien sécurisé indisponible",
  cannotOpenDoc: "Impossible d'ouvrir le document",
};

const en: TenantLabels = {
  docsTitle: "My documents",
  docsSubtitle: "Send your supporting documents to your landlord.",
  sendDocument: "Send a document",
  docTypeId: "ID document",
  docTypeInsurance: "Home insurance certificate",
  docTypeIncome: "Proof of income",
  docTypeTax: "Tax notice",
  docTypeOther: "Other document",
  uploading: "Uploading...",
  chooseFile: "Choose a file",
  docSent: "Document sent",
  docSentDesc: "Your landlord will be notified.",
  noDocSent: "No documents sent.",
  statusApproved: "Approved",
  statusRejected: "Rejected",
  statusPending: "Pending",
  requestsTitle: "Document requests",
  requestsSubtitle: "Send a quick request to your landlord.",
  periodLabel: "Period (optional)",
  requestReceipt: "Rent receipt",
  requestReceiptDesc: "Request a receipt for a specific month",
  requestAttestation: "Rent attestation",
  requestAttestationDesc: "For administrative purposes",
  requestLeaseCopy: "Lease copy",
  requestLeaseCopyDesc: "Get a copy of your rental agreement",
  requestCharges: "Charges breakdown",
  requestChargesDesc: "Request a detailed charges statement",
  requestSent: "Request sent",
  requestSentDesc: "Your landlord has been notified.",
  history: "History",
  noRequest: "No requests made.",
  statusResolved: "Resolved",
  messagesTitle: "Messages",
  messagesSubtitle: "Chat with your landlord.",
  noMessage: "No messages. Send the first one!",
  yourMessage: "Your message...",
  settingsTitle: "Settings",
  nameLabel: "Name",
  mySignature: "My signature",
  signatureDesc: "Your signature will be used automatically on documents you sign.",
  savedSignature: "Saved signature",
  profileUpdated: "Profile updated",
  error: "Error",
  openDoc: "Open document",
  docPathError: "Document path not found.",
  linkUnavailable: "Secure link unavailable",
  cannotOpenDoc: "Cannot open document",
};

const es: TenantLabels = {
  docsTitle: "Mis documentos",
  docsSubtitle: "Envíe sus justificantes a su arrendador.",
  sendDocument: "Enviar un documento",
  docTypeId: "Documento de identidad",
  docTypeInsurance: "Certificado de seguro del hogar",
  docTypeIncome: "Justificante de ingresos",
  docTypeTax: "Declaración fiscal",
  docTypeOther: "Otro documento",
  uploading: "Enviando...",
  chooseFile: "Elegir un archivo",
  docSent: "Documento enviado",
  docSentDesc: "Su arrendador será notificado.",
  noDocSent: "Ningún documento enviado.",
  statusApproved: "Aprobado",
  statusRejected: "Rechazado",
  statusPending: "Pendiente",
  requestsTitle: "Solicitudes de documentos",
  requestsSubtitle: "Haga una solicitud rápida a su arrendador.",
  periodLabel: "Período (opcional)",
  requestReceipt: "Recibo de alquiler",
  requestReceiptDesc: "Solicitar un recibo para un mes específico",
  requestAttestation: "Certificado de alquiler",
  requestAttestationDesc: "Para trámites administrativos",
  requestLeaseCopy: "Copia del contrato",
  requestLeaseCopyDesc: "Obtener una copia de su contrato de arrendamiento",
  requestCharges: "Desglose de gastos",
  requestChargesDesc: "Solicitar un desglose detallado de los gastos",
  requestSent: "Solicitud enviada",
  requestSentDesc: "Su arrendador ha sido notificado.",
  history: "Historial",
  noRequest: "Ninguna solicitud realizada.",
  statusResolved: "Resuelta",
  messagesTitle: "Mensajes",
  messagesSubtitle: "Comuníquese con su arrendador.",
  noMessage: "Sin mensajes. ¡Envíe el primero!",
  yourMessage: "Su mensaje...",
  settingsTitle: "Ajustes",
  nameLabel: "Nombre",
  mySignature: "Mi firma",
  signatureDesc: "Su firma se utilizará automáticamente en los documentos que firme.",
  savedSignature: "Firma guardada",
  profileUpdated: "Perfil actualizado",
  error: "Error",
  openDoc: "Abrir documento",
  docPathError: "Ruta del documento no encontrada.",
  linkUnavailable: "Enlace seguro no disponible",
  cannotOpenDoc: "No se puede abrir el documento",
};

const de: TenantLabels = {
  docsTitle: "Meine Dokumente",
  docsSubtitle: "Senden Sie Ihre Nachweise an Ihren Vermieter.",
  sendDocument: "Dokument senden",
  docTypeId: "Ausweisdokument",
  docTypeInsurance: "Wohngebäudeversicherung",
  docTypeIncome: "Einkommensnachweis",
  docTypeTax: "Steuerbescheid",
  docTypeOther: "Anderes Dokument",
  uploading: "Wird hochgeladen...",
  chooseFile: "Datei auswählen",
  docSent: "Dokument gesendet",
  docSentDesc: "Ihr Vermieter wird benachrichtigt.",
  noDocSent: "Keine Dokumente gesendet.",
  statusApproved: "Genehmigt",
  statusRejected: "Abgelehnt",
  statusPending: "Ausstehend",
  requestsTitle: "Dokumentenanfragen",
  requestsSubtitle: "Stellen Sie eine schnelle Anfrage an Ihren Vermieter.",
  periodLabel: "Zeitraum (optional)",
  requestReceipt: "Mietquittung",
  requestReceiptDesc: "Quittung für einen bestimmten Monat anfordern",
  requestAttestation: "Mietbescheinigung",
  requestAttestationDesc: "Für behördliche Zwecke",
  requestLeaseCopy: "Vertragskopie",
  requestLeaseCopyDesc: "Kopie Ihres Mietvertrags erhalten",
  requestCharges: "Nebenkostenabrechnung",
  requestChargesDesc: "Detaillierte Nebenkostenabrechnung anfordern",
  requestSent: "Anfrage gesendet",
  requestSentDesc: "Ihr Vermieter wurde benachrichtigt.",
  history: "Verlauf",
  noRequest: "Keine Anfragen gestellt.",
  statusResolved: "Erledigt",
  messagesTitle: "Nachrichten",
  messagesSubtitle: "Kommunizieren Sie mit Ihrem Vermieter.",
  noMessage: "Keine Nachrichten. Senden Sie die erste!",
  yourMessage: "Ihre Nachricht...",
  settingsTitle: "Einstellungen",
  nameLabel: "Name",
  mySignature: "Meine Unterschrift",
  signatureDesc: "Ihre Unterschrift wird automatisch auf Dokumenten verwendet, die Sie unterschreiben.",
  savedSignature: "Gespeicherte Unterschrift",
  profileUpdated: "Profil aktualisiert",
  error: "Fehler",
  openDoc: "Dokument öffnen",
  docPathError: "Dokumentpfad nicht gefunden.",
  linkUnavailable: "Sicherer Link nicht verfügbar",
  cannotOpenDoc: "Dokument kann nicht geöffnet werden",
};

const it: TenantLabels = {
  docsTitle: "I miei documenti",
  docsSubtitle: "Invii i suoi documenti giustificativi al proprietario.",
  sendDocument: "Inviare un documento",
  docTypeId: "Documento d'identità",
  docTypeInsurance: "Certificato assicurazione abitazione",
  docTypeIncome: "Giustificativo di reddito",
  docTypeTax: "Avviso fiscale",
  docTypeOther: "Altro documento",
  uploading: "Invio...",
  chooseFile: "Scegliere un file",
  docSent: "Documento inviato",
  docSentDesc: "Il proprietario sarà notificato.",
  noDocSent: "Nessun documento inviato.",
  statusApproved: "Approvato",
  statusRejected: "Rifiutato",
  statusPending: "In attesa",
  requestsTitle: "Richieste di documenti",
  requestsSubtitle: "Invii una richiesta rapida al proprietario.",
  periodLabel: "Periodo (opzionale)",
  requestReceipt: "Ricevuta d'affitto",
  requestReceiptDesc: "Richiedere una ricevuta per un mese specifico",
  requestAttestation: "Attestazione d'affitto",
  requestAttestationDesc: "Per pratiche amministrative",
  requestLeaseCopy: "Copia del contratto",
  requestLeaseCopyDesc: "Ottenere una copia del contratto di locazione",
  requestCharges: "Dettaglio spese",
  requestChargesDesc: "Richiedere un dettaglio delle spese",
  requestSent: "Richiesta inviata",
  requestSentDesc: "Il proprietario è stato notificato.",
  history: "Cronologia",
  noRequest: "Nessuna richiesta effettuata.",
  statusResolved: "Risolta",
  messagesTitle: "Messaggi",
  messagesSubtitle: "Comunichi con il proprietario.",
  noMessage: "Nessun messaggio. Invii il primo!",
  yourMessage: "Il suo messaggio...",
  settingsTitle: "Impostazioni",
  nameLabel: "Nome",
  mySignature: "La mia firma",
  signatureDesc: "La sua firma sarà usata automaticamente sui documenti che firma.",
  savedSignature: "Firma salvata",
  profileUpdated: "Profilo aggiornato",
  error: "Errore",
  openDoc: "Aprire documento",
  docPathError: "Percorso del documento non trovato.",
  linkUnavailable: "Link sicuro non disponibile",
  cannotOpenDoc: "Impossibile aprire il documento",
};

const pt: TenantLabels = {
  docsTitle: "Meus documentos",
  docsSubtitle: "Envie os seus documentos ao senhorio.",
  sendDocument: "Enviar um documento",
  docTypeId: "Documento de identidade",
  docTypeInsurance: "Certificado de seguro habitação",
  docTypeIncome: "Comprovativo de rendimentos",
  docTypeTax: "Declaração fiscal",
  docTypeOther: "Outro documento",
  uploading: "A enviar...",
  chooseFile: "Escolher ficheiro",
  docSent: "Documento enviado",
  docSentDesc: "O seu senhorio será notificado.",
  noDocSent: "Nenhum documento enviado.",
  statusApproved: "Aprovado",
  statusRejected: "Rejeitado",
  statusPending: "Pendente",
  requestsTitle: "Pedidos de documentos",
  requestsSubtitle: "Faça um pedido rápido ao seu senhorio.",
  periodLabel: "Período (opcional)",
  requestReceipt: "Recibo de renda",
  requestReceiptDesc: "Solicitar um recibo para um mês específico",
  requestAttestation: "Atestado de arrendamento",
  requestAttestationDesc: "Para procedimentos administrativos",
  requestLeaseCopy: "Cópia do contrato",
  requestLeaseCopyDesc: "Obter uma cópia do seu contrato de arrendamento",
  requestCharges: "Detalhe de encargos",
  requestChargesDesc: "Solicitar um detalhe dos encargos",
  requestSent: "Pedido enviado",
  requestSentDesc: "O seu senhorio foi notificado.",
  history: "Histórico",
  noRequest: "Nenhum pedido efetuado.",
  statusResolved: "Resolvido",
  messagesTitle: "Mensagens",
  messagesSubtitle: "Comunique com o seu senhorio.",
  noMessage: "Sem mensagens. Envie a primeira!",
  yourMessage: "A sua mensagem...",
  settingsTitle: "Definições",
  nameLabel: "Nome",
  mySignature: "A minha assinatura",
  signatureDesc: "A sua assinatura será usada automaticamente nos documentos que assinar.",
  savedSignature: "Assinatura guardada",
  profileUpdated: "Perfil atualizado",
  error: "Erro",
  openDoc: "Abrir documento",
  docPathError: "Caminho do documento não encontrado.",
  linkUnavailable: "Link seguro indisponível",
  cannotOpenDoc: "Não é possível abrir o documento",
};

const labelsMap: Record<string, TenantLabels> = { fr, en, es, de, it, pt };

/**
 * Get the locale group for a country code (same logic as country-config).
 */
function getLocaleGroup(country: string): string {
  const frGroup = ["FR", "BE", "CH", "LU", "MC", "SN", "CI", "MA", "TN"];
  const esGroup = ["ES", "MX", "AR", "CL", "CO", "PE"];
  const deGroup = ["DE", "AT"];
  const itGroup = ["IT"];
  const ptGroup = ["PT", "BR"];
  if (frGroup.includes(country)) return "fr";
  if (esGroup.includes(country)) return "es";
  if (deGroup.includes(country)) return "de";
  if (itGroup.includes(country)) return "it";
  if (ptGroup.includes(country)) return "pt";
  return "en";
}

export function getTenantLabels(country: string): TenantLabels {
  return labelsMap[getLocaleGroup(country)] || labelsMap.en;
}
