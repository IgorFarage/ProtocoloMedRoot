import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Lock, FileText, ArrowRight } from "lucide-react";

export default function DashboardRecovery() {
    const navigate = useNavigate();

    return (
        <div className="flex flex-col items-center justify-center h-full min-h-[60vh] animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="max-w-md w-full space-y-8 text-center">

                <div className="flex justify-center mb-6">
                    <div className="relative">
                        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
                            <FileText className="w-10 h-10 text-green-600" />
                        </div>
                        <div className="absolute -bottom-2 -right-2 bg-white p-1 rounded-full shadow-sm">
                            <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                                <Lock className="w-4 h-4 text-yellow-600" />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="space-y-2">
                    <h1 className="text-3xl font-bold tracking-tight text-gray-900">Cadastro Realizado!</h1>
                    <p className="text-gray-500 text-lg">
                        Você está a um passo de receber seu protocolo médico personalizado.
                    </p>
                </div>

                <Card className="border-green-100 shadow-lg bg-white/80 backdrop-blur-sm">
                    <CardHeader>
                        <CardTitle className="text-green-800">Finalize sua Assinatura</CardTitle>
                        <CardDescription>
                            Seus dados já estão salvos. Escolha seu plano para liberar o acesso imediato ao tratamento.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <Button
                            size="lg"
                            className="w-full h-14 text-lg bg-green-600 hover:bg-green-700 shadow-md transition-all hover:scale-[1.02]"
                            onClick={() => navigate("/planos")}
                        >
                            Finalizar Assinatura <ArrowRight className="ml-2 w-5 h-5" />
                        </Button>

                        <p className="text-xs text-gray-400">
                            Ambiente 100% Seguro. Cancelamento a qualquer momento.
                        </p>
                    </CardContent>
                </Card>

                <div className="pt-4">
                    <Button variant="ghost" className="text-gray-400 hover:text-gray-600">
                        Precisa de ajuda? Falar com Suporte
                    </Button>
                </div>

            </div>
        </div>
    );
}
