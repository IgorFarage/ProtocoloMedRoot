import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Clock, User, FileText, Video, Lock, Unlock, ArrowLeft } from "lucide-react";
import { ptBR } from "date-fns/locale";

import api from "@/lib/api";

interface Appointment {
    id: string;
    time: string;
    date: string;
    patientId: string;
    patientName: string;
    type: string;
    status: string;
}

interface TimeSlot {
    time: string;
    status: "available" | "blocked" | "booked";
    appointmentId?: string;
}

const generateTimeSlots = (appointments: Appointment[], date: Date): TimeSlot[] => {
    const slots: TimeSlot[] = [];
    const dateStr = date.toISOString().split('T')[0];

    // Filter appointments for this date
    const dayAppointments = appointments.filter(a => a.date === dateStr);

    for (let hour = 8; hour < 18; hour++) {
        for (let minute of [0, 30]) {
            const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;

            // Check if booked
            const appointment = dayAppointments.find(a => a.time === time);

            slots.push({
                time,
                status: appointment ? "booked" : "available",
                appointmentId: appointment?.id
            });
        }
    }
    return slots;
};

const DoctorSchedule = () => {
    const navigate = useNavigate();
    const [date, setDate] = useState<Date | undefined>(new Date());
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchAppointments();
    }, []);

    useEffect(() => {
        if (date) {
            setTimeSlots(generateTimeSlots(appointments, date));
        }
    }, [date, appointments]);

    const fetchAppointments = async () => {
        setLoading(true);
        try {
            const res = await api.get('/medical/appointments/');
            // Backend returns: { id, date, time, patient_name, doctor_name, status, meeting_link }
            // Mapeia para interface Appointment local
            const mapped = res.data.map((a: any) => ({
                id: a.id,
                time: a.time,
                date: a.date, // Backend sends YYYY-MM-DD
                patientId: "0", // Não temos o ID do user fácil aqui se o backend não mandou, mas temos o appt ID
                patientName: a.patient_name,
                type: "Consulta", // Backend não manda tipo ainda
                status: a.status === 'scheduled' ? 'Confirmado' : a.status === 'completed' ? 'Realizado' : 'Cancelado'
            }));
            setAppointments(mapped);
        } catch (error) {
            console.error("Erro ao buscar agendamentos", error);
        } finally {
            setLoading(false);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case "Confirmado":
                return "bg-green-100 text-green-800";
            case "Pendente":
                return "bg-yellow-100 text-yellow-800";
            case "Cancelado":
                return "bg-red-100 text-red-800";
            default:
                return "bg-gray-100 text-gray-800";
        }
    };

    const getTypeColor = (type: string) => {
        return "bg-blue-100 text-blue-800";
    };

    const getSlotStatusColor = (status: string) => {
        switch (status) {
            case "available":
                return "bg-green-100 border-green-300 shadow-sm";
            case "blocked":
                return "bg-red-50 border-red-200";
            case "booked":
                return "bg-blue-100 border-blue-400 shadow-sm";
            default:
                return "bg-gray-50 border-gray-200";
        }
    };

    // Block slot removed (Not implemented backend side yet)


    return (

        <div className="container mx-auto px-4 py-8">
            {/* Header */}
            <div className="mb-8 flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => navigate("/DoctorDashboard")}>
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                <div>
                    <h1 className="text-3xl font-bold">Agenda médica</h1>
                    <p className="text-muted-foreground">Gerencie suas consultas e horários</p>
                </div>
            </div>
            {/* Statistics Cards */}
            <div className="grid md:grid-cols-3 gap-4 mt-6">
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Total do dia</p>
                                <p className="text-2xl font-bold">{appointments.length}</p>
                            </div>
                            <Clock className="h-8 w-8 text-muted-foreground" />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Confirmados</p>
                                <p className="text-2xl font-bold text-green-600">
                                    {appointments.filter(a => a.status === "Confirmado").length}
                                </p>
                            </div>
                            <User className="h-8 w-8 text-green-600" />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Pendentes</p>
                                <p className="text-2xl font-bold text-yellow-600">
                                    {appointments.filter(a => a.status === "Pendente").length}
                                </p>
                            </div>
                            <Clock className="h-8 w-8 text-yellow-600" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Layout */}
            <div className="grid lg:grid-cols-4 gap-6">
                {/* Calendar Column */}
                <Card className="lg:col-span-1">
                    <CardHeader>
                        <CardTitle>Calendário</CardTitle>
                    </CardHeader>
                    <CardContent className="flex justify-center">
                        <Calendar
                            mode="single"
                            selected={date}
                            onSelect={setDate}
                            locale={ptBR}
                            className="rounded-md border"
                        />
                    </CardContent>
                </Card>

                {/* Main Content - 3 columns */}
                <div className="lg:col-span-3 space-y-6">
                    {/* Time Slots Section */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Clock className="h-5 w-5 text-primary" />
                                Horários do dia
                            </CardTitle>
                            <p className="text-sm text-muted-foreground">
                                {date ? date.toLocaleDateString("pt-BR", { weekday: "long", year: "numeric", month: "long", day: "numeric" }) : "Selecione uma data"}
                            </p>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                                {timeSlots.map((slot) => {
                                    const appointment = slot.appointmentId
                                        ? appointments.find(a => a.id === slot.appointmentId)
                                        : null;

                                    return (
                                        <div
                                            key={slot.time}
                                            className={`border rounded-lg p-3 ${getSlotStatusColor(slot.status)}`}
                                        >
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="font-semibold text-sm">{slot.time}</span>
                                                {slot.status === "available" && <Unlock className="h-3 w-3 text-green-700" />}
                                                {slot.status === "blocked" && <Lock className="h-3 w-3 text-red-600" />}
                                                {slot.status === "booked" && <User className="h-3 w-3 text-blue-700" />}
                                            </div>

                                            {slot.status === "booked" && appointment ? (
                                                <div className="text-xs text-muted-foreground mb-2">
                                                    {appointment.patientName}
                                                </div>
                                            ) : (
                                                <div className="text-xs text-muted-foreground mb-2">
                                                    {slot.status === "available" ? "Disponível" : "Bloqueado"}
                                                </div>
                                            )}

                                            {/*
                                            {slot.status !== "booked" && (
                                                <Button
                                                    size="sm"
                                                    variant={slot.status === "available" ? "destructive" : "default"}
                                                    className="w-full text-xs h-7"
                                                    onClick={() => handleToggleSlot(slot.time)}
                                                >
                                                    {slot.status === "available" ? "Bloquear" : "Abrir"}
                                                </Button>
                                            )}
                                            */}
                                        </div>
                                    );
                                })}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Appointments List */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Clock className="h-5 w-5 text-primary" />
                                Consultas agendadas
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {appointments.filter(a => date && a.date === date.toISOString().split('T')[0]).length > 0 ? (
                                    appointments.filter(a => date && a.date === date.toISOString().split('T')[0]).map((appointment) => (
                                        <div
                                            key={appointment.id}
                                            className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                                        >
                                            <div className="flex items-start justify-between">
                                                <div className="space-y-3 flex-1">
                                                    {/* Time and Patient */}
                                                    <div className="flex items-center gap-3">
                                                        <div className="flex items-center gap-2 text-lg font-semibold">
                                                            <Clock className="h-4 w-4 text-muted-foreground" />
                                                            {appointment.time}
                                                        </div>
                                                        <Separator orientation="vertical" className="h-6" />
                                                        <div className="flex items-center gap-2">
                                                            <User className="h-4 w-4 text-muted-foreground" />
                                                            <span className="font-medium">{appointment.patientName}</span>
                                                        </div>
                                                    </div>

                                                    {/* Badges */}
                                                    <div className="flex gap-2">
                                                        <Badge variant="outline" className={getTypeColor(appointment.type)}>
                                                            {appointment.type}
                                                        </Badge>
                                                        <Badge variant="outline" className={getStatusColor(appointment.status)}>
                                                            {appointment.status}
                                                        </Badge>
                                                    </div>
                                                </div>

                                                {/* Actions */}
                                                <div className="flex gap-2">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => navigate(`/medico/paciente/${appointment.patientId}`)}
                                                        className="gap-2"
                                                    >
                                                        <FileText className="h-4 w-4" />
                                                        Ver prontuário
                                                    </Button>
                                                    <Button
                                                        variant="default"
                                                        size="sm"
                                                        onClick={() => navigate(`/medico/teleconsulta/${appointment.patientId}`)}
                                                        className="gap-2"
                                                    >
                                                        <Video className="h-4 w-4" />
                                                        Iniciar teleconsulta
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center py-12 text-muted-foreground">
                                        <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                                        <p>Nenhuma consulta agendada para esta data</p>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>


        </div>
    );
};

export default DoctorSchedule;
