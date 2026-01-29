import { useState, useEffect, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useClientData } from "@/hooks/useClientData";
import api, { financial } from "@/lib/api";
import { PRODUCT_IMAGES } from "@/lib/client-constants";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, CreditCard, MapPin, User, ArrowLeft, Lock, QrCode, Copy, Check, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/auth/AuthProvider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { analytics } from "@/lib/analytics";

const PlanSelection = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { toast } = useToast();
    const { loginWithToken } = useAuth();

    // [FIX UPGRADE] Recupera dados em tempo real se disponível
    const { activeProtocol, answers: clientAnswers, profile: clientProfile, currentProtocol } = useClientData();

    // --- LÓGICA DE RECUPERAÇÃO DE DADOS (Blindagem) ---
    const getStateOrLocal = (key: string) => {
        if (location.state && location.state[key] !== undefined) {

            return location.state[key];
        }
        const local = localStorage.getItem(`checkout_${key}`);
        if (local) {

            try {
                return JSON.parse(local);
            } catch {
                return local;
            }
        }
        return undefined;
    };

    const isUpgrade = location.state?.isUpgrade;

    const products = useMemo(() => {
        // 1. Tenta recuperar do State/LocalStorage (Checkout em andamento)
        const saved = getStateOrLocal('products');
        if (saved) return saved;

        // 2. Se for Upgrade ou tiver protocolo ativo, usa ele
        if (activeProtocol?.products && activeProtocol.products.length > 0) {
            return activeProtocol.products;
        }

        // 3. FALLBACK DE OURO: Usa o protocolo calculado na hora via Respostas (useClientData)
        if (currentProtocol && currentProtocol.length > 0) {
            return currentProtocol;
        }

        return [];
    }, [location.state, isUpgrade, activeProtocol, currentProtocol]);

    const answers = useMemo(() => {
        // [FIX] Sempre tenta recuperar do backend (clientAnswers) se não tiver no state/local
        // Isso resolve o problema de quem vem do Dashboard para finalizar compra
        const local = getStateOrLocal('answers');
        if (local && Object.keys(local).length > 0) return local;

        return clientAnswers || {};
    }, [location.state, clientAnswers]);

    // [MODIFICADO] Total price se não vier (calculado depois anyway)
    const total_price = getStateOrLocal('total_price') || (isUpgrade ? 150.00 : 0);

    // Debug no Console do Navegador
    useEffect(() => {


        if (!answers || Object.keys(answers).length === 0) {
            console.warn("⚠️ ALERTA: Respostas vazias! O JSON não será gerado.");
        }
    }, [products, answers, isUpgrade]);

    // --- ESTADOS DO COMPONENTE ---
    const [profile, setProfile] = useState<any>(null);
    const [currentStep, setCurrentStep] = useState<0 | 1 | 2 | 3>(getStateOrLocal('step') || 0);
    const [acceptedTerms, setAcceptedTerms] = useState(false);
    const [acceptedContract, setAcceptedContract] = useState(false);

    const [selectedPlan, setSelectedPlan] = useState<"standard" | "plus">(getStateOrLocal('planId') || "plus");
    const [billingCycle, setBillingCycle] = useState<"monthly" | "quarterly" | "one_off">(getStateOrLocal('billingCycle') || "one_off");
    const [loading, setLoading] = useState(false);

    // [MODIFICADO] Estado para Preços Dinâmicos (Vindo do Bitrix)
    const [planPrices, setPlanPrices] = useState({ standard: 0, plus: 150.00 }); // Fallback inicial

    // [NOVO] Estado do Método de Pagamento
    const [paymentMethod, setPaymentMethod] = useState<"credit_card" | "pix">("credit_card");

    // [NOVO] Coupon State
    const [couponCode, setCouponCode] = useState("");
    const [discountAmount, setDiscountAmount] = useState(0);
    const [isValidatingCoupon, setIsValidatingCoupon] = useState(false);
    const [couponSuccess, setCouponSuccess] = useState(false);


    // --- ANALYTICS (GA4) ---
    // Track View Item List (Ao carregar e ter preços)
    useEffect(() => {
        analytics.trackEvent("view_item_list", {
            item_list_name: "Planos de Assinatura",
            items: [
                { item_id: "standard", item_name: "Plano Standard", price: planPrices.standard },
                { item_id: "plus", item_name: "Plano Plus", price: planPrices.plus }
            ]
        });
    }, [planPrices]);

    // Fetch profile if logged in
    useEffect(() => {
        const fetchProfile = async () => {
            const token = localStorage.getItem("access_token");
            if (token) {
                try {
                    const res = await api.get('/accounts/profile/');
                    setProfile(res.data);
                } catch (e) {
                    console.warn("Erro ao carregar perfil (Token inválido?), limpando...", e);
                    localStorage.removeItem("access_token");
                    setProfile(null);
                }
            }
        };
        fetchProfile();
    }, []);

    const [formData, setFormData] = useState({
        full_name: "", email: "", phone: "", password: "", confirmPassword: "", cpf: "",
        cep: "", address: "", number: "", neighborhood: "", complement: "", city: "", state: "",
        cardName: "", cardNumber: "", cardMonth: "", cardYear: "", cardCvv: ""
    });

    // Auto-preenchimento com dados do perfil
    useEffect(() => {
        if (profile) {
            let street = profile.address?.street || "";
            let num = "";
            if (street.includes(",")) {
                const parts = street.split(",");
                street = parts[0].trim();
                num = parts[1].trim();
            }

            setFormData(prev => ({
                ...prev,
                full_name: profile.name || prev.full_name || "",
                email: profile.email || prev.email || "",
                phone: profile.phone || prev.phone || "",
                cep: profile.address?.zip || prev.cep || "",
                address: street || prev.address || "",
                city: profile.address?.city || prev.city || "",
                state: profile.address?.state || prev.state || "",
                neighborhood: profile.address?.neighborhood || prev.neighborhood || "",
                number: prev.number || "S/N",
                complement: prev.complement || "",
            }));

            if (location.state?.fromRegister && currentStep === 1) {
                setCurrentStep(2);
            }
        }
    }, [profile, currentStep, location.state]);

    // --- LÓGICA DE CUSTOMIZAÇÃO DO PROTOCOLO ---
    const [activeProductIds, setActiveProductIds] = useState<string[]>([]);

    useEffect(() => {
        if (products && Array.isArray(products) && products.length > 0) {
            setActiveProductIds(products.map((p: any) => p.id));
        }
    }, [products]);

    const toggleProduct = (productId: string) => {
        setActiveProductIds(prev =>
            prev.includes(productId) ? prev.filter(id => id !== productId) : [...prev, productId]
        );
    };

    const productsTotal = useMemo(() => {
        if (!products || !Array.isArray(products)) return 0;
        return products
            .filter((p: any) => activeProductIds.includes(p.id))
            .reduce((sum: number, p: any) => sum + (parseFloat(p.price) || 0), 0);
    }, [products, activeProductIds]);

    useEffect(() => {
        const fetchPrices = async () => {
            try {
                const res = await api.get('/financial/plans/prices/');
                if (res.data) {
                    console.log("💰 [PlanSelection] Preços atualizados do Bitrix:", res.data);
                    setPlanPrices({
                        standard: parseFloat(res.data.standard) || 0,
                        plus: parseFloat(res.data.plus) || 150.00
                    });
                }
            } catch (error) {
                console.warn("⚠️ [PlanSelection] Falha ao buscar preços do Bitrix. Usando fallback.", error);
            }
        };
        fetchPrices();
    }, []);

    const getPrice = (plan: "standard" | "plus") => {
        if (location.state?.isUpgrade && plan === 'plus') {
            return planPrices.plus.toFixed(2);
        }
        let base = productsTotal;
        if (plan === 'plus') {
            base += planPrices.plus;
        } else {
            base += planPrices.standard;
        }


        return base.toFixed(2);
    };

    const formatCPF = (value: string) => {
        return value.replace(/\D/g, '').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})/, '$1-$2').replace(/(-\d{2})\d+?$/, '$1');
    };

    const formatPhone = (value: string) => {
        value = value.replace(/\D/g, "");
        value = value.replace(/^(\d{2})(\d)/g, "($1) $2");
        value = value.replace(/(\d)(\d{4})$/, "$1-$2");
        return value;
    };

    const formatCEP = (value: string) => {
        return value.replace(/\D/g, '').replace(/^(\d{5})(\d)/, '$1-$2').replace(/(-\d{3})\d+?$/, '$1');
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let value = e.target.value;
        if (e.target.id === 'cpf') value = formatCPF(value);
        if (e.target.id === 'phone') value = formatPhone(value);
        if (e.target.id === 'cep') value = formatCEP(value);
        setFormData({ ...formData, [e.target.id]: value });
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

    const handleApplyCoupon = async () => {
        if (!couponCode) return;
        setIsValidatingCoupon(true);
        setCouponSuccess(false); // Reset
        setDiscountAmount(0);

        try {
            const currentTotal = parseFloat(getPrice(selectedPlan));
            const res = await financial.validateCoupon(couponCode, currentTotal);

            if (res.data.valid) {
                setDiscountAmount(res.data.discount_amount);
                setCouponSuccess(true);
                toast({
                    title: "Cupom Aplicado!",
                    description: `Economia de R$ ${res.data.discount_amount.toFixed(2)}`,
                    className: "bg-green-50 border-green-200 text-green-800"
                });
            } else {
                toast({
                    variant: "destructive",
                    title: "Cupom Inválido",
                    description: res.data.message
                });
                setDiscountAmount(0);
            }
        } catch (error) {
            console.error(error);
            toast({
                variant: "destructive",
                title: "Erro",
                description: "Não foi possível validar o cupom."
            });
        } finally {
            setIsValidatingCoupon(false);
        }
    };

    // --- SELEÇÃO DE PLANO COM ROTEAMENTO ---
    const handleSelectPlan = (plan: "standard" | "plus") => {
        setSelectedPlan(plan);

        analytics.trackEvent("add_to_cart", {
            currency: "BRL",
            value: getPrice(plan),
            items: [{
                item_id: plan,
                item_name: `Plano ${plan === 'plus' ? 'Plus' : 'Standard'}`,
                price: getPrice(plan),
                quantity: 1
            }]
        });

        if (location.state?.isUpgrade) {
            setCurrentStep(3);
            return;
        }

        analytics.trackEvent("begin_checkout", {
            currency: "BRL",
            value: getPrice(plan),
            items: [{ item_id: plan, item_name: `Plano ${plan}` }]
        });

        setCurrentStep(1);
    };

    const handleCreateAccount = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            if (profile) {
                await api.put("/accounts/profile/update/", {
                    full_name: formData.full_name,
                    phone: formData.phone
                });
                toast({ title: "Dados Confirmados!", description: "Indo para endereço." });
                setCurrentStep(2);
                return;
            }

            if (formData.password.length < 6) throw new Error("Senha muito curta.");
            if (formData.password !== formData.confirmPassword) throw new Error("As senhas não conferem.");

            const payload = {
                full_name: formData.full_name,
                email: formData.email,
                phone: formData.phone,
                password: formData.password,
                questionnaire_data: answers
            };

            const res = await api.post("/accounts/register/", payload);

            if (res.status === 201) {
                const loginRes = await api.post("/accounts/login/", { email: formData.email, password: formData.password });
                loginWithToken(loginRes.data.access, loginRes.data.user);
                toast({ title: "Conta Criada!", description: "Dados salvos com sucesso." });
                setCurrentStep(2);
            }

        } catch (error: any) {
            console.error(error);
            const msg = error.response?.data?.email ? "E-mail já cadastrado." : "Erro ao criar conta.";
            toast({ variant: "destructive", title: "Erro", description: msg });
        } finally {
            setLoading(false);
        }
    };

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
            setCurrentStep(3);

        } catch (error) {
            console.error(error);
            toast({ variant: "destructive", title: "Erro", description: "Falha ao salvar endereço." });
        } finally {
            setLoading(false);
        }
    };

    const handleFinalizePayment = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        if (!answers || Object.keys(answers).length === 0) {
            toast({ variant: "destructive", title: "Erro", description: "Dados do questionário perdidos. Refaça o quiz." });
            setLoading(false);
            return;
        }

        const finalProducts = products.filter((p: any) => activeProductIds.includes(p.id));

        if (finalProducts.length === 0) {
            toast({ variant: "destructive", title: "Atenção", description: "Selecione pelo menos um produto para continuar." });
            setLoading(false);
            return;
        }

        try {
            let payload: any = {
                plan_id: selectedPlan,
                billing_cycle: billingCycle,
                total_price: getPrice(selectedPlan),
                products: finalProducts,
                cpf: formData.cpf,
                payment_method_id: paymentMethod === 'pix' ? 'pix' : undefined,
                full_name: formData.full_name,
                email: formData.email,
                address_data: {
                    cep: formData.cep, street: formData.address, number: formData.number,
                    neighborhood: formData.neighborhood, complement: formData.complement,
                    city: formData.city, state: formData.state
                },
                questionnaire_data: answers || {},
                coupon_code: couponSuccess ? couponCode : undefined
            };

            const mpKey = import.meta.env.VITE_MERCADO_PAGO_PUBLIC_KEY;

            if (paymentMethod === 'credit_card') {
                // [MIGRATION ASAAS] Pass-Through Strategy (HTTPS Direct)
                // Não geramos token no frontend. Enviamos dados para o backend via túnel seguro.
                console.log("💳 Preparando payload Asaas (Pass-Through)...");

                payload.credit_card = {
                    holderName: formData.cardName.trim(),
                    number: formData.cardNumber.replace(/\s/g, ""),
                    expiryMonth: formData.cardMonth,
                    expiryYear: "20" + formData.cardYear, // Asaas espera 4 dígitos (ex: 2028)
                    ccv: formData.cardCvv,
                    holderInfo: {
                        name: formData.full_name,
                        email: formData.email,
                        cpfCnpj: formData.cpf.replace(/[^\d]/g, ""),
                        postalCode: formData.cep.replace(/[^\d]/g, ""),
                        addressNumber: formData.number,
                        phone: formData.phone.replace(/[^\d]/g, "")
                    }
                };
                payload.payment_method_id = 'credit_card'; // Identificador genérico para o Backend
            }

            const response = await api.post("/financial/purchase/", payload);

            if (response.data.status === "success" || response.status === 201) {
                localStorage.removeItem('checkout_answers');
                localStorage.removeItem('checkout_products');
                localStorage.removeItem('checkout_total_price');

                const status = response.data.payment_status || response.data.status;

                if (status === 'pending' && paymentMethod === 'pix') {
                    navigate("/pagamento/pendente", {
                        state: {
                            price: getPrice(selectedPlan),
                            status: status,
                            pixData: response.data.pix_data,
                            orderId: response.data.order_id
                        }
                    });
                }
                else if (status === 'in_process') {
                    navigate("/pagamento/pendente", {
                        state: {
                            price: getPrice(selectedPlan),
                            status: status
                        }
                    });
                } else {
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
            let msg = "Erro desconhecido.";
            if (error.response?.data) {
                const data = error.response.data;
                if (typeof data === 'string') {
                    msg = data;
                } else if (data.detail) {
                    msg = data.detail;
                } else if (data.error) {
                    msg = data.error;
                } else {
                    // Tenta extrair mensagens de validação (ex: {email: ["Erro..."]})
                    const parts = [];
                    for (const [key, value] of Object.entries(data)) {
                        const fieldName = key.charAt(0).toUpperCase() + key.slice(1);
                        const errorText = Array.isArray(value) ? value.join(" ") : String(value);
                        parts.push(`${fieldName}: ${errorText}`);
                    }
                    if (parts.length > 0) msg = parts.join(" | ");
                    else msg = error.message;
                }
            } else {
                msg = error.message;
            }
            navigate("/pagamento/erro", {
                state: {
                    message: msg,
                    retryData: {
                        shouldRetry: true,
                        planId: selectedPlan,
                        billingCycle: billingCycle,
                        products: finalProducts,
                        answers: answers,
                        total_price: getPrice(selectedPlan),
                        step: 3
                    }
                }
            });
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
                        <p className="text-gray-600">Personalize seu tratamento e selecione a melhor opção.</p>
                    </div>

                    {/* --- ÁREA DE CUSTOMIZAÇÃO DO PROTOCOLO --- */}
                    <Card className="border-none shadow-sm bg-white overflow-hidden">
                        <CardHeader className="bg-blue-50/50 pb-4">
                            <CardTitle className="flex items-center gap-2 text-xl text-blue-900">
                                <span className="bg-blue-100 p-2 rounded-full"><QrCode className="w-5 h-5 text-blue-600" /></span>
                                Personalize seu Protocolo
                            </CardTitle>
                            <CardDescription>
                                Você pode remover itens se desejar. O preço do plano será ajustado automaticamente.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="divide-y divide-gray-100">
                                {products?.map((product: any) => {
                                    const isActive = activeProductIds.includes(product.id);
                                    return (
                                        <div key={product.id} className={`flex items-center justify-between p-4 transition-all duration-300 ${!isActive ? 'bg-gray-50 opacity-60 grayscale' : 'hover:bg-gray-50'}`}>
                                            <div className="flex items-center gap-4">
                                                <div className="w-16 h-16 bg-white border border-gray-100 rounded-lg flex items-center justify-center p-1">
                                                    {(() => {
                                                        const remoteImg = product.image_url || product.img;

                                                        // Fallback Local (Busca Inteligente)
                                                        let localImg = null;
                                                        if (!remoteImg) {
                                                            const nameLower = (product.name || "").toLowerCase();
                                                            if (nameLower.includes("minoxidil") && nameLower.includes("tópico")) localImg = PRODUCT_IMAGES["Loção Minoxidil 5%"];
                                                            else if (nameLower.includes("minoxidil") && (nameLower.includes("oral") || nameLower.includes("cápsula"))) localImg = PRODUCT_IMAGES["Minoxidil 2.5mg"];
                                                            else if (nameLower.includes("finasterida") && nameLower.includes("tópico")) localImg = PRODUCT_IMAGES["Loção Finasterida"];
                                                            else if (nameLower.includes("finasterida") && (nameLower.includes("oral") || nameLower.includes("cápsula"))) localImg = PRODUCT_IMAGES["Finasterida 1mg"];
                                                            else if (nameLower.includes("dutasterida")) localImg = PRODUCT_IMAGES["Dutasterida 0.5mg"];
                                                            else if (nameLower.includes("shampoo")) localImg = PRODUCT_IMAGES["Shampoo Saw Palmetto"];
                                                            else if (nameLower.includes("biotina")) localImg = PRODUCT_IMAGES["Biotina 45ug"];
                                                        }

                                                        const finalImg = remoteImg || localImg;

                                                        return finalImg ? (
                                                            <img src={finalImg} alt={product.name} className="max-w-full max-h-full object-contain" />
                                                        ) : (
                                                            <span className="text-xs text-gray-300">Sem img</span>
                                                        );
                                                    })()}
                                                </div>
                                                <div>
                                                    <h4 className={`font-semibold text-gray-900 ${!isActive && 'text-gray-500 line-through'}`}>{product.name}</h4>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-6">
                                                <div className="text-right hidden sm:block">
                                                    <p className={`font-bold ${!isActive ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
                                                        R$ {parseFloat(product.price).toFixed(2)}
                                                    </p>
                                                </div>
                                                <Button
                                                    size="sm"
                                                    variant={isActive ? "outline" : "default"}
                                                    className={isActive ? "text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700" : "bg-green-600 hover:bg-green-700 text-white"}
                                                    onClick={() => toggleProduct(product.id)}
                                                >
                                                    {isActive ? "Remover" : "Adicionar"}
                                                </Button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Resumo do Valor dos Produtos */}
                            <div className="p-4 bg-gray-50 text-right border-t border-gray-100">
                                <p className="text-sm text-gray-500">Valor total dos produtos selecionados</p>
                                <p className="text-xl font-bold text-gray-900">R$ {productsTotal.toFixed(2)}</p>
                            </div>
                        </CardContent>
                    </Card>

                    <div className="flex justify-center gap-4 mb-8">
                        <Button variant={billingCycle === "one_off" ? "default" : "outline"} onClick={() => setBillingCycle("one_off")}>Pagamento Único</Button>
                        <Button variant={billingCycle === "monthly" ? "default" : "outline"} onClick={() => { setBillingCycle("monthly"); setPaymentMethod("credit_card"); }}>Assinatura (Cobrança Mensal)</Button>
                    </div>
                    <div className="grid md:grid-cols-2 gap-8">
                        {!location.state?.isUpgrade && (
                            <Card className={`cursor-pointer transition-all duration-300 ${selectedPlan === 'standard' ? 'border-2 border-blue-600 shadow-xl scale-[1.02]' : 'hover:shadow-lg border-transparent'}`} onClick={() => setSelectedPlan("standard")}>
                                <CardHeader>
                                    <CardTitle className="text-2xl">Standard</CardTitle>
                                    <CardDescription>Apenas Medicamentos</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="text-center py-4">
                                        <p className="text-sm text-gray-500 mb-1">Total Estimado</p>
                                        <p className="text-4xl font-bold text-blue-900">R$ {getPrice("standard")}</p>
                                        <p className="text-sm text-green-600 font-medium mt-2">
                                            {billingCycle === 'monthly' ? 'Cobrado mensalmente' : 'Cobrado hoje'}
                                        </p>
                                    </div>
                                    <ul className="space-y-2 text-sm text-gray-600">
                                        <li className="flex items-center gap-2"><Check className="w-4 h-4 text-green-500" /> Todos os produtos selecionados</li>
                                        <li className="flex items-center gap-2"><Check className="w-4 h-4 text-green-500" /> Entrega Grátis</li>
                                        <li className="flex items-center gap-2"><X className="w-4 h-4 text-red-300" /> Acompanhamento Médico</li>
                                    </ul>
                                </CardContent>
                                <CardFooter><Button className="w-full h-12 text-lg" variant={selectedPlan === 'standard' ? "default" : "outline"} onClick={() => handleSelectPlan("standard")}>Selecionar Standard</Button></CardFooter>

                            </Card>
                        )}

                        <Card className={`cursor-pointer transition-all duration-300 relative overflow-hidden ${selectedPlan === 'plus' ? 'border-2 border-green-600 shadow-xl scale-[1.02]' : 'hover:shadow-lg border-transparent'}`} onClick={() => setSelectedPlan("plus")}>
                            {selectedPlan === 'plus' && <div className="absolute top-0 right-0 bg-green-600 text-white text-xs px-3 py-1 rounded-bl-lg font-bold">RECOMENDADO</div>}
                            <CardHeader>
                                <CardTitle className="text-2xl">Plus <span className="text-sm font-normal text-muted-foreground ml-2">(Mais Popular)</span></CardTitle>
                                <CardDescription>Medicamentos + Médico</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="text-center py-4">
                                    <p className="text-sm text-gray-500 mb-1">Total Estimado</p>
                                    <p className="text-4xl font-bold text-green-700">R$ {getPrice("plus")}</p>
                                    <p className="text-sm text-green-600 font-medium mt-2">
                                        {billingCycle === 'monthly' ? 'Cobrado mensalmente' : 'Cobrado hoje'}
                                    </p>
                                </div>
                                <ul className="space-y-2 text-sm text-gray-600">
                                    <li className="flex items-center gap-2"><Check className="w-4 h-4 text-green-500" /> Todos os produtos selecionados</li>
                                    <li className="flex items-center gap-2"><Check className="w-4 h-4 text-green-500" /> Entrega Grátis</li>
                                    <li className="flex items-center gap-2"><Check className="w-4 h-4 text-green-500" /> <strong>Acompanhamento Médico Contínuo</strong></li>
                                    <li className="flex items-center gap-2"><Check className="w-4 h-4 text-green-500" /> Ajustes de dosagem ilimitados</li>
                                </ul>
                            </CardContent>
                            <CardFooter><Button className="w-full h-12 text-lg bg-green-600 hover:bg-green-700" onClick={() => handleSelectPlan("plus")}>Selecionar Plus</Button></CardFooter>
                        </Card>
                    </div>
                </div>
            </div>
        );
    }



    return (
        <div className="min-h-screen bg-gray-50 py-8 px-4">
            <div className="max-w-3xl mx-auto">
                <Button
                    variant="ghost"
                    onClick={() => {
                        // Se for Upgrade e estiver no Pagamento (Step 3), volta pro passo 0 (Seleção/Resumo)
                        if (isUpgrade && currentStep === 3) {
                            setCurrentStep(0);
                        } else {
                            setCurrentStep(currentStep - 1 as any);
                        }
                    }}
                    className="mb-4"
                    disabled={currentStep === 1 && !isUpgrade}
                >
                    <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
                </Button>

                {/* Visualizador de Passos - Oculta passos intermediários se for Upgrade */}
                {!isUpgrade && (
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
                )}


                <Card className="border-t-4 border-t-green-600 shadow-lg">
                    <CardHeader className="bg-gray-50/50 border-b pb-6">
                        <div className="flex justify-between items-start">
                            <div><CardTitle className="flex items-center gap-2"><Lock className="w-5 h-5 text-green-600" /> Finalizar Compra</CardTitle><CardDescription>Dados seguros.</CardDescription></div>
                            <div className="text-right">
                                <p className="text-sm text-gray-500">Total</p>
                                {discountAmount > 0 ? (
                                    <>
                                        <p className="text-sm text-gray-400 line-through">R$ {getPrice(selectedPlan)}</p>
                                        <p className="text-2xl font-bold text-green-700">R$ {(parseFloat(getPrice(selectedPlan)) - discountAmount).toFixed(2)}</p>
                                    </>
                                ) : (
                                    <p className="text-2xl font-bold text-green-700">R$ {getPrice(selectedPlan)}</p>
                                )}
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="pt-6">

                        {/* STEP 1: DADOS PESSOAIS */}
                        {currentStep === 1 && (
                            <form onSubmit={handleCreateAccount} className="space-y-6">
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center">
                                        <h3 className="text-md font-semibold flex items-center gap-2 text-gray-700">
                                            <User className="w-4 h-4" /> {profile ? "Confirme seus Dados" : "Criar Conta"}
                                        </h3>
                                        {profile && (
                                            <Button
                                                variant="link"
                                                className="text-red-500 h-auto p-0 text-xs"
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    localStorage.removeItem("access_token");
                                                    window.location.reload();
                                                }}
                                            >
                                                Não é você? Sair
                                            </Button>
                                        )}
                                    </div>
                                    <div className="grid md:grid-cols-2 gap-4">
                                        <div className="space-y-2"><Label>Nome Completo</Label><Input id="full_name" value={formData.full_name} onChange={handleInputChange} required /></div>
                                        <div className="space-y-2"><Label>Celular</Label><Input id="phone" value={formData.phone} onChange={handleInputChange} required placeholder="(11) 99999-9999" maxLength={15} /></div>
                                        <div className="space-y-2 md:col-span-2"><Label>E-mail</Label><Input id="email" type="email" value={formData.email} onChange={handleInputChange} required disabled={!!profile} className={profile ? "bg-gray-100" : ""} /></div>

                                        {!profile && (
                                            <>
                                                <div className="space-y-2"><Label>Senha</Label><Input id="password" type="password" value={formData.password} onChange={handleInputChange} required /></div>
                                                <div className="space-y-2"><Label>Confirmar Senha</Label><Input id="confirmPassword" type="password" value={formData.confirmPassword} onChange={handleInputChange} required /></div>
                                            </>
                                        )}
                                    </div>
                                    {/* Exibe Termos apenas para novos usuários */}
                                    {!profile && (
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
                                    )}
                                </div>
                                <Button type="submit" className="w-full h-12 text-lg shadow-md" disabled={loading || (!profile && (!acceptedTerms || !acceptedContract))}>
                                    {loading ? <Loader2 className="animate-spin mr-2" /> : (profile ? "Confirmar e Continuar" : "Continuar para Endereço")}
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

                                    {/* CUPON AREA */}
                                    <div className="flex gap-2 items-end bg-gray-50 p-3 rounded-lg border border-dashed border-gray-300">
                                        <div className="flex-1 space-y-1">
                                            <Label className="text-xs text-gray-500">Possui Cupom de Desconto?</Label>
                                            <Input
                                                placeholder="Ex: VERAO2026"
                                                value={couponCode}
                                                onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                                                disabled={couponSuccess}
                                                className={couponSuccess ? "border-green-500 text-green-700 bg-green-50" : ""}
                                            />
                                        </div>
                                        {couponSuccess ? (
                                            <Button type="button" variant="outline" onClick={() => { setCouponSuccess(false); setDiscountAmount(0); setCouponCode(""); }} className="text-red-500 hover:text-red-700">
                                                <X className="w-4 h-4" />
                                            </Button>
                                        ) : (
                                            <Button type="button" onClick={handleApplyCoupon} disabled={!couponCode || isValidatingCoupon} variant="secondary">
                                                {isValidatingCoupon ? <Loader2 className="w-4 h-4 animate-spin" /> : "Aplicar"}
                                            </Button>
                                        )}
                                    </div>

                                    <div className="space-y-2"><Label>CPF do Titular</Label><Input id="cpf" placeholder="000.000.000-00" value={formData.cpf} onChange={handleInputChange} maxLength={14} required /></div>

                                    {/* MÉTODOS DE PAGAMENTO */}
                                    <div className={`grid ${billingCycle === 'one_off' ? 'grid-cols-2' : 'grid-cols-1'} gap-4`}>
                                        <div
                                            className={`border rounded-lg p-4 cursor-pointer transition-all flex flex-col items-center justify-center gap-2 ${paymentMethod === 'credit_card' ? 'border-blue-600 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'}`}
                                            onClick={() => setPaymentMethod('credit_card')}
                                        >
                                            <CreditCard className={`w-6 h-6 ${paymentMethod === 'credit_card' ? 'text-blue-600' : 'text-gray-400'}`} />
                                            <span className={`text-sm font-medium ${paymentMethod === 'credit_card' ? 'text-blue-900' : 'text-gray-500'}`}>Cartão de Crédito</span>
                                        </div>

                                        {billingCycle === 'one_off' && (
                                            <div
                                                className={`border rounded-lg p-4 cursor-pointer transition-all flex flex-col items-center justify-center gap-2 ${paymentMethod === 'pix' ? 'border-green-600 bg-green-50' : 'border-gray-200 hover:bg-gray-50'}`}
                                                onClick={() => setPaymentMethod('pix')}
                                            >
                                                <QrCode className={`w-6 h-6 ${paymentMethod === 'pix' ? 'text-green-600' : 'text-gray-400'}`} />
                                                <span className={`text-sm font-medium ${paymentMethod === 'pix' ? 'text-green-900' : 'text-gray-500'}`}>Pix</span>
                                            </div>
                                        )}
                                    </div>

                                    {paymentMethod === 'credit_card' && (
                                        <div className="bg-gray-50 p-5 rounded-lg border border-gray-200 mt-4 animate-in fade-in slide-in-from-top-2">
                                            <div className="space-y-4">
                                                <div className="space-y-2"><Label>Número do Cartão</Label><Input id="cardNumber" value={formData.cardNumber} onChange={handleInputChange} required maxLength={19} /></div>
                                                <div className="space-y-2"><Label>Nome no Cartão</Label><Input id="cardName" value={formData.cardName} onChange={handleInputChange} required /></div>
                                                <div className="grid grid-cols-3 gap-4">
                                                    <div className="space-y-2"><Label>Mês</Label><Input id="cardMonth" placeholder="MM" maxLength={2} value={formData.cardMonth} onChange={handleInputChange} required /></div>
                                                    <div className="space-y-2"><Label>Ano</Label><Input id="cardYear" placeholder="AA" maxLength={2} value={formData.cardYear} onChange={handleInputChange} required /></div>
                                                    <div className="space-y-2"><Label>CVV</Label><Input id="cardCvv" maxLength={4} value={formData.cardCvv} onChange={handleInputChange} required type="password" /></div>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {paymentMethod === 'pix' && (
                                        <div className="bg-green-50 p-5 rounded-lg border border-green-200 mt-4 animate-in fade-in slide-in-from-top-2 text-center">
                                            <div className="flex justify-center mb-3">
                                                <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-green-600 shadow-sm">
                                                    <QrCode className="w-6 h-6" />
                                                </div>
                                            </div>
                                            <h4 className="font-semibold text-green-900 mb-2">Pagamento Instantâneo</h4>
                                            <p className="text-sm text-green-800">
                                                Ao continuar, geraremos um <strong>QR Code</strong> para pagamento.
                                            </p>
                                            <p className="text-xs text-green-700 mt-2">
                                                A aprovação é imediata e seu protocolo será liberado na hora.
                                            </p>
                                        </div>
                                    )}

                                </div>
                                <Button type="submit" className={`w-full h-12 text-lg shadow-md ${paymentMethod === 'pix' ? 'bg-green-600 hover:bg-green-700' : 'bg-blue-600 hover:bg-blue-700'}`} disabled={loading}>
                                    {loading ? <Loader2 className="animate-spin mr-2" /> : (paymentMethod === 'pix' ? `Gerar Pix R$ ${(parseFloat(getPrice(selectedPlan)) - discountAmount).toFixed(2)}` : `Pagar R$ ${(parseFloat(getPrice(selectedPlan)) - discountAmount).toFixed(2)}`)}
                                </Button>
                            </form>
                        )}

                    </CardContent>
                </Card>
            </div>
            {/* FALLBACK: Se o step for inválido */}
            {
                ![0, 1, 2, 3].includes(currentStep) && (
                    <div className="text-center p-12">
                        <h2 className="text-xl font-bold text-red-600">Erro de Navegação</h2>
                        <p>Etapa desconhecida: {currentStep}</p>
                        <Button onClick={() => setCurrentStep(0)} className="mt-4">Reiniciar</Button>
                    </div>
                )
            }
        </div>
    );
};

export default PlanSelection;