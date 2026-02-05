import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { DoctorProfileModal } from "@/components/client/DoctorProfileModal";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/auth/AuthProvider";
import { useClientData } from "@/hooks/useClientData";
import { Link } from "react-router-dom";
import { ShoppingBag, FileText, History, Crown, Star, MessageCircle, Calendar, Stethoscope } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function DashboardPlus() {
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

                {/* WIDGET EQUIPE MÉDICA */}
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
                                    <AvatarImage src={profile?.medical_team?.trichologist?.photo} className="object-cover" />
                                    <AvatarFallback className="bg-blue-50 text-blue-500">TRI</AvatarFallback>
                                </Avatar>
                                <div>
                                    <p className="text-xs uppercase tracking-wide font-semibold text-muted-foreground mb-0.5">Tricologista</p>
                                    <p className="font-bold text-slate-800 text-lg leading-tight">
                                        {profile?.medical_team?.trichologist?.name || "Aguardando..."}
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
                                    <AvatarImage src={profile?.medical_team?.nutritionist?.photo} className="object-cover" />
                                    <AvatarFallback className="bg-green-50 text-green-500">NUT</AvatarFallback>
                                </Avatar>
                                <div>
                                    <p className="text-xs uppercase tracking-wide font-semibold text-muted-foreground mb-0.5">Nutricionista</p>
                                    <p className="font-bold text-slate-800 text-lg leading-tight">
                                        {profile?.medical_team?.nutritionist?.name || "Aguardando..."}
                                    </p>
                                    {profile?.medical_team?.nutritionist?.crm && (
                                        <p className="text-xs text-slate-400">CRN: {profile.medical_team.nutritionist.crm}</p>
                                    )}
                                </div>
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
            <DoctorProfileModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                doctor={selectedDoctor?.data}
                roleLabel={selectedDoctor?.role || ""}
            />
        </div>
    );
}
