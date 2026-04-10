import { Link, useLocation } from "react-router-dom";
import { routes } from "@/lib/routes";
import { ArrowLeft, Search } from "lucide-react";

export default function AppNotFoundPage() {
  const location = useLocation();

  return (
    <div className="app-mobile-page flex items-center justify-center bg-background p-6">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="space-y-3">
          <div className="w-20 h-20 mx-auto rounded-2xl bg-muted/50 flex items-center justify-center">
            <Search className="w-10 h-10 text-muted-foreground/60" />
          </div>
          <h1 className="text-5xl font-black text-foreground tracking-tight">404</h1>
          <p className="text-lg font-medium text-muted-foreground">Page not found</p>
          <p className="text-sm text-muted-foreground/70">
            Requested route: <code className="bg-muted px-2 py-0.5 rounded text-xs">{location.pathname}</code>
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 pt-4">
          <Link to={routes.merchantPos()} className="bg-primary text-primary-foreground rounded-xl px-4 py-3 text-sm font-bold hover:opacity-90 transition-opacity">
            Merchant POS
          </Link>
          <Link to={routes.merchantKitchen()} className="bg-primary text-primary-foreground rounded-xl px-4 py-3 text-sm font-bold hover:opacity-90 transition-opacity">
            Merchant Kitchen
          </Link>
          <Link to={routes.merchantDelivery()} className="bg-secondary text-secondary-foreground rounded-xl px-4 py-3 text-sm font-bold hover:opacity-90 transition-opacity">
            Delivery Monitor
          </Link>
          <Link to={routes.driverMissions()} className="bg-secondary text-secondary-foreground rounded-xl px-4 py-3 text-sm font-bold hover:opacity-90 transition-opacity">
            Driver Missions
          </Link>
        </div>

        <Link
          to="/"
          className="inline-flex items-center gap-2 mt-4 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:opacity-90 transition-all active:scale-[0.97]"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </Link>
      </div>
    </div>
  );
}
