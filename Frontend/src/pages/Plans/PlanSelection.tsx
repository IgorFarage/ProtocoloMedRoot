import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Check, Shield, Star, Zap, AlertCircle, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import api from "@/lib/api";

const PlanSelection = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { toast } = useToast();

    const [billingCycle, setBillingCycle] = useState<"monthly" | "quarterly">("monthly");
    const [loading, setLoading] = useState<string | null>(null);

    // 1. RECUPERA DADOS (Tenta pegar do state ou do sessionStorage se o state falhar)
    const { total_price, products } = location.state || {};

    // Redirecionamento de segurança (Se o usuário tentar acessar direto sem ter feito o quiz)
    useEffect(() => {
        if (!products || total_price === undefined) {
            // toast({
            //   variant: "destructive",
            //   title: "Dados não encontrados",
            //   description: "Redirecionando para o questionário...",
            // });

            // --- CORREÇÃO AQUI: A rota no seu App.tsx é /questionario (PT), não /questionnaire ---
            navigate("/questionario");
        }
    }, [products, total_price, navigate, toast]);

    // Se não tiver dados, mostra um loading ou volta (evita renderizar o resto e quebrar)
    if (!products || total_price === undefined) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center gap-4">
                <p>Carregando plano...</p>
                <Button variant="outline" onClick={() => navigate("/questionario")}>
                    <ArrowLeft className="mr-2 h-4 w-4" /> Voltar ao Início
                </Button>
            </div>
        );
    }

    // 2. CÁLCULO DOS PREÇOS
    const medicationBase = parseFloat(total_price);
    const serviceFeePlus = 150.00;

    const prices = {
        standard: {
            monthly: medicationBase,
            quarterly: medicationBase * 3 * 0.90
        },
        plus: {
            monthly: medicationBase + serviceFeePlus,
            quarterly: (medicationBase + serviceFeePlus) * 3 * 0.90
        }
    };

    const handleSubscribe = async (planId: "standard" | "plus") => {
        setLoading(planId);

        const token = localStorage.getItem('access_token'); // Verifica se está logado

        if (!token) {
            // Manda para registro levando TUDO
            navigate("/register", {
                state: {
                    selectedPlan: planId,
                    billingCycle,
                    products,
                    total_price
                }
            });
            return;
        }

        try {
            const response = await api.post("/financial/checkout/", {
                plan_id: planId,
                billing_cycle: billingCycle,
                products: products
            });

            const { checkout_url } = response.data;

            if (checkout_url) {
                window.location.href = checkout_url;
            }

        } catch (error) {
            console.error("Erro no checkout:", error);
            toast({
                variant: "destructive",
                title: "Erro ao iniciar pagamento",
                description: "Tente novamente mais tarde.",
            });
            setLoading(null);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-7xl mx-auto space-y-12">

                <div className="text-center space-y-4">
                    <h1 className="text-4xl font-extrabold text-gray-900 sm:text-5xl">
                        Seu Tratamento Personalizado
                    </h1>
                    <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                        Baseado na sua avaliação, selecionamos os melhores ativos para você.
                    </p>
                </div>

                <div className="flex justify-center items-center space-x-4">
                    <span className={`text-sm font-medium ${billingCycle === 'monthly' ? 'text-gray-900' : 'text-gray-500'}`}>
                        Mensal
                    </span>
                    <Switch
                        checked={billingCycle === "quarterly"}
                        onCheckedChange={(checked) => setBillingCycle(checked ? "quarterly" : "monthly")}
                    />
                    <span className={`text-sm font-medium ${billingCycle === 'quarterly' ? 'text-gray-900' : 'text-gray-500'}`}>
                        Trimestral <span className="text-green-600 font-bold ml-1">(-10%)</span>
                    </span>
                </div>

                <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">

                    {/* STANDARD */}
                    <Card className="border-2 border-gray-200 shadow-sm hover:shadow-md transition-shadow bg-white">
                        <CardHeader>
                            <CardTitle className="flex items-center justify-between">
                                <span className="text-2xl font-bold">Standard</span>
                                <Shield className="h-8 w-8 text-blue-500" />
                            </CardTitle>
                            <CardDescription>Apenas os medicamentos do seu protocolo.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="flex items-baseline">
                                <span className="text-4xl font-extrabold">
                                    R$ {billingCycle === 'monthly' ? prices.standard.monthly.toFixed(2) : prices.standard.quarterly.toFixed(2)}
                                </span>
                                <span className="text-gray-500 ml-2">
                                    /{billingCycle === 'monthly' ? 'mês' : 'trimestre'}
                                </span>
                            </div>
                            <ul className="space-y-3">
                                <li className="flex items-center text-sm text-gray-600 bg-gray-100 p-2 rounded">
                                    <AlertCircle className="h-4 w-4 mr-2" />
                                    Valor exato dos medicamentos (Sem Taxa de Serviço)
                                </li>
                                {products.map((p: any) => (
                                    <li key={p.id} className="flex items-center text-sm">
                                        <Check className="h-4 w-4 text-green-500 mr-2" />
                                        {p.name}
                                    </li>
                                ))}
                            </ul>
                        </CardContent>
                        <CardFooter>
                            <Button
                                className="w-full"
                                size="lg"
                                variant="outline"
                                onClick={() => handleSubscribe("standard")}
                                disabled={loading === "standard"}
                            >
                                {loading === "standard" ? "Processando..." : "Assinar Standard"}
                            </Button>
                        </CardFooter>
                    </Card>

                    {/* PLUS */}
                    <Card className="border-2 border-primary shadow-lg relative overflow-hidden bg-white">
                        <div className="absolute top-0 right-0 bg-primary text-white px-3 py-1 text-xs font-bold rounded-bl-lg">
                            MAIS COMPLETO
                        </div>
                        <CardHeader>
                            <CardTitle className="flex items-center justify-between">
                                <span className="text-2xl font-bold text-primary">Plus</span>
                                <Star className="h-8 w-8 text-primary" />
                            </CardTitle>
                            <CardDescription>Tratamento + Acompanhamento + Entrega.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="flex items-baseline">
                                <span className="text-4xl font-extrabold">
                                    R$ {billingCycle === 'monthly' ? prices.plus.monthly.toFixed(2) : prices.plus.quarterly.toFixed(2)}
                                </span>
                                <span className="text-gray-500 ml-2">
                                    /{billingCycle === 'monthly' ? 'mês' : 'trimestre'}
                                </span>
                            </div>
                            <ul className="space-y-3">
                                <li className="flex items-center font-medium">
                                    <Check className="h-5 w-5 text-primary mr-2" />
                                    Todos os medicamentos do Standard
                                </li>
                                <li className="flex items-center">
                                    <Zap className="h-5 w-5 text-yellow-500 mr-2" />
                                    <span className="font-bold">Entrega Grátis em Casa</span>
                                </li>
                                <li className="flex items-center">
                                    <Check className="h-5 w-5 text-primary mr-2" />
                                    <span>Acompanhamento Médico Prioritário</span>
                                </li>
                            </ul>
                        </CardContent>
                        <CardFooter>
                            <Button
                                className="w-full bg-primary hover:bg-primary/90"
                                size="lg"
                                onClick={() => handleSubscribe("plus")}
                                disabled={loading === "plus"}
                            >
                                {loading === "plus" ? "Processando..." : "Assinar Plus"}
                            </Button>
                        </CardFooter>
                    </Card>

                </div>
            </div>
        </div>
    );
};

export default PlanSelection;