import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle, Loader2, CreditCard, MapPin, User, ArrowLeft, Lock, QrCode, Copy, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const PlanSelection = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { toast } = useToast();

    const { total_price, products, answers } = location.state || {};

    const [step, setStep] = useState<1 | 2>(1);
    const [selectedPlan, setSelectedPlan] = useState<"standard" | "plus">("plus");
    const [billingCycle, setBillingCycle] = useState<"monthly" | "quarterly">("monthly");
    const [loading, setLoading] = useState(false);

    // NOVO: Controle do Tipo de Pagamento
    const [paymentType, setPaymentType] = useState<'credit_card' | 'pix'>('credit_card');

    // NOVO: Dados do PIX gerado
    const [pixResult, setPixResult] = useState<{ qr_code: string, qr_code_base64: string } | null>(null);
    const [copied, setCopied] = useState(false);

    // Estado Unificado com ENDEREÇO COMPLETO
    const [formData, setFormData] = useState({
        // Pessoais
        full_name: "", email: "", password: "", confirmPassword: "", cpf: "",
        // Entrega
        cep: "", address: "", number: "", neighborhood: "", complement: "", city: "", state: "",
        // Cartão
        cardName: "", cardNumber: "", cardMonth: "", cardYear: "", cardCvv: ""
    });

    useEffect(() => {
        if (products) {
            localStorage.removeItem("access_token");
        }
    }, [products]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.id]: e.target.value });
    };

    const getPrice = (plan: "standard" | "plus") => {
        if (!total_price) return "0.00";
        let base = parseFloat(total_price);
        if (plan === "plus") base += 150;
        if (billingCycle === "quarterly") base = base * 3 * 0.90;
        return base.toFixed(2);
    };

    // --- LÓGICA DE CEP AUTOMÁTICO ---
    const handleCepBlur = async () => {
        const cep = formData.cep.replace(/\D/g, '');
        if (cep.length === 8) {
            try {
                const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
                const data = await res.json();
                if (!data.erro) {
                    setFormData(prev => ({
                        ...prev,
                        address: data.logradouro,
                        neighborhood: data.bairro,
                        city: data.localidade,
                        state: data.uf
                    }));
                }
            } catch (error) {
                console.log("Erro ao buscar CEP");
            }
        }
    };

    // --- FINALIZAR COMPRA (CARTÃO OU PIX) ---
    const handleFinalizeCheckout = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            // 1. Validações Gerais
            if (formData.password.length < 6) throw new Error("Senha muito curta.");
            if (formData.password !== formData.confirmPassword) throw new Error("As senhas não conferem.");

            let payload: any = {
                // Dados Cadastro
                full_name: formData.full_name,
                email: formData.email,
                password: formData.password,
                cpf: formData.cpf,

                // Dados Endereço
                address_data: {
                    cep: formData.cep,
                    street: formData.address,
                    number: formData.number,
                    neighborhood: formData.neighborhood,
                    complement: formData.complement,
                    city: formData.city,
                    state: formData.state
                },

                // Dados Quiz
                questionnaire_data: answers || {},

                // Dados Pedido
                plan_id: selectedPlan,
                billing_cycle: billingCycle,
                total_price: getPrice(selectedPlan), // Envia valor calculado atualizado
                products: products || []
            };

            // 2. Lógica Específica por Método
            if (paymentType === 'credit_card') {
                const mpKey = import.meta.env.VITE_MERCADO_PAGO_PUBLIC_KEY;
                // @ts-ignore
                const mp = new window.MercadoPago(mpKey);

                try {
                    const cardToken = await mp.createCardToken({
                        cardNumber: formData.cardNumber.replace(/\s/g, ""),
                        cardholderName: formData.cardName,
                        cardExpirationMonth: formData.cardMonth,
                        cardExpirationYear: "20" + formData.cardYear,
                        securityCode: formData.cardCvv,
                        identificationType: "CPF",
                        identificationNumber: formData.cpf.replace(/\D/g, "")
                    });

                    payload.token = cardToken.id;
                    // Detecta Bandeira simples
                    const firstDigit = formData.cardNumber.replace(/\s/g, "")[0];
                    payload.payment_method_id = firstDigit === "5" ? "master" : "visa";

                } catch (err) {
                    throw new Error("Dados do cartão inválidos. Verifique os números.");
                }
            } else {
                // PIX
                payload.payment_method_id = 'pix';
            }

            console.log("🚀 Enviando pedido...", payload);
            const response = await api.post("/financial/purchase/", payload);

            // 3. Tratamento de Sucesso
            if (response.data.status === "success" || response.status === 201) {
                // Se for PIX, o backend retorna pix_data
                if (paymentType === 'pix' && response.data.pix_data) {
                    setPixResult(response.data.pix_data);
                    toast({ title: "QR Code Gerado", description: "Escaneie para pagar." });
                } else {
                    // Cartão (Aprovado direto)
                    localStorage.setItem("access_token", response.data.access);
                    toast({ title: "Bem-vindo!", description: "Compra aprovada com sucesso." });
                    navigate("/pagamento/sucesso");
                }
            }

        } catch (error: any) {
            console.error(error);
            const msg = error.response?.data?.detail || error.response?.data?.error || error.message || "Erro ao processar.";

            if (error.response?.data?.email) {
                toast({ variant: "destructive", title: "Erro", description: "Este e-mail já está cadastrado." });
            } else {
                toast({ variant: "destructive", title: "Pagamento Recusado", description: msg });
            }
        } finally {
            setLoading(false);
        }
    };

    const copyPixCode = () => {
        if (pixResult?.qr_code) {
            navigator.clipboard.writeText(pixResult.qr_code);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
            toast({ description: "Código copiado!" });
        }
    };

    // --- TELA DO QR CODE (Renderização Condicional) ---
    if (pixResult) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
                <Card className="w-full max-w-md text-center shadow-xl animate-in zoom-in-95">
                    <CardHeader>
                        <div className="mx-auto bg-green-100 p-3 rounded-full mb-2">
                            <QrCode className="h-8 w-8 text-green-700" />
                        </div>
                        <CardTitle>Pagamento via PIX</CardTitle>
                        <CardDescription>Escaneie o QR Code abaixo para finalizar.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="border-2 border-green-500 rounded-lg p-2 inline-block">
                            <img
                                src={`data:image/png;base64,${pixResult.qr_code_base64}`}
                                alt="QR Code PIX"
                                className="w-64 h-64 object-contain"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label className="text-xs uppercase text-gray-500 font-bold">Pix Copia e Cola</Label>
                            <div className="flex gap-2">
                                <Input readOnly value={pixResult.qr_code} className="bg-gray-50 text-xs font-mono" />
                                <Button size="icon" onClick={copyPixCode}>
                                    {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                                </Button>
                            </div>
                        </div>

                        <div className="bg-blue-50 p-3 rounded-md text-sm text-blue-800">
                            Após o pagamento, sua conta será liberada automaticamente em alguns instantes.
                        </div>
                    </CardContent>
                    <CardFooter>
                        <Button className="w-full" onClick={() => window.location.href = "/login"}>
                            Já realizei o pagamento
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        );
    }

    // --- TELA DE SELEÇÃO DE PLANO (STEP 1) ---
    if (step === 1) {
        return (
            <div className="min-h-screen bg-gray-50 py-12 px-4">
                <div className="max-w-5xl mx-auto space-y-8">
                    <div className="text-center">
                        <h1 className="text-3xl font-bold">Escolha seu Plano</h1>
                        <p className="text-gray-600">Selecione a melhor opção para o seu tratamento.</p>
                    </div>
                    <div className="flex justify-center gap-4 mb-8">
                        <Button variant={billingCycle === "monthly" ? "default" : "outline"} onClick={() => setBillingCycle("monthly")}>Mensal</Button>
                        <Button variant={billingCycle === "quarterly" ? "default" : "outline"} onClick={() => setBillingCycle("quarterly")}>Trimestral (-10%)</Button>
                    </div>
                    <div className="grid md:grid-cols-2 gap-8">
                        {/* CARD STANDARD */}
                        <Card className={`cursor-pointer transition-all hover:shadow-lg ${selectedPlan === 'standard' ? 'border-2 border-blue-600 shadow-xl ring-1 ring-blue-600' : ''}`} onClick={() => setSelectedPlan("standard")}>
                            <CardHeader><CardTitle>Standard</CardTitle><CardDescription>Apenas Medicamentos</CardDescription></CardHeader>
                            <CardContent><p className="text-3xl font-bold">R$ {getPrice("standard")}</p></CardContent>
                            <CardFooter><Button className="w-full" variant={selectedPlan === 'standard' ? "default" : "outline"} onClick={() => { setSelectedPlan("standard"); setStep(2); }}>Selecionar</Button></CardFooter>
                        </Card>
                        {/* CARD PLUS */}
                        <Card className={`cursor-pointer transition-all hover:shadow-lg ${selectedPlan === 'plus' ? 'border-2 border-green-600 shadow-xl ring-1 ring-green-600' : ''}`} onClick={() => setSelectedPlan("plus")}>
                            <CardHeader>
                                <div className="flex justify-between items-center">
                                    <CardTitle>Plus</CardTitle>
                                    <span className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded-full font-bold">RECOMENDADO</span>
                                </div>
                                <CardDescription>Medicamentos + Acompanhamento Médico</CardDescription>
                            </CardHeader>
                            <CardContent><p className="text-3xl font-bold">R$ {getPrice("plus")}</p></CardContent>
                            <CardFooter><Button className="w-full bg-green-600 hover:bg-green-700 text-white" onClick={() => { setSelectedPlan("plus"); setStep(2); }}>Selecionar</Button></CardFooter>
                        </Card>
                    </div>
                </div>
            </div>
        );
    }

    // --- TELA DE CHECKOUT (STEP 2) ---
    return (
        <div className="min-h-screen bg-gray-50 py-8 px-4">
            <div className="max-w-3xl mx-auto">
                <Button variant="ghost" onClick={() => setStep(1)} className="mb-4 text-gray-500 hover:text-gray-900"><ArrowLeft className="mr-2 h-4 w-4" /> Voltar aos Planos</Button>

                <Card className="border-t-4 border-t-green-600 shadow-lg animate-in slide-in-from-bottom-4">
                    <CardHeader className="bg-gray-50/50 border-b pb-6">
                        <div className="flex justify-between items-start">
                            <div>
                                <CardTitle className="flex items-center gap-2 text-xl"><Lock className="w-5 h-5 text-green-600" /> Finalizar Compra</CardTitle>
                                <CardDescription className="mt-1">Preencha seus dados para liberar o acesso.</CardDescription>
                            </div>
                            <div className="text-right">
                                <p className="text-sm text-gray-500">Total a pagar</p>
                                <p className="text-2xl font-bold text-green-700">R$ {getPrice(selectedPlan)}</p>
                                <span className="text-xs text-gray-400 uppercase font-semibold">{selectedPlan} - {billingCycle === 'monthly' ? 'Mensal' : 'Trimestral'}</span>
                            </div>
                        </div>
                    </CardHeader>

                    <CardContent className="pt-6">
                        <form onSubmit={handleFinalizeCheckout} className="space-y-8">

                            {/* 1. DADOS PESSOAIS */}
                            <div className="space-y-4">
                                <h3 className="text-md font-semibold flex items-center gap-2 text-gray-700"><User className="w-4 h-4" /> Dados Pessoais</h3>
                                <div className="grid md:grid-cols-2 gap-4">
                                    <div className="space-y-2"><Label>Nome Completo</Label><Input id="full_name" value={formData.full_name} onChange={handleInputChange} required /></div>
                                    <div className="space-y-2"><Label>CPF</Label><Input id="cpf" placeholder="000.000.000-00" value={formData.cpf} onChange={handleInputChange} required /></div>
                                    <div className="space-y-2 md:col-span-2"><Label>E-mail</Label><Input id="email" type="email" value={formData.email} onChange={handleInputChange} required /></div>
                                    <div className="space-y-2"><Label>Senha</Label><Input id="password" type="password" value={formData.password} onChange={handleInputChange} required /></div>
                                    <div className="space-y-2"><Label>Confirmar Senha</Label><Input id="confirmPassword" type="password" value={formData.confirmPassword} onChange={handleInputChange} required /></div>
                                </div>
                            </div>

                            <hr className="border-gray-100" />

                            {/* 2. ENDEREÇO */}
                            <div className="space-y-4">
                                <h3 className="text-md font-semibold flex items-center gap-2 text-gray-700"><MapPin className="w-4 h-4" /> Endereço de Entrega</h3>
                                <div className="grid grid-cols-4 gap-4">
                                    <div className="col-span-1 space-y-2">
                                        <Label>CEP</Label>
                                        <Input id="cep" placeholder="00000-000" value={formData.cep} onChange={handleInputChange} onBlur={handleCepBlur} required />
                                    </div>
                                    <div className="col-span-3 space-y-2">
                                        <Label>Rua</Label>
                                        <Input id="address" value={formData.address} onChange={handleInputChange} required />
                                    </div>
                                    <div className="col-span-1 space-y-2">
                                        <Label>Número</Label>
                                        <Input id="number" value={formData.number} onChange={handleInputChange} required />
                                    </div>
                                    <div className="col-span-3 space-y-2">
                                        <Label>Bairro</Label>
                                        <Input id="neighborhood" value={formData.neighborhood} onChange={handleInputChange} required />
                                    </div>
                                    <div className="col-span-2 space-y-2">
                                        <Label>Cidade</Label>
                                        <Input id="city" value={formData.city} onChange={handleInputChange} required />
                                    </div>
                                    <div className="col-span-1 space-y-2">
                                        <Label>UF</Label>
                                        <Input id="state" value={formData.state} maxLength={2} onChange={handleInputChange} required />
                                    </div>
                                    <div className="col-span-1 space-y-2">
                                        <Label>Comp.</Label>
                                        <Input id="complement" placeholder="Apto..." value={formData.complement} onChange={handleInputChange} />
                                    </div>
                                </div>
                            </div>

                            <hr className="border-gray-100" />

                            {/* 3. PAGAMENTO (COM ABAS) */}
                            <div className="space-y-4">
                                <h3 className="text-md font-semibold flex items-center gap-2 text-gray-700"><CreditCard className="w-4 h-4" /> Método de Pagamento</h3>

                                {/* SELETOR DE TIPO */}
                                <div className="grid grid-cols-2 gap-2 bg-gray-100 p-1 rounded-lg">
                                    <button
                                        type="button"
                                        onClick={() => setPaymentType('credit_card')}
                                        className={`py-2 text-sm font-medium rounded-md transition-all flex items-center justify-center gap-2 ${paymentType === 'credit_card' ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:text-gray-900'}`}
                                    >
                                        <CreditCard className="w-4 h-4" /> Cartão de Crédito
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setPaymentType('pix')}
                                        className={`py-2 text-sm font-medium rounded-md transition-all flex items-center justify-center gap-2 ${paymentType === 'pix' ? 'bg-white shadow text-green-600' : 'text-gray-500 hover:text-gray-900'}`}
                                    >
                                        <QrCode className="w-4 h-4" /> PIX
                                    </button>
                                </div>

                                {/* CONTEÚDO DO PAGAMENTO */}
                                <div className="bg-gray-50 p-5 rounded-lg border border-gray-200">
                                    {paymentType === 'credit_card' ? (
                                        <div className="space-y-4 animate-in fade-in slide-in-from-left-2">
                                            <div className="space-y-2"><Label>Número do Cartão</Label><Input id="cardNumber" placeholder="0000 0000 0000 0000" value={formData.cardNumber} onChange={handleInputChange} required /></div>
                                            <div className="space-y-2"><Label>Nome no Cartão</Label><Input id="cardName" placeholder="Como impresso no cartão" value={formData.cardName} onChange={handleInputChange} required /></div>
                                            <div className="grid grid-cols-3 gap-4">
                                                <div className="space-y-2"><Label>Mês</Label><Input id="cardMonth" placeholder="MM" maxLength={2} value={formData.cardMonth} onChange={handleInputChange} required /></div>
                                                <div className="space-y-2"><Label>Ano</Label><Input id="cardYear" placeholder="AA" maxLength={2} value={formData.cardYear} onChange={handleInputChange} required /></div>
                                                <div className="space-y-2"><Label>CVV</Label><Input id="cardCvv" placeholder="123" maxLength={4} value={formData.cardCvv} onChange={handleInputChange} required /></div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="text-center space-y-4 py-4 animate-in fade-in slide-in-from-right-2">
                                            <div className="bg-white p-3 rounded-full inline-block shadow-sm">
                                                <QrCode className="h-8 w-8 text-green-600" />
                                            </div>
                                            <div>
                                                <h4 className="font-semibold text-gray-900">Pagamento Instantâneo</h4>
                                                <p className="text-sm text-gray-500">Gere um QR Code e pague pelo app do seu banco. Aprovação imediata.</p>
                                            </div>
                                            <div className="bg-green-50 text-green-800 text-sm font-medium py-2 px-4 rounded-md inline-block">
                                                Total: R$ {getPrice(selectedPlan)}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* BOTÃO DE AÇÃO */}
                            <Button type="submit" className={`w-full h-12 text-lg shadow-md transition-all ${paymentType === 'pix' ? 'bg-green-600 hover:bg-green-700' : 'bg-blue-600 hover:bg-blue-700'}`} disabled={loading}>
                                {loading ? <Loader2 className="animate-spin mr-2" /> : paymentType === 'pix' ? 'Gerar PIX e Finalizar' : `Pagar R$ ${getPrice(selectedPlan)}`}
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default PlanSelection;