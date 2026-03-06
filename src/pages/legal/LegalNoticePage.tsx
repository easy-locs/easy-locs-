import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import { useI18n } from "@/lib/i18n";

const LegalNoticePage = () => {
  const { t } = useI18n();
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 pt-24 pb-16">
        <div className="container max-w-3xl">
          <h1 className="text-3xl font-bold text-foreground mb-6">{t("legal.notice.title")}</h1>
          <div className="prose prose-sm max-w-none text-muted-foreground space-y-4">
            <h2 className="text-lg font-semibold text-foreground">Éditeur du site</h2>
            <p>
              <strong>Easy-Locs SAS</strong><br />
              Société par actions simplifiée<br />
              Email : <a href="mailto:contact@easy-locs.com" className="text-accent hover:underline">contact@easy-locs.com</a><br />
              Site web : <a href="https://easy-locs.lovable.app" className="text-accent hover:underline">easy-locs.lovable.app</a>
            </p>

            <h2 className="text-lg font-semibold text-foreground">Directeur de la publication</h2>
            <p>Le directeur de la publication est le représentant légal d'Easy-Locs SAS.</p>

            <h2 className="text-lg font-semibold text-foreground">Hébergement</h2>
            <p>Le site est hébergé au sein de l'Union Européenne conformément aux exigences du RGPD.</p>

            <h2 className="text-lg font-semibold text-foreground">Propriété intellectuelle</h2>
            <p>L'ensemble du contenu du site (textes, graphismes, logos, icônes, images, logiciels) est la propriété exclusive d'Easy-Locs SAS et est protégé par les lois françaises et internationales relatives à la propriété intellectuelle.</p>

            <h2 className="text-lg font-semibold text-foreground">Limitation de responsabilité</h2>
            <p>Easy-Locs® s'efforce de fournir des informations exactes et à jour. Toutefois, Easy-Locs SAS ne saurait garantir l'exactitude, la complétude ou l'actualité des informations diffusées sur le site.</p>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default LegalNoticePage;
