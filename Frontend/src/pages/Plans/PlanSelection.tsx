import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle, Loader2, CreditCard, MapPin, User, ArrowLeft, Lock } from "lucide-react";
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

    // --- LÓGICA DE CEP AUTOMÁTICO (Opcional, mas melhora UX) ---
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

    const handleFinalizeCheckout = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            // 1. Validações Locais
            if (formData.password.length < 6) throw new Error("Senha muito curta.");
            if (formData.password !== formData.confirmPassword) throw new Error("As senhas não conferem.");

            const mpKey = import.meta.env.VITE_MERCADO_PAGO_PUBLIC_KEY;

            // 2. Gera Token do Cartão
            // @ts-ignore
            const mp = new window.MercadoPago(mpKey);
            let cardToken;
            try {
                cardToken = await mp.createCardToken({
                    cardNumber: formData.cardNumber.replace(/\s/g, ""),
                    cardholderName: formData.cardName,
                    cardExpirationMonth: formData.cardMonth,
                    cardExpirationYear: "20" + formData.cardYear,
                    securityCode: formData.cardCvv,
                    identificationType: "CPF",
                    identificationNumber: formData.cpf.replace(/\D/g, "")
                });
            } catch (err) {
                throw new Error("Dados do cartão inválidos. Verifique os números.");
            }

            // 3. Detecta Bandeira
            const firstDigit = formData.cardNumber.replace(/\s/g, "")[0];
            const detectedMethod = firstDigit === "5" ? "master" : "visa";

            // 4. CHAMADA ÚNICA AO BACKEND (Super Rota)
            // Enviamos TUDO: Cadastro, Endereço, Respostas e Dados de Pagamento
            const payload = {
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

                // Dados Pagamento
                token: cardToken.id,
                payment_method_id: detectedMethod,
                plan_id: selectedPlan,
                billing_cycle: billingCycle,
                total_price: total_price,
                products: products || []
            };

            console.log("🚀 Enviando pedido completo...");
            const response = await api.post("/financial/purchase/", payload);

            // 5. Sucesso
            if (response.data.status === "success") {
                // Salva token para logar o usuário automaticamente
                localStorage.setItem("access_token", response.data.access);
                toast({ title: "Bem-vindo!", description: "Compra aprovada com sucesso." });
                navigate("/pagamento/sucesso");
            }

        } catch (error: any) {
            console.error(error);
            const msg = error.response?.data?.detail || error.response?.data?.error || "Erro ao processar.";

            // Tratamento especial para erros de validação (ex: email já existe)
            if (error.response?.data?.email) {
                toast({ variant: "destructive", title: "Erro", description: "Este e-mail já está cadastrado." });
            } else {
                toast({ variant: "destructive", title: "Pagamento Recusado", description: msg });
            }
        } finally {
            setLoading(false);
        }
    };

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
                        <Card className={`cursor-pointer ${selectedPlan === 'standard' ? 'border-2 border-blue-600 shadow-xl' : ''}`} onClick={() => setSelectedPlan("standard")}>
                            <CardHeader><CardTitle>Standard</CardTitle><CardDescription>Apenas Medicamentos</CardDescription></CardHeader>
                            <CardContent><p className="text-3xl font-bold">R$ {getPrice("standard")}</p></CardContent>
                            <CardFooter><Button className="w-full" variant="outline" onClick={() => { setSelectedPlan("standard"); setStep(2); }}>Selecionar</Button></CardFooter>
                        </Card>
                        {/* CARD PLUS */}
                        <Card className={`cursor-pointer ${selectedPlan === 'plus' ? 'border-2 border-green-600 shadow-xl' : ''}`} onClick={() => setSelectedPlan("plus")}>
                            <CardHeader><CardTitle>Plus</CardTitle><CardDescription>Medicamentos + Médico</CardDescription></CardHeader>
                            <CardContent><p className="text-3xl font-bold">R$ {getPrice("plus")}</p></CardContent>
                            <CardFooter><Button className="w-full bg-green-600 hover:bg-green-700" onClick={() => { setSelectedPlan("plus"); setStep(2); }}>Selecionar</Button></CardFooter>
                        </Card>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 py-8 px-4">
            <div className="max-w-3xl mx-auto">
                <Button variant="ghost" onClick={() => setStep(1)} className="mb-4"><ArrowLeft className="mr-2 h-4 w-4" /> Voltar</Button>
                <Card className="border-t-4 border-t-green-600 shadow-lg">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Lock className="w-6 h-6 text-green-600" /> Finalizar Compra</CardTitle>
                        <CardDescription>Plano: <strong>{selectedPlan.toUpperCase()}</strong> | Total: <strong>R$ {getPrice(selectedPlan)}</strong></CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleFinalizeCheckout} className="space-y-8">
                            {/* DADOS PESSOAIS */}
                            <div className="space-y-4">
                                <h3 className="text-lg font-semibold flex items-center gap-2"><User className="w-5 h-5" /> Seus Dados</h3>
                                <div className="grid md:grid-cols-2 gap-4">
                                    <div className="space-y-2"><Label>Nome Completo</Label><Input id="full_name" onChange={handleInputChange} required /></div>
                                    <div className="space-y-2"><Label>CPF</Label><Input id="cpf" placeholder="000.000.000-00" onChange={handleInputChange} required /></div>
                                    <div className="space-y-2 md:col-span-2"><Label>E-mail</Label><Input id="email" type="email" onChange={handleInputChange} required /></div>
                                    <div className="space-y-2"><Label>Senha</Label><Input id="password" type="password" onChange={handleInputChange} required /></div>
                                    <div className="space-y-2"><Label>Confirmar Senha</Label><Input id="confirmPassword" type="password" onChange={handleInputChange} required /></div>
                                </div>
                            </div>
                            <hr />
                            {/* ENDEREÇO COMPLETO */}
                            <div className="space-y-4">
                                <h3 className="text-lg font-semibold flex items-center gap-2"><MapPin className="w-5 h-5" /> Endereço de Entrega</h3>
                                <div className="grid grid-cols-4 gap-4">
                                    <div className="col-span-1 space-y-2">
                                        <Label>CEP</Label>
                                        <Input id="cep" placeholder="00000-000" onChange={handleInputChange} onBlur={handleCepBlur} required />
                                    </div>
                                    <div className="col-span-2 space-y-2">
                                        <Label>Rua</Label>
                                        <Input id="address" value={formData.address} onChange={handleInputChange} required />
                                    </div>
                                    <div className="col-span-1 space-y-2">
                                        <Label>Número</Label>
                                        <Input id="number" onChange={handleInputChange} required />
                                    </div>
                                    <div className="col-span-2 space-y-2">
                                        <Label>Bairro</Label>
                                        <Input id="neighborhood" value={formData.neighborhood} onChange={handleInputChange} required />
                                    </div>
                                    <div className="col-span-2 space-y-2">
                                        <Label>Complemento</Label>
                                        <Input id="complement" placeholder="Apto, Bloco..." onChange={handleInputChange} />
                                    </div>
                                    <div className="col-span-3 space-y-2">
                                        <Label>Cidade</Label>
                                        <Input id="city" value={formData.city} onChange={handleInputChange} required />
                                    </div>
                                    <div className="col-span-1 space-y-2">
                                        <Label>UF</Label>
                                        <Input id="state" value={formData.state} maxLength={2} onChange={handleInputChange} required />
                                    </div>
                                </div>
                            </div>
                            <hr />
                            {/* PAGAMENTO */}
                            <div className="space-y-4">
                                <h3 className="text-lg font-semibold flex items-center gap-2"><CreditCard className="w-5 h-5" /> Pagamento</h3>
                                <div className="space-y-4 bg-gray-50 p-4 rounded-md border">
                                    <div className="space-y-2"><Label>Número do Cartão</Label><Input id="cardNumber" placeholder="0000 0000 0000 0000" onChange={handleInputChange} required /></div>
                                    <div className="space-y-2"><Label>Nome no Cartão</Label><Input id="cardName" onChange={handleInputChange} required /></div>
                                    <div className="grid grid-cols-3 gap-4">
                                        <div className="space-y-2"><Label>Mês</Label><Input id="cardMonth" placeholder="MM" maxLength={2} onChange={handleInputChange} required /></div>
                                        <div className="space-y-2"><Label>Ano</Label><Input id="cardYear" placeholder="AA" maxLength={2} onChange={handleInputChange} required /></div>
                                        <div className="space-y-2"><Label>CVV</Label><Input id="cardCvv" placeholder="123" maxLength={4} onChange={handleInputChange} required /></div>
                                    </div>
                                </div>
                            </div>
                            <Button type="submit" className="w-full h-12 text-lg bg-green-600 hover:bg-green-700" disabled={loading}>
                                {loading ? <Loader2 className="animate-spin mr-2" /> : `Pagar e Finalizar (R$ ${getPrice(selectedPlan)})`}
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default PlanSelection;