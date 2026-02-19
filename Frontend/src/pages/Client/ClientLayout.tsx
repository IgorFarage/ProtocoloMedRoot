import { useAuth } from "@/auth/AuthProvider";
import { useClientData } from "@/hooks/useClientData";
import { Loader2, LogOut, LayoutDashboard, FileText, Calendar, User, MessageCircle } from "lucide-react";
import { Outlet, Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
const Logo = "/Images/LOGO-removebg.png";
import ChatWidget from "@/components/chat/ChatWidget";

export default function ClientLayout() {
    const { user, loading, logout } = useAuth();
    const { profile } = useClientData();
    const location = useLocation();

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="animate-spin h-8 w-8 text-primary" />
            </div>
        );
    }

    const hasActivePlan = profile?.plan && profile.plan !== 'none';
    const isPlus = profile?.plan === 'plus';
    const isPending = profile?.pending_transaction?.exists && !hasActivePlan;

    const navItems = [
        { label: "Visão Geral", path: "/dashboard", icon: LayoutDashboard },
        { label: "Meu Protocolo", path: "/SeuProtocolo", icon: FileText },
        // Canal Médico ONLY for Plus
        { label: "Canal Médico", path: "/agendamento", icon: MessageCircle },
        { label: "Histórico", path: "/historico", icon: Calendar },
        { label: "Minha Conta", path: "/perfil", icon: User },
    ];

    return (
        <div className="min-h-screen flex flex-col md:flex-row bg-gray-50/50">
            {/* SIDEBAR / NAVBAR */}
            <aside className="w-full md:w-64 bg-white border-r border-gray-100 shadow-sm flex-shrink-0 z-10">
                <div className="p-6 flex flex-col h-full">
                    <div className="mb-8 flex flex-col items-center md:items-start space-y-2">
                        <Link to="/" className="hover:opacity-80 transition-opacity">
                            <img src={Logo} alt="ProtocoloMed" className="h-12" />
                        </Link>

                        <div className="flex flex-wrap gap-2 items-center">
                            {/* Indicador de Status (Ativo/Inativo) */}
                            {/* Indicador de Status (Ativo/Inativo/Pendente) */}
                            <div className={`px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1.5 ${hasActivePlan
                                ? 'bg-green-100 text-green-700 border border-green-200'
                                : isPending
                                    ? 'bg-orange-100 text-orange-700 border border-orange-200'
                                    : 'bg-red-100 text-red-700 border border-red-200'
                                }`}>
                                <div className={`h-1.5 w-1.5 rounded-full ${hasActivePlan ? 'bg-green-500' : isPending ? 'bg-orange-500' : 'bg-red-500'}`} />
                                {hasActivePlan ? 'ATIVA' : isPending ? 'PENDENTE' : 'INATIVO'}
                            </div>

                            {/* Indicador Plus (Dourado) */}
                            {isPlus && (
                                <div className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-yellow-100 text-yellow-700 border border-yellow-200 flex items-center gap-1.5">
                                    <span className="text-yellow-500 text-[10px]">🌟</span>
                                    PLUS
                                </div>
                            )}
                        </div>
                    </div>

                    <nav className="space-y-1 flex-1">
                        {navItems.map((item) => {
                            const isActive = location.pathname === item.path;
                            return (
                                <Link
                                    key={item.path}
                                    to={item.path}
                                    className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${isActive
                                        ? 'bg-primary/5 text-primary'
                                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                                        }`}
                                >
                                    <item.icon className={`h-5 w-5 ${isActive ? 'text-primary' : 'text-gray-400'}`} />
                                    {item.label}
                                </Link>
                            )
                        })}
                    </nav>

                    <div className="pt-6 border-t mt-auto space-y-4">
                        {/* Botão de Upgrade (Apenas se não for Plus) */}
                        {!isPlus && hasActivePlan && (
                            <Button asChild className="w-full bg-gradient-to-r from-yellow-400 to-amber-500 hover:from-yellow-500 hover:to-amber-600 text-white font-bold shadow-md border-none animate-in fade-in zoom-in duration-500">
                                <Link to="/planos" state={{ isUpgrade: true }}>
                                    <span className="mr-2">👑</span> Upgrade Plus
                                </Link>
                            </Button>
                        )}
                        <div className="flex items-center gap-3 px-2 mb-4">
                            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                                {user?.full_name?.charAt(0) || "U"}
                            </div>
                            <div className="overflow-hidden">
                                <p className="text-sm font-medium truncate">{user?.full_name}</p>
                                <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                            </div>
                        </div>
                        <Button onClick={logout} variant="ghost" className="w-full justify-start gap-2 text-red-600 hover:text-red-700 hover:bg-red-50">
                            <LogOut className="h-4 w-4" /> Sair
                        </Button>
                    </div>
                </div>
            </aside>

            {/* MAIN CONTENT AREA */}
            <main className="flex-1 p-8 overflow-y-auto max-h-screen relative">
                <Outlet />
            </main>

            {/* Chatbot apenas para clientes logados */}
            <ChatWidget />
        </div>
    );
}
