import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Separator } from "@/components/ui/separator";
import { Mic, MicOff, Video, VideoOff, MonitorUp, PhoneOff, Send } from "lucide-react";

// Mock patient data
const patientData = {
    id: "1",
    name: "João Silva",
    age: 34,
    complaint: "Queda de cabelo progressiva há 6 meses"
};

const DoctorTelemedicine = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    const [isMicOn, setIsMicOn] = useState(true);
    const [isCameraOn, setIsCameraOn] = useState(true);
    const [callDuration, setCallDuration] = useState(0);
    const [chatMessage, setChatMessage] = useState("");
    const [chatMessages, setChatMessages] = useState<Array<{ sender: string; message: string }>>([
        { sender: "Sistema", message: "Consulta iniciada" }
    ]);
    const [notes, setNotes] = useState("");

    // Timer for call duration
    useEffect(() => {
        const timer = setInterval(() => {
            setCallDuration(prev => prev + 1);
        }, 1000);

        return () => clearInterval(timer);
    }, []);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const handleSendMessage = () => {
        if (chatMessage.trim()) {
            setChatMessages([...chatMessages, { sender: "Você", message: chatMessage }]);
            setChatMessage("");
        }
    };

    const handleEndCall = () => {
        navigate("/DoctorDashboard");
    };

    return (
        <div className="h-screen bg-gray-900 flex flex-col">
            {/* Main Content Area */}
            <div className="flex-1 flex gap-4 p-4">

                {/* Video Area */}
                <div className="flex-1 relative">
                    <div className="h-full bg-gray-800 rounded-lg flex items-center justify-center relative overflow-hidden">
                        {/* Video Placeholder */}
                        <div className="text-gray-500 text-6xl">
                            <Video className="h-24 w-24" />
                        </div>

                        {/* Patient Name Overlay */}
                        <div className="absolute top-4 left-4 bg-black/50 px-4 py-2 rounded-lg">
                            <p className="text-white font-semibold">{patientData.name}</p>
                        </div>

                        {/* Call Duration */}
                        <div className="absolute top-4 right-4 bg-black/50 px-4 py-2 rounded-lg">
                            <p className="text-white font-mono">{formatTime(callDuration)}</p>
                        </div>

                        {/* Doctor's Self View (Small) */}
                        <div className="absolute bottom-4 right-4 w-48 h-36 bg-gray-700 rounded-lg border-2 border-white/20 flex items-center justify-center">
                            <Video className="h-12 w-12 text-gray-500" />
                        </div>
                    </div>

                    {/* Control Bar */}
                    <div className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-gray-800/90 backdrop-blur-sm rounded-full px-6 py-3 flex gap-3 shadow-lg">
                        <Button
                            size="icon"
                            variant={isMicOn ? "secondary" : "destructive"}
                            className="rounded-full h-12 w-12"
                            onClick={() => setIsMicOn(!isMicOn)}
                        >
                            {isMicOn ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
                        </Button>

                        <Button
                            size="icon"
                            variant={isCameraOn ? "secondary" : "destructive"}
                            className="rounded-full h-12 w-12"
                            onClick={() => setIsCameraOn(!isCameraOn)}
                        >
                            {isCameraOn ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
                        </Button>

                        <Button
                            size="icon"
                            variant="secondary"
                            className="rounded-full h-12 w-12"
                        >
                            <MonitorUp className="h-5 w-5" />
                        </Button>

                        <Separator orientation="vertical" className="h-12 bg-gray-600" />

                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button
                                    size="icon"
                                    variant="destructive"
                                    className="rounded-full h-12 w-12"
                                >
                                    <PhoneOff className="h-5 w-5" />
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Encerrar teleconsulta?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        Tem certeza que deseja encerrar esta teleconsulta? Certifique-se de que todas as anotações foram salvas.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction onClick={handleEndCall} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                        Encerrar
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </div>
                </div>

                {/* Side Panel */}
                <div className="w-96">
                    <Card className="h-full">
                        <Tabs defaultValue="chat" className="h-full flex flex-col">
                            <CardHeader className="pb-3">
                                <TabsList className="grid w-full grid-cols-3">
                                    <TabsTrigger value="chat">Chat</TabsTrigger>
                                    <TabsTrigger value="notes">Anotações</TabsTrigger>
                                    <TabsTrigger value="data">Dados</TabsTrigger>
                                </TabsList>
                            </CardHeader>

                            <CardContent className="flex-1 overflow-hidden">
                                {/* Chat Tab */}
                                <TabsContent value="chat" className="h-full flex flex-col mt-0">
                                    <div className="flex-1 overflow-y-auto space-y-3 mb-4">
                                        {chatMessages.map((msg, index) => (
                                            <div key={index} className="space-y-1">
                                                <p className="text-xs font-semibold text-muted-foreground">{msg.sender}</p>
                                                <div className={`p-3 rounded-lg ${msg.sender === "Você" ? "bg-primary text-primary-foreground ml-4" : "bg-muted mr-4"}`}>
                                                    <p className="text-sm">{msg.message}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="flex gap-2">
                                        <Input
                                            placeholder="Digite sua mensagem..."
                                            value={chatMessage}
                                            onChange={(e) => setChatMessage(e.target.value)}
                                            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                                        />
                                        <Button size="icon" onClick={handleSendMessage}>
                                            <Send className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </TabsContent>

                                {/* Notes Tab */}
                                <TabsContent value="notes" className="h-full mt-0">
                                    <Textarea
                                        placeholder="Digite suas anotações durante a consulta..."
                                        className="h-full resize-none"
                                        value={notes}
                                        onChange={(e) => setNotes(e.target.value)}
                                    />
                                </TabsContent>

                                {/* Patient Data Tab */}
                                <TabsContent value="data" className="mt-0 space-y-4">
                                    <div className="space-y-3">
                                        <div>
                                            <p className="text-sm font-medium text-muted-foreground">Paciente</p>
                                            <p className="text-lg font-semibold">{patientData.name}</p>
                                        </div>
                                        <Separator />
                                        <div>
                                            <p className="text-sm font-medium text-muted-foreground">Idade</p>
                                            <p className="text-base font-semibold">{patientData.age} anos</p>
                                        </div>
                                        <Separator />
                                        <div>
                                            <p className="text-sm font-medium text-muted-foreground">Queixa principal</p>
                                            <p className="text-base">{patientData.complaint}</p>
                                        </div>
                                        <Separator />
                                        <Button variant="outline" className="w-full" onClick={() => navigate(`/medico/paciente/${id}`)}>
                                            Ver prontuário completo
                                        </Button>
                                    </div>
                                </TabsContent>
                            </CardContent>
                        </Tabs>
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default DoctorTelemedicine;
