import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import { useI18n } from "@/lib/i18n";

const LegalNoticePage = () => {
  const { t } = useI18n();
  return (
    <div className="app-mobile-page flex flex-col">
      <Navbar />
      <main className="flex-1 pt-24 pb-16">
        <div className="container max-w-3xl">
          <h1 className="text-3xl font-bold text-foreground mb-6">{t("legal.notice.title") || "Legal Notice"}</h1>
          <div className="prose prose-sm max-w-none text-muted-foreground space-y-4">
            <h2 className="text-lg font-semibold text-foreground">{t("legal.notice.publisher") || "Website Publisher"}</h2>
            <p>
              <strong>Easy-Locs SAS</strong><br />
              {t("legal.notice.company_type") || "Simplified joint stock company"}<br />
              Email : <a href="mailto:contact@easy-locs.com" className="text-accent hover:underline">contact@easy-locs.com</a><br />
              {t("legal.notice.website") || "Website"} : <a href="https://www.easy-locs.com" className="text-accent hover:underline">www.easy-locs.com</a>
            </p>

            <h2 className="text-lg font-semibold text-foreground">{t("legal.notice.director") || "Publication Director"}</h2>
            <p>{t("legal.notice.director_desc") || "The publication director is the legal representative of Easy-Locs SAS."}</p>

            <h2 className="text-lg font-semibold text-foreground">{t("legal.notice.hosting") || "Hosting"}</h2>
            <p>{t("legal.notice.hosting_desc") || "The website is hosted within the European Union in compliance with GDPR requirements."}</p>

            <h2 className="text-lg font-semibold text-foreground">{t("legal.notice.ip") || "Intellectual Property"}</h2>
            <p>{t("legal.notice.ip_desc") || "All content on the website (text, graphics, logos, icons, images, software) is the exclusive property of Easy-Locs SAS and is protected by French and international intellectual property laws."}</p>

            <h2 className="text-lg font-semibold text-foreground">{t("legal.notice.liability") || "Limitation of Liability"}</h2>
            <p>{t("legal.notice.liability_desc") || "Easy-Locs® strives to provide accurate and up-to-date information. However, Easy-Locs SAS cannot guarantee the accuracy, completeness, or timeliness of the information published on the website."}</p>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default LegalNoticePage;
