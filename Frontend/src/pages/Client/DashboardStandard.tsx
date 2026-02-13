import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { DoctorProfileModal } from "@/components/client/DoctorProfileModal";
import { useAuth } from "@/auth/AuthProvider";
import { useClientData } from "@/hooks/useClientData";
import { Link } from "react-router-dom";
import { ShoppingBag, FileText, History, Calendar, Stethoscope, MessageCircle } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function DashboardStandard() {
    const { user } = useAuth();
    const { answers, profile, loading } = useClientData();
    const [selectedDoctor, setSelectedDoctor] = useState<{ data: any, role: string } | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const handleDoctorClick = (doctor: any, role: string) => {
        if (!doctor?.name) return;
        setSelectedDoctor({ data: doctor, role });
        setIsModalOpen(true);
    };

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

                {/* WIDGET EQUIPE MÉDICA (IGUAL AO PLUS) */}
                <Card className="col-span-2 border-l-4 border-l-blue-500 shadow-lg">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Stethoscope className="h-5 w-5 text-blue-500" /> Minha Equipe Multidisciplinar
                        </CardTitle>
                        <CardDescription>Profissionais dedicados ao seu tratamento.</CardDescription>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Tricologista */}
                        <div
                            className="flex items-center gap-4 p-4 rounded-xl border bg-white shadow-sm hover:shadow-md transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98] relative group"
                        >
                            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Link to="/agendamento" state={{ doctorId: profile?.medical_team?.trichologist?.id }}>
                                    <Button size="sm" variant="secondary">Agendar</Button>
                                </Link>
                            </div>

                            <div className="flex items-center gap-4" onClick={() => handleDoctorClick(profile?.medical_team?.trichologist, "Tricologista")}>
                                <Avatar className="h-14 w-14 border-2 border-blue-100">
                                    <AvatarImage src={profile?.medical_team?.trichologist?.photo || undefined} className="object-cover" />
                                    <AvatarFallback className="bg-blue-50 text-blue-500">TRI</AvatarFallback>
                                </Avatar>
                                <div>
                                    <p className="text-xs uppercase tracking-wide font-semibold text-muted-foreground mb-0.5">Tricologista</p>
                                    <p className="font-bold text-slate-800 text-lg leading-tight">
                                        {profile?.medical_team?.trichologist?.name || "Aguardando"}
                                    </p>
                                    {profile?.medical_team?.trichologist?.crm && (
                                        <p className="text-xs text-slate-400">CRM: {profile.medical_team.trichologist.crm}</p>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Nutricionista */}
                        <div
                            className="flex items-center gap-4 p-4 rounded-xl border bg-white shadow-sm hover:shadow-md transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98] relative group"
                        >
                            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Link to="/agendamento" state={{ doctorId: profile?.medical_team?.nutritionist?.id }}>
                                    <Button size="sm" variant="secondary">Agendar</Button>
                                </Link>
                            </div>

                            <div className="flex items-center gap-4" onClick={() => handleDoctorClick(profile?.medical_team?.nutritionist, "Nutricionista")}>
                                <Avatar className="h-14 w-14 border-2 border-green-100">
                                    <AvatarImage src={profile?.medical_team?.nutritionist?.photo || undefined} className="object-cover" />
                                    <AvatarFallback className="bg-green-50 text-green-500">NUT</AvatarFallback>
                                </Avatar>
                                <div>
                                    <p className="text-xs uppercase tracking-wide font-semibold text-muted-foreground mb-0.5">Nutricionista</p>
                                    <p className="font-bold text-slate-800 text-lg leading-tight">
                                        {profile?.medical_team?.nutritionist?.name || "Aguardando"}
                                    </p>
                                    {profile?.medical_team?.nutritionist?.crm && (
                                        <p className="text-xs text-slate-400">CRN: {profile.medical_team.nutritionist.crm}</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* WIDGET LINKS RÁPIDOS (IGUAL AO PLUS) */}
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
                                <MessageCircle className="w-5 h-5" /> Canal Médico
                            </Link>
                        </Button>
                        <Button asChild variant="ghost" className="w-full justify-start gap-2 h-10">
                            <Link to="/agendamento">
                                <History className="w-5 h-5" /> Histórico
                            </Link>
                        </Button>
                        <Button asChild variant="ghost" className="w-full justify-start gap-2 h-10">
                            <Link to="/perfil">
                                <Calendar className="w-5 h-5" /> Meus Dados
                            </Link>
                        </Button>
                    </CardContent>
                </Card>
            </div>
            <DoctorProfileModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                doctor={selectedDoctor?.data}
                roleLabel={selectedDoctor?.role || ""}
            />
        </div>
    );
}
