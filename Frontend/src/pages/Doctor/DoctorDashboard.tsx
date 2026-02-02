import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/auth/AuthProvider";
import { User, Calendar as CalendarIcon, List, LogOut, Upload, Loader2, RefreshCw } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import api from "@/lib/api";

import DoctorPlaceholder from "@/assets/Images/Medico02.jpg";

interface Patient {
    id: string;
    name: string;
    lastVisit: string;
    riskLevel: 'Baixo' | 'Moderado' | 'Alto';
    nextAppointment: string;
    email: string;
}

interface DoctorStats {
    total_patients: number;
    appointments_today: number;
}

interface DoctorInfo {
    name: string;
    email: string;
    crm: string;
    specialty: string;
}

const MedicoDashboard = () => {
    const { logout } = useAuth();
    const navigate = useNavigate();
    const [date, setDate] = useState<Date | undefined>(new Date());

    // State for Real Data
    const [loading, setLoading] = useState(true);
    const [doctorInfo, setDoctorInfo] = useState<DoctorInfo | null>(null);
    const [stats, setStats] = useState<DoctorStats | null>(null);
    const [patients, setPatients] = useState<Patient[]>([]);
    const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
    const [profilePhoto, setProfilePhoto] = useState<string | null>(DoctorPlaceholder); // TODO: Fetch from backend

    const fetchData = async () => {
        setLoading(true);
        try {
            const response = await api.get('/medical/doctor/dashboard/');
            const data = response.data;

            setDoctorInfo(data.doctor);
            setStats(data.stats);
            setPatients(data.patients);

            // Select first patient by default if available
            if (data.patients.length > 0 && !selectedPatient) {
                setSelectedPatient(data.patients[0]);
            }
        } catch (error) {
            console.error("Erro ao carregar dashboard:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setProfilePhoto(URL.createObjectURL(file));
            console.log("Nova foto de perfil carregada:", file.name);
            // TODO: Upload to backend
        }
    };

    const getRiskColor = (level: string) => {
        switch (level) {
            case 'Alto': return 'text-destructive font-bold';
            case 'Moderado': return 'text-orange-500 font-bold';
            case 'Baixo': return 'text-green-500 font-bold';
            default: return 'text-muted-foreground';
        }
    };

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-8 space-y-8">

            {/* Saudação do Médico */}
            <header className="space-y-2 mb-8 flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">Olá, {doctorInfo?.name || "Dr(a)."}!</h1>
                    <p className="text-lg text-muted-foreground">
                        {stats ? `${stats.total_patients} pacientes totais • ${stats.appointments_today} agendamentos hoje` : "Bem-vindo(a) à sua área de gestão."}
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button onClick={fetchData} variant="outline" size="icon" title="Atualizar">
                        <RefreshCw className="h-4 w-4" />
                    </Button>
                    <Button onClick={logout} variant="outline" className="flex items-center gap-2">
                        <LogOut className="h-4 w-4" />
                        Sair
                    </Button>
                </div>
            </header>

            <Separator />

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

                {/* ÁREA 1: INFORMAÇÕES PESSOAIS */}
                <Card className="lg:col-span-1 h-fit">
                    <CardHeader>
                        <CardTitle className="text-xl font-semibold">Meu perfil</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 pt-6">

                        <div className="flex flex-col items-center gap-4">
                            <Avatar className="h-36 w-36 border-2 border-primary">
                                <AvatarImage src={profilePhoto || undefined} alt={doctorInfo?.name} />
                                <AvatarFallback className="text-3xl font-bold">
                                    {doctorInfo?.name?.charAt(0)}
                                </AvatarFallback>
                            </Avatar>

                            <label className="flex items-center gap-2 text-sm text-primary cursor-pointer hover:underline">
                                <Upload className="h-4 w-4" />
                                {profilePhoto === DoctorPlaceholder ? "Adicionar Foto" : "Trocar Foto"}
                                <Input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={handlePhotoUpload}
                                />
                            </label>
                        </div>

                        <Separator />

                        <div className="space-y-3">
                            <div className="space-y-1">
                                <label className="text-sm text-muted-foreground">Especialidade</label>
                                <Input value={doctorInfo?.specialty} readOnly />
                            </div>
                            <div className="space-y-1">
                                <label className="text-sm text-muted-foreground">CRM</label>
                                <Input value={doctorInfo?.crm} readOnly />
                            </div>
                            <div className="space-y-1">
                                <label className="text-sm text-muted-foreground">E-mail</label>
                                <Input value={doctorInfo?.email} readOnly />
                            </div>
                        </div>
                        <Button variant="secondary" className="w-full" onClick={() => navigate("/medico/configuracoes")}>Editar informações</Button>
                    </CardContent>
                </Card>

                {/* ÁREA 2: CALENDÁRIO */}
                <Card className="lg:col-span-1 h-fit">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-xl font-semibold">Minha agenda</CardTitle>
                        <CalendarIcon className="h-5 w-5 text-primary" />
                    </CardHeader>
                    <CardContent className="pt-6 flex justify-center">
                        <Calendar
                            mode="single"
                            selected={date}
                            onSelect={setDate}
                            className="rounded-md border shadow"
                        />
                    </CardContent>
                    <CardFooter>
                        <Link to="/medico/agenda" className="w-full">
                            <Button variant="ghost" className="w-full">Ver todos agendamentos</Button>
                        </Link>
                    </CardFooter>
                </Card>

                {/* ÁREA 3: LISTA E DETALHES DE PACIENTES */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:col-span-2 gap-6">

                    <Card className="md:col-span-1">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-xl font-semibold">Lista de pacientes</CardTitle>
                            <List className="h-5 w-5 text-primary" />
                        </CardHeader>
                        <CardContent className="pt-6">
                            <ScrollArea className="h-[450px]">
                                {patients.length === 0 ? (
                                    <p className="text-center text-muted-foreground py-8">Nenhum paciente encontrado.</p>
                                ) : (
                                    <ul className="space-y-2 pr-4">
                                        {patients.map((p) => (
                                            <li key={p.id}>
                                                <Button
                                                    variant={selectedPatient?.id === p.id ? "secondary" : "ghost"}
                                                    onClick={() => setSelectedPatient(p)}
                                                    className="w-full text-left justify-between h-auto py-3"
                                                >
                                                    <div className="flex flex-col items-start">
                                                        <span className="font-medium truncate max-w-[120px]">{p.name}</span>
                                                        <span className="text-xs text-muted-foreground truncate max-w-[120px]">{p.email}</span>
                                                    </div>
                                                    <div className="flex flex-col items-end">
                                                        <span className={`text-xs ${getRiskColor(p.riskLevel)}`}>{p.riskLevel}</span>
                                                        <span className="text-xs text-muted-foreground">{p.lastVisit}</span>
                                                    </div>
                                                </Button>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </ScrollArea>
                        </CardContent>
                    </Card>

                    <Card className="md:col-span-1">
                        <CardHeader>
                            <CardTitle className="text-xl font-semibold">Detalhes do paciente</CardTitle>
                        </CardHeader>
                        <CardContent className="pt-6 space-y-4">
                            {selectedPatient ? (
                                <div>
                                    <h3 className="text-2xl font-bold mb-2">{selectedPatient.name}</h3>
                                    <p className="text-sm text-muted-foreground">{selectedPatient.email}</p>
                                    <p className="text-sm text-muted-foreground mt-1">Última visita: {selectedPatient.lastVisit}</p>

                                    <Separator className="my-4" />

                                    <div className="space-y-2">
                                        <p className="font-medium">Risco (Baseado no histórico):</p>
                                        <span className={`text-lg ${getRiskColor(selectedPatient.riskLevel)}`}>
                                            {selectedPatient.riskLevel}
                                        </span>
                                    </div>

                                    <Separator className="my-4" />

                                    <div className="space-y-2">
                                        <p className="font-medium">Próxima consulta:</p>
                                        <span className="text-lg font-semibold text-primary">
                                            {selectedPatient.nextAppointment}
                                        </span>
                                    </div>

                                    <Separator className="my-4" />

                                    <div className="space-y-2">
                                        <p className="font-medium">Ações:</p>
                                        <Button
                                            className="w-full"
                                            variant="default"
                                            onClick={() => navigate(`/medico/paciente/${selectedPatient.id}`)}
                                        >
                                            Ver histórico completo
                                        </Button>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-[300px] text-center text-muted-foreground">
                                    <User className="h-12 w-12 mb-4 opacity-20" />
                                    <p>Selecione um paciente para ver detalhes.</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default MedicoDashboard;