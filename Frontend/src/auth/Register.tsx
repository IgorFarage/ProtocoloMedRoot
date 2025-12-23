import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { CheckCircle, Clock, ArrowRight, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast"; // Verifique se o caminho do hook está correto
import api from "@/lib/api";
import { useAuth } from "@/auth/AuthProvider";


export default function Register() {
    const navigate = useNavigate();
    const location = useLocation();
    const { login } = useAuth(); // Opcional: se quiser já logar o usuário automaticamente
    const { toast } = useToast();

    // Estados do Formulário
    const [formData, setFormData] = useState({
        full_name: "",
        email: "",
        password: "",
        confirmPassword: "",
    });
    const [loading, setLoading] = useState(false);

    // Novo Estado para controlar a tela de Sucesso
    const [isSuccess, setIsSuccess] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        // ... validações de senha ...
        setLoading(true);

        try {
            // Recupera o histórico de respostas
            const savedAnswers = sessionStorage.getItem("quiz_answers");
            // Importante: Se não houver respostas, enviar objeto vazio {} para não quebrar o backend
            const questionnaireData = savedAnswers ? JSON.parse(savedAnswers) : {};

            const payload = {
                email: formData.email,
                full_name: formData.full_name,
                password: formData.password,
                questionnaire_data: questionnaireData // <--- CORREÇÃO AQUI (Era 'questionnaire')
            };

            await api.post("/accounts/register/", payload);

            setIsSuccess(true);
            sessionStorage.removeItem("quiz_answers");

        } catch (error: any) {
            // ... tratamento de erro ...
        } finally {
            setLoading(false);
        }
    };

    // --- RENDERIZAÇÃO CONDICIONAL: TELA DE SUCESSO ---
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
                        <p className="text-gray-600">
                            Sua conta foi criada com sucesso.
                        </p>

                        <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 text-left flex items-start gap-3">
                            <Clock className="h-5 w-5 text-blue-600 mt-0.5 shrink-0" />
                            <div>
                                <h4 className="font-semibold text-blue-900 text-sm">Status: Em Análise</h4>
                                <p className="text-xs text-blue-700 mt-1 leading-relaxed">
                                    Nossa IA já recebeu suas respostas. Seu protocolo passará por uma validação médica rápida antes da liberação final.
                                </p>
                            </div>
                        </div>
                    </CardContent>

                    <CardFooter className="flex flex-col gap-3 pt-2">
                        {/* --- ALTERAÇÃO AQUI: Passamos o state com o plano para o Login --- */}
                        <Link to="/login" state={location.state} className="w-full">
                            <Button size="lg" className="w-full text-base font-semibold group">
                                Acessar meu Painel
                                <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                            </Button>
                        </Link>
                    </CardFooter>
                </Card>
            </div>
        );
    }

    // --- RENDERIZAÇÃO PADRÃO: FORMULÁRIO ---
    return (
        <div className="container relative min-h-screen flex-col items-center justify-center grid lg:max-w-none lg:grid-cols-2 lg:px-0">
            {/* Lado Esquerdo (Visual/Imagem) - Igual ao Login */}
            <div className="relative hidden h-full flex-col bg-muted p-10 text-white dark:border-r lg:flex">
                <div className="absolute inset-0 bg-zinc-900" />
                <div className="relative z-20 flex items-center text-lg font-medium">
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="mr-2 h-6 w-6"
                    >
                        <path d="M15 6v12a3 3 0 1 0 3-3H6a3 3 0 1 0 3 3V6a3 3 0 1 0-3 3h12a3 3 0 1 0-3-3" />
                    </svg>
                    ProtocoloMed
                </div>
                <div className="relative z-20 mt-auto">
                    <blockquote className="space-y-2">
                        <p className="text-lg">
                            "Finalmente um tratamento que considera meu histórico antes de me empurrar produtos."
                        </p>
                        <footer className="text-sm">Carlos M.</footer>
                    </blockquote>
                </div>
            </div>

            {/* Lado Direito (Formulário) */}
            <div className="lg:p-8">
                <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
                    <div className="flex flex-col space-y-2 text-center">
                        <h1 className="text-2xl font-semibold tracking-tight">Criar uma conta</h1>
                        <p className="text-sm text-muted-foreground">
                            Preencha seus dados para salvar seu protocolo
                        </p>
                    </div>

                    <div className="grid gap-6">
                        <form onSubmit={handleSubmit}>
                            <div className="grid gap-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="full_name">Nome Completo</Label>
                                    <Input
                                        id="full_name"
                                        name="full_name"
                                        placeholder="Ex: João Silva"
                                        type="text"
                                        autoCapitalize="words"
                                        autoCorrect="off"
                                        value={formData.full_name}
                                        onChange={handleChange}
                                        required
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="email">Email</Label>
                                    <Input
                                        id="email"
                                        name="email"
                                        placeholder="nome@exemplo.com"
                                        type="email"
                                        autoCapitalize="none"
                                        autoComplete="email"
                                        autoCorrect="off"
                                        value={formData.email}
                                        onChange={handleChange}
                                        required
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="password">Senha</Label>
                                    <Input
                                        id="password"
                                        name="password"
                                        type="password"
                                        value={formData.password}
                                        onChange={handleChange}
                                        required
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="confirmPassword">Confirmar Senha</Label>
                                    <Input
                                        id="confirmPassword"
                                        name="confirmPassword"
                                        type="password"
                                        value={formData.confirmPassword}
                                        onChange={handleChange}
                                        required
                                    />
                                </div>
                                <Button disabled={loading}>
                                    {loading && (
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    )}
                                    Finalizar Cadastro
                                </Button>
                            </div>
                        </form>

                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <span className="w-full border-t" />
                            </div>
                            <div className="relative flex justify-center text-xs uppercase">
                                <span className="bg-background px-2 text-muted-foreground">
                                    Já tem uma conta?
                                </span>
                            </div>
                        </div>

                        <Link to="/login">
                            <Button variant="outline" className="w-full">
                                Fazer Login
                            </Button>
                        </Link>
                    </div>

                    <p className="px-8 text-center text-sm text-muted-foreground">
                        Ao clicar em continuar, você concorda com nossos{" "}
                        <Link to="/termos" className="underline underline-offset-4 hover:text-primary">
                            Termos de Serviço
                        </Link>{" "}
                        e{" "}
                        <Link to="/privacidade" className="underline underline-offset-4 hover:text-primary">
                            Política de Privacidade
                        </Link>
                        .
                    </p>
                </div>
            </div>
        </div>
    );
}