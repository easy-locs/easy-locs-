import React, { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

export type Locale = "fr" | "en" | "es" | "de" | "it" | "pt";

/* ─── Country → Locale mapping ─── */
export const COUNTRY_LOCALE_MAP: Record<string, Locale> = {
  FR: "fr", BE: "fr", CH: "fr", LU: "fr", MC: "fr",
  ES: "es", MX: "es", AR: "es", CL: "es", CO: "es",
  DE: "de", AT: "de",
  IT: "it",
  PT: "pt", BR: "pt",
  US: "en", GB: "en", IE: "en", AU: "en", NZ: "en", CA: "en",
};

export const COUNTRY_CURRENCY_MAP: Record<string, string> = {
  FR: "EUR", BE: "EUR", ES: "EUR", DE: "EUR", IT: "EUR", PT: "EUR", LU: "EUR", MC: "EUR", AT: "EUR", IE: "EUR", NL: "EUR", FI: "EUR", GR: "EUR",
  GB: "GBP", US: "USD", CH: "CHF", CA: "CAD", AU: "AUD", NZ: "NZD", BR: "BRL", MX: "MXN", AR: "ARS", CL: "CLP", CO: "COP",
};

const translations: Record<Locale, Record<string, string>> = {
  fr: {
    "nav.dashboard": "Tableau de bord", "nav.properties": "Biens", "nav.tenants": "Locataires",
    "nav.documents": "Documents", "nav.payments": "Paiements", "nav.inventory": "États des lieux",
    "nav.receipts": "Quittances", "nav.leases": "Baux", "nav.reminders": "Rappels",
    "nav.vault": "Coffre-fort", "nav.settings": "Paramètres", "nav.seasonal": "Location saisonnière",
    "nav.finances": "Finances", "nav.expenses": "Dépenses", "nav.assistant": "Assistant IA",
    "nav.buildings": "Immeubles", "nav.candidates": "Candidats", "nav.notices": "Avis d'échéance",
    "nav.dunning": "Relances", "nav.furniture": "Mobilier", "nav.charges": "Régul. charges",
    "nav.fiscal": "Bilan fiscal", "nav.company": "Carnet", "nav.interventions": "Interventions",
    "nav.tasks": "Tâches", "nav.notes": "Notes", "nav.messages": "Messages",
    "nav.billing": "Abonnement", "nav.logout": "Déconnexion",
    "section.essential": "L'ESSENTIEL", "section.rental": "LOCATION", "section.more": "LE PLUS",
    "badge.landlord": "Espace bailleur",
    "dashboard.hello": "Bonjour 👋", "dashboard.summary": "Voici un résumé de votre situation.",
    "dashboard.properties": "Biens", "dashboard.tenants_count": "locataire(s)",
    "dashboard.collected": "Encaissé ce mois", "dashboard.unpaid": "impayés",
    "dashboard.documents": "Documents", "dashboard.generated": "générés",
    "dashboard.vault": "Coffre-fort", "dashboard.files": "fichier(s)",
    "dashboard.quick_actions": "Actions rapides", "dashboard.generate_receipt": "Générer une quittance",
    "dashboard.create_lease": "Créer un bail", "dashboard.view_reminders": "Voir les rappels",
    "dashboard.my_vault": "Mon coffre-fort", "dashboard.ai_question": "Que dois-je faire maintenant ?",
    "dashboard.ai_desc": "L'IA analyse votre situation et vous propose des actions.",
    "dashboard.alerts": "Alertes & actions", "dashboard.all_good": "Tout est à jour ! 🎉",
    "dashboard.unpaid_this_month": "loyer(s) impayé(s) ce mois",
    "dashboard.active_reminders": "rappel(s) actif(s)", "dashboard.occupancy": "Taux d'occupation",
    "dashboard.vacant": "vacant(s)", "dashboard.revenue_trend": "Tendance revenus (6 mois)",
    "dashboard.legal_disclaimer": "Cette application fournit une assistance administrative uniquement.",
    "common.save": "Enregistrer", "common.cancel": "Annuler", "common.delete": "Supprimer",
    "common.edit": "Modifier", "common.add": "Ajouter", "common.search": "Rechercher",
    "common.back": "Retour", "common.loading": "Chargement...", "common.no_data": "Aucune donnée",
    "common.paid": "Payé", "common.unpaid": "Impayé", "common.active": "Actif",
    "common.terminated": "Résilié", "common.all": "Tous", "common.month": "Mois", "common.year": "Année",
    "common.continue": "Continuer", "common.skip": "Passer", "common.finish": "Terminer",
    // Onboarding
    "onboarding.title": "Configuration de votre espace",
    "onboarding.step0": "Plan & Pays", "onboarding.step1": "Profil propriétaire",
    "onboarding.step2": "Ajouter un bien", "onboarding.step3": "Connexion OTA",
    "onboarding.step4": "Ajouter un locataire", "onboarding.step5": "État des lieux",
    "onboarding.step6": "Documents", "onboarding.step7": "Activation",
    "trial.free": "Essai gratuit", "trial.days_left": "jour(s) restant(s)",
    "trial.choose_plan": "Choisir un plan",
  },
  en: {
    "nav.dashboard": "Dashboard", "nav.properties": "Properties", "nav.tenants": "Tenants",
    "nav.documents": "Documents", "nav.payments": "Payments", "nav.inventory": "Inventory Reports",
    "nav.receipts": "Receipts", "nav.leases": "Leases", "nav.reminders": "Reminders",
    "nav.vault": "Vault", "nav.settings": "Settings", "nav.seasonal": "Seasonal Rentals",
    "nav.finances": "Finances", "nav.expenses": "Expenses", "nav.assistant": "AI Assistant",
    "nav.buildings": "Buildings", "nav.candidates": "Candidates", "nav.notices": "Payment Notices",
    "nav.dunning": "Dunning", "nav.furniture": "Furniture", "nav.charges": "Charges Regularization",
    "nav.fiscal": "Tax Report", "nav.company": "Contacts", "nav.interventions": "Interventions",
    "nav.tasks": "Tasks", "nav.notes": "Notes", "nav.messages": "Messages",
    "nav.billing": "Billing", "nav.logout": "Log out",
    "section.essential": "ESSENTIALS", "section.rental": "RENTAL", "section.more": "MORE",
    "badge.landlord": "Landlord area",
    "dashboard.hello": "Hello 👋", "dashboard.summary": "Here's an overview of your situation.",
    "dashboard.properties": "Properties", "dashboard.tenants_count": "tenant(s)",
    "dashboard.collected": "Collected this month", "dashboard.unpaid": "unpaid",
    "dashboard.documents": "Documents", "dashboard.generated": "generated",
    "dashboard.vault": "Vault", "dashboard.files": "file(s)",
    "dashboard.quick_actions": "Quick Actions", "dashboard.generate_receipt": "Generate receipt",
    "dashboard.create_lease": "Create lease", "dashboard.view_reminders": "View reminders",
    "dashboard.my_vault": "My vault", "dashboard.ai_question": "What should I do now?",
    "dashboard.ai_desc": "AI analyzes your situation and suggests actions.",
    "dashboard.alerts": "Alerts & Actions", "dashboard.all_good": "Everything is up to date! 🎉",
    "dashboard.unpaid_this_month": "unpaid rent(s) this month",
    "dashboard.active_reminders": "active reminder(s)", "dashboard.occupancy": "Occupancy rate",
    "dashboard.vacant": "vacant", "dashboard.revenue_trend": "Revenue trend (6 months)",
    "dashboard.legal_disclaimer": "This application provides administrative assistance only.",
    "common.save": "Save", "common.cancel": "Cancel", "common.delete": "Delete",
    "common.edit": "Edit", "common.add": "Add", "common.search": "Search",
    "common.back": "Back", "common.loading": "Loading...", "common.no_data": "No data",
    "common.paid": "Paid", "common.unpaid": "Unpaid", "common.active": "Active",
    "common.terminated": "Terminated", "common.all": "All", "common.month": "Month", "common.year": "Year",
    "common.continue": "Continue", "common.skip": "Skip", "common.finish": "Finish",
    "onboarding.title": "Setting up your workspace",
    "onboarding.step0": "Plan & Country", "onboarding.step1": "Owner Profile",
    "onboarding.step2": "Add Property", "onboarding.step3": "OTA Connection",
    "onboarding.step4": "Add Tenant", "onboarding.step5": "Inventory Report",
    "onboarding.step6": "Documents", "onboarding.step7": "Activation",
    "trial.free": "Free trial", "trial.days_left": "day(s) left",
    "trial.choose_plan": "Choose a plan",
  },
  es: {
    "nav.dashboard": "Panel", "nav.properties": "Inmuebles", "nav.tenants": "Inquilinos",
    "nav.documents": "Documentos", "nav.payments": "Pagos", "nav.inventory": "Inventarios",
    "nav.receipts": "Recibos", "nav.leases": "Contratos", "nav.reminders": "Recordatorios",
    "nav.vault": "Bóveda", "nav.settings": "Configuración", "nav.seasonal": "Alquiler vacacional",
    "nav.finances": "Finanzas", "nav.expenses": "Gastos", "nav.assistant": "Asistente IA",
    "nav.buildings": "Edificios", "nav.candidates": "Candidatos", "nav.notices": "Avisos de pago",
    "nav.dunning": "Reclamaciones", "nav.furniture": "Mobiliario", "nav.charges": "Regularización",
    "nav.fiscal": "Informe fiscal", "nav.company": "Contactos", "nav.interventions": "Intervenciones",
    "nav.tasks": "Tareas", "nav.notes": "Notas", "nav.messages": "Mensajes",
    "nav.billing": "Suscripción", "nav.logout": "Cerrar sesión",
    "section.essential": "ESENCIAL", "section.rental": "ALQUILER", "section.more": "MÁS",
    "badge.landlord": "Área propietario",
    "dashboard.hello": "Hola 👋", "dashboard.summary": "Resumen de tu situación.",
    "dashboard.properties": "Inmuebles", "dashboard.tenants_count": "inquilino(s)",
    "dashboard.collected": "Cobrado este mes", "dashboard.unpaid": "impagados",
    "dashboard.documents": "Documentos", "dashboard.generated": "generados",
    "dashboard.vault": "Bóveda", "dashboard.files": "archivo(s)",
    "dashboard.quick_actions": "Acciones rápidas", "dashboard.generate_receipt": "Generar recibo",
    "dashboard.create_lease": "Crear contrato", "dashboard.view_reminders": "Ver recordatorios",
    "dashboard.my_vault": "Mi bóveda", "dashboard.ai_question": "¿Qué debo hacer ahora?",
    "dashboard.ai_desc": "La IA analiza tu situación y propone acciones.",
    "dashboard.alerts": "Alertas y acciones", "dashboard.all_good": "¡Todo está al día! 🎉",
    "dashboard.unpaid_this_month": "alquiler(es) impagado(s) este mes",
    "dashboard.active_reminders": "recordatorio(s) activo(s)", "dashboard.occupancy": "Tasa de ocupación",
    "dashboard.vacant": "vacante(s)", "dashboard.revenue_trend": "Tendencia ingresos (6 meses)",
    "dashboard.legal_disclaimer": "Esta aplicación proporciona asistencia administrativa únicamente.",
    "common.save": "Guardar", "common.cancel": "Cancelar", "common.delete": "Eliminar",
    "common.edit": "Editar", "common.add": "Añadir", "common.search": "Buscar",
    "common.back": "Volver", "common.loading": "Cargando...", "common.no_data": "Sin datos",
    "common.paid": "Pagado", "common.unpaid": "Impago", "common.active": "Activo",
    "common.terminated": "Rescindido", "common.all": "Todos", "common.month": "Mes", "common.year": "Año",
    "common.continue": "Continuar", "common.skip": "Omitir", "common.finish": "Finalizar",
    "onboarding.title": "Configuración de tu espacio",
    "onboarding.step0": "Plan y País", "onboarding.step1": "Perfil propietario",
    "onboarding.step2": "Añadir inmueble", "onboarding.step3": "Conexión OTA",
    "onboarding.step4": "Añadir inquilino", "onboarding.step5": "Inventario",
    "onboarding.step6": "Documentos", "onboarding.step7": "Activación",
    "trial.free": "Prueba gratuita", "trial.days_left": "día(s) restante(s)",
    "trial.choose_plan": "Elegir un plan",
  },
  de: {
    "nav.dashboard": "Dashboard", "nav.properties": "Immobilien", "nav.tenants": "Mieter",
    "nav.documents": "Dokumente", "nav.payments": "Zahlungen", "nav.inventory": "Bestandsaufnahmen",
    "nav.receipts": "Quittungen", "nav.leases": "Mietverträge", "nav.reminders": "Erinnerungen",
    "nav.vault": "Tresor", "nav.settings": "Einstellungen", "nav.seasonal": "Ferienvermietung",
    "nav.finances": "Finanzen", "nav.expenses": "Ausgaben", "nav.assistant": "KI-Assistent",
    "nav.buildings": "Gebäude", "nav.candidates": "Bewerber", "nav.notices": "Zahlungshinweise",
    "nav.dunning": "Mahnungen", "nav.furniture": "Möbel", "nav.charges": "Nebenkostenabrechnung",
    "nav.fiscal": "Steuerbericht", "nav.company": "Kontakte", "nav.interventions": "Eingriffe",
    "nav.tasks": "Aufgaben", "nav.notes": "Notizen", "nav.messages": "Nachrichten",
    "nav.billing": "Abonnement", "nav.logout": "Abmelden",
    "section.essential": "WESENTLICH", "section.rental": "VERMIETUNG", "section.more": "MEHR",
    "badge.landlord": "Vermieterbereich",
    "dashboard.hello": "Hallo 👋", "dashboard.summary": "Hier ist eine Übersicht Ihrer Situation.",
    "dashboard.properties": "Immobilien", "dashboard.tenants_count": "Mieter",
    "dashboard.collected": "Diesen Monat eingezogen", "dashboard.unpaid": "unbezahlt",
    "dashboard.documents": "Dokumente", "dashboard.generated": "erstellt",
    "dashboard.vault": "Tresor", "dashboard.files": "Datei(en)",
    "dashboard.quick_actions": "Schnellaktionen", "dashboard.generate_receipt": "Quittung erstellen",
    "dashboard.create_lease": "Mietvertrag erstellen", "dashboard.view_reminders": "Erinnerungen anzeigen",
    "dashboard.my_vault": "Mein Tresor", "dashboard.ai_question": "Was soll ich jetzt tun?",
    "dashboard.ai_desc": "KI analysiert Ihre Situation und schlägt Aktionen vor.",
    "dashboard.alerts": "Alarme & Aktionen", "dashboard.all_good": "Alles auf dem neuesten Stand! 🎉",
    "dashboard.unpaid_this_month": "unbezahlte Miete(n) diesen Monat",
    "dashboard.active_reminders": "aktive Erinnerung(en)", "dashboard.occupancy": "Auslastung",
    "dashboard.vacant": "leer", "dashboard.revenue_trend": "Umsatztrend (6 Monate)",
    "dashboard.legal_disclaimer": "Diese Anwendung bietet nur administrative Unterstützung.",
    "common.save": "Speichern", "common.cancel": "Abbrechen", "common.delete": "Löschen",
    "common.edit": "Bearbeiten", "common.add": "Hinzufügen", "common.search": "Suchen",
    "common.back": "Zurück", "common.loading": "Laden...", "common.no_data": "Keine Daten",
    "common.paid": "Bezahlt", "common.unpaid": "Unbezahlt", "common.active": "Aktiv",
    "common.terminated": "Beendet", "common.all": "Alle", "common.month": "Monat", "common.year": "Jahr",
    "common.continue": "Weiter", "common.skip": "Überspringen", "common.finish": "Abschließen",
    "onboarding.title": "Einrichtung Ihres Arbeitsbereichs",
    "onboarding.step0": "Plan & Land", "onboarding.step1": "Eigentümerprofil",
    "onboarding.step2": "Immobilie hinzufügen", "onboarding.step3": "OTA-Verbindung",
    "onboarding.step4": "Mieter hinzufügen", "onboarding.step5": "Bestandsaufnahme",
    "onboarding.step6": "Dokumente", "onboarding.step7": "Aktivierung",
    "trial.free": "Kostenlose Testversion", "trial.days_left": "Tag(e) verbleibend",
    "trial.choose_plan": "Plan wählen",
  },
  it: {
    "nav.dashboard": "Cruscotto", "nav.properties": "Immobili", "nav.tenants": "Inquilini",
    "nav.documents": "Documenti", "nav.payments": "Pagamenti", "nav.inventory": "Inventari",
    "nav.receipts": "Ricevute", "nav.leases": "Contratti", "nav.reminders": "Promemoria",
    "nav.vault": "Cassaforte", "nav.settings": "Impostazioni", "nav.seasonal": "Affitto stagionale",
    "nav.finances": "Finanze", "nav.expenses": "Spese", "nav.assistant": "Assistente IA",
    "nav.buildings": "Edifici", "nav.candidates": "Candidati", "nav.notices": "Avvisi di pagamento",
    "nav.dunning": "Solleciti", "nav.furniture": "Arredamento", "nav.charges": "Regolarizzazione",
    "nav.fiscal": "Report fiscale", "nav.company": "Contatti", "nav.interventions": "Interventi",
    "nav.tasks": "Attività", "nav.notes": "Note", "nav.messages": "Messaggi",
    "nav.billing": "Abbonamento", "nav.logout": "Esci",
    "section.essential": "ESSENZIALE", "section.rental": "AFFITTO", "section.more": "ALTRO",
    "badge.landlord": "Area proprietario",
    "dashboard.hello": "Ciao 👋", "dashboard.summary": "Ecco un riepilogo della tua situazione.",
    "dashboard.properties": "Immobili", "dashboard.tenants_count": "inquilino/i",
    "dashboard.collected": "Incassato questo mese", "dashboard.unpaid": "non pagati",
    "dashboard.documents": "Documenti", "dashboard.generated": "generati",
    "dashboard.vault": "Cassaforte", "dashboard.files": "file",
    "dashboard.quick_actions": "Azioni rapide", "dashboard.generate_receipt": "Genera ricevuta",
    "dashboard.create_lease": "Crea contratto", "dashboard.view_reminders": "Vedi promemoria",
    "dashboard.my_vault": "La mia cassaforte", "dashboard.ai_question": "Cosa devo fare adesso?",
    "dashboard.ai_desc": "L'IA analizza la tua situazione e propone azioni.",
    "dashboard.alerts": "Avvisi e azioni", "dashboard.all_good": "Tutto aggiornato! 🎉",
    "dashboard.unpaid_this_month": "affitto/i non pagato/i questo mese",
    "dashboard.active_reminders": "promemoria attivo/i", "dashboard.occupancy": "Tasso di occupazione",
    "dashboard.vacant": "vacante/i", "dashboard.revenue_trend": "Tendenza ricavi (6 mesi)",
    "dashboard.legal_disclaimer": "Questa applicazione fornisce solo assistenza amministrativa.",
    "common.save": "Salva", "common.cancel": "Annulla", "common.delete": "Elimina",
    "common.edit": "Modifica", "common.add": "Aggiungi", "common.search": "Cerca",
    "common.back": "Indietro", "common.loading": "Caricamento...", "common.no_data": "Nessun dato",
    "common.paid": "Pagato", "common.unpaid": "Non pagato", "common.active": "Attivo",
    "common.terminated": "Terminato", "common.all": "Tutti", "common.month": "Mese", "common.year": "Anno",
    "common.continue": "Continua", "common.skip": "Salta", "common.finish": "Fine",
    "onboarding.title": "Configurazione dello spazio",
    "onboarding.step0": "Piano e Paese", "onboarding.step1": "Profilo proprietario",
    "onboarding.step2": "Aggiungi immobile", "onboarding.step3": "Connessione OTA",
    "onboarding.step4": "Aggiungi inquilino", "onboarding.step5": "Inventario",
    "onboarding.step6": "Documenti", "onboarding.step7": "Attivazione",
    "trial.free": "Prova gratuita", "trial.days_left": "giorno/i rimanente/i",
    "trial.choose_plan": "Scegli un piano",
  },
  pt: {
    "nav.dashboard": "Painel", "nav.properties": "Imóveis", "nav.tenants": "Inquilinos",
    "nav.documents": "Documentos", "nav.payments": "Pagamentos", "nav.inventory": "Inventários",
    "nav.receipts": "Recibos", "nav.leases": "Contratos", "nav.reminders": "Lembretes",
    "nav.vault": "Cofre", "nav.settings": "Configurações", "nav.seasonal": "Aluguel temporário",
    "nav.finances": "Finanças", "nav.expenses": "Despesas", "nav.assistant": "Assistente IA",
    "nav.buildings": "Edifícios", "nav.candidates": "Candidatos", "nav.notices": "Avisos de pagamento",
    "nav.dunning": "Cobranças", "nav.furniture": "Mobiliário", "nav.charges": "Regularização",
    "nav.fiscal": "Relatório fiscal", "nav.company": "Contatos", "nav.interventions": "Intervenções",
    "nav.tasks": "Tarefas", "nav.notes": "Notas", "nav.messages": "Mensagens",
    "nav.billing": "Assinatura", "nav.logout": "Sair",
    "section.essential": "ESSENCIAL", "section.rental": "ALUGUEL", "section.more": "MAIS",
    "badge.landlord": "Área do proprietário",
    "dashboard.hello": "Olá 👋", "dashboard.summary": "Aqui está um resumo da sua situação.",
    "dashboard.properties": "Imóveis", "dashboard.tenants_count": "inquilino(s)",
    "dashboard.collected": "Recebido este mês", "dashboard.unpaid": "não pagos",
    "dashboard.documents": "Documentos", "dashboard.generated": "gerados",
    "dashboard.vault": "Cofre", "dashboard.files": "arquivo(s)",
    "dashboard.quick_actions": "Ações rápidas", "dashboard.generate_receipt": "Gerar recibo",
    "dashboard.create_lease": "Criar contrato", "dashboard.view_reminders": "Ver lembretes",
    "dashboard.my_vault": "Meu cofre", "dashboard.ai_question": "O que devo fazer agora?",
    "dashboard.ai_desc": "IA analisa sua situação e sugere ações.",
    "dashboard.alerts": "Alertas e ações", "dashboard.all_good": "Tudo atualizado! 🎉",
    "dashboard.unpaid_this_month": "aluguel(is) não pago(s) este mês",
    "dashboard.active_reminders": "lembrete(s) ativo(s)", "dashboard.occupancy": "Taxa de ocupação",
    "dashboard.vacant": "vago(s)", "dashboard.revenue_trend": "Tendência receita (6 meses)",
    "dashboard.legal_disclaimer": "Este aplicativo fornece apenas assistência administrativa.",
    "common.save": "Salvar", "common.cancel": "Cancelar", "common.delete": "Excluir",
    "common.edit": "Editar", "common.add": "Adicionar", "common.search": "Pesquisar",
    "common.back": "Voltar", "common.loading": "Carregando...", "common.no_data": "Sem dados",
    "common.paid": "Pago", "common.unpaid": "Não pago", "common.active": "Ativo",
    "common.terminated": "Encerrado", "common.all": "Todos", "common.month": "Mês", "common.year": "Ano",
    "common.continue": "Continuar", "common.skip": "Pular", "common.finish": "Finalizar",
    "onboarding.title": "Configuração do espaço",
    "onboarding.step0": "Plano e País", "onboarding.step1": "Perfil do proprietário",
    "onboarding.step2": "Adicionar imóvel", "onboarding.step3": "Conexão OTA",
    "onboarding.step4": "Adicionar inquilino", "onboarding.step5": "Inventário",
    "onboarding.step6": "Documentos", "onboarding.step7": "Ativação",
    "trial.free": "Teste gratuito", "trial.days_left": "dia(s) restante(s)",
    "trial.choose_plan": "Escolher um plano",
  },
};

interface I18nContextType {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: string) => string;
  availableLocales: { value: Locale; label: string }[];
}

const I18nContext = createContext<I18nContextType | null>(null);

const availableLocales: { value: Locale; label: string }[] = [
  { value: "fr", label: "Français" },
  { value: "en", label: "English" },
  { value: "es", label: "Español" },
  { value: "de", label: "Deutsch" },
  { value: "it", label: "Italiano" },
  { value: "pt", label: "Português" },
];

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => {
    const saved = localStorage.getItem("app_locale") as Locale;
    return saved && translations[saved] ? saved : "fr";
  });

  /* Sync locale from profile on login */
  useEffect(() => {
    const syncLocale = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;
      const { data } = await supabase
        .from("profiles")
        .select("locale")
        .eq("id", session.user.id)
        .single();
      if (data?.locale && translations[data.locale as Locale]) {
        setLocaleState(data.locale as Locale);
        localStorage.setItem("app_locale", data.locale);
      }
    };
    syncLocale();
  }, []);

  const setLocale = useCallback(async (l: Locale) => {
    setLocaleState(l);
    localStorage.setItem("app_locale", l);
    // Persist to profile
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      await supabase.from("profiles").update({ locale: l }).eq("id", session.user.id);
    }
  }, []);

  const t = useCallback((key: string): string => {
    return translations[locale]?.[key] || translations.fr[key] || key;
  }, [locale]);

  return (
    <I18nContext.Provider value={{ locale, setLocale, t, availableLocales }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}
