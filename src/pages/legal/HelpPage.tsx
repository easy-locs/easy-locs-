import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import { useI18n } from "@/lib/i18n";
import SEOHead from "@/components/SEOHead";
import { HelpCircle, FileText, CreditCard, Users, Home, Shield, Mail } from "lucide-react";

const HelpPage = () => {
  const { t } = useI18n();

  const faqs = [
    { icon: Home, q: t("help.faq.q1") || "How do I add a property?", a: t("help.faq.a1") || "From the dashboard, go to 'Property Management' → 'Properties' and click 'Add a Property'. Fill in the details and save." },
    { icon: Users, q: t("help.faq.q2") || "How do I invite a tenant?", a: t("help.faq.a2") || "In 'Property Management' → 'Tenants', click 'Add a Tenant'. Enter their email — they'll receive an invitation to access their portal." },
    { icon: FileText, q: t("help.faq.q3") || "How do I generate a receipt?", a: t("help.faq.a3") || "Receipts are generated automatically each month. You can also create one manually from 'Receipts' → 'New Receipt'." },
    { icon: CreditCard, q: t("help.faq.q4") || "How does billing work?", a: t("help.faq.a4") || "Easy-Locs® offers a free trial. Then choose a monthly or annual subscription. You can cancel anytime." },
    { icon: Shield, q: t("help.faq.q5") || "Is my data secure?", a: t("help.faq.a5") || "Yes, your data is hosted in the European Union and protected with GDPR-compliant security measures." },
    { icon: Mail, q: t("help.faq.q6") || "How do I contact support?", a: t("help.faq.a6") || "Send an email to contact@easy-locs.com or use the contact form. We respond within 24–48 hours." },
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
    <div className="app-mobile-page flex flex-col">
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
