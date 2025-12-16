import { useState } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/auth/AuthProvider";
import { useNavigate, Link } from "react-router-dom";

const Login = () => {
  const { login } = useAuth();
  // Mantemos o estado para controlar o perfil selecionado (começa como 'patient')
  const [role, setRole] = useState<"patient" | "doctor">("patient");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // 1. [CORREÇÃO] Chama a função login com o ROLE ATUALMENTE SELECIONADO (role)
    login({
      role,
      // Valores de protótipo baseados no role
      name: name || (role === 'doctor' ? 'Dr(a). Protótipo' : 'Paciente Protótipo'),
      email: email || `${role}@protocolomed.com`
    });

    // 2. [CORREÇÃO ESSENCIAL] Redirecionamento condicional para as rotas CORRETAS
    if (role === "doctor") {
      // Redireciona para a rota configurada para o médico
      navigate("/DoctorDashboard");
    } else {
      // Redireciona para a rota configurada para o paciente/cliente
      navigate("/ClientDashboard");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-12">
        <div className="max-w-md mx-auto">
          <h1 className="text-2xl font-bold mb-4">Entrar</h1>
          <form onSubmit={handleSubmit} className="space-y-4">

            {/* 3. [CORREÇÃO] Botões de seleção de Perfil restaurados e funcionais */}
            <div>
              <label className="block text-sm font-medium mb-1">Tipo de usuário</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  // Estilo e lógica para selecionar Paciente
                  className={`px-4 py-2 rounded ${role === "patient" ? "bg-primary text-primary-foreground" : "border"}`}
                  onClick={() => setRole("patient")}
                >
                  Paciente
                </button>
                <button
                  type="button"
                  // Estilo e lógica para selecionar Médico
                  className={`px-4 py-2 rounded ${role === "doctor" ? "bg-primary text-primary-foreground" : "border"}`}
                  onClick={() => setRole("doctor")}
                >
                  Médico
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Nome</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Seu nome" />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Email</label>
              <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="seu@email.com" />
            </div>

            <div>
              <Button type="submit" className="w-full">
                Entrar
              </Button>
            </div>

            <div className="text-center text-sm">
              Não tem uma conta?{" "}
              <Link to="/register" className="text-primary hover:underline">
                Cadastre-se
              </Link>
            </div>
          </form>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Login;