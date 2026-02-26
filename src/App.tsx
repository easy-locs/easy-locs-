import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
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
import Vault from "./pages/Vault";
import Documents from "./pages/Documents";
import AIAssistant from "./pages/AIAssistant";
import Leases from "./pages/Leases";
import Company from "./pages/Company";
import Sharing from "./pages/Sharing";
import Billing from "./pages/Billing";
import Settings from "./pages/Settings";
import Admin from "./pages/Admin";
import Services from "./pages/Services";
import Tenants from "./pages/Tenants";
import RentalManagement from "./pages/RentalManagement";
import Finances from "./pages/Finances";
import Interventions from "./pages/Interventions";
import Tasks from "./pages/Tasks";
import Notes from "./pages/Notes";
import Messages from "./pages/Messages";
import ChargesRegularization from "./pages/ChargesRegularization";
import FiscalReport from "./pages/FiscalReport";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
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
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/verify-email" element={<VerifyEmail />} />

            {/* Protected routes */}
            <Route path="/onboarding" element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/dashboard/receipts" element={<ProtectedRoute><Receipts /></ProtectedRoute>} />
            <Route path="/dashboard/reminders" element={<ProtectedRoute><Reminders /></ProtectedRoute>} />
            <Route path="/dashboard/vault" element={<ProtectedRoute><Vault /></ProtectedRoute>} />
            <Route path="/dashboard/documents" element={<ProtectedRoute><Documents /></ProtectedRoute>} />
            <Route path="/dashboard/assistant" element={<ProtectedRoute><AIAssistant /></ProtectedRoute>} />
            <Route path="/dashboard/leases" element={<ProtectedRoute><Leases /></ProtectedRoute>} />
            <Route path="/dashboard/company" element={<ProtectedRoute><Company /></ProtectedRoute>} />
            <Route path="/dashboard/sharing" element={<ProtectedRoute><Sharing /></ProtectedRoute>} />
            <Route path="/dashboard/billing" element={<ProtectedRoute><Billing /></ProtectedRoute>} />
            <Route path="/dashboard/services" element={<ProtectedRoute><Services /></ProtectedRoute>} />
            <Route path="/dashboard/tenants" element={<ProtectedRoute><Tenants /></ProtectedRoute>} />
            <Route path="/dashboard/rental" element={<ProtectedRoute><RentalManagement /></ProtectedRoute>} />
            <Route path="/dashboard/finances" element={<ProtectedRoute><Finances /></ProtectedRoute>} />
            <Route path="/dashboard/interventions" element={<ProtectedRoute><Interventions /></ProtectedRoute>} />
            <Route path="/dashboard/tasks" element={<ProtectedRoute><Tasks /></ProtectedRoute>} />
            <Route path="/dashboard/notes" element={<ProtectedRoute><Notes /></ProtectedRoute>} />
            <Route path="/dashboard/messages" element={<ProtectedRoute><Messages /></ProtectedRoute>} />
            <Route path="/dashboard/charges" element={<ProtectedRoute><ChargesRegularization /></ProtectedRoute>} />
            <Route path="/dashboard/fiscal" element={<ProtectedRoute><FiscalReport /></ProtectedRoute>} />
            <Route path="/dashboard/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
            <Route path="/dashboard/admin" element={<ProtectedRoute><Admin /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
