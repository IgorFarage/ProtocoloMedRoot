import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check, Shield, Star, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

export default function PlanSelection() {
    const navigate = useNavigate();
    const [billingCycle, setBillingCycle] = useState<"monthly" | "quarterly">("monthly");

    const plans = [
        {
            id: "standard",
            name: "Protocolo Standard",
            description: "O essencial para recuperar seus fios com eficácia comprovada.",
            price: billingCycle === "monthly" ? 149.90 : 399.90, // Exemplo
            features: [
                "Entrega mensal discreta em casa",
                "Fórmulas manipuladas personalizadas",
                "Prescrição médica inclusa",
                "Suporte via WhatsApp",
            ],
            highlight: false,
            color: "bg-white",
            btnVariant: "outline" as const,
        },
        {
            id: "plus",
            name: "Protocolo Plus",
            description: "Acelere seus resultados com acompanhamento completo de especialistas.",
            price: billingCycle === "monthly" ? 199.90 : 539.90, // Exemplo
            features: [
                "Tudo do plano Standard",
                "Consulta mensal com Tricologista",
                "Plano alimentar com Nutricionista",
                "Ajuste fino da fórmula a cada 3 meses",
                "Prioridade no suporte",
            ],
            highlight: true,
            color: "bg-slate-900 text-white",
            btnVariant: "default" as const,
        }
    ];

    const handleSelectPlan = (planId: string) => {
        // Salva o plano escolhido no localStorage para usar no Registro depois
        localStorage.setItem("selectedPlan", planId);
        localStorage.setItem("billingCycle", billingCycle);

        // Redireciona para o Cadastro (onde ele cria conta e depois paga)
        navigate("/cadastro");
    };

    return (
        <div className="min-h-screen flex flex-col bg-gray-50">
            <Header />

            <main className="flex-1 container mx-auto px-4 py-16">
                <div className="text-center max-w-3xl mx-auto mb-12 space-y-4">
                    <h1 className="text-4xl font-bold tracking-tight text-slate-900">
                        Escolha o plano ideal para seu cabelo
                    </h1>
                    <p className="text-lg text-slate-600">
                        Assinatura flexível. Cancele quando quiser. Resultados reais.
                    </p>

                    {/* Toggle Mensal/Trimestral (Opcional) */}
                    <div className="flex items-center justify-center mt-6 gap-4">
                        <button
                            onClick={() => setBillingCycle("monthly")}
                            className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${billingCycle === "monthly" ? "bg-primary text-white shadow-md" : "text-gray-500 hover:bg-gray-100"
                                }`}
                        >
                            Mensal
                        </button>
                        <button
                            onClick={() => setBillingCycle("quarterly")}
                            className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${billingCycle === "quarterly" ? "bg-primary text-white shadow-md" : "text-gray-500 hover:bg-gray-100"
                                }`}
                        >
                            Trimestral <span className="text-xs ml-1 opacity-80">(-10%)</span>
                        </button>
                    </div>
                </div>

                <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
                    {plans.map((plan) => (
                        <Card
                            key={plan.id}
                            className={`relative border-2 transition-all duration-300 hover:shadow-xl flex flex-col ${plan.highlight ? "border-primary shadow-lg scale-105 z-10" : "border-gray-100"
                                } ${plan.color === "bg-slate-900 text-white" ? "bg-slate-900 text-white" : "bg-white"}`}
                        >
                            {plan.highlight && (
                                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-primary text-white px-4 py-1 rounded-full text-sm font-bold flex items-center gap-1 shadow-md">
                                    <Star className="w-3 h-3 fill-current" /> MAIS ESCOLHIDO
                                </div>
                            )}

                            <CardHeader>
                                <CardTitle className={`text-2xl font-bold ${plan.highlight ? "text-white" : "text-slate-900"}`}>
                                    {plan.name}
                                </CardTitle>
                                <CardDescription className={plan.highlight ? "text-slate-300" : "text-slate-500"}>
                                    {plan.description}
                                </CardDescription>
                            </CardHeader>

                            <CardContent className="flex-1">
                                <div className="mb-6">
                                    <span className="text-4xl font-extrabold">
                                        R$ {plan.price.toFixed(2).replace('.', ',')}
                                    </span>
                                    <span className={`text-sm ${plan.highlight ? "text-slate-400" : "text-slate-500"}`}>
                                        /{billingCycle === "monthly" ? "mês" : "trimestre"}
                                    </span>
                                </div>

                                <ul className="space-y-3">
                                    {plan.features.map((feature, idx) => (
                                        <li key={idx} className="flex items-start gap-3">
                                            <div className={`mt-1 p-0.5 rounded-full ${plan.highlight ? "bg-primary text-white" : "bg-green-100 text-green-700"}`}>
                                                <Check className="w-3 h-3" />
                                            </div>
                                            <span className={`text-sm ${plan.highlight ? "text-slate-200" : "text-slate-600"}`}>
                                                {feature}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            </CardContent>

                            <CardFooter>
                                <Button
                                    className={`w-full h-12 text-lg font-semibold ${plan.highlight
                                            ? "bg-white text-slate-900 hover:bg-slate-100"
                                            : ""
                                        }`}
                                    variant={plan.highlight ? "default" : "default"} // Visual tweak
                                    onClick={() => handleSelectPlan(plan.id)}
                                >
                                    {plan.highlight && <Zap className="w-4 h-4 mr-2" />}
                                    Escolher {plan.name}
                                </Button>
                            </CardFooter>
                        </Card>
                    ))}
                </div>

                <div className="mt-16 text-center max-w-2xl mx-auto bg-blue-50 p-6 rounded-xl border border-blue-100">
                    <div className="flex justify-center mb-4">
                        <Shield className="w-10 h-10 text-primary" />
                    </div>
                    <h3 className="text-lg font-semibold text-slate-900 mb-2">Garantia de Satisfação</h3>
                    <p className="text-slate-600 text-sm">
                        Se não estiver satisfeito com o protocolo nos primeiros 30 dias, devolvemos seu dinheiro.
                        Acreditamos na eficácia do nosso tratamento.
                    </p>
                </div>
            </main>

            <Footer />
        </div>
    );
}