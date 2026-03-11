import { useAuth } from "@/auth/AuthProvider";
import { useClientData } from "@/hooks/useClientData";
import { Loader2, LogOut, LayoutDashboard, FileText, Calendar, User, MessageCircle } from "lucide-react";
import { Outlet, Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Logo from "@/assets/Images/LOGO-removebg.png";
import { useState } from "react";
import ChatWidget from "@/components/chat/ChatWidget";
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Menu } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
export default function ClientLayout() {
    const { user, loading, logout } = useAuth();
    const { profile } = useClientData();
    const location = useLocation();
    const isMobile = useIsMobile();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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

    const SidebarContent = (
        <div className="p-6 flex flex-col h-full bg-white">
            <div className="mb-8 flex flex-col items-center md:items-start space-y-2">
                <Link to="/" className="hover:opacity-80 transition-opacity" onClick={() => setIsMobileMenuOpen(false)}>
                    <img src={Logo} alt="ProtocoloMed" className="h-12" />
                </Link>

                <div className="flex flex-wrap gap-2 items-center">
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
                            onClick={() => setIsMobileMenuOpen(false)}
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
                        <Link to="/planos" state={{ isUpgrade: true }} onClick={() => setIsMobileMenuOpen(false)}>
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
    );

    return (
        <div className="min-h-[100dvh] flex flex-col md:flex-row bg-gray-50/50">
            {/* MD+ DESKTOP SIDEBAR */}
            {!isMobile && (
                <aside className="w-64 bg-white border-r border-gray-100 shadow-sm flex-shrink-0 z-10 sticky top-0 h-screen">
                    {SidebarContent}
                </aside>
            )}

            {/* MOBILE HEADER */}
            {isMobile && (
                <header className="w-full bg-white border-b border-gray-100 p-4 flex items-center justify-between sticky top-0 z-50 shadow-sm">
                    <Link to="/" className="hover:opacity-80 transition-opacity">
                        <img src={Logo} alt="ProtocoloMed" className="h-8" />
                    </Link>
                    <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
                        <SheetTrigger asChild>
                            <Button variant="ghost" size="icon">
                                <Menu className="h-6 w-6 text-gray-700" />
                            </Button>
                        </SheetTrigger>
                        <SheetContent side="left" className="w-[300px] p-0">
                            <SheetTitle className="sr-only">Menu do Cliente</SheetTitle>
                            <SheetDescription className="sr-only">Navegação para o painel do cliente</SheetDescription>
                            {SidebarContent}
                        </SheetContent>
                    </Sheet>
                </header>
            )}

            {/* MAIN CONTENT AREA */}
            <main className="flex-1 p-4 md:p-8 overflow-y-auto max-h-[100dvh] relative">
                <Outlet />
            </main>

            {/* Chatbot apenas para clientes logados */}
            <ChatWidget />
        </div>
    );
}
