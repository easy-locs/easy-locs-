import { useState, useEffect, useMemo } from "react";
import FeatureGate from "@/components/subscription/FeatureGate";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Download, AlertTriangle, TrendingUp, TrendingDown, Calculator, PiggyBank, Globe, ChevronRight } from "lucide-react";
import { exportToCSV } from "@/lib/csv-export";

interface RentCall {
  month: string;
  rent_amount: number;
  charges_amount: number;
  total_amount: number;
  paid: boolean | null;
}

interface Property {
  id: string;
  label: string;
  monthly_rent: number;
  monthly_charges: number;
  address: string;
  city: string;
}

// Country-specific fiscal configurations
const FISCAL_CONFIGS: Record<string, {
  label: string;
  flag: string;
  formName: string;
  microThreshold: number;
  microRate: number;
  microLabel: string;
  realLabel: string;
  deficitMax: number | null;
  deficitLabel: string;
  taxAuthority: string;
  taxUrl: string;
  lawDepotUrl: string;
  expenseFields: { key: string; label: string; desc: string }[];
}> = {
  FR: {
    label: "France", flag: "🇫🇷", formName: "Formulaire 2044",
    microThreshold: 15000, microRate: 0.3, microLabel: "Micro-foncier", realLabel: "Réel",
    deficitMax: 10700, deficitLabel: "Déficit foncier imputable sur le revenu global",
    taxAuthority: "impots.gouv.fr", taxUrl: "https://www.impots.gouv.fr",
    lawDepotUrl: "https://www.lawdepot.com/contracts/tax-declaration/",
    expenseFields: [
      { key: "taxeFonciere", label: "Taxe foncière", desc: "Ligne 227 du formulaire 2044" },
      { key: "assurance", label: "Assurance PNO", desc: "Propriétaire non-occupant" },
      { key: "travauxEntretien", label: "Travaux d'entretien et réparations", desc: "Ligne 224 — travaux déductibles uniquement" },
      { key: "fraisGestion", label: "Frais de gestion", desc: "Forfait 20 €/lot ou frais réels" },
      { key: "interetsEmprunt", label: "Intérêts d'emprunt", desc: "Ligne 250 — intérêts + assurance emprunteur" },
      { key: "chargesRecuperables", label: "Charges de copropriété (non récupérables)", desc: "Part non récupérable sur le locataire" },
      { key: "autresFrais", label: "Autres frais déductibles", desc: "Frais de procédure, diagnostics, etc." },
    ],
  },
  BE: {
    label: "Belgique", flag: "🇧🇪", formName: "Déclaration IPP",
    microThreshold: 0, microRate: 0, microLabel: "Forfaitaire", realLabel: "Réel",
    deficitMax: null, deficitLabel: "Revenu cadastral × coefficient de revalorisation",
    taxAuthority: "finances.belgium.be", taxUrl: "https://finances.belgium.be",
    lawDepotUrl: "https://www.lawdepot.be/",
    expenseFields: [
      { key: "taxeFonciere", label: "Précompte immobilier", desc: "Taxe annuelle sur le bien" },
      { key: "assurance", label: "Assurance incendie", desc: "Prime annuelle" },
      { key: "travauxEntretien", label: "Travaux d'entretien", desc: "Réparations et entretien" },
      { key: "fraisGestion", label: "Frais de gestion", desc: "Agence immobilière ou gestion propre" },
      { key: "interetsEmprunt", label: "Intérêts d'emprunt", desc: "Crédit hypothécaire" },
      { key: "autresFrais", label: "Autres frais", desc: "Frais divers déductibles" },
    ],
  },
  DE: {
    label: "Deutschland", flag: "🇩🇪", formName: "Anlage V (Einkünfte aus Vermietung)",
    microThreshold: 0, microRate: 0, microLabel: "Pauschal", realLabel: "Tatsächliche Kosten",
    deficitMax: null, deficitLabel: "Verluste aus V+V sind mit anderen Einkünften verrechenbar",
    taxAuthority: "elster.de", taxUrl: "https://www.elster.de",
    lawDepotUrl: "https://www.lawdepot.de/",
    expenseFields: [
      { key: "taxeFonciere", label: "Grundsteuer", desc: "Jährliche Grundsteuer" },
      { key: "assurance", label: "Versicherungen", desc: "Gebäudeversicherung, Haftpflicht" },
      { key: "travauxEntretien", label: "Instandhaltung & Reparaturen", desc: "Erhaltungsaufwand (§ 21 EStG)" },
      { key: "fraisGestion", label: "Verwaltungskosten", desc: "Hausverwaltung, Steuerberater" },
      { key: "interetsEmprunt", label: "Schuldzinsen", desc: "Darlehenszinsen für Finanzierung" },
      { key: "amortissement", label: "AfA (Abschreibung)", desc: "2% p.a. für Gebäude ab 1925, 2.5% davor" },
      { key: "autresFrais", label: "Sonstige Werbungskosten", desc: "Fahrtkosten, Bürokosten, etc." },
    ],
  },
  ES: {
    label: "España", flag: "🇪🇸", formName: "Modelo 100 (IRPF)",
    microThreshold: 0, microRate: 0, microLabel: "Estimación directa simplificada", realLabel: "Estimación directa",
    deficitMax: null, deficitLabel: "Reducción del 60% para vivienda habitual del inquilino",
    taxAuthority: "agenciatributaria.es", taxUrl: "https://www.agenciatributaria.es",
    lawDepotUrl: "https://www.lawdepot.com/es/",
    expenseFields: [
      { key: "taxeFonciere", label: "IBI (Impuesto sobre Bienes Inmuebles)", desc: "Impuesto municipal anual" },
      { key: "assurance", label: "Seguros", desc: "Seguro del hogar, responsabilidad civil" },
      { key: "travauxEntretien", label: "Reparaciones y conservación", desc: "Gastos de mantenimiento" },
      { key: "fraisGestion", label: "Gastos de gestión", desc: "Administración de la propiedad" },
      { key: "interetsEmprunt", label: "Intereses de préstamo", desc: "Hipoteca y gastos financieros" },
      { key: "amortissement", label: "Amortización", desc: "3% sobre el valor de construcción" },
      { key: "autresFrais", label: "Otros gastos deducibles", desc: "Comunidad, tasas, etc." },
    ],
  },
  IT: {
    label: "Italia", flag: "🇮🇹", formName: "Modello 730 / Redditi PF",
    microThreshold: 0, microRate: 0.05, microLabel: "Cedolare secca (21%/10%)", realLabel: "IRPEF ordinaria",
    deficitMax: null, deficitLabel: "Con cedolare secca non si deducono le spese",
    taxAuthority: "agenziaentrate.gov.it", taxUrl: "https://www.agenziaentrate.gov.it",
    lawDepotUrl: "https://www.lawdepot.it/",
    expenseFields: [
      { key: "taxeFonciere", label: "IMU", desc: "Imposta Municipale Unica" },
      { key: "assurance", label: "Assicurazione", desc: "Polizza fabbricato" },
      { key: "travauxEntretien", label: "Manutenzione ordinaria", desc: "Spese di riparazione" },
      { key: "fraisGestion", label: "Spese di gestione", desc: "Amministratore, agenzia" },
      { key: "interetsEmprunt", label: "Interessi passivi", desc: "Mutuo ipotecario" },
      { key: "autresFrais", label: "Altre spese deducibili", desc: "Spese condominiali, registrazione, etc." },
    ],
  },
  GB: {
    label: "United Kingdom", flag: "🇬🇧", formName: "Self Assessment (SA105)",
    microThreshold: 1000, microRate: 0, microLabel: "Property Allowance (£1,000)", realLabel: "Actual Expenses",
    deficitMax: null, deficitLabel: "Rental losses can be carried forward",
    taxAuthority: "gov.uk", taxUrl: "https://www.gov.uk/self-assessment-tax-returns",
    lawDepotUrl: "https://www.lawdepot.co.uk/",
    expenseFields: [
      { key: "taxeFonciere", label: "Council Tax (if applicable)", desc: "Only if landlord is responsible" },
      { key: "assurance", label: "Insurance", desc: "Landlord insurance, building insurance" },
      { key: "travauxEntretien", label: "Repairs & Maintenance", desc: "Allowable repairs only (not improvements)" },
      { key: "fraisGestion", label: "Management fees", desc: "Letting agent fees, accountant" },
      { key: "interetsEmprunt", label: "Finance costs (20% credit)", desc: "Mortgage interest — 20% tax credit only" },
      { key: "autresFrais", label: "Other allowable expenses", desc: "Travel, legal fees, ground rent" },
    ],
  },
  PT: {
    label: "Portugal", flag: "🇵🇹", formName: "IRS (Categoria F)",
    microThreshold: 0, microRate: 0, microLabel: "Taxa autónoma 28%", realLabel: "Englobamento",
    deficitMax: null, deficitLabel: "Rendimentos prediais — taxa autónoma ou englobamento",
    taxAuthority: "portaldasfinancas.gov.pt", taxUrl: "https://www.portaldasfinancas.gov.pt",
    lawDepotUrl: "https://www.lawdepot.com/pt/",
    expenseFields: [
      { key: "taxeFonciere", label: "IMI", desc: "Imposto Municipal sobre Imóveis" },
      { key: "assurance", label: "Seguros", desc: "Seguro obrigatório do imóvel" },
      { key: "travauxEntretien", label: "Conservação e manutenção", desc: "Despesas de reparação" },
      { key: "fraisGestion", label: "Despesas de gestão", desc: "Administração do imóvel" },
      { key: "autresFrais", label: "Outras despesas", desc: "Condomínio, certificado energético, etc." },
    ],
  },
  CH: {
    label: "Suisse", flag: "🇨🇭", formName: "Déclaration d'impôt (revenus immobiliers)",
    microThreshold: 0, microRate: 0, microLabel: "Forfait d'entretien", realLabel: "Frais effectifs",
    deficitMax: null, deficitLabel: "Déduction forfaitaire 10-20% ou frais effectifs",
    taxAuthority: "estv.admin.ch", taxUrl: "https://www.estv.admin.ch",
    lawDepotUrl: "https://www.lawdepot.ch/",
    expenseFields: [
      { key: "taxeFonciere", label: "Impôt foncier", desc: "Impôt cantonal/communal" },
      { key: "assurance", label: "Assurances", desc: "Bâtiment, RC propriétaire" },
      { key: "travauxEntretien", label: "Frais d'entretien", desc: "Entretien et réparations (forfait ou effectif)" },
      { key: "fraisGestion", label: "Frais d'administration", desc: "Gérance, frais bancaires" },
      { key: "interetsEmprunt", label: "Intérêts hypothécaires", desc: "Intérêts passifs déductibles" },
      { key: "autresFrais", label: "Autres frais", desc: "Frais divers déductibles" },
    ],
  },
  NL: {
    label: "Nederland", flag: "🇳🇱", formName: "Aangifte inkomstenbelasting (Box 3)",
    microThreshold: 0, microRate: 0, microLabel: "Box 3 (forfaitair rendement)", realLabel: "Box 3",
    deficitMax: null, deficitLabel: "In Nederland wordt onroerend goed belast via Box 3 (forfaitair rendement op vermogen)",
    taxAuthority: "belastingdienst.nl", taxUrl: "https://www.belastingdienst.nl",
    lawDepotUrl: "https://www.lawdepot.com/nl/",
    expenseFields: [
      { key: "autresFrais", label: "Geen aftrekbare kosten in Box 3", desc: "In Box 3 worden werkelijke kosten niet afgetrokken" },
    ],
  },
  AT: {
    label: "Österreich", flag: "🇦🇹", formName: "Einkommensteuererklärung (E1)",
    microThreshold: 0, microRate: 0, microLabel: "Pauschal", realLabel: "Tatsächliche Kosten",
    deficitMax: null, deficitLabel: "Verluste können vorgetragen werden",
    taxAuthority: "bmf.gv.at", taxUrl: "https://www.bmf.gv.at",
    lawDepotUrl: "https://www.lawdepot.at/",
    expenseFields: [
      { key: "taxeFonciere", label: "Grundsteuer", desc: "Jährliche Grundsteuer" },
      { key: "assurance", label: "Versicherungen", desc: "Gebäudeversicherung" },
      { key: "travauxEntretien", label: "Instandhaltung", desc: "Erhaltungsaufwand" },
      { key: "fraisGestion", label: "Verwaltungskosten", desc: "Hausverwaltung" },
      { key: "interetsEmprunt", label: "Schuldzinsen", desc: "Kreditfinanzierung" },
      { key: "amortissement", label: "AfA", desc: "1,5% p.a. Abschreibung" },
      { key: "autresFrais", label: "Sonstige Werbungskosten", desc: "Diverse Aufwendungen" },
    ],
  },
  LU: {
    label: "Luxembourg", flag: "🇱🇺", formName: "Déclaration d'impôt (revenus de location)",
    microThreshold: 0, microRate: 0, microLabel: "Forfaitaire", realLabel: "Frais réels",
    deficitMax: null, deficitLabel: "Revenus de location et de fermage",
    taxAuthority: "impotsdirects.public.lu", taxUrl: "https://impotsdirects.public.lu",
    lawDepotUrl: "https://www.lawdepot.be/",
    expenseFields: [
      { key: "taxeFonciere", label: "Impôt foncier", desc: "Taxe communale" },
      { key: "assurance", label: "Assurances", desc: "Assurance bâtiment" },
      { key: "travauxEntretien", label: "Frais d'entretien", desc: "Réparations" },
      { key: "interetsEmprunt", label: "Intérêts débiteurs", desc: "Crédit immobilier" },
      { key: "amortissement", label: "Amortissement", desc: "2-6% selon l'âge du bâtiment" },
      { key: "autresFrais", label: "Autres frais", desc: "Frais divers" },
    ],
  },
};

// Default fallback for countries not specifically configured
const DEFAULT_CONFIG = {
  label: "International", flag: "🌍", formName: "Tax Declaration",
  microThreshold: 0, microRate: 0, microLabel: "Simplified", realLabel: "Actual costs",
  deficitMax: null, deficitLabel: "Consult a local tax advisor",
  taxAuthority: "lawdepot.com", taxUrl: "https://www.lawdepot.com",
  lawDepotUrl: "https://www.lawdepot.com/contracts/tax-declaration/",
  expenseFields: [
    { key: "taxeFonciere", label: "Property Tax", desc: "Annual property tax" },
    { key: "assurance", label: "Insurance", desc: "Building insurance" },
    { key: "travauxEntretien", label: "Maintenance & Repairs", desc: "Repair costs" },
    { key: "fraisGestion", label: "Management fees", desc: "Administration costs" },
    { key: "interetsEmprunt", label: "Loan interest", desc: "Mortgage interest" },
    { key: "autresFrais", label: "Other deductible expenses", desc: "Miscellaneous" },
  ],
};

const FiscalReport = () => {
  const { orgId, user } = useAuth();
  const [rentCalls, setRentCalls] = useState<RentCall[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [year, setYear] = useState(new Date().getFullYear() - 1);
  const [expenses, setExpenses] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [userCountry, setUserCountry] = useState("FR");
  const [manualRegime, setManualRegime] = useState<"auto" | "micro" | "real">("auto");

  const config = FISCAL_CONFIGS[userCountry] || DEFAULT_CONFIG;

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("country").eq("id", user.id).single()
      .then(({ data }) => { if (data?.country) setUserCountry(data.country); });
  }, [user]);

  useEffect(() => {
    if (!orgId) return;
    Promise.all([
      supabase.from("rent_calls").select("month, rent_amount, charges_amount, total_amount, paid").eq("org_id", orgId),
      supabase.from("properties").select("id, label, monthly_rent, monthly_charges, address, city").eq("org_id", orgId),
    ]).then(([rc, p]) => {
      setRentCalls((rc.data || []) as RentCall[]);
      setProperties((p.data || []) as Property[]);
      setLoading(false);
    });
  }, [orgId]);

  const report = useMemo(() => {
    const yearCalls = rentCalls.filter(r => r.month.startsWith(String(year)));
    const paidCalls = yearCalls.filter(r => r.paid);

    const revenusBruts = paidCalls.reduce((s, r) => s + Number(r.rent_amount), 0);
    const chargesRecuperees = paidCalls.reduce((s, r) => s + Number(r.charges_amount), 0);
    const totalBrut = revenusBruts + chargesRecuperees;

    const totalExpenses = Object.values(expenses).reduce((s, v) => s + (v || 0), 0);
    const revenuNet = totalBrut - totalExpenses;

    const hasMicro = config.microThreshold > 0;
    const autoRegime = hasMicro && totalBrut <= config.microThreshold ? "micro" : "real";
    const regime = manualRegime === "auto" ? autoRegime : manualRegime;
    const abattement = regime === "micro" && config.microRate > 0 ? totalBrut * config.microRate : 0;
    const revenuImposable = regime === "micro" ? totalBrut - abattement : revenuNet;

    return {
      revenusBruts, chargesRecuperees, totalBrut, totalExpenses, revenuNet,
      regime, autoRegime, hasMicro, abattement, revenuImposable,
      yearCalls: yearCalls.length, paidCalls: paidCalls.length,
    };
  }, [rentCalls, year, expenses, manualRegime, config]);

  const fmt = (n: number) => {
    const currencyMap: Record<string, string> = {
      GB: "GBP", US: "USD", CH: "CHF", JP: "JPY", BR: "BRL", MX: "MXN", MA: "MAD",
    };
    const currency = currencyMap[userCountry] || "EUR";
    const localeMap: Record<string, string> = {
      FR: "fr-FR", BE: "fr-BE", DE: "de-DE", ES: "es-ES", IT: "it-IT", PT: "pt-PT",
      GB: "en-GB", NL: "nl-NL", CH: "fr-CH", AT: "de-AT", LU: "fr-LU", US: "en-US",
    };
    return n.toLocaleString(localeMap[userCountry] || "en-US", { style: "currency", currency });
  };

  const handleExport = () => {
    const rows = [
      { poste: "Revenus bruts encaissés", montant: report.revenusBruts },
      { poste: "Charges récupérées", montant: report.chargesRecuperees },
      { poste: "TOTAL REVENUS BRUTS", montant: report.totalBrut },
      { poste: "---", montant: 0 },
      ...config.expenseFields.map(f => ({ poste: f.label, montant: -(expenses[f.key] || 0) })),
      { poste: "TOTAL CHARGES DÉDUCTIBLES", montant: -report.totalExpenses },
      { poste: "---", montant: 0 },
      { poste: `REVENU IMPOSABLE (${report.regime === "micro" ? config.microLabel : config.realLabel})`, montant: report.revenuImposable },
    ];
    exportToCSV(rows as any, `bilan_fiscal_${userCountry}_${year}`, [
      { key: "poste", label: "Poste" },
      { key: "montant", label: "Montant" },
    ]);
  };

  return (
    <DashboardLayout>
      <FeatureGate feature="legal_documents" featureLabel="Rapport fiscal">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              {config.flag} Bilan fiscal — Revenus fonciers
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              {config.formName} • {config.label}
            </p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <select value={userCountry} onChange={e => setUserCountry(e.target.value)}
              className="bg-background border border-border rounded-lg px-3 py-2 text-sm">
              {Object.entries(FISCAL_CONFIGS).map(([code, cfg]) => (
                <option key={code} value={code}>{cfg.flag} {cfg.label}</option>
              ))}
            </select>
            <select value={year} onChange={e => setYear(Number(e.target.value))}
              className="bg-background border border-border rounded-lg px-3 py-2 text-sm">
              {[...Array(5)].map((_, i) => {
                const y = new Date().getFullYear() - i;
                return <option key={y} value={y}>{y}</option>;
              })}
            </select>
            <button onClick={handleExport} className="flex items-center gap-2 bg-accent text-accent-foreground px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90">
              <Download className="h-4 w-4" /> Export CSV
            </button>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Chargement...</div>
        ) : (
          <>
            {/* Régime fiscal */}
            <Card className="border-accent/30">
              <CardContent className="p-5">
                <div className="flex items-center gap-3 mb-3">
                  <Calculator className="h-6 w-6 text-accent" />
                  <div className="flex-1">
                    <p className="font-semibold text-foreground">
                      {report.regime === "micro" ? config.microLabel : config.realLabel}
                      {manualRegime === "auto" ? " (auto-détecté)" : " (choix manuel)"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {report.regime === "micro" && report.hasMicro
                        ? `Revenus ≤ ${fmt(config.microThreshold)} — abattement ${Math.round(config.microRate * 100)}% (${fmt(report.abattement)})`
                        : config.deficitLabel}
                    </p>
                  </div>
                </div>
                {report.hasMicro && (
                  <div className="flex gap-2">
                    {(["auto", "micro", "real"] as const).map(r => (
                      <button key={r} onClick={() => setManualRegime(r)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${manualRegime === r ? "border-accent bg-accent/10 text-accent" : "border-border text-muted-foreground hover:border-accent/40"}`}>
                        {r === "auto" ? `Auto (${report.autoRegime === "micro" ? config.microLabel : config.realLabel})` : r === "micro" ? config.microLabel : config.realLabel}
                      </button>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card><CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1"><TrendingUp className="h-4 w-4 text-green-500" /><span className="text-xs text-muted-foreground">Revenus bruts</span></div>
                <p className="text-lg font-bold text-foreground">{fmt(report.totalBrut)}</p>
              </CardContent></Card>
              <Card><CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1"><TrendingDown className="h-4 w-4 text-destructive" /><span className="text-xs text-muted-foreground">Charges déduites</span></div>
                <p className="text-lg font-bold text-foreground">{fmt(report.totalExpenses)}</p>
              </CardContent></Card>
              <Card><CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1"><PiggyBank className="h-4 w-4 text-accent" /><span className="text-xs text-muted-foreground">Revenu net</span></div>
                <p className="text-lg font-bold text-foreground">{fmt(report.revenuNet)}</p>
              </CardContent></Card>
              <Card><CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1"><FileText className="h-4 w-4 text-accent" /><span className="text-xs text-muted-foreground">Revenu imposable</span></div>
                <p className="text-lg font-bold text-foreground">{fmt(report.revenuImposable)}</p>
              </CardContent></Card>
            </div>

            {/* Revenus */}
            <Card>
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><TrendingUp className="h-5 w-5 text-green-500" /> Revenus {year}</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between py-2 border-b border-border/50">
                    <span className="text-sm text-foreground">Loyers bruts encaissés</span>
                    <span className="text-sm font-medium text-foreground">{fmt(report.revenusBruts)}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-border/50">
                    <span className="text-sm text-foreground">Charges récupérées</span>
                    <span className="text-sm font-medium text-foreground">{fmt(report.chargesRecuperees)}</span>
                  </div>
                  <div className="flex justify-between py-2 font-semibold">
                    <span className="text-foreground">Total revenus bruts</span>
                    <span className="text-green-600">{fmt(report.totalBrut)}</span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-3">
                  Basé sur {report.paidCalls} paiement(s) encaissé(s) sur {report.yearCalls} appel(s) de loyer en {year}.
                </p>
              </CardContent>
            </Card>

            {/* Charges déductibles */}
            {report.regime === "real" && (
              <Card>
                <CardHeader><CardTitle className="text-base flex items-center gap-2"><TrendingDown className="h-5 w-5 text-destructive" /> Charges déductibles {year}</CardTitle></CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    Saisissez vos dépenses réelles pour l'année {year}.
                  </p>
                  <div className="space-y-4">
                    {config.expenseFields.map(f => (
                      <div key={f.key} className="flex items-center gap-4">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-foreground">{f.label}</p>
                          <p className="text-xs text-muted-foreground">{f.desc}</p>
                        </div>
                        <input type="number" min={0} step={0.01}
                          value={expenses[f.key] || ""}
                          onChange={e => setExpenses(prev => ({ ...prev, [f.key]: Number(e.target.value) }))}
                          placeholder="0.00"
                          className="w-32 bg-background border border-border rounded-lg px-3 py-2 text-sm text-right" />
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between py-3 mt-4 border-t border-border font-semibold">
                    <span className="text-foreground">Total charges déductibles</span>
                    <span className="text-destructive">{fmt(report.totalExpenses)}</span>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Résumé */}
            <Card className="border-accent/30 bg-accent/5">
              <CardContent className="p-6">
                <h3 className="font-semibold text-foreground mb-4">Résumé pour la déclaration {year}</h3>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Revenus bruts fonciers</span>
                    <span className="text-foreground font-medium">{fmt(report.totalBrut)}</span>
                  </div>
                  {report.regime === "micro" ? (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Abattement {config.microLabel}</span>
                      <span className="text-green-600 font-medium">-{fmt(report.abattement)}</span>
                    </div>
                  ) : (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Total charges déductibles</span>
                      <span className="text-destructive font-medium">-{fmt(report.totalExpenses)}</span>
                    </div>
                  )}
                  <div className="flex justify-between pt-2 border-t border-border text-base font-bold">
                    <span className="text-foreground">Revenu foncier imposable</span>
                    <span className={report.revenuImposable >= 0 ? "text-foreground" : "text-green-600"}>{fmt(report.revenuImposable)}</span>
                  </div>
                  {report.revenuImposable < 0 && config.deficitMax && (
                    <p className="text-xs text-green-600 mt-1">
                      Déficit de {fmt(Math.abs(report.revenuImposable))} — imputable (max {fmt(config.deficitMax)}/an).
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Biens possédés */}
            {properties.length > 0 && (
              <Card>
                <CardHeader><CardTitle className="text-base">Biens déclarés</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {properties.map(p => (
                      <div key={p.id} className="flex justify-between py-2 border-b border-border/50 last:border-0">
                        <div>
                          <p className="text-sm font-medium text-foreground">{p.label}</p>
                          <p className="text-xs text-muted-foreground">{p.address}, {p.city}</p>
                        </div>
                        <p className="text-sm text-foreground">{fmt(p.monthly_rent)}/mois</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}

        {/* Footer */}
        <div className="flex items-start gap-3 bg-muted/50 rounded-lg p-4">
          <AlertTriangle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
          <div>
            <p className="text-xs text-muted-foreground">
              Ce bilan est une aide à la déclaration et ne constitue pas un conseil fiscal. 
              Consultez un expert-comptable ou les services fiscaux de votre pays pour votre déclaration définitive.
            </p>
            <div className="flex flex-wrap gap-3 mt-2">
              <a href={config.taxUrl} target="_blank" rel="noopener noreferrer"
                className="text-xs text-accent hover:underline flex items-center gap-1">
                🏛️ {config.taxAuthority} <ChevronRight className="h-3 w-3" />
              </a>
              <a href={config.lawDepotUrl} target="_blank" rel="noopener noreferrer"
                className="text-xs text-accent hover:underline flex items-center gap-1">
                📄 LawDepot — Aide fiscale <ChevronRight className="h-3 w-3" />
              </a>
            </div>
          </div>
        </div>
      </div>
      </FeatureGate>
    </DashboardLayout>
  );
};

export default FiscalReport;
