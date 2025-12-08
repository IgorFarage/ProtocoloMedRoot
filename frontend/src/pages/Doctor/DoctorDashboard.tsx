import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/auth/AuthProvider";
import { User, Calendar as CalendarIcon, List, LogOut, Upload } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

// [NOVO] Importação do placeholder para o protótipo (Verifique o caminho!)
import DoctorPlaceholder from "@/assets/Images/Medico02.jpg";

// Tipo de dados de paciente (mantido)
interface Patient {
    id: string;
    name: string;
    lastVisit: string;
    riskLevel: 'Baixo' | 'Moderado' | 'Alto';
    nextAppointment: string;
}

// Dados de Exemplo para a Lista de Pacientes (mantido)
const dummyPatients: Patient[] = [
    { id: 'p001', name: 'Maria Silva', lastVisit: '10/Nov', riskLevel: 'Moderado', nextAppointment: '15/Dez' },
    { id: 'p002', name: 'João Batista', lastVisit: '25/Out', riskLevel: 'Alto', nextAppointment: '12/Dez' },
    { id: 'p003', name: 'Lucas Costa', lastVisit: '01/Dez', riskLevel: 'Baixo', nextAppointment: '20/Jan' },
    { id: 'p004', name: 'Ana Souza', lastVisit: '20/Nov', riskLevel: 'Moderado', nextAppointment: '18/Dez' },
];

const MedicoDashboard = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [date, setDate] = useState<Date | undefined>(new Date());
    const [selectedPatient, setSelectedPatient] = useState<Patient | null>(dummyPatients[0]);

    // [ALTERADO] Define o placeholder importado como valor inicial
    const [profilePhoto, setProfilePhoto] = useState<string | null>(DoctorPlaceholder);

    // Informações do médico
    const medicoInfo = {
        name: user?.name || "Dr(a). Protótipo",
        specialty: "Dermatologia Capilar",
        crm: "123456/SP",
        email: user?.email || "medico@protocolomed.com"
    };

    const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setProfilePhoto(URL.createObjectURL(file));
            console.log("Nova foto de perfil carregada:", file.name);
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

    return (
        <div className="container mx-auto px-4 py-8 space-y-8">

            {/* Saudação do Médico */}
            <header className="space-y-2 mb-8 flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">Olá, {medicoInfo.name}!</h1>
                    <p className="text-lg text-muted-foreground">Bem-vindo(a) à sua área de gestão de pacientes.</p>
                </div>
                <Button onClick={logout} variant="outline" className="flex items-center gap-2">
                    <LogOut className="h-4 w-4" />
                    Sair
                </Button>
            </header>

            <Separator />

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

                {/* ÁREA 1: INFORMAÇÕES PESSOAIS (com Foto) */}
                <Card className="lg:col-span-1 h-fit">
                    <CardHeader>
                        <CardTitle className="text-xl font-semibold">Meu perfil</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 pt-6">

                        {/* [ALTERADO] Área de Foto de Perfil (Maior) */}
                        <div className="flex flex-col items-center gap-4">
                            <Avatar className="h-36 w-36 border-2 border-primary"> {/* TAMANHO AUMENTADO (h-36 w-36) */}
                                <AvatarImage src={profilePhoto || undefined} alt={medicoInfo.name} />
                                <AvatarFallback className="text-3xl font-bold">
                                    {medicoInfo.name.charAt(0)}
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

                        {/* Campos de Informação Pessoal (Mantidos) */}
                        <div className="space-y-3">
                            <div className="space-y-1">
                                <label className="text-sm text-muted-foreground">Especialidade</label>
                                <Input value={medicoInfo.specialty} readOnly />
                            </div>
                            <div className="space-y-1">
                                <label className="text-sm text-muted-foreground">CRM</label>
                                <Input value={medicoInfo.crm} readOnly />
                            </div>
                            <div className="space-y-1">
                                <label className="text-sm text-muted-foreground">E-mail</label>
                                <Input value={medicoInfo.email} readOnly />
                            </div>
                        </div>
                        <Button variant="secondary" className="w-full" onClick={() => navigate("/medico/configuracoes")}>Editar informações</Button>
                    </CardContent>
                </Card>

                {/* ÁREA 2: CALENDÁRIO / AGENDAMENTOS (Mantido) */}
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

                {/* ÁREA 3: LISTA E DETALHES DE PACIENTES (Mantido) */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:col-span-2 gap-6">

                    <Card className="md:col-span-1">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-xl font-semibold">Lista de pacientes</CardTitle>
                            <List className="h-5 w-5 text-primary" />
                        </CardHeader>
                        <CardContent className="pt-6">
                            <ScrollArea className="h-[450px]">
                                <ul className="space-y-2 pr-4">
                                    {dummyPatients.map((p) => (
                                        <li key={p.id}>
                                            <Button
                                                variant={selectedPatient?.id === p.id ? "secondary" : "ghost"}
                                                onClick={() => setSelectedPatient(p)}
                                                className="w-full text-left justify-between"
                                            >
                                                <span className="font-medium">{p.name}</span>
                                                <span className={getRiskColor(p.riskLevel)}>{p.lastVisit}</span>
                                            </Button>
                                        </li>
                                    ))}
                                </ul>
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
                                    <p className="text-sm text-muted-foreground">Última visita: {selectedPatient.lastVisit}</p>

                                    <Separator className="my-4" />

                                    <div className="space-y-2">
                                        <p className="font-medium">Estagio de queda:</p>
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
                                <p className="text-muted-foreground">Selecione um paciente para ver detalhes e histórico.</p>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default MedicoDashboard;