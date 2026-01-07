import { useLocation, useNavigate } from "react-router-dom";
import { Copy, Check, QrCode as QrIcon, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";

const PaymentPending = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { toast } = useToast();
    const [copied, setCopied] = useState(false);

    const { pixData, price, status } = location.state || {};

    useEffect(() => {
        if (!pixData && status !== 'in_process') {
            // Se não houver dados nem status pendente, redireciona
            // navigate('/planos'); 
        }
    }, [pixData, status, navigate]);

    const copyPixCode = () => {
        if (pixData?.qr_code) {
            navigator.clipboard.writeText(pixData.qr_code);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
            toast({ description: "Código PIX copiado!" });
        }
    };

    if (!pixData && status === 'in_process') {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
                <Card className="w-full max-w-md text-center shadow-xl animate-in zoom-in-95 border-blue-200">
                    <CardHeader>
                        <div className="mx-auto bg-blue-100 p-3 rounded-full mb-2">
                            <Clock className="h-8 w-8 text-blue-700" />
                        </div>
                        <CardTitle className="text-2xl font-bold text-gray-900">Pagamento em Análise</CardTitle>
                        <CardDescription className="text-gray-600">
                            Estamos processando seu pagamento com cartão.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="bg-blue-50 p-4 rounded-lg text-sm text-blue-800 text-left border border-blue-100">
                            <p className="font-semibold mb-1">O que isso significa?</p>
                            <p>Sua operadora de cartão está verificando a transação. Isso é um procedimento de segurança comum e pode levar alguns minutos.</p>
                            <p className="mt-2">Você receberá um e-mail assim que for aprovado.</p>
                        </div>
                    </CardContent>
                    <CardFooter>
                        <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white h-12 text-lg" onClick={() => navigate("/dashboard")}>
                            Ir para Dashboard
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        );
    }

    if (!pixData) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <Card className="w-full max-w-md p-6 text-center">
                    <Clock className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
                    <h2 className="text-xl font-bold text-gray-900">Aguardando Pagamento</h2>
                    <p className="text-gray-500 mt-2">Nenhum dado de pagamento encontrado. Verifique seus pedidos.</p>
                    <Button className="mt-4" onClick={() => navigate('/dashboard')}>Ir para Dashboard</Button>
                </Card>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
            <Card className="w-full max-w-md text-center shadow-xl animate-in zoom-in-95 border-yellow-200">
                <CardHeader>
                    <div className="mx-auto bg-yellow-100 p-3 rounded-full mb-2">
                        <Clock className="h-8 w-8 text-yellow-700" />
                    </div>
                    <CardTitle className="text-2xl font-bold text-gray-900">Pagamento Pendente</CardTitle>
                    <CardDescription className="text-gray-600">
                        Finalize o pagamento para liberar seu acesso.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="bg-white border-2 border-yellow-400 rounded-lg p-2 inline-block shadow-sm">
                        {pixData.qr_code_base64 && (
                            <img
                                src={`data:image/png;base64,${pixData.qr_code_base64}`}
                                alt="QR Code Pix"
                                className="w-64 h-64 object-contain"
                            />
                        )}
                    </div>

                    <div className="bg-yellow-50 p-4 rounded-lg text-sm text-yellow-800 text-left border border-yellow-100">
                        <p className="font-semibold mb-1 flex items-center gap-2">
                            <QrIcon className="w-4 h-4" /> Instruções:
                        </p>
                        <ol className="list-decimal list-inside space-y-1 ml-1">
                            <li>Abra o aplicativo do seu banco.</li>
                            <li>Escolha pagar via PIX com QR Code.</li>
                            <li>Escaneie a imagem ou cole o código.</li>
                        </ol>
                    </div>

                    <div className="space-y-2">
                        <div className="flex justify-between text-sm px-1">
                            <span className="font-medium text-gray-500">Valor a pagar:</span>
                            <span className="font-bold text-gray-900">R$ {price}</span>
                        </div>
                        <div className="flex gap-2">
                            <Input
                                readOnly
                                value={pixData.qr_code}
                                className="bg-gray-50 text-xs font-mono border-gray-300 text-gray-600"
                            />
                            <Button size="icon" onClick={copyPixCode} className="shrink-0 bg-yellow-600 hover:bg-yellow-700 text-white">
                                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                            </Button>
                        </div>
                    </div>
                </CardContent>
                <CardFooter className="flex flex-col gap-2">
                    <Button
                        className="w-full bg-yellow-600 hover:bg-yellow-700 text-white h-12 text-lg"
                        onClick={() => navigate("/dashboard")} // Assumindo que o usuário vai verificar depois
                    >
                        Já realizei o pagamento
                    </Button>
                    <Button variant="ghost" className="w-full text-gray-500" onClick={() => navigate('/planos')}>
                        Voltar
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
};

export default PaymentPending;
