import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Clock } from "lucide-react";
import {
  Shield,
  LayoutDashboard,
  FileText,
  Home,
  Bell,
  FolderLock,
  BrainCircuit,
  Send,
  Building2,
  Share2,
  Settings,
  LogOut,
  Menu,
  X,
  CreditCard,
  ShieldCheck,
} from "lucide-react";

const navItems = [
  { icon: LayoutDashboard, label: "Tableau de bord", path: "/dashboard" },
  { icon: FileText, label: "Quittances", path: "/dashboard/receipts" },
  { icon: Home, label: "Baux", path: "/dashboard/leases" },
  { icon: Send, label: "Documents", path: "/dashboard/documents" },
  { icon: Building2, label: "Entreprise", path: "/dashboard/company" },
  { icon: Bell, label: "Rappels", path: "/dashboard/reminders" },
  { icon: FolderLock, label: "Coffre-fort", path: "/dashboard/vault" },
  { icon: Share2, label: "Partages", path: "/dashboard/sharing" },
  { icon: CreditCard, label: "Abonnement", path: "/dashboard/billing" },
];

const DashboardLayout = ({ children }: { children: React.ReactNode }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut, subscription } = useAuth();

  const handleLogout = async () => {
    await signOut();
    navigate("/login");
  };

  return (
    <div className="min-h-screen flex bg-background">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-foreground/30 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:sticky top-0 left-0 z-50 h-screen w-64 bg-sidebar flex flex-col transition-transform duration-300 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <div className="flex items-center gap-2 px-6 h-16 border-b border-sidebar-border">
          <Shield className="h-6 w-6 text-sidebar-primary" />
          <span className="text-lg font-bold text-sidebar-foreground">Adminia</span>
          <button
            onClick={() => setSidebarOpen(false)}
            className="ml-auto lg:hidden text-sidebar-foreground/60 hover:text-sidebar-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const active = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? "bg-sidebar-accent text-sidebar-primary"
                    : "text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
                }`}
              >
                <item.icon className="h-5 w-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-sidebar-border">
          <Link
            to="/dashboard/admin"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors"
          >
            <ShieldCheck className="h-5 w-5" />
            Admin
          </Link>
          <Link
            to="/dashboard/settings"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors"
          >
            <Settings className="h-5 w-5" />
            Paramètres
          </Link>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors"
          >
            <LogOut className="h-5 w-5" />
            Déconnexion
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-h-screen">
        <header className="h-16 border-b border-border bg-card flex items-center px-6 gap-4 sticky top-0 z-30">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden text-foreground"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex-1" />
          {/* AI Assistant button */}
          <Link
            to="/dashboard/assistant"
            className="flex items-center gap-2 bg-gradient-gold text-accent-foreground text-sm font-semibold px-4 py-2 rounded-lg shadow-gold hover:opacity-90 transition-opacity"
          >
            <BrainCircuit className="h-4 w-4" />
            <span className="hidden sm:inline">Que dois-je faire ?</span>
          </Link>
        </header>

        {/* Trial banner */}
        {subscription.isTrial && (
          <div className="mx-6 mt-4 flex items-center gap-3 bg-accent/10 border border-accent/30 rounded-lg px-4 py-2.5">
            <Clock className="h-4 w-4 text-accent shrink-0" />
            <p className="text-sm text-foreground">
              <span className="font-semibold">Essai gratuit</span>
              {subscription.trialDaysLeft != null && (
                <span className="text-muted-foreground">
                  {" — "}{subscription.trialDaysLeft} jour{subscription.trialDaysLeft > 1 ? "s" : ""} restant{subscription.trialDaysLeft > 1 ? "s" : ""}
                </span>
              )}
            </p>
            <Link
              to="/dashboard/billing"
              className="ml-auto text-xs font-semibold text-accent hover:underline whitespace-nowrap"
            >
              Choisir un plan
            </Link>
          </div>
        )}

        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
};

export default DashboardLayout;
