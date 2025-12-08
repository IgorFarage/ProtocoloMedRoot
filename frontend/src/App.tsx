import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Questionnaire from "./pages/Questionnaire";
import NotFound from "./pages/NotFound";
import Login from "./pages/Login";
import Register from "./pages/Register";
import AboutUs from "./pages/AboutUs";
import ClientDashboard from "./pages/Client/ClientDashboard";
import { AuthProvider } from "@/auth/AuthProvider";
import ProtectedRoute from "@/components/ProtectedRoute";
import DoctorDashboard from "./pages/Doctor/DoctorDashboard";
import Contact from "./pages/Contact";
import ClientProfile from "./pages/Client/ClientProfile";
import ClientProtocol from "./pages/Client/ClientProtocol";
import ClientSchedule from "./pages/Client/ClientSchedule";
import DoctorRecord from "./pages/Doctor/DoctorRecord";
import DoctorTelemedicine from "./pages/Doctor/DoctorTelemedicine";
import DoctorSchedule from "./pages/Doctor/DoctorSchedule";
import DoctorProfileSettings from "./pages/Doctor/DoctorProfileSettings";
import DoctorProfile from "./pages/Doctor/DoctorProfile";

const queryClient = new QueryClient();

// [NEW] Placeholder temporário para o dashboard médico.
// Este componente deverá ser movido para um arquivo separado (ex: ./pages/MedicoDashboard.tsx).
// const MedicoDashboard = () =>
//   <div className="p-8">
//     <h1 className="text-3xl font-bold">Dashboard Médico (Em Construção)</h1>
//     <p className="text-muted-foreground">O acesso está protegido para o perfil 'doctor'.</p>
//   </div>;

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/questionario" element={<Questionnaire />} />
            <Route path="/sobre-nos" element={<AboutUs />} />
            <Route path="/contato" element={<Contact />} />
            <Route path="/agendamento" element={<ClientSchedule />} />
            <Route
              path="/perfil"
              element={
                <ProtectedRoute requireRole="patient">
                  <ClientProfile />
                </ProtectedRoute>
              }
            />

            {/* Dashboard do Paciente */}
            <Route
              path="/ClientDashboard"
              element={
                <ProtectedRoute requireRole="patient">
                  <ClientDashboard />
                </ProtectedRoute>
              }

            />
            {/* Protocolo do Cliente */}
            <Route
              path="/SeuProtocolo"
              element={
                <ProtectedRoute requireRole="patient">
                  <ClientProtocol />
                </ProtectedRoute>
              }
            />

            {/* Perfil do medico */}
            <Route
              path="/PerfilMedico"
              element={
                <ProtectedRoute requireRole="patient">
                  <DoctorProfile />
                </ProtectedRoute>
              }
            />


            {/* Dashboard do Médico (Usando o Placeholder) */}
            <Route
              path="/DoctorDashboard"
              element={
                <ProtectedRoute requireRole="doctor">
                  <DoctorDashboard />
                </ProtectedRoute>
              }
            />

            {/* Prontuário do Paciente */}
            <Route
              path="/medico/paciente/:id"
              element={
                <ProtectedRoute requireRole="doctor">
                  <DoctorRecord />
                </ProtectedRoute>
              }
            />

            {/* Teleconsulta */}
            <Route
              path="/medico/teleconsulta/:id"
              element={
                <ProtectedRoute requireRole="doctor">
                  <DoctorTelemedicine />
                </ProtectedRoute>
              }
            />

            {/* Agenda do Médico */}
            <Route
              path="/medico/agenda"
              element={
                <ProtectedRoute requireRole="doctor">
                  <DoctorSchedule />
                </ProtectedRoute>
              }
            />

            {/* Configurações do Médico */}
            <Route
              path="/medico/configuracoes"
              element={
                <ProtectedRoute requireRole="doctor">
                  <DoctorProfileSettings />
                </ProtectedRoute>
              }
            />

            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;