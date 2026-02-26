import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { I18nProvider } from "@/lib/i18n";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import VerifyEmail from "./pages/VerifyEmail";
import Onboarding from "./pages/Onboarding";
import Dashboard from "./pages/Dashboard";
import Receipts from "./pages/Receipts";
import Reminders from "./pages/Reminders";
import Documents from "./pages/Documents";
import AIAssistant from "./pages/AIAssistant";
import Leases from "./pages/Leases";
import Company from "./pages/Company";
import Billing from "./pages/Billing";
import Settings from "./pages/Settings";
import Tenants from "./pages/Tenants";
import RentalManagement from "./pages/RentalManagement";
import Finances from "./pages/Finances";
import Interventions from "./pages/Interventions";
import Tasks from "./pages/Tasks";
import Notes from "./pages/Notes";
import Messages from "./pages/Messages";
import ChargesRegularization from "./pages/ChargesRegularization";
import FiscalReport from "./pages/FiscalReport";
import Expenses from "./pages/Expenses";
import Candidates from "./pages/Candidates";
import SeasonalRentals from "./pages/SeasonalRentals";
import PaymentNotices from "./pages/PaymentNotices";
import DunningLetters from "./pages/DunningLetters";
import FurnitureInventory from "./pages/FurnitureInventory";
import Buildings from "./pages/Buildings";
import Vault from "./pages/Vault";
import NotFound from "./pages/NotFound";
// Tenant portal
import TenantDashboard from "./pages/tenant/TenantDashboard";
import TenantReceipts from "./pages/tenant/TenantReceipts";
import TenantDocuments from "./pages/tenant/TenantDocuments";
import TenantMessages from "./pages/tenant/TenantMessages";
import TenantPay from "./pages/tenant/TenantPay";
import TenantSettings from "./pages/tenant/TenantSettings";
import TenantRequests from "./pages/tenant/TenantRequests";
import TenantSignup from "./pages/TenantSignup";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <I18nProvider>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/tenant-signup" element={<TenantSignup />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/verify-email" element={<VerifyEmail />} />

            {/* Protected — Landlord */}
            <Route path="/onboarding" element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/dashboard/receipts" element={<ProtectedRoute><Receipts /></ProtectedRoute>} />
            <Route path="/dashboard/reminders" element={<ProtectedRoute><Reminders /></ProtectedRoute>} />
            <Route path="/dashboard/documents" element={<ProtectedRoute><Documents /></ProtectedRoute>} />
            <Route path="/dashboard/assistant" element={<ProtectedRoute><AIAssistant /></ProtectedRoute>} />
            <Route path="/dashboard/leases" element={<ProtectedRoute><Leases /></ProtectedRoute>} />
            <Route path="/dashboard/company" element={<ProtectedRoute><Company /></ProtectedRoute>} />
            <Route path="/dashboard/billing" element={<ProtectedRoute><Billing /></ProtectedRoute>} />
            <Route path="/dashboard/tenants" element={<ProtectedRoute><Tenants /></ProtectedRoute>} />
            <Route path="/dashboard/rental" element={<ProtectedRoute><RentalManagement /></ProtectedRoute>} />
            <Route path="/dashboard/finances" element={<ProtectedRoute><Finances /></ProtectedRoute>} />
            <Route path="/dashboard/interventions" element={<ProtectedRoute><Interventions /></ProtectedRoute>} />
            <Route path="/dashboard/tasks" element={<ProtectedRoute><Tasks /></ProtectedRoute>} />
            <Route path="/dashboard/notes" element={<ProtectedRoute><Notes /></ProtectedRoute>} />
            <Route path="/dashboard/messages" element={<ProtectedRoute><Messages /></ProtectedRoute>} />
            <Route path="/dashboard/charges" element={<ProtectedRoute><ChargesRegularization /></ProtectedRoute>} />
            <Route path="/dashboard/fiscal" element={<ProtectedRoute><FiscalReport /></ProtectedRoute>} />
            <Route path="/dashboard/expenses" element={<ProtectedRoute><Expenses /></ProtectedRoute>} />
            <Route path="/dashboard/candidates" element={<ProtectedRoute><Candidates /></ProtectedRoute>} />
            <Route path="/dashboard/seasonal" element={<ProtectedRoute><SeasonalRentals /></ProtectedRoute>} />
            <Route path="/dashboard/notices" element={<ProtectedRoute><PaymentNotices /></ProtectedRoute>} />
            <Route path="/dashboard/dunning" element={<ProtectedRoute><DunningLetters /></ProtectedRoute>} />
            <Route path="/dashboard/furniture" element={<ProtectedRoute><FurnitureInventory /></ProtectedRoute>} />
            <Route path="/dashboard/buildings" element={<ProtectedRoute><Buildings /></ProtectedRoute>} />
            <Route path="/dashboard/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
            <Route path="/dashboard/vault" element={<ProtectedRoute><Vault /></ProtectedRoute>} />

            {/* Protected — Tenant portal */}
            <Route path="/tenant" element={<ProtectedRoute><TenantDashboard /></ProtectedRoute>} />
            <Route path="/tenant/receipts" element={<ProtectedRoute><TenantReceipts /></ProtectedRoute>} />
            <Route path="/tenant/documents" element={<ProtectedRoute><TenantDocuments /></ProtectedRoute>} />
            <Route path="/tenant/messages" element={<ProtectedRoute><TenantMessages /></ProtectedRoute>} />
            <Route path="/tenant/pay" element={<ProtectedRoute><TenantPay /></ProtectedRoute>} />
            <Route path="/tenant/settings" element={<ProtectedRoute><TenantSettings /></ProtectedRoute>} />
            <Route path="/tenant/requests" element={<ProtectedRoute><TenantRequests /></ProtectedRoute>} />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
    </I18nProvider>
  </QueryClientProvider>
);

export default App;
