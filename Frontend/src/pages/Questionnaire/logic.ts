// Importe as imagens corretamente
import minoxidilCpsImg from "@/assets/Produtos/MinoxidilCPS.png";
import finasteridaCpsImg from "@/assets/Produtos/FinasteridaCPS.png";
import dutasteridaCpsImg from "@/assets/Produtos/DutasteridaCPS.png";
import minoxidilSprayImg from "@/assets/Produtos/MinoxidilSpray.png";
import finasteridaSprayImg from "@/assets/Produtos/FinasteridaSpray.png";
import shampooImg from "@/assets/Produtos/SawpalmetoShampoo.png";
import biotinaImg from "@/assets/Produtos/BiotinaCPS.png";

export const getRecommendation = (answers: Record<string, string>) => {
    // --- ITENS FIXOS ---
    const shampoo = { name: "Shampoo Saw Palmetto", sub: "Café verde + Mentol", img: shampooImg };
    const biotina = { name: "Biotina 45ug", sub: "Suplemento vitamínico", img: biotinaImg };

    // --- LEITURA DAS RESPOSTAS ---
    const gender = answers["F1_Q1_gender"];
    const healthConditions = answers["F2_Q14_health_cond"] || "";
    const allergies = answers["F2_Q15_allergy"] || "";
    const hasPets = answers["F2_Q18_pets"] === "sim";
    const prevTreatmentResult = answers["F2_Q13_results"];
    const prevSubstances = answers["F2_Q12_substance"] || "";
    const scalpIssues = answers["F2_Q8_symptom"] || "";

    // Preferências
    const preferenceLevel = answers["F2_Q16_intervention"]; // dutasterida, finasterida, saw_palmetto
    const routinePriority = answers["F2_Q19_priority"]; // praticidade, efetividade, brando
    const minoxPref = answers["F2_Q17_minox_format"];

    // --- 1. VERIFICAÇÃO DE RED FLAGS COMPLEXAS (Bloqueio Total) ---
    // Algumas flags param o fluxo imediatamente
    if (healthConditions.includes("depressao")) {
        return {
            redFlag: true,
            title: "Atenção Médica Necessária",
            description: "Devido ao histórico de depressão/ansiedade, o uso de bloqueadores hormonais requer liberação psiquiátrica direta. Não podemos prescrever online."
        };
    }

    // --- 2. DEFINIÇÃO DE CONTRAINDICAÇÕES (The "No" List) ---

    // Quem não pode usar FINASTERIDA / DUTASTERIDA (ORAL OU TÓPICA)?
    const blockHormonal =
        gender === "feminino" ||
        healthConditions.includes("cancer") ||
        healthConditions.includes("hepatica") ||
        allergies.includes("finasterida") ||
        allergies.includes("dutasterida");

    // Quem não pode usar MINOXIDIL ORAL?
    const blockMinoxOral =
        healthConditions.includes("cardiaca") ||
        healthConditions.includes("renal") ||
        healthConditions.includes("hepatica") ||
        healthConditions.includes("ginecomastia") || // Pedido explícito do prompt
        allergies.includes("minoxidil");

    // Quem não pode usar MINOXIDIL TÓPICO?
    const blockMinoxTopical =
        hasPets || // Risco letal para gatos/cães
        scalpIssues.includes("psoriase") || // Irritante
        healthConditions.includes("cardiaca") || // Cautela severa -> Bloqueio por segurança online
        healthConditions.includes("ginecomastia") || // Pedido explícito do prompt
        allergies.includes("minoxidil");

    // Quem não pode usar SAW PALMETTO?
    const blockSaw =
        gender === "feminino" || // Prompt diz para evitar se risco gravidez (assumimos geral para segurança)
        healthConditions.includes("cancer") ||
        allergies.includes("saw_palmetto");

    // --- 3. LÓGICA DE SELEÇÃO DE PRODUTOS ---

    let selectedCapsule = null;
    let selectedTopical = null;

    // === SELEÇÃO CÁPSULA (ORAL) ===

    if (gender === "feminino") {
        // Mulheres: Apenas Minoxidil Oral se permitido
        if (!blockMinoxOral) {
            selectedCapsule = { name: "Minoxidil (Cápsula)", sub: "2.5mg - Vasodilatador", img: minoxidilCpsImg };
        } else {
            selectedCapsule = { name: "Biotina Potencializada", sub: "Fórmula sem Minoxidil", img: biotinaImg };
        }
    }
    else {
        // Homens
        // Tentativa 1: Dutasterida (Se preferência for alta ou "Efetividade")
        if ((preferenceLevel === "dutasterida" || routinePriority === "efetividade") && !blockHormonal) {
            selectedCapsule = { name: "Dutasterida (Cápsula)", sub: "0.5mg - Bloqueador DHT Potente", img: dutasteridaCpsImg };
        }
        // Tentativa 2: Finasterida (Padrão ou fallback da Dutasterida)
        else if (!blockHormonal && !allergies.includes("finasterida")) {
            selectedCapsule = { name: "Finasterida (Cápsula)", sub: "1mg - Bloqueador DHT Clássico", img: finasteridaCpsImg };
        }
        // Tentativa 3: Minoxidil Oral (Se hormonais bloqueados, mas Minox Oral liberado)
        // Ex: Quer praticidade mas tem alergia a Finasterida
        else if (!blockMinoxOral) {
            selectedCapsule = { name: "Minoxidil (Cápsula)", sub: "2.5mg - Estimulante Oral", img: minoxidilCpsImg };
        }
        // Tentativa 4: Saw Palmetto (Se tudo acima falhar ou preferência "Brando")
        else if (!blockSaw) {
            selectedCapsule = { name: "Saw Palmetto (Cápsula)", sub: "Fitoterápico", img: null };
        }
    }

    // === SELEÇÃO TÓPICA (SPRAY/LOÇÃO) ===

    // Lógica: Priorizar Minoxidil Tópico, salvo se Pets ou Contraindicação.
    if (!blockMinoxTopical) {
        // Se tiver preferência por Spray ou Sem Preferência
        if (minoxPref !== "comprimido") {
            selectedTopical = { name: "Minoxidil (Tópico)", sub: "5% - Solução Capilar", img: minoxidilSprayImg };
        }
    }

    // Se Minoxidil Tópico for bloqueado (ex: tem Gato), tentar Finasterida Tópica
    if (!selectedTopical && gender === "masculino" && !blockHormonal) {
        selectedTopical = { name: "Finasterida (Tópico)", sub: "Spray sem risco aos pets", img: finasteridaSprayImg };
    }

    // === CHECAGEM DE ANTERIORES (EFEITOS COLATERAIS) ===
    // Se disse que teve efeito colateral com X, não recomendar X.
    if (prevTreatmentResult === "eficaz_com") {
        if (prevSubstances.includes("finasterida") && selectedCapsule?.name.includes("Finasterida")) {
            // Troca Finasterida por Dutasterida (se puder) ou Minox Oral
            if (!blockHormonal && !allergies.includes("dutasterida")) {
                selectedCapsule = { name: "Dutasterida (Cápsula)", sub: "Alternativa à Finasterida", img: dutasteridaCpsImg };
            } else if (!blockMinoxOral) {
                selectedCapsule = { name: "Minoxidil (Cápsula)", sub: "Alternativa não hormonal", img: minoxidilCpsImg };
            }
        }
        if (prevSubstances.includes("minoxidil") && selectedTopical?.name.includes("Minoxidil")) {
            selectedTopical = null; // Remove tópico se causou irritação
        }
    }

    // Montagem final
    const products = [selectedCapsule, selectedTopical, shampoo, biotina].filter(
        (p): p is { name: string; sub: string; img: string | null } => p !== null
    );

    return {
        redFlag: false,
        title: "Seu protocolo exclusivo",
        description: "Com base na sua triagem de saúde e preferências, selecionamos os ativos mais seguros e potentes para o seu caso.",
        products: products
    };
};