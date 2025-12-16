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
import { Checkbox } from "@/components/ui/checkbox";

// --- IMPORTAÇÃO DOS PRODUTOS (Imagens) ---
// Certifique-se de que as imagens estão na pasta: src/assets/produtos/
import minoxidilCpsImg from "../assets/Produtos/MinoxidilCPS.png";
import finasteridaCpsImg from "../assets/Produtos/FinasteridaCPS.png";
import dutasteridaCpsImg from "../assets/Produtos/DutasteridaCPS.png";
import minoxidilSprayImg from "../assets/Produtos/MinoxidilSpray.png";
import finasteridaSprayImg from "../assets/Produtos/FinasteridaSpray.png";
import shampooImg from "../assets/Produtos/SawpalmetoShampoo.png";
import biotinaImg from "../assets/Produtos/BiotinaCPS.png";

// ===============================================
// 1. ESTRUTURA E PERGUNTAS (Questionnaire Data)
// ===============================================

interface Question {
  id: string;
  question: string;
  type?: "radio" | "checkbox";
  options?: { value: string; label: string; stopFlag?: boolean }[];
}

const questions: Question[] = [
  // ... (MANTENDO TODAS AS PERGUNTAS DO SEU CÓDIGO ORIGINAL) ...
  // FASE 1
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
  {
    id: "F2_Q12_substance", question: "Quais destas substâncias ou medicamentos você utilizou por mais tempo?",
    type: "checkbox",
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
  {
    id: "F2_Q14_health_cond", question: "Você possui diagnóstico ou histórico de alguma das condições de saúde listadas abaixo?",
    type: "checkbox",
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
    type: "checkbox",
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

  // Lógica para determinar as perguntas visíveis
  const visibleQuestions = useMemo(() => {
    let qList = [];
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];

      // Jumps
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

  // Handlers
  const handleAnswer = (value: string) => {
    setAnswers({ ...answers, [currentQuestion.id]: value });
  };

  const handleMultipleAnswer = (value: string, isChecked: boolean) => {
    const currentAnswer = answers[currentQuestion.id] || "";
    const selectedValues = currentAnswer.split(',').filter(v => v !== '');

    let newSelectedValues: string[];
    if (isChecked) {
      if (!selectedValues.includes(value)) {
        newSelectedValues = [...selectedValues, value];
      } else {
        newSelectedValues = selectedValues;
      }
    } else {
      newSelectedValues = selectedValues.filter(v => v !== value);
    }
    setAnswers({ ...answers, [currentQuestion.id]: newSelectedValues.join(',') });
  };

  const handleNext = () => {
    const currentAnswerValue = answers[currentQuestion.id];
    // Verificar Flag Vermelha
    const option = currentQuestion.options?.find(opt => currentAnswerValue.includes(opt.value) && opt.stopFlag);
    if (option) {
      setShowRedFlag(true);
      return;
    }

    let nextStep = currentStep + 1;
    if (nextStep < totalSteps) {
      setCurrentStep(nextStep);
    } else {
      // Finalização
      try {
        const raw = localStorage.getItem("submissions");
        const submissions = raw ? JSON.parse(raw) : [];
        const id = String(Date.now());
        const authUser = (() => {
          try {
            return JSON.parse(localStorage.getItem("auth_user") || "null");
          } catch { return null; }
        })();

        const submission = {
          id,
          patientName: authUser?.name,
          timestamp: Date.now(),
          answers,
        };
        submissions.unshift(submission);
        localStorage.setItem("submissions", JSON.stringify(submissions));
      } catch (e) { }

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

  // ===============================================
  // [MODIFICADO] LÓGICA DE RECOMENDAÇÃO DOS PRODUTOS
  // ===============================================
  const getRecommendation = () => {
    // 1. Produtos Fixos (Sempre inclusos)
    const shampoo = { name: "Shampoo Saw Palmetto", sub: "Café verde + Mentol", img: shampooImg };
    const biotina = { name: "Biotina 45ug", sub: "Suplemento vitamínico", img: biotinaImg };

    // Variáveis de Decisão
    let selectedCapsule = null;
    let selectedSpray = null;

    // Leitura das Respostas
    const gender = answers["F1_Q1_gender"];
    const hasPets = answers["F2_Q18_pets"] === "sim";
    const allergies = answers["F2_Q15_allergy"] || ""; // String separada por vírgulas

    // Alergias
    const allergicFinasterida = allergies.includes("finasterida");
    const allergicMinoxidil = allergies.includes("minoxidil");
    const allergicDutasterida = allergies.includes("dutasterida");

    // Prioridade e Intervenção
    const priority = answers["F2_Q19_priority"];
    const intervention = answers["F2_Q16_intervention"];
    const isHighEfficacy = priority === "efetividade" || intervention === "dutasterida";

    // --- DECISÃO DA CÁPSULA (1 item) ---
    if (gender === "feminino") {
      // Mulheres: Não usar Finasterida. Preferência Minoxidil Oral.
      if (allergicMinoxidil) {
        // Caso raro: alérgica a minoxidil, cairia para algo natural ou consulta
        selectedCapsule = { name: "Consulte Especialista", sub: "Restrição alérgica", img: null };
      } else {
        selectedCapsule = { name: "Minoxidil 2.5mg", sub: "Cápsula oral", img: minoxidilCpsImg };
      }
    } else {
      // Homens
      if (isHighEfficacy && !allergicDutasterida) {
        selectedCapsule = { name: "Dutasterida 0.5mg", sub: "Alta eficácia", img: dutasteridaCpsImg };
      } else if (!allergicFinasterida) {
        selectedCapsule = { name: "Finasterida 1mg", sub: "Bloqueador DHT", img: finasteridaCpsImg };
      } else {
        // Se alérgico a Fina/Duta, sobra Minoxidil Oral (se não for alérgico tbm)
        if (!allergicMinoxidil) {
          selectedCapsule = { name: "Minoxidil 2.5mg", sub: "Estimulante oral", img: minoxidilCpsImg };
        } else {
          selectedCapsule = { name: "Saw Palmetto", sub: "Alternativa natural", img: null };
        }
      }
    }

    // --- DECISÃO DO SPRAY (1 item) ---
    if (hasPets) {
      // Regra de Ouro: Pets = Proibido Minoxidil Tópico (Tóxico para gatos/cães)
      // Usa Finasterida Tópica
      selectedSpray = { name: "Loção Finasterida", sub: "Spray pet-friendly", img: finasteridaSprayImg };
    } else {
      // Sem pets
      if (allergicMinoxidil) {
        // Se alérgico a Minoxidil, usa Finasterida Tópica
        selectedSpray = { name: "Loção Finasterida", sub: "Spray tópico", img: finasteridaSprayImg };
      } else {
        // Padrão: Minoxidil Tópico
        selectedSpray = { name: "Loção Minoxidil 5%", sub: "Spray tó pico", img: minoxidilSprayImg };
      }
    }

    return {
      title: "Seu protocolo personalizado",
      description: "Baseado no seu perfil, criamos uma combinação de medicamentos orais, tópicos e suplementação para maximizar seus resultados com segurança.",
      // Filtra nulos caso alguma lógica falhe
      products: [selectedCapsule, selectedSpray, shampoo, biotina].filter((p): p is { name: string, sub: string, img: string | null } => p !== null)
    };
  };

  // ===============================================
  // TELAS DE RESULTADO
  // ===============================================

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
                Atenção! Necessária avaliação médica presencial
              </h2>
              <p className="text-lg text-muted-foreground">
                Sua resposta indica uma condição que **exige prioridade clínica**.
              </p>
              <div className="bg-destructive/10 rounded-lg p-6 space-y-3">
                <p className="font-semibold text-destructive">
                  Não podemos prosseguir com o protocolo online.
                </p>
                <p className="text-sm text-destructive/80">
                  É fundamental que um médico revise seu caso imediatamente.
                </p>
              </div>
              <div className="space-y-3 pt-4">
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
          <Card className="max-w-4xl mx-auto">
            <CardContent className="p-8 text-center space-y-8">
              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                <CheckCircle className="w-12 h-12 text-primary" />
              </div>

              <div className="space-y-2">
                <h2 className="text-3xl font-bold text-foreground">
                  {recommendation.title}
                </h2>
                <p className="text-muted-foreground max-w-2xl mx-auto">
                  {recommendation.description}
                </p>
              </div>

              {/* GRID DE PRODUTOS */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 mt-8">
                {recommendation.products.map((prod, index) => (
                  <div
                    key={index}
                    // [LAYOUT] Fixei a altura (h-80) e usei 'relative' para posicionar os filhos
                    className="group relative h-80 bg-secondary/20 rounded-xl border border-border overflow-hidden hover:shadow-2xl transition-all duration-500"
                  >
                    {/* CONTAINER DA IMAGEM 
                       - Normal: Tem margens (inset-4) e deixa espaço embaixo (bottom-20) para o texto.
                       - Hover: Zera as margens (inset-0) para preencher tudo e sobe o z-index.
                    */}
                    <div className="absolute inset-2 bottom-24 bg-white rounded-lg flex items-center justify-center p-1 transition-all duration-500 ease-in-out group-hover:inset-0 group-hover:bottom-0 group-hover:bg-white group-hover:z-10">
                      {prod.img ? (
                        <img
                          src={prod.img}
                          alt={prod.name}
                          // A imagem cresce um pouco mais (scale-110) para dar impacto
                          className="w-full h-full object-contain transition-transform duration-500 ease-in-out group-hover:scale-110"
                        />
                      ) : (
                        <div className="text-muted-foreground text-xs">Imagem não disponível</div>
                      )}
                    </div>

                    {/* CONTAINER DO TEXTO 
                       - Fica fixo na parte inferior (bottom-0).
                       - No hover, a opacidade vai a 0 e ele desce um pouco (translate-y-4).
                    */}
                    <div className="absolute bottom-0 left-0 right-0 h-24 flex flex-col items-center justify-center p-4 transition-all duration-300 group-hover:opacity-0 group-hover:translate-y-4">
                      <h3 className="font-bold text-sm md:text-base text-foreground mb-1 text-center leading-tight">
                        {prod.name}
                      </h3>
                      <span className="text-xs text-muted-foreground text-center">
                        {prod.sub}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="space-y-6 pt-8 border-t border-border">
                <div className="space-y-2">
                  <p className="text-lg text-foreground font-semibold">
                    Próximo passo: Identificação
                  </p>
                  <p className="text-muted-foreground">
                    Para salvar seu protocolo personalizado e agendar a consulta com o especialista, você precisa se identificar.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 justify-center w-full">
                  {/* Botão de Login (Secundário/Outline para dar contraste) */}
                  <Button
                    variant="outline"
                    size="lg"
                    className="w-full sm:w-auto border-primary/20 hover:bg-primary/5 text-foreground"
                    onClick={() => navigate("/login")}
                  >
                    Já tenho conta
                  </Button>

                  {/* Botão de Cadastro (Primário/Destaque) */}
                  <Button
                    size="lg"
                    className="w-full sm:w-auto bg-primary hover:bg-primary/90"
                    onClick={() => navigate("/register")}
                  >
                    Quero me cadastrar
                  </Button>
                </div>
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
                    const isChecked = answers[currentQuestion.id]?.includes(option.value);
                    return (
                      <div
                        key={option.value}
                        className={`flex items-center space-x-3 border rounded-lg p-4 transition-colors cursor-pointer ${isChecked ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}
                        onClick={() => handleMultipleAnswer(option.value, !isChecked)}
                      >
                        <Checkbox
                          id={option.value}
                          checked={isChecked}
                          onCheckedChange={(checked) => handleMultipleAnswer(option.value, checked as boolean)}
                        />
                        <Label htmlFor={option.value} className="flex-1 cursor-pointer text-foreground">
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