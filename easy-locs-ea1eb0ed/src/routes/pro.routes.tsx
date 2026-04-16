import { Route } from "react-router-dom";
import { FeatureErrorBoundary } from "@/components/FeatureErrorBoundary";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import * as Pages from "@/app/app-route-registry";

const {
  ProAnalytics, ProAvailability, ProCatalog, ProCompliance, ProDashboard, ProInbox, ProLiveMonitor,
  ProMedia, ProOnboarding, ProOrders, ProPricing, ProProfile, ProReviews, ProSettings, ProShell, ProTeam,
  ProWallet,
} = Pages;

export function ProRoutes() {
  return (
    <>
      <Route path="/pro" element={<ProtectedRoute><FeatureErrorBoundary featureName="Pro"><ProShell /></FeatureErrorBoundary></ProtectedRoute>}>
      <Route index element={<ProDashboard />} />
      <Route path="onboarding" element={<ProOnboarding />} />
      <Route path="profile" element={<ProProfile />} />
      <Route path="media" element={<ProMedia />} />
      <Route path="catalog" element={<ProCatalog />} />
      <Route path="availability" element={<ProAvailability />} />
      <Route path="pricing" element={<ProPricing />} />
      <Route path="orders" element={<ProOrders />} />
      <Route path="inbox" element={<ProInbox />} />
      <Route path="reviews" element={<ProReviews />} />
      <Route path="wallet" element={<ProWallet />} />
      <Route path="team" element={<ProTeam />} />
      <Route path="analytics" element={<ProAnalytics />} />
      <Route path="monitor" element={<ProLiveMonitor />} />
      <Route path="settings" element={<ProSettings />} />
      <Route path="compliance" element={<ProCompliance />} />
      </Route>

    </>
  );
}
