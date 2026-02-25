import { motion } from "framer-motion";
import {
  FileText,
  Home,
  Bell,
  FolderLock,
  BrainCircuit,
  Building2,
  Send,
  Share2,
} from "lucide-react";

const features = [
  {
    icon: FileText,
    title: "Quittances de loyer",
    description: "Génération automatique, rappels mensuels, envoi par email et export PDF conformes.",
  },
  {
    icon: Home,
    title: "Générateur de baux",
    description: "Baux résidentiels et commerciaux personnalisables, conformes à la législation française.",
  },
  {
    icon: Building2,
    title: "Création d'entreprise",
    description: "Questionnaire intelligent pour préparer vos statuts SAS, SARL ou auto-entrepreneur.",
  },
  {
    icon: Send,
    title: "Documents administratifs",
    description: "Attestations sur l'honneur, mises en demeure, résiliations et modèles RGPD.",
  },
  {
    icon: Bell,
    title: "Rappels intelligents",
    description: "Ne manquez plus aucune échéance : loyers, renouvellements, indexation IRL, assurances.",
  },
  {
    icon: FolderLock,
    title: "Coffre-fort sécurisé",
    description: "Stockage, classement automatique par IA, recherche et explication de vos documents.",
  },
  {
    icon: BrainCircuit,
    title: "Assistant IA",
    description: "« Que dois-je faire maintenant ? » — l'IA analyse votre situation et vous guide.",
  },
  {
    icon: Share2,
    title: "Partage sécurisé",
    description: "Partagez vos documents avec des liens temporaires et un contrôle d'accès granulaire.",
  },
];

const Features = () => {
  return (
    <section id="features" className="py-24 bg-background">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
            Tout votre administratif, <span className="text-gradient-gold">au même endroit</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Des outils puissants pensés pour les particuliers, bailleurs, freelances et entreprises.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
              className="group bg-card rounded-xl p-6 shadow-card hover:shadow-card-hover transition-all duration-300 border border-border/50"
            >
              <div className="w-12 h-12 rounded-lg bg-gradient-gold flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <feature.icon className="h-6 w-6 text-accent-foreground" />
              </div>
              <h3 className="font-semibold text-foreground mb-2">{feature.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;
