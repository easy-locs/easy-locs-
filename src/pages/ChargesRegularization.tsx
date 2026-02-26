import { useState, useEffect, useMemo } from "react";
import FeatureGate from "@/components/subscription/FeatureGate";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calculator, Download, AlertTriangle, Euro, Users } from "lucide-react";
import { exportToCSV } from "@/lib/csv-export";
import { format } from "date-fns";

interface Tenant {
  id: string;
  name: string;
  charges_amount: number;
  property_id: string | null;
}

interface Property {
  id: string;
  label: string;
  monthly_charges: number;
}

const ChargesRegularization = () => {
  const { orgId } = useAuth();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [year, setYear] = useState(new Date().getFullYear() - 1);
  const [realCharges, setRealCharges] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orgId) return;
    Promise.all([
      supabase.from("tenants").select("id, name, charges_amount, property_id").eq("org_id", orgId),
      supabase.from("properties").select("id, label, monthly_charges").eq("org_id", orgId),
    ]).then(([t, p]) => {
      setTenants((t.data || []) as Tenant[]);
      setProperties((p.data || []) as Property[]);
      setLoading(false);
    });
  }, [orgId]);

  const results = useMemo(() => {
    return tenants.map(t => {
      const prop = properties.find(p => p.id === t.property_id);
      const provisionsAnnuelles = (t.charges_amount || prop?.monthly_charges || 0) * 12;
      const chargesReelles = realCharges[t.id] || 0;
      const solde = provisionsAnnuelles - chargesReelles;
      return {
        tenantId: t.id,
        tenantName: t.name,
        propertyLabel: prop?.label || "—",
        provisionsAnnuelles,
        chargesReelles,
        solde,
        type: solde > 0 ? "Trop-perçu (à rembourser)" : solde < 0 ? "Complément à réclamer" : "Équilibré",
      };
    });
  }, [tenants, properties, realCharges]);

  const fmt = (n: number) => n.toLocaleString("fr-FR", { style: "currency", currency: "EUR" });

  const handleExport = () => {
    exportToCSV(
      results.map(r => ({
        locataire: r.tenantName,
        bien: r.propertyLabel,
        provisions: r.provisionsAnnuelles,
        charges_reelles: r.chargesReelles,
        solde: r.solde,
        resultat: r.type,
      })),
      `regularisation_charges_${year}`,
      [
        { key: "locataire", label: "Locataire" },
        { key: "bien", label: "Bien" },
        { key: "provisions", label: "Provisions annuelles (€)" },
        { key: "charges_reelles", label: "Charges réelles (€)" },
        { key: "solde", label: "Solde (€)" },
        { key: "resultat", label: "Résultat" },
      ]
    );
  };

  return (
    <DashboardLayout>
      <FeatureGate feature="unlimited_properties" featureLabel="Régularisation des charges">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Régularisation des charges</h1>
            <p className="text-muted-foreground text-sm mt-1">Calculez l'ajustement annuel entre provisions et charges réelles</p>
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
        ) : tenants.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Users className="h-10 w-10 text-muted-foreground/30 mb-3" />
              <p className="text-muted-foreground text-sm">Aucun locataire — ajoutez des locataires dans la gestion locative.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Calculator className="h-5 w-5 text-accent" />
                  Saisie des charges réelles {year}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Entrez le montant total des charges réelles supportées pour chaque locataire sur l'année {year} (eau, chauffage collectif, entretien, ordures ménagères, etc.)
                </p>
                <div className="space-y-3">
                  {tenants.map(t => (
                    <div key={t.id} className="flex items-center gap-4">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-foreground">{t.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {properties.find(p => p.id === t.property_id)?.label || "—"} • Provisions : {fmt((t.charges_amount || 0) * 12)}/an
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Euro className="h-4 w-4 text-muted-foreground" />
                        <input
                          type="number"
                          min={0}
                          step={0.01}
                          value={realCharges[t.id] || ""}
                          onChange={e => setRealCharges(prev => ({ ...prev, [t.id]: Number(e.target.value) }))}
                          placeholder="0.00"
                          className="w-32 bg-background border border-border rounded-lg px-3 py-2 text-sm text-right"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Résultat de la régularisation</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-2 font-medium text-muted-foreground">Locataire</th>
                        <th className="text-right py-2 font-medium text-muted-foreground">Provisions</th>
                        <th className="text-right py-2 font-medium text-muted-foreground">Charges réelles</th>
                        <th className="text-right py-2 font-medium text-muted-foreground">Solde</th>
                        <th className="text-left py-2 font-medium text-muted-foreground">Résultat</th>
                      </tr>
                    </thead>
                    <tbody>
                      {results.map(r => (
                        <tr key={r.tenantId} className="border-b border-border/50">
                          <td className="py-3">
                            <p className="font-medium text-foreground">{r.tenantName}</p>
                            <p className="text-xs text-muted-foreground">{r.propertyLabel}</p>
                          </td>
                          <td className="text-right py-3 text-foreground">{fmt(r.provisionsAnnuelles)}</td>
                          <td className="text-right py-3 text-foreground">{fmt(r.chargesReelles)}</td>
                          <td className={`text-right py-3 font-semibold ${r.solde > 0 ? "text-green-600" : r.solde < 0 ? "text-destructive" : "text-foreground"}`}>
                            {r.solde > 0 ? "+" : ""}{fmt(r.solde)}
                          </td>
                          <td className="py-3">
                            <span className={`text-xs px-2 py-1 rounded-full ${
                              r.solde > 0 ? "bg-green-500/10 text-green-600" : r.solde < 0 ? "bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground"
                            }`}>
                              {r.type}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <div className="flex items-start gap-3 bg-muted/50 rounded-lg p-4">
          <AlertTriangle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground">
            La régularisation des charges doit être effectuée une fois par an. Le locataire doit recevoir un décompte détaillé un mois avant la régularisation (article 23 de la loi du 6 juillet 1989).
          </p>
        </div>
      </div>
      </FeatureGate>
    </DashboardLayout>
  );
};

export default ChargesRegularization;
