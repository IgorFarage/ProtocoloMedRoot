import { Mic, MicOff, Video, VideoOff, PhoneOff } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';

export function PatientVideoScreen() {
    const [micOn, setMicOn] = useState(true);
    const [videoOn, setVideoOn] = useState(true);

    return (
        <div className="flex flex-col h-screen w-full bg-slate-950 text-white">
            {/* Header */}
            <div className="p-4 flex items-center justify-between border-b border-white/10">
                <h1 className="text-lg font-semibold">Consulta Online</h1>
                <div className="text-sm px-3 py-1 bg-green-500/20 text-green-400 rounded-full animate-pulse">
                    Online
                </div>
            </div>

            {/* Video Area */}
            <div className="flex-1 relative bg-slate-900 flex items-center justify-center p-4">
                {videoOn ? (
                    <div className="w-full h-full max-w-5xl bg-slate-800 rounded-2xl overflow-hidden relative shadow-2xl border border-white/5">
                        {/* Placeholder for Doctor's Video */}
                        <div className="absolute inset-0 flex items-center justify-center text-slate-500">
                            <span className="text-2xl animate-pulse">Aguardando vídeo do médico...</span>
                        </div>

                        {/* Patient Self-View (Picture-in-Picture style) */}
                        <div className="absolute bottom-6 right-6 w-48 h-64 bg-slate-700 rounded-xl border border-white/20 overflow-hidden shadow-lg z-10 flex items-center justify-center">
                            <span className="text-slate-400 text-sm">Sua Câmera</span>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col items-center gap-4 text-slate-500">
                        <div className="w-24 h-24 rounded-full bg-slate-800 flex items-center justify-center">
                            <VideoOff className="w-10 h-10" />
                        </div>
                        <span>Sua câmera está desativada</span>
                    </div>
                )}
            </div>

            {/* Control Bar */}
            <div className="h-24 p-6 flex items-center justify-center gap-6 border-t border-white/10 bg-slate-950">
                <Button
                    variant={micOn ? "secondary" : "destructive"}
                    size="icon"
                    className="rounded-full w-14 h-14"
                    onClick={() => setMicOn(!micOn)}
                >
                    {micOn ? <Mic className="w-6 h-6" /> : <MicOff className="w-6 h-6" />}
                </Button>
                <Button
                    variant={videoOn ? "secondary" : "destructive"}
                    size="icon"
                    className="rounded-full w-14 h-14"
                    onClick={() => setVideoOn(!videoOn)}
                >
                    {videoOn ? <Video className="w-6 h-6" /> : <VideoOff className="w-6 h-6" />}
                </Button>
                <Button
                    variant="destructive"
                    size="icon"
                    className="rounded-full w-14 h-14 Hover:bg-red-600 ml-4"
                    onClick={() => console.log("Encerrar consulta")}
                >
                    <PhoneOff className="w-6 h-6" />
                </Button>
            </div>
        </div>
    );
}
