import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import { useI18n } from "@/lib/i18n";
import SEOHead from "@/components/SEOHead";
import { HelpCircle, FileText, CreditCard, Users, Home, Shield, Mail, Smartphone, MapPin, Wallet, Truck, MessageSquare } from "lucide-react";

const HelpPage = () => {
  const { t, lang } = useI18n();

  const faqsFr = [
    { icon: Home, q: "Comment ajouter une propriété ?", a: "Depuis le Dashboard, allez dans 'Gestion Immo' puis cliquez sur 'Ajouter une propriété'. Remplissez les détails (adresse, loyer, photos) et enregistrez." },
    { icon: Users, q: "Comment inviter un locataire ?", a: "Dans 'Gestion Immo' → 'Locataires', cliquez sur 'Ajouter un locataire'. Entrez son email — il recevra une invitation pour accéder à son espace." },
    { icon: Wallet, q: "Comment fonctionne le portefeuille Easy-Locs ?", a: "Votre portefeuille vous permet d'envoyer et recevoir de l'argent, payer vos commandes et loyers. Rechargez par carte bancaire, virement ou mobile money. Zéro frais pour les utilisateurs." },
    { icon: Truck, q: "Comment commander un taxi ou une livraison ?", a: "Depuis le Dashboard, appuyez sur 'Taxi' ou 'Livraison'. Entrez votre destination, choisissez un véhicule et confirmez. Suivez votre trajet en temps réel." },
    { icon: MapPin, q: "Comment trouver des restaurants et services près de moi ?", a: "Utilisez le Radar (2ème onglet) pour découvrir les restaurants, hôtels, pharmacies et services autour de vous. Filtrez par catégorie et distance." },
    { icon: MessageSquare, q: "Comment utiliser Orbit pour communiquer ?", a: "Orbit est votre messagerie intégrée. Envoyez des messages, passez des appels, partagez des stories de 24h. Retrouvez-le dans le 3ème onglet de la barre de navigation." },
    { icon: CreditCard, q: "Quels sont les moyens de paiement acceptés ?", a: "Easy-Locs accepte les cartes bancaires (Visa, Mastercard), le portefeuille Easy-Locs, le mobile money et les virements bancaires selon votre pays." },
    { icon: Shield, q: "Mes données sont-elles sécurisées ?", a: "Oui, vos données sont protégées par un chiffrement de bout en bout et hébergées dans des datacenters sécurisés. Nous respectons les normes RGPD." },
    { icon: Smartphone, q: "Comment installer l'application sur mon téléphone ?", a: "Ouvrez easy-locs.com dans votre navigateur mobile, puis appuyez sur 'Ajouter à l'écran d'accueil'. L'application fonctionne comme une app native." },
    { icon: Mail, q: "Comment contacter le support ?", a: "Envoyez un email à contact@easy-locs.com ou utilisez la section 'Aide' dans le menu Me. Nous répondons sous 24 à 48 heures." },
  ];

  const faqsEn = [
    { icon: Home, q: "How do I add a property?", a: "From the Dashboard, go to 'Property Management' and click 'Add a Property'. Fill in the details (address, rent, photos) and save." },
    { icon: Users, q: "How do I invite a tenant?", a: "In 'Property Management' → 'Tenants', click 'Add a Tenant'. Enter their email — they'll receive an invitation to access their portal." },
    { icon: Wallet, q: "How does the Easy-Locs wallet work?", a: "Your wallet lets you send and receive money, pay for orders and rent. Top up via bank card, transfer, or mobile money. Zero fees for users." },
    { icon: Truck, q: "How do I order a taxi or delivery?", a: "From the Dashboard, tap 'Taxi' or 'Delivery'. Enter your destination, choose a vehicle, and confirm. Track your ride in real time." },
    { icon: MapPin, q: "How do I find restaurants and services nearby?", a: "Use the Radar tab (2nd tab) to discover restaurants, hotels, pharmacies, and services around you. Filter by category and distance." },
    { icon: MessageSquare, q: "How do I use Orbit to communicate?", a: "Orbit is your built-in messenger. Send messages, make calls, share 24h stories. Find it in the 3rd tab of the navigation bar." },
    { icon: CreditCard, q: "What payment methods are accepted?", a: "Easy-Locs accepts bank cards (Visa, Mastercard), Easy-Locs wallet, mobile money, and bank transfers depending on your country." },
    { icon: Shield, q: "Is my data secure?", a: "Yes, your data is protected with end-to-end encryption and hosted in secure data centers. We comply with GDPR standards." },
    { icon: Smartphone, q: "How do I install the app on my phone?", a: "Open easy-locs.com in your mobile browser, then tap 'Add to Home Screen'. The app works just like a native application." },
    { icon: Mail, q: "How do I contact support?", a: "Send an email to contact@easy-locs.com or use the 'Help' section in the Me menu. We respond within 24–48 hours." },
  ];

  const faqs = lang === "fr" ? faqsFr : faqsEn;

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
    <div className="app-mobile-page flex flex-col">
      <SEOHead
        title="Help & FAQ — Easy-Locs"
        description="Find answers to common questions about Easy-Locs. Wallet, taxi, delivery, messaging, property management and more."
        canonical="https://www.easy-locs.com/help"
        jsonLd={faqJsonLd}
      />
      <Navbar />
      <main className="flex-1 pt-24 pb-16">
        <div className="container max-w-3xl">
          <div className="flex items-center gap-3 mb-6">
            <HelpCircle className="h-8 w-8 text-accent" />
            <h1 className="text-3xl font-bold text-foreground">
              {lang === "fr" ? "Centre d'aide" : "Help Center"}
            </h1>
          </div>
          <p className="text-muted-foreground mb-10">
            {lang === "fr" ? "Comment pouvons-nous vous aider ?" : "How can we help you?"}
          </p>

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
            <p className="text-foreground font-semibold mb-2">
              {lang === "fr" ? "Besoin d'aide supplémentaire ?" : "Need more help?"}
            </p>
            <p className="text-sm text-muted-foreground mb-4">
              {lang === "fr" ? "Contactez-nous, nous répondons sous 24-48h" : "Contact us, we respond within 24-48 hours"}
            </p>
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
