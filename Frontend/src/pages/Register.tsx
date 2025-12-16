import { useState } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/auth/AuthProvider";
import { useNavigate, Link } from "react-router-dom";
import { toast } from "sonner";

const Register = () => {
    const { login } = useAuth();
    const [role, setRole] = useState<"patient" | "doctor">("patient");
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const navigate = useNavigate();

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (password !== confirmPassword) {
            toast.error("As senhas não coincidem");
            return;
        }

        if (!name || !email || !password) {
            toast.error("Por favor, preencha todos os campos");
            return;
        }

        // Simulação de registro - loga o usuário diretamente
        login({
            role,
            name,
            email
        });

        toast.success("Conta criada com sucesso!");

        if (role === "doctor") {
            navigate("/DoctorDashboard");
        } else {
            navigate("/ClientDashboard");
        }
    };

    return (
        <div className="min-h-screen bg-background">
            <Header />
            <main className="container mx-auto px-4 py-12">
                <div className="max-w-md mx-auto">
                    <h1 className="text-2xl font-bold mb-4">Criar Conta</h1>
                    <form onSubmit={handleSubmit} className="space-y-4">

                        <div>
                            <label className="block text-sm font-medium mb-1">Tipo de usuário</label>
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    className={`px-4 py-2 rounded ${role === "patient" ? "bg-primary text-primary-foreground" : "border"}`}
                                    onClick={() => setRole("patient")}
                                >
                                    Paciente
                                </button>
                                <button
                                    type="button"
                                    className={`px-4 py-2 rounded ${role === "doctor" ? "bg-primary text-primary-foreground" : "border"}`}
                                    onClick={() => setRole("doctor")}
                                >
                                    Médico
                                </button>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1">Nome Completo</label>
                            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Seu nome" />
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1">Email</label>
                            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="seu@email.com" />
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1">Senha</label>
                            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="******" />
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1">Confirmar Senha</label>
                            <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="******" />
                        </div>

                        <div>
                            <Button type="submit" className="w-full">
                                Cadastrar
                            </Button>
                        </div>

                        <div className="text-center text-sm">
                            Já tem uma conta?{" "}
                            <Link to="/login" className="text-primary hover:underline">
                                Faça login
                            </Link>
                        </div>
                    </form>
                </div>
            </main>
            <Footer />
        </div>
    );
};

export default Register;
