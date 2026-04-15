import { useState } from "react";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import { useI18n } from "@/lib/i18n";
import SEOHead from "@/components/SEOHead";
import { useUiEngine } from "@/hooks/useUiEngine";
import { ChevronDown, ChevronUp } from "lucide-react";

const GOLD = "hsl(var(--accent))";

const SECTIONS = [
  { id: "responsable", title: "1. Responsable du traitement" },
  { id: "dpo", title: "2. Délégué à la Protection des Données" },
  { id: "collectees", title: "3. Données collectées" },
  { id: "finalites", title: "4. Finalités du traitement" },
  { id: "base-legale", title: "5. Base légale" },
  { id: "conservation", title: "6. Durée de conservation" },
  { id: "droits", title: "7. Vos droits (RGPD)" },
  { id: "cookies", title: "8. Cookies et traceurs" },
  { id: "sous-traitants", title: "9. Sous-traitants" },
  { id: "transferts", title: "10. Transferts internationaux" },
  { id: "securite", title: "11. Sécurité" },
  { id: "mineurs", title: "12. Données des mineurs" },
  { id: "modifications", title: "13. Modifications" },
  { id: "contact", title: "14. Contact" },
];

const PrivacyPage = () => {
  const { t } = useI18n();
  useUiEngine("legal-privacypage");
  const [tocOpen, setTocOpen] = useState(true);

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="app-mobile-page flex flex-col">
      <SEOHead
        title="Privacy Policy — Easy-Locs"
        description="Learn how Easy-Locs protects your personal data. GDPR-compliant privacy policy for our super-app platform."
        canonical="https://www.easy-locs.com/privacy"
      />
      <Navbar />
      <main className="flex-1 pt-24 pb-16">
        <div className="container max-w-3xl">
          <h1 className="text-3xl font-bold text-foreground mb-2">{t("legal.privacy.title") || "Politique de Confidentialité"}</h1>

          <div className="flex items-center gap-4 mb-6 text-xs text-muted-foreground">
            <span><strong>Version :</strong> 2.0</span>
            <span><strong>Dernière mise à jour :</strong> 14 avril 2026</span>
          </div>

          <div className="rounded-xl border p-4 mb-8" style={{ borderColor: GOLD, background: "hsl(var(--card))" }}>
            <button
              onClick={() => setTocOpen(!tocOpen)}
              className="flex items-center justify-between w-full text-sm font-semibold"
            >
              Sommaire
              {tocOpen ? <ChevronUp style={{ width: 16, height: 16 }} /> : <ChevronDown style={{ width: 16, height: 16 }} />}
            </button>
            {tocOpen && (
              <nav className="mt-3 space-y-1">
                {SECTIONS.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => scrollTo(s.id)}
                    className="block text-xs hover:underline w-full text-left py-0.5"
                    style={{ color: GOLD }}
                  >
                    {s.title}
                  </button>
                ))}
              </nav>
            )}
          </div>

          <div className="prose prose-sm max-w-none text-muted-foreground space-y-6">
            <section id="responsable">
              <h2 className="text-lg font-semibold text-foreground">1. Responsable du traitement</h2>
              <p>Easy-Locs SAS, immatriculée en France.<br />Siège social : Paris, France<br />Email : <a href="mailto:legal@easy-locs.com" style={{ color: GOLD }}>legal@easy-locs.com</a></p>
            </section>

            <section id="dpo">
              <h2 className="text-lg font-semibold text-foreground">2. Délégué à la Protection des Données (DPO)</h2>
              <p>Vous pouvez contacter notre DPO pour toute question relative à la protection de vos données personnelles : <a href="mailto:dpo@easy-locs.com" style={{ color: GOLD }}>dpo@easy-locs.com</a></p>
            </section>

            <section id="collectees">
              <h2 className="text-lg font-semibold text-foreground">3. Données collectées</h2>
              <p>Nous collectons les catégories de données suivantes :</p>
              <ul className="list-disc pl-6 space-y-1">
                <li><strong>Identité :</strong> nom, prénom, adresse email, numéro de téléphone</li>
                <li><strong>Profil :</strong> photo, biographie, préférences linguistiques</li>
                <li><strong>Financières :</strong> transactions, historique de paiements, solde wallet</li>
                <li><strong>Immobilières :</strong> biens, baux, locataires, documents</li>
                <li><strong>Communication :</strong> métadonnées des messages Orbit (pas le contenu chiffré)</li>
                <li><strong>Géolocalisation :</strong> position approximative pour les services de proximité (avec consentement)</li>
                <li><strong>Techniques :</strong> adresse IP, type d'appareil, navigateur, logs de connexion</li>
              </ul>
            </section>

            <section id="finalites">
              <h2 className="text-lg font-semibold text-foreground">4. Finalités du traitement</h2>
              <ul className="list-disc pl-6 space-y-1">
                <li>Gestion du compte et authentification</li>
                <li>Fourniture des services (gestion locative, marketplace, wallet, communication)</li>
                <li>Traitement des paiements et conformité financière</li>
                <li>Communication transactionnelle (quittances, rappels, alertes de sécurité)</li>
                <li>Amélioration du Service et analyse d'usage (avec consentement analytics)</li>
                <li>Communication marketing (avec consentement explicite opt-in)</li>
                <li>Prévention de la fraude et sécurité</li>
                <li>Obligations légales et réglementaires</li>
              </ul>
            </section>

            <section id="base-legale">
              <h2 className="text-lg font-semibold text-foreground">5. Base légale</h2>
              <ul className="list-disc pl-6 space-y-1">
                <li><strong>Exécution du contrat (Art. 6.1.b RGPD) :</strong> fourniture du Service</li>
                <li><strong>Consentement (Art. 6.1.a RGPD) :</strong> cookies analytics/marketing, communication marketing, géolocalisation</li>
                <li><strong>Intérêt légitime (Art. 6.1.f RGPD) :</strong> sécurité, prévention de la fraude</li>
                <li><strong>Obligation légale (Art. 6.1.c RGPD) :</strong> conservation des données financières, lutte anti-blanchiment</li>
              </ul>
            </section>

            <section id="conservation">
              <h2 className="text-lg font-semibold text-foreground">6. Durée de conservation</h2>
              <ul className="list-disc pl-6 space-y-1">
                <li><strong>Données de compte :</strong> durée d'utilisation + 30 jours après suppression</li>
                <li><strong>Données financières :</strong> 5 ans (obligation légale comptable)</li>
                <li><strong>Logs de connexion :</strong> 12 mois</li>
                <li><strong>Cookies :</strong> 13 mois maximum</li>
                <li><strong>Données de communication :</strong> durée du compte, supprimées avec le compte</li>
              </ul>
            </section>

            <section id="droits">
              <h2 className="text-lg font-semibold text-foreground">7. Vos droits (RGPD)</h2>
              <p>Conformément au RGPD, vous disposez des droits suivants :</p>
              <ul className="list-disc pl-6 space-y-1">
                <li><strong>Droit d'accès (Art. 15) :</strong> obtenir une copie de vos données</li>
                <li><strong>Droit de rectification (Art. 16) :</strong> corriger vos données inexactes</li>
                <li><strong>Droit à l'effacement (Art. 17) :</strong> demander la suppression de vos données</li>
                <li><strong>Droit à la portabilité (Art. 20) :</strong> recevoir vos données dans un format structuré</li>
                <li><strong>Droit d'opposition (Art. 21) :</strong> vous opposer au traitement</li>
                <li><strong>Droit de retrait du consentement (Art. 7) :</strong> retirer votre consentement à tout moment</li>
              </ul>
              <p className="mt-2">Pour exercer vos droits, rendez-vous dans <strong>Paramètres {'>'} Confidentialité</strong> ou contactez <a href="mailto:dpo@easy-locs.com" style={{ color: GOLD }}>dpo@easy-locs.com</a>.</p>
              <p>Vous pouvez également introduire une réclamation auprès de la CNIL (cnil.fr) ou de l'autorité de protection des données de votre pays.</p>
            </section>

            <section id="cookies">
              <h2 className="text-lg font-semibold text-foreground">8. Cookies et traceurs</h2>
              <p>Nous utilisons des cookies selon trois catégories :</p>
              <ul className="list-disc pl-6 space-y-1">
                <li><strong>Essentiels :</strong> authentification, session, préférences de langue (toujours actifs)</li>
                <li><strong>Analytics :</strong> mesure d'audience, performance (PostHog, Sentry) — nécessitent votre consentement</li>
                <li><strong>Marketing :</strong> personnalisation des recommandations — nécessitent votre consentement</li>
              </ul>
              <p className="mt-2">Gérez vos préférences à tout moment via la bannière de consentement ou notre <a href="/cookies" style={{ color: GOLD }}>Politique Cookies</a>.</p>
            </section>

            <section id="sous-traitants">
              <h2 className="text-lg font-semibold text-foreground">9. Sous-traitants</h2>
              <ul className="list-disc pl-6 space-y-1">
                <li><strong>Supabase :</strong> hébergement et base de données (UE — Singapour)</li>
                <li><strong>Stripe :</strong> traitement des paiements (certifié PCI-DSS)</li>
                <li><strong>PostHog :</strong> analytics (avec consentement)</li>
                <li><strong>Sentry :</strong> monitoring d'erreurs (avec consentement)</li>
                <li><strong>Mapbox :</strong> services de cartographie</li>
              </ul>
              <p className="mt-2">Tous nos sous-traitants sont conformes au RGPD et/ou ont signé des clauses contractuelles types approuvées par la Commission Européenne.</p>
            </section>

            <section id="transferts">
              <h2 className="text-lg font-semibold text-foreground">10. Transferts internationaux</h2>
              <p>Certaines données peuvent être transférées hors de l'UE/EEE dans le cadre de nos sous-traitants. Ces transferts sont encadrés par des clauses contractuelles types (Art. 46.2.c RGPD) ou des décisions d'adéquation de la Commission Européenne.</p>
            </section>

            <section id="securite">
              <h2 className="text-lg font-semibold text-foreground">11. Sécurité</h2>
              <p>Nous mettons en œuvre des mesures techniques et organisationnelles conformes à l'état de l'art :</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Chiffrement en transit (TLS 1.3) et au repos</li>
                <li>Authentification multi-facteurs (MFA)</li>
                <li>Row Level Security (RLS) sur toutes les tables de données</li>
                <li>Scrubbing PII dans les logs d'erreur</li>
                <li>Audit trail immuable pour les transactions financières</li>
                <li>3D Secure (PSD2 SCA) pour les paiements européens</li>
              </ul>
            </section>

            <section id="mineurs">
              <h2 className="text-lg font-semibold text-foreground">12. Données des mineurs</h2>
              <p>Le Service n'est pas destiné aux personnes de moins de 16 ans (ou l'âge minimum requis par la législation locale). Nous ne collectons pas sciemment de données de mineurs. Si vous constatez qu'un mineur utilise le Service, contactez-nous immédiatement.</p>
            </section>

            <section id="modifications">
              <h2 className="text-lg font-semibold text-foreground">13. Modifications</h2>
              <p>Nous pouvons mettre à jour cette Politique de Confidentialité. Toute modification significative sera notifiée par email ou notification in-app au moins 30 jours avant son entrée en vigueur. La version en vigueur est toujours accessible depuis l'application.</p>
            </section>

            <section id="contact">
              <h2 className="text-lg font-semibold text-foreground">14. Contact</h2>
              <ul className="list-disc pl-6 space-y-1">
                <li>Questions générales : <a href="mailto:legal@easy-locs.com" style={{ color: GOLD }}>legal@easy-locs.com</a></li>
                <li>Protection des données : <a href="mailto:dpo@easy-locs.com" style={{ color: GOLD }}>dpo@easy-locs.com</a></li>
                <li>Autorité de contrôle : CNIL — <a href="https://www.cnil.fr" target="_blank" rel="noopener" style={{ color: GOLD }}>www.cnil.fr</a></li>
              </ul>
            </section>

            <div className="border-t pt-4 mt-8 text-xs" style={{ borderColor: "hsl(var(--border))" }}>
              <p><em>Note : Le contenu de cette politique de confidentialité est un placeholder structuré et doit être validé par un avocat et un DPO avant publication définitive.</em></p>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default PrivacyPage;
