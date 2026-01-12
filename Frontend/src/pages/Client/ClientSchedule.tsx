import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useClientData } from "@/hooks/useClientData";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Calendar as CalendarIcon, ClipboardList, ShoppingBag, Camera, Upload, Clock, CheckCircle, Video } from "lucide-react";
import api from "@/lib/api";
import { ptBR } from "date-fns/locale";

interface Appointment {
    id: number;
    date: string;
    time: string;
    doctor: string;
    status: 'scheduled' | 'completed' | 'cancelled';
    meeting_link?: string;
}

export default function ClientSchedule() {
    const { loading: loadingData, fullHistory, calculateProtocol } = useClientData();
    const { toast } = useToast();

    // State para Agendamento
    const [date, setDate] = useState<Date | undefined>(new Date());
    const [slots, setSlots] = useState<string[]>([]);
    const [loadingSlots, setLoadingSlots] = useState(false);
    const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
    const [isBooking, setIsBooking] = useState(false);

    // State para Lista de Consultas
    const [myAppointments, setMyAppointments] = useState<Appointment[]>([]);
    const [loadingAppts, setLoadingAppts] = useState(false);

    // Fetch Slots quando data muda
    useEffect(() => {
        if (date) {
            const fetchSlots = async () => {
                setLoadingSlots(true);
                try {
                    const dateStr = date.toISOString().split('T')[0];
                    const res = await api.get(`/medical/slots/?date=${dateStr}`);
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
    }, [date]);

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
                time: selectedSlot
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

        } catch (error) {
            toast({
                title: "Erro no agendamento",
                description: "Não foi possível reservar este horário. Tente outro.",
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
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Agenda Médica</h1>
                <p className="text-muted-foreground mt-2">
                    Agende suas consultas e acompanhe seu histórico.
                </p>
            </div>

            <Tabs defaultValue="schedule" className="w-full">
                <TabsList className="grid w-full grid-cols-2 lg:w-[400px]">
                    <TabsTrigger value="schedule">Agendar</TabsTrigger>
                    <TabsTrigger value="appointments">Minhas Consultas</TabsTrigger>
                </TabsList>

                {/* TAB 1: AGENDAR */}
                <TabsContent value="schedule" className="mt-6">
                    <div className="grid md:grid-cols-12 gap-6">
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
                                    <div className="text-center py-8 text-muted-foreground">
                                        Nenhum horário disponível para esta data.
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    {/* Dialog de Confirmação */}
                    <Dialog open={!!selectedSlot} onOpenChange={(open) => !open && setSelectedSlot(null)}>
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
                                <p className="text-sm text-slate-500">Com Dr. Especialista</p>
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
