export interface Question {
    id: string;
    question: string;
    type?: "radio" | "checkbox";
    options?: { value: string; label: string; stopFlag?: boolean }[];
}

export const questions: Question[] = [
    // --- FASE 1: TRIAGEM ---
    {
        id: "F1_Q1_gender",
        question: "Qual seu gênero?",
        options: [
            { value: "feminino", label: "Feminino" },
            { value: "masculino", label: "Masculino" }
        ]
    },
    {
        id: "F1_Q2_stage",
        question: "Qual imagem mais representa a situação do seu cabelo hoje?",
        options: [
            { value: "entradas", label: "Entradas" },
            { value: "entradas_coroa", label: "Entradas e coroa" },
            { value: "moderada", label: "Calvície moderada" },
            { value: "extrema", label: "Calvície extrema" },
            { value: "irregular", label: "Irregular", stopFlag: true }, // Flag Vermelha
            { value: "total", label: "Total", stopFlag: true }          // Flag Vermelha
        ]
    },
    {
        id: "F1_Q3_speed",
        question: "A sua perda de cabelo tem sido gradual?",
        options: [
            { value: "sim", label: "Sim, está piorando aos poucos." },
            { value: "nao", label: "Não, aconteceu em poucos dias.", stopFlag: true } // Flag Vermelha
        ]
    },
    {
        id: "F1_Q4_scalp",
        question: "Como você descreve seu tipo de cabelo?",
        options: [
            { value: "oleoso", label: "Oleoso" },
            { value: "seco", label: "Seco" },
            { value: "misto", label: "Misto" },
            { value: "nao_sei", label: "Não sei" }
        ]
    },
    {
        id: "F1_Q5_family",
        question: "Existe histórico de calvície na sua família?",
        options: [
            { value: "sim", label: "Sim" },
            { value: "nao", label: "Não" },
            { value: "nao_sei", label: "Não sei" }
        ]
    },
    {
        id: "F1_Q6_goal",
        question: "O que você busca no seu tratamento para queda capilar?",
        options: [
            { value: "recuperar", label: "Recuperar o meu cabelo" },
            { value: "impedir", label: "Impedir que a calvície aumente" },
            { value: "recuperar_impedir", label: "Recuperar e impedir a calvície" }
        ]
    },

    // --- FASE 2: ANAMNESE ---
    {
        id: "F2_Q7_irritation",
        question: "Você teve algum problema no couro cabeludo recentemente ou em outra parte do corpo?",
        options: [
            { value: "sim", label: "Sim" },
            { value: "nao", label: "Não" }
        ]
    },
    {
        id: "F2_Q8_symptom",
        question: "Qual problema você teve?",
        options: [
            { value: "dor_vermelhidao", label: "Dor/vermelhidão" },
            { value: "coceira", label: "Coceira" },
            { value: "caspa", label: "Caspa" },
            { value: "psoriase", label: "Psoríase" },
            { value: "queimadura", label: "Queimadura solar" },
            { value: "queda_pelos", label: "Queda de pelos do corpo", stopFlag: true }, // Flag Vermelha
            { value: "outros", label: "Outros" }
        ]
    },
    {
        id: "F2_Q9_consult",
        question: "Você viu um médico recentemente sobre a dor e vermelhidão do couro cabeludo?",
        options: [
            { value: "sim", label: "Sim" },
            { value: "nao", label: "Não", stopFlag: true } // Flag Vermelha
        ]
    },
    {
        id: "F2_Q10_anabolics",
        question: "Você faz uso de algum anabolizante?",
        options: [
            { value: "sim", label: "Sim" },
            { value: "nao", label: "Não" }
        ]
    },
    {
        id: "F2_Q11_prev_treat",
        question: "Você já fez algum tratamento contínuo para queda capilar?",
        options: [
            { value: "sim", label: "Sim" },
            { value: "nao", label: "Não" }
        ]
    },
    {
        id: "F2_Q12_substance",
        question: "O que você já tentou como tratamento?",
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
        id: "F2_Q13_results",
        question: "Como foi a eficácia e efeitos colaterais?",
        options: [
            { value: "eficaz_sem", label: "Foi eficaz, sem efeitos colaterais" },
            { value: "eficaz_com", label: "Foi eficaz, com efeitos colaterais" },
            { value: "nao_eficaz", label: "Não foi eficaz" }
        ]
    },
    {
        id: "F2_Q14_health_cond",
        question: "Você já teve alguma das seguintes condições médicas?",
        type: "checkbox",
        options: [
            { value: "baixo_libido", label: "Baixo libido ou disfunção erétil" },
            { value: "ginecomastia", label: "Ginecomastia" },
            { value: "cardiaca", label: "Doença cardíaca" },
            { value: "renal", label: "Doença renal" },
            { value: "cancer", label: "Câncer" },
            { value: "hepatica", label: "Doença hepática" },
            { value: "depressao", label: "Depressão, ansiedade ou síndrome do pânico" }, // Trataremos como Flag na Lógica
            { value: "covid", label: "COVID" },
            { value: "nenhuma", label: "Nenhuma dessas" }
        ]
    },
    {
        id: "F2_Q15_allergy",
        question: "Você tem alergia a algum destes?",
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
        id: "F2_Q16_intervention",
        question: "Qual a intensidade do tratamento que você prefere?",
        options: [
            { value: "dutasterida", label: "Medicamento mais eficaz disponível (Dutasterida)" },
            { value: "finasterida", label: "Medicamento mais prescrito (Finasterida)" },
            { value: "saw_palmetto", label: "Medicamento natural (Saw Palmetto)" }
        ]
    },
    {
        id: "F2_Q18_pets",
        question: "Você possui animais de estimação (Cães ou Gatos)?",
        options: [
            { value: "sim", label: "Sim" },
            { value: "nao", label: "Não" }
        ]
    },
    {
        id: "F2_Q17_minox_format",
        question: "Qual tipo de Minoxidil prefere?",
        options: [
            { value: "comprimido", label: "Comprimido (Oral)" },
            { value: "spray", label: "Spray/Loção (Tópico)" },
            { value: "sem_preferencia", label: "Não tenho preferência" }
        ]
    },
    {
        id: "F2_Q19_priority",
        question: "O que você prioriza na sua rotina?",
        options: [
            { value: "praticidade", label: "Praticidade" },
            { value: "efetividade", label: "Efetividade" },
            { value: "brando", label: "Brando (Natural)" }
        ]
    }
];