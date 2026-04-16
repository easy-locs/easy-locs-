import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import { useI18n } from "@/lib/i18n";
import SEOHead from "@/components/SEOHead";
import { HelpCircle, FileText, CreditCard, Users, Home, Shield, Mail, Smartphone, MapPin, Wallet, Truck, MessageSquare } from "lucide-react";
import { useUiEngine } from "@/hooks/useUiEngine";

const HelpPage = () => {
  const { t } = useI18n();

  const faqs = [
    { icon: Home, qKey: "page.help.faq_add_property_q", aKey: "page.help.faq_add_property_a" },
    { icon: Users, qKey: "page.help.faq_invite_tenant_q", aKey: "page.help.faq_invite_tenant_a" },
    { icon: Wallet, qKey: "page.help.faq_wallet_q", aKey: "page.help.faq_wallet_a" },
    { icon: Truck, qKey: "page.help.faq_taxi_q", aKey: "page.help.faq_taxi_a" },
    { icon: MapPin, qKey: "page.help.faq_nearby_q", aKey: "page.help.faq_nearby_a" },
    { icon: MessageSquare, qKey: "page.help.faq_orbit_q", aKey: "page.help.faq_orbit_a" },
    { icon: CreditCard, qKey: "page.help.faq_payment_q", aKey: "page.help.faq_payment_a" },
    { icon: Shield, qKey: "page.help.faq_security_q", aKey: "page.help.faq_security_a" },
    { icon: Smartphone, qKey: "page.help.faq_install_q", aKey: "page.help.faq_install_a" },
    { icon: Mail, qKey: "page.help.faq_contact_q", aKey: "page.help.faq_contact_a" },
  ];

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map(f => ({
      "@type": "Question",
      name: t(f.qKey),
      acceptedAnswer: { "@type": "Answer", text: t(f.aKey) },
    })),
  };

  useUiEngine("legal-helppage");

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
              {t("page.help.center_title")}
            </h1>
          </div>
          <p className="text-muted-foreground mb-10">
            {t("page.help.how_can_we_help")}
          </p>

          <div className="space-y-4">
            {faqs.map((faq, i) => (
              <details key={i} className="border border-border rounded-lg bg-card group">
                <summary className="flex items-center gap-3 px-5 py-4 cursor-pointer text-foreground font-medium text-sm hover:bg-muted/50 rounded-lg transition-colors">
                  <faq.icon className="h-4 w-4 text-accent shrink-0" />
                  {t(faq.qKey)}
                </summary>
                <div className="px-5 pb-4 text-sm text-muted-foreground leading-relaxed">{t(faq.aKey)}</div>
              </details>
            ))}
          </div>

          <div className="mt-12 border border-border rounded-lg p-6 bg-card text-center">
            <p className="text-foreground font-semibold mb-2">
              {t("page.help.need_more_help")}
            </p>
            <p className="text-sm text-muted-foreground mb-4">
              {t("page.help.contact_response_time")}
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
