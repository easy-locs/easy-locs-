import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import { useI18n } from "@/lib/i18n";
import { useUiEngine } from "@/hooks/useUiEngine";

const CookiePage = () => {
  const { t } = useI18n();
  useUiEngine("legal-cookiepage");

  return (
    <div className="app-mobile-page flex flex-col">
      <Navbar />
      <main className="flex-1 pt-24 pb-16">
        <div className="container max-w-3xl">
          <h1 className="text-3xl font-bold text-foreground mb-6">{t("legal.cookies.title")}</h1>
          <div className="prose prose-sm max-w-none text-muted-foreground space-y-4">
            <p><strong>{t("page.cookie.last_updated")}</strong> 6 mars 2026</p>

            <h2 className="text-lg font-semibold text-foreground">{t("page.cookie.what_is_cookie_title")}</h2>
            <p>{t("page.cookie.what_is_cookie_body")}</p>

            <h2 className="text-lg font-semibold text-foreground">{t("page.cookie.cookies_used_title")}</h2>
            <ul className="list-disc pl-6 space-y-1">
              <li><strong>{t("page.cookie.cookies_essential")}</strong></li>
              <li><strong>{t("page.cookie.cookies_analytics")}</strong></li>
              <li><strong>{t("page.cookie.cookies_preferences")}</strong></li>
            </ul>

            <h2 className="text-lg font-semibold text-foreground">{t("page.cookie.manage_title")}</h2>
            <p>{t("page.cookie.manage_body")}</p>

            <h2 className="text-lg font-semibold text-foreground">{t("page.cookie.retention_title")}</h2>
            <p>{t("page.cookie.retention_body")}</p>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default CookiePage;
