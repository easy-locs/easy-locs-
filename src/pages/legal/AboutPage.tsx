import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import { useI18n } from "@/lib/i18n";
import { Building, Globe, Shield, Users } from "lucide-react";

const AboutPage = () => {
  const { t } = useI18n();
  const values = [
    { icon: Shield, title: "Conformité", desc: "Documents juridiques adaptés à chaque pays européen." },
    { icon: Globe, title: "International", desc: "Disponible dans plus de 30 pays à travers le monde." },
    { icon: Users, title: "Simplicité", desc: "Une interface intuitive pensée pour les propriétaires." },
    { icon: Building, title: "Tout-en-un", desc: "Gestion complète : baux, quittances, finances, inventaires." },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 pt-24 pb-16">
        <div className="container max-w-3xl">
          <h1 className="text-3xl font-bold text-foreground mb-6">{t("legal.about.title")}</h1>

          <div className="prose prose-sm max-w-none text-muted-foreground space-y-4 mb-12">
            <p className="text-base leading-relaxed">
              Easy-Locs® est une plateforme SaaS de gestion locative conçue pour simplifier la vie des propriétaires et bailleurs. Notre mission est de rendre la gestion immobilière accessible, conforme et efficace, partout dans le monde.
            </p>
            <p>
              Fondée avec la conviction que chaque propriétaire mérite des outils professionnels sans la complexité, Easy-Locs® automatise la génération de documents juridiques, le suivi des paiements, la communication avec les locataires et bien plus encore.
            </p>
            <p>
              Notre plateforme s'adapte à la législation de chaque pays, garantissant des baux et des documents conformes que vous soyez en France, en Espagne, en Allemagne ou ailleurs.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {values.map((v) => (
              <div key={v.title} className="border border-border rounded-lg p-5 bg-card">
                <v.icon className="h-6 w-6 text-accent mb-3" />
                <h3 className="font-semibold text-foreground mb-1">{v.title}</h3>
                <p className="text-sm text-muted-foreground">{v.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default AboutPage;
