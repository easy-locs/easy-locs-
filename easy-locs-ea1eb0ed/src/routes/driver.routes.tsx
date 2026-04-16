import { Route, Navigate } from "react-router-dom";
import { FeatureErrorBoundary } from "@/components/FeatureErrorBoundary";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import * as Pages from "@/app/app-route-registry";

const {
  BoostDashboardPage, ClaimShopPage, DriverActiveMissionsPage, DriverAvailabilityZonesPage,
  DriverBreaksPage, DriverCompletedDeliveriesPage, DriverDashboardPageNew, DriverEarningsPageNew,
  DriverEarningsSummaryPage, DriverFuelCostsPage, DriverLiveMissionsPage, DriverMissionDetailPage,
  DriverMissionsPage, DriverPayoutPage, DriverProofPage, DriverShiftPage, DriverTaxiDashboardPage,
  DriverTaxiEarningsPage, MyBusinessHub, SellerDashboardPage,
} = Pages;

export function DriverRoutes() {
  return (
    <>
      <Route path="/driver/dashboard" element={<ProtectedRoute><FeatureErrorBoundary featureName="Me"><DriverDashboardPageNew /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/driver/payout" element={<ProtectedRoute><FeatureErrorBoundary featureName="Wallet"><DriverPayoutPage /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/driver/earnings" element={<ProtectedRoute><FeatureErrorBoundary featureName="Wallet"><DriverEarningsPageNew /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/driver/earnings-v2" element={<Navigate to="/driver/earnings" replace />} />
      <Route path="/driver/earnings-summary" element={<ProtectedRoute><FeatureErrorBoundary featureName="Wallet"><DriverEarningsSummaryPage /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/driver/missions-board" element={<ProtectedRoute><FeatureErrorBoundary featureName="Me"><DriverMissionsPage /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/driver/missions-board/:orderId" element={<ProtectedRoute><FeatureErrorBoundary featureName="Me"><DriverMissionDetailPage /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/driver/proof/:orderId" element={<ProtectedRoute><FeatureErrorBoundary featureName="Me"><DriverProofPage /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/driver/active-missions" element={<ProtectedRoute><FeatureErrorBoundary featureName="Me"><DriverActiveMissionsPage /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/driver/live-missions" element={<ProtectedRoute><FeatureErrorBoundary featureName="Me"><DriverLiveMissionsPage /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/driver/completed-deliveries" element={<ProtectedRoute><FeatureErrorBoundary featureName="Me"><DriverCompletedDeliveriesPage /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/driver/shift" element={<ProtectedRoute><FeatureErrorBoundary featureName="Me"><DriverShiftPage /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/driver/availability-zones" element={<ProtectedRoute><FeatureErrorBoundary featureName="Me"><DriverAvailabilityZonesPage /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/driver/fuel-costs-v2" element={<ProtectedRoute><FeatureErrorBoundary featureName="Me"><DriverFuelCostsPage /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/driver/breaks" element={<ProtectedRoute><FeatureErrorBoundary featureName="Me"><DriverBreaksPage /></FeatureErrorBoundary></ProtectedRoute>} />

      {/* Taxi & Ride routes */}
      <Route path="/driver/taxi" element={<ProtectedRoute><FeatureErrorBoundary featureName="Me"><DriverTaxiDashboardPage /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/driver/taxi/earnings" element={<ProtectedRoute><FeatureErrorBoundary featureName="Me"><DriverTaxiEarningsPage /></FeatureErrorBoundary></ProtectedRoute>} />

      {/* Seller & Business */}
      <Route path="/seller" element={<ProtectedRoute><FeatureErrorBoundary featureName="Dashboard"><SellerDashboardPage /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/seller/boost" element={<ProtectedRoute><FeatureErrorBoundary featureName="Dashboard"><BoostDashboardPage /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/business" element={<ProtectedRoute><FeatureErrorBoundary featureName="Dashboard"><MyBusinessHub /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/claim-shop/:merchantId" element={<FeatureErrorBoundary featureName="Radar"><ClaimShopPage /></FeatureErrorBoundary>} />

    </>
  );
}
