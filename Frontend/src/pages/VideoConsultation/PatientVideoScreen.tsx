import { AlertCircle, Loader2 } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { medicalService } from '@/services/medicalService';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { VideoSDKMeeting } from '@videosdk.live/rtc-js-prebuilt';

export function PatientVideoScreen() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [roomData, setRoomData] = useState<{ url: string; token: string } | null>(null);
    const meetingRef = useRef<any>(null);

    // 1. Busca dados da Sala/Token
    useEffect(() => {
        const fetchRoomData = async () => {
            if (!id) return;
            try {
                const data = await medicalService.getTelemedicineRoom(id);
                setRoomData({ url: data.room_url, token: data.token });
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
            name: "Convidado",
            meetingId: roomData.url,
            apiKey: import.meta.env.VITE_VIDEOSDK_API_KEY || "dummy",
            token: roomData.token,

            containerId: "videosdk-container-patient",

            micEnabled: true,
            webcamEnabled: true,
            participantCanToggleSelfWebcam: true,
            participantCanToggleSelfMic: true,

            chatEnabled: true,

            joinScreen: {
                visible: true,
                title: "Iniciando Consulta ProtocoloMed",
                meetingUrl: window.location.href,
            },

            brandingEnabled: true,
            brandLogoURL: "https://protocolo.med.br/favicon.ico",
            brandName: "ProtocoloMed",

            realtimeTranscription: {
                enabled: false,
                visible: false,
            }
        };

        meeting.init(config as any);

        // Detecta saída destruindo iframe
        const observer = new MutationObserver((mutations) => {
            const cont = document.getElementById("videosdk-container-patient");
            if (cont && cont.innerHTML === '') {
                navigate('/client/schedule');
            }
        });

        if (document.getElementById("videosdk-container-patient")) {
            observer.observe(document.getElementById("videosdk-container-patient") as Node, { childList: true });
        }

        return () => {
            observer.disconnect();
        };
    }, [roomData, navigate]);

    return (
        <div className="flex h-screen w-full bg-slate-50 flex-col">

            {/* Minimal Header */}
            <div className="p-4 flex items-center justify-between bg-white border-b shadow-sm z-10 shrink-0">
                <div className="flex items-center gap-3">
                    <img src="/logoPH.png" alt="Logo" className="w-8 h-auto object-contain" />
                    <h1 className="text-xl font-bold tracking-tight text-slate-800">Teleconsulta</h1>
                </div>
            </div>

            {/* Video Area */}
            <div className="flex-1 w-full bg-slate-900 relative flex flex-col justify-center overflow-hidden">
                {loading && (
                    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-4 bg-slate-900/95 backdrop-blur-sm text-white">
                        <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
                        <p className="text-sm font-medium animate-pulse">Estabelecendo conexão segura...</p>
                    </div>
                )}

                {error && (
                    <Alert variant="destructive" className="max-w-md border-red-500/50 bg-red-950/50 text-red-200">
                        <AlertCircle className="h-5 w-5" />
                        <AlertDescription className="ml-2 font-medium">
                            {error}
                        </AlertDescription>
                    </Alert>
                )}

                {/* THE VIDEOSDK IFRAME CONTAINER */}
                <div
                    id="videosdk-container-patient"
                    className="w-full h-full [&>iframe]:border-none [&>iframe]:w-full [&>iframe]:h-full"
                    style={{ display: (loading || error || !roomData) ? 'none' : 'block' }}
                />
            </div>
        </div>
    );
}
