import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { FileText, Plus, Download, Mail, Calendar } from "lucide-react";

const receipts = [
  { id: 1, tenant: "Marie Dupont", property: "Apt. Paris 11e", month: "Février 2026", amount: "950 €", status: "sent" },
  { id: 2, tenant: "Marie Dupont", property: "Apt. Paris 11e", month: "Janvier 2026", amount: "950 €", status: "sent" },
];

const Receipts = () => {
  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Quittances de loyer</h1>
            <p className="text-muted-foreground text-sm mt-1">Générez et envoyez vos quittances conformes.</p>
          </div>
          <button className="flex items-center gap-2 bg-gradient-gold text-accent-foreground font-semibold px-5 py-2.5 rounded-lg shadow-gold hover:opacity-90 transition-opacity text-sm">
            <Plus className="h-4 w-4" />
            Nouvelle quittance
          </button>
        </div>

        <div className="bg-card rounded-xl shadow-card border border-border/50 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Locataire</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Bien</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Mois</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Montant</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Statut</th>
                  <th className="text-right text-xs font-medium text-muted-foreground px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {receipts.map((r) => (
                  <tr key={r.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3 text-sm font-medium text-foreground">{r.tenant}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{r.property}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{r.month}</td>
                    <td className="px-4 py-3 text-sm font-medium text-foreground">{r.amount}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 text-xs font-medium bg-success/10 text-success px-2 py-0.5 rounded-full">
                        <Mail className="h-3 w-3" />
                        Envoyée
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button className="text-muted-foreground hover:text-foreground transition-colors p-1">
                        <Download className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {receipts.length === 0 && (
            <div className="p-12 text-center">
              <FileText className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
              <p className="text-muted-foreground">Aucune quittance pour le moment.</p>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Receipts;
