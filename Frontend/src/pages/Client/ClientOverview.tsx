import { useAuth } from "@/auth/AuthProvider";
import DashboardPlus from "./DashboardPlus";
import DashboardStandard from "./DashboardStandard";

export default function ClientOverview() {
    const { user } = useAuth();

    // Lógica simples de exibição
    // O "Container" agora só decide qual "Home Widget" mostrar
    if (user?.plan === 'plus') {
        return <DashboardPlus />;
    }

    return <DashboardStandard />;
}
