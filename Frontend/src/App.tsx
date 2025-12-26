import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/auth/AuthProvider";
import ProtectedRoute from "@/components/ProtectedRoute";

// Páginas
import Index from "./pages/Index";
import Questionnaire from "./pages/Questionnaire";
import NotFound from "./pages/NotFound";
import Login from "./auth/Login";
import Register from "./auth/Register";
import AboutUs from "./pages/AboutUs";
import Contact from "./pages/Contact";

// Área do Cliente
import ClientDashboard from "./pages/Client/ClientDashboard";
import ClientProfile from "./pages/Client/ClientProfile";
import ClientProtocol from "./pages/Client/ClientProtocol";
import ClientSchedule from "./pages/Client/ClientSchedule";

// Área do Médico
import DoctorDashboard from "./pages/Doctor/DoctorDashboard";
import DoctorRecord from "./pages/Doctor/DoctorRecord";
import DoctorTelemedicine from "./pages/Doctor/DoctorTelemedicine";
import DoctorSchedule from "./pages/Doctor/DoctorSchedule";
import DoctorProfileSettings from "./pages/Doctor/DoctorProfileSettings";
import DoctorProfile from "./pages/Doctor/DoctorProfile";

// Produtos
import ProductCatalog from "./pages/Products/ProductCatalog";
import PlanSelection from "./pages/Plans/PlanSelection";

const queryClient = new QueryClient();

import PaymentSuccess from "./pages/Plans/PaymentSuccess";

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* Rotas Públicas */}
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />
            <Route path="/cadastro" element={<Register />} />

            {/* NOVA ROTA DE PRODUTOS */}
            <Route path="/produtos" element={<ProductCatalog />} />

            {/* [AJUSTE] Padronizado para inglês para bater com os links internos */}
            <Route path="/questionario" element={<Questionnaire />} />

            <Route path="/sobre-nos" element={<AboutUs />} />
            <Route path="/contato" element={<Contact />} />
            <Route path="/planos" element={<PlanSelection />} />
            <Route path="/pagamento/sucesso" element={<PaymentSuccess />} />

            {/* Rotas Protegidas - PACIENTE */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute requireRole="patient">
                  <ClientDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/perfil"
              element={
                <ProtectedRoute requireRole="patient">
                  <ClientProfile />
                </ProtectedRoute>
              }
            />
            <Route
              path="/agendamento"
              element={
                <ProtectedRoute requireRole="patient">
                  <ClientSchedule />
                </ProtectedRoute>
              }
            />
            <Route
              path="/SeuProtocolo"
              element={
                <ProtectedRoute requireRole="patient">
                  <ClientProtocol />
                </ProtectedRoute>
              }
            />
            <Route
              path="/PerfilMedico"
              element={
                <ProtectedRoute requireRole="patient">
                  <DoctorProfile />
                </ProtectedRoute>
              }
            />

            {/* Rotas Protegidas - MÉDICO */}
            <Route
              path="/DoctorDashboard"
              element={
                <ProtectedRoute requireRole="doctor">
                  <DoctorDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/medico/paciente/:id"
              element={
                <ProtectedRoute requireRole="doctor">
                  <DoctorRecord />
                </ProtectedRoute>
              }
            />
            <Route
              path="/medico/teleconsulta/:id"
              element={
                <ProtectedRoute requireRole="doctor">
                  <DoctorTelemedicine />
                </ProtectedRoute>
              }
            />
            <Route
              path="/medico/agenda"
              element={
                <ProtectedRoute requireRole="doctor">
                  <DoctorSchedule />
                </ProtectedRoute>
              }
            />
            <Route
              path="/medico/configuracoes"
              element={
                <ProtectedRoute requireRole="doctor">
                  <DoctorProfileSettings />
                </ProtectedRoute>
              }
            />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;