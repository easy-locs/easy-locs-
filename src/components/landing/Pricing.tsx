import { motion } from "framer-motion";
import { Check, Sparkles, Infinity } from "lucide-react";
import { Link } from "react-router-dom";
import { useState } from "react";

const features = [
  "Tous les pays du monde",
  "Nombre illimité de biens",
  "Nombre illimité de locataires",
  "Locations longue durée + Airbnb",
  "Synchronisation Airbnb, Booking & OTA",
  "Documents juridiques multi-pays",
  "Baux, états des lieux, quittances",
  "Signature électronique",
  "Archivage sécurisé longue durée",
  "Export juridique PDF",
  "Support prioritaire",
];

const Pricing = () => {
  const [interval, setInterval] = useState<"monthly" | "annual">("annual");
  const price = interval === "monthly" ? 9.99 : 99;
  const intLabel = interval === "monthly" ? "mois" : "an";

  return (
    <section id="pricing" className="py-24 bg-muted/30">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
            Un seul plan, <span className="text-gradient-gold">tout illimité</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-3xl mx-auto mb-2">
            Une seule plateforme pour gérer vos locations longue durée, Airbnb et Booking,
            avec des documents juridiques adaptés à chaque pays.
          </p>
          <p className="text-muted-foreground text-sm">Aucun engagement – Annulation à tout moment</p>
        </motion.div>

        {/* Interval toggle */}
        <div className="flex items-center justify-center gap-3 mb-10">
          <button
            onClick={() => setInterval("monthly")}
            className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${interval === "monthly" ? "bg-foreground text-background" : "bg-muted text-muted-foreground hover:text-foreground"}`}
          >
            Mensuel
          </button>
          <button
            onClick={() => setInterval("annual")}
            className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${interval === "annual" ? "bg-foreground text-background" : "bg-muted text-muted-foreground hover:text-foreground"}`}
          >
            Annuel
          </button>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-lg mx-auto"
        >
          <div className="relative bg-card rounded-xl p-8 border border-gold shadow-gold">
            {interval === "annual" && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-gold text-accent-foreground text-xs font-bold px-4 py-1 rounded-full flex items-center gap-1">
                <Sparkles className="h-3 w-3" />
                Économisez 20€/an
              </div>
            )}
            <div className="flex items-center gap-2 mb-1">
              <Infinity className="h-5 w-5 text-gold" />
              <h3 className="text-lg font-bold text-foreground">EasyLoc Illimité</h3>
            </div>
            <p className="text-xs text-muted-foreground mb-4">Tout inclus — Accès complet</p>
            <div className="mb-4">
              <span className="text-5xl font-extrabold text-foreground">{price}€</span>
              <span className="text-muted-foreground text-sm"> / {intLabel}</span>
            </div>
            <p className="text-xs text-muted-foreground mb-6">Accès illimité à toutes les fonctionnalités EasyLoc.</p>
            <ul className="space-y-2.5 mb-8">
              {features.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm text-foreground">
                  <Check className="h-4 w-4 text-gold shrink-0 mt-0.5" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
            <Link
              to="/onboarding"
              className="block w-full text-center py-3 rounded-lg font-semibold bg-gradient-gold text-accent-foreground shadow-gold hover:opacity-90 transition-all"
            >
              Essai gratuit 3 jours
            </Link>
          </div>
        </motion.div>

        {/* Payment methods */}
        <div className="flex items-center justify-center gap-4 mt-8 text-xs text-muted-foreground">
          <span>💳 Carte bancaire</span>
          <span>🏦 SEPA</span>
        </div>

        {/* Legal disclaimer */}
        <div className="max-w-3xl mx-auto mt-8 text-center text-xs text-muted-foreground/70 space-y-2">
          <p>
            La plateforme fournit des modèles de documents juridiques automatisés. Elle ne fournit pas de conseil juridique personnalisé et ne se substitue pas à un professionnel du droit.
          </p>
          <p>
            Les abonnements sont reconduits automatiquement. Résiliation à tout moment depuis l'espace utilisateur. Aucun remboursement partiel.
          </p>
        </div>
      </div>
    </section>
  );
};

export default Pricing;
