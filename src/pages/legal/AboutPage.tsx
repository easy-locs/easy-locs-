import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import { useI18n } from "@/lib/i18n";
import SEOHead from "@/components/SEOHead";
import { Building, Globe, Shield, Users, Sparkles, BarChart3, FileText, Headphones } from "lucide-react";
import { Link } from "react-router-dom";

const AboutPage = () => {
  const { t, locale } = useI18n();
  const isFr = locale === "fr";

  const values = [
    { icon: Shield, title: isFr ? "Conformité mondiale" : "Global Compliance", desc: isFr ? "Documents juridiques adaptés à la législation de chaque pays — baux, quittances, inventaires." : "Legal documents tailored to each country's legislation — leases, receipts, inventories." },
    { icon: Globe, title: isFr ? "190+ pays" : "190+ Countries", desc: isFr ? "Gérez vos biens partout dans le monde avec devises, langues et modèles locaux." : "Manage properties worldwide with local currencies, languages, and templates." },
    { icon: Users, title: isFr ? "Multi-rôles" : "Multi-role", desc: isFr ? "Propriétaires, locataires, prestataires et clients — chacun dispose de son portail dédié." : "Landlords, tenants, service providers, and clients — each with a dedicated portal." },
    { icon: Building, title: isFr ? "Tout-en-un" : "All-in-one", desc: isFr ? "Gestion locative, locations saisonnières, marketplace de services et conciergerie." : "Property management, seasonal rentals, service marketplace, and concierge." },
    { icon: Sparkles, title: isFr ? "IA intégrée" : "AI-Powered", desc: isFr ? "Génération automatique de documents, audit qualité, suggestions intelligentes." : "Automatic document generation, quality audits, smart suggestions." },
    { icon: BarChart3, title: isFr ? "Finance & Comptabilité" : "Finance & Accounting", desc: isFr ? "Suivi des revenus, dépenses, résultat net et bilans fiscaux par pays." : "Track revenue, expenses, net results, and tax reports by country." },
    { icon: FileText, title: isFr ? "Documents légaux" : "Legal Documents", desc: isFr ? "Baux meublés/vides, quittances, états des lieux, mises en demeure — générés en 1 clic." : "Furnished/unfurnished leases, receipts, inventories, formal notices — generated in 1 click." },
    { icon: Headphones, title: isFr ? "Conciergerie" : "Concierge", desc: isFr ? "Réservations, chauffeurs privés, ménage, transferts aéroport et activités locales." : "Bookings, private drivers, cleaning, airport transfers, and local activities." },
  ];

  return (
    <div className="app-mobile-page flex flex-col">
      <SEOHead
        title="About Easy-Locs® — Global Property Management & Marketplace Platform"
        description="Easy-Locs® is an all-in-one SaaS platform for property management, seasonal rentals, and service marketplace across 190+ countries. Leases, receipts, concierge, tenant portals and more."
        canonical="https://www.easy-locs.com/about"
        jsonLd={[
          { "@context": "https://schema.org", "@type": "AboutPage", name: "About Easy-Locs", url: "https://www.easy-locs.com/about", description: "Easy-Locs is a global property management and marketplace SaaS platform operating in 190+ countries." },
          { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [
            { "@type": "ListItem", position: 1, name: "Home", item: "https://www.easy-locs.com/" },
            { "@type": "ListItem", position: 2, name: "About", item: "https://www.easy-locs.com/about" },
          ]},
        ]}
      />
      <Navbar />
      <main className="flex-1 pt-24 pb-16">
        <div className="container max-w-4xl">
          {/* Hero section */}
          <div className="text-center mb-12">
            <h1 className="text-3xl sm:text-4xl font-extrabold text-foreground mb-4">
              {isFr ? "Easy-Locs® — La plateforme mondiale de gestion immobilière" : "Easy-Locs® — The Global Property Management Platform"}
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              {isFr
                ? "Une plateforme SaaS tout-en-un pour créer et gérer un business immobilier à distance : gestion locative longue durée, réservations saisonnières en direct, marketplace de services — le tout depuis un seul tableau de bord, dans plus de 190 pays."
                : "An all-in-one SaaS platform to create and manage a property business remotely: long-term rental management, direct seasonal bookings, service marketplace — all from a single dashboard, in 190+ countries."}
            </p>
          </div>

          {/* Mission */}
          <div className="bg-card border border-border rounded-2xl p-6 sm:p-8 mb-10">
            <h2 className="text-xl font-bold text-foreground mb-3">
              {isFr ? "Notre mission" : "Our Mission"}
            </h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              {isFr
                ? "Rendre la gestion immobilière accessible, conforme et professionnelle partout dans le monde. Nous croyons que chaque propriétaire mérite des outils de niveau professionnel sans la complexité — que vous gériez un appartement à Paris, une villa à Bali ou un portefeuille multi-pays."
                : "Making property management accessible, compliant, and professional worldwide. We believe every landlord deserves professional-grade tools without the complexity — whether you manage an apartment in Paris, a villa in Bali, or a multi-country portfolio."}
            </p>
            <p className="text-muted-foreground leading-relaxed">
              {isFr
                ? "Easy-Locs® automatise la génération de documents juridiques conformes, le suivi des paiements (SEPA, Stripe, virement), la communication avec les locataires et les clients, et s'adapte à la législation de chaque pays."
                : "Easy-Locs® automates compliant legal document generation, payment tracking (SEPA, Stripe, bank transfer), communication with tenants and clients, and adapts to each country's legislation."}
            </p>
          </div>

          {/* Three pillars */}
          <div className="mb-10">
            <h2 className="text-xl font-bold text-foreground mb-5 text-center">
              {isFr ? "3 piliers, 1 plateforme" : "3 Pillars, 1 Platform"}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { emoji: "🏠", title: isFr ? "Gestion Locative" : "Property Management", desc: isFr ? "Baux, loyers, quittances, comptabilité, interventions" : "Leases, rents, receipts, accounting, maintenance" },
                { emoji: "🏖️", title: isFr ? "Locations Saisonnières" : "Seasonal Rentals", desc: isFr ? "Réservations directes, calendrier, pricing dynamique" : "Direct bookings, calendar, dynamic pricing" },
                { emoji: "🛍️", title: isFr ? "Marketplace & Conciergerie" : "Marketplace & Concierge", desc: isFr ? "Services, activités, emplois, réservations" : "Services, activities, jobs, bookings" },
              ].map(p => (
                <div key={p.title} className="border border-border rounded-xl p-5 bg-card text-center">
                  <span className="text-3xl mb-3 block">{p.emoji}</span>
                  <h3 className="font-bold text-foreground mb-1">{p.title}</h3>
                  <p className="text-sm text-muted-foreground">{p.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Values grid */}
          <h2 className="text-xl font-bold text-foreground mb-5 text-center">
            {isFr ? "Ce qui nous différencie" : "What Sets Us Apart"}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-12">
            {values.map((v) => (
              <div key={v.title} className="border border-border rounded-xl p-5 bg-card">
                <v.icon className="h-6 w-6 text-accent mb-3" />
                <h3 className="font-semibold text-foreground mb-1">{v.title}</h3>
                <p className="text-sm text-muted-foreground">{v.desc}</p>
              </div>
            ))}
          </div>

          {/* CTA */}
          <div className="text-center space-y-4">
            <h2 className="text-xl font-bold text-foreground">
              {isFr ? "Prêt à commencer ?" : "Ready to get started?"}
            </h2>
            <div className="flex flex-wrap justify-center gap-3">
              <Link to="/signup" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-accent text-accent-foreground font-semibold text-sm hover:opacity-90 transition-opacity">
                {isFr ? "Créer un compte gratuit" : "Create a free account"}
              </Link>
              <Link to="/explore" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-border bg-card text-foreground font-semibold text-sm hover:bg-muted transition-colors">
                {isFr ? "Explorer la marketplace" : "Explore the marketplace"}
              </Link>
            </div>
            <nav className="flex flex-wrap justify-center gap-4 mt-6 text-sm" aria-label="Related pages">
              <Link to="/property-management" className="text-muted-foreground hover:text-foreground transition-colors">{isFr ? "Gestion locative →" : "Property Management →"}</Link>
              <Link to="/seasonal-rentals" className="text-muted-foreground hover:text-foreground transition-colors">{isFr ? "Locations saisonnières →" : "Seasonal Rentals →"}</Link>
              <Link to="/concierge-services" className="text-muted-foreground hover:text-foreground transition-colors">{isFr ? "Conciergerie →" : "Concierge →"}</Link>
              <Link to="/marketplace" className="text-muted-foreground hover:text-foreground transition-colors">Marketplace →</Link>
            </nav>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default AboutPage;
