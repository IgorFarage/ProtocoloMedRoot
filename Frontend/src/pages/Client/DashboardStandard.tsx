import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/auth/AuthProvider";
import { useClientData } from "@/hooks/useClientData";
import { Link } from "react-router-dom";
import { ShoppingBag, FileText, History, Calendar, Stethoscope } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function DashboardStandard() {
    const { user } = useAuth();
    const { answers, profile, loading } = useClientData();

    if (loading) return null;

    return (
        <div className="space-y-8 animate-in fade-in">
            {/* HEADER */}
            <div>
                <div className="flex items-center gap-2">
                    <h1 className="text-3xl font-bold">Olá, {user?.full_name?.split(" ")[0] || "Paciente"}!</h1>
                    <Badge variant="outline" className="text-xs bg-gray-100 border-gray-300 text-gray-600">Standard</Badge>
                </div>
                <p className="text-lg text-muted-foreground">Bem-vindo ao seu painel de tratamento.</p>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {/* WIDGET STATUS */}
                <Card className="col-span-2">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <ShoppingBag className="h-5 w-5 text-primary" /> Status do Pedido
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <Alert className="bg-green-50 border-green-200">
                            <AlertTitle className="text-green-800">Plano Ativo</AlertTitle>
                            <AlertDescription className="text-green-700">
                                Seu protocolo está liberado e em andamento.
                            </AlertDescription>
                        </Alert>
                        <div className="flex gap-4">
                            <div className="bg-gray-50 p-4 rounded-lg flex-1">
                                <p className="text-xs text-muted-foreground">Estágio</p>
                                <p className="font-bold capitalize">{answers?.F1_Q2_stage?.replace('_', ' ') || "Inicial"}</p>
                            </div>
                            <div className="bg-gray-50 p-4 rounded-lg flex-1">
                                <p className="text-xs text-muted-foreground">Próxima Entrega</p>
                                <p className="font-bold text-gray-400">Ainda não agendada</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* WIDGET EQUIPE MÉDICA */}
                <Card className="col-span-2 shadow-sm">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Stethoscope className="h-5 w-5 text-primary" /> Minha Equipe
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Tricologista */}
                        <div className="flex items-center gap-3 p-3 rounded-lg border bg-white">
                            <Avatar className="h-10 w-10">
                                <AvatarImage src={profile?.medical_team?.trichologist?.photo || undefined} className="object-cover" />
                                <AvatarFallback>TRI</AvatarFallback>
                            </Avatar>
                            <div>
                                <p className="text-xs font-semibold text-muted-foreground uppercase">Tricologista</p>
                                <p className="font-medium text-slate-800 text-sm">
                                    {profile?.medical_team?.trichologist?.name || "Aguardando"}
                                </p>
                            </div>
                        </div>

                        {/* Nutricionista */}
                        <div className="flex items-center gap-3 p-3 rounded-lg border bg-white">
                            <Avatar className="h-10 w-10">
                                <AvatarImage src={profile?.medical_team?.nutritionist?.photo || undefined} className="object-cover" />
                                <AvatarFallback>NUT</AvatarFallback>
                            </Avatar>
                            <div>
                                <p className="text-xs font-semibold text-muted-foreground uppercase">Nutricionista</p>
                                <p className="font-medium text-slate-800 text-sm">
                                    {profile?.medical_team?.nutritionist?.name || "Aguardando"}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* WIDGET LINKS RÁPIDOS */}
                <Card className="bg-blue-50/50 border-blue-100">
                    <CardHeader>
                        <CardTitle className="text-blue-900">Acesso Rápido</CardTitle>
                        <CardDescription>Gerencie seu tratamento</CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-3">
                        <Button asChild className="w-full justify-start gap-2 bg-white text-blue-700 hover:bg-blue-100 hover:text-blue-900 shadow-sm border border-blue-200">
                            <Link to="/SeuProtocolo">
                                <FileText className="w-4 h-4" /> Ver Meu Protocolo
                            </Link>
                        </Button>
                        <Button asChild variant="outline" className="w-full justify-start gap-2 border-blue-200 text-blue-700 hover:bg-blue-50">
                            <Link to="/agendamento">
                                <History className="w-4 h-4" /> Histórico Completo
                            </Link>
                        </Button>
                        <Button asChild variant="ghost" className="w-full justify-start gap-2 text-blue-600/70 hover:text-blue-700">
                            <Link to="/perfil">
                                <Calendar className="w-4 h-4" /> Meus Dados
                            </Link>
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
