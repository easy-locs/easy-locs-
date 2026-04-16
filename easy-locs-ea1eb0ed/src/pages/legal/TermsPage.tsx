import { useState } from "react";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import { useI18n } from "@/lib/i18n";
import SEOHead from "@/components/SEOHead";
import { useUiEngine } from "@/hooks/useUiEngine";
import { ChevronDown, ChevronUp } from "lucide-react";

const GOLD = "hsl(var(--accent))";
const NAVY = "hsl(228 28% 7%)";

const SECTION_KEYS = [
  { id: "objet", key: "page.legal.terms.s1" },
  { id: "acceptation", key: "page.legal.terms.s2" },
  { id: "description", key: "page.legal.terms.s3" },
  { id: "inscription", key: "page.legal.terms.s4" },
  { id: "abonnement", key: "page.legal.terms.s5" },
  { id: "wallet", key: "page.legal.terms.s6" },
  { id: "marketplace", key: "page.legal.terms.s7" },
  { id: "communication", key: "page.legal.terms.s8" },
  { id: "responsabilite", key: "page.legal.terms.s9" },
  { id: "propriete", key: "page.legal.terms.s10" },
  { id: "resiliation", key: "page.legal.terms.s11" },
  { id: "donnees", key: "page.legal.terms.s12" },
  { id: "droit", key: "page.legal.terms.s13" },
  { id: "contact", key: "page.legal.terms.s14" },
];

const TermsPage = () => {
  const { t } = useI18n();
  useUiEngine("legal-termspage");
  const [tocOpen, setTocOpen] = useState(true);

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="app-mobile-page flex flex-col">
      <SEOHead
        title="Terms & Conditions — Easy-Locs"
        description="Read the terms and conditions for using Easy-Locs super-app. Legal framework for all users across 190+ countries."
        canonical="https://www.easy-locs.com/terms"
      />
      <Navbar />
      <main className="flex-1 pt-24 pb-16">
        <div className="container max-w-3xl">
          <h1 className="text-3xl font-bold text-foreground mb-2">{t("page.legal.terms.title")}</h1>

          <div className="flex items-center gap-4 mb-6 text-xs text-muted-foreground">
            <span><strong>{t("page.terms.version_label")}</strong> 2.0</span>
            <span><strong>{t("page.terms.last_updated_label")}</strong> 14 avril 2026</span>
          </div>

          <div className="rounded-xl border p-4 mb-8" style={{ borderColor: GOLD, background: "hsl(var(--card))" }}>
            <button
              onClick={() => setTocOpen(!tocOpen)}
              className="flex items-center justify-between w-full text-sm font-semibold"
            >
              {t("page.terms.toc_label")}
              {tocOpen ? <ChevronUp style={{ width: 16, height: 16 }} /> : <ChevronDown style={{ width: 16, height: 16 }} />}
            </button>
            {tocOpen && (
              <nav className="mt-3 space-y-1">
                {SECTION_KEYS.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => scrollTo(s.id)}
                    className="block text-xs hover:underline w-full text-left py-0.5"
                    style={{ color: GOLD }}
                  >
                    {t(s.key)}
                  </button>
                ))}
              </nav>
            )}
          </div>

          <div className="prose prose-sm max-w-none text-muted-foreground space-y-6">
            <section id="objet">
              <h2 className="text-lg font-semibold text-foreground">{t("page.legal.terms.s1")}</h2>
              <p>Les présentes Conditions Générales d'Utilisation (CGU) définissent les modalités d'accès et d'utilisation de la plateforme Easy-Locs® (ci-après « le Service »), éditée par Easy-Locs SAS. Le Service comprend l'ensemble des fonctionnalités accessibles via l'application web et mobile, incluant la gestion locative, le marketplace, le wallet, la messagerie (Orbit), et les services de mobilité/livraison.</p>
            </section>

            <section id="acceptation">
              <h2 className="text-lg font-semibold text-foreground">{t("page.legal.terms.s2")}</h2>
              <p>L'utilisation du Service implique l'acceptation pleine et entière des présentes CGU. En créant un compte, l'utilisateur reconnaît avoir pris connaissance de ces conditions et les accepter sans réserve. Les CGU sont accessibles à tout moment depuis le menu de l'application et depuis la page d'inscription.</p>
            </section>

            <section id="description">
              <h2 className="text-lg font-semibold text-foreground">{t("page.legal.terms.s3")}</h2>
              <p>Easy-Locs® est une super-application disponible dans plus de 190 pays, supportant plus de 120 devises et 31 langues. Le Service comprend 5 piliers :</p>
              <ul className="list-disc pl-6 space-y-1">
                <li><strong>Dashboard :</strong> Gestion locative, propriétés, locataires, documents</li>
                <li><strong>Radar :</strong> Découverte, marketplace, alimentation, voyages, mobilité</li>
                <li><strong>Orbit :</strong> Messagerie, appels, communication</li>
                <li><strong>Wallet :</strong> Paiements, transactions, portefeuille numérique</li>
                <li><strong>Me :</strong> Profil, paramètres, préférences</li>
              </ul>
            </section>

            <section id="inscription">
              <h2 className="text-lg font-semibold text-foreground">{t("page.legal.terms.s4")}</h2>
              <p>L'accès au Service nécessite la création d'un compte avec une adresse email valide ou via authentification tierce. L'utilisateur est responsable de la confidentialité de ses identifiants et de toute activité réalisée depuis son compte. L'authentification multi-facteurs (MFA) est recommandée et peut être rendue obligatoire pour certaines opérations financières.</p>
            </section>

            <section id="abonnement">
              <h2 className="text-lg font-semibold text-foreground">{t("page.legal.terms.s5")}</h2>
              <p>Le Service propose un essai gratuit suivi d'un abonnement mensuel ou annuel. Les prix sont affichés TTC dans la devise locale de l'utilisateur. Les abonnements sont reconduits automatiquement. La résiliation est possible à tout moment depuis l'espace utilisateur. Les paiements sont sécurisés via Stripe et conformes à la directive PSD2 (Strong Customer Authentication) pour les utilisateurs européens.</p>
            </section>

            <section id="wallet">
              <h2 className="text-lg font-semibold text-foreground">{t("page.legal.terms.s6")}</h2>
              <p>Le wallet Easy-Locs permet de stocker des fonds, effectuer des transferts entre utilisateurs, et payer des services. Toutes les transactions sont enregistrées de manière immuable dans un registre d'audit conforme aux obligations réglementaires. Les transferts internationaux sont soumis aux taux de change en vigueur avec une transparence totale sur les frais appliqués.</p>
            </section>

            <section id="marketplace">
              <h2 className="text-lg font-semibold text-foreground">{t("page.legal.terms.s7")}</h2>
              <p>La marketplace permet aux utilisateurs de proposer et consommer des services (logement, alimentation, mobilité, etc.). Easy-Locs® agit en qualité d'intermédiaire technique et ne se substitue pas aux obligations des prestataires et consommateurs. Une commission est prélevée sur chaque transaction conformément à la grille tarifaire en vigueur.</p>
            </section>

            <section id="communication">
              <h2 className="text-lg font-semibold text-foreground">{t("page.legal.terms.s8")}</h2>
              <p>Le module Orbit fournit des services de messagerie et d'appels. Les messages sont chiffrés en transit. L'utilisateur s'engage à ne pas utiliser ces fonctionnalités pour du harcèlement, du spam, ou toute activité illicite. Easy-Locs® se réserve le droit de suspendre l'accès en cas d'abus signalé.</p>
            </section>

            <section id="responsabilite">
              <h2 className="text-lg font-semibold text-foreground">{t("page.legal.terms.s9")}</h2>
              <p>Easy-Locs® fournit des outils d'aide à la gestion et ne saurait être tenu responsable des conséquences liées à l'utilisation des fonctionnalités ou documents générés. Les documents juridiques sont fournis à titre indicatif et ne remplacent pas un conseil juridique professionnel.</p>
            </section>

            <section id="propriete">
              <h2 className="text-lg font-semibold text-foreground">{t("page.legal.terms.s10")}</h2>
              <p>L'ensemble des éléments du Service (textes, images, logiciels, marques, design) sont la propriété exclusive d'Easy-Locs SAS. Toute reproduction ou utilisation non autorisée est interdite conformément au Code de la Propriété Intellectuelle.</p>
            </section>

            <section id="resiliation">
              <h2 className="text-lg font-semibold text-foreground">{t("page.legal.terms.s11")}</h2>
              <p>L&apos;utilisateur peut résilier son abonnement et demander la suppression de son compte à tout moment via Paramètres &gt; Confidentialité &gt; Suppression du compte. Un délai de grâce de 30 jours est appliqué conformément au RGPD. Easy-Locs® se réserve le droit de suspendre ou supprimer un compte en cas de violation des présentes CGU.</p>
            </section>

            <section id="donnees">
              <h2 className="text-lg font-semibold text-foreground">{t("page.legal.terms.s12")}</h2>
              <p>Le traitement des données personnelles est détaillé dans notre <a href="/privacy" style={{ color: GOLD }}>Politique de Confidentialité</a>. Easy-Locs® est conforme au RGPD (Règlement Général sur la Protection des Données) et à la directive ePrivacy. L'utilisateur dispose de droits d'accès, rectification, portabilité et suppression de ses données.</p>
            </section>

            <section id="droit">
              <h2 className="text-lg font-semibold text-foreground">{t("page.legal.terms.s13")}</h2>
              <p>Les présentes CGU sont régies par le droit français. Pour les utilisateurs résidant dans l'UE, les dispositions du droit de la consommation européen s'appliquent. Tout litige relèvera de la compétence exclusive des tribunaux de Paris, sauf disposition contraire du droit local de l'utilisateur.</p>
            </section>

            <section id="contact">
              <h2 className="text-lg font-semibold text-foreground">{t("page.legal.terms.s14")}</h2>
              <p>Pour toute question relative aux présentes CGU :</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Email : <a href="mailto:legal@easy-locs.com" style={{ color: GOLD }}>legal@easy-locs.com</a></li>
                <li>DPO (Délégué à la Protection des Données) : <a href="mailto:dpo@easy-locs.com" style={{ color: GOLD }}>dpo@easy-locs.com</a></li>
              </ul>
            </section>

            <div className="border-t pt-4 mt-8 text-xs" style={{ borderColor: "hsl(var(--border))" }}>
              <p><em>Note : Le contenu de ces CGU est un placeholder structuré et doit être validé par un avocat avant publication définitive.</em></p>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default TermsPage;
