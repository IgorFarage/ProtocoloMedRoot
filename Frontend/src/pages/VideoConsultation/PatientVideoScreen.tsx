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
    const [joined, setJoined] = useState(false);
    const meetingRef = useRef<any>(null);

    // 1. Busca dados da Sala/Token
    useEffect(() => {
        const fetchRoomData = async () => {
            if (!id) return;
            try {
                const data = await medicalService.getTelemedicineRoom(id);
                setRoomData({ url: data.meetingId, token: data.token });
            } catch (err: any) {
                setError(err.response?.data?.error || "Erro ao carregar a sala de consulta.");
            } finally {
                setLoading(false);
            }
        };
        fetchRoomData();
    }, [id]);

    // 2. Instancia o VideoSDK Prebuilt APÓS o usuário clicar em Ingressar
    useEffect(() => {
        if (!roomData || !joined) return;

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

            // Otimizações de Áudio para Volume
            micQuality: "speech_standard", // Foca voz humana cortando background
            cameraOptimizationMode: "motion", // Prioriza estabilidade do som

            chatEnabled: true,

            joinScreen: {
                visible: true,
                title: "Iniciando Consulta ProtocoloMed",
                meetingUrl: window.location.href,
            },

            leftScreenRejoinButtonEnabled: false,
            leftScreenActionButtonLabel: "Voltar para a Agenda",
            leftScreenActionButtonHref: window.location.origin + "/client/schedule",
            redirectOnLeave: window.location.origin + "/client/schedule",

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
            const iframeExists = Array.from(cont?.childNodes || []).some(node => node.nodeName === 'IFRAME');
            if (cont && cont.innerHTML === '') {
                navigate('/client/schedule');
            }
        });

        const container = document.getElementById("videosdk-container-patient");
        if (container) {
            observer.observe(container, { childList: true });
        }

        return () => {
            observer.disconnect();
        };
    }, [roomData, joined, navigate]);

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

                {/* TELA DE PRE-JOIN (Requer interação para bypass do Autoplay Policy do Firefox/Ngrok) */}
                {!loading && !error && roomData && !joined && (
                    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-6 bg-slate-900/95 backdrop-blur-sm text-white transition-opacity duration-300">
                        <div className="w-20 h-20 bg-blue-500/20 rounded-full flex items-center justify-center border border-blue-500/30 animate-pulse">
                            <AlertCircle className="w-10 h-10 text-blue-400" />
                        </div>
                        <div className="text-center max-w-md">
                            <h2 className="text-2xl font-bold mb-2">Pronto para ingressar</h2>
                            <p className="text-slate-400 text-sm mb-6">
                                O navegador exige autorização manual para liberar sua câmera e microfone nesta rede segura.
                            </p>
                            <button 
                                onClick={() => setJoined(true)}
                                className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold shadow-lg shadow-blue-500/20 transition-all active:scale-95"
                            >
                                Ingressar na Consulta
                            </button>
                        </div>
                    </div>
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
