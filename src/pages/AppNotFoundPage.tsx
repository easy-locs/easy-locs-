import { Link, useLocation } from "react-router-dom";
import { routes } from "@/lib/routes";

export default function AppNotFoundPage() {
  const location = useLocation();

  return (
    <div className="app-mobile-page flex items-center justify-center bg-background p-6">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="space-y-2">
          <h1 className="text-5xl font-bold text-foreground">404</h1>
          <p className="text-lg text-muted-foreground">Page introuvable</p>
          <p className="text-sm text-muted-foreground/70">
            Route demandée : <code className="bg-muted px-2 py-0.5 rounded">{location.pathname}</code>
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 pt-4">
          <Link to={routes.merchantPos()} className="bg-primary text-primary-foreground rounded-lg px-4 py-3 text-sm font-medium hover:opacity-90">
            Merchant POS
          </Link>
          <Link to={routes.merchantKitchen()} className="bg-primary text-primary-foreground rounded-lg px-4 py-3 text-sm font-medium hover:opacity-90">
            Merchant Kitchen
          </Link>
          <Link to={routes.merchantDelivery()} className="bg-secondary text-secondary-foreground rounded-lg px-4 py-3 text-sm font-medium hover:opacity-90">
            Delivery Monitor
          </Link>
          <Link to={routes.driverMissions()} className="bg-secondary text-secondary-foreground rounded-lg px-4 py-3 text-sm font-medium hover:opacity-90">
            Driver Missions
          </Link>
          <Link to={routes.walletDiagnostics()} className="bg-muted text-muted-foreground rounded-lg px-4 py-3 text-sm font-medium hover:opacity-90">
            Wallet Diagnostics
          </Link>
          <Link to={routes.growthEngine()} className="bg-muted text-muted-foreground rounded-lg px-4 py-3 text-sm font-medium hover:opacity-90">
            Growth Engine
          </Link>
        </div>

        <Link to="/" className="inline-block mt-4 text-primary underline text-sm">
          Retour à l'accueil
        </Link>
      </div>
    </div>
  );
}
