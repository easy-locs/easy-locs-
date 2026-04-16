import { Route } from "react-router-dom";
import { FeatureErrorBoundary } from "@/components/FeatureErrorBoundary";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import * as Pages from "@/app/app-route-registry";

const {
  MerchantAutoAcceptSettingsPage, MerchantBasicAnalyticsPage, MerchantBusinessHoursPage,
  MerchantBusinessSummaryPage, MerchantClaimPage, MerchantClosingModePage, MerchantCouponManagerPage,
  MerchantCustomerInsightsPage, MerchantCustomersPage, MerchantDailySalesPage, MerchantDashboardPage,
  MerchantDeliveryZonesPage, MerchantFinancePage, MerchantInventoryAlertsPage, MerchantInventoryPage,
  MerchantKitchenDisplayPage, MerchantKitchenPage, MerchantLiveControlPage, MerchantMenuBulkEditPage,
  MerchantMenuCategoryManagerPage, MerchantMenuItemEditorPage, MerchantMenuPageNew,
  MerchantOnboardingPage, MerchantOrderBoardPage, MerchantOrdersPage, MerchantPosPage,
  MerchantProductPerformancePage, MerchantPromoBannerEditorPage, MerchantPromoManagerPage,
  MerchantRefundRequestsPage, MerchantReturnsPage, MerchantReviewRepliesPage, MerchantStaffAccessPage,
  MerchantStoreSettingsPage, ShopQrCenterPage,
} = Pages;

export function MerchantRoutes() {
  return (
    <>
      <Route path="/merchant/claim" element={<FeatureErrorBoundary featureName="Dashboard"><MerchantClaimPage /></FeatureErrorBoundary>} />
      <Route path="/merchant/onboarding" element={<FeatureErrorBoundary featureName="Dashboard"><MerchantOnboardingPage /></FeatureErrorBoundary>} />
      <Route path="/merchant/dashboard" element={<ProtectedRoute><FeatureErrorBoundary featureName="Dashboard"><MerchantDashboardPage /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/merchant/dashboard/:merchantId" element={<ProtectedRoute><FeatureErrorBoundary featureName="Dashboard"><MerchantDashboardPage /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/merchant/finance" element={<ProtectedRoute><FeatureErrorBoundary featureName="Dashboard"><MerchantFinancePage /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/merchant/pos" element={<ProtectedRoute><FeatureErrorBoundary featureName="Dashboard"><MerchantPosPage /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/merchant/kitchen" element={<ProtectedRoute><FeatureErrorBoundary featureName="Dashboard"><MerchantKitchenPage /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/merchant/orders" element={<ProtectedRoute><FeatureErrorBoundary featureName="Dashboard"><MerchantOrdersPage /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/merchant/orders/:merchantId" element={<ProtectedRoute><FeatureErrorBoundary featureName="Dashboard"><MerchantOrderBoardPage /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/merchant/qr/:shopId" element={<ProtectedRoute><FeatureErrorBoundary featureName="Dashboard"><ShopQrCenterPage /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/merchant/menu" element={<ProtectedRoute><FeatureErrorBoundary featureName="Dashboard"><MerchantMenuPageNew /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/merchant/menu/:merchantId" element={<ProtectedRoute><FeatureErrorBoundary featureName="Dashboard"><MerchantMenuPageNew /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/merchant/menu-bulk/:merchantId" element={<ProtectedRoute><FeatureErrorBoundary featureName="Dashboard"><MerchantMenuBulkEditPage /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/merchant/menu-categories/:merchantId" element={<ProtectedRoute><FeatureErrorBoundary featureName="Dashboard"><MerchantMenuCategoryManagerPage /></FeatureErrorBoundary></ProtectedRoute>} />
      {/* Restaurant routes */}
      <Route path="/merchant/menu/edit/:itemId" element={<ProtectedRoute><FeatureErrorBoundary featureName="Dashboard"><MerchantMenuItemEditorPage /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/merchant/store-settings/:merchantId" element={<ProtectedRoute><FeatureErrorBoundary featureName="Dashboard"><MerchantStoreSettingsPage /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/merchant/promos/:merchantId" element={<ProtectedRoute><FeatureErrorBoundary featureName="Dashboard"><MerchantPromoManagerPage /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/merchant/banner-editor/:merchantId" element={<ProtectedRoute><FeatureErrorBoundary featureName="Dashboard"><MerchantPromoBannerEditorPage /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/merchant/inventory/:merchantId" element={<ProtectedRoute><FeatureErrorBoundary featureName="Dashboard"><MerchantInventoryPage /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/merchant/inventory-alerts/:merchantId" element={<ProtectedRoute><FeatureErrorBoundary featureName="Dashboard"><MerchantInventoryAlertsPage /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/merchant/live/:merchantId" element={<ProtectedRoute><FeatureErrorBoundary featureName="Dashboard"><MerchantLiveControlPage /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/merchant/coupons/:merchantId" element={<ProtectedRoute><FeatureErrorBoundary featureName="Dashboard"><MerchantCouponManagerPage /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/merchant/analytics/:merchantId" element={<ProtectedRoute><FeatureErrorBoundary featureName="Dashboard"><MerchantBasicAnalyticsPage /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/merchant/customers/:merchantId" element={<ProtectedRoute><FeatureErrorBoundary featureName="Dashboard"><MerchantCustomersPage /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/merchant/customer-insights/:merchantId" element={<ProtectedRoute><FeatureErrorBoundary featureName="Dashboard"><MerchantCustomerInsightsPage /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/merchant/product-performance/:merchantId" element={<ProtectedRoute><FeatureErrorBoundary featureName="Dashboard"><MerchantProductPerformancePage /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/merchant/business-summary/:merchantId" element={<ProtectedRoute><FeatureErrorBoundary featureName="Dashboard"><MerchantBusinessSummaryPage /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/merchant/closing-mode/:merchantId" element={<ProtectedRoute><FeatureErrorBoundary featureName="Dashboard"><MerchantClosingModePage /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/merchant/auto-accept/:merchantId" element={<ProtectedRoute><FeatureErrorBoundary featureName="Dashboard"><MerchantAutoAcceptSettingsPage /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/merchant/staff-access/:merchantId" element={<ProtectedRoute><FeatureErrorBoundary featureName="Dashboard"><MerchantStaffAccessPage /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/merchant/daily-sales/:merchantId" element={<ProtectedRoute><FeatureErrorBoundary featureName="Dashboard"><MerchantDailySalesPage /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/merchant/reviews/:merchantId" element={<ProtectedRoute><FeatureErrorBoundary featureName="Dashboard"><MerchantReviewRepliesPage /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/merchant/refund-requests/:merchantId" element={<ProtectedRoute><FeatureErrorBoundary featureName="Dashboard"><MerchantRefundRequestsPage /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/merchant/delivery-zones/:merchantId" element={<ProtectedRoute><FeatureErrorBoundary featureName="Dashboard"><MerchantDeliveryZonesPage /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/merchant/kitchen-display/:merchantId" element={<ProtectedRoute><FeatureErrorBoundary featureName="Dashboard"><MerchantKitchenDisplayPage /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/merchant/business-hours/:merchantId" element={<ProtectedRoute><FeatureErrorBoundary featureName="Dashboard"><MerchantBusinessHoursPage /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/merchant/returns" element={<ProtectedRoute><FeatureErrorBoundary featureName="Dashboard"><MerchantReturnsPage /></FeatureErrorBoundary></ProtectedRoute>} />

    </>
  );
}
