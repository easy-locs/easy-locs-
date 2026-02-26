import { motion } from "framer-motion";
import { Check, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";

const plans = [
  {
    name: "Mensuel",
    price: "29",
    interval: "mois",
    description: "Flexibilité maximale, résiliable à tout moment",
    features: [
      "PDF & documents illimités",
      "Baux, quittances, états des lieux",
      "Gestion locative complète",
      "Rappels automatiques",
      "Coffre-fort numérique",
      "Assistant IA",
      "Support prioritaire",
    ],
  },
  {
    name: "Annuel",
    price: "199",
    interval: "an",
    popular: true,
    savings: "Économisez 149€/an",
    description: "Le meilleur rapport qualité-prix",
    features: [
      "PDF & documents illimités",
      "Baux, quittances, états des lieux",
      "Gestion locative complète",
      "Rappels automatiques",
      "Coffre-fort numérique",
      "Assistant IA",
      "Support prioritaire",
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
            Un seul plan, <span className="text-gradient-gold">tout illimité</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            3 jours d'essai gratuit. Renouvellement automatique. Résiliable à tout moment.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-2xl mx-auto">
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
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-gold text-accent-foreground text-xs font-bold px-4 py-1 rounded-full flex items-center gap-1">
                  <Sparkles className="h-3 w-3" />
                  {plan.savings}
                </div>
              )}
              <div className="mb-6">
                <h3 className="text-lg font-bold text-foreground">{plan.name}</h3>
                <p className="text-sm text-muted-foreground mt-1">{plan.description}</p>
              </div>
              <div className="mb-6">
                <span className="text-4xl font-extrabold text-foreground">{plan.price}€</span>
                <span className="text-muted-foreground text-sm"> / {plan.interval}</span>
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
                Essai gratuit 3 jours
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Pricing;
