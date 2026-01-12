import { useAuth } from "@/auth/AuthProvider";
import { Loader2, LogOut, LayoutDashboard, FileText, Calendar, User, MessageCircle } from "lucide-react";
import { Outlet, Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Logo from "@/assets/Images/LOGO-removebg.png";

export default function ClientLayout() {
    const { user, loading, logout } = useAuth();
    const location = useLocation();

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="animate-spin h-8 w-8 text-primary" />
            </div>
        );
    }

    const navItems = [
        { label: "Visão Geral", path: "/dashboard", icon: LayoutDashboard },
        { label: "Meu Protocolo", path: "/SeuProtocolo", icon: FileText },
        { label: "Canal Médico", path: "/agendamento", icon: MessageCircle },
        { label: "Histórico", path: "/historico", icon: Calendar },
        { label: "Minha Conta", path: "/perfil", icon: User },
    ];

    return (
        <div className="min-h-screen flex flex-col md:flex-row bg-gray-50/50">
            {/* SIDEBAR / NAVBAR */}
            <aside className="w-full md:w-64 bg-white border-r border-gray-100 shadow-sm flex-shrink-0 z-10">
                <div className="p-6 flex flex-col h-full">
                    <div className="mb-8">
                        <img src={Logo} alt="ProtocoloMed" className="h-12 mx-auto md:mx-0" />
                        {user?.plan === 'plus' && (
                            <Badge className="mt-2 bg-yellow-500 text-black hover:bg-yellow-600">Membro Plus</Badge>
                        )}
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

                    <div className="pt-6 border-t mt-auto">
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
            <main className="flex-1 p-8 overflow-y-auto max-h-screen">
                <Outlet />
            </main>
        </div>
    );
}
