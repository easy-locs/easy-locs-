import { Route } from "react-router-dom";
import { FeatureErrorBoundary } from "@/components/FeatureErrorBoundary";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import * as Pages from "@/app/app-route-registry";

const {
  AboutPage, ContactPage, CookiePage, HelpPage, LegalNoticePage, PlatformVision, PrivacyPage, TermsPage,
} = Pages;

export function LegalRoutes() {
  return (
    <>
      <Route path="/terms" element={<FeatureErrorBoundary featureName="Legal"><TermsPage /></FeatureErrorBoundary>} />
      <Route path="/privacy" element={<FeatureErrorBoundary featureName="Legal"><PrivacyPage /></FeatureErrorBoundary>} />
      <Route path="/cookies" element={<FeatureErrorBoundary featureName="Legal"><CookiePage /></FeatureErrorBoundary>} />
      <Route path="/legal" element={<FeatureErrorBoundary featureName="Legal"><LegalNoticePage /></FeatureErrorBoundary>} />
      <Route path="/about" element={<FeatureErrorBoundary featureName="Legal"><AboutPage /></FeatureErrorBoundary>} />
      <Route path="/contact" element={<FeatureErrorBoundary featureName="Legal"><ContactPage /></FeatureErrorBoundary>} />
      <Route path="/help" element={<FeatureErrorBoundary featureName="Legal"><HelpPage /></FeatureErrorBoundary>} />
      <Route path="/vision" element={<FeatureErrorBoundary featureName="Legal"><PlatformVision /></FeatureErrorBoundary>} />

    </>
  );
}
