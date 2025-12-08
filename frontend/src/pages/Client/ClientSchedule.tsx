import { useState } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Calendar as CalendarIcon, Clock, User, Video, CheckCircle2 } from "lucide-react";
import { format, addDays, setHours, setMinutes, isWeekend, isBefore, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";

// ===============================================
// TIPOS E INTERFACES
// ===============================================

interface Appointment {
    id: string;
    date: Date;
    time: string;
    doctorName: string;
    consultationType: string;
    status: "confirmed" | "pending";
}

// ===============================================
// DADOS MOCK - Agendamentos Existentes
// ===============================================

const mockAppointments: Appointment[] = [
    {
        id: "1",
        date: addDays(new Date(), 7),
        time: "09:00",
        doctorName: "Dr. Protótipo Silva",
        consultationType: "Teleconsulta",
        status: "confirmed",
    },
    {
        id: "2",
        date: addDays(new Date(), 40),
        time: "14:30",
        doctorName: "Dr. Protótipo Silva",
        consultationType: "Teleconsulta",
        status: "confirmed",
    },
];

// ===============================================
// FUNÇÕES AUXILIARES
// ===============================================

// Gera os horários disponíveis (08:00 - 18:00, intervalo de 30 min)
const generateTimeSlots = (): string[] => {
    const slots: string[] = [];
    for (let hour = 8; hour < 18; hour++) {
        slots.push(`${hour.toString().padStart(2, "0")}:00`);
        slots.push(`${hour.toString().padStart(2, "0")}:30`);
    }
    return slots;
};

// Verifica se uma data é válida para agendamento
const isDateDisabled = (date: Date): boolean => {
    const today = startOfDay(new Date());
    return isBefore(date, today) || isWeekend(date);
};

// ===============================================
// COMPONENTE PRINCIPAL
// ===============================================

const ClientSchedule = () => {
    const { toast } = useToast();
    const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
    const [selectedTime, setSelectedTime] = useState<string | undefined>(undefined);
    const [appointments, setAppointments] = useState<Appointment[]>(mockAppointments);

    const timeSlots = generateTimeSlots();

    // Handler para confirmar agendamento
    const handleConfirmAppointment = () => {
        if (!selectedDate || !selectedTime) return;

        const newAppointment: Appointment = {
            id: Date.now().toString(),
            date: selectedDate,
            time: selectedTime,
            doctorName: "Dr. Protótipo Silva",
            consultationType: "Teleconsulta",
            status: "pending",
        };

        setAppointments([...appointments, newAppointment].sort((a, b) => a.date.getTime() - b.date.getTime()));

        toast({
            title: "Agendamento Confirmado!",
            description: `Consulta marcada para ${format(selectedDate, "dd/MM/yyyy", { locale: ptBR })} às ${selectedTime}.`,
            duration: 5000,
        });

        // Reset seleções
        setSelectedDate(undefined);
        setSelectedTime(undefined);
    };

    // Handler para cancelar agendamento
    const handleCancelAppointment = (id: string) => {
        setAppointments(appointments.filter((appointment) => appointment.id !== id));
        toast({
            title: "Consulta Cancelada",
            description: "O agendamento foi removido com sucesso.",
            variant: "destructive",
        });
    };

    // Verifica se o botão de confirmação deve estar ativo
    const isConfirmDisabled = !selectedDate || !selectedTime;

    return (
        <div className="container mx-auto px-4 py-8 space-y-8">
            {/* Header */}
            <header className="space-y-2">
                <h1 className="text-3xl font-bold flex items-center gap-2">
                    <CalendarIcon className="h-8 w-8 text-primary" />
                    Agendamentos
                </h1>
                <p className="text-lg text-muted-foreground">
                    Gerencie suas consultas e marque novos atendimentos com facilidade.
                </p>
            </header>

            <Separator />

            {/* Layout de Duas Colunas */}
            <div className="grid gap-6 lg:grid-cols-2">
                {/* COLUNA ESQUERDA: Novo Agendamento */}
                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Marcar Nova Consulta</CardTitle>
                            <CardDescription>Selecione a data e o horário desejados</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {/* Calendário */}
                            <div className="flex justify-center">
                                <Calendar
                                    mode="single"
                                    selected={selectedDate}
                                    onSelect={setSelectedDate}
                                    disabled={isDateDisabled}
                                    locale={ptBR}
                                    className="rounded-md border"
                                />
                            </div>

                            {/* Seleção de Horário */}
                            {selectedDate && (
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2">
                                        <Clock className="h-4 w-4 text-muted-foreground" />
                                        <h3 className="text-sm font-semibold">
                                            Horários disponíveis para {format(selectedDate, "dd/MM/yyyy", { locale: ptBR })}
                                        </h3>
                                    </div>
                                    <div className="grid grid-cols-4 gap-2">
                                        {timeSlots.map((time) => (
                                            <Button
                                                key={time}
                                                variant={selectedTime === time ? "default" : "outline"}
                                                size="sm"
                                                onClick={() => setSelectedTime(time)}
                                                className="text-xs"
                                            >
                                                {time}
                                            </Button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Botão de Confirmação */}
                            <Button
                                onClick={handleConfirmAppointment}
                                disabled={isConfirmDisabled}
                                className="w-full"
                                size="lg"
                            >
                                <CheckCircle2 className="h-5 w-5 mr-2" />
                                Confirmar Agendamento
                            </Button>

                            {/* Informações Selecionadas */}
                            {(selectedDate || selectedTime) && (
                                <div className="bg-muted/50 p-4 rounded-lg space-y-2">
                                    <h4 className="text-sm font-semibold text-muted-foreground">Resumo da seleção:</h4>
                                    {selectedDate && (
                                        <p className="text-sm flex items-center gap-2">
                                            <CalendarIcon className="h-4 w-4" />
                                            <strong>Data:</strong> {format(selectedDate, "dd/MM/yyyy", { locale: ptBR })}
                                        </p>
                                    )}
                                    {selectedTime && (
                                        <p className="text-sm flex items-center gap-2">
                                            <Clock className="h-4 w-4" />
                                            <strong>Horário:</strong> {selectedTime}
                                        </p>
                                    )}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* COLUNA DIREITA: Lista de Agendamentos */}
                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Minhas consultas agendadas</CardTitle>
                            <CardDescription>
                                Você tem {appointments.length} consulta{appointments.length !== 1 ? "s" : ""} marcada
                                {appointments.length !== 1 ? "s" : ""}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {appointments.length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground">
                                    <CalendarIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
                                    <p>Nenhum agendamento encontrado.</p>
                                    <p className="text-sm">Marque sua primeira consulta ao lado!</p>
                                </div>
                            ) : (
                                appointments.map((appointment) => (
                                    <Card key={appointment.id} className="border-l-4 border-l-primary">
                                        <CardContent className="pt-6 space-y-3">
                                            {/* Data e Horário */}
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <CalendarIcon className="h-5 w-5 text-primary" />
                                                    <div>
                                                        <p className="font-semibold">
                                                            {format(appointment.date, "dd/MM/yyyy", { locale: ptBR })}
                                                        </p>
                                                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                                                            <Clock className="h-3 w-3" />
                                                            {appointment.time}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div
                                                    className={`px-3 py-1 rounded-full text-xs font-semibold ${appointment.status === "confirmed"
                                                        ? "bg-green-100 text-green-700"
                                                        : "bg-yellow-100 text-yellow-700"
                                                        }`}
                                                >
                                                    {appointment.status === "confirmed" ? "Confirmado" : "Pendente"}
                                                </div>
                                            </div>

                                            <Separator />

                                            {/* Informações do Médico */}
                                            <div className="flex items-center gap-2 text-sm">
                                                <User className="h-4 w-4 text-muted-foreground" />
                                                <span className="font-medium">{appointment.doctorName}</span>
                                            </div>

                                            {/* Tipo de Consulta */}
                                            <div className="flex items-center gap-2 text-sm">
                                                <Video className="h-4 w-4 text-muted-foreground" />
                                                <span>{appointment.consultationType}</span>
                                            </div>

                                            {/* Ações */}
                                            <div className="flex gap-2 pt-2">
                                                <Button
                                                    variant="destructive"
                                                    size="sm"
                                                    className="flex-1"
                                                    onClick={() => handleCancelAppointment(appointment.id)}
                                                >
                                                    Cancelar
                                                </Button>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default ClientSchedule;
