import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { CheckCircle, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

const PaymentSuccess = () => {
    const navigate = useNavigate();
    const location = useLocation();

    const { orderId, status } = (location.state as any) || {};

    useEffect(() => {
        // Limpa estados de compra anteriores para evitar loops
        window.history.replaceState({}, document.title);
    }, []);

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
            <Card className="max-w-md w-full text-center border-green-200 shadow-lg">
                <CardHeader>
                    <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 animate-in zoom-in duration-300">
                        <CheckCircle className="w-10 h-10 text-green-600" />
                    </div>
                    <CardTitle className="text-2xl font-bold text-gray-900">
                        Pedido Realizado!
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <p className="text-gray-600">
                        Recebemos sua solicitação de assinatura.
                        {orderId && <span className="block font-mono text-sm mt-2 text-gray-500">Pedido #{orderId}</span>}
                    </p>
                    <div className="bg-blue-50 p-4 rounded-lg text-sm text-blue-800 text-left border border-blue-100">
                        <p className="font-semibold mb-1">Status da Transação:</p>
                        <p className="mb-2">{status === 'approved' ? 'Pagamento Aprovado' : 'Em processamento'}</p>

                        <p className="font-semibold mb-1">Próximos Passos:</p>
                        <ul className="list-disc list-inside space-y-1">
                            <li>Seu médico será notificado.</li>
                            <li>A farmácia iniciará a manipulação.</li>
                            <li>Você receberá o rastreio por e-mail.</li>
                        </ul>
                    </div>
                </CardContent>
                <CardFooter>
                    <Button
                        className="w-full bg-green-600 hover:bg-green-700 h-12 text-lg"
                        onClick={() => navigate("/dashboard")}
                    >
                        Ir para Meus Pedidos <ArrowRight className="ml-2 h-5 w-5" />
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
};

export default PaymentSuccess;