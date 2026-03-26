import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import { useI18n } from "@/lib/i18n";
import SEOHead from "@/components/SEOHead";

const PrivacyPage = () => {
  const { t } = useI18n();
  return (
    <div className="app-mobile-page flex flex-col">
      <SEOHead
        title="Privacy Policy — Easy-Locs"
        description="Learn how Easy-Locs protects your personal data. GDPR-compliant privacy policy for our property management platform."
        canonical="https://www.easy-locs.com/privacy"
      />
      <Navbar />
      <main className="flex-1 pt-24 pb-16">
        <div className="container max-w-3xl">
          <h1 className="text-3xl font-bold text-foreground mb-6">{t("legal.privacy.title")}</h1>
          <div className="prose prose-sm max-w-none text-muted-foreground space-y-4">
            <p><strong>Dernière mise à jour :</strong> 6 mars 2026</p>

            <h2 className="text-lg font-semibold text-foreground">1. Responsable du traitement</h2>
            <p>Easy-Locs SAS, société immatriculée en France.<br />Email : contact@easy-locs.com</p>

            <h2 className="text-lg font-semibold text-foreground">2. Données collectées</h2>
            <p>Nous collectons les données suivantes : nom, prénom, adresse email, informations relatives aux biens immobiliers, données financières liées aux loyers, documents uploadés par l'utilisateur.</p>

            <h2 className="text-lg font-semibold text-foreground">3. Finalités du traitement</h2>
            <ul className="list-disc pl-6 space-y-1">
              <li>Gestion du compte utilisateur</li>
              <li>Fourniture du service de gestion locative</li>
              <li>Génération de documents juridiques</li>
              <li>Communication transactionnelle (quittances, rappels)</li>
              <li>Amélioration du Service</li>
            </ul>

            <h2 className="text-lg font-semibold text-foreground">4. Base légale</h2>
            <p>Le traitement est fondé sur l'exécution du contrat (CGU) et le consentement de l'utilisateur.</p>

            <h2 className="text-lg font-semibold text-foreground">5. Durée de conservation</h2>
            <p>Les données sont conservées pendant toute la durée de l'utilisation du Service, puis 3 ans après la suppression du compte, sauf obligation légale contraire.</p>

            <h2 className="text-lg font-semibold text-foreground">6. Droits des utilisateurs</h2>
            <p>Conformément au RGPD, vous disposez d'un droit d'accès, de rectification, de suppression, de portabilité et d'opposition. Pour exercer vos droits : <a href="mailto:contact@easy-locs.com" className="text-accent hover:underline">contact@easy-locs.com</a></p>

            <h2 className="text-lg font-semibold text-foreground">7. Sous-traitants</h2>
            <p>Nos données sont hébergées au sein de l'Union Européenne. Nous utilisons des sous-traitants conformes au RGPD pour l'hébergement, le paiement et l'envoi d'emails.</p>

            <h2 className="text-lg font-semibold text-foreground">8. Sécurité</h2>
            <p>Nous mettons en œuvre des mesures techniques et organisationnelles appropriées pour protéger vos données contre tout accès non autorisé, perte ou altération.</p>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default PrivacyPage;
