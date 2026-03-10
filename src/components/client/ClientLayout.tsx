import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/lib/i18n";
import AppLogo from "@/components/AppLogo";
import {
  LayoutDashboard, Search, MessageCircle, CalendarCheck,
  Settings, LogOut, Menu, X, FileText, CreditCard,
} from "lucide-react";
import NotificationBell from "@/components/notifications/NotificationBell";
import ThemeSwitcher from "@/components/ThemeSwitcher";

const ClientLayout = ({ children }: { children: React.ReactNode }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { t } = useI18n();

  const navItems = [
    { icon: LayoutDashboard, label: t("nav.dashboard") || "Dashboard", path: "/client" },
    { icon: Search, label: t("nav.explore") || "Explore", path: "/explore" },
    { icon: CalendarCheck, label: t("nav.bookings") || "My Bookings", path: "/client/bookings" },
    { icon: MessageCircle, label: t("nav.messages") || "Messages", path: "/client/messages" },
    { icon: FileText, label: t("nav.documents") || "Documents", path: "/client/documents" },
    { icon: CreditCard, label: t("nav.payments") || "Payments", path: "/client/payments" },
  ];

  const handleLogout = async () => {
    await signOut();
    navigate("/login");
  };

  return (
    <div className="min-h-screen flex bg-background mobile-safe">
      {sidebarOpen && (
        <div className="sidebar-overlay lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <aside className={`fixed lg:sticky top-0 left-0 z-50 h-screen w-[280px] sm:w-64 bg-sidebar flex flex-col transition-transform duration-300 ease-in-out safe-bottom ${sidebarOpen ? "translate-x-0 sidebar-slide-in" : "-translate-x-full lg:translate-x-0"}`}>
        <div className="px-5 pt-5 pb-3 border-b border-sidebar-border">
          <div className="flex items-center justify-between">
            <AppLogo variant="sidebar" linkTo="/client" />
            <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-sidebar-foreground/60 hover:text-sidebar-foreground">
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="mt-2">
            <span className="text-[10px] font-bold tracking-wider text-sidebar-foreground/40 uppercase bg-primary/10 text-primary px-2 py-0.5 rounded">
              Client
            </span>
          </div>
          {user && <p className="text-xs text-sidebar-foreground/50 mt-2 truncate">{user.email}</p>}
        </div>

        <nav className="flex-1 py-4 px-3 overflow-y-auto">
          <div className="space-y-1">
            {navItems.map((item) => {
              const active = location.pathname === item.path;
              const isExternal = item.path === "/explore";
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  {...(isExternal ? { target: "_self" } : {})}
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
            to="/client/settings"
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors"
          >
            <Settings className="h-4 w-4" /> {t("nav.settings") || "Settings"}
          </Link>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors"
          >
            <LogOut className="h-4 w-4" /> {t("nav.logout") || "Sign out"}
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-h-screen min-w-0">
        <header className="h-14 border-b border-border bg-card flex items-center px-3 sm:px-6 gap-2 sm:gap-4 sticky top-0 z-30">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-foreground p-2 -ml-1 rounded-lg hover:bg-muted transition-colors" aria-label="Menu">
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex-1" />
          <ThemeSwitcher />
          <NotificationBell />
        </header>
        <main className="app-main flex-1 p-3 sm:p-6">{children}</main>
        <footer className="py-3 text-center border-t border-border/30">
          <span className="text-xs text-muted-foreground/50 font-medium tracking-wide">EASY-LOCS<sup className="text-[8px]">®</sup></span>
        </footer>
      </div>
    </div>
  );
};

export default ClientLayout;
