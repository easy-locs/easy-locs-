import { Suspense } from "react";
import { Route, Navigate } from "react-router-dom";
import { FeatureErrorBoundary } from "@/components/FeatureErrorBoundary";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import * as Pages from "@/app/app-route-registry";
import { PillarSkeleton } from "@/app/route-skeletons";

const {
  BadgesPage, CreatorDashboardPage, CustomerAddressBookPage, CustomerAutoRepeatPage,
  CustomerChallengesPage, CustomerDeliveryNotesPage, CustomerLiveLocationPage,
  CustomerLoyaltyHistoryPage, CustomerOrderReceiptsPage, CustomerPaymentActivityPage,
  CustomerReferralPage, CustomerRewardRedemptionPage, CustomerSavedCardsPage, CustomerSavedCartsPage2,
  CustomerSpendingInsightsPage, EditProfilePage, FavoritesPage, MeCommandCenter, MyReviewsPage,
  NotificationCenterPage, PermissionCenterPage, RewardsHubPage, SettingsAccountPage,
  SettingsAddressesPage, SettingsBusinessPage, SettingsMarketingPage, SettingsNotificationsPage,
  SettingsOrbitPage, SettingsPreferencesPage, SettingsPrivacyPage, SettingsSecurityPage,
  SettingsSubscriptionPage, SettingsSupportPage, SettingsWalletPage, SocialHubPage,
  SupportTicketDetailPage, SupportTicketsPage, TeamCommandCenterPage, TeamPermissionsPage, WishlistPage,
} = Pages;

export function MeRoutes() {
  return (
    <>
      <Route path="/me" element={<ProtectedRoute><FeatureErrorBoundary featureName="Me"><Suspense fallback={<PillarSkeleton pillar="me" />}><MeCommandCenter /></Suspense></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/me/edit-profile" element={<ProtectedRoute><FeatureErrorBoundary featureName="Me"><EditProfilePage /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/me/spending-insights" element={<ProtectedRoute><FeatureErrorBoundary featureName="Me"><CustomerSpendingInsightsPage /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/me/address-book" element={<ProtectedRoute><FeatureErrorBoundary featureName="Me"><CustomerAddressBookPage /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/me/loyalty-history" element={<ProtectedRoute><FeatureErrorBoundary featureName="Me"><CustomerLoyaltyHistoryPage /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/me/challenges" element={<ProtectedRoute><FeatureErrorBoundary featureName="Me"><CustomerChallengesPage /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/me/referral" element={<ProtectedRoute><FeatureErrorBoundary featureName="Me"><CustomerReferralPage /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/me/referrals" element={<ProtectedRoute><FeatureErrorBoundary featureName="Me"><CustomerReferralPage /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/me/social" element={<ProtectedRoute><FeatureErrorBoundary featureName="Me"><SocialHubPage /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/me/badges" element={<ProtectedRoute><FeatureErrorBoundary featureName="Me"><BadgesPage /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/me/reviews" element={<ProtectedRoute><FeatureErrorBoundary featureName="Me"><MyReviewsPage /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/me/wishlist" element={<ProtectedRoute><FeatureErrorBoundary featureName="Me"><WishlistPage /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/me/loyalty" element={<ProtectedRoute><FeatureErrorBoundary featureName="Me"><CustomerLoyaltyHistoryPage /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/me/creator" element={<ProtectedRoute><FeatureErrorBoundary featureName="Me"><CreatorDashboardPage /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/me/creator/affiliates" element={<ProtectedRoute><FeatureErrorBoundary featureName="Me"><CreatorDashboardPage /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/me/creator/analytics" element={<ProtectedRoute><FeatureErrorBoundary featureName="Me"><CreatorDashboardPage /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/me/creator/tips" element={<ProtectedRoute><FeatureErrorBoundary featureName="Me"><CreatorDashboardPage /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/me/saved-cards" element={<ProtectedRoute><FeatureErrorBoundary featureName="Me"><CustomerSavedCardsPage /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/me/saved-carts" element={<ProtectedRoute><FeatureErrorBoundary featureName="Me"><CustomerSavedCartsPage2 /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/me/delivery-notes" element={<ProtectedRoute><FeatureErrorBoundary featureName="Me"><CustomerDeliveryNotesPage /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/me/payment-activity" element={<ProtectedRoute><FeatureErrorBoundary featureName="Me"><CustomerPaymentActivityPage /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/me/order-receipts" element={<ProtectedRoute><FeatureErrorBoundary featureName="Me"><CustomerOrderReceiptsPage /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/me/gestion-immo" element={<Navigate to="/property-hub" replace />} />
      <Route path="/me/gestion-immo/:propertyId" element={<ProtectedRoute><FeatureErrorBoundary featureName="Me"><Pages.MePropertyDetail /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/me/tenant-view" element={<ProtectedRoute><FeatureErrorBoundary featureName="Me"><Pages.MeTenantView /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/me/property-hub" element={<Navigate to="/property-hub" replace />} />
      <Route path="/me/properties" element={<ProtectedRoute><FeatureErrorBoundary featureName="Me"><Pages.MePropertyCockpit /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/me/properties/list" element={<ProtectedRoute><FeatureErrorBoundary featureName="Me"><Pages.MePropertyListPage /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/me/properties/create" element={<ProtectedRoute><FeatureErrorBoundary featureName="Me"><Pages.MePropertyCreatePage /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/me/properties/:propertyId" element={<ProtectedRoute><FeatureErrorBoundary featureName="Me"><Pages.MePropertyDetail /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/me/properties/analytics" element={<ProtectedRoute><FeatureErrorBoundary featureName="Me"><Pages.MePropertyAnalyticsPage /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/me/tenants" element={<ProtectedRoute><FeatureErrorBoundary featureName="Me"><Pages.MeTenantsPage /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/me/leases" element={<ProtectedRoute><FeatureErrorBoundary featureName="Me"><Pages.MeLeasesPage /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/me/leases/:leaseId" element={<ProtectedRoute><FeatureErrorBoundary featureName="Me"><Pages.MeLeasesPage /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/me/maintenance" element={<ProtectedRoute><FeatureErrorBoundary featureName="Me"><Pages.MeMaintenancePage /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/me/maintenance/:ticketId" element={<ProtectedRoute><FeatureErrorBoundary featureName="Me"><Pages.MeMaintenancePage /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/me/auto-repeat" element={<ProtectedRoute><FeatureErrorBoundary featureName="Me"><CustomerAutoRepeatPage /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/me/rewards" element={<ProtectedRoute><FeatureErrorBoundary featureName="Me"><RewardsHubPage /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/me/redeem-rewards" element={<ProtectedRoute><FeatureErrorBoundary featureName="Me"><CustomerRewardRedemptionPage /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/favorites" element={<ProtectedRoute><FeatureErrorBoundary featureName="Me"><FavoritesPage /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/notifications" element={<ProtectedRoute><FeatureErrorBoundary featureName="Me"><NotificationCenterPage /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/location/live" element={<ProtectedRoute><FeatureErrorBoundary featureName="Me"><CustomerLiveLocationPage /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/permissions" element={<ProtectedRoute><FeatureErrorBoundary featureName="Me"><PermissionCenterPage /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/support/tickets" element={<ProtectedRoute><FeatureErrorBoundary featureName="Me"><SupportTicketsPage /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/support/tickets/:ticketId" element={<ProtectedRoute><FeatureErrorBoundary featureName="Me"><SupportTicketDetailPage /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/team/command-center" element={<ProtectedRoute><FeatureErrorBoundary featureName="Me"><TeamCommandCenterPage /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/team/permissions" element={<ProtectedRoute><FeatureErrorBoundary featureName="Me"><TeamPermissionsPage /></FeatureErrorBoundary></ProtectedRoute>} />

      {/* Settings — /settings redirects to /me (unified hub) */}
      <Route path="/settings" element={<Navigate to="/me" replace />} />
      <Route path="/settings/account" element={<ProtectedRoute><FeatureErrorBoundary featureName="Me"><SettingsAccountPage /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/settings/orbit" element={<ProtectedRoute><FeatureErrorBoundary featureName="Me"><SettingsOrbitPage /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/settings/business" element={<ProtectedRoute><FeatureErrorBoundary featureName="Me"><SettingsBusinessPage /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/settings/wallet" element={<ProtectedRoute><FeatureErrorBoundary featureName="Me"><SettingsWalletPage /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/settings/addresses" element={<ProtectedRoute><FeatureErrorBoundary featureName="Me"><SettingsAddressesPage /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/settings/notifications" element={<ProtectedRoute><FeatureErrorBoundary featureName="Me"><SettingsNotificationsPage /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/settings/security" element={<ProtectedRoute><FeatureErrorBoundary featureName="Me"><SettingsSecurityPage /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/settings/preferences" element={<ProtectedRoute><FeatureErrorBoundary featureName="Me"><SettingsPreferencesPage /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/settings/support" element={<ProtectedRoute><FeatureErrorBoundary featureName="Me"><SettingsSupportPage /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/settings/subscription" element={<ProtectedRoute><FeatureErrorBoundary featureName="Me"><SettingsSubscriptionPage /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/settings/privacy" element={<ProtectedRoute><FeatureErrorBoundary featureName="Me"><SettingsPrivacyPage /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/settings/marketing" element={<ProtectedRoute><FeatureErrorBoundary featureName="Me"><SettingsMarketingPage /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/settings/payment-methods" element={<Navigate to="/wallet" replace />} />
      <Route path="/settings/notification-preferences" element={<Navigate to="/settings/notifications" replace />} />

    </>
  );
}
