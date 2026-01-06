import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import api from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CreditCard, QrCode, Copy, Check } from "lucide-react";

interface Props {
    transactionData: {
        ref: string;
        amount: number;
    };
    onSuccess: () => void;
}

export const TransparentCheckoutForm = ({ transactionData, onSuccess }: Props) => {
    const { toast } = useToast();
    const [isProcessing, setIsProcessing] = useState(false);

    // ESTADO PARA TROCA DE ABAS (Manual, sem depender de componentes externos)
    const [activeTab, setActiveTab] = useState<'credit_card' | 'pix'>('credit_card');

    // ESTADO DO PIX
    const [pixData, setPixData] = useState<{ qr_code: string, qr_code_base64: string } | null>(null);
    const [copied, setCopied] = useState(false);

    // ESTADO DO FORMULÁRIO PIX (Dados do Pagador)
    const [pixPayer, setPixPayer] = useState({
        full_name: "",
        email: "",
        cpf: ""
    });

    // --- LÓGICA: PAGAMENTO CARTÃO ---
    const handleCardSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsProcessing(true);

        try {
            // @ts-ignore
            const mp = new window.MercadoPago(import.meta.env.VITE_MERCADO_PAGO_PUBLIC_KEY);
            const formData = new FormData(e.currentTarget);

            const cardToken = await mp.createCardToken({
                cardNumber: formData.get("cardNumber") as string,
                cardholderName: formData.get("cardholderName") as string,
                cardExpirationMonth: formData.get("cardExpirationMonth") as string,
                cardExpirationYear: formData.get("cardExpirationYear") as string,
                securityCode: formData.get("securityCode") as string,
                identificationType: "CPF",
                identificationNumber: formData.get("cpf") as string,
            });

            const response = await api.post("/financial/process-payment/", {
                token: cardToken.id,
                external_reference: transactionData.ref,
                payment_method_id: "visa",
                installments: 1,
                payer: {
                    email: formData.get("email") as string,
                    identification: { type: "CPF", number: formData.get("cpf") as string }
                }
            });

            if (response.data.status === "approved") {
                toast({ title: "Sucesso!", description: "Pagamento aprovado." });
                onSuccess();
            } else {
                throw new Error(response.data.status_detail || "Recusado");
            }

        } catch (error: any) {
            console.error(error);
            toast({ variant: "destructive", title: "Erro", description: "Falha no cartão. Verifique os dados." });
        } finally {
            setIsProcessing(false);
        }
    };

    // --- LÓGICA: PAGAMENTO PIX ---
    const handlePixSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsProcessing(true);
        try {
            // Envia dados para o backend gerar o PIX
            const response = await api.post("/financial/process-payment/", {
                payment_method_id: "pix",
                external_reference: transactionData.ref,
                installments: 1,
                // Dados manuais do state do formulário PIX
                payer: {
                    email: pixPayer.email,
                    first_name: pixPayer.full_name.split(" ")[0],
                    last_name: pixPayer.full_name.split(" ").slice(1).join(" ") || "Cliente",
                    identification: { type: "CPF", number: pixPayer.cpf }
                },
                // Passa na raiz também para facilitar
                email: pixPayer.email,
                cpf: pixPayer.cpf,
                full_name: pixPayer.full_name
            });

            const pixInfo = response.data.pix_data ||
                response.data.point_of_interaction?.transaction_data;

            if (pixInfo) {
                setPixData({
                    qr_code: pixInfo.qr_code,
                    qr_code_base64: pixInfo.qr_code_base64
                });
                toast({ title: "QR Code Gerado!", description: "Realize o pagamento no app do seu banco." });
            } else {
                throw new Error("Dados do PIX não retornados.");
            }

        } catch (error) {
            console.error("Erro PIX", error);
            toast({ variant: "destructive", title: "Erro", description: "Não foi possível gerar o PIX." });
        } finally {
            setIsProcessing(false);
        }
    };

    // Função auxiliar para copiar código PIX
    const copyPixCode = () => {
        if (pixData?.qr_code) {
            navigator.clipboard.writeText(pixData.qr_code);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
            toast({ description: "Código Copiado!" });
        }
    };

    // --- TELA DE SUCESSO DO PIX (QR CODE) ---
    if (pixData) {
        return (
            <div className="flex flex-col items-center justify-center space-y-6 p-6 border rounded-xl bg-white shadow-lg animate-in zoom-in-95 duration-300">
                <div className="text-center space-y-2">
                    <div className="bg-green-100 p-3 rounded-full w-fit mx-auto">
                        <QrCode className="h-8 w-8 text-green-700" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900">Escaneie para Pagar</h3>
                    <p className="text-sm text-gray-500">Abra o app do seu banco e escaneie o QR Code.</p>
                </div>

                <div className="p-2 bg-white border-2 border-green-500 rounded-lg shadow-sm">
                    <img
                        src={`data:image/png;base64,${pixData.qr_code_base64}`}
                        alt="QR Code PIX"
                        className="w-56 h-56 object-contain"
                    />
                </div>

                <div className="w-full space-y-2">
                    <Label className="text-xs text-gray-500 uppercase font-semibold">Pix Copia e Cola</Label>
                    <div className="flex items-center gap-2">
                        <Input
                            readOnly
                            value={pixData.qr_code}
                            className="flex-1 text-xs bg-gray-50 font-mono h-10 border-green-200"
                        />
                        <Button onClick={copyPixCode} size="icon" className="shrink-0 bg-green-600 hover:bg-green-700">
                            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                        </Button>
                    </div>
                </div>

                <Button variant="outline" className="w-full border-green-600 text-green-700 hover:bg-green-50" onClick={onSuccess}>
                    Já fiz o pagamento
                </Button>
            </div>
        );
    }

    // --- TELA DE SELEÇÃO E FORMULÁRIOS ---
    return (
        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
            {/* 1. BOTÕES DE SELEÇÃO DE MÉTODO (Manual Tabs) */}
            <div className="grid grid-cols-2 bg-gray-100 p-1 gap-1">
                <button
                    type="button"
                    onClick={() => setActiveTab('credit_card')}
                    className={`flex items-center justify-center gap-2 py-3 text-sm font-medium rounded-md transition-all ${activeTab === 'credit_card'
                            ? 'bg-white text-blue-600 shadow-sm'
                            : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200'
                        }`}
                >
                    <CreditCard className="w-4 h-4" />
                    Cartão de Crédito
                </button>
                <button
                    type="button"
                    onClick={() => setActiveTab('pix')}
                    className={`flex items-center justify-center gap-2 py-3 text-sm font-medium rounded-md transition-all ${activeTab === 'pix'
                            ? 'bg-white text-green-600 shadow-sm'
                            : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200'
                        }`}
                >
                    <QrCode className="w-4 h-4" />
                    PIX (Instantâneo)
                </button>
            </div>

            {/* 2. CONTEÚDO DOS FORMULÁRIOS */}
            <div className="p-6">
                {activeTab === 'credit_card' ? (
                    // FORMULÁRIO DO CARTÃO
                    <form onSubmit={handleCardSubmit} className="space-y-4 animate-in fade-in slide-in-from-left-4 duration-300">
                        <div className="space-y-1">
                            <Label>Nome no Cartão</Label>
                            <Input name="cardholderName" placeholder="Nome impresso no cartão" required />
                        </div>

                        <div className="space-y-1">
                            <Label>Email</Label>
                            <Input name="email" type="email" placeholder="seu@email.com" required />
                        </div>

                        <div className="space-y-1">
                            <Label>Número do Cartão</Label>
                            <Input name="cardNumber" placeholder="0000 0000 0000 0000" maxLength={19} required />
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                            <div className="space-y-1">
                                <Label>Mês</Label>
                                <Input name="cardExpirationMonth" placeholder="MM" maxLength={2} required />
                            </div>
                            <div className="space-y-1">
                                <Label>Ano</Label>
                                <Input name="cardExpirationYear" placeholder="YY" maxLength={2} required />
                            </div>
                            <div className="space-y-1">
                                <Label>CVV</Label>
                                <Input name="securityCode" placeholder="123" maxLength={4} type="password" required />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <Label>CPF do Titular</Label>
                            <Input name="cpf" placeholder="000.000.000-00" required />
                        </div>

                        <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 h-12 text-lg font-semibold mt-4" disabled={isProcessing}>
                            {isProcessing ? <Loader2 className="animate-spin mr-2" /> : `Pagar R$ ${transactionData.amount.toFixed(2)}`}
                        </Button>
                    </form>
                ) : (
                    // FORMULÁRIO DO PIX
                    <form onSubmit={handlePixSubmit} className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
                        <div className="text-center space-y-2 mb-4 bg-green-50 p-4 rounded-lg border border-green-100">
                            <h3 className="font-semibold text-green-900">Gerar Código PIX</h3>
                            <p className="text-xs text-green-700">Aprovação imediata e liberação automática.</p>
                        </div>

                        <div className="space-y-1">
                            <Label>Nome Completo</Label>
                            <Input
                                value={pixPayer.full_name}
                                onChange={(e) => setPixPayer({ ...pixPayer, full_name: e.target.value })}
                                placeholder="Seu nome completo"
                                required
                            />
                        </div>

                        <div className="space-y-1">
                            <Label>Seu Melhor Email</Label>
                            <Input
                                type="email"
                                value={pixPayer.email}
                                onChange={(e) => setPixPayer({ ...pixPayer, email: e.target.value })}
                                placeholder="exemplo@email.com"
                                required
                            />
                        </div>

                        <div className="space-y-1">
                            <Label>CPF</Label>
                            <Input
                                value={pixPayer.cpf}
                                onChange={(e) => setPixPayer({ ...pixPayer, cpf: e.target.value })}
                                placeholder="000.000.000-00"
                                required
                            />
                        </div>

                        <div className="border-t pt-4 mt-2">
                            <div className="flex justify-between items-center mb-4 px-2">
                                <span className="text-gray-600">Total a pagar:</span>
                                <span className="text-xl font-bold text-green-700">R$ {transactionData.amount.toFixed(2)}</span>
                            </div>

                            <Button type="submit" className="w-full bg-green-600 hover:bg-green-700 h-12 text-lg font-semibold shadow-sm" disabled={isProcessing}>
                                {isProcessing ? (
                                    <><Loader2 className="animate-spin mr-2" /> Gerando...</>
                                ) : (
                                    "Gerar PIX"
                                )}
                            </Button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
};