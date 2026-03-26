import { Link, useParams } from "react-router-dom";
import { Home, FileText, Users, CreditCard, BarChart3, Shield, CheckCircle2, ArrowRight, Building2, Key } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import SEOHead from "@/components/SEOHead";
import AppLogo from "@/components/AppLogo";

const COUNTRY_PAGES = [
  // Europe
  { slug: "france", flag: "🇫🇷", name: "France", code: "FR" },
  { slug: "uk", flag: "🇬🇧", name: "United Kingdom", code: "GB" },
  { slug: "spain", flag: "🇪🇸", name: "Spain", code: "ES" },
  { slug: "germany", flag: "🇩🇪", name: "Germany", code: "DE" },
  { slug: "italy", flag: "🇮🇹", name: "Italy", code: "IT" },
  { slug: "portugal", flag: "🇵🇹", name: "Portugal", code: "PT" },
  { slug: "netherlands", flag: "🇳🇱", name: "Netherlands", code: "NL" },
  { slug: "belgium", flag: "🇧🇪", name: "Belgium", code: "BE" },
  { slug: "switzerland", flag: "🇨🇭", name: "Switzerland", code: "CH" },
  { slug: "austria", flag: "🇦🇹", name: "Austria", code: "AT" },
  { slug: "poland", flag: "🇵🇱", name: "Poland", code: "PL" },
  { slug: "sweden", flag: "🇸🇪", name: "Sweden", code: "SE" },
  { slug: "ireland", flag: "🇮🇪", name: "Ireland", code: "IE" },
  { slug: "greece", flag: "🇬🇷", name: "Greece", code: "GR" },
  { slug: "czech-republic", flag: "🇨🇿", name: "Czech Republic", code: "CZ" },
  { slug: "hungary", flag: "🇭🇺", name: "Hungary", code: "HU" },
  { slug: "romania", flag: "🇷🇴", name: "Romania", code: "RO" },
  { slug: "croatia", flag: "🇭🇷", name: "Croatia", code: "HR" },
  { slug: "ukraine", flag: "🇺🇦", name: "Ukraine", code: "UA" },
  { slug: "serbia", flag: "🇷🇸", name: "Serbia", code: "RS" },
  // Americas
  { slug: "usa", flag: "🇺🇸", name: "United States", code: "US" },
  { slug: "canada", flag: "🇨🇦", name: "Canada", code: "CA" },
  { slug: "brazil", flag: "🇧🇷", name: "Brazil", code: "BR" },
  { slug: "mexico", flag: "🇲🇽", name: "Mexico", code: "MX" },
  { slug: "argentina", flag: "🇦🇷", name: "Argentina", code: "AR" },
  { slug: "colombia", flag: "🇨🇴", name: "Colombia", code: "CO" },
  { slug: "chile", flag: "🇨🇱", name: "Chile", code: "CL" },
  { slug: "peru", flag: "🇵🇪", name: "Peru", code: "PE" },
  { slug: "uruguay", flag: "🇺🇾", name: "Uruguay", code: "UY" },
  { slug: "ecuador", flag: "🇪🇨", name: "Ecuador", code: "EC" },
  { slug: "costa-rica", flag: "🇨🇷", name: "Costa Rica", code: "CR" },
  { slug: "panama", flag: "🇵🇦", name: "Panama", code: "PA" },
  // Africa
  { slug: "morocco", flag: "🇲🇦", name: "Morocco", code: "MA" },
  { slug: "tunisia", flag: "🇹🇳", name: "Tunisia", code: "TN" },
  { slug: "south-africa", flag: "🇿🇦", name: "South Africa", code: "ZA" },
  { slug: "nigeria", flag: "🇳🇬", name: "Nigeria", code: "NG" },
  { slug: "senegal", flag: "🇸🇳", name: "Senegal", code: "SN" },
  { slug: "egypt", flag: "🇪🇬", name: "Egypt", code: "EG" },
  { slug: "kenya", flag: "🇰🇪", name: "Kenya", code: "KE" },
  { slug: "ghana", flag: "🇬🇭", name: "Ghana", code: "GH" },
  { slug: "ivory-coast", flag: "🇨🇮", name: "Ivory Coast", code: "CI" },
  { slug: "cameroon", flag: "🇨🇲", name: "Cameroon", code: "CM" },
  { slug: "algeria", flag: "🇩🇿", name: "Algeria", code: "DZ" },
  { slug: "ethiopia", flag: "🇪🇹", name: "Ethiopia", code: "ET" },
  { slug: "tanzania", flag: "🇹🇿", name: "Tanzania", code: "TZ" },
  // Middle East
  { slug: "dubai", flag: "🇦🇪", name: "Dubai / UAE", code: "AE" },
  { slug: "saudi-arabia", flag: "🇸🇦", name: "Saudi Arabia", code: "SA" },
  { slug: "turkey", flag: "🇹🇷", name: "Turkey", code: "TR" },
  { slug: "qatar", flag: "🇶🇦", name: "Qatar", code: "QA" },
  { slug: "kuwait", flag: "🇰🇼", name: "Kuwait", code: "KW" },
  { slug: "bahrain", flag: "🇧🇭", name: "Bahrain", code: "BH" },
  { slug: "oman", flag: "🇴🇲", name: "Oman", code: "OM" },
  { slug: "jordan", flag: "🇯🇴", name: "Jordan", code: "JO" },
  { slug: "lebanon", flag: "🇱🇧", name: "Lebanon", code: "LB" },
  { slug: "israel", flag: "🇮🇱", name: "Israel", code: "IL" },
  { slug: "iraq", flag: "🇮🇶", name: "Iraq", code: "IQ" },
  // Asia-Pacific
  { slug: "japan", flag: "🇯🇵", name: "Japan", code: "JP" },
  { slug: "australia", flag: "🇦🇺", name: "Australia", code: "AU" },
  { slug: "singapore", flag: "🇸🇬", name: "Singapore", code: "SG" },
  { slug: "india", flag: "🇮🇳", name: "India", code: "IN" },
  { slug: "thailand", flag: "🇹🇭", name: "Thailand", code: "TH" },
  { slug: "new-zealand", flag: "🇳🇿", name: "New Zealand", code: "NZ" },
  { slug: "south-korea", flag: "🇰🇷", name: "South Korea", code: "KR" },
  { slug: "malaysia", flag: "🇲🇾", name: "Malaysia", code: "MY" },
  { slug: "philippines", flag: "🇵🇭", name: "Philippines", code: "PH" },
  { slug: "indonesia", flag: "🇮🇩", name: "Indonesia", code: "ID" },
  { slug: "vietnam", flag: "🇻🇳", name: "Vietnam", code: "VN" },
  { slug: "pakistan", flag: "🇵🇰", name: "Pakistan", code: "PK" },
  { slug: "hong-kong", flag: "🇭🇰", name: "Hong Kong", code: "HK" },
  { slug: "taiwan", flag: "🇹🇼", name: "Taiwan", code: "TW" },
];

const FEATURES = [
  { icon: Home, title: "Property Management", desc: "Manage unlimited properties across multiple countries from a single dashboard." },
  { icon: FileText, title: "Legal Documents", desc: "Generate jurisdiction-compliant leases, receipts, and legal notices automatically." },
  { icon: Users, title: "Tenant Portal", desc: "Self-service portal for tenants to view documents, pay rent, and communicate." },
  { icon: CreditCard, title: "Rent Collection", desc: "Collect rent via Stripe, PayPal, SEPA Direct Debit, or bank transfer." },
  { icon: BarChart3, title: "Financial Reports", desc: "Automated fiscal reports adapted to local tax regulations across 190+ countries." },
  { icon: Shield, title: "Enterprise Security", desc: "SSO, MFA, encrypted storage, and GDPR-compliant data handling." },
];

const PropertyManagement = () => {
  const { t } = useI18n();
  const { country: countrySlug } = useParams();

  const currentCountry = COUNTRY_PAGES.find(c => c.slug === countrySlug);
  const pageTitle = currentCountry
    ? `Property Management in ${currentCountry.name} — Easy-Locs`
    : "Property Management Software — Easy-Locs | 190+ Countries";
  const pageDesc = currentCountry
    ? `Manage rental properties in ${currentCountry.name}. Leases, receipts, tenant portal — compliant with ${currentCountry.name} regulations. Free to start.`
    : "All-in-one rental management for landlords worldwide. Manage properties in 190+ countries with jurisdiction-compliant legal documents.";

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: "Easy-Locs",
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      description: pageDesc,
      url: `https://www.easy-locs.com/property-management${countrySlug ? `-${countrySlug}` : ""}`,
      ...(currentCountry ? { countryOfOrigin: { "@type": "Country", name: currentCountry.name } } : {}),
      offers: { "@type": "Offer", price: "0", priceCurrency: "EUR", description: "Free plan available" },
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: "https://www.easy-locs.com/" },
        { "@type": "ListItem", position: 2, name: "Property Management", item: "https://www.easy-locs.com/property-management" },
        ...(currentCountry ? [{ "@type": "ListItem", position: 3, name: currentCountry.name, item: `https://www.easy-locs.com/property-management-${countrySlug}` }] : []),
      ],
    },
  ];

  return (
    <div className="app-mobile-page bg-background">
      <SEOHead
        title={pageTitle}
        description={pageDesc}
        canonical={`https://www.easy-locs.com/property-management${countrySlug ? `-${countrySlug}` : ""}`}
        jsonLd={jsonLd as any}
      />
      {/* Nav */}
      <header className="border-b border-border bg-card/80 backdrop-blur sticky top-0 z-40">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-4 py-3">
          <AppLogo variant="header" linkTo="/" />
          <div className="flex gap-3">
            <Link to="/login" className="text-sm text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5">{t("nav.login")}</Link>
            <Link to="/signup" className="bg-gradient-gold text-accent-foreground text-sm font-semibold px-4 py-1.5 rounded-lg hover:opacity-90 transition-opacity">{t("nav.signup")}</Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
            {currentCountry ? (
              <>{currentCountry.flag} Property Management in {currentCountry.name}</>
            ) : (
              <>🌍 Property Management Software for 190+ Countries</>
            )}
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto mb-8">{pageDesc}</p>
          <Link to="/signup" className="inline-flex items-center gap-2 bg-gradient-gold text-accent-foreground px-8 py-3 rounded-xl font-semibold text-base hover:opacity-90 transition-opacity">
            Start Free <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="py-12 px-4 bg-muted/30">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl font-bold text-foreground text-center mb-8">Everything you need</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((f) => (
              <div key={f.title} className="bg-card p-6 rounded-xl border border-border/50 shadow-card">
                <f.icon className="h-8 w-8 text-accent mb-3" />
                <h3 className="font-semibold text-foreground mb-1">{f.title}</h3>
                <p className="text-sm text-muted-foreground">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Countries grid */}
      <section className="py-12 px-4">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl font-bold text-foreground text-center mb-8">Available in 80+ countries</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {COUNTRY_PAGES.map((c) => (
              <Link key={c.slug} to={`/property-management-${c.slug}`}
                className={`flex items-center gap-2 bg-card rounded-lg px-3 py-2.5 border transition-all text-sm ${
                  countrySlug === c.slug ? "border-accent bg-accent/10 font-semibold" : "border-border/50 hover:border-accent/50 hover:bg-muted/30"
                }`}
              >
                <span className="text-lg">{c.flag}</span>
                <span className="truncate text-foreground">{c.name}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* CTA + Internal Links */}
      <section className="py-16 px-4 bg-muted/30">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-2xl font-bold text-foreground mb-4">Ready to manage your properties?</h2>
          <p className="text-muted-foreground mb-6">Join thousands of landlords worldwide. Free plan includes 2 properties.</p>
          <Link to="/signup" className="inline-flex items-center gap-2 bg-gradient-gold text-accent-foreground px-8 py-3 rounded-xl font-semibold hover:opacity-90 transition-opacity">
            Get Started Free <ArrowRight className="h-4 w-4" />
          </Link>
          <nav className="flex flex-wrap justify-center gap-4 mt-8 text-sm" aria-label="Related pages">
            <Link to="/seasonal-rentals-booking" className="text-muted-foreground hover:text-accent transition-colors">Vacation Rentals →</Link>
            <Link to="/concierge-services" className="text-muted-foreground hover:text-accent transition-colors">Concierge Services →</Link>
            <Link to="/marketplace-services" className="text-muted-foreground hover:text-accent transition-colors">Marketplace →</Link>
            <Link to="/explore" className="text-muted-foreground hover:text-accent transition-colors">Explore Listings →</Link>
            <Link to="/locations" className="text-muted-foreground hover:text-accent transition-colors">All Locations →</Link>
          </nav>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8 px-4">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} Easy-Locs. All rights reserved.</p>
          <div className="flex gap-4">
            <Link to="/terms" className="hover:text-foreground">Terms</Link>
            <Link to="/privacy" className="hover:text-foreground">Privacy</Link>
            <Link to="/contact" className="hover:text-foreground">Contact</Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default PropertyManagement;
