import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { Link } from "react-router-dom";

const plans = [
  {
    name: "Particulier",
    price: "12",
    description: "Pour gérer vos documents personnels",
    features: [
      "Documents administratifs illimités",
      "Coffre-fort sécurisé (1 Go)",
      "Rappels basiques",
      "Assistant IA (50 requêtes/mois)",
      "Export PDF",
    ],
  },
  {
    name: "Bailleur",
    price: "29",
    popular: true,
    description: "Idéal pour les propriétaires bailleurs",
    features: [
      "Tout le plan Particulier",
      "Quittances de loyer automatiques",
      "Générateur de baux",
      "Rappels avancés (IRL, assurances)",
      "Envoi par email intégré",
      "Coffre-fort (5 Go)",
      "Partage sécurisé",
    ],
  },
  {
    name: "Freelance",
    price: "39",
    description: "Pour les indépendants et auto-entrepreneurs",
    features: [
      "Tout le plan Bailleur",
      "Création d'entreprise guidée",
      "Modèles contrats & CGV",
      "Assistant IA illimité",
      "Coffre-fort (10 Go)",
      "Templates RGPD",
    ],
  },
  {
    name: "Business",
    price: "69",
    description: "Pour les PME et équipes",
    features: [
      "Tout le plan Freelance",
      "Multi-utilisateurs (5 inclus)",
      "Coffre-fort (50 Go)",
      "Rôles et permissions",
      "Support prioritaire",
      "API d'intégration",
    ],
  },
];

const Pricing = () => {
  return (
    <section id="pricing" className="py-24 bg-muted/30">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
            Des tarifs <span className="text-gradient-gold">simples et transparents</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Choisissez le plan adapté à votre profil. Sans engagement, résiliable à tout moment.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {plans.map((plan, i) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className={`relative bg-card rounded-xl p-6 border transition-all duration-300 flex flex-col ${
                plan.popular
                  ? "border-gold shadow-gold scale-[1.02]"
                  : "border-border/50 shadow-card hover:shadow-card-hover"
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-gold text-accent-foreground text-xs font-bold px-4 py-1 rounded-full">
                  Populaire
                </div>
              )}
              <div className="mb-6">
                <h3 className="text-lg font-bold text-foreground">{plan.name}</h3>
                <p className="text-sm text-muted-foreground mt-1">{plan.description}</p>
              </div>
              <div className="mb-6">
                <span className="text-4xl font-extrabold text-foreground">{plan.price}€</span>
                <span className="text-muted-foreground text-sm"> / mois</span>
              </div>
              <ul className="space-y-3 mb-8 flex-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-foreground">
                    <Check className="h-4 w-4 text-gold shrink-0 mt-0.5" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <Link
                to="/onboarding"
                className={`w-full text-center py-3 rounded-lg font-semibold transition-all ${
                  plan.popular
                    ? "bg-gradient-gold text-accent-foreground shadow-gold hover:opacity-90"
                    : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                }`}
              >
                Commencer
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Pricing;
