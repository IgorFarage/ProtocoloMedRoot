import { Maximize, PhoneOff, AlertCircle, Loader2 } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
    ResizablePanelGroup,
    ResizablePanel,
    ResizableHandle
} from '@/components/ui/resizable';
import { DoctorPanelTabs } from './components/DoctorPanelTabs';
import { medicalService } from '@/services/medicalService';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { VideoSDKMeeting } from '@videosdk.live/rtc-js-prebuilt';

export function DoctorVideoScreen() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [roomData, setRoomData] = useState<{ url: string; token: string; patientId: string | null; appointmentId: string | null } | null>(null);
    const meetingRef = useRef<any>(null);

    // 1. Busca dados da Sala/Token (JWT VideoSDK) na API Django
    useEffect(() => {
        const fetchRoomData = async () => {
            if (!id) return;
            try {
                const data = await medicalService.getTelemedicineRoom(id);
                // No backend enviamos meetingId em "room_url" e jwt em "token" e agora "patient_id" e "appointment_id"
                if (!data.meetingId) throw new Error("ID da sala não retornado pelo servidor.");
                setRoomData({ url: data.meetingId, token: data.token, patientId: data.patientId || null, appointmentId: data.appointmentId || null });
            } catch (err: any) {
                setError(err.response?.data?.error || "Erro ao carregar a sala de consulta.");
            } finally {
                setLoading(false);
            }
        };
        fetchRoomData();
    }, [id]);

    // 2. Instancia o VideoSDK Prebuilt
    useEffect(() => {
        if (!roomData) return;

        const meeting = new VideoSDKMeeting();
        meetingRef.current = meeting;

        const config = {
            name: "Dr. Responsável",
            meetingId: roomData.url,
            apiKey: import.meta.env.VITE_VIDEOSDK_API_KEY || "dummy", // A chave pública pode ser dummy se enviamos token
            token: roomData.token, // Secure JWT gerado no Backend

            containerId: "videosdk-container", // Inject node

            micEnabled: true,
            webcamEnabled: true,
            participantCanToggleSelfWebcam: true,
            participantCanToggleSelfMic: true,

            chatEnabled: true,

            /* UI Features */
            joinScreen: {
                visible: true,
                title: "Iniciando Atendimento Médico",
                meetingUrl: window.location.href,
            },

            brandingEnabled: true,
            brandLogoURL: "https://protocolo.med.br/favicon.ico",
            brandName: "ProtocoloMed",

            permissions: {
                askToJoin: false, // Dono não pede pra entrar
                toggleParticipantMic: true,
                toggleParticipantWebcam: true,
                removeParticipant: true,
                endMeeting: true,
            },

            // Corrige aviso de ts faltando
            realtimeTranscription: {
                enabled: false,
                visible: false,
            }
        };

        meeting.init(config as any);

        // Se a API expuser evento, o typescript as vezes não cataloga, vamos usar redirect nativo ou observer
        const observer = new MutationObserver((mutations) => {
            const cont = document.getElementById("videosdk-container");
            if (cont && cont.innerHTML === '') {
                // Componente de video sumiu (Reunião Acabou)
                navigate('/medico/agenda');
            }
        });

        if (document.getElementById("videosdk-container")) {
            observer.observe(document.getElementById("videosdk-container") as Node, { childList: true });
        }

        // Cleanup: Destrói o VideoSDK frame
        return () => {
            observer.disconnect();
        };
    }, [roomData, navigate]);

    return (
        <div className="flex h-screen w-full bg-slate-50">
            <ResizablePanelGroup direction="horizontal" className="w-full h-full">

                {/* Left Panel: Video Consultation (VideoSDK) */}
                <ResizablePanel defaultSize={50} minSize={30} maxSize={70} className="flex flex-col bg-slate-950 text-white shadow-xl z-10">

                    {/* Header */}
                    <div className="p-4 flex items-center justify-between border-b border-white/10 bg-slate-900 shadow-sm">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-blue-600/20 text-blue-400 flex items-center justify-center font-bold text-lg border border-blue-500/30">
                                M
                            </div>
                            <div>
                                <h1 className="text-lg font-semibold tracking-tight text-white line-clamp-1">Consulta Ativa (VideoSDK)</h1>
                                <p className="text-xs text-slate-400">Sessão Privada e Criptografada</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <div className="hidden lg:flex text-xs px-3 py-1.5 bg-green-500/10 border border-green-500/20 text-green-400 rounded-full animate-pulse items-center gap-2 font-medium">
                                <div className="w-2 h-2 bg-green-500 rounded-full shadow-[0_0_8px_rgba(34,197,94,0.6)]"></div>
                                Sala Segura
                            </div>
                            <Button
                                variant="destructive"
                                size="sm"
                                className="font-semibold shadow-lg shadow-red-500/20"
                                onClick={() => navigate('/medico/agenda')}
                            >
                                <PhoneOff className="w-4 h-4 mr-2" />
                                Retornar
                            </Button>
                        </div>
                    </div>

                    {/* Video Area */}
                    <div className="flex-1 relative bg-black flex items-center justify-center overflow-hidden">
                        {loading && (
                            <div className="flex flex-col items-center gap-3 text-slate-400 animate-pulse">
                                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                                <p className="font-medium tracking-wide">Conectando Sala de Telemedicina...</p>
                            </div>
                        )}

                        {error && (
                            <Alert variant="destructive" className="max-w-md mx-auto border-red-500/50 bg-red-950/50 text-red-200">
                                <AlertCircle className="h-5 w-5" />
                                <AlertDescription className="ml-2 font-medium">
                                    {error}
                                </AlertDescription>
                            </Alert>
                        )}

                        <div
                            id="videosdk-container"
                            className="w-full h-full [&>iframe]:border-none [&>iframe]:w-full [&>iframe]:h-full"
                            style={{ display: (loading || error || !roomData) ? 'none' : 'block' }}
                        />

                    </div>
                </ResizablePanel>

                <ResizableHandle withHandle className="bg-slate-200/50 hover:bg-slate-300 transition-colors" />

                {/* Right Panel: Doctor Tools */}
                <ResizablePanel defaultSize={50} minSize={30} className="bg-white flex flex-col h-full z-0">
                    <DoctorPanelTabs patientId={roomData?.patientId || undefined} appointmentId={roomData?.appointmentId || undefined} />
                </ResizablePanel>
            </ResizablePanelGroup>
        </div>
    );
}
