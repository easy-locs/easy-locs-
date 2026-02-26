import { useState, useEffect, useMemo } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Download, AlertTriangle, TrendingUp, TrendingDown, Calculator, PiggyBank } from "lucide-react";
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

const FiscalReport = () => {
  const { orgId } = useAuth();
  const [rentCalls, setRentCalls] = useState<RentCall[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [year, setYear] = useState(new Date().getFullYear() - 1);
  const [expenses, setExpenses] = useState({
    taxeFonciere: 0,
    assurance: 0,
    travauxEntretien: 0,
    fraisGestion: 0,
    interetsEmprunt: 0,
    chargesRecuperables: 0,
    autresFrais: 0,
  });
  const [loading, setLoading] = useState(true);

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

    const totalExpenses = Object.values(expenses).reduce((s, v) => s + v, 0);
    const revenuNet = totalBrut - totalExpenses;
    const regime = totalBrut <= 15000 ? "micro-foncier" : "réel";
    const abattementMicroFoncier = regime === "micro-foncier" ? totalBrut * 0.3 : 0;
    const revenuImposable = regime === "micro-foncier" ? totalBrut - abattementMicroFoncier : revenuNet;

    return {
      revenusBruts,
      chargesRecuperees,
      totalBrut,
      totalExpenses,
      revenuNet,
      regime,
      abattementMicroFoncier,
      revenuImposable,
      yearCalls: yearCalls.length,
      paidCalls: paidCalls.length,
    };
  }, [rentCalls, year, expenses]);

  const fmt = (n: number) => n.toLocaleString("fr-FR", { style: "currency", currency: "EUR" });

  const handleExport = () => {
    const rows = [
      { poste: "Loyers bruts encaissés", montant: report.revenusBruts },
      { poste: "Charges récupérées", montant: report.chargesRecuperees },
      { poste: "TOTAL REVENUS BRUTS", montant: report.totalBrut },
      { poste: "---", montant: 0 },
      { poste: "Taxe foncière", montant: -expenses.taxeFonciere },
      { poste: "Assurance PNO", montant: -expenses.assurance },
      { poste: "Travaux d'entretien", montant: -expenses.travauxEntretien },
      { poste: "Frais de gestion", montant: -expenses.fraisGestion },
      { poste: "Intérêts d'emprunt", montant: -expenses.interetsEmprunt },
      { poste: "Charges récupérables", montant: -expenses.chargesRecuperables },
      { poste: "Autres frais", montant: -expenses.autresFrais },
      { poste: "TOTAL CHARGES DÉDUCTIBLES", montant: -report.totalExpenses },
      { poste: "---", montant: 0 },
      { poste: `REVENU FONCIER IMPOSABLE (${report.regime})`, montant: report.revenuImposable },
    ];
    exportToCSV(rows as any, `bilan_fiscal_${year}`, [
      { key: "poste", label: "Poste" },
      { key: "montant", label: "Montant (€)" },
    ]);
  };

  const expenseFields = [
    { key: "taxeFonciere", label: "Taxe foncière", desc: "Ligne 227 du formulaire 2044" },
    { key: "assurance", label: "Assurance PNO", desc: "Propriétaire non-occupant" },
    { key: "travauxEntretien", label: "Travaux d'entretien et réparations", desc: "Ligne 224 — travaux déductibles uniquement" },
    { key: "fraisGestion", label: "Frais de gestion", desc: "Forfait 20 €/lot ou frais réels" },
    { key: "interetsEmprunt", label: "Intérêts d'emprunt", desc: "Ligne 250 — intérêts + assurance emprunteur" },
    { key: "chargesRecuperables", label: "Charges de copropriété (non récupérables)", desc: "Part non récupérable sur le locataire" },
    { key: "autresFrais", label: "Autres frais déductibles", desc: "Frais de procédure, diagnostics, etc." },
  ];

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Bilan fiscal — Revenus fonciers</h1>
            <p className="text-muted-foreground text-sm mt-1">Aide à la déclaration des revenus fonciers (formulaire 2044)</p>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={year}
              onChange={e => setYear(Number(e.target.value))}
              className="bg-background border border-border rounded-lg px-3 py-2 text-sm"
            >
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
            <Card className={report.regime === "micro-foncier" ? "border-accent/30" : "border-orange-500/30"}>
              <CardContent className="p-5">
                <div className="flex items-center gap-3">
                  <Calculator className="h-6 w-6 text-accent" />
                  <div>
                    <p className="font-semibold text-foreground">
                      Régime {report.regime === "micro-foncier" ? "micro-foncier" : "réel"} détecté
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {report.regime === "micro-foncier"
                        ? `Revenus bruts ≤ 15 000 € — abattement forfaitaire de 30 % (${fmt(report.abattementMicroFoncier)})`
                        : "Revenus bruts > 15 000 € — déduction des charges réelles"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <TrendingUp className="h-4 w-4 text-green-500" />
                    <span className="text-xs text-muted-foreground">Revenus bruts</span>
                  </div>
                  <p className="text-lg font-bold text-foreground">{fmt(report.totalBrut)}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <TrendingDown className="h-4 w-4 text-destructive" />
                    <span className="text-xs text-muted-foreground">Charges déduites</span>
                  </div>
                  <p className="text-lg font-bold text-foreground">{fmt(report.totalExpenses)}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <PiggyBank className="h-4 w-4 text-accent" />
                    <span className="text-xs text-muted-foreground">Revenu net</span>
                  </div>
                  <p className="text-lg font-bold text-foreground">{fmt(report.revenuNet)}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <FileText className="h-4 w-4 text-accent" />
                    <span className="text-xs text-muted-foreground">Revenu imposable</span>
                  </div>
                  <p className="text-lg font-bold text-foreground">{fmt(report.revenuImposable)}</p>
                </CardContent>
              </Card>
            </div>

            {/* Revenus */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-green-500" /> Revenus {year}
                </CardTitle>
              </CardHeader>
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
                    <span className="text-foreground">Total revenus bruts (ligne 211)</span>
                    <span className="text-green-600">{fmt(report.totalBrut)}</span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-3">
                  Basé sur {report.paidCalls} paiement(s) encaissé(s) sur {report.yearCalls} appel(s) de loyer en {year}.
                </p>
              </CardContent>
            </Card>

            {/* Charges déductibles */}
            {report.regime === "réel" && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <TrendingDown className="h-5 w-5 text-destructive" /> Charges déductibles {year}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    Saisissez vos dépenses réelles pour l'année {year}. Ces montants seront déduits de vos revenus bruts.
                  </p>
                  <div className="space-y-4">
                    {expenseFields.map(f => (
                      <div key={f.key} className="flex items-center gap-4">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-foreground">{f.label}</p>
                          <p className="text-xs text-muted-foreground">{f.desc}</p>
                        </div>
                        <input
                          type="number"
                          min={0}
                          step={0.01}
                          value={(expenses as any)[f.key] || ""}
                          onChange={e => setExpenses(prev => ({ ...prev, [f.key]: Number(e.target.value) }))}
                          placeholder="0.00"
                          className="w-32 bg-background border border-border rounded-lg px-3 py-2 text-sm text-right"
                        />
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
                    <span className="text-muted-foreground">Revenus bruts fonciers (ligne 211)</span>
                    <span className="text-foreground font-medium">{fmt(report.totalBrut)}</span>
                  </div>
                  {report.regime === "micro-foncier" ? (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Abattement 30 %</span>
                      <span className="text-green-600 font-medium">-{fmt(report.abattementMicroFoncier)}</span>
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
                  {report.revenuImposable < 0 && (
                    <p className="text-xs text-green-600 mt-1">
                      Déficit foncier de {fmt(Math.abs(report.revenuImposable))} — imputable sur votre revenu global (max 10 700 €/an).
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Biens possédés */}
            {properties.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Biens déclarés</CardTitle>
                </CardHeader>
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

        <div className="flex items-start gap-3 bg-muted/50 rounded-lg p-4">
          <AlertTriangle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground">
            Ce bilan est une aide à la déclaration et ne constitue pas un conseil fiscal. 
            Consultez un expert-comptable ou les services fiscaux pour votre déclaration définitive. 
            Formulaire 2044 disponible sur impots.gouv.fr.
          </p>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default FiscalReport;
