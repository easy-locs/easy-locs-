import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import { useI18n } from "@/lib/i18n";
import SEOHead from "@/components/SEOHead";
import { HelpCircle, FileText, CreditCard, Users, Home, Shield, Mail } from "lucide-react";

const HelpPage = () => {
  const { t } = useI18n();

  const faqs = [
    { icon: Home, q: "Comment ajouter un bien immobilier ?", a: "Depuis le tableau de bord, allez dans « Gestion locative » → « Biens » et cliquez sur « Ajouter un bien ». Renseignez les informations du bien et validez." },
    { icon: Users, q: "Comment inviter un locataire ?", a: "Dans « Gestion locative » → « Locataires », cliquez sur « Ajouter un locataire ». Renseignez son email, il recevra une invitation pour accéder à son espace." },
    { icon: FileText, q: "Comment générer une quittance ?", a: "Les quittances sont générées automatiquement chaque mois. Vous pouvez aussi en créer manuellement depuis « Quittances » → « Nouvelle quittance »." },
    { icon: CreditCard, q: "Comment fonctionne la facturation ?", a: "Easy-Locs® propose un essai gratuit de 3 jours. Ensuite, choisissez un abonnement mensuel ou annuel. La résiliation est possible à tout moment." },
    { icon: Shield, q: "Mes données sont-elles sécurisées ?", a: "Oui, vos données sont hébergées dans l'Union Européenne et protégées par des mesures de sécurité conformes au RGPD." },
    { icon: Mail, q: "Comment contacter le support ?", a: "Envoyez un email à contact@easy-locs.com ou utilisez le formulaire de contact. Nous répondons sous 24 à 48 heures." },
  ];

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map(f => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  return (
    <div className="min-h-screen flex flex-col">
      <SEOHead
        title="Help & FAQ — Easy-Locs Property Management"
        description="Find answers to common questions about Easy-Locs. How to add properties, invite tenants, generate receipts and more."
        canonical="https://www.easy-locs.com/help"
        jsonLd={faqJsonLd}
      />
      <Navbar />
      <main className="flex-1 pt-24 pb-16">
        <div className="container max-w-3xl">
          <div className="flex items-center gap-3 mb-6">
            <HelpCircle className="h-8 w-8 text-accent" />
            <h1 className="text-3xl font-bold text-foreground">{t("legal.help.title")}</h1>
          </div>
          <p className="text-muted-foreground mb-10">{t("legal.help.subtitle")}</p>

          <div className="space-y-4">
            {faqs.map((faq, i) => (
              <details key={i} className="border border-border rounded-lg bg-card group">
                <summary className="flex items-center gap-3 px-5 py-4 cursor-pointer text-foreground font-medium text-sm hover:bg-muted/50 rounded-lg transition-colors">
                  <faq.icon className="h-4 w-4 text-accent shrink-0" />
                  {faq.q}
                </summary>
                <div className="px-5 pb-4 text-sm text-muted-foreground leading-relaxed">{faq.a}</div>
              </details>
            ))}
          </div>

          <div className="mt-12 border border-border rounded-lg p-6 bg-card text-center">
            <p className="text-foreground font-semibold mb-2">{t("legal.help.more")}</p>
            <p className="text-sm text-muted-foreground mb-4">{t("legal.help.contact_us")}</p>
            <a href="mailto:contact@easy-locs.com" className="inline-block bg-accent text-accent-foreground font-semibold text-sm px-6 py-2.5 rounded-lg hover:opacity-90 transition-opacity">
              contact@easy-locs.com
            </a>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default HelpPage;
