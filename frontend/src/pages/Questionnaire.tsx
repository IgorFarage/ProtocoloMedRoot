import { useState, useMemo } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { ArrowLeft, ArrowRight, CheckCircle, AlertTriangle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import NotFound from "./NotFound";
import { Checkbox } from "@/components/ui/checkbox"; // [NOVO] Importar Checkbox

// ===============================================
// 1. ESTRUTURA E PERGUNTAS (Questionnaire Data)
// ===============================================

interface Question {
  id: string;
  question: string;
  // [MODIFICADO] Adicionando 'checkbox' como tipo
  type?: "radio" | "checkbox";
  options?: { value: string; label: string; stopFlag?: boolean }[];
}

const questions: Question[] = [
  // FASE 1 (Mantida)
  {
    id: "F1_Q1_gender", question: "Por favor, selecione seu sexo biológico.",
    options: [{ value: "feminino", label: "Feminino" }, { value: "masculino", label: "Masculino" }]
  },

  {
    id: "F1_Q2_stage", question: "Observe as ilustrações abaixo. Qual delas melhor descreve o estágio atual da sua queda capilar?",
    options: [
      { value: "entradas", label: "Entradas" },
      { value: "entradas_coroa", label: "Entradas e coroa" },
      { value: "moderada", label: "Calvície moderada" },
      { value: "extrema", label: "Calvície extrema" },
      { value: "irregular", label: "Irregular", stopFlag: true },
      { value: "total", label: "Total", stopFlag: true }
    ]
  },

  {
    id: "F1_Q3_speed", question: "Você notou que a queda dos fios aconteceu lentamente ao longo do tempo ou foi algo repentino?",
    options: [
      { value: "lenta", label: "Sim, a queda está piorando lentamente." },
      { value: "repentina", label: "Não, a queda foi repentina", stopFlag: true }
    ]
  },

  {
    id: "F1_Q4_scalp", question: "Qual das opções abaixo melhor define as características naturais do seu couro cabeludo e fios?",
    options: [
      { value: "oleoso", label: "Oleoso" },
      { value: "seco", label: "Seco" },
      { value: "misto", label: "Misto" },
      { value: "nao_sei", label: "Não sei" }
    ]
  },

  {
    id: "F1_Q5_family", question: "Há casos conhecidos de calvície entre seus familiares próximos (pais, avós ou irmãos)?",
    options: [
      { value: "sim", label: "Sim" },
      { value: "nao", label: "Não" },
      { value: "nao_sei", label: "Não sei" }
    ]
  },

  {
    id: "F1_Q6_goal", question: "Qual é o seu principal objetivo ao iniciar este protocolo de tratamento?",
    options: [
      { value: "recuperar", label: "Recuperar o meu cabelo" },
      { value: "impedir", label: "Impedir que a calvície aumentar" },
      { value: "recuperar_impedir", label: "Recuperar e impedir a calvície" }
    ]
  },

  // FASE 2

  {
    id: "F2_Q7_irritation", question: "Recentemente, você notou alguma alteração, irritação ou doença no couro cabeludo ou na pele?",
    options: [{ value: "sim", label: "Sim" }, { value: "nao", label: "Não" }]
  },

  {
    id: "F2_Q8_symptom", question: "Poderia especificar qual sintoma ou condição você identificou?",
    options: [
      { value: "dor_vermelhidao", label: "Dor/vermelhidão" },
      { value: "coceira", label: "Coceira" },
      { value: "caspa", label: "Caspa" },
      { value: "psoriase", label: "Psoríase" },
      { value: "queimadura", label: "Queimadura solar" },
      { value: "queda_pelos", label: "Queda de pelos do corpo", stopFlag: true },
      { value: "outros", label: "Outros" }
    ]
  },

  {
    id: "F2_Q9_consult", question: "Você chegou a passar por uma consulta médica presencial para avaliar essa dor ou vermelhidão?",
    options: [
      { value: "sim", label: "Sim" },
      { value: "nao", label: "Não", stopFlag: true }
    ]
  },

  {
    id: "F2_Q10_steroids", question: "Você utiliza ou fez uso recente de esteroides anabolizantes para performance ou estética?",
    options: [{ value: "sim", label: "Sim" }, { value: "nao", label: "Não" }]
  },

  {
    id: "F2_Q11_prev_treat", question: "Você já realizou algum tratamento medicamentoso prévio contra a calvície?",
    options: [{ value: "sim", label: "Sim" }, { value: "nao", label: "Não" }]
  },

  // Q12: Substâncias (Múltipla Escolha)
  {
    id: "F2_Q12_substance", question: "Quais destas substâncias ou medicamentos você utilizou por mais tempo?",
    type: "checkbox", // [ALTERADO] Tipo Checkbox
    options: [
      { value: "minoxidil_5", label: "Minoxidil 5%" },
      { value: "minoxidil_oral", label: "Minoxidil oral" },
      { value: "finasterida_1mg", label: "Finasterida 1mg" },
      { value: "finasterida_topica", label: "Finasterida tópica" },
      { value: "dutasterida", label: "Dutasterida 0.5mg" },
      { value: "saw_palmetto", label: "Saw Palmetto" },
      { value: "biotina", label: "Biotina ou vitaminas" },
      { value: "shampoo", label: "Shampoo" },
      { value: "outros", label: "Outros" }
    ]
  },

  {
    id: "F2_Q13_results", question: "Como você avalia os resultados e a sua experiência geral com o tratamento prévio?",
    options: [
      { value: "eficaz_sem", label: "Foi eficaz, sem efeitos colaterais" },
      { value: "eficaz_com", label: "Foi eficaz, com efeitos colaterais" },
      { value: "nao_eficaz", label: "Não foi eficaz" }
    ]
  },

  // Q14: Condições de Saúde (Múltipla Escolha)
  {
    id: "F2_Q14_health_cond", question: "Você possui diagnóstico ou histórico de alguma das condições de saúde listadas abaixo?",
    type: "checkbox", // [ALTERADO] Tipo Checkbox
    options: [
      { value: "baixo_libido", label: "Baixo libido ou disfunção erétil" },
      { value: "ginecomastia", label: "Ginecomastia" },
      { value: "cardiaca", label: "Doença cardíaca" },
      { value: "renal", label: "Doença renal" },
      { value: "cancer", label: "Câncer" },
      { value: "hepatica", label: "Doença hepática" },
      { value: "depressao", label: "Depressão, ansiedade ou síndrome do pânico", stopFlag: true },
      { value: "covid", label: "COVID" },
      { value: "nenhuma", label: "Nenhuma dessas" }
    ]
  },

  {
    id: "F2_Q15_allergy", question: "Você tem conhecimento de alergia ou hipersensibilidade a algum destes compostos?",
    type: "checkbox", // [ALTERADO] Tipo Checkbox
    options: [
      { value: "minoxidil", label: "Minoxidil" },
      { value: "finasterida", label: "Finasterida" },
      { value: "dutasterida", label: "Dutasterida" },
      { value: "saw_palmetto", label: "Saw Palmetto" },
      { value: "lactose", label: "Lactose" },
      { value: "nenhuma", label: "Nenhuma" }
    ]
  },

  {
    id: "F2_Q16_intervention", question: "Considerando as opções abaixo, qual nível de intervenção você prefere para o seu tratamento?",
    options: [
      { value: "dutasterida", label: "Medicamento mais eficaz disponível (Dutasterida)" },
      { value: "finasterida", label: "Medicamento mais prescrito (Finasterida)" },
      { value: "saw_palmetto", label: "Medicamento natural, mas com menor eficácia (Saw Palmetto)" }
    ]
  },

  {
    id: "F2_Q17_minox_format", question: "Caso o Minoxidil seja indicado para você, em qual formato prefere utilizá-lo?",
    options: [
      { value: "comprimido", label: "Comprimido (Mais eficaz)" },
      { value: "spray", label: "Spray (Deve ser passado 2x ao dia diretamente no couro cabeludo)" },
      { value: "sem_preferencia", label: "Não tenho preferência" }
    ]
  },

  {
    id: "F2_Q18_pets", question: "Você convive com animais de estimação (cães ou gatos) em sua residência?",
    options: [{ value: "sim", label: "Sim" }, { value: "nao", label: "Não" }]
  },

  {
    id: "F2_Q19_priority", question: "O que você prioriza na sua rotina diária de cuidados?",
    options: [
      { value: "praticidade", label: "Praticidade" },
      { value: "efetividade", label: "Efetividade" },
      { value: "brando", label: "Brando" }
    ]
  }
];

const Questionnaire = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [showResults, setShowResults] = useState(false);
  const [showRedFlag, setShowRedFlag] = useState(false);
  const navigate = useNavigate();

  // Lógica para determinar as perguntas visíveis (Mantida)
  const visibleQuestions = useMemo(() => {
    let qList = [];
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];

      // Jumps (Mantidos)
      if (q.id === "F2_Q8_symptom" || q.id === "F2_Q9_consult") {
        if (answers["F2_Q7_irritation"] === "nao") continue;
      }
      if (q.id === "F2_Q9_consult") {
        if (answers["F2_Q8_symptom"] !== "dor_vermelhidao") continue;
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

  // 1. Lógica para respostas únicas (Rádio)
  const handleAnswer = (value: string) => {
    setAnswers({ ...answers, [currentQuestion.id]: value });
  };

  // 2. [NOVA LÓGICA] Lógica para respostas múltiplas (Checkbox)
  const handleMultipleAnswer = (value: string, isChecked: boolean) => {
    const currentAnswer = answers[currentQuestion.id] || "";
    // Transforma a string salva em um array, removendo vazios
    const selectedValues = currentAnswer.split(',').filter(v => v !== '');

    let newSelectedValues: string[];

    if (isChecked) {
      // Adiciona valor se marcado e não estiver presente
      if (!selectedValues.includes(value)) {
        newSelectedValues = [...selectedValues, value];
      } else {
        newSelectedValues = selectedValues;
      }
    } else {
      // Remove valor se desmarcado
      newSelectedValues = selectedValues.filter(v => v !== value);
    }

    // Salva o novo array como uma string separada por vírgulas
    setAnswers({ ...answers, [currentQuestion.id]: newSelectedValues.join(',') });
  };


  const handleNext = () => {
    const currentAnswerValue = answers[currentQuestion.id];

    // 1. Verificar Flag Vermelha (Funciona para radio e checkbox, pois verifica a string)
    const option = currentQuestion.options?.find(opt => currentAnswerValue.includes(opt.value) && opt.stopFlag);
    if (option) { // Verifica se alguma opção selecionada tem a flag vermelha
      setShowRedFlag(true);
      return;
    }

    let nextStep = currentStep + 1;

    // 2. Lógica de Navegação
    if (nextStep < totalSteps) {
      setCurrentStep(nextStep);
    } else {
      // Finalização (Mantida)
      try {
        const raw = localStorage.getItem("submissions");
        const submissions = raw ? JSON.parse(raw) : [];
        const id = String(Date.now());
        const authUser = (() => {
          try {
            return JSON.parse(localStorage.getItem("auth_user") || "null");
          } catch {
            return null;
          }
        })();

        const submission = {
          id,
          patientName: authUser?.name,
          timestamp: Date.now(),
          answers,
        };
        submissions.unshift(submission);
        localStorage.setItem("submissions", JSON.stringify(submissions));
      } catch (e) {
        // ignora erros de armazenamento
      }

      setShowResults(true);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    } else {
      navigate("/");
    }
  };

  const getRecommendation = () => {
    // Lógica de recomendação (Mantida)
    const hasFamilyHistory = answers.F1_Q5_family === "sim";
    const prioritizesEfficacy = answers.F2_Q19_priority === "efetividade" || answers.F2_Q16_intervention === "dutasterida";

    if (hasFamilyHistory && prioritizesEfficacy) {
      return {
        title: "Tratamento Intensivo (Máxima Eficácia)",
        description: "Suas prioridades e histórico sugerem um protocolo que visa a máxima eficácia, ideal para casos com predisposição genética.",
        products: ["Dutasterida 0.5mg", "Minoxidil Oral", "Protocolo de acompanhamento"]
      };
    } else if (answers.F1_Q6_goal === "recuperar") {
      return {
        title: "Tratamento com Foco em Recuperação",
        description: "Recomendamos um tratamento combinado com foco em estimular o crescimento e bloquear a progressão da queda.",
        products: ["Finasterida 1mg", "Minoxidil 5%", "Vitaminas capilares"]
      };
    } else {
      return {
        title: "Protocolo Estabilizador e Preventivo",
        description: "Um protocolo focado em estabilizar a queda e manter a saúde capilar atual é o mais indicado neste momento.",
        products: ["Saw Palmetto", "Minoxidil Tópico 3%", "Shampoo especial"]
      };
    }
  };

  // Telas de Resultados (Mantidas)

  if (showRedFlag) {
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
                Atenção! Necessária Avaliação Médica Presencial
              </h2>

              <p className="text-lg text-muted-foreground">
                Sua resposta indica uma condição que **exige prioridade clínica**.
              </p>

              <div className="bg-destructive/10 rounded-lg p-6 space-y-3">
                <p className="font-semibold text-destructive">
                  Não podemos prosseguir com o protocolo online.
                </p>
                <p className="text-sm text-destructive/80">
                  É fundamental que um médico revise seu caso imediatamente para descartar ou tratar causas subjacentes graves.
                </p>
              </div>

              <div className="space-y-3 pt-4">
                <Button size="lg" className="w-full sm:w-auto bg-destructive hover:bg-destructive/80">
                  Entrar em Contato com Suporte Agora
                </Button>
                <Button variant="ghost" onClick={() => navigate("/")} className="w-full sm:w-auto">
                  Voltar para a Home
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (showResults) {
    const recommendation = getRecommendation();

    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-12">
          <Card className="max-w-3xl mx-auto">
            <CardContent className="p-8 text-center space-y-6">
              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                <CheckCircle className="w-12 h-12 text-primary" />
              </div>

              <h2 className="text-3xl font-bold text-foreground">
                Avaliação Completa!
              </h2>

              <div className="bg-secondary/30 rounded-lg p-6 text-left space-y-4">
                <h3 className="text-2xl font-semibold text-primary">
                  {recommendation.title}
                </h3>
                <p className="text-muted-foreground">
                  {recommendation.description}
                </p>

                <div className="space-y-2">
                  <p className="font-semibold text-foreground">Produtos recomendados:</p>
                  <ul className="space-y-2">
                    {recommendation.products.map((product, index) => (
                      <li key={index} className="flex items-center gap-2">
                        <CheckCircle className="w-5 h-5 text-primary" />
                        <span className="text-foreground">{product}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="space-y-3 pt-4">
                <p className="text-lg text-foreground font-semibold">
                  Próximo Passo: Consulta Médica
                </p>
                <p className="text-muted-foreground">
                  Um dermatologista irá revisar suas respostas e criar seu plano de tratamento personalizado.
                </p>
                <Button size="lg" className="w-full sm:w-auto">
                  Agendar Consulta Médica
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // ===============================================
  // TELA DO QUESTIONÁRIO (Renderização)
  // ===============================================

  if (!currentQuestion) {
    return <NotFound />;
  }

  // Verifica se a resposta não está vazia
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

              {/* [NOVA RENDERIZAÇÃO] Checkbox ou RadioGroup */}
              {currentQuestion.type === "checkbox" ? (
                // Renderização para Múltipla Escolha (Checkbox)
                <div className="space-y-3">
                  {currentQuestion.options?.map((option) => {
                    const isChecked = answers[currentQuestion.id]?.includes(option.value);

                    return (
                      <div
                        key={option.value}
                        className="flex items-center space-x-3 border border-border rounded-lg p-4 hover:border-primary transition-colors cursor-pointer"
                        // Chama o handler de checkbox
                        onClick={() => handleMultipleAnswer(option.value, !isChecked)}
                      >
                        <Checkbox
                          id={option.value}
                          checked={isChecked}
                          // Previne que o clique do Checkbox cause um segundo toggle
                          onCheckedChange={(checked) => handleMultipleAnswer(option.value, checked as boolean)}
                        />
                        <Label
                          htmlFor={option.value}
                          className="flex-1 cursor-pointer text-foreground"
                        >
                          {option.label}
                        </Label>
                      </div>
                    );
                  })}
                </div>
              ) : (
                // Renderização para Escolha Única (RadioGroup - tipo padrão)
                <RadioGroup
                  value={answers[currentQuestion.id] || ""}
                  onValueChange={handleAnswer}
                  className="space-y-3"
                >
                  {currentQuestion.options?.map((option) => (
                    <div
                      key={option.value}
                      className="flex items-center space-x-3 border border-border rounded-lg p-4 hover:border-primary transition-colors cursor-pointer"
                      onClick={() => handleAnswer(option.value)}
                    >
                      <RadioGroupItem value={option.value} id={option.value} />
                      <Label
                        htmlFor={option.value}
                        className="flex-1 cursor-pointer text-foreground"
                      >
                        {option.label}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              )}

              <div className="flex gap-3 pt-4">
                <Button
                  variant="outline"
                  onClick={handleBack}
                  className="flex-1"
                >
                  <ArrowLeft className="mr-2 w-4 h-4" />
                  Voltar
                </Button>
                <Button
                  onClick={handleNext}
                  disabled={!hasAnswer}
                  className="flex-1"
                >
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