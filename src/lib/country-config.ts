/**
 * Country-specific configuration for property management forms.
 * Adapts labels, property types, heating types, lease types,
 * currency formatting, and postal code lookup per country.
 */

export interface CountryConfig {
  code: string;
  currency: string;
  currencySymbol: string;
  locale: string;
  propertyTypes: { value: string; label: string }[];
  heatingTypes: { value: string; label: string }[];
  leaseTypes: { value: string; label: string }[];
  labels: {
    property: string;
    properties: string;
    tenant: string;
    tenants: string;
    rent: string;
    charges: string;
    deposit: string;
    furnished: string;
    leaseStart: string;
    leaseEnd: string;
    leaseType: string;
    surface: string;
    rooms: string;
    floor: string;
    heating: string;
    propertyName: string;
    propertyType: string;
    postalCode: string;
    city: string;
    address: string;
    building: string;
    lotNumber: string;
    notes: string;
    guarantor: string;
    guarantorPhone: string;
    nationality: string;
    profession: string;
    birthDate: string;
    birthPlace: string;
    fullName: string;
    email: string;
    phone: string;
    selectProperty: string;
    addProperty: string;
    addTenant: string;
    editProperty: string;
    editTenant: string;
    save: string;
    active: string;
    terminated: string;
    all: string;
    paid: string;
    unpaid: string;
    overview: string;
    payments: string;
    inventory: string;
    rentTracking: string;
    monthCalls: string;
    allProperties: string;
    noProperty: string;
    noTenant: string;
    rentalManagement: string;
    rentalDesc: string;
    occupied: string;
    revenueMonth: string;
    unpaidCount: string;
    vacant: string;
    quickActions: string;
    generateReceipt: string;
    housingBenefit: string;
    totalExpenses: string;
    inventoryReports: string;
    noPayment: string;
    noExpense: string;
    noInventory: string;
    noFurniture: string;
    paymentHistory: string;
    noExchange: string;
    assignTenant: string;
    assignExisting: string;
    searchTenant: string;
    noUnassigned: string;
    createNewTenant: string;
    connected: string;
    invite: string;
    sending: string;
    noActiveLease: string;
    allLeasesActive: string;
    addFirstTenant: string;
    addFirstProperty: string;
    noPropertyTitle: string;
    individualProperties: string;
    lots: string;
    month: string;
    status: string;
    markPaid: string;
    online: string;
    transfer: string;
    cash: string;
    cancel: string;
    validateReceipt: string;
    accessible: string;
    calls: string;
    entryInventory: string;
    exitInventory: string;
    roomByRoom: string;
    compareEntry: string;
    entry: string;
    exit: string;
    draft: string;
    completed: string;
    tenant_label: string;
    perMonth: string;
    country: string;
    vacantAssign: string;
    unpaidN: string;
    rooms_suffix: string;
    terminated_label: string;
    generateDoc: string;
    writeMessage: string;
    tenantSpace: string;
    myReceipts: string;
    myDocuments: string;
    messagesNav: string;
    payRent: string;
    settingsNav: string;
    logoutNav: string;
    welcomeTenant: string;
    tenantSpaceDesc: string;
    myRent: string;
    myCharges: string;
    myLease: string;
    noLinkedProperty: string;
    noLinkedPropertyDesc: string;
    send: string;
    downloadReceipts: string;
    noReceipt: string;
    receiptDownloadError: string;
    noRentCall: string;
    // Email / notification templates
    emailNewMsgFromTenant: string;
    emailNewMsgFromLandlord: string;
    emailNewMsgSubjectFromTenant: string;
    emailNewMsgSubjectFromLandlord: string;
    emailReplyInApp: string;
    emailAutoSent: string;
    emailHello: string;
    emailYouReceivedMsg: string;
    emailTenantSentMsg: string;
    notifNewMsgTenant: string;
    notifNewMsgLandlord: string;
    notifTenantSentMsg: string;
    notifLandlordSentMsg: string;
    // Invitation
    inviteSubject: string;
    inviteTitle: string;
    inviteBody: string;
    inviteButton: string;
    inviteLinkExpiry: string;
  };
  defaultNationality: string;
  surfaceUnit: string;
}

const frLabels = {
  property: "Bien", properties: "Biens", tenant: "Locataire", tenants: "Locataires",
  rent: "Loyer", charges: "Charges", deposit: "Dépôt de garantie", furnished: "Meublé",
  leaseStart: "Début du bail", leaseEnd: "Fin du bail", leaseType: "Type de bail",
  surface: "Surface", rooms: "Pièces", floor: "Étage", heating: "Chauffage",
  propertyName: "Nom du bien", propertyType: "Type", postalCode: "Code postal", city: "Ville",
  address: "Adresse", building: "Immeuble / Résidence", lotNumber: "N° de lot", notes: "Notes",
  guarantor: "Nom du garant", guarantorPhone: "Tél. du garant", nationality: "Nationalité",
  profession: "Profession", birthDate: "Date de naissance", birthPlace: "Lieu de naissance",
  fullName: "Nom complet", email: "Email", phone: "Téléphone",
  selectProperty: "— Sélectionner un bien —", addProperty: "Ajouter le bien", addTenant: "Ajouter le locataire",
  editProperty: "Modifier le bien", editTenant: "Modifier le locataire", save: "Enregistrer",
  active: "Actif", terminated: "Résilié", all: "Tous", paid: "Payé", unpaid: "Impayé",
  overview: "Vue d'ensemble", payments: "Loyers & Paiements", inventory: "États des lieux",
  rentTracking: "Suivi des loyers", monthCalls: "Appels du mois", allProperties: "Tous les biens",
  noProperty: "Aucun bien", noTenant: "Aucun locataire",
  rentalManagement: "Gestion locative", rentalDesc: "Biens, locataires, baux, quittances, paiements — tout au même endroit.",
  occupied: "Occupés", revenueMonth: "Revenus/mois", unpaidCount: "Impayés", vacant: "vacant",
  quickActions: "Actions rapides", generateReceipt: "Générer une quittance",
  housingBenefit: "APL / CAF",
  totalExpenses: "Dépenses totales", inventoryReports: "États des lieux",
  noPayment: "Aucun paiement.", noExpense: "Aucune dépense enregistrée.",
  noInventory: "Aucun état des lieux.", noFurniture: "Aucun meuble enregistré.",
  paymentHistory: "Historique des paiements", noExchange: "Aucun échange.",
  assignTenant: "Assigner un locataire", assignExisting: "Assigner un locataire existant",
  searchTenant: "Rechercher un locataire…", noUnassigned: "Aucun locataire sans bien",
  createNewTenant: "Créer un nouveau locataire", connected: "Connecté", invite: "Inviter",
  sending: "Envoi…", noActiveLease: "Aucun bail résilié", allLeasesActive: "Tous vos baux sont actifs.",
  addFirstTenant: "Ajoutez votre premier locataire.", addFirstProperty: "Ajoutez votre premier bien immobilier.",
  noPropertyTitle: "Aucun bien", individualProperties: "Biens individuels",
  lots: "lot", month: "Mois", status: "Statut", markPaid: "Marquer payé",
  online: "En ligne", transfer: "Virement", cash: "Espèces", cancel: "Annuler",
  validateReceipt: "Valider quittance", accessible: "Accessible", calls: "appel(s)",
  entryInventory: "État des lieux d'entrée", exitInventory: "État des lieux de sortie",
  roomByRoom: "Pièce par pièce avec photos", compareEntry: "Comparer avec l'entrée",
  entry: "Entrée", exit: "Sortie", draft: "Brouillon", completed: "Finalisé",
  tenant_label: "Locataire", perMonth: "/mois",
  country: "Pays", vacantAssign: "Vacant — Assigner", unpaidN: "impayé(s)",
  rooms_suffix: "pièce(s)", terminated_label: "résilié", generateDoc: "Générer un document",
  writeMessage: "Écrire un message...", tenantSpace: "Espace locataire",
  myReceipts: "Mes quittances", myDocuments: "Mes documents", messagesNav: "Messages",
  payRent: "Payer mon loyer", settingsNav: "Paramètres", logoutNav: "Déconnexion",
  welcomeTenant: "Bienvenue 👋", tenantSpaceDesc: "Votre espace locataire Easy-Locs",
  myRent: "Loyer", myCharges: "Charges", myLease: "Bail",
  noLinkedProperty: "Aucun logement n'est encore lié à votre compte.",
  noLinkedPropertyDesc: "Votre bailleur doit vous associer dans sa gestion locative.",
  send: "Envoyer", downloadReceipts: "Téléchargez vos quittances de loyer validées par votre bailleur.",
  noReceipt: "Aucune quittance disponible pour le moment.",
  receiptDownloadError: "Erreur de téléchargement", noRentCall: "Aucun appel de loyer.",
  emailNewMsgFromTenant: "Nouveau message locataire", emailNewMsgFromLandlord: "Nouveau message de votre bailleur",
  emailNewMsgSubjectFromTenant: "Nouveau message de votre locataire", emailNewMsgSubjectFromLandlord: "Nouveau message de votre bailleur",
  emailReplyInApp: "Répondre dans l'application", emailAutoSent: "Cet email est envoyé automatiquement.",
  emailHello: "Bonjour", emailYouReceivedMsg: "Vous avez reçu un nouveau message :",
  emailTenantSentMsg: "Un locataire vous a envoyé un message :", notifNewMsgTenant: "Nouveau message locataire",
  notifNewMsgLandlord: "Nouveau message", notifTenantSentMsg: "Un locataire vous a envoyé un message.",
  notifLandlordSentMsg: "Votre bailleur vous a envoyé un message.",
  inviteSubject: "Invitation à rejoindre votre espace locataire",
  inviteTitle: "🏠 Invitation locataire", inviteBody: "Votre bailleur vous invite à activer votre espace locataire pour accéder à vos documents, quittances et messages.",
  inviteButton: "Activer mon espace locataire", inviteLinkExpiry: "Ce lien est personnel et expire dans 7 jours.",
};

const enLabels: typeof frLabels = {
  property: "Property", properties: "Properties", tenant: "Tenant", tenants: "Tenants",
  rent: "Rent", charges: "Service charges", deposit: "Security deposit", furnished: "Furnished",
  leaseStart: "Lease start", leaseEnd: "Lease end", leaseType: "Lease type",
  surface: "Surface area", rooms: "Rooms", floor: "Floor", heating: "Heating",
  propertyName: "Property name", propertyType: "Type", postalCode: "Postal code", city: "City",
  address: "Address", building: "Building / Residence", lotNumber: "Unit number", notes: "Notes",
  guarantor: "Guarantor name", guarantorPhone: "Guarantor phone", nationality: "Nationality",
  profession: "Profession", birthDate: "Date of birth", birthPlace: "Place of birth",
  fullName: "Full name", email: "Email", phone: "Phone",
  selectProperty: "— Select a property —", addProperty: "Add property", addTenant: "Add tenant",
  editProperty: "Edit property", editTenant: "Edit tenant", save: "Save",
  active: "Active", terminated: "Terminated", all: "All", paid: "Paid", unpaid: "Unpaid",
  overview: "Overview", payments: "Rent & Payments", inventory: "Inspections",
  rentTracking: "Rent tracking", monthCalls: "This month's calls", allProperties: "All properties",
  noProperty: "No property", noTenant: "No tenant",
  rentalManagement: "Rental management", rentalDesc: "Properties, tenants, leases, receipts, payments — all in one place.",
  occupied: "Occupied", revenueMonth: "Revenue/month", unpaidCount: "Unpaid", vacant: "vacant",
  quickActions: "Quick actions", generateReceipt: "Generate receipt",
  housingBenefit: "Housing benefit",
  totalExpenses: "Total expenses", inventoryReports: "Inspections",
  noPayment: "No payments.", noExpense: "No expenses recorded.",
  noInventory: "No inspections.", noFurniture: "No furniture recorded.",
  paymentHistory: "Payment history", noExchange: "No messages.",
  assignTenant: "Assign tenant", assignExisting: "Assign existing tenant",
  searchTenant: "Search tenant…", noUnassigned: "No unassigned tenants",
  createNewTenant: "Create new tenant", connected: "Connected", invite: "Invite",
  sending: "Sending…", noActiveLease: "No terminated leases", allLeasesActive: "All your leases are active.",
  addFirstTenant: "Add your first tenant.", addFirstProperty: "Add your first property.",
  noPropertyTitle: "No property", individualProperties: "Individual properties",
  lots: "unit", month: "Month", status: "Status", markPaid: "Mark paid",
  online: "Online", transfer: "Transfer", cash: "Cash", cancel: "Cancel",
  validateReceipt: "Validate receipt", accessible: "Accessible", calls: "call(s)",
  entryInventory: "Check-in inspection", exitInventory: "Check-out inspection",
  roomByRoom: "Room by room with photos", compareEntry: "Compare with check-in",
  entry: "Entry", exit: "Exit", draft: "Draft", completed: "Completed",
  tenant_label: "Tenant", perMonth: "/month",
  country: "Country", vacantAssign: "Vacant — Assign", unpaidN: "unpaid",
  rooms_suffix: "room(s)", terminated_label: "terminated", generateDoc: "Generate document",
  writeMessage: "Write a message...", tenantSpace: "Tenant space",
  myReceipts: "My receipts", myDocuments: "My documents", messagesNav: "Messages",
  payRent: "Pay my rent", settingsNav: "Settings", logoutNav: "Log out",
  welcomeTenant: "Welcome 👋", tenantSpaceDesc: "Your Easy-Locs tenant space",
  myRent: "Rent", myCharges: "Charges", myLease: "Lease",
  noLinkedProperty: "No property is linked to your account yet.",
  noLinkedPropertyDesc: "Your landlord must associate you in their management.",
  send: "Send", downloadReceipts: "Download your rent receipts validated by your landlord.",
  noReceipt: "No receipts available yet.",
  receiptDownloadError: "Download error", noRentCall: "No rent calls.",
  emailNewMsgFromTenant: "New tenant message", emailNewMsgFromLandlord: "New message from your landlord",
  emailNewMsgSubjectFromTenant: "New message from your tenant", emailNewMsgSubjectFromLandlord: "New message from your landlord",
  emailReplyInApp: "Reply in the app", emailAutoSent: "This email was sent automatically.",
  emailHello: "Hello", emailYouReceivedMsg: "You have received a new message:",
  emailTenantSentMsg: "A tenant has sent you a message:", notifNewMsgTenant: "New tenant message",
  notifNewMsgLandlord: "New message", notifTenantSentMsg: "A tenant has sent you a message.",
  notifLandlordSentMsg: "Your landlord has sent you a message.",
  inviteSubject: "Invitation to join your tenant portal",
  inviteTitle: "🏠 Tenant Invitation", inviteBody: "Your landlord invites you to activate your tenant portal to access your documents, receipts, and messages.",
  inviteButton: "Activate my tenant portal", inviteLinkExpiry: "This link is personal and expires in 7 days.",
};

const esLabels: typeof frLabels = {
  property: "Inmueble", properties: "Inmuebles", tenant: "Inquilino", tenants: "Inquilinos",
  rent: "Alquiler", charges: "Gastos", deposit: "Fianza", furnished: "Amueblado",
  leaseStart: "Inicio contrato", leaseEnd: "Fin contrato", leaseType: "Tipo de contrato",
  surface: "Superficie", rooms: "Habitaciones", floor: "Planta", heating: "Calefacción",
  propertyName: "Nombre del inmueble", propertyType: "Tipo", postalCode: "Código postal", city: "Ciudad",
  address: "Dirección", building: "Edificio / Residencia", lotNumber: "Nº de unidad", notes: "Notas",
  guarantor: "Nombre del avalista", guarantorPhone: "Tel. avalista", nationality: "Nacionalidad",
  profession: "Profesión", birthDate: "Fecha de nacimiento", birthPlace: "Lugar de nacimiento",
  fullName: "Nombre completo", email: "Email", phone: "Teléfono",
  selectProperty: "— Seleccionar inmueble —", addProperty: "Añadir inmueble", addTenant: "Añadir inquilino",
  editProperty: "Editar inmueble", editTenant: "Editar inquilino", save: "Guardar",
  active: "Activo", terminated: "Finalizado", all: "Todos", paid: "Pagado", unpaid: "Impago",
  overview: "Resumen", payments: "Alquileres y Pagos", inventory: "Inspecciones",
  rentTracking: "Seguimiento de alquileres", monthCalls: "Llamadas del mes", allProperties: "Todos los inmuebles",
  noProperty: "Ningún inmueble", noTenant: "Ningún inquilino",
  rentalManagement: "Gestión de alquileres", rentalDesc: "Inmuebles, inquilinos, contratos, recibos, pagos — todo en un solo lugar.",
  occupied: "Ocupados", revenueMonth: "Ingresos/mes", unpaidCount: "Impagos", vacant: "vacante",
  quickActions: "Acciones rápidas", generateReceipt: "Generar recibo",
  housingBenefit: "Ayuda vivienda",
  totalExpenses: "Gastos totales", inventoryReports: "Inspecciones",
  noPayment: "Sin pagos.", noExpense: "Sin gastos registrados.",
  noInventory: "Sin inspecciones.", noFurniture: "Sin muebles registrados.",
  paymentHistory: "Historial de pagos", noExchange: "Sin mensajes.",
  assignTenant: "Asignar inquilino", assignExisting: "Asignar inquilino existente",
  searchTenant: "Buscar inquilino…", noUnassigned: "No hay inquilinos sin inmueble",
  createNewTenant: "Crear nuevo inquilino", connected: "Conectado", invite: "Invitar",
  sending: "Enviando…", noActiveLease: "Sin contratos finalizados", allLeasesActive: "Todos sus contratos están activos.",
  addFirstTenant: "Añada su primer inquilino.", addFirstProperty: "Añada su primer inmueble.",
  noPropertyTitle: "Ningún inmueble", individualProperties: "Inmuebles individuales",
  lots: "unidad", month: "Mes", status: "Estado", markPaid: "Marcar pagado",
  online: "En línea", transfer: "Transferencia", cash: "Efectivo", cancel: "Cancelar",
  validateReceipt: "Validar recibo", accessible: "Accesible", calls: "llamada(s)",
  entryInventory: "Inspección de entrada", exitInventory: "Inspección de salida",
  roomByRoom: "Habitación por habitación con fotos", compareEntry: "Comparar con entrada",
  entry: "Entrada", exit: "Salida", draft: "Borrador", completed: "Completado",
  tenant_label: "Inquilino", perMonth: "/mes",
  country: "País", vacantAssign: "Vacante — Asignar", unpaidN: "impago(s)",
  rooms_suffix: "habitación(es)", terminated_label: "finalizado", generateDoc: "Generar documento",
  writeMessage: "Escribir un mensaje...", tenantSpace: "Espacio inquilino",
  myReceipts: "Mis recibos", myDocuments: "Mis documentos", messagesNav: "Mensajes",
  payRent: "Pagar mi alquiler", settingsNav: "Ajustes", logoutNav: "Cerrar sesión",
  welcomeTenant: "Bienvenido 👋", tenantSpaceDesc: "Tu espacio inquilino Easy-Locs",
  myRent: "Alquiler", myCharges: "Gastos", myLease: "Contrato",
  noLinkedProperty: "Aún no hay ningún inmueble vinculado a su cuenta.",
  noLinkedPropertyDesc: "Su propietario debe asociarle en su gestión.",
  send: "Enviar", downloadReceipts: "Descargue sus recibos de alquiler validados por su arrendador.",
  noReceipt: "No hay recibos disponibles por el momento.",
  receiptDownloadError: "Error de descarga", noRentCall: "Sin llamadas de alquiler.",
  emailNewMsgFromTenant: "Nuevo mensaje del inquilino", emailNewMsgFromLandlord: "Nuevo mensaje de su arrendador",
  emailNewMsgSubjectFromTenant: "Nuevo mensaje de su inquilino", emailNewMsgSubjectFromLandlord: "Nuevo mensaje de su arrendador",
  emailReplyInApp: "Responder en la aplicación", emailAutoSent: "Este email se ha enviado automáticamente.",
  emailHello: "Hola", emailYouReceivedMsg: "Ha recibido un nuevo mensaje:",
  emailTenantSentMsg: "Un inquilino le ha enviado un mensaje:", notifNewMsgTenant: "Nuevo mensaje del inquilino",
  notifNewMsgLandlord: "Nuevo mensaje", notifTenantSentMsg: "Un inquilino le ha enviado un mensaje.",
  notifLandlordSentMsg: "Su arrendador le ha enviado un mensaje.",
  inviteSubject: "Invitación a unirse a su espacio de inquilino",
  inviteTitle: "🏠 Invitación inquilino", inviteBody: "Su arrendador le invita a activar su espacio de inquilino para acceder a sus documentos, recibos y mensajes.",
  inviteButton: "Activar mi espacio de inquilino", inviteLinkExpiry: "Este enlace es personal y caduca en 7 días.",
};

const deLabels: typeof frLabels = {
  property: "Objekt", properties: "Objekte", tenant: "Mieter", tenants: "Mieter",
  rent: "Kaltmiete", charges: "Nebenkosten", deposit: "Kaution", furnished: "Möbliert",
  leaseStart: "Mietbeginn", leaseEnd: "Mietende", leaseType: "Vertragsart",
  surface: "Fläche", rooms: "Zimmer", floor: "Stockwerk", heating: "Heizung",
  propertyName: "Objektname", propertyType: "Typ", postalCode: "PLZ", city: "Stadt",
  address: "Adresse", building: "Gebäude / Anlage", lotNumber: "Einheitsnummer", notes: "Notizen",
  guarantor: "Bürge", guarantorPhone: "Tel. Bürge", nationality: "Staatsangehörigkeit",
  profession: "Beruf", birthDate: "Geburtsdatum", birthPlace: "Geburtsort",
  fullName: "Vollständiger Name", email: "E-Mail", phone: "Telefon",
  selectProperty: "— Objekt wählen —", addProperty: "Objekt hinzufügen", addTenant: "Mieter hinzufügen",
  editProperty: "Objekt bearbeiten", editTenant: "Mieter bearbeiten", save: "Speichern",
  active: "Aktiv", terminated: "Beendet", all: "Alle", paid: "Bezahlt", unpaid: "Unbezahlt",
  overview: "Übersicht", payments: "Mieten & Zahlungen", inventory: "Übergabeprotokolle",
  rentTracking: "Mietverfolgung", monthCalls: "Monatliche Aufrufe", allProperties: "Alle Objekte",
  noProperty: "Kein Objekt", noTenant: "Kein Mieter",
  rentalManagement: "Mietverwaltung", rentalDesc: "Objekte, Mieter, Verträge, Quittungen, Zahlungen — alles an einem Ort.",
  occupied: "Belegt", revenueMonth: "Einnahmen/Monat", unpaidCount: "Ausstehend", vacant: "leer",
  quickActions: "Schnellaktionen", generateReceipt: "Quittung erstellen",
  housingBenefit: "Wohngeld",
  totalExpenses: "Gesamtausgaben", inventoryReports: "Übergabeprotokolle",
  noPayment: "Keine Zahlungen.", noExpense: "Keine Ausgaben erfasst.",
  noInventory: "Keine Protokolle.", noFurniture: "Keine Möbel erfasst.",
  paymentHistory: "Zahlungsverlauf", noExchange: "Keine Nachrichten.",
  assignTenant: "Mieter zuweisen", assignExisting: "Bestehenden Mieter zuweisen",
  searchTenant: "Mieter suchen…", noUnassigned: "Keine Mieter ohne Objekt",
  createNewTenant: "Neuen Mieter erstellen", connected: "Verbunden", invite: "Einladen",
  sending: "Sende…", noActiveLease: "Keine beendeten Mietverträge", allLeasesActive: "Alle Mietverträge sind aktiv.",
  addFirstTenant: "Fügen Sie Ihren ersten Mieter hinzu.", addFirstProperty: "Fügen Sie Ihr erstes Objekt hinzu.",
  noPropertyTitle: "Kein Objekt", individualProperties: "Einzelobjekte",
  lots: "Einheit", month: "Monat", status: "Status", markPaid: "Als bezahlt markieren",
  online: "Online", transfer: "Überweisung", cash: "Bar", cancel: "Abbrechen",
  validateReceipt: "Quittung bestätigen", accessible: "Zugänglich", calls: "Aufruf(e)",
  entryInventory: "Einzugsprotokoll", exitInventory: "Auszugsprotokoll",
  roomByRoom: "Raum für Raum mit Fotos", compareEntry: "Mit Einzug vergleichen",
  entry: "Einzug", exit: "Auszug", draft: "Entwurf", completed: "Abgeschlossen",
  tenant_label: "Mieter", perMonth: "/Monat",
  country: "Land", vacantAssign: "Leer — Zuweisen", unpaidN: "ausstehend",
  rooms_suffix: "Zimmer", terminated_label: "beendet", generateDoc: "Dokument erstellen",
  writeMessage: "Nachricht schreiben...", tenantSpace: "Mieterbereich",
  myReceipts: "Meine Quittungen", myDocuments: "Meine Dokumente", messagesNav: "Nachrichten",
  payRent: "Miete zahlen", settingsNav: "Einstellungen", logoutNav: "Abmelden",
  welcomeTenant: "Willkommen 👋", tenantSpaceDesc: "Ihr Easy-Locs Mieterbereich",
  myRent: "Miete", myCharges: "Nebenkosten", myLease: "Vertrag",
  noLinkedProperty: "Noch keine Immobilie mit Ihrem Konto verknüpft.",
  noLinkedPropertyDesc: "Ihr Vermieter muss Sie in seiner Verwaltung zuordnen.",
  send: "Senden", downloadReceipts: "Laden Sie Ihre vom Vermieter validierten Quittungen herunter.",
  noReceipt: "Noch keine Quittungen verfügbar.",
  receiptDownloadError: "Download-Fehler", noRentCall: "Keine Mietaufrufe.",
  emailNewMsgFromTenant: "Neue Nachricht vom Mieter", emailNewMsgFromLandlord: "Neue Nachricht von Ihrem Vermieter",
  emailNewMsgSubjectFromTenant: "Neue Nachricht von Ihrem Mieter", emailNewMsgSubjectFromLandlord: "Neue Nachricht von Ihrem Vermieter",
  emailReplyInApp: "In der App antworten", emailAutoSent: "Diese E-Mail wurde automatisch versendet.",
  emailHello: "Hallo", emailYouReceivedMsg: "Sie haben eine neue Nachricht erhalten:",
  emailTenantSentMsg: "Ein Mieter hat Ihnen eine Nachricht gesendet:", notifNewMsgTenant: "Neue Mieternachricht",
  notifNewMsgLandlord: "Neue Nachricht", notifTenantSentMsg: "Ein Mieter hat Ihnen eine Nachricht gesendet.",
  notifLandlordSentMsg: "Ihr Vermieter hat Ihnen eine Nachricht gesendet.",
  inviteSubject: "Einladung zu Ihrem Mieterportal",
  inviteTitle: "🏠 Mieter-Einladung", inviteBody: "Ihr Vermieter lädt Sie ein, Ihr Mieterportal zu aktivieren, um auf Ihre Dokumente, Quittungen und Nachrichten zuzugreifen.",
  inviteButton: "Mieterportal aktivieren", inviteLinkExpiry: "Dieser Link ist persönlich und läuft in 7 Tagen ab.",
};

const itLabels: typeof frLabels = {
  property: "Immobile", properties: "Immobili", tenant: "Inquilino", tenants: "Inquilini",
  rent: "Canone", charges: "Spese", deposit: "Cauzione", furnished: "Arredato",
  leaseStart: "Inizio contratto", leaseEnd: "Fine contratto", leaseType: "Tipo contratto",
  surface: "Superficie", rooms: "Stanze", floor: "Piano", heating: "Riscaldamento",
  propertyName: "Nome immobile", propertyType: "Tipo", postalCode: "CAP", city: "Città",
  address: "Indirizzo", building: "Edificio / Complesso", lotNumber: "N° unità", notes: "Note",
  guarantor: "Nome garante", guarantorPhone: "Tel. garante", nationality: "Nazionalità",
  profession: "Professione", birthDate: "Data di nascita", birthPlace: "Luogo di nascita",
  fullName: "Nome completo", email: "Email", phone: "Telefono",
  selectProperty: "— Selezionare immobile —", addProperty: "Aggiungi immobile", addTenant: "Aggiungi inquilino",
  editProperty: "Modifica immobile", editTenant: "Modifica inquilino", save: "Salva",
  active: "Attivo", terminated: "Terminato", all: "Tutti", paid: "Pagato", unpaid: "Non pagato",
  overview: "Panoramica", payments: "Affitti e Pagamenti", inventory: "Verbali",
  rentTracking: "Monitoraggio affitti", monthCalls: "Richieste del mese", allProperties: "Tutti gli immobili",
  noProperty: "Nessun immobile", noTenant: "Nessun inquilino",
  rentalManagement: "Gestione locazioni", rentalDesc: "Immobili, inquilini, contratti, ricevute, pagamenti — tutto in un unico posto.",
  occupied: "Occupati", revenueMonth: "Entrate/mese", unpaidCount: "Insoluti", vacant: "vacante",
  quickActions: "Azioni rapide", generateReceipt: "Genera ricevuta",
  housingBenefit: "Sussidio abitativo",
  totalExpenses: "Spese totali", inventoryReports: "Verbali",
  noPayment: "Nessun pagamento.", noExpense: "Nessuna spesa registrata.",
  noInventory: "Nessun verbale.", noFurniture: "Nessun mobile registrato.",
  paymentHistory: "Storico pagamenti", noExchange: "Nessun messaggio.",
  assignTenant: "Assegna inquilino", assignExisting: "Assegna inquilino esistente",
  searchTenant: "Cerca inquilino…", noUnassigned: "Nessun inquilino senza immobile",
  createNewTenant: "Crea nuovo inquilino", connected: "Connesso", invite: "Invita",
  sending: "Invio…", noActiveLease: "Nessun contratto terminato", allLeasesActive: "Tutti i contratti sono attivi.",
  addFirstTenant: "Aggiungi il tuo primo inquilino.", addFirstProperty: "Aggiungi il tuo primo immobile.",
  noPropertyTitle: "Nessun immobile", individualProperties: "Immobili singoli",
  lots: "unità", month: "Mese", status: "Stato", markPaid: "Segna pagato",
  online: "Online", transfer: "Bonifico", cash: "Contanti", cancel: "Annulla",
  validateReceipt: "Convalida ricevuta", accessible: "Accessibile", calls: "richiesta/e",
  entryInventory: "Verbale di ingresso", exitInventory: "Verbale di uscita",
  roomByRoom: "Stanza per stanza con foto", compareEntry: "Confronta con ingresso",
  entry: "Ingresso", exit: "Uscita", draft: "Bozza", completed: "Completato",
  tenant_label: "Inquilino", perMonth: "/mese",
  country: "Paese", vacantAssign: "Vacante — Assegna", unpaidN: "insoluto/i",
  rooms_suffix: "stanza/e", terminated_label: "terminato", generateDoc: "Genera documento",
  writeMessage: "Scrivi un messaggio...", tenantSpace: "Spazio inquilino",
  myReceipts: "Le mie ricevute", myDocuments: "I miei documenti", messagesNav: "Messaggi",
  payRent: "Paga l'affitto", settingsNav: "Impostazioni", logoutNav: "Esci",
  welcomeTenant: "Benvenuto 👋", tenantSpaceDesc: "Il tuo spazio inquilino Easy-Locs",
  myRent: "Canone", myCharges: "Spese", myLease: "Contratto",
  noLinkedProperty: "Nessun immobile è ancora collegato al tuo account.",
  noLinkedPropertyDesc: "Il tuo proprietario deve associarti nella sua gestione.",
  send: "Invia", downloadReceipts: "Scarica le tue ricevute d'affitto validate dal tuo locatore.",
  noReceipt: "Nessuna ricevuta disponibile al momento.",
  receiptDownloadError: "Errore di download", noRentCall: "Nessuna richiesta di affitto.",
  emailNewMsgFromTenant: "Nuovo messaggio dell'inquilino", emailNewMsgFromLandlord: "Nuovo messaggio dal proprietario",
  emailNewMsgSubjectFromTenant: "Nuovo messaggio dal tuo inquilino", emailNewMsgSubjectFromLandlord: "Nuovo messaggio dal tuo proprietario",
  emailReplyInApp: "Rispondi nell'app", emailAutoSent: "Questa email è stata inviata automaticamente.",
  emailHello: "Ciao", emailYouReceivedMsg: "Hai ricevuto un nuovo messaggio:",
  emailTenantSentMsg: "Un inquilino ti ha inviato un messaggio:", notifNewMsgTenant: "Nuovo messaggio inquilino",
  notifNewMsgLandlord: "Nuovo messaggio", notifTenantSentMsg: "Un inquilino ti ha inviato un messaggio.",
  notifLandlordSentMsg: "Il tuo proprietario ti ha inviato un messaggio.",
  inviteSubject: "Invito a unirti al tuo spazio inquilino",
  inviteTitle: "🏠 Invito inquilino", inviteBody: "Il tuo proprietario ti invita ad attivare il tuo spazio inquilino per accedere ai tuoi documenti, ricevute e messaggi.",
  inviteButton: "Attiva il mio spazio inquilino", inviteLinkExpiry: "Questo link è personale e scade tra 7 giorni.",
};

const ptLabels: typeof frLabels = {
  property: "Imóvel", properties: "Imóveis", tenant: "Inquilino", tenants: "Inquilinos",
  rent: "Renda", charges: "Encargos", deposit: "Caução", furnished: "Mobilado",
  leaseStart: "Início contrato", leaseEnd: "Fim contrato", leaseType: "Tipo de contrato",
  surface: "Área", rooms: "Divisões", floor: "Andar", heating: "Aquecimento",
  propertyName: "Nome do imóvel", propertyType: "Tipo", postalCode: "Código postal", city: "Cidade",
  address: "Morada", building: "Edifício / Condomínio", lotNumber: "Nº fração", notes: "Notas",
  guarantor: "Nome do fiador", guarantorPhone: "Tel. fiador", nationality: "Nacionalidade",
  profession: "Profissão", birthDate: "Data de nascimento", birthPlace: "Naturalidade",
  fullName: "Nome completo", email: "Email", phone: "Telefone",
  selectProperty: "— Selecionar imóvel —", addProperty: "Adicionar imóvel", addTenant: "Adicionar inquilino",
  editProperty: "Editar imóvel", editTenant: "Editar inquilino", save: "Guardar",
  active: "Ativo", terminated: "Terminado", all: "Todos", paid: "Pago", unpaid: "Em dívida",
  overview: "Resumo", payments: "Rendas e Pagamentos", inventory: "Vistorias",
  rentTracking: "Acompanhamento de rendas", monthCalls: "Chamadas do mês", allProperties: "Todos os imóveis",
  noProperty: "Nenhum imóvel", noTenant: "Nenhum inquilino",
  rentalManagement: "Gestão de arrendamento", rentalDesc: "Imóveis, inquilinos, contratos, recibos, pagamentos — tudo num só lugar.",
  occupied: "Ocupados", revenueMonth: "Receita/mês", unpaidCount: "Em atraso", vacant: "vago",
  quickActions: "Ações rápidas", generateReceipt: "Gerar recibo",
  housingBenefit: "Subsídio habitação",
  totalExpenses: "Despesas totais", inventoryReports: "Vistorias",
  noPayment: "Sem pagamentos.", noExpense: "Sem despesas registadas.",
  noInventory: "Sem vistorias.", noFurniture: "Sem mobília registada.",
  paymentHistory: "Histórico de pagamentos", noExchange: "Sem mensagens.",
  assignTenant: "Atribuir inquilino", assignExisting: "Atribuir inquilino existente",
  searchTenant: "Pesquisar inquilino…", noUnassigned: "Nenhum inquilino sem imóvel",
  createNewTenant: "Criar novo inquilino", connected: "Conectado", invite: "Convidar",
  sending: "A enviar…", noActiveLease: "Sem contratos terminados", allLeasesActive: "Todos os contratos estão ativos.",
  addFirstTenant: "Adicione o seu primeiro inquilino.", addFirstProperty: "Adicione o seu primeiro imóvel.",
  noPropertyTitle: "Nenhum imóvel", individualProperties: "Imóveis individuais",
  lots: "fração", month: "Mês", status: "Estado", markPaid: "Marcar pago",
  online: "Online", transfer: "Transferência", cash: "Dinheiro", cancel: "Cancelar",
  validateReceipt: "Validar recibo", accessible: "Acessível", calls: "chamada(s)",
  entryInventory: "Vistoria de entrada", exitInventory: "Vistoria de saída",
  roomByRoom: "Divisão por divisão com fotos", compareEntry: "Comparar com entrada",
  entry: "Entrada", exit: "Saída", draft: "Rascunho", completed: "Concluído",
  tenant_label: "Inquilino", perMonth: "/mês",
  country: "País", vacantAssign: "Vago — Atribuir", unpaidN: "em atraso",
  rooms_suffix: "divisão(ões)", terminated_label: "terminado", generateDoc: "Gerar documento",
  writeMessage: "Escrever mensagem...", tenantSpace: "Espaço inquilino",
  myReceipts: "Meus recibos", myDocuments: "Meus documentos", messagesNav: "Mensagens",
  payRent: "Pagar renda", settingsNav: "Definições", logoutNav: "Sair",
  welcomeTenant: "Bem-vindo 👋", tenantSpaceDesc: "O seu espaço inquilino Easy-Locs",
  myRent: "Renda", myCharges: "Encargos", myLease: "Contrato",
  noLinkedProperty: "Nenhum imóvel está ainda associado à sua conta.",
  noLinkedPropertyDesc: "O seu senhorio deve associá-lo na sua gestão.",
  send: "Enviar", downloadReceipts: "Descarregue os seus recibos validados pelo senhorio.",
  noReceipt: "Nenhum recibo disponível de momento.",
  receiptDownloadError: "Erro no download", noRentCall: "Sem chamadas de renda.",
  emailNewMsgFromTenant: "Nova mensagem do inquilino", emailNewMsgFromLandlord: "Nova mensagem do seu senhorio",
  emailNewMsgSubjectFromTenant: "Nova mensagem do seu inquilino", emailNewMsgSubjectFromLandlord: "Nova mensagem do seu senhorio",
  emailReplyInApp: "Responder na aplicação", emailAutoSent: "Este email foi enviado automaticamente.",
  emailHello: "Olá", emailYouReceivedMsg: "Recebeu uma nova mensagem:",
  emailTenantSentMsg: "Um inquilino enviou-lhe uma mensagem:", notifNewMsgTenant: "Nova mensagem do inquilino",
  notifNewMsgLandlord: "Nova mensagem", notifTenantSentMsg: "Um inquilino enviou-lhe uma mensagem.",
  notifLandlordSentMsg: "O seu senhorio enviou-lhe uma mensagem.",
  inviteSubject: "Convite para o seu espaço de inquilino",
  inviteTitle: "🏠 Convite inquilino", inviteBody: "O seu senhorio convida-o a ativar o seu espaço de inquilino para aceder aos seus documentos, recibos e mensagens.",
  inviteButton: "Ativar o meu espaço de inquilino", inviteLinkExpiry: "Este link é pessoal e expira em 7 dias.",
};

/* ─── Property types per language group ─── */
const frPropertyTypes = [
  { value: "apartment", label: "Appartement" },
  { value: "house", label: "Maison" },
  { value: "studio", label: "Studio" },
  { value: "commercial", label: "Local commercial" },
  { value: "parking", label: "Parking / Garage" },
];
const enPropertyTypes = [
  { value: "apartment", label: "Apartment / Flat" },
  { value: "house", label: "House" },
  { value: "studio", label: "Studio" },
  { value: "commercial", label: "Commercial premises" },
  { value: "parking", label: "Parking / Garage" },
];
const esPropertyTypes = [
  { value: "apartment", label: "Piso / Apartamento" },
  { value: "house", label: "Casa" },
  { value: "studio", label: "Estudio" },
  { value: "commercial", label: "Local comercial" },
  { value: "parking", label: "Parking / Garaje" },
];
const dePropertyTypes = [
  { value: "apartment", label: "Wohnung" },
  { value: "house", label: "Haus" },
  { value: "studio", label: "Einzimmerwohnung" },
  { value: "commercial", label: "Gewerberaum" },
  { value: "parking", label: "Stellplatz / Garage" },
];
const itPropertyTypes = [
  { value: "apartment", label: "Appartamento" },
  { value: "house", label: "Casa" },
  { value: "studio", label: "Monolocale" },
  { value: "commercial", label: "Locale commerciale" },
  { value: "parking", label: "Posto auto / Garage" },
];
const ptPropertyTypes = [
  { value: "apartment", label: "Apartamento" },
  { value: "house", label: "Moradia" },
  { value: "studio", label: "Estúdio" },
  { value: "commercial", label: "Espaço comercial" },
  { value: "parking", label: "Estacionamento / Garagem" },
];

/* ─── Heating types per language group ─── */
const frHeatingTypes = [
  { value: "individual-gas", label: "Individuel gaz" },
  { value: "individual-electric", label: "Individuel électrique" },
  { value: "collective", label: "Collectif" },
  { value: "heat-pump", label: "Pompe à chaleur" },
  { value: "other", label: "Autre" },
];
const enHeatingTypes = [
  { value: "individual-gas", label: "Individual gas" },
  { value: "individual-electric", label: "Individual electric" },
  { value: "collective", label: "Central / Collective" },
  { value: "heat-pump", label: "Heat pump" },
  { value: "other", label: "Other" },
];
const esHeatingTypes = [
  { value: "individual-gas", label: "Gas individual" },
  { value: "individual-electric", label: "Eléctrico individual" },
  { value: "collective", label: "Central / Colectivo" },
  { value: "heat-pump", label: "Bomba de calor" },
  { value: "other", label: "Otro" },
];
const deHeatingTypes = [
  { value: "individual-gas", label: "Einzelgas" },
  { value: "individual-electric", label: "Einzelelektrisch" },
  { value: "collective", label: "Zentralheizung" },
  { value: "heat-pump", label: "Wärmepumpe" },
  { value: "other", label: "Sonstige" },
];
const itHeatingTypes = [
  { value: "individual-gas", label: "Gas autonomo" },
  { value: "individual-electric", label: "Elettrico autonomo" },
  { value: "collective", label: "Centralizzato" },
  { value: "heat-pump", label: "Pompa di calore" },
  { value: "other", label: "Altro" },
];
const ptHeatingTypes = [
  { value: "individual-gas", label: "Gás individual" },
  { value: "individual-electric", label: "Elétrico individual" },
  { value: "collective", label: "Central / Coletivo" },
  { value: "heat-pump", label: "Bomba de calor" },
  { value: "other", label: "Outro" },
];

/* ─── Lease types per language group ─── */
const frLeaseTypes = [
  { value: "empty", label: "Bail vide" },
  { value: "furnished", label: "Bail meublé" },
  { value: "commercial", label: "Bail commercial" },
];
const enLeaseTypes = [
  { value: "empty", label: "Unfurnished tenancy" },
  { value: "furnished", label: "Furnished tenancy" },
  { value: "commercial", label: "Commercial lease" },
];
const esLeaseTypes = [
  { value: "empty", label: "Sin amueblar" },
  { value: "furnished", label: "Amueblado" },
  { value: "commercial", label: "Local comercial" },
];
const deLeaseTypes = [
  { value: "empty", label: "Unmöbliert" },
  { value: "furnished", label: "Möbliert" },
  { value: "commercial", label: "Gewerbe" },
];
const itLeaseTypes = [
  { value: "empty", label: "Non arredato" },
  { value: "furnished", label: "Arredato" },
  { value: "commercial", label: "Commerciale" },
];
const ptLeaseTypes = [
  { value: "empty", label: "Sem mobília" },
  { value: "furnished", label: "Mobilado" },
  { value: "commercial", label: "Comercial" },
];

/* ─── Currency symbols ─── */
const CURRENCY_SYMBOLS: Record<string, string> = {
  EUR: "€", USD: "$", GBP: "£", CHF: "CHF", CAD: "CA$", AUD: "A$",
  BRL: "R$", MXN: "MX$", MAD: "MAD", TND: "TND", XOF: "CFA",
  ZAR: "R", AED: "AED", SAR: "SAR", TRY: "₺", JPY: "¥", SGD: "S$",
  SEK: "kr", NOK: "kr", DKK: "kr", PLN: "zł", CZK: "Kč", HUF: "Ft",
  RON: "lei", HRK: "kn", BGN: "лв",
  THB: "฿", ARS: "$", CLP: "$", COP: "$", PEN: "S/.",
  DZD: "DA", XAF: "FCFA", NGN: "₦", KES: "KSh", GHS: "₵",
  QAR: "QR", BHD: "BD", KWD: "KD", OMR: "OMR", ILS: "₪",
  KRW: "₩", CNY: "¥", INR: "₹", MYR: "RM", VND: "₫",
  PHP: "₱", IDR: "Rp", NZD: "NZ$", MUR: "₨", JOD: "JD", LBP: "L£",
};

/* ─── Nationality defaults ─── */
const NATIONALITY_MAP: Record<string, string> = {
  FR: "Française", BE: "Belge", ES: "Española", IT: "Italiana", DE: "Deutsch",
  PT: "Portuguesa", GB: "British", CH: "Suisse", NL: "Nederlandse", AT: "Österreichisch",
  LU: "Luxembourgeoise", IE: "Irish", US: "American", CA: "Canadian",
  MA: "Marocaine", TN: "Tunisienne", SN: "Sénégalaise", CI: "Ivoirienne",
  BR: "Brasileira", MX: "Mexicana", JP: "日本", PL: "Polska", SE: "Svensk",
  DK: "Dansk", NO: "Norsk", FI: "Suomalainen", GR: "Ελληνική",
  CZ: "Česká", RO: "Română", HU: "Magyar", HR: "Hrvatska", BG: "Българска", SK: "Slovenská",
  TH: "ไทย", AR: "Argentina", CL: "Chilena", CO: "Colombiana", PE: "Peruana",
  DZ: "Algérienne", CM: "Camerounaise", GA: "Gabonaise", CG: "Congolaise",
  CD: "Congolaise (RDC)", MG: "Malgache", MU: "Mauricienne", NG: "Nigerian", KE: "Kenyan", GH: "Ghanaian",
  QA: "Qatari", BH: "Bahraini", KW: "Kuwaiti", OM: "Omani", LB: "Libanaise", JO: "Jordanienne", IL: "Israeli", TR: "Türk",
  KR: "한국", CN: "中国", IN: "Indian", SG: "Singaporean", MY: "Malaysian",
  VN: "Việt Nam", PH: "Filipino", ID: "Indonesian", AU: "Australian", NZ: "New Zealander",
  AE: "Emirati", SA: "Saudi", ZA: "South African",
};

/* ─── Surface unit ─── */
const SURFACE_UNITS: Record<string, string> = {
  US: "sq ft", GB: "sq ft", CA: "sq ft",
};

import { COUNTRY_CURRENCY_MAP } from "@/lib/i18n";

/* ─── Locale group from country ─── */
function getLocaleGroup(country: string): "fr" | "en" | "es" | "de" | "it" | "pt" {
  const frGroup = ["FR", "BE", "CH", "LU", "MC", "SN", "CI", "MA", "TN", "DZ", "CM", "GA", "CG", "CD", "MG", "MU", "LB"];
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

export function getCountryConfig(country: string): CountryConfig {
  const group = getLocaleGroup(country);
  const currency = COUNTRY_CURRENCY_MAP[country] || "EUR";
  const currencySymbol = CURRENCY_SYMBOLS[currency] || currency;

  const labelsMap = { fr: frLabels, en: enLabels, es: esLabels, de: deLabels, it: itLabels, pt: ptLabels };
  const propertyTypesMap = { fr: frPropertyTypes, en: enPropertyTypes, es: esPropertyTypes, de: dePropertyTypes, it: itPropertyTypes, pt: ptPropertyTypes };
  const heatingTypesMap = { fr: frHeatingTypes, en: enHeatingTypes, es: esHeatingTypes, de: deHeatingTypes, it: itHeatingTypes, pt: ptHeatingTypes };
  const leaseTypesMap = { fr: frLeaseTypes, en: enLeaseTypes, es: esLeaseTypes, de: deLeaseTypes, it: itLeaseTypes, pt: ptLeaseTypes };

  const localeMap: Record<string, string> = {
    fr: "fr-FR", en: "en-US", es: "es-ES", de: "de-DE", it: "it-IT", pt: "pt-PT",
  };

  return {
    code: country,
    currency,
    currencySymbol,
    locale: localeMap[group] || "en-US",
    propertyTypes: propertyTypesMap[group],
    heatingTypes: heatingTypesMap[group],
    leaseTypes: leaseTypesMap[group],
    labels: labelsMap[group],
    defaultNationality: NATIONALITY_MAP[country] || "",
    surfaceUnit: SURFACE_UNITS[country] || "m²",
  };
}

/** Format a number as currency for the given country */
export function formatCurrency(amount: number, country: string): string {
  const cfg = getCountryConfig(country);
  try {
    return new Intl.NumberFormat(cfg.locale, { style: "currency", currency: cfg.currency }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${cfg.currencySymbol}`;
  }
}
