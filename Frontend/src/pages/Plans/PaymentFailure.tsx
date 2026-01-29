import { useLocation, useNavigate } from "react-router-dom";
import { XCircle, RefreshCcw, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

const PaymentFailure = () => {
    const location = useLocation();
    const navigate = useNavigate();

    // Recupera dados do erro e dados para retry (se possível)
    const { message, retryData } = location.state || {};

    const handleRetry = () => {
        // Redireciona de volta para o checkout. 
        // Idealmente passaríamos o 'retryData' de volta para preencher o form, 
        // mas depende de como o PlanSelection trata 'location.state'.
        navigate("/planos", { state: { ...retryData, retry: true } });
    };

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
            <Card className="w-full max-w-md text-center border-red-200 shadow-xl animate-in zoom-in-95">
                <CardHeader>
                    <div className="mx-auto bg-red-100 p-3 rounded-full mb-4">
                        <XCircle className="h-10 w-10 text-red-600" />
                    </div>
                    <CardTitle className="text-2xl font-bold text-gray-900">
                        Pagamento Recusado
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <p className="text-gray-600">
                        Infelizmente não conseguimos processar seu pagamento.
                    </p>

                    {message && (
                        <div className="bg-red-50 p-4 rounded-md border border-red-100 text-sm text-red-800 font-medium break-words">
                            {typeof message === 'object' ? JSON.stringify(message) : message}
                        </div>
                    )}

                    <div className="text-sm text-gray-500">
                        Verifique os dados do cartão ou tente outro método de pagamento.
                    </div>
                </CardContent>
                <CardFooter className="flex flex-col gap-3">
                    <Button
                        onClick={handleRetry}
                        className="w-full bg-red-600 hover:bg-red-700 text-white h-12 text-lg"
                    >
                        <RefreshCcw className="mr-2 h-5 w-5" /> Tentar Novamente
                    </Button>
                    <Button
                        variant="ghost"
                        onClick={() => navigate('/contato')}
                        className="text-gray-500 hover:text-gray-700"
                    >
                        Preciso de ajuda
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
};

export default PaymentFailure;
