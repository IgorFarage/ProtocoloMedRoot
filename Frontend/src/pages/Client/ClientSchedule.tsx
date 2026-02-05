import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useClientData } from "@/hooks/useClientData";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Calendar as CalendarIcon, ClipboardList, ShoppingBag, Camera, Upload, Clock, CheckCircle, Video, ArrowLeft } from "lucide-react";
import api from "@/lib/api";
import { ptBR } from "date-fns/locale";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface Appointment {
    id: number;
    date: string;
    time: string;
    doctor: string;
    status: 'scheduled' | 'completed' | 'cancelled';
    meeting_link?: string;
}

export default function ClientSchedule() {
    const navigate = useNavigate();
    const { loading: loadingData, profile, calculateProtocol } = useClientData() as any;
    const { toast } = useToast();

    // State para Agendamento
    const [date, setDate] = useState<Date | undefined>(new Date());
    const [slots, setSlots] = useState<string[]>([]);
    const [loadingSlots, setLoadingSlots] = useState(false);
    const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
    const [isBooking, setIsBooking] = useState(false);

    const [conflictData, setConflictData] = useState<any>(null);

    // State para Lista de Consultas
    const [myAppointments, setMyAppointments] = useState<Appointment[]>([]);
    const [loadingAppts, setLoadingAppts] = useState(false);

    const location = useLocation();
    const [selectedDoctorId, setSelectedDoctorId] = useState<string | number | null>(null);

    // Initialize from Navigation State or Default Role
    useEffect(() => {
        if (location.state?.doctorId) {
            setSelectedDoctorId(location.state.doctorId);
        } else if (profile?.medical_team?.trichologist?.id) {
            // Default to Trichologist
            setSelectedDoctorId(profile.medical_team.trichologist.id);
        }
    }, [location.state, profile]);

    // Fetch Slots quando data ou médico muda
    useEffect(() => {
        if (date && selectedDoctorId) {
            const fetchSlots = async () => {
                setLoadingSlots(true);
                try {
                    const dateStr = date.toISOString().split('T')[0];
                    const res = await api.get(`/medical/slots/?date=${dateStr}&doctor_id=${selectedDoctorId}`);
                    setSlots(res.data.slots || []);
                } catch (error) {
                    console.error("Erro ao buscar slots", error);
                    setSlots([]);
                } finally {
                    setLoadingSlots(false);
                }
            };
            fetchSlots();
        }
    }, [date, selectedDoctorId]);

    // Fetch Agendamentos ao montar
    const fetchAppointments = async () => {
        setLoadingAppts(true);
        try {
            const res = await api.get('/medical/appointments/');
            setMyAppointments(res.data);
        } catch (error) {
            console.error("Erro ao buscar agendamentos", error);
        } finally {
            setLoadingAppts(false);
        }
    };

    useEffect(() => {
        fetchAppointments();
    }, []);

    const handleBook = async () => {
        if (!date || !selectedSlot) return;
        setIsBooking(true);
        try {
            const dateStr = date.toISOString().split('T')[0];
            await api.post('/medical/appointments/', {
                date: dateStr,
                time: selectedSlot,
                doctor_id: selectedDoctorId
            });

            toast({
                title: "Agendamento Confirmado!",
                description: `Sua consulta para dia ${date.toLocaleDateString()} às ${selectedSlot} foi agendada.`,
                className: "bg-green-600 text-white"
            });

            setSelectedSlot(null);
            fetchAppointments(); // Atualiza lista
            // Atualiza slots (remove o que foi pego)
            setSlots(prev => prev.filter(s => s !== selectedSlot));

        } catch (error: any) {
            if (error.response?.data?.error === 'MONTHLY_LIMIT') {
                // Show conflict dialog
                setConflictData(error.response.data);
                // Keep selectedSlot to use in reschedule
                return;
            }

            toast({
                title: "Erro no agendamento",
                description: error.response?.data?.error || "Não foi possível reservar este horário. Tente outro.",
                variant: "destructive"
            });
        } finally {
            setIsBooking(false);
        }
    };

    const handleReschedule = async () => {
        if (!date || !selectedSlot || !conflictData) return;
        setIsBooking(true);
        try {
            const dateStr = date.toISOString().split('T')[0];
            await api.post(`/medical/appointments/${conflictData.existing_id}/reschedule/`, {
                date: dateStr,
                time: selectedSlot
            });

            toast({
                title: "Reagendamento Confirmado!",
                description: `Sua consulta foi alterada para dia ${date.toLocaleDateString()} às ${selectedSlot}.`,
                className: "bg-green-600 text-white"
            });

            setSelectedSlot(null);
            setConflictData(null);
            fetchAppointments();
            setSlots(prev => prev.filter(s => s !== selectedSlot));

        } catch (error: any) {
            toast({
                title: "Erro ao reagendar",
                description: error.response?.data?.error || "Não foi possível realizar a troca.",
                variant: "destructive"
            });
        } finally {
            setIsBooking(false);
        }
    };

    if (loadingData) {
        return (
            <div className="flex justify-center p-8">
                <Loader2 className="animate-spin h-8 w-8 text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in slide-in-from-right-4">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Agenda Médica</h1>
                    <p className="text-muted-foreground mt-1">
                        Agende suas consultas e acompanhe seu histórico.
                    </p>
                </div>
            </div>

            <Tabs defaultValue="schedule" className="w-full">
                <TabsList className="grid w-full grid-cols-2 lg:w-[400px]">
                    <TabsTrigger value="schedule">Agendar</TabsTrigger>
                    <TabsTrigger value="appointments">Minhas Consultas</TabsTrigger>
                </TabsList>

                {/* TAB 1: AGENDAR */}
                <TabsContent value="schedule" className="mt-6">
                    <div className="grid md:grid-cols-12 gap-6">
                        {/* Doctor Selector */}
                        <div className="md:col-span-12">
                            <Card className="p-4 bg-muted/20">
                                <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
                                    <div className="flex flex-col gap-1">
                                        <h3 className="font-medium">Selecione o Especialista:</h3>
                                        <p className="text-sm text-muted-foreground">Escolha com quem deseja se consultar.</p>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full sm:w-auto mt-4 sm:mt-0">
                                        {/* Tricologista */}
                                        <div
                                            onClick={() => profile?.medical_team?.trichologist && setSelectedDoctorId(profile.medical_team.trichologist.id)}
                                            className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${String(selectedDoctorId) === String(profile?.medical_team?.trichologist?.id)
                                                ? "bg-primary/5 border-primary shadow-sm ring-1 ring-primary"
                                                : "bg-white border-slate-200 hover:border-primary/50 hover:bg-slate-50"
                                                } ${!profile?.medical_team?.trichologist ? "opacity-50 cursor-not-allowed" : ""}`}
                                        >
                                            <Avatar className="h-10 w-10 border border-slate-200">
                                                <AvatarImage src={profile?.medical_team?.trichologist?.photo || undefined} />
                                                <AvatarFallback className="bg-blue-100 text-blue-600">TRI</AvatarFallback>
                                            </Avatar>
                                            <div className="flex flex-col">
                                                <span className="text-xs font-semibold text-blue-600 uppercase tracking-wider">Tricologista</span>
                                                <span className="font-medium text-sm text-slate-900 line-clamp-1">
                                                    {profile?.medical_team?.trichologist?.name || "Não atribuído"}
                                                </span>
                                            </div>
                                            {String(selectedDoctorId) === String(profile?.medical_team?.trichologist?.id) && (
                                                <div className="ml-auto text-primary">
                                                    <CheckCircle className="w-5 h-5" />
                                                </div>
                                            )}
                                        </div>

                                        {/* Nutricionista */}
                                        <div
                                            onClick={() => profile?.medical_team?.nutritionist && setSelectedDoctorId(profile.medical_team.nutritionist.id)}
                                            className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${String(selectedDoctorId) === String(profile?.medical_team?.nutritionist?.id)
                                                ? "bg-primary/5 border-primary shadow-sm ring-1 ring-primary"
                                                : "bg-white border-slate-200 hover:border-primary/50 hover:bg-slate-50"
                                                } ${!profile?.medical_team?.nutritionist ? "opacity-50 cursor-not-allowed" : ""}`}
                                        >
                                            <Avatar className="h-10 w-10 border border-slate-200">
                                                <AvatarImage src={profile?.medical_team?.nutritionist?.photo || undefined} />
                                                <AvatarFallback className="bg-green-100 text-green-600">NUT</AvatarFallback>
                                            </Avatar>
                                            <div className="flex flex-col">
                                                <span className="text-xs font-semibold text-green-600 uppercase tracking-wider">Nutricionista</span>
                                                <span className="font-medium text-sm text-slate-900 line-clamp-1">
                                                    {profile?.medical_team?.nutritionist?.name || "Não atribuído"}
                                                </span>
                                            </div>
                                            {String(selectedDoctorId) === String(profile?.medical_team?.nutritionist?.id) && (
                                                <div className="ml-auto text-primary">
                                                    <CheckCircle className="w-5 h-5" />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </Card>
                        </div>

                        {/* Calendário */}
                        <Card className="md:col-span-5 lg:col-span-4">
                            <CardContent className="p-4 flex justify-center">
                                <Calendar
                                    mode="single"
                                    selected={date}
                                    onSelect={setDate}
                                    locale={ptBR}
                                    className="rounded-md border"
                                    disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0)) || date.getDay() === 0 || date.getDay() === 6}
                                />
                            </CardContent>
                        </Card>

                        {/* Slots */}
                        <Card className="md:col-span-7 lg:col-span-8">
                            <CardHeader>
                                <CardTitle>Horários Disponíveis</CardTitle>
                                <CardDescription>
                                    Para {date ? date.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }) : "Selecione uma data"}
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                {loadingSlots ? (
                                    <div className="flex justify-center py-8"><Loader2 className="animate-spin text-primary" /></div>
                                ) : slots.length > 0 ? (
                                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                                        {slots.map(slot => (
                                            <Button
                                                key={slot}
                                                variant={selectedSlot === slot ? "default" : "outline"}
                                                onClick={() => setSelectedSlot(slot)}
                                                className={`transition-all ${selectedSlot === slot ? 'scale-105 shadow-md' : 'hover:border-primary/50'}`}
                                            >
                                                <Clock className="w-4 h-4 mr-2" />
                                                {slot}
                                            </Button>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-8 text-muted-foreground flex flex-col gap-2 items-center">
                                        <Clock className="w-8 h-8 opacity-20" />
                                        <span>Nenhum horário disponível para esta data.</span>
                                        <span className="text-sm">Tente selecionar outro dia no calendário.</span>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    {/* Dialog de Confirmação (Agendamento Normal) */}
                    <Dialog open={!!selectedSlot && !conflictData} onOpenChange={(open) => !open && setSelectedSlot(null)}>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Confirmar Agendamento</DialogTitle>
                                <DialogDescription>
                                    Você deseja agendar uma consulta para:
                                </DialogDescription>
                            </DialogHeader>
                            <div className="py-4 bg-slate-50 rounded-lg text-center space-y-2">
                                <p className="text-2xl font-bold text-slate-800">
                                    {date?.toLocaleDateString('pt-BR')}
                                </p>
                                <p className="text-4xl font-extrabold text-primary">
                                    {selectedSlot}
                                </p>
                                <p className="text-sm text-slate-500">Com Especialista</p>
                            </div>
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setSelectedSlot(null)}>Cancelar</Button>
                                <Button onClick={handleBook} disabled={isBooking}>
                                    {isBooking && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Confirmar Agendamento
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>

                    {/* Dialog de Conflito (Reagendamento) */}
                    <Dialog open={!!conflictData} onOpenChange={(open) => !open && setConflictData(null)}>
                        <DialogContent className="border-l-4 border-l-yellow-500">
                            <DialogHeader>
                                <DialogTitle className="text-yellow-700 flex items-center gap-2">
                                    <Clock className="h-5 w-5" />
                                    Limite Mensal Atingido
                                </DialogTitle>
                                <DialogDescription className="pt-2">
                                    Você já possui uma consulta com este especialista em {conflictData?.existing_date ? new Date(conflictData.existing_date).toLocaleDateString() : 'data existente'}.
                                    <br /><br />
                                    <strong>Deseja trocar o horário existente para este novo?</strong>
                                </DialogDescription>
                            </DialogHeader>
                            <div className="py-2 flex items-center justify-center gap-4 text-sm">
                                <div className="text-slate-500 line-through">
                                    {conflictData?.existing_date ? new Date(conflictData.existing_date).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : ''}
                                </div>
                                <ArrowLeft className="h-4 w-4 text-slate-400 rotate-180" />
                                <div className="font-bold text-green-600">
                                    {date?.toLocaleDateString('pt-BR')} às {selectedSlot}
                                </div>
                            </div>
                            <DialogFooter className="gap-2 sm:gap-0">
                                <Button variant="ghost" onClick={() => setConflictData(null)}>Manter Atual</Button>
                                <Button onClick={handleReschedule} disabled={isBooking} className="bg-yellow-600 hover:bg-yellow-700 text-white">
                                    {isBooking && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Sim, Trocar Horário
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </TabsContent>

                {/* TAB 2: MINHAS CONSULTAS */}
                <TabsContent value="appointments" className="mt-6">
                    <ScrollArea className="h-[500px]">
                        <div className="space-y-4">
                            {myAppointments.length === 0 ? (
                                <p className="text-muted-foreground p-4">Você ainda não tem consultas agendadas.</p>
                            ) : myAppointments.map(appt => (
                                <Card key={appt.id} className="border-l-4 border-l-primary">
                                    <CardContent className="p-4 flex items-center justify-between">
                                        <div className="flex gap-4 items-center">
                                            <div className="bg-primary/10 p-3 rounded-full">
                                                <CalendarIcon className="w-6 h-6 text-primary" />
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-lg">{new Date(appt.date + 'T00:00:00').toLocaleDateString('pt-BR')} às {appt.time}</h4>
                                                <p className="text-sm text-muted-foreground">Dr. {appt.doctor} • <span className="capitalize">{appt.status === 'scheduled' ? 'Agendado' : appt.status}</span></p>
                                            </div>
                                        </div>
                                        {appt.meeting_link && appt.status === 'scheduled' ? (
                                            <Button className="bg-green-600 hover:bg-green-700" asChild>
                                                <a href={appt.meeting_link} target="_blank" rel="noreferrer">
                                                    <Video className="mr-2 h-4 w-4" /> Entrar na Sala
                                                </a>
                                            </Button>
                                        ) : (
                                            <Badge variant="secondary">Aguardando Link</Badge>
                                        )}
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </ScrollArea>
                </TabsContent>


            </Tabs>
        </div>
    );
}
