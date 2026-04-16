import { Suspense } from "react";
import { Route, Navigate } from "react-router-dom";
import { FeatureErrorBoundary } from "@/components/FeatureErrorBoundary";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import * as Pages from "@/app/app-route-registry";
import { PillarSkeleton } from "@/app/route-skeletons";
import { DashboardCommRedirect, PricingScrollRedirect } from "@/app/route-helpers";
import { HomeRouter, MarketplaceHomeRouter } from "@/components/app/AppRouters";

const {
  AIAssistant, AISearch, Accounting, AccountingEntries, AddProperty, AuditTrail, Billing,
  BoostDashboardPage, Buildings, CVGenerator, Candidates, CategorySubscriptions, ChannelManager,
  ChargesRegularization, Collaboration, Company, ConciergeOperations, CountryWorkspace, CreateListing,
  CustomerProfilePage, Dashboard, DataImport, DeveloperPortal, Documents, DunningLetters, DynamicPricing,
  Expenses, Finances, FiscalReport, FurnitureInventory, Index, Interventions, IslamicSectionPage,
  LandlordProfile, LandlordRentDashboard, Leases, MyShopsPage, NewsPage, OpsCenter, PaymentNotices,
  PropertyCalendar, PropertyDetailHub, REDocumentsPage, RELeaseDetailPage, RELeasesPage, REPaymentsPage,
  REPropertiesPage, REPropertyDetailPage, RETenantsPage, REUnitsPage, RealEstateListings,
  RealEstateModulePage, Receipts, ReferralFunnelDashboard, Referrals, Reminders, RentalManagement,
  ReportingDashboard, ServiceTrackingPage, Settings, Tasks, Tenants, Vault,
} = Pages;

export function DashboardRoutes() {
  return (
    <>
      <Route path="/" element={<FeatureErrorBoundary featureName="Dashboard"><HomeRouter /></FeatureErrorBoundary>} />
      <Route path="/landing" element={<FeatureErrorBoundary featureName="Dashboard"><Index /></FeatureErrorBoundary>} />
      <Route path="/home" element={<FeatureErrorBoundary featureName="Dashboard"><MarketplaceHomeRouter /></FeatureErrorBoundary>} />
      <Route path="/pricing" element={<PricingScrollRedirect />} />
      <Route path="/dashboard" element={<ProtectedRoute><FeatureErrorBoundary featureName="Dashboard"><Suspense fallback={<PillarSkeleton pillar="dashboard" />}><Dashboard /></Suspense></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/dashboard/property/add" element={<ProtectedRoute><FeatureErrorBoundary featureName="Dashboard"><AddProperty /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/dashboard/property/:id" element={<ProtectedRoute><FeatureErrorBoundary featureName="Dashboard"><PropertyDetailHub /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/dashboard/create-listing" element={<ProtectedRoute><FeatureErrorBoundary featureName="Dashboard"><CreateListing /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/dashboard/receipts" element={<ProtectedRoute><FeatureErrorBoundary featureName="Dashboard"><Receipts /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/dashboard/reminders" element={<ProtectedRoute><FeatureErrorBoundary featureName="Dashboard"><Reminders /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/dashboard/documents" element={<ProtectedRoute><FeatureErrorBoundary featureName="Dashboard"><Documents /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/dashboard/ai" element={<ProtectedRoute><FeatureErrorBoundary featureName="Dashboard"><AIAssistant /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/dashboard/ai-search" element={<ProtectedRoute><FeatureErrorBoundary featureName="Dashboard"><AISearch /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/dashboard/leases" element={<ProtectedRoute><FeatureErrorBoundary featureName="Dashboard"><Leases /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/dashboard/company" element={<ProtectedRoute><FeatureErrorBoundary featureName="Dashboard"><Company /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/dashboard/billing" element={<ProtectedRoute><FeatureErrorBoundary featureName="Dashboard"><Billing /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/dashboard/settings" element={<ProtectedRoute><FeatureErrorBoundary featureName="Dashboard"><Settings /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/dashboard/tenants" element={<ProtectedRoute><FeatureErrorBoundary featureName="Dashboard"><Tenants /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/dashboard/rental-management" element={<ProtectedRoute><FeatureErrorBoundary featureName="Dashboard"><RentalManagement /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/dashboard/finances" element={<ProtectedRoute><FeatureErrorBoundary featureName="Dashboard"><Finances /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/dashboard/interventions" element={<ProtectedRoute><FeatureErrorBoundary featureName="Dashboard"><Interventions /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/dashboard/tasks" element={<ProtectedRoute><FeatureErrorBoundary featureName="Dashboard"><Tasks /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/dashboard/messages" element={<Navigate to="/orbit" replace />} />
      <Route path="/dashboard/activities" element={<Navigate to="/activities" replace />} />
      <Route path="/dashboard/communication" element={<DashboardCommRedirect />} />
      <Route path="/dashboard/charges-regularization" element={<ProtectedRoute><FeatureErrorBoundary featureName="Dashboard"><ChargesRegularization /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/dashboard/fiscal-report" element={<ProtectedRoute><FeatureErrorBoundary featureName="Dashboard"><FiscalReport /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/dashboard/expenses" element={<ProtectedRoute><FeatureErrorBoundary featureName="Dashboard"><Expenses /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/dashboard/candidates" element={<ProtectedRoute><FeatureErrorBoundary featureName="Dashboard"><Candidates /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/dashboard/seasonal-rentals" element={<ProtectedRoute><Navigate to="/property-hub?section=seasonal" replace /></ProtectedRoute>} />
      <Route path="/dashboard/payment-notices" element={<ProtectedRoute><FeatureErrorBoundary featureName="Dashboard"><PaymentNotices /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/dashboard/dunning-letters" element={<ProtectedRoute><FeatureErrorBoundary featureName="Dashboard"><DunningLetters /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/dashboard/furniture-inventory" element={<ProtectedRoute><FeatureErrorBoundary featureName="Dashboard"><FurnitureInventory /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/dashboard/buildings" element={<ProtectedRoute><FeatureErrorBoundary featureName="Dashboard"><Buildings /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/dashboard/vault" element={<ProtectedRoute><FeatureErrorBoundary featureName="Dashboard"><Vault /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/dashboard/import" element={<ProtectedRoute><FeatureErrorBoundary featureName="Dashboard"><DataImport /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/dashboard/cv-generator" element={<ProtectedRoute><FeatureErrorBoundary featureName="Dashboard"><CVGenerator /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/dashboard/subscriptions" element={<ProtectedRoute><FeatureErrorBoundary featureName="Dashboard"><CategorySubscriptions /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/dashboard/channels" element={<ProtectedRoute><FeatureErrorBoundary featureName="Dashboard"><ChannelManager /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/dashboard/accounting" element={<ProtectedRoute><FeatureErrorBoundary featureName="Dashboard"><Accounting /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/dashboard/rent-cockpit" element={<ProtectedRoute><FeatureErrorBoundary featureName="Dashboard"><LandlordRentDashboard /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/dashboard/accounting-entries" element={<ProtectedRoute><FeatureErrorBoundary featureName="Dashboard"><AccountingEntries /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/dashboard/reporting" element={<ProtectedRoute><FeatureErrorBoundary featureName="Dashboard"><ReportingDashboard /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/dashboard/dynamic-pricing" element={<ProtectedRoute><FeatureErrorBoundary featureName="Dashboard"><DynamicPricing /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/dashboard/calendar" element={<ProtectedRoute><FeatureErrorBoundary featureName="Dashboard"><PropertyCalendar /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/dashboard/real-estate" element={<ProtectedRoute><FeatureErrorBoundary featureName="Dashboard"><RealEstateListings /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/dashboard/profile" element={<ProtectedRoute><FeatureErrorBoundary featureName="Dashboard"><LandlordProfile /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/dashboard/referrals" element={<ProtectedRoute><FeatureErrorBoundary featureName="Dashboard"><Referrals /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/dashboard/referral-funnel" element={<ProtectedRoute><FeatureErrorBoundary featureName="Dashboard"><ReferralFunnelDashboard /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/dashboard/collaboration" element={<ProtectedRoute><FeatureErrorBoundary featureName="Dashboard"><Collaboration /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/dashboard/developer" element={<ProtectedRoute><FeatureErrorBoundary featureName="Dashboard"><DeveloperPortal /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/dashboard/audit" element={<ProtectedRoute><FeatureErrorBoundary featureName="Dashboard"><AuditTrail /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/dashboard/wallet" element={<Navigate to="/wallet" replace />} />
      <Route path="/dashboard/service-tracking" element={<ProtectedRoute><FeatureErrorBoundary featureName="Dashboard"><ServiceTrackingPage /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/dashboard/prayer-times" element={<Navigate to="/dashboard/islamic" replace />} />
      <Route path="/dashboard/islamic" element={<ProtectedRoute><FeatureErrorBoundary featureName="Islamic"><IslamicSectionPage /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/dashboard/news" element={<ProtectedRoute><FeatureErrorBoundary featureName="News"><NewsPage /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/dashboard/seller" element={<Navigate to="/seller" replace />} />
      <Route path="/dashboard/driver" element={<Navigate to="/driver/dashboard" replace />} />
      <Route path="/dashboard/delivery" element={<Navigate to="/driver/dashboard" replace />} />
      <Route path="/dashboard/my-shop" element={<Navigate to="/dashboard/my-shops" replace />} />
      <Route path="/dashboard/my-shops" element={<ProtectedRoute><FeatureErrorBoundary featureName="Dashboard"><MyShopsPage /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/dashboard/ops" element={<ProtectedRoute><FeatureErrorBoundary featureName="Dashboard"><OpsCenter /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/dashboard/country/:countryCode" element={<ProtectedRoute><FeatureErrorBoundary featureName="Dashboard"><CountryWorkspace /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/dashboard/boost" element={<ProtectedRoute><FeatureErrorBoundary featureName="Dashboard"><BoostDashboardPage /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/dashboard/properties" element={<ProtectedRoute><FeatureErrorBoundary featureName="Dashboard"><RealEstateModulePage /></FeatureErrorBoundary></ProtectedRoute>}>
      <Route index element={<REPropertiesPage />} />
      <Route path="units" element={<REUnitsPage />} />
      <Route path="tenants" element={<RETenantsPage />} />
      <Route path="leases" element={<RELeasesPage />} />
      <Route path="payments" element={<REPaymentsPage />} />
      <Route path="documents" element={<REDocumentsPage />} />
      </Route>
      <Route path="/real-estate/property/:propertyId" element={<FeatureErrorBoundary featureName="Radar"><REPropertyDetailPage /></FeatureErrorBoundary>} />
      <Route path="/real-estate/lease/:leaseId" element={<FeatureErrorBoundary featureName="Radar"><RELeaseDetailPage /></FeatureErrorBoundary>} />
      <Route path="/property-management" element={<Navigate to="/dashboard/real-estate" replace />} />
      <Route path="/rentals" element={<Navigate to="/dashboard/rental-management" replace />} />
      <Route path="/developer" element={<Navigate to="/dashboard/developer" replace />} />
      <Route path="/concierge-ops" element={<ProtectedRoute><FeatureErrorBoundary featureName="Dashboard"><ConciergeOperations /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/customer/:customerId" element={<ProtectedRoute><FeatureErrorBoundary featureName="Dashboard"><CustomerProfilePage /></FeatureErrorBoundary></ProtectedRoute>} />

    </>
  );
}
