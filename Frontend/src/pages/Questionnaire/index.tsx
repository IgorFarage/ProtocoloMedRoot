import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, CheckCircle, AlertTriangle } from "lucide-react";

// Imports de UI e Componentes
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ProductCard } from "@/components/store/ProductCard";
import { ProductImage } from "@/components/store/ProductImage";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { X } from "lucide-react";

// API e Utils
import api from "@/lib/api";
import NotFound from "../NotFound";

// --- IMPORTS LOCAIS ---
import { questions } from "./data";

const Questionnaire = () => {
    const [currentStep, setCurrentStep] = useState(0);
    const [answers, setAnswers] = useState<Record<string, string>>({});

    // Estados de Fluxo e Resultado
    const [showResults, setShowResults] = useState(false);
    const [showSimpleRedFlag, setShowSimpleRedFlag] = useState(false); // Flags imediatas (ex: idade)

    // Estados de API
    const [loadingRec, setLoadingRec] = useState(false);
    const [protocolData, setProtocolData] = useState<any>(null); // Dados vindos do Bitrix
    const [selectedProduct, setSelectedProduct] = useState<any | null>(null); // Estado do Modal

    const navigate = useNavigate();

    // Carrega respostas salvas ao iniciar (Persistência básica)
    useEffect(() => {
        const saved = sessionStorage.getItem('quiz_answers');
        if (saved) {
            setAnswers(JSON.parse(saved));
        }
    }, []);

    // --- LÓGICA DE PULOS (JUMPS) ---
    const visibleQuestions = useMemo(() => {
        let qList = [];
        for (let i = 0; i < questions.length; i++) {
            const q = questions[i];

            // Jumps baseados nas respostas anteriores
            if (q.id === "F2_Q8_symptom" || q.id === "F2_Q9_consult") {
                if (answers["F2_Q7_irritation"] === "nao") continue;
            }
            if (q.id === "F2_Q9_consult") {
                if (!answers["F2_Q8_symptom"]?.includes("dor_vermelhidao")) continue;
            }
            if (q.id === "F2_Q12_substance" || q.id === "F2_Q13_results") {
                if (answers["F2_Q11_prev_treat"] === "nao") continue;
            }

            qList.push(q);
        }
        return qList;
    }, [answers]);

    const currentQuestion = visibleQuestions[currentStep];
    const totalSteps = visibleQuestions.length;
    const progress = ((currentStep + 1) / totalSteps) * 100;

    // --- HANDLERS ---

    const handleAnswer = (value: string) => {
        const newAnswers = { ...answers, [currentQuestion.id]: value };
        setAnswers(newAnswers);
        sessionStorage.setItem('quiz_answers', JSON.stringify(newAnswers));
    };

    const handleMultipleAnswer = (value: string, shouldBeChecked: boolean) => {
        const currentAnswer = answers[currentQuestion.id] || "";
        let selectedValues = currentAnswer.split(',').filter(v => v.trim() !== '');

        if (shouldBeChecked) {
            if (!selectedValues.includes(value)) selectedValues.push(value);
        } else {
            selectedValues = selectedValues.filter(v => v !== value);
        }

        const newAnswers = { ...answers, [currentQuestion.id]: selectedValues.join(',') };
        setAnswers(newAnswers);
        sessionStorage.setItem('quiz_answers', JSON.stringify(newAnswers));
    };

    const handleNext = async () => {
        const currentAnswerValue = answers[currentQuestion.id];

        // 1. Verifica Stop Flag Simples (Configurada no data.ts)
        const option = currentQuestion.options?.find(opt => currentAnswerValue?.includes(opt.value) && opt.stopFlag);
        if (option) {
            setShowSimpleRedFlag(true);
            return;
        }

        let nextStep = currentStep + 1;
        if (nextStep < totalSteps) {
            setCurrentStep(nextStep);
        } else {
            // FINALIZAÇÃO: Chama o Backend
            await finishQuestionnaire();
        }
    };

    const finishQuestionnaire = async () => {
        setLoadingRec(true);
        // Salva localmente para a próxima tela
        localStorage.setItem('quiz_answers', JSON.stringify(answers));

        try {
            // Envia respostas para o Backend processar o protocolo
            const response = await api.post('/accounts/recommendation/', { answers });
            setProtocolData(response.data);
            setShowResults(true);

            // Se usuário logado, salva histórico no banco
            const token = localStorage.getItem('access_token');
            if (token) {
                api.post('/accounts/questionnaires/', { answers }).catch(console.error);
            }

        } catch (error) {
            console.error("Erro ao gerar recomendação:", error);
            // Fallback simples caso a API falhe
            alert("Ocorreu um erro ao processar suas respostas. Tente novamente.");
        } finally {
            setLoadingRec(false);
        }
    };

    const handleBack = () => {
        if (currentStep > 0) {
            setCurrentStep(currentStep - 1);
        } else {
            navigate("/");
        }
    };

    // --- RENDERIZAÇÃO: LOADINGS ---
    if (loadingRec) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-white gap-4">
                <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-primary"></div>
                <p className="text-lg text-gray-600 font-medium animate-pulse">
                    Nossos especialistas estão analisando seu perfil...
                </p>
            </div>
        );
    }

    // --- RENDERIZAÇÃO: FLAG VERMELHA SIMPLES (Front) ---
    if (showSimpleRedFlag) {
        return (
            <div className="min-h-screen bg-background">
                <Header />
                <div className="container mx-auto px-4 py-12">
                    <Card className="max-w-3xl mx-auto border-destructive border-4">
                        <CardContent className="p-8 text-center space-y-6">
                            <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
                                <AlertTriangle className="w-12 h-12 text-destructive" />
                            </div>
                            <h2 className="text-3xl font-bold text-destructive">
                                Atenção! Necessária avaliação presencial
                            </h2>
                            <p className="text-lg text-muted-foreground">
                                Sua resposta indica uma condição que exige prioridade clínica.
                            </p>
                            <div className="bg-destructive/10 rounded-lg p-6 space-y-3">
                                <p className="font-semibold text-destructive">
                                    Não podemos prosseguir com o protocolo online.
                                </p>
                                <p className="text-sm text-destructive/80">
                                    Recomendamos que procure um dermatologista presencialmente.
                                </p>
                            </div>
                            <Button variant="ghost" onClick={() => navigate("/")} className="w-full sm:w-auto">
                                Voltar para a Home
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </div>
        );
    }

    // --- RENDERIZAÇÃO: RESULTADOS (DADOS DO BACKEND) ---
    if (showResults && protocolData) {

        // Verifica Flag Complexa vinda do Backend
        if (protocolData.redFlag) {
            return (
                <div className="min-h-screen bg-background">
                    <Header />
                    <div className="container mx-auto px-4 py-12">
                        <Card className="max-w-3xl mx-auto border-destructive border-4">
                            <CardContent className="p-8 text-center space-y-6">
                                <AlertTriangle className="w-16 h-16 text-destructive mx-auto" />
                                <h2 className="text-3xl font-bold text-destructive">
                                    {protocolData.title || "Atenção Médica Necessária"}
                                </h2>
                                <div className="bg-destructive/10 rounded-lg p-6">
                                    <p className="text-lg text-destructive/90 font-medium">
                                        {protocolData.description}
                                    </p>
                                </div>
                                <p className="text-muted-foreground">
                                    Por segurança, não podemos prescrever o tratamento via telemedicina para este perfil.
                                </p>
                                <Button variant="outline" onClick={() => navigate("/")}>Voltar para Home</Button>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            );
        }
        // EXIBIÇÃO DO PROTOCOLO APROVADO

        // Map Backend Data to Store Product Interface
        const displayProducts = protocolData.products?.map((p: any, idx: number) => ({
            id: p.id || `rec-${idx}`,
            name: p.name,
            price: p.price || 0,
            description: p.description || p.sub || "Protocolo Personalizado",
            image_url: p.img,
            category_id: "protocol"
        })) || [];

        return (
            <div className="min-h-screen bg-background">
                <Header />
                <div className="container mx-auto px-4 py-12">
                    <Card className="max-w-4xl mx-auto">
                        <CardContent className="p-8 text-center space-y-8">
                            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                                <CheckCircle className="w-12 h-12 text-primary" />
                            </div>

                            <div className="space-y-2">
                                <h2 className="text-3xl font-bold text-foreground">
                                    {protocolData.title}
                                </h2>
                                <p className="text-muted-foreground max-w-2xl mx-auto">
                                    {protocolData.description}
                                </p>
                            </div>

                            {/* GRID DE PRODUTOS REAIS (BITRIX) - REFACTOR to ProductCard */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 mt-8">
                                {displayProducts.map((product: any) => (
                                    <ProductCard
                                        key={product.id}
                                        product={product}
                                        onClick={(p) => setSelectedProduct(p)}
                                    />
                                ))}
                            </div>

                            <div className="space-y-6 pt-8 border-t border-border">
                                <div className="space-y-2">
                                    <p className="text-lg text-foreground font-semibold">
                                        Próximo passo: Escolha seu Plano
                                    </p>
                                    <p className="text-muted-foreground">
                                        Para iniciar seu tratamento personalizado, escolha o plano ideal para você.
                                    </p>
                                </div>

                                <div className="flex flex-col sm:flex-row gap-4 justify-center w-full">
                                    <Button
                                        variant="outline"
                                        size="lg"
                                        className="w-full sm:w-auto border-primary/20 hover:bg-primary/5 text-foreground"
                                        onClick={() => navigate("/login")}
                                    >
                                        Já tenho conta
                                    </Button>

                                    <Button
                                        size="lg"
                                        className="w-full sm:w-auto bg-primary hover:bg-primary/90"
                                        onClick={() => {
                                            localStorage.setItem('checkout_answers', JSON.stringify(answers));
                                            localStorage.setItem('checkout_products', JSON.stringify(protocolData.products));
                                            localStorage.setItem('checkout_total_price', protocolData.total_price);

                                            navigate("/planos", {
                                                state: {
                                                    products: protocolData.products,
                                                    total_price: protocolData.total_price,
                                                    answers: answers
                                                }
                                            });
                                        }}
                                    >
                                        Ver Planos e Cadastrar
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* PRODUCT DETAIL MODAL */}
                    <Dialog open={!!selectedProduct} onOpenChange={(open) => !open && setSelectedProduct(null)}>
                        <DialogContent className="max-w-xl w-full p-0 overflow-hidden bg-white rounded-xl flex flex-col">

                            {/* Imagem Centralizada */}
                            <div className="bg-gray-50 w-full flex items-center justify-center p-8 h-[300px]">
                                {selectedProduct && (
                                    <ProductImage
                                        product={selectedProduct}
                                        className="object-contain w-full h-full mix-blend-multiply"
                                    />
                                )}
                            </div>

                            {/* Informações Abaixo */}
                            <div className="w-full p-6 flex flex-col">
                                <DialogHeader className="mb-4 text-center sm:text-center">
                                    <DialogTitle className="text-2xl font-bold text-gray-900">
                                        {selectedProduct?.name}
                                    </DialogTitle>
                                    <div className="text-xl font-semibold text-primary mt-2">
                                        {selectedProduct && (selectedProduct.price).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                    </div>
                                </DialogHeader>

                                <div className="flex-1 overflow-y-auto max-h-[200px] pr-2 border border-gray-100 rounded-md p-3 bg-gray-50/50">
                                    <div className="text-base text-gray-600 leading-relaxed whitespace-pre-wrap text-center">
                                        <div dangerouslySetInnerHTML={{
                                            __html: selectedProduct?.description || "Sem descrição detalhada."
                                        }} />
                                    </div>
                                </div>
                            </div>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>
        );
    }

    // --- RENDERIZAÇÃO: PERGUNTA ATUAL ---
    if (!currentQuestion) {
        return <NotFound />;
    }

    const hasAnswer = !!answers[currentQuestion.id];

    return (
        <div className="min-h-screen bg-background">
            <Header />
            <div className="container mx-auto px-4 py-8">
                <div className="max-w-3xl mx-auto">
                    <div className="mb-8">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-sm text-muted-foreground">
                                Pergunta {currentStep + 1} de {totalSteps}
                            </span>
                            <span className="text-sm font-semibold text-primary">
                                {Math.round(progress)}%
                            </span>
                        </div>
                        <Progress value={progress} className="h-2" />
                    </div>

                    <Card>
                        <CardContent className="p-8 space-y-8">
                            <h2 className="text-2xl md:text-3xl font-bold text-foreground">
                                {currentQuestion.question}
                            </h2>

                            {currentQuestion.type === "checkbox" ? (
                                <div className="space-y-3">
                                    {currentQuestion.options?.map((option) => {
                                        const isChecked = answers[currentQuestion.id]?.split(',').includes(option.value);
                                        return (
                                            <div
                                                key={option.value}
                                                className={`flex items-center space-x-3 border rounded-lg p-4 transition-colors cursor-pointer ${isChecked ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}
                                                onClick={(e) => {
                                                    if ((e.target as HTMLElement).tagName !== 'BUTTON' && (e.target as HTMLElement).dataset.state === undefined) {
                                                        handleMultipleAnswer(option.value, !isChecked);
                                                    }
                                                }}
                                            >
                                                <Checkbox
                                                    id={option.value}
                                                    checked={isChecked}
                                                    onCheckedChange={(checked) => handleMultipleAnswer(option.value, checked as boolean)}
                                                />
                                                <Label htmlFor={option.value} className="flex-1 cursor-pointer text-foreground pointer-events-none">
                                                    {option.label}
                                                </Label>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <RadioGroup
                                    value={answers[currentQuestion.id] || ""}
                                    onValueChange={handleAnswer}
                                    className="space-y-3"
                                >
                                    {currentQuestion.options?.map((option) => (
                                        <div
                                            key={option.value}
                                            className={`flex items-center space-x-3 border rounded-lg p-4 transition-colors cursor-pointer ${answers[currentQuestion.id] === option.value ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}
                                            onClick={() => handleAnswer(option.value)}
                                        >
                                            <RadioGroupItem value={option.value} id={option.value} />
                                            <Label htmlFor={option.value} className="flex-1 cursor-pointer text-foreground">
                                                {option.label}
                                            </Label>
                                        </div>
                                    ))}
                                </RadioGroup>
                            )}

                            <div className="flex gap-3 pt-4">
                                <Button variant="outline" onClick={handleBack} className="flex-1">
                                    <ArrowLeft className="mr-2 w-4 h-4" />
                                    Voltar
                                </Button>
                                <Button onClick={handleNext} disabled={!hasAnswer} className="flex-1">
                                    {currentStep === totalSteps - 1 ? "Finalizar" : "Próxima"}
                                    <ArrowRight className="ml-2 w-4 h-4" />
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
            <Footer />
        </div>
    );
};

export default Questionnaire;