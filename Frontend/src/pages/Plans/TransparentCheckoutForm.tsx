import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import api from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CreditCard } from "lucide-react";

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

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsProcessing(true);

        // @ts-ignore - O SDK do MP é injetado via script global
        const mp = new window.MercadoPago(import.meta.env.VITE_MERCADO_PAGO_PUBLIC_KEY);

        try {
            const formData = new FormData(e.currentTarget);

            // 1. Cria o token do cartão com segurança
            const cardToken = await mp.createCardToken({
                cardNumber: formData.get("cardNumber") as string,
                cardholderName: formData.get("cardholderName") as string,
                cardExpirationMonth: formData.get("cardExpirationMonth") as string,
                cardExpirationYear: formData.get("cardExpirationYear") as string,
                securityCode: formData.get("securityCode") as string,
                identificationType: "CPF",
                identificationNumber: formData.get("cpf") as string,
            });

            // 2. Envia o token para o seu Backend (View criada no Passo 1)
            const response = await api.post("/financial/process-payment/", {
                token: cardToken.id,
                external_reference: transactionData.ref,
                payment_method_id: "visa", // No futuro pode ser dinâmico
                installments: 1,
                issuer_id: "24"
            });

            if (response.data.status === "approved") {
                toast({ title: "Sucesso!", description: "Pagamento aprovado com sucesso." });
                onSuccess();
            }
        } catch (error: any) {
            console.error(error);
            toast({
                variant: "destructive",
                title: "Falha no Pagamento",
                description: "Verifique os dados do cartão e tente novamente."
            });
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4 border p-4 rounded-md bg-white">
            <div className="flex items-center gap-2 mb-2 text-blue-700">
                <CreditCard className="w-5 h-5" />
                <span className="font-semibold">Cartão de Crédito</span>
            </div>

            <div className="space-y-1">
                <Label htmlFor="cardholderName">Nome no Cartão</Label>
                <Input id="cardholderName" name="cardholderName" placeholder="Como escrito no cartão" required />
            </div>

            <div className="space-y-1">
                <Label htmlFor="cardNumber">Número do Cartão</Label>
                <Input id="cardNumber" name="cardNumber" placeholder="0000 0000 0000 0000" required />
            </div>

            <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1">
                    <Label>Mês (MM)</Label>
                    <Input name="cardExpirationMonth" placeholder="01" maxLength={2} required />
                </div>
                <div className="space-y-1">
                    <Label>Ano (AA)</Label>
                    <Input name="cardExpirationYear" placeholder="28" maxLength={2} required />
                </div>
                <div className="space-y-1">
                    <Label>CVV</Label>
                    <Input name="securityCode" placeholder="123" maxLength={4} required />
                </div>
            </div>

            <div className="space-y-1">
                <Label htmlFor="cpf">CPF do Titular</Label>
                <Input id="cpf" name="cpf" placeholder="000.000.000-00" required />
            </div>

            <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700" disabled={isProcessing}>
                {isProcessing ? <Loader2 className="animate-spin mr-2" /> : `Pagar R$ ${transactionData.amount.toFixed(2)}`}
            </Button>
        </form>
    );
};