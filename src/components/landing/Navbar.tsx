import { Link } from "react-router-dom";
import logoEasylocs from "@/assets/logo-easylocs.png";

const Navbar = () => (
  <nav className="fixed top-0 left-0 right-0 z-50 bg-navy-deep/80 backdrop-blur-lg border-b border-primary-foreground/10">
    <div className="container flex items-center justify-between h-16">
      <Link to="/" className="flex items-center gap-2.5">
        <img src={logoEasylocs} alt="EASY-LOCS" className="h-11 w-auto object-contain drop-shadow-md" style={{ filter: "none", border: "none", outline: "none" }} />
        <span className="text-xl font-bold tracking-tight text-primary-foreground whitespace-nowrap">EASY-LOCS<sup className="text-[9px] align-super ml-0.5 text-primary-foreground/60">®</sup></span>
      </Link>
      <div className="hidden md:flex items-center gap-8 text-sm text-primary-foreground/70">
        <a href="#features" className="hover:text-primary-foreground transition-colors">Fonctionnalités</a>
        <a href="#pricing" className="hover:text-primary-foreground transition-colors">Tarifs</a>
      </div>
      <div className="flex items-center gap-4">
        <Link
          to="/onboarding"
          className="text-sm font-medium text-primary-foreground/80 hover:text-primary-foreground transition-colors whitespace-nowrap"
        >
          Connexion
        </Link>
        <Link
          to="/onboarding"
          className="text-sm font-semibold bg-gradient-gold text-accent-foreground px-5 py-2 rounded-lg hover:opacity-90 transition-opacity"
        >
          S'inscrire
        </Link>
      </div>
    </div>
  </nav>
);

export default Navbar;
