import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { CheckCircle, Clock, ArrowRight, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import api from "@/lib/api";
import { useAuth } from "@/auth/AuthProvider";

export default function Register() {
    const navigate = useNavigate();
    const location = useLocation();
    const { login } = useAuth(); // Usado se quisermos logar automático, mas faremos manual abaixo
    const { toast } = useToast();

    // Recupera dados que vieram da página de Planos (Assinatura)
    const { returnTo, selectedPlan, billingCycle, products, total_price } = location.state || {};

    // Estados do Formulário
    const [formData, setFormData] = useState({
        full_name: "",
        email: "",
        password: "",
        confirmPassword: "",
    });

    // Novo: Estado para Endereço
    const [address, setAddress] = useState({
        cep: "",
        street: "",
        number: "",
        neighborhood: "",
        city: "",
        state: ""
    });

    const [loading, setLoading] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setAddress({ ...address, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (formData.password !== formData.confirmPassword) {
            toast({
                variant: "destructive",
                title: "Senhas não conferem",
                description: "Por favor, verifique sua senha."
            });
            return;
        }

        setLoading(true);

        try {
            // Recupera respostas do Quiz (se houver)
            const savedAnswers = sessionStorage.getItem("quiz_answers");
            const questionnaireData = savedAnswers ? JSON.parse(savedAnswers) : {};

            const payload = {
                email: formData.email,
                full_name: formData.full_name,
                password: formData.password,
                questionnaire_data: questionnaireData,
                address_data: address // Envia o endereço para o Backend
            };

            // 1. Cria a Conta
            await api.post("/accounts/register/", payload);

            // 2. Faz Login Automático para pegar o Token
            const loginRes = await api.post("/accounts/login/", {
                email: formData.email,
                password: formData.password
            });

            const token = loginRes.data.access;
            localStorage.setItem("access_token", token);

            // Limpa o quiz
            sessionStorage.removeItem("quiz_answers");

            // 3. DECISÃO DE NAVEGAÇÃO
            // Se veio do botão de assinar, volta para lá para pagar
            if (returnTo === "/planos") {
                toast({ title: "Cadastro realizado!", description: "Redirecionando para o pagamento..." });

                // Pequeno delay para UX
                setTimeout(() => {
                    navigate("/planos", {
                        state: {
                            readyToPay: true, // Gatilho Mágico
                            selectedPlan,
                            billingCycle,
                            products,
                            total_price
                        }
                    });
                }, 1500);
            } else {
                // Fluxo normal (sem compra)
                setIsSuccess(true);
            }

        } catch (error: any) {
            console.error(error);
            const msg = error.response?.data?.email?.[0] || "Erro ao criar conta. Tente novamente.";
            toast({
                variant: "destructive",
                title: "Erro no cadastro",
                description: msg
            });
        } finally {
            setLoading(false);
        }
    };

    // --- TELA DE SUCESSO (Apenas se NÃO for comprar agora) ---
    if (isSuccess) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-12">
                <Card className="w-full max-w-md text-center shadow-lg border-green-100 animate-in fade-in zoom-in duration-300">
                    <CardHeader className="flex flex-col items-center space-y-4 pb-2">
                        <div className="rounded-full bg-green-100 p-4 mb-2">
                            <CheckCircle className="h-12 w-12 text-green-600" />
                        </div>
                        <CardTitle className="text-2xl font-bold text-gray-900">
                            Cadastro Realizado!
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-5">
                        <p className="text-gray-600">Sua conta foi criada com sucesso.</p>
                        <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 text-left flex items-start gap-3">
                            <Clock className="h-5 w-5 text-blue-600 mt-0.5 shrink-0" />
                            <div>
                                <h4 className="font-semibold text-blue-900 text-sm">Status: Em Análise</h4>
                                <p className="text-xs text-blue-700 mt-1 leading-relaxed">
                                    Nossa IA já recebeu suas respostas.
                                </p>
                            </div>
                        </div>
                    </CardContent>
                    <CardFooter className="flex flex-col gap-3 pt-2">
                        <Link to="/dashboard" className="w-full">
                            <Button size="lg" className="w-full text-base font-semibold group">
                                Acessar Painel
                                <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                            </Button>
                        </Link>
                    </CardFooter>
                </Card>
            </div>
        );
    }

    return (
        <div className="container relative min-h-screen flex-col items-center justify-center grid lg:max-w-none lg:grid-cols-2 lg:px-0">
            <div className="relative hidden h-full flex-col bg-muted p-10 text-white dark:border-r lg:flex">
                <div className="absolute inset-0 bg-zinc-900" />
                <div className="relative z-20 flex items-center text-lg font-medium">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2 h-6 w-6">
                        <path d="M15 6v12a3 3 0 1 0 3-3H6a3 3 0 1 0 3 3V6a3 3 0 1 0-3 3h12a3 3 0 1 0-3-3" />
                    </svg>
                    ProtocoloMed
                </div>
                <div className="relative z-20 mt-auto">
                    <blockquote className="space-y-2">
                        <p className="text-lg">"Seu tratamento personalizado começa aqui."</p>
                    </blockquote>
                </div>
            </div>

            <div className="lg:p-8">
                <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[400px]">
                    <div className="flex flex-col space-y-2 text-center">
                        <h1 className="text-2xl font-semibold tracking-tight">Criar uma conta</h1>
                        <p className="text-sm text-muted-foreground">
                            {returnTo ? "Complete seu cadastro para finalizar a assinatura" : "Preencha seus dados para salvar seu protocolo"}
                        </p>
                    </div>

                    <div className="grid gap-6">
                        <form onSubmit={handleSubmit} className="space-y-4">

                            {/* DADOS PESSOAIS */}
                            <div className="grid gap-2">
                                <Label htmlFor="full_name">Nome Completo</Label>
                                <Input id="full_name" name="full_name" value={formData.full_name} onChange={handleChange} required />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="email">Email</Label>
                                <Input id="email" name="email" type="email" value={formData.email} onChange={handleChange} required />
                            </div>

                            {/* ENDEREÇO (Mostra apenas se estiver comprando ou sempre, você decide. Aqui deixei sempre) */}
                            <div className="space-y-2 pt-2">
                                <h3 className="text-sm font-medium text-gray-500">Endereço de Entrega</h3>
                                <div className="grid grid-cols-2 gap-2">
                                    <Input placeholder="CEP" name="cep" value={address.cep} onChange={handleAddressChange} required />
                                    <Input placeholder="Estado (UF)" name="state" value={address.state} onChange={handleAddressChange} required />
                                </div>
                                <Input placeholder="Rua / Av." name="street" value={address.street} onChange={handleAddressChange} required />
                                <div className="grid grid-cols-3 gap-2">
                                    <Input placeholder="Número" name="number" className="col-span-1" value={address.number} onChange={handleAddressChange} required />
                                    <Input placeholder="Bairro" name="neighborhood" className="col-span-2" value={address.neighborhood} onChange={handleAddressChange} required />
                                </div>
                                <Input placeholder="Cidade" name="city" value={address.city} onChange={handleAddressChange} required />
                            </div>

                            {/* SENHA */}
                            <div className="grid gap-2 pt-2">
                                <Label htmlFor="password">Senha</Label>
                                <Input id="password" name="password" type="password" value={formData.password} onChange={handleChange} required />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="confirmPassword">Confirmar Senha</Label>
                                <Input id="confirmPassword" name="confirmPassword" type="password" value={formData.confirmPassword} onChange={handleChange} required />
                            </div>

                            <Button disabled={loading} className="w-full">
                                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {returnTo ? "Cadastrar e Ir para Pagamento" : "Finalizar Cadastro"}
                            </Button>
                        </form>

                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <span className="w-full border-t" />
                            </div>
                            <div className="relative flex justify-center text-xs uppercase">
                                <span className="bg-background px-2 text-muted-foreground">Já tem uma conta?</span>
                            </div>
                        </div>

                        <Link to="/login">
                            <Button variant="outline" className="w-full">Fazer Login</Button>
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}