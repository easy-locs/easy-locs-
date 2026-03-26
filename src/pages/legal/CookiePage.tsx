import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import { useI18n } from "@/lib/i18n";

const CookiePage = () => {
  const { t } = useI18n();
  return (
    <div className="app-mobile-page flex flex-col">
      <Navbar />
      <main className="flex-1 pt-24 pb-16">
        <div className="container max-w-3xl">
          <h1 className="text-3xl font-bold text-foreground mb-6">{t("legal.cookies.title")}</h1>
          <div className="prose prose-sm max-w-none text-muted-foreground space-y-4">
            <p><strong>Dernière mise à jour :</strong> 6 mars 2026</p>

            <h2 className="text-lg font-semibold text-foreground">1. Qu'est-ce qu'un cookie ?</h2>
            <p>Un cookie est un petit fichier texte stocké sur votre appareil lors de la visite d'un site web. Il permet de mémoriser des informations relatives à votre navigation.</p>

            <h2 className="text-lg font-semibold text-foreground">2. Cookies utilisés</h2>
            <ul className="list-disc pl-6 space-y-1">
              <li><strong>Cookies essentiels :</strong> nécessaires au fonctionnement du Service (authentification, session).</li>
              <li><strong>Cookies analytiques :</strong> nous aident à comprendre l'utilisation du Service pour l'améliorer.</li>
              <li><strong>Cookies de préférences :</strong> mémorisent vos choix (langue, thème).</li>
            </ul>

            <h2 className="text-lg font-semibold text-foreground">3. Gestion des cookies</h2>
            <p>Vous pouvez configurer votre navigateur pour refuser les cookies. Cependant, certaines fonctionnalités du Service pourraient ne plus être disponibles.</p>

            <h2 className="text-lg font-semibold text-foreground">4. Durée de conservation</h2>
            <p>Les cookies de session sont supprimés à la fermeture du navigateur. Les cookies persistants sont conservés pour une durée maximale de 13 mois.</p>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default CookiePage;
