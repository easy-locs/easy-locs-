import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Wallet, TrendingUp, TrendingDown, PiggyBank } from "lucide-react";

const Finances = () => {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Finances</h1>
          <p className="text-muted-foreground mt-1">Suivi des revenus locatifs, charges et trésorerie</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-card rounded-xl p-6 border border-border/50 shadow-card">
            <div className="flex items-center gap-3 mb-2">
              <TrendingUp className="h-5 w-5 text-green-500" />
              <span className="text-sm text-muted-foreground">Revenus du mois</span>
            </div>
            <p className="text-2xl font-bold text-foreground">0 €</p>
          </div>
          <div className="bg-card rounded-xl p-6 border border-border/50 shadow-card">
            <div className="flex items-center gap-3 mb-2">
              <TrendingDown className="h-5 w-5 text-red-500" />
              <span className="text-sm text-muted-foreground">Impayés</span>
            </div>
            <p className="text-2xl font-bold text-foreground">0 €</p>
          </div>
          <div className="bg-card rounded-xl p-6 border border-border/50 shadow-card">
            <div className="flex items-center gap-3 mb-2">
              <PiggyBank className="h-5 w-5 text-accent" />
              <span className="text-sm text-muted-foreground">Solde</span>
            </div>
            <p className="text-2xl font-bold text-foreground">0 €</p>
          </div>
        </div>

        <div className="bg-card rounded-xl p-8 border border-border/50 shadow-card text-center">
          <Wallet className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground">Le module finances sera alimenté automatiquement par vos appels de loyer et paiements.</p>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Finances;
