import { Link } from "react-router-dom";
import { Home, FileText, Users, CreditCard, BarChart3, Globe, Shield, CheckCircle2, ArrowRight, Building2, Key } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import logoEasylocs from "@/assets/logo-easylocs.png";

const COUNTRY_PAGES = [
  // Europe
  { slug: "france", flag: "🇫🇷", name: "France" },
  { slug: "uk", flag: "🇬🇧", name: "United Kingdom" },
  { slug: "spain", flag: "🇪🇸", name: "Spain" },
  { slug: "germany", flag: "🇩🇪", name: "Germany" },
  { slug: "italy", flag: "🇮🇹", name: "Italy" },
  { slug: "portugal", flag: "🇵🇹", name: "Portugal" },
  { slug: "netherlands", flag: "🇳🇱", name: "Netherlands" },
  { slug: "belgium", flag: "🇧🇪", name: "Belgium" },
  { slug: "switzerland", flag: "🇨🇭", name: "Switzerland" },
  { slug: "austria", flag: "🇦🇹", name: "Austria" },
  { slug: "poland", flag: "🇵🇱", name: "Poland" },
  { slug: "sweden", flag: "🇸🇪", name: "Sweden" },
  { slug: "ireland", flag: "🇮🇪", name: "Ireland" },
  { slug: "greece", flag: "🇬🇷", name: "Greece" },
  // Americas
  { slug: "usa", flag: "🇺🇸", name: "United States" },
  { slug: "canada", flag: "🇨🇦", name: "Canada" },
  { slug: "brazil", flag: "🇧🇷", name: "Brazil" },
  { slug: "mexico", flag: "🇲🇽", name: "Mexico" },
  { slug: "argentina", flag: "🇦🇷", name: "Argentina" },
  { slug: "colombia", flag: "🇨🇴", name: "Colombia" },
  // Africa
  { slug: "morocco", flag: "🇲🇦", name: "Morocco" },
  { slug: "tunisia", flag: "🇹🇳", name: "Tunisia" },
  { slug: "south-africa", flag: "🇿🇦", name: "South Africa" },
  { slug: "nigeria", flag: "🇳🇬", name: "Nigeria" },
  { slug: "senegal", flag: "🇸🇳", name: "Senegal" },
  // Middle East
  { slug: "dubai", flag: "🇦🇪", name: "Dubai / UAE" },
  { slug: "saudi-arabia", flag: "🇸🇦", name: "Saudi Arabia" },
  { slug: "turkey", flag: "🇹🇷", name: "Turkey" },
  { slug: "qatar", flag: "🇶🇦", name: "Qatar" },
  // Asia-Pacific
  { slug: "japan", flag: "🇯🇵", name: "Japan" },
  { slug: "australia", flag: "🇦🇺", name: "Australia" },
  { slug: "singapore", flag: "🇸🇬", name: "Singapore" },
  { slug: "india", flag: "🇮🇳", name: "India" },
  { slug: "thailand", flag: "🇹🇭", name: "Thailand" },
  { slug: "new-zealand", flag: "🇳🇿", name: "New Zealand" },
];

const FEATURES = [
  { icon: Home, title: "Property Management", desc: "Manage unlimited properties across multiple countries from a single dashboard." },
  { icon: FileText, title: "Legal Documents", desc: "Generate jurisdiction-compliant leases, receipts, and legal notices automatically." },
  { icon: Users, title: "Tenant Portal", desc: "Self-service portal for tenants to view documents, pay rent, and communicate." },
  { icon: CreditCard, title: "Rent Collection", desc: "Collect rent via Stripe, PayPal, SEPA Direct Debit, or bank transfer." },
  { icon: BarChart3, title: "Financial Reports", desc: "Automated fiscal reports adapted to local tax regulations across 11+ countries." },
  { icon: Shield, title: "Enterprise Security", desc: "SSO, MFA, encrypted storage, and GDPR-compliant data handling." },
];

const PropertyManagement = () => {
  const { t } = useI18n();

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="border-b border-border bg-card/80 backdrop-blur sticky top-0 z-50">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-6 py-3">
          <Link to="/" className="flex items-center gap-2">
            <img src={logoEasylocs} alt="Easy-Locs" className="h-8" />
          </Link>
          <div className="flex items-center gap-4">
            <Link to="/login" className="text-sm text-muted-foreground hover:text-foreground">Login</Link>
            <Link to="/signup" className="bg-gradient-gold text-accent-foreground px-4 py-2 rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity">
              Start Free Trial
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-accent/10 text-accent px-4 py-1.5 rounded-full text-sm font-medium mb-6">
            <Globe className="h-4 w-4" /> Available in 50+ countries
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-foreground leading-tight mb-6">
            The Global Property Management Platform for Modern Landlords
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
            Easy-Locs® helps landlords manage properties, tenants, leases, and rent collection across 50+ countries — all from one powerful SaaS platform.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/signup" className="inline-flex items-center gap-2 bg-gradient-gold text-accent-foreground px-8 py-3 rounded-xl font-semibold text-base hover:opacity-90 transition-opacity">
              Start 3-Day Free Trial <ArrowRight className="h-4 w-4" />
            </Link>
            <Link to="/#features" className="inline-flex items-center gap-2 bg-muted text-foreground px-8 py-3 rounded-xl font-semibold text-base hover:bg-muted/80 transition-colors">
              See Features
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 px-6 bg-muted/30">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl font-bold text-foreground text-center mb-12">Everything you need to manage your rental portfolio</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((f) => (
              <div key={f.title} className="bg-card rounded-xl p-6 shadow-card border border-border/50">
                <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center mb-4">
                  <f.icon className="h-5 w-5 text-accent" />
                </div>
                <h3 className="font-semibold text-foreground mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Country pages */}
      <section className="py-16 px-6">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-foreground text-center mb-4">Property Management by Country</h2>
          <p className="text-muted-foreground text-center mb-10">Localized solutions for landlords worldwide</p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {COUNTRY_PAGES.map((c) => (
              <Link key={c.slug} to={`/property-management-${c.slug}`}
                className="flex items-center gap-3 bg-card rounded-xl p-4 shadow-card border border-border/50 hover:shadow-card-hover transition-all group">
                <span className="text-2xl">{c.flag}</span>
                <div>
                  <div className="font-medium text-foreground text-sm group-hover:text-accent transition-colors">{c.name}</div>
                  <div className="text-xs text-muted-foreground">Property Management</div>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground/40 ml-auto" />
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing CTA */}
      <section className="py-16 px-6 bg-gradient-to-br from-primary/5 to-accent/5">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-2xl font-bold text-foreground mb-4">Start managing your properties today</h2>
          <p className="text-muted-foreground mb-2">3-day free trial · No credit card required</p>
          <div className="flex items-center justify-center gap-6 mb-8 text-sm text-muted-foreground">
            <span className="flex items-center gap-1"><CheckCircle2 className="h-4 w-4 text-accent" /> €9.99/month</span>
            <span className="flex items-center gap-1"><CheckCircle2 className="h-4 w-4 text-accent" /> €99/year</span>
          </div>
          <Link to="/signup" className="inline-flex items-center gap-2 bg-gradient-gold text-accent-foreground px-8 py-3 rounded-xl font-semibold hover:opacity-90 transition-opacity">
            Get Started <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8 px-6 text-center text-sm text-muted-foreground">
        <p>© {new Date().getFullYear()} Easy-Locs® — Global Property Management Platform</p>
      </footer>
    </div>
  );
};

export default PropertyManagement;
