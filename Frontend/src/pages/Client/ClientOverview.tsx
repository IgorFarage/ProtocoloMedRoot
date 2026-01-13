import { useClientData } from "@/hooks/useClientData";
import DashboardPlus from "./DashboardPlus";
import DashboardStandard from "./DashboardStandard";

import DashboardRecovery from "./DashboardRecovery";

export default function ClientOverview() {
    const { profile, loading } = useClientData();

    if (loading) return null; // ou um loader simples

    // Se estiver sem plano (none), e não for loading -> Mostra Recuperação
    if (!profile?.plan || profile.plan === 'none') {
        return <DashboardRecovery />;
    }

    // Prioridade total ao perfil real vindo do Backend (Bitrix Aware)
    if (profile?.plan === 'plus') {
        return <DashboardPlus />;
    }

    return <DashboardStandard />;
}
