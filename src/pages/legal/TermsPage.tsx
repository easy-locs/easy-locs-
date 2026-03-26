import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import { useI18n } from "@/lib/i18n";
import SEOHead from "@/components/SEOHead";

const TermsPage = () => {
  const { t } = useI18n();
  return (
    <div className="app-mobile-page flex flex-col">
      <SEOHead
        title="Terms & Conditions — Easy-Locs"
        description="Read the terms and conditions for using Easy-Locs property management platform. Legal framework for landlords, tenants and users."
        canonical="https://www.easy-locs.com/terms"
      />
      <Navbar />
      <main className="flex-1 pt-24 pb-16">
        <div className="container max-w-3xl">
          <h1 className="text-3xl font-bold text-foreground mb-6">{t("legal.terms.title")}</h1>
          <div className="prose prose-sm max-w-none text-muted-foreground space-y-4">
            <p><strong>Dernière mise à jour :</strong> 6 mars 2026</p>

            <h2 className="text-lg font-semibold text-foreground">1. Objet</h2>
            <p>Les présentes Conditions Générales d'Utilisation (CGU) définissent les modalités d'accès et d'utilisation de la plateforme Easy-Locs® (ci-après « le Service »), éditée par Easy-Locs SAS.</p>

            <h2 className="text-lg font-semibold text-foreground">2. Acceptation</h2>
            <p>L'utilisation du Service implique l'acceptation pleine et entière des présentes CGU. En créant un compte, l'utilisateur reconnaît avoir pris connaissance de ces conditions et les accepter sans réserve.</p>

            <h2 className="text-lg font-semibold text-foreground">3. Description du Service</h2>
            <p>Easy-Locs® est une plateforme SaaS de gestion locative permettant aux propriétaires et bailleurs de gérer leurs biens immobiliers, locataires, documents juridiques, quittances et finances.</p>

            <h2 className="text-lg font-semibold text-foreground">4. Inscription et compte</h2>
            <p>L'accès au Service nécessite la création d'un compte avec une adresse email valide. L'utilisateur est responsable de la confidentialité de ses identifiants et de toute activité réalisée depuis son compte.</p>

            <h2 className="text-lg font-semibold text-foreground">5. Abonnement et paiement</h2>
            <p>Le Service propose un essai gratuit de 3 jours suivi d'un abonnement mensuel ou annuel. Les prix sont affichés TTC (TVA 20 % incluse). Les abonnements sont reconduits automatiquement. La résiliation est possible à tout moment depuis l'espace utilisateur.</p>

            <h2 className="text-lg font-semibold text-foreground">6. Responsabilité</h2>
            <p>Easy-Locs® fournit des outils d'aide à la gestion locative. Les documents générés sont fournis à titre indicatif et ne remplacent pas un conseil juridique professionnel. Easy-Locs® ne saurait être tenu responsable des conséquences liées à l'utilisation des documents générés.</p>

            <h2 className="text-lg font-semibold text-foreground">7. Propriété intellectuelle</h2>
            <p>L'ensemble des éléments du Service (textes, images, logiciels, marques) sont la propriété exclusive d'Easy-Locs SAS. Toute reproduction ou utilisation non autorisée est interdite.</p>

            <h2 className="text-lg font-semibold text-foreground">8. Résiliation</h2>
            <p>L'utilisateur peut résilier son abonnement à tout moment. Easy-Locs® se réserve le droit de suspendre ou supprimer un compte en cas de violation des présentes CGU.</p>

            <h2 className="text-lg font-semibold text-foreground">9. Droit applicable</h2>
            <p>Les présentes CGU sont régies par le droit français. Tout litige relèvera de la compétence exclusive des tribunaux de Paris.</p>

            <h2 className="text-lg font-semibold text-foreground">10. Contact</h2>
            <p>Pour toute question relative aux présentes CGU, veuillez nous contacter à : <a href="mailto:contact@easy-locs.com" className="text-accent hover:underline">contact@easy-locs.com</a></p>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default TermsPage;
