import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Video, FileText, Pill, Image as ImageIcon, Loader2 } from "lucide-react";
import api from "@/lib/api";

interface PatientPhoto {
    id: number;
    photo: string;
    taken_at: string;
}

const DoctorRecord = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    const [patient, setPatient] = useState<any>(null);
    const [loadingPatient, setLoadingPatient] = useState(true);
    const [photos, setPhotos] = useState<PatientPhoto[]>([]);
    const [loadingPhotos, setLoadingPhotos] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            if (!id) return;
            setLoadingPatient(true);
            setLoadingPhotos(true);

            try {
                // 1. Busca Dados do Paciente (Novo Endpoint)
                const patientResp = await api.get(`/medical/doctor/patients/${id}/details/`);
                setPatient(patientResp.data);

                // 2. Busca Fotos (Endpoint Existente)
                const photosResp = await api.get(`/medical/doctor/patients/${id}/photos/`);
                setPhotos(photosResp.data);
            } catch (error) {
                console.error("Erro ao carregar dados:", error);
            } finally {
                setLoadingPatient(false);
                setLoadingPhotos(false);
            }
        };

        fetchData();
    }, [id]);

    if (loadingPatient) {
        return <div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
    }

    if (!patient) {
        return <div className="text-center p-8">Paciente não encontrado.</div>;
    }

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
                            {loadingPhotos ? (
                                <div className="flex justify-center p-8">
                                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                                </div>
                            ) : photos.length > 0 ? (
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                    {photos.map((photo) => (
                                        <div key={photo.id} className="space-y-2">
                                            <div className="aspect-square rounded-lg overflow-hidden border bg-muted relative group">
                                                <img
                                                    src={photo.photo}
                                                    alt={`Foto de ${new Date(photo.taken_at).toLocaleDateString()}`}
                                                    className="w-full h-full object-cover transition-transform group-hover:scale-105"
                                                />
                                            </div>
                                            <p className="text-center font-medium text-sm">
                                                {new Date(photo.taken_at).toLocaleDateString()}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-12 text-muted-foreground">
                                    <ImageIcon className="h-12 w-12 mx-auto mb-3 opacity-20" />
                                    <p>Nenhuma foto de evolução encontrada para este paciente.</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
};

export default DoctorRecord;
