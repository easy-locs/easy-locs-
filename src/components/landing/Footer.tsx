import React from "react";
import { Shield } from "lucide-react";
import { Link } from "react-router-dom";

const Footer = React.forwardRef<HTMLElement>((_, ref) => (
  <footer ref={ref} className="bg-navy-deep text-primary-foreground/60 py-16">
    <div className="container">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
        <div>
          <Link to="/" className="flex items-center gap-2 mb-4">
            <Shield className="h-6 w-6 text-gold" />
            <span className="text-lg font-bold text-primary-foreground">Easyloc</span>
          </Link>
          <p className="text-sm leading-relaxed">
            Votre assistant de gestion locative intelligent, conforme et sécurisé.
          </p>
        </div>
        <div>
          <h4 className="font-semibold text-primary-foreground text-sm mb-3">Produit</h4>
          <ul className="space-y-2 text-sm">
            <li><a href="#features" className="hover:text-primary-foreground transition-colors">Fonctionnalités</a></li>
            <li><a href="#pricing" className="hover:text-primary-foreground transition-colors">Tarifs</a></li>
          </ul>
        </div>
        <div>
          <h4 className="font-semibold text-primary-foreground text-sm mb-3">Légal</h4>
          <ul className="space-y-2 text-sm">
            <li><a href="#" className="hover:text-primary-foreground transition-colors">Mentions légales</a></li>
            <li><a href="#" className="hover:text-primary-foreground transition-colors">Politique de confidentialité</a></li>
            <li><a href="#" className="hover:text-primary-foreground transition-colors">CGU</a></li>
          </ul>
        </div>
        <div>
          <h4 className="font-semibold text-primary-foreground text-sm mb-3">Contact</h4>
          <ul className="space-y-2 text-sm">
            <li><a href="mailto:contact@easyloc.fr" className="hover:text-primary-foreground transition-colors">contact@easyloc.fr</a></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-primary-foreground/10 pt-8 text-sm text-center">
        © {new Date().getFullYear()} Easyloc. Tous droits réservés.
      </div>
    </div>
  </footer>
));

Footer.displayName = "Footer";

export default Footer;
