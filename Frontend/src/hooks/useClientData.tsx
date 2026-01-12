import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import api from "@/lib/api";
import { PRODUCT_IMAGES } from "@/lib/client-constants";

export interface ProtocolItem {
    name: string;
    sub: string;
    img: string | null;
    description?: string;
    price?: number;
}

export interface UserProfile {
    name: string;
    email: string;
    role: string;
    plan: string;
    phone?: string;
    address?: {
        street: string;
        city: string;
        state: string;
        zip: string;
        neighborhood: string;
        country: string;
    };
}

interface ClientDataContextType {
    loading: boolean;
    error: string | null;
    fullHistory: any[];
    answers: any;
    profile: UserProfile | null;
    activeProtocol: any;
    currentProtocol: ProtocolItem[] | null;
    calculateProtocol: (answers: any) => ProtocolItem[] | null;
    refreshData: () => Promise<void>;
}

const ClientDataContext = createContext<ClientDataContextType | undefined>(undefined);

export function ClientDataProvider({ children }: { children: ReactNode }) {
    const [loading, setLoading] = useState(true);
    const [fullHistory, setFullHistory] = useState<any[]>([]);
    const [answers, setAnswers] = useState<any>(null);
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [activeProtocol, setActiveProtocol] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [historyRes, profileRes, protoRes] = await Promise.allSettled([
                api.get('/accounts/questionnaires/'),
                api.get('/accounts/profile/'),
                api.get('/accounts/protocol/')
            ]);

            // 1. Histórico
            if (historyRes.status === 'fulfilled') {
                const data = historyRes.value.data;
                if (data && data.length > 0) {
                    setFullHistory(data);
                    setAnswers(data[0].answers);
                }
            } else {
                console.warn("Erro history:", historyRes.reason);
            }

            // 2. Perfil
            if (profileRes.status === 'fulfilled') {
                setProfile(profileRes.value.data);
            } else {
                console.warn("Erro profile:", profileRes.reason);
            }

            // 3. Protocolo
            if (protoRes.status === 'fulfilled') {
                const data = protoRes.value.data;
                if (data && !data.error) {
                    setActiveProtocol(data);
                }
            } else {
                console.warn("Erro protocol:", protoRes.reason);
            }

        } catch (err) {
            console.error("Erro geral client data:", err);
            setError("Erro ao carregar dados.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const calculateProtocol = (targetAnswers: any): ProtocolItem[] | null => {
        if (!targetAnswers) return null;

        const DESC_MAP: Record<string, string> = {
            "Shampoo Saw Palmetto": "<p>Shampoo fortificante que auxilia no controle da oleosidade e fortalecimento dos fios.</p>",
            "Biotina 45ug": "<p>Suplemento essencial para a saúde dos cabelos e unhas.</p>",
            "Minoxidil 2.5mg": "<p>Estimula o crescimento capilar e aumenta a vascularização do folículo.</p>",
            "Dutasterida 0.5mg": "<p>Bloqueador potente de DHT, indicado para casos de maior resistência.</p>",
            "Finasterida 1mg": "<p>Tratamento clássico para interrupção da queda androgenética.</p>",
            "Saw Palmetto": "<p>Alternativa natural para inibir a ação do DHT no couro cabeludo.</p>",
            "Loção Finasterida": "<p>Aplicação tópica direta no foco da queda, com menos efeitos sistêmicos.</p>",
            "Loção Minoxidil 5%": "<p>Uso tópico para estimular o crescimento de novos fios.</p>"
        };

        const getProd = (name: string, sub: string, imgKey: string) => ({
            name, sub, img: PRODUCT_IMAGES[imgKey], description: DESC_MAP[name] || ""
        });

        const shampoo = getProd("Shampoo Saw Palmetto", "Café verde + Mentol", "Shampoo Saw Palmetto");
        const biotina = getProd("Biotina 45ug", "Suplemento vitamínico", "Biotina 45ug");
        let selectedCapsule = null;
        let selectedSpray = null;

        const gender = targetAnswers["F1_Q1_gender"];
        const hasPets = targetAnswers["F2_Q18_pets"] === "sim";
        const allergies = targetAnswers["F2_Q15_allergy"] || "";
        const priority = targetAnswers["F2_Q19_priority"];
        const intervention = targetAnswers["F2_Q16_intervention"];

        const allergicMinoxidil = allergies.includes("minoxidil");
        const allergicFinasterida = allergies.includes("finasterida");
        const allergicDutasterida = allergies.includes("dutasterida");
        const isHighEfficacy = priority === "efetividade" || intervention === "dutasterida";

        if (gender === "feminino") {
            selectedCapsule = allergicMinoxidil
                ? { name: "Consulte Especialista", sub: "Restrição alérgica", img: null, description: "Consulte nosso suporte." }
                : getProd("Minoxidil 2.5mg", "Cápsula oral", "Minoxidil 2.5mg");
        } else {
            if (isHighEfficacy && !allergicDutasterida) {
                selectedCapsule = getProd("Dutasterida 0.5mg", "Alta eficácia", "Dutasterida 0.5mg");
            } else if (!allergicFinasterida) {
                selectedCapsule = getProd("Finasterida 1mg", "Bloqueador DHT", "Finasterida 1mg");
            } else {
                selectedCapsule = !allergicMinoxidil
                    ? getProd("Minoxidil 2.5mg", "Estimulante oral", "Minoxidil 2.5mg")
                    : getProd("Saw Palmetto", "Alternativa natural", "Saw Palmetto");
            }
        }

        if (hasPets) {
            selectedSpray = getProd("Loção Finasterida", "Spray pet-friendly", "Loção Finasterida");
        } else {
            selectedSpray = allergicMinoxidil
                ? getProd("Loção Finasterida", "Spray tópico", "Loção Finasterida")
                : getProd("Loção Minoxidil 5%", "Spray tópico", "Loção Minoxidil 5%");
        }

        return [selectedCapsule, selectedSpray, shampoo, biotina].filter((p): p is ProtocolItem => p !== null);
    };

    const currentProtocol = calculateProtocol(answers);

    return (
        <ClientDataContext.Provider value={{
            loading, error, fullHistory, answers, profile, activeProtocol, currentProtocol, calculateProtocol, refreshData: fetchData
        }}>
            {children}
        </ClientDataContext.Provider>
    );
}

export function useClientData() {
    const context = useContext(ClientDataContext);
    if (!context) {
        throw new Error("useClientData must be used within a ClientDataProvider");
    }
    return context;
}
