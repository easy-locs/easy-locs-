import { Link } from "react-router-dom";
import logoEasylocs from "@/assets/logo-easylocs.png";

const Navbar = () => (
  <nav className="fixed top-0 left-0 right-0 z-50 bg-navy-deep/80 backdrop-blur-lg border-b border-primary-foreground/10">
    <div className="container flex items-center justify-between h-16 px-4">
      <Link to="/" className="flex items-center gap-2 shrink-0">
        <img src={logoEasylocs} alt="EASY-LOCS" className="h-10 w-auto object-contain drop-shadow-md" />
        <span className="text-lg sm:text-xl font-bold tracking-tight text-primary-foreground whitespace-nowrap">EASY-LOCS<sup className="text-[9px] align-super ml-0.5 text-primary-foreground/60">®</sup></span>
      </Link>
      <div className="hidden md:flex items-center gap-8 text-sm text-primary-foreground/70">
        <a href="#features" className="hover:text-primary-foreground transition-colors">Fonctionnalités</a>
        <a href="#pricing" className="hover:text-primary-foreground transition-colors">Tarifs</a>
      </div>
      <div className="flex items-center gap-2 sm:gap-4 shrink-0">
        <Link
          to="/login"
          className="hidden sm:inline text-sm font-medium text-primary-foreground/80 hover:text-primary-foreground transition-colors whitespace-nowrap"
        >
          Connexion
        </Link>
        <Link
          to="/signup"
          className="text-xs sm:text-sm font-semibold bg-gradient-gold text-accent-foreground px-3 sm:px-5 py-2 rounded-lg hover:opacity-90 transition-opacity whitespace-nowrap"
        >
          S'inscrire
        </Link>
        <Link
          to="/login"
          className="sm:hidden text-xs font-medium text-primary-foreground/80 hover:text-primary-foreground transition-colors"
        >
          Connexion
        </Link>
      </div>
    </div>
  </nav>
);

export default Navbar;
