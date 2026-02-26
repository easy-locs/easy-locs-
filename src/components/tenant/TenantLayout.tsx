import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import logoAdminia from "@/assets/logo-adminia.png";
import {
  LayoutDashboard, Receipt, FileText, MessageCircle,
  CreditCard, Settings, LogOut, Menu, X, ClipboardList,
} from "lucide-react";
import NotificationBell from "@/components/notifications/NotificationBell";

const navItems = [
  { icon: LayoutDashboard, label: "Mon espace", path: "/tenant" },
  { icon: Receipt, label: "Mes quittances", path: "/tenant/receipts" },
  { icon: FileText, label: "Mes documents", path: "/tenant/documents" },
  { icon: ClipboardList, label: "Demandes", path: "/tenant/requests" },
  { icon: MessageCircle, label: "Messages", path: "/tenant/messages" },
  { icon: CreditCard, label: "Payer mon loyer", path: "/tenant/pay" },
];

const TenantLayout = ({ children }: { children: React.ReactNode }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();

  const handleLogout = async () => {
    await signOut();
    navigate("/login");
  };

  return (
    <div className="min-h-screen flex bg-background">
      {sidebarOpen && (
        <div className="fixed inset-0 bg-foreground/30 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <aside className={`fixed lg:sticky top-0 left-0 z-50 h-screen w-64 bg-sidebar flex flex-col transition-transform duration-300 ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}>
        <div className="px-5 pt-5 pb-3 border-b border-sidebar-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <img src={logoAdminia} alt="Adminia" className="h-7 w-7 rounded" />
              <span className="text-lg font-bold text-sidebar-foreground">Adminia</span>
            </div>
            <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-sidebar-foreground/60 hover:text-sidebar-foreground">
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="mt-2">
            <span className="text-[10px] font-bold tracking-wider text-sidebar-foreground/40 uppercase bg-accent/10 text-accent px-2 py-0.5 rounded">Espace locataire</span>
          </div>
          {user && <p className="text-xs text-sidebar-foreground/50 mt-2 truncate">{user.email}</p>}
        </div>

        <nav className="flex-1 py-4 px-3 overflow-y-auto">
          <div className="space-y-1">
            {navItems.map((item) => {
              const active = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    active ? "bg-sidebar-accent text-sidebar-primary" : "text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
                  }`}
                >
                  <item.icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>

        <div className="p-3 border-t border-sidebar-border space-y-0.5">
          <Link
            to="/tenant/settings"
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors"
          >
            <Settings className="h-4 w-4" /> Paramètres
          </Link>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors"
          >
            <LogOut className="h-4 w-4" /> Déconnexion
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-h-screen">
        <header className="h-16 border-b border-border bg-card flex items-center px-6 gap-4 sticky top-0 z-30">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-foreground">
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex-1" />
          <NotificationBell />
        </header>
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
};

export default TenantLayout;
