// Arquivo: Frontend/src/auth/Register.tsx

import { useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom"; // <--- ADICIONE useLocation AQUI
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

const Register = () => {
    const navigate = useNavigate();
    const location = useLocation(); // <--- INICIALIZE O HOOK
    const { toast } = useToast();

    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        full_name: "",
        email: "",
        phone: "",
        password: "",
        confirmPassword: ""
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.id]: e.target.value });
    };

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();

        if (formData.password !== formData.confirmPassword) {
            toast({ variant: "destructive", title: "Senhas não conferem" });
            return;
        }

        setLoading(true);

        try {
            // 1. Cria o usuário
            await api.post("/accounts/register/", {
                email: formData.email,
                password: formData.password,
                full_name: formData.full_name,
                phone: formData.phone
            });

            // 2. Faz o Login automático para pegar o Token
            const loginResp = await api.post("/accounts/token/", { // Verifique se sua URL é /accounts/token/ ou /token/
                email: formData.email,
                password: formData.password
            });

            const token = loginResp.data.access;
            localStorage.setItem("access_token", token);

            toast({ title: "Cadastro realizado com sucesso!" });

            // --- A MÁGICA ACONTECE AQUI ---
            // Verifica se o usuário veio da tela de Planos
            if (location.state?.selectedPlan) {
                console.log("Voltando para o checkout com:", location.state);
                navigate("/planos", {
                    state: { ...location.state, step: 2, fromRegister: true } // Marca origem para auto-advance
                });
            } else {
                // Fluxo normal (foi direto para cadastro)
                navigate("/dashboard");
            }
            // -----------------------------

        } catch (error: any) {
            console.error(error);
            const msg = error.response?.data?.email ? "Email já cadastrado." : "Erro ao criar conta.";
            toast({ variant: "destructive", title: "Erro no cadastro", description: msg });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-12">
            <Card className="w-full max-w-md">
                <CardHeader className="space-y-1">
                    <CardTitle className="text-2xl font-bold text-center">Criar Conta</CardTitle>
                    <CardDescription className="text-center">
                        Preencha seus dados para acessar seu protocolo
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleRegister} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="full_name">Nome Completo</Label>
                            <Input id="full_name" placeholder="Seu nome" required onChange={handleChange} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="email">E-mail</Label>
                            <Input id="email" type="email" placeholder="seu@email.com" required onChange={handleChange} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="phone">Celular (WhatsApp)</Label>
                            <Input id="phone" type="tel" placeholder="(11) 99999-9999" required onChange={handleChange} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password">Senha</Label>
                            <Input id="password" type="password" required onChange={handleChange} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="confirmPassword">Confirmar Senha</Label>
                            <Input id="confirmPassword" type="password" required onChange={handleChange} />
                        </div>
                        <Button type="submit" className="w-full" disabled={loading}>
                            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Criar Conta"}
                        </Button>
                    </form>
                </CardContent>
                <CardFooter className="justify-center">
                    <p className="text-sm text-gray-600">
                        Já tem uma conta? <Link to="/login" className="text-primary hover:underline">Fazer Login</Link>
                    </p>
                </CardFooter>
            </Card>
        </div>
    );
};

export default Register;