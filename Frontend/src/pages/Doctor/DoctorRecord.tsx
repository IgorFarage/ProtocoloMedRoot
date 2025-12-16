import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Video, FileText, Pill, Image as ImageIcon } from "lucide-react";

// Mock Data
const patientData = {
    id: "1",
    name: "João Silva",
    age: 34,
    photo: "https://github.com/shadcn.png", // Placeholder
    riskStatus: "Moderado",
    anamnesis: [
        { question: "Gênero", answer: "Masculino" },
        { question: "Histórico Familiar de Calvície?", answer: "Sim, pai e avô materno." },
        { question: "Já usou Minoxidil?", answer: "Não." },
        { question: "Alergias Conhecidas?", answer: "Nenhuma." },
        { question: "Nível de Estresse (1-10)", answer: "8" },
    ],
    currentProtocol: {
        name: "Protocolo Essencial - Queda Moderada",
        medications: [
            "Finasterida 1mg (Oral) - 1x ao dia",
            "Minoxidil 5% (Tópico) - 1x à noite",
            "Shampoo Antiqueda - Uso diário"
        ]
    },
    photos: [
        { month: "Mês 1", url: "https://placehold.co/150" },
        { month: "Mês 2", url: "https://placehold.co/150" },
        { month: "Mês 3", url: "https://placehold.co/150" },
    ]
};

const DoctorRecord = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    // Em uma aplicação real, buscaríamos os dados do paciente pelo ID aqui.
    // const patient = fetchPatient(id);
    const patient = patientData;

    return (
        <div className="container mx-auto px-4 py-8 space-y-6">

            {/* Header & Navigation */}
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => navigate("/DoctorDashboard")}>
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                <h1 className="text-2xl font-bold">Prontuário do Paciente</h1>
            </div>

            {/* Patient Summary Card */}
            <Card>
                <CardContent className="p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                    <div className="flex items-center gap-4">
                        <Avatar className="h-20 w-20">
                            <AvatarImage src={patient.photo} alt={patient.name} />
                            <AvatarFallback>{patient.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div className="space-y-1">
                            <h2 className="text-2xl font-bold">{patient.name}</h2>
                            <p className="text-muted-foreground">{patient.age} anos</p>
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-medium">Risco de Queda:</span>
                                <Badge variant={patient.riskStatus === "Alto" ? "destructive" : "secondary"} className={patient.riskStatus === "Moderado" ? "bg-yellow-100 text-yellow-800 hover:bg-yellow-100" : ""}>
                                    {patient.riskStatus}
                                </Badge>
                            </div>
                        </div>
                    </div>

                    <Button size="lg" className="w-full md:w-auto gap-2">
                        <Video className="h-4 w-4" />
                        Iniciar Teleconsulta
                    </Button>
                </CardContent>
            </Card>

            {/* Content Tabs */}
            <Tabs defaultValue="anamnese" className="w-full">
                <TabsList className="grid w-full grid-cols-3 lg:w-[400px]">
                    <TabsTrigger value="anamnese">Anamnese</TabsTrigger>
                    <TabsTrigger value="tratamento">Tratamento</TabsTrigger>
                    <TabsTrigger value="fotos">Galeria</TabsTrigger>
                </TabsList>

                {/* Tab: Anamnese */}
                <TabsContent value="anamnese" className="mt-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <FileText className="h-5 w-5 text-primary" />
                                Respostas do Questionário
                            </CardTitle>
                            <CardDescription>Dados coletados na triagem inicial.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-6">
                                {patient.anamnesis.map((item, index) => (
                                    <div key={index} className="space-y-1">
                                        <dt className="text-sm font-medium text-muted-foreground">{item.question}</dt>
                                        <dd className="text-base font-semibold">{item.answer}</dd>
                                    </div>
                                ))}
                            </dl>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Tab: Tratamento */}
                <TabsContent value="tratamento" className="mt-6 space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Pill className="h-5 w-5 text-primary" />
                                Protocolo Atual
                            </CardTitle>
                            <CardDescription>{patient.currentProtocol.name}</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <ul className="list-disc list-inside space-y-2">
                                {patient.currentProtocol.medications.map((med, index) => (
                                    <li key={index} className="text-base">{med}</li>
                                ))}
                            </ul>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Evolução Médica</CardTitle>
                            <CardDescription>Registre observações sobre o progresso do paciente.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <Textarea placeholder="Digite suas anotações aqui..." className="min-h-[150px]" />
                            <div className="flex justify-end">
                                <Button>Salvar Evolução</Button>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Tab: Fotos */}
                <TabsContent value="fotos" className="mt-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <ImageIcon className="h-5 w-5 text-primary" />
                                Acompanhamento Fotográfico
                            </CardTitle>
                            <CardDescription>Evolução visual do tratamento.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                {patient.photos.map((photo, index) => (
                                    <div key={index} className="space-y-2">
                                        <div className="aspect-square rounded-lg overflow-hidden border bg-muted">
                                            <img src={photo.url} alt={photo.month} className="w-full h-full object-cover" />
                                        </div>
                                        <p className="text-center font-medium text-sm">{photo.month}</p>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
};

export default DoctorRecord;
