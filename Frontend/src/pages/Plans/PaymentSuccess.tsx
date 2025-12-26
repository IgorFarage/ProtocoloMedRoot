import { useNavigate } from "react-router-dom";
import { CheckCircle, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

const PaymentSuccess = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8 flex items-center justify-center">
            <Card className="max-w-md w-full bg-white shadow-lg text-center">
                <CardHeader>
                    <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-4">
                        <CheckCircle className="h-10 w-10 text-green-600" />
                    </div>
                    <CardTitle className="text-2xl font-bold text-gray-900">
                        Pagamento Confirmado!
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-gray-600 mb-4">
                        Obrigado por assinar o ProtocoloMed. Seu plano foi ativado com sucesso e seu tratamento já está sendo preparado.
                    </p>
                    <p className="text-sm text-gray-500">
                        Você receberá um e-mail com os detalhes da transação.
                    </p>
                </CardContent>
                <CardFooter className="flex flex-col gap-2">
                    <Button
                        className="w-full bg-primary hover:bg-primary/90"
                        size="lg"
                        onClick={() => navigate("/dashboard")}
                    >
                        Ir para meu Dashboard
                        <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                    <Button
                        variant="ghost"
                        className="w-full"
                        onClick={() => navigate("/")}
                    >
                        Voltar ao Início
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
};

export default PaymentSuccess;
