/**
 * ExploreHeader — World-class, auth-aware navigation for the Explore page.
 * Designed to surpass Airbnb, Booking, and Leboncoin in clarity and speed.
 */
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/lib/i18n";
import AppLogo from "@/components/AppLogo";
import ThemeSwitcher from "@/components/ThemeSwitcher";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Heart, MessageSquare, Search, ChevronDown, Menu, LogOut,
  LayoutDashboard, Plus, Settings, User, ArrowLeftRight,
  Bookmark, CalendarCheck, Store, Globe, MapPin,
  Building2, FileText, Receipt, Users, Briefcase, CreditCard,
} from "lucide-react";
import { useUnreadMessages } from "@/hooks/useUnreadMessages";

/* ───── Types ───── */
interface ExploreHeaderProps {
  searchQuery: string;
  locationQuery: string;
  geoCity?: string;
  geoCountry?: string;
  onOpenSearch: () => void;
  children?: React.ReactNode; // desktop search bar slot
  categoryBar?: React.ReactNode;
}

/* ───── Role helpers ───── */
function getDashboardPath(role: string) {
  if (role === "tenant") return "/tenant";
  if (role === "client") return "/client";
  return "/dashboard";
}

function getRoleLabel(role: string) {
  switch (role) {
    case "landlord": return "Professional";
    case "tenant": return "Tenant";
    case "client": return "Client";
    default: return role;
  }
}

/* ═══════════════════════════════════════════════
   DESKTOP USER MENU
   ═══════════════════════════════════════════════ */
function DesktopUserMenu() {
  const { user, activeRole, hasDualRole, switchRole, signOut } = useAuth();
  const navigate = useNavigate();

  if (!user) return null;

  const dash = getDashboardPath(activeRole);
  const initials = (user.user_metadata?.name || user.email || "U").slice(0, 2).toUpperCase();
  const isLandlord = activeRole === "landlord";
  const isTenant = activeRole === "tenant";
  const isClient = activeRole === "client";

  // All possible switch targets for dual/multi-role
  const switchTargets: { label: string; role: "landlord" | "tenant" | "client" }[] = [];
  if (hasDualRole) {
    if (activeRole !== "landlord") switchTargets.push({ label: "Professional", role: "landlord" });
    if (activeRole !== "tenant") switchTargets.push({ label: "Tenant", role: "tenant" });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-1.5 rounded-full border border-border bg-card pl-3 pr-1.5 py-1 shadow-sm hover:shadow-md transition-all duration-200 min-h-[40px] focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none">
          <Menu className="h-4 w-4 text-muted-foreground" />
          <Avatar className="h-7 w-7">
            <AvatarFallback className="bg-accent text-accent-foreground text-[10px] font-bold">{initials}</AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" sideOffset={8} className="w-64 p-0 rounded-xl shadow-xl border border-border/60">
        {/* Identity block */}
        <div className="px-4 py-3 bg-muted/30">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10 ring-2 ring-accent/20">
              <AvatarFallback className="bg-accent text-accent-foreground text-sm font-bold">{initials}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate">{user.user_metadata?.name || user.email}</p>
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 mt-0.5 font-medium">
                {getRoleLabel(activeRole)}
              </Badge>
            </div>
          </div>
        </div>

        <Separator />

        {/* Quick actions — universal */}
        <div className="py-1">
          <DropdownMenuItem className="px-4 py-2.5 cursor-pointer" onClick={() => navigate(dash)}>
            <LayoutDashboard className="h-4 w-4 mr-3 text-muted-foreground" /> Dashboard
          </DropdownMenuItem>
          <DropdownMenuItem className="px-4 py-2.5 cursor-pointer" onClick={() => navigate("/dashboard/communication")}>
            <MessageSquare className="h-4 w-4 mr-3 text-muted-foreground" /> Messages
          </DropdownMenuItem>
          <DropdownMenuItem className="px-4 py-2.5 cursor-pointer" onClick={() => navigate("/saved")}>
            <Heart className="h-4 w-4 mr-3 text-muted-foreground" /> Saved
          </DropdownMenuItem>
        </div>

        {/* Post a listing — universal for all roles */}
        <Separator />
        <div className="py-1">
          <DropdownMenuItem className="px-4 py-2.5 cursor-pointer font-medium text-accent" onClick={() => navigate("/dashboard/create-listing")}>
            <Plus className="h-4 w-4 mr-3" /> Post a listing
          </DropdownMenuItem>
        </div>

        {/* Landlord/Pro — business suite */}
        {isLandlord && (
          <>
            <Separator />
            <div className="py-1">
              <p className="px-4 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">My business</p>
              <DropdownMenuItem className="px-4 py-2.5 cursor-pointer" onClick={() => navigate("/dashboard/my-shop")}>
                <Store className="h-4 w-4 mr-3 text-muted-foreground" /> My Shop
              </DropdownMenuItem>
              <DropdownMenuItem className="px-4 py-2.5 cursor-pointer" onClick={() => navigate("/dashboard/seasonal")}>
                <CalendarCheck className="h-4 w-4 mr-3 text-muted-foreground" /> Bookings
              </DropdownMenuItem>
              <DropdownMenuItem className="px-4 py-2.5 cursor-pointer" onClick={() => navigate("/dashboard/rental")}>
                <Building2 className="h-4 w-4 mr-3 text-muted-foreground" /> Properties
              </DropdownMenuItem>
              <DropdownMenuItem className="px-4 py-2.5 cursor-pointer" onClick={() => navigate("/dashboard/documents")}>
                <FileText className="h-4 w-4 mr-3 text-muted-foreground" /> Documents
              </DropdownMenuItem>
              <DropdownMenuItem className="px-4 py-2.5 cursor-pointer" onClick={() => navigate("/dashboard/finances")}>
                <Receipt className="h-4 w-4 mr-3 text-muted-foreground" /> Finances
              </DropdownMenuItem>
            </div>
            <Separator />
            <div className="py-1">
              <DropdownMenuItem className="px-4 py-2.5 cursor-pointer" onClick={() => navigate("/dashboard/company")}>
                <Briefcase className="h-4 w-4 mr-3 text-muted-foreground" /> My company
              </DropdownMenuItem>
              <DropdownMenuItem className="px-4 py-2.5 cursor-pointer" onClick={() => navigate("/dashboard/collaboration")}>
                <Users className="h-4 w-4 mr-3 text-muted-foreground" /> Team
              </DropdownMenuItem>
              <DropdownMenuItem className="px-4 py-2.5 cursor-pointer" onClick={() => navigate("/dashboard/billing")}>
                <CreditCard className="h-4 w-4 mr-3 text-muted-foreground" /> Subscription
              </DropdownMenuItem>
            </div>
          </>
        )}

        {/* Tenant actions */}
        {isTenant && (
          <>
            <Separator />
            <div className="py-1">
              <DropdownMenuItem className="px-4 py-2.5 cursor-pointer" onClick={() => navigate("/tenant/documents")}>
                <Bookmark className="h-4 w-4 mr-3 text-muted-foreground" /> My documents
              </DropdownMenuItem>
              <DropdownMenuItem className="px-4 py-2.5 cursor-pointer" onClick={() => navigate("/tenant/pay")}>
                <Globe className="h-4 w-4 mr-3 text-muted-foreground" /> Payments
              </DropdownMenuItem>
              <DropdownMenuItem className="px-4 py-2.5 cursor-pointer" onClick={() => navigate("/tenant/requests")}>
                <CalendarCheck className="h-4 w-4 mr-3 text-muted-foreground" /> Requests
              </DropdownMenuItem>
            </div>
          </>
        )}

        {/* Client actions */}
        {isClient && (
          <>
            <Separator />
            <div className="py-1">
              <DropdownMenuItem className="px-4 py-2.5 cursor-pointer" onClick={() => navigate("/client/bookings")}>
                <CalendarCheck className="h-4 w-4 mr-3 text-muted-foreground" /> My bookings
              </DropdownMenuItem>
            </div>
          </>
        )}

        {/* Role switcher */}
        {switchTargets.length > 0 && (
          <>
            <Separator />
            <div className="py-1">
              {switchTargets.map(t => (
                <DropdownMenuItem key={t.role} className="px-4 py-2.5 cursor-pointer" onClick={() => {
                  switchRole(t.role);
                  navigate(getDashboardPath(t.role));
                }}>
                  <ArrowLeftRight className="h-4 w-4 mr-3 text-muted-foreground" />
                  Switch to {t.label}
                </DropdownMenuItem>
              ))}
            </div>
          </>
        )}

        <Separator />

        {/* Account */}
        <div className="py-1">
          <DropdownMenuItem className="px-4 py-2.5 cursor-pointer" onClick={() => navigate(`${dash}/settings`)}>
            <Settings className="h-4 w-4 mr-3 text-muted-foreground" /> Settings
          </DropdownMenuItem>
          <DropdownMenuItem className="px-4 py-2.5 cursor-pointer text-destructive focus:text-destructive" onClick={async () => { await signOut(); navigate("/explore"); }}>
            <LogOut className="h-4 w-4 mr-3" /> Log out
          </DropdownMenuItem>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
function MobileUserSheet() {
  const { user, activeRole, hasDualRole, switchRole, signOut } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  if (!user) return null;

  const dash = getDashboardPath(activeRole);
  const initials = (user.user_metadata?.name || user.email || "U").slice(0, 2).toUpperCase();
  const isLandlord = activeRole === "landlord";
  const isTenant = activeRole === "tenant";
  const isClient = activeRole === "client";

  const go = (path: string) => { setOpen(false); navigate(path); };

  const switchTargets: { label: string; role: "landlord" | "tenant" | "client" }[] = [];
  if (hasDualRole) {
    if (activeRole !== "landlord") switchTargets.push({ label: "Professional", role: "landlord" });
    if (activeRole !== "tenant") switchTargets.push({ label: "Tenant", role: "tenant" });
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button className="flex items-center gap-1 rounded-full border border-border bg-card p-1.5 shadow-sm min-h-[40px] min-w-[40px] justify-center">
          <Avatar className="h-7 w-7">
            <AvatarFallback className="bg-accent text-accent-foreground text-[10px] font-bold">{initials}</AvatarFallback>
          </Avatar>
        </button>
      </SheetTrigger>
      <SheetContent side="right" className="w-[300px] p-0 flex flex-col">
        {/* Identity */}
        <div className="px-5 pt-6 pb-4 bg-muted/30">
          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12 ring-2 ring-accent/20">
              <AvatarFallback className="bg-accent text-accent-foreground text-base font-bold">{initials}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate">{user.user_metadata?.name || user.email}</p>
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 mt-1">{getRoleLabel(activeRole)}</Badge>
            </div>
          </div>
        </div>

        <Separator />

        <nav className="flex-1 overflow-y-auto py-2">
          {/* Universal */}
          <MobileNavItem icon={Plus} label="Post a listing" onClick={() => go("/dashboard/create-listing")} accent />
          <MobileNavItem icon={LayoutDashboard} label="Dashboard" onClick={() => go(dash)} />
          <MobileNavItem icon={MessageSquare} label="Messages" onClick={() => go("/dashboard/communication")} />
          <MobileNavItem icon={Heart} label="Saved" onClick={() => go("/saved")} />

          {/* Landlord/Pro */}
          {isLandlord && (
            <>
              <Separator className="my-2" />
              <p className="px-5 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">My business</p>
              <MobileNavItem icon={Store} label="My listings" onClick={() => go("/dashboard/marketplace")} />
              <MobileNavItem icon={CalendarCheck} label="Bookings" onClick={() => go("/dashboard/seasonal")} />
              <MobileNavItem icon={Building2} label="Properties" onClick={() => go("/dashboard/rental")} />
              <MobileNavItem icon={FileText} label="Documents" onClick={() => go("/dashboard/documents")} />
              <MobileNavItem icon={Receipt} label="Finances" onClick={() => go("/dashboard/finances")} />
              <Separator className="my-2" />
              <p className="px-5 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Company</p>
              <MobileNavItem icon={Briefcase} label="My company" onClick={() => go("/dashboard/company")} />
              <MobileNavItem icon={Users} label="Team" onClick={() => go("/dashboard/collaboration")} />
              <MobileNavItem icon={CreditCard} label="Subscription" onClick={() => go("/dashboard/billing")} />
              
            </>
          )}

          {/* Tenant */}
          {isTenant && (
            <>
              <Separator className="my-2" />
              <p className="px-5 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Rental</p>
              <MobileNavItem icon={Bookmark} label="My documents" onClick={() => go("/tenant/documents")} />
              <MobileNavItem icon={Globe} label="Payments" onClick={() => go("/tenant/pay")} />
              <MobileNavItem icon={CalendarCheck} label="Requests" onClick={() => go("/tenant/requests")} />
            </>
          )}

          {/* Client */}
          {isClient && (
            <>
              <Separator className="my-2" />
              <MobileNavItem icon={CalendarCheck} label="My bookings" onClick={() => go("/client/bookings")} />
            </>
          )}

          {/* Role switcher */}
          {switchTargets.length > 0 && (
            <>
              <Separator className="my-2" />
              {switchTargets.map(st => (
                <MobileNavItem key={st.role} icon={ArrowLeftRight} label={`Switch to ${st.label}`}
                  onClick={() => { switchRole(st.role); go(getDashboardPath(st.role)); }} />
              ))}
            </>
          )}

          <Separator className="my-2" />
          <MobileNavItem icon={Settings} label="Settings" onClick={() => go(`${dash}/settings`)} />
        </nav>

        <Separator />
        <div className="p-3">
          <button onClick={async () => { setOpen(false); await signOut(); navigate("/explore"); }}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm text-destructive hover:bg-destructive/10 transition-colors">
            <LogOut className="h-4 w-4" /> Log out
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function MobileNavItem({ icon: Icon, label, onClick, accent }: { icon: any; label: string; onClick: () => void; accent?: boolean }) {
  return (
    <button onClick={onClick}
      className={`w-full flex items-center gap-3 px-5 py-3 text-sm transition-colors hover:bg-muted/50 min-h-[44px] ${accent ? "text-accent font-semibold" : "text-foreground"}`}>
      <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
      {label}
    </button>
  );
}

/* ═══════════════════════════════════════════════
   MAIN HEADER
   ═══════════════════════════════════════════════ */
export default function ExploreHeader({
  searchQuery, locationQuery, geoCity, geoCountry,
  onOpenSearch, children, categoryBar,
}: ExploreHeaderProps) {
  const { user, activeRole } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();
  const { unreadCount } = useUnreadMessages();

  const dash = getDashboardPath(activeRole);
  const isLandlord = activeRole === "landlord";
  const locationLabel = geoCity || geoCountry || null;

  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/95 backdrop-blur-xl">
      {/* ══════ DESKTOP ══════ */}
      <div className="max-w-[1400px] mx-auto px-4">
        <div className="h-[60px] hidden md:flex items-center gap-4">
          {/* Left: Logo + location context */}
          <div className="flex items-center gap-2 shrink-0">
            <AppLogo variant="header" linkTo="/" />
            {locationLabel && (
              <span className="hidden lg:flex items-center gap-1 text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded-full">
                <MapPin className="h-3 w-3" />
                {locationLabel}
              </span>
            )}
          </div>

          {/* Center: Search bar (slot) */}
          <div className="flex-1 flex justify-center max-w-2xl mx-auto">
            {children}
          </div>

          {/* Right: actions */}
          <div className="flex items-center gap-1 shrink-0">
            {/* Post CTA — visible to all users */}
            <button onClick={() => navigate(user ? "/dashboard/create-listing" : "/login")}
              className="hidden lg:flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2 rounded-full bg-accent text-accent-foreground hover:opacity-90 transition-opacity mr-1">
              <Plus className="h-3.5 w-3.5" /> Post a listing
            </button>

            {/* Saved — always visible */}
            <Link to={user ? "/saved" : "/login"} className="flex items-center justify-center h-9 w-9 rounded-full hover:bg-muted/60 transition-colors" title="Saved">
              <Heart className="h-[18px] w-[18px] text-muted-foreground" />
            </Link>

            {/* Messages — logged in only */}
            {user && (
              <Link to="/dashboard/communication" className="relative flex items-center justify-center h-9 w-9 rounded-full hover:bg-muted/60 transition-colors" title="Messages">
                <MessageSquare className="h-[18px] w-[18px] text-muted-foreground" />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold px-1 animate-in fade-in zoom-in">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </Link>
            )}

            <ThemeSwitcher />

            {/* Auth state */}
            {!user ? (
              <div className="flex items-center gap-1 ml-1">
                <Link to="/login" className="text-sm text-muted-foreground hover:text-foreground transition-colors px-3 py-2 rounded-full hover:bg-muted/60">
                  Log in
                </Link>
                <Link to="/signup" className="text-sm font-semibold px-4 py-2 rounded-full bg-accent text-accent-foreground hover:opacity-90 transition-opacity">
                  Sign up
                </Link>
              </div>
            ) : (
              <DesktopUserMenu />
            )}
          </div>
        </div>

        {/* ══════ MOBILE ══════ */}
        <div className="md:hidden">
          {/* Top row: logo, messages, avatar */}
          <div className="h-[52px] flex items-center justify-between">
            <AppLogo variant="header" linkTo="/" />

            <div className="flex items-center gap-1">
              {user && (
                <Link to="/dashboard/communication" className="relative flex items-center justify-center h-9 w-9 rounded-full hover:bg-muted/60 transition-colors">
                  <MessageSquare className="h-[18px] w-[18px] text-muted-foreground" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-[16px] flex items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[9px] font-bold px-0.5">
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                  )}
                </Link>
              )}
              {!user ? (
                <div className="flex items-center gap-1">
                  <Link to="/login" className="text-xs text-muted-foreground hover:text-foreground px-2 py-1.5">Log in</Link>
                  <Link to="/signup" className="text-[11px] font-semibold px-3 py-1.5 rounded-full bg-accent text-accent-foreground">Sign up</Link>
                </div>
              ) : (
                <MobileUserSheet />
              )}
            </div>
          </div>

          {/* Search bar row */}
          <div className="pb-2.5">
            <button onClick={onOpenSearch}
              className="w-full flex items-center gap-3 px-4 py-2.5 rounded-full border border-border bg-card shadow-sm text-left min-h-[44px] active:scale-[0.99] transition-transform">
              <Search className="h-4 w-4 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate text-foreground">
                  {searchQuery || t("explore.search") || "Search anything..."}
                </p>
                {locationLabel && (
                  <p className="text-[11px] text-muted-foreground truncate">{locationLabel}</p>
                )}
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Category bar */}
      {categoryBar}
    </header>
  );
}
