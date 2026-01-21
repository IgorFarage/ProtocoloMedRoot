import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/auth/AuthProvider";
import ProtectedRoute from "@/components/ProtectedRoute";
import MaintenanceGuard from "@/components/MaintenanceGuard";

// Páginas
import Index from "./pages/Index";
import Questionnaire from "./pages/Questionnaire";
import NotFound from "./pages/NotFound";
import Login from "./auth/Login";
import Register from "./auth/Register";
import ForgotPassword from "./auth/ForgotPassword";
import ResetPassword from "./auth/ResetPassword";
import AboutUs from "./pages/AboutUs";
import Contact from "./pages/Contact";

// Área do Cliente
import ClientLayout from "./pages/Client/ClientLayout";
import ClientOverview from "./pages/Client/ClientOverview";
import ClientProfile from "./pages/Client/ClientProfile";
import ClientProtocol from "./pages/Client/ClientProtocol";
import ClientSchedule from "./pages/Client/ClientSchedule";
import ClientHistory from "@/pages/Client/ClientHistory";
import { ClientDataProvider } from "@/hooks/useClientData";

// Área do Médico
import DoctorDashboard from "./pages/Doctor/DoctorDashboard";
import DoctorRecord from "./pages/Doctor/DoctorRecord";
import DoctorTelemedicine from "./pages/Doctor/DoctorTelemedicine";
import DoctorSchedule from "./pages/Doctor/DoctorSchedule";
import DoctorProfileSettings from "./pages/Doctor/DoctorProfileSettings";
import DoctorProfile from "./pages/Doctor/DoctorProfile"; // Não usado na rota comentada, mas mantido import
// import DoctorProfile from "./pages/Doctor/DoctorProfile"; // Era duplicado ou não? Vou manter apenas um se existir

// Produtos
import ProductCatalog from "./pages/Products/ProductCatalog";
import PlanSelection from "./pages/Plans/PlanSelection";

// Pagamento
import PaymentSuccess from "./pages/Plans/PaymentSuccess";
import PaymentPending from "./pages/Plans/PaymentPending";
import PaymentFailure from "./pages/Plans/PaymentFailure";

import { useEffect } from "react";
import { analytics } from "@/lib/analytics";
import { CookieBanner } from "@/components/analytics/CookieBanner";

const queryClient = new QueryClient();

const App = () => {
  // Inicialização do Analytics
  useEffect(() => {
    analytics.initialize();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <MaintenanceGuard>
            <AuthProvider>
              <CookieBanner />
              <Routes>
                {/* Rotas Públicas */}
                <Route path="/" element={<Index />} />
                <Route path="/login" element={<Login />} />
                <Route path="/cadastro" element={<Register />} />

                {/* Password Reset */}
                <Route path="/esqueci-senha" element={<ForgotPassword />} />
                <Route path="/reset-password/:uid/:token" element={<ResetPassword />} />

                {/* Produtos */}
                <Route path="/produtos" element={<ProductCatalog />} />

                {/* Institucional / Outros */}
                <Route path="/questionario" element={<Questionnaire />} />
                <Route path="/sobre-nos" element={<AboutUs />} />
                <Route path="/contato" element={<Contact />} />

                {/* Planos e Pagamento */}
                <Route path="/planos" element={
                  <ClientDataProvider>
                    <PlanSelection />
                  </ClientDataProvider>
                } />
                <Route path="/pagamento/sucesso" element={
                  <ProtectedRoute>
                    <ClientDataProvider>
                      <PaymentSuccess />
                    </ClientDataProvider>
                  </ProtectedRoute>
                } />
                <Route path="/pagamento/pendente" element={<PaymentPending />} />
                <Route path="/pagamento/erro" element={<PaymentFailure />} />

                {/* Rotas Protegidas - PACIENTE */}
                <Route path="/" element={
                  <ProtectedRoute requireRole="patient">
                    <ClientDataProvider>
                      <ClientLayout />
                    </ClientDataProvider>
                  </ProtectedRoute>
                }>
                  <Route path="dashboard" element={<ClientOverview />} />
                  <Route path="perfil" element={<ClientProfile />} />
                  <Route path="agendamento" element={<ClientSchedule />} />
                  <Route path="historico" element={<ClientHistory />} />
                  <Route path="SeuProtocolo" element={<ClientProtocol />} />
                </Route>

                {/* Rotas Protegidas - MÉDICO */}
                <Route path="/DoctorDashboard" element={
                  <ProtectedRoute requireRole="doctor">
                    <DoctorDashboard />
                  </ProtectedRoute>
                }
                />
                <Route path="/medico/paciente/:id" element={
                  <ProtectedRoute requireRole="doctor">
                    <DoctorRecord />
                  </ProtectedRoute>
                }
                />
                <Route path="/medico/teleconsulta/:id" element={
                  <ProtectedRoute requireRole="doctor">
                    <DoctorTelemedicine />
                  </ProtectedRoute>
                }
                />
                <Route path="/medico/agenda" element={
                  <ProtectedRoute requireRole="doctor">
                    <DoctorSchedule />
                  </ProtectedRoute>
                }
                />
                <Route path="/medico/configuracoes" element={
                  <ProtectedRoute requireRole="doctor">
                    <DoctorProfileSettings />
                  </ProtectedRoute>
                }
                />

                <Route path="*" element={<NotFound />} />
              </Routes>
            </AuthProvider>
          </MaintenanceGuard>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;