import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/auth/AuthProvider";
import { useClientData } from "@/hooks/useClientData";
import { Link } from "react-router-dom";
import { ShoppingBag, FileText, History, Crown, Star, MessageCircle, Calendar } from "lucide-react";

export default function DashboardPlus() {
    const { user } = useAuth();
    const { answers, loading } = useClientData();

    if (loading) return null;

    return (
        <div className="space-y-8 animate-in fade-in bg-gradient-to-br from-slate-50 to-slate-100/50 -m-8 p-8 min-h-[calc(100vh-64px)]">
            {/* HEADER PLUS */}
            <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                    <Crown className="w-6 h-6 text-yellow-500 fill-yellow-500" />
                    <h1 className="text-4xl font-bold text-slate-900">Olá, {user?.full_name?.split(" ")[0] || "Membro Plus"}!</h1>
                </div>
                <p className="text-xl text-slate-600">Seu status premium garante prioridade total.</p>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {/* WIDGET STATUS PREMIUM */}
                <Card className="col-span-2 border-l-4 border-l-yellow-500 shadow-lg">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Star className="h-5 w-5 text-yellow-500" /> Acompanhamento Médico
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <Alert className="bg-yellow-50/50 border-yellow-200">
                            <AlertTitle className="text-yellow-800 font-bold">Monitoramento Ativo</AlertTitle>
                            <AlertDescription className="text-yellow-700">
                                Seus resultados mensais são analisados prioritariamente por nossa equipe.
                            </AlertDescription>
                        </Alert>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
                                <p className="text-xs text-muted-foreground uppercase tracking-wider">Estágio Atual</p>
                                <p className="text-2xl font-bold capitalize text-slate-800">{answers?.F1_Q2_stage?.replace('_', ' ') || "Inicial"}</p>
                            </div>
                            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
                                <p className="text-xs text-muted-foreground uppercase tracking-wider">Renovação</p>
                                <p className="text-2xl font-bold text-green-600">Automática</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>



                {/* WIDGET LINKS RÁPIDOS */}
                <Card className="col-span-3 lg:col-span-1 bg-white border-slate-200 shadow-md">
                    <CardHeader>
                        <CardTitle>Menu Rápido</CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-3">
                        <Button asChild variant="secondary" className="w-full justify-start gap-2 h-12">
                            <Link to="/SeuProtocolo">
                                <FileText className="w-5 h-5" /> Ver Meu Protocolo Completo
                            </Link>
                        </Button>
                        <Button asChild variant="ghost" className="w-full justify-start gap-2 h-10">
                            <Link to="/agendamento">
                                <History className="w-5 h-5" /> Histórico
                            </Link>
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
