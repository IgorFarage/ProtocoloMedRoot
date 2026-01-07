import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, CreditCard, MapPin, User, ArrowLeft, Lock, QrCode, Copy, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/auth/AuthProvider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";

const PlanSelection = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { toast } = useToast();
    const { loginWithToken } = useAuth();

    // --- LÓGICA DE RECUPERAÇÃO DE DADOS (Blindagem) ---
    const getStateOrLocal = (key: string) => {
        // 1. Tenta pegar do state da navegação
        if (location.state && location.state[key]) {
            return location.state[key];
        }
        // 2. Se falhar, tenta pegar do localStorage (Backup)
        const local = localStorage.getItem(`checkout_${key}`);
        if (local) {
            try { return JSON.parse(local); } catch (e) { return null; }
        }
        return null;
    };

    const products = getStateOrLocal('products');
    const total_price = getStateOrLocal('total_price');
    const answers = getStateOrLocal('answers');

    // Debug no Console do Navegador
    useEffect(() => {
        console.log("📍 [DEBUG FRONTEND] Dados recuperados:");
        console.log(" - Products:", products ? products.length : 0);
        console.log(" - Answers:", answers ? Object.keys(answers).length : 0);

        if (!answers || Object.keys(answers).length === 0) {
            console.warn("⚠️ ALERTA: Respostas vazias! O JSON não será gerado.");
        }
    }, [products, answers]);

    // --- LÓGICA DE STEPS (Multistep) ---
    // 1 (Plan Selection) -> 2 (Checkout: Register) -> 3 (Checkout: Address) -> 4 (Checkout: Payment)
    // OBS: O código original usava 'step' como 1 (Selecao) e 2 (Checkout Unico).
    // Vamos remapear para: 
    // 0: Selecao de Plano
    // 1: Cadastro (Dados Pessoais)
    // 2: Endereço
    // 3: Pagamento

    const [currentStep, setCurrentStep] = useState<0 | 1 | 2 | 3>(0);
    const [acceptedTerms, setAcceptedTerms] = useState(false);
    const [acceptedContract, setAcceptedContract] = useState(false);
    // Verifica login ao carregar
    useEffect(() => {
        const token = localStorage.getItem("access_token");
        if (token && currentStep === 1) {
            // Se já tem token e estava no cadastro, pula para endereço
            setCurrentStep(2);
        }
    }, [currentStep]);


    const [selectedPlan, setSelectedPlan] = useState<"standard" | "plus">("plus");
    const [billingCycle, setBillingCycle] = useState<"monthly" | "quarterly">("monthly");
    const [loading, setLoading] = useState(false);

    const [formData, setFormData] = useState({
        full_name: "", email: "", phone: "", password: "", confirmPassword: "", cpf: "",
        cep: "", address: "", number: "", neighborhood: "", complement: "", city: "", state: "",
        cardName: "", cardNumber: "", cardMonth: "", cardYear: "", cardCvv: ""
    });

    useEffect(() => {
        if (products) localStorage.removeItem("access_token");
    }, [products]);

    const formatCPF = (value: string) => {
        return value
            .replace(/\D/g, '')
            .replace(/(\d{3})(\d)/, '$1.$2')
            .replace(/(\d{3})(\d)/, '$1.$2')
            .replace(/(\d{3})(\d{1,2})/, '$1-$2')
            .replace(/(-\d{2})\d+?$/, '$1');
    };

    const formatPhone = (value: string) => {
        value = value.replace(/\D/g, "");
        value = value.replace(/^(\d{2})(\d)/g, "($1) $2");
        value = value.replace(/(\d)(\d{4})$/, "$1-$2");
        return value;
    };

    const formatCEP = (value: string) => {
        return value
            .replace(/\D/g, '')
            .replace(/^(\d{5})(\d)/, '$1-$2')
            .replace(/(-\d{3})\d+?$/, '$1');
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let value = e.target.value;
        if (e.target.id === 'cpf') value = formatCPF(value);
        if (e.target.id === 'phone') value = formatPhone(value);
        if (e.target.id === 'cep') value = formatCEP(value);

        setFormData({ ...formData, [e.target.id]: value });
    };

    const getPrice = (plan: "standard" | "plus") => {
        if (!total_price) return "0.00";
        let base = parseFloat(total_price);
        if (plan === "plus") base += 150;
        if (billingCycle === "quarterly") base = base * 3 * 0.90;
        return base.toFixed(2);
    };

    const handleCepBlur = async () => {
        const cep = formData.cep.replace(/\D/g, '');
        if (cep.length === 8) {
            try {
                const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
                const data = await res.json();
                if (!data.erro) {
                    setFormData(prev => ({
                        ...prev, address: data.logradouro, neighborhood: data.bairro, city: data.localidade, state: data.uf
                    }));
                }
            } catch (error) { console.log("Erro CEP"); }
        }
    };


    // --- FUNÇÕES DE HANDLER POR ETAPA ---

    // Etapa 1: Criar Conta
    const handleCreateAccount = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            if (formData.password.length < 6) throw new Error("Senha muito curta.");
            if (formData.password !== formData.confirmPassword) throw new Error("As senhas não conferem.");

            // Chama /register apenas com dados básicos
            const payload = {
                full_name: formData.full_name,
                email: formData.email,
                phone: formData.phone,
                password: formData.password,
                // questionnaire_data: answers // Enviamos respostas no cadastro inicial para garantir vínculo
                // Mas wait! Se enviarmos agora, cria Lead. Ok.
                questionnaire_data: answers
            };

            const res = await api.post("/accounts/register/", payload);

            if (res.status === 201) {
                // Sucesso! Tenta logar automaticamente ou pega o token se vier (RegisterView nao retorna token padrao JWT, mas vamos supor q sim ou fazer login)
                // A RegisterView do django nao retorna token JWT nativamente a menos que tenhamos alterado.
                // Vamos forçar login.
                const loginRes = await api.post("/accounts/login/", { email: formData.email, password: formData.password });
                loginWithToken(loginRes.data.access, loginRes.data.user); // Salva no Context e LocalStorage

                toast({ title: "Conta Criada!", description: "Dados salvos com sucesso." });
                setCurrentStep(2); // Avança
            }

        } catch (error: any) {
            console.error(error);
            const msg = error.response?.data?.email ? "E-mail já cadastrado." : "Erro ao criar conta.";
            toast({ variant: "destructive", title: "Erro", description: msg });
        } finally {
            setLoading(false);
        }
    };

    // Etapa 2: Salvar Endereço
    const handleSaveAddress = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const payload = {
                address_data: {
                    cep: formData.cep, street: formData.address, number: formData.number,
                    neighborhood: formData.neighborhood, complement: formData.complement,
                    city: formData.city, state: formData.state
                }
            };

            await api.post("/accounts/update_address/", payload);
            toast({ title: "Endereço Salvo!", description: "Vamos para o pagamento." });
            setCurrentStep(3); // Avança

        } catch (error) {
            console.error(error);
            toast({ variant: "destructive", title: "Erro", description: "Falha ao salvar endereço." });
        } finally {
            setLoading(false);
        }
    };

    // Etapa 3: Pagamento (Reutiliza lógica mas ajustada)
    const handleFinalizePayment = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        // Validação final de segurança
        if (!answers || Object.keys(answers).length === 0) {
            toast({ variant: "destructive", title: "Erro", description: "Dados do questionário perdidos. Refaça o quiz." });
            setLoading(false);
            return;
        }

        try {
            let payload: any = {
                // Enviamos dados básicos caso precise (mas backend usa user logado)
                plan_id: selectedPlan,
                billing_cycle: billingCycle,
                total_price: getPrice(selectedPlan),
                products: products || [],
                cpf: formData.cpf, // Importante para o Pagamento
                phone: formData.phone // Update contact
            };

            const mpKey = import.meta.env.VITE_MERCADO_PAGO_PUBLIC_KEY;
            console.log("🔑 Frontend Public Key:", mpKey);
            // @ts-ignore
            const mp = new window.MercadoPago(mpKey);

            // ... (Lógica de Tokenização Mantida) ...
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
                payload.installments = 1;

                const bin = formData.cardNumber.replace(/\s/g, "").substring(0, 6);
                try {
                    const paymentMethodsHelper = await mp.getPaymentMethods({ bin });
                    if (paymentMethodsHelper.results && paymentMethodsHelper.results.length > 0) {
                        payload.payment_method_id = paymentMethodsHelper.results[0].id;
                    } else {
                        const firstDigit = formData.cardNumber.replace(/\s/g, "")[0];
                        payload.payment_method_id = firstDigit === "5" ? "master" : "visa";
                    }
                } catch (e) {
                    const firstDigit = formData.cardNumber.replace(/\s/g, "")[0];
                    payload.payment_method_id = firstDigit === "5" ? "master" : "visa";
                }
            } catch (err) {
                throw new Error("Dados do cartão inválidos.");
            }

            const response = await api.post("/financial/purchase/", payload);

            if (response.data.status === "success" || response.status === 201) {
                // Limpa o localStorage após sucesso
                localStorage.removeItem('checkout_answers');
                localStorage.removeItem('checkout_products');
                localStorage.removeItem('checkout_total_price');

                const status = response.data.payment_status || response.data.status;

                if (status === 'in_process') {
                    navigate("/pagamento/pendente", {
                        state: {
                            price: getPrice(selectedPlan),
                            status: status
                        }
                    });
                } else {
                    // Atualiza Context com User atualizado se vier
                    // loginWithToken(response.data.access, response.data.user); 
                    navigate("/pagamento/sucesso", {
                        state: {
                            orderId: response.data.order_id,
                            status: response.data.payment_status || response.data.status
                        }
                    });
                }
            }

        } catch (error: any) {
            console.error(error);
            const msg = error.response?.data?.detail || error.response?.data?.error || error.message;
            toast({ variant: "destructive", title: "Erro no Pagamento", description: msg });
        } finally {
            setLoading(false);
        }
    }


    if (currentStep === 0) {
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
                        <Card className={`cursor-pointer hover:shadow-lg ${selectedPlan === 'standard' ? 'border-2 border-blue-600 shadow-xl' : ''}`} onClick={() => setSelectedPlan("standard")}>
                            <CardHeader><CardTitle>Standard</CardTitle><CardDescription>Apenas Medicamentos</CardDescription></CardHeader>
                            <CardContent><p className="text-3xl font-bold">R$ {getPrice("standard")}</p></CardContent>
                            <CardFooter><Button className="w-full" variant={selectedPlan === 'standard' ? "default" : "outline"} onClick={() => { setSelectedPlan("standard"); setCurrentStep(1); }}>Selecionar</Button></CardFooter>
                        </Card>
                        <Card className={`cursor-pointer hover:shadow-lg ${selectedPlan === 'plus' ? 'border-2 border-green-600 shadow-xl' : ''}`} onClick={() => setSelectedPlan("plus")}>
                            <CardHeader><CardTitle>Plus</CardTitle><CardDescription>Medicamentos + Médico</CardDescription></CardHeader>
                            <CardContent><p className="text-3xl font-bold">R$ {getPrice("plus")}</p></CardContent>
                            <CardFooter><Button className="w-full bg-green-600 hover:bg-green-700" onClick={() => { setSelectedPlan("plus"); setCurrentStep(1); }}>Selecionar</Button></CardFooter>
                        </Card>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 py-8 px-4">
            <div className="max-w-3xl mx-auto">
                <Button variant="ghost" onClick={() => setCurrentStep(currentStep - 1 as any)} className="mb-4" disabled={currentStep === 1}><ArrowLeft className="mr-2 h-4 w-4" /> Voltar</Button>

                {/* Visualizador de Passos */}
                <div className="flex justify-between mb-8 px-8">
                    <div className={`flex flex-col items-center ${currentStep >= 1 ? 'text-green-600' : 'text-gray-400'}`}>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 mb-2 ${currentStep >= 1 ? 'border-green-600 bg-green-100' : 'border-gray-300'}`}>1</div>
                        <span className="text-xs font-medium">Dados</span>
                    </div>
                    <div className={`flex-1 h-0.5 mt-4 mx-2 ${currentStep >= 2 ? 'bg-green-600' : 'bg-gray-300'}`}></div>
                    <div className={`flex flex-col items-center ${currentStep >= 2 ? 'text-green-600' : 'text-gray-400'}`}>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 mb-2 ${currentStep >= 2 ? 'border-green-600 bg-green-100' : 'border-gray-300'}`}>2</div>
                        <span className="text-xs font-medium">Endereço</span>
                    </div>
                    <div className={`flex-1 h-0.5 mt-4 mx-2 ${currentStep >= 3 ? 'bg-green-600' : 'bg-gray-300'}`}></div>
                    <div className={`flex flex-col items-center ${currentStep >= 3 ? 'text-green-600' : 'text-gray-400'}`}>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 mb-2 ${currentStep >= 3 ? 'border-green-600 bg-green-100' : 'border-gray-300'}`}>3</div>
                        <span className="text-xs font-medium">Pagamento</span>
                    </div>
                </div>


                <Card className="border-t-4 border-t-green-600 shadow-lg">
                    <CardHeader className="bg-gray-50/50 border-b pb-6">
                        <div className="flex justify-between items-start">
                            <div><CardTitle className="flex items-center gap-2"><Lock className="w-5 h-5 text-green-600" /> Finalizar Compra</CardTitle><CardDescription>Dados seguros.</CardDescription></div>
                            <div className="text-right"><p className="text-sm text-gray-500">Total</p><p className="text-2xl font-bold text-green-700">R$ {getPrice(selectedPlan)}</p></div>
                        </div>
                    </CardHeader>
                    <CardContent className="pt-6">

                        {/* STEP 1: DADOS PESSOAIS */}
                        {currentStep === 1 && (
                            <form onSubmit={handleCreateAccount} className="space-y-6">
                                <div className="space-y-4">
                                    <h3 className="text-md font-semibold flex items-center gap-2 text-gray-700"><User className="w-4 h-4" /> Criar Conta</h3>
                                    <div className="grid md:grid-cols-2 gap-4">
                                        <div className="space-y-2"><Label>Nome Completo</Label><Input id="full_name" value={formData.full_name} onChange={handleInputChange} required /></div>
                                        <div className="space-y-2"><Label>Celular</Label><Input id="phone" value={formData.phone} onChange={handleInputChange} required placeholder="(11) 99999-9999" maxLength={15} /></div>
                                        <div className="space-y-2 md:col-span-2"><Label>E-mail</Label><Input id="email" type="email" value={formData.email} onChange={handleInputChange} required /></div>
                                        <div className="space-y-2"><Label>Senha</Label><Input id="password" type="password" value={formData.password} onChange={handleInputChange} required /></div>
                                        <div className="space-y-2"><Label>Confirmar Senha</Label><Input id="confirmPassword" type="password" value={formData.confirmPassword} onChange={handleInputChange} required /></div>
                                    </div>
                                    <div className="space-y-4 pt-4 border-t">
                                        <div className="flex items-center space-x-2">
                                            <Checkbox
                                                id="terms"
                                                checked={acceptedTerms}
                                                onCheckedChange={(checked) => setAcceptedTerms(checked as boolean)}
                                            />
                                            <label htmlFor="terms" className="text-sm text-gray-700 leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                                Eu concordo com <a href="#" className="text-green-600 hover:underline">Termos & Condições</a> e com a <a href="#" className="text-green-600 hover:underline">Política de Privacidade</a> e <a href="#" className="text-green-600 hover:underline">Proteção de Dados</a>.
                                            </label>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <Checkbox
                                                id="contract"
                                                checked={acceptedContract}
                                                onCheckedChange={(checked) => setAcceptedContract(checked as boolean)}
                                            />
                                            <label htmlFor="contract" className="text-sm text-gray-700 leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                                Eu concordo com o <a href="#" className="text-green-600 hover:underline">Contrato de Prestação de Serviço da Protocolo Med</a>.
                                            </label>
                                        </div>
                                    </div>
                                </div>
                                <Button type="submit" className="w-full h-12 text-lg shadow-md" disabled={loading || !acceptedTerms || !acceptedContract}>
                                    {loading ? <Loader2 className="animate-spin mr-2" /> : "Continuar para Endereço"}
                                </Button>
                            </form>
                        )}

                        {/* STEP 2: ENDEREÇO */}
                        {currentStep === 2 && (
                            <form onSubmit={handleSaveAddress} className="space-y-6">
                                <div className="space-y-4">
                                    <h3 className="text-md font-semibold flex items-center gap-2 text-gray-700"><MapPin className="w-4 h-4" /> Endereço de Entrega</h3>
                                    <div className="grid grid-cols-4 gap-4">
                                        <div className="col-span-1 space-y-2"><Label>CEP</Label><Input id="cep" placeholder="00000-000" value={formData.cep} onChange={handleInputChange} onBlur={handleCepBlur} maxLength={9} required /></div>
                                        <div className="col-span-3 space-y-2"><Label>Rua</Label><Input id="address" value={formData.address} onChange={handleInputChange} required /></div>
                                        <div className="col-span-1 space-y-2"><Label>Número</Label><Input id="number" value={formData.number} onChange={handleInputChange} required /></div>
                                        <div className="col-span-3 space-y-2"><Label>Bairro</Label><Input id="neighborhood" value={formData.neighborhood} onChange={handleInputChange} required /></div>
                                        <div className="col-span-2 space-y-2"><Label>Cidade</Label><Input id="city" value={formData.city} onChange={handleInputChange} required /></div>
                                        <div className="col-span-1 space-y-2"><Label>UF</Label><Input id="state" value={formData.state} maxLength={2} onChange={handleInputChange} required /></div>
                                        <div className="col-span-1 space-y-2"><Label>Comp.</Label><Input id="complement" value={formData.complement} onChange={handleInputChange} /></div>
                                    </div>
                                </div>
                                <Button type="submit" className="w-full h-12 text-lg shadow-md" disabled={loading}>
                                    {loading ? <Loader2 className="animate-spin mr-2" /> : "Ir para Pagamento"}
                                </Button>
                            </form>
                        )}

                        {/* STEP 3: PAGAMENTO (CPF MUDOU PRA CA) */}
                        {currentStep === 3 && (
                            <form onSubmit={handleFinalizePayment} className="space-y-6">
                                <div className="space-y-4">
                                    <h3 className="text-md font-semibold flex items-center gap-2 text-gray-700"><CreditCard className="w-4 h-4" /> Pagamento</h3>
                                    <div className="space-y-2"><Label>CPF do Titular</Label><Input id="cpf" placeholder="000.000.000-00" value={formData.cpf} onChange={handleInputChange} maxLength={14} required /></div>

                                    <div className="bg-gray-50 p-5 rounded-lg border border-gray-200 mt-4">
                                        <div className="space-y-4 animate-in fade-in slide-in-from-left-2">
                                            <div className="space-y-2"><Label>Número do Cartão</Label><Input id="cardNumber" value={formData.cardNumber} onChange={handleInputChange} required maxLength={19} /></div>
                                            <div className="space-y-2"><Label>Nome no Cartão</Label><Input id="cardName" value={formData.cardName} onChange={handleInputChange} required /></div>
                                            <div className="grid grid-cols-3 gap-4">
                                                <div className="space-y-2"><Label>Mês</Label><Input id="cardMonth" placeholder="MM" maxLength={2} value={formData.cardMonth} onChange={handleInputChange} required /></div>
                                                <div className="space-y-2"><Label>Ano</Label><Input id="cardYear" placeholder="AA" maxLength={2} value={formData.cardYear} onChange={handleInputChange} required /></div>
                                                <div className="space-y-2"><Label>CVV</Label><Input id="cardCvv" maxLength={4} value={formData.cardCvv} onChange={handleInputChange} required type="password" /></div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <Button type="submit" className="w-full h-12 text-lg shadow-md bg-blue-600 hover:bg-blue-700" disabled={loading}>
                                    {loading ? <Loader2 className="animate-spin mr-2" /> : `Pagar R$ ${getPrice(selectedPlan)}`}
                                </Button>
                            </form>
                        )}

                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default PlanSelection;