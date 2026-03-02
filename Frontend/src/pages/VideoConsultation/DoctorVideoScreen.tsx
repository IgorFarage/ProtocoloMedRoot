import { Mic, MicOff, Video, VideoOff, PhoneOff, Maximize } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    ResizablePanelGroup,
    ResizablePanel,
    ResizableHandle
} from '@/components/ui/resizable';
import { DoctorPanelTabs } from './components/DoctorPanelTabs';

export function DoctorVideoScreen() {
    const [micOn, setMicOn] = useState(true);
    const [videoOn, setVideoOn] = useState(true);

    return (
        <div className="flex h-screen w-full bg-slate-50">
            <ResizablePanelGroup direction="horizontal" className="w-full h-full">
                {/* Left Panel: Video Consultation */}
                <ResizablePanel defaultSize={40} minSize={30} maxSize={60} className="flex flex-col bg-slate-950 text-white min-w-[30%]">
                    {/* Header */}
                    <div className="p-4 flex items-center justify-between border-b border-white/10 bg-slate-900">
                        <div>
                            <h1 className="text-lg font-semibold">Consulta em andamento</h1>
                            <p className="text-xs text-slate-400">Paciente: João Silva</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="text-xs px-2 py-1 bg-green-500/20 text-green-400 rounded-full animate-pulse flex items-center gap-1">
                                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                04:12
                            </div>
                            <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white">
                                <Maximize className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>

                    {/* Video Area */}
                    <div className="flex-1 relative bg-slate-950 flex items-center justify-center p-4">
                        <div className="w-full h-full bg-slate-800 rounded-xl overflow-hidden relative shadow-lg border border-white/5">
                            {/* Patient Video */}
                            <div className="absolute inset-0 flex items-center justify-center text-slate-500">
                                <span className="text-xl">Vídeo do Paciente</span>
                            </div>

                            {/* Doctor Self-View */}
                            <div className="absolute top-4 right-4 w-32 h-44 bg-slate-700 rounded-lg border border-white/20 overflow-hidden shadow-md z-10 flex items-center justify-center">
                                <span className="text-slate-400 text-xs text-center px-2">Sua Câmera</span>
                            </div>
                        </div>
                    </div>

                    {/* Control Bar */}
                    <div className="p-4 flex items-center justify-center gap-4 bg-slate-900 border-t border-white/10">
                        <Button
                            variant={micOn ? "secondary" : "destructive"}
                            size="icon"
                            className="rounded-full w-12 h-12"
                            onClick={() => setMicOn(!micOn)}
                        >
                            {micOn ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
                        </Button>
                        <Button
                            variant={videoOn ? "secondary" : "destructive"}
                            size="icon"
                            className="rounded-full w-12 h-12"
                            onClick={() => setVideoOn(!videoOn)}
                        >
                            {videoOn ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
                        </Button>
                        <Button
                            variant="destructive"
                            size="icon"
                            className="rounded-full w-12 h-12 hover:bg-red-600 ml-2"
                            onClick={() => console.log("Encerrar consulta")}
                        >
                            <PhoneOff className="w-5 h-5" />
                        </Button>
                    </div>
                </ResizablePanel>

                <ResizableHandle withHandle className="bg-slate-200" />

                {/* Right Panel: Doctor Tools */}
                <ResizablePanel defaultSize={60} minSize={40} className="bg-white flex flex-col h-full min-w-[40%]">
                    <DoctorPanelTabs />
                </ResizablePanel>
            </ResizablePanelGroup>
        </div>
    );
}
