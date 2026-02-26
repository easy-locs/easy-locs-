import { motion } from "framer-motion";
import { Check, Sparkles, MapPin, Globe } from "lucide-react";
import { Link } from "react-router-dom";
import { useState } from "react";

const tiers = [
  {
    name: "Local",
    subtitle: "1 pays",
    icon: MapPin,
    monthly: 29,
    annual: 199,
    savings: "Économisez 149€/an",
    description: "Idéal pour les bailleurs et hôtes opérant dans un seul pays.",
    features: [
      "1 pays au choix",
      "Nombre illimité de biens",
      "Nombre illimité de locataires",
      "Locations longue durée + Airbnb",
      "Synchronisation Airbnb & Booking",
      "Création automatique de baux conformes",
      "États des lieux, quittances, résiliations",
      "Archivage sécurisé",
      "Signature électronique standard",
    ],
  },
  {
    name: "Global",
    subtitle: "Tous les pays",
    icon: Globe,
    monthly: 79,
    annual: 499,
    savings: "Économisez 449€/an",
    popular: true,
    description: "Idéal pour investisseurs et gestionnaires multi-pays.",
    features: [
      "Tous les pays du monde",
      "Nombre illimité de biens",
      "Nombre illimité de locataires",
      "Locations longue durée + Airbnb",
      "Synchronisation Airbnb & Booking + OTA",
      "Documents juridiques multi-pays",
      "Annexes légales spécifiques par pays",
      "Signature électronique internationale",
      "Archivage longue durée",
      "Export juridique PDF",
      "Support prioritaire",
    ],
  },
];

const Pricing = () => {
  const [interval, setInterval] = useState<"monthly" | "annual">("annual");

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
            Choisissez l'abonnement adapté à <span className="text-gradient-gold">votre activité</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-3xl mx-auto mb-2">
            Une seule plateforme pour gérer vos locations longue durée, Airbnb et Booking,
            avec des documents juridiques de haute qualité adaptés à chaque pays.
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

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-3xl mx-auto">
          {tiers.map((tier, i) => {
            const price = interval === "monthly" ? tier.monthly : tier.annual;
            const intLabel = interval === "monthly" ? "mois" : "an";
            return (
              <motion.div
                key={tier.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className={`relative bg-card rounded-xl p-6 border transition-all duration-300 flex flex-col ${
                  tier.popular
                    ? "border-gold shadow-gold scale-[1.02]"
                    : "border-border/50 shadow-card hover:shadow-card-hover"
                }`}
              >
                {tier.popular && interval === "annual" && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-gold text-accent-foreground text-xs font-bold px-4 py-1 rounded-full flex items-center gap-1">
                    <Sparkles className="h-3 w-3" />
                    {tier.savings}
                  </div>
                )}
                {!tier.popular && interval === "annual" && tier.savings && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-muted text-foreground text-xs font-bold px-4 py-1 rounded-full flex items-center gap-1">
                    <Sparkles className="h-3 w-3" />
                    {tier.savings}
                  </div>
                )}
                <div className="mb-4">
                  <div className="flex items-center gap-2 mb-1">
                    <tier.icon className="h-5 w-5 text-gold" />
                    <h3 className="text-lg font-bold text-foreground">{tier.name}</h3>
                  </div>
                  <p className="text-xs text-muted-foreground">{tier.subtitle}</p>
                </div>
                <div className="mb-4">
                  <span className="text-4xl font-extrabold text-foreground">{price}€</span>
                  <span className="text-muted-foreground text-sm"> / {intLabel}</span>
                </div>
                <p className="text-xs text-muted-foreground mb-5">{tier.description}</p>
                <ul className="space-y-2.5 mb-8 flex-1">
                  {tier.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-foreground">
                      <Check className="h-4 w-4 text-gold shrink-0 mt-0.5" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  to="/onboarding"
                  className={`w-full text-center py-3 rounded-lg font-semibold transition-all ${
                    tier.popular
                      ? "bg-gradient-gold text-accent-foreground shadow-gold hover:opacity-90"
                      : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                  }`}
                >
                  Essai gratuit 3 jours
                </Link>
              </motion.div>
            );
          })}
        </div>

        {/* Payment methods */}
        <div className="flex items-center justify-center gap-4 mt-8 text-xs text-muted-foreground">
          <span>💳 Carte bancaire</span>
          <span> Apple Pay</span>
          <span>📱 Google Pay</span>
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
