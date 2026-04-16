import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import { useI18n } from "@/lib/i18n";
import SEOHead from "@/components/SEOHead";
import { Building, Globe, Shield, Users, Sparkles, BarChart3, FileText, Headphones } from "lucide-react";
import { Link } from "react-router-dom";
import { useUiEngine } from "@/hooks/useUiEngine";

const AboutPage = () => {
  const { t } = useI18n();

  const values = [
    { icon: Shield, titleKey: "page.about.value_compliance", descKey: "page.about.value_compliance_desc" },
    { icon: Globe, titleKey: "page.about.value_countries", descKey: "page.about.value_countries_desc" },
    { icon: Users, titleKey: "page.about.value_roles", descKey: "page.about.value_roles_desc" },
    { icon: Building, titleKey: "page.about.value_allinone", descKey: "page.about.value_allinone_desc" },
    { icon: Sparkles, titleKey: "page.about.value_ai", descKey: "page.about.value_ai_desc" },
    { icon: BarChart3, titleKey: "page.about.value_finance", descKey: "page.about.value_finance_desc" },
    { icon: FileText, titleKey: "page.about.value_legal", descKey: "page.about.value_legal_desc" },
    { icon: Headphones, titleKey: "page.about.value_concierge", descKey: "page.about.value_concierge_desc" },
  ];

  useUiEngine("legal-aboutpage");

  return (
    <div className="app-mobile-page flex flex-col">
      <SEOHead
        title="About Easy-Locs® — Super App for Food, Services, Taxi & Hotel"
        description="Easy-Locs® is an all-in-one super app for food, services, taxi, hotel, property management and marketplace across 190+ countries. 120+ currencies, 31 languages."
        canonical="https://www.easy-locs.com/about"
        jsonLd={[
          { "@context": "https://schema.org", "@type": "AboutPage", name: "About Easy-Locs", url: "https://www.easy-locs.com/about", description: "Easy-Locs is a global super app for food, services, taxi, hotel and more, operating in 190+ countries." },
          { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [
            { "@type": "ListItem", position: 1, name: "Home", item: "https://www.easy-locs.com/" },
            { "@type": "ListItem", position: 2, name: "About", item: "https://www.easy-locs.com/about" },
          ]},
        ]}
      />
      <Navbar />
      <main className="flex-1 pt-24 pb-16">
        <div className="container max-w-4xl">
          <div className="text-center mb-12">
            <h1 className="text-3xl sm:text-4xl font-extrabold text-foreground mb-4">
              {t("page.about.hero_title")}
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              {t("page.about.hero_desc")}
            </p>
          </div>

          <div className="bg-card border border-border rounded-2xl p-6 sm:p-8 mb-10">
            <h2 className="text-xl font-bold text-foreground mb-3">
              {t("page.about.mission_title")}
            </h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              {t("page.about.mission_p1")}
            </p>
            <p className="text-muted-foreground leading-relaxed">
              {t("page.about.mission_p2")}
            </p>
          </div>

          <div className="mb-10">
            <h2 className="text-xl font-bold text-foreground mb-5 text-center">
              {t("page.about.pillars_title")}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { emoji: "🏠", titleKey: "page.about.pillar_property", descKey: "page.about.pillar_property_desc" },
                { emoji: "🏖️", titleKey: "page.about.pillar_seasonal", descKey: "page.about.pillar_seasonal_desc" },
                { emoji: "🛍️", titleKey: "page.about.pillar_marketplace", descKey: "page.about.pillar_marketplace_desc" },
              ].map(p => (
                <div key={p.titleKey} className="border border-border rounded-xl p-5 bg-card text-center">
                  <span className="text-3xl mb-3 block">{p.emoji}</span>
                  <h3 className="font-bold text-foreground mb-1">{t(p.titleKey)}</h3>
                  <p className="text-sm text-muted-foreground">{t(p.descKey)}</p>
                </div>
              ))}
            </div>
          </div>

          <h2 className="text-xl font-bold text-foreground mb-5 text-center">
            {t("page.about.differentiator_title")}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-12">
            {values.map((v) => (
              <div key={v.titleKey} className="border border-border rounded-xl p-5 bg-card">
                <v.icon className="h-6 w-6 text-accent mb-3" />
                <h3 className="font-semibold text-foreground mb-1">{t(v.titleKey)}</h3>
                <p className="text-sm text-muted-foreground">{t(v.descKey)}</p>
              </div>
            ))}
          </div>

          <div className="text-center space-y-4">
            <h2 className="text-xl font-bold text-foreground">
              {t("page.about.cta_title")}
            </h2>
            <div className="flex flex-wrap justify-center gap-3">
              <Link to="/signup" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-accent text-accent-foreground font-semibold text-sm hover:opacity-90 transition-opacity">
                {t("page.about.cta_create_account")}
              </Link>
              <Link to="/explore" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-border bg-card text-foreground font-semibold text-sm hover:bg-muted transition-colors">
                {t("page.about.cta_explore")}
              </Link>
            </div>
            <nav className="flex flex-wrap justify-center gap-4 mt-6 text-sm" aria-label="Related pages">
              <Link to="/property-management" className="text-muted-foreground hover:text-foreground transition-colors">{t("page.about.link_property")}</Link>
              <Link to="/seasonal-rentals-booking" className="text-muted-foreground hover:text-foreground transition-colors">{t("page.about.link_seasonal")}</Link>
              <Link to="/concierge-services" className="text-muted-foreground hover:text-foreground transition-colors">{t("page.about.link_concierge")}</Link>
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
