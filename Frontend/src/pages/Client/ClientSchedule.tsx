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
import { Loader2, Calendar as CalendarIcon, ClipboardList, ShoppingBag, Camera, Upload, Clock, CheckCircle, Video, ArrowLeft, Copy, CreditCard as CreditCardIcon, Lock } from "lucide-react";
import api from "@/lib/api";
import { ptBR } from "date-fns/locale";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Appointment {
    id: number;
    date: string;
    time: string;
    doctor: string;
    doctor_name: string;
    doctor_specialty?: string;
    doctor_photo?: string;
    status: 'scheduled' | 'completed' | 'cancelled' | 'waiting_payment';
    meeting_link?: string;
}

// --- Payment Helpers ---
const formatCardNumber = (value: string) => {
    const v = value.replace(/\D/g, "").substring(0, 16);
    const parts = [];
    for (let i = 0; i < v.length; i += 4) {
        parts.push(v.substring(i, i + 4));
    }
    return parts.join(" ");
};

const formatCPF = (value: string) => {
    return value
        .replace(/\D/g, '') // substitui qualquer caracter que nao seja numero por nada
        .replace(/(\d{3})(\d)/, '$1.$2') // captura 2 grupos de numero o primeiro de 3 e o segundo de 1, apos capturar o primeiro grupo ele adiciona um ponto antes do segundo grupo de numero
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d{1,2})/, '$1-$2')
        .replace(/(-\d{2})\d+?$/, '$1'); // captura 2 numeros seguidos de um traço e não deixa ser digitado mais nada
};

const formatExpiry = (value: string) => {
    const v = value.replace(/\D/g, "").substring(0, 4);
    if (v.length >= 2) {
        return `${v.substring(0, 2)}/${v.substring(2)}`;
    }
    return v;
};

const validateCard = (number: string) => {
    // Simple Luhn Algorithm
    const s = number.replace(/\D/g, "");
    if (s.length < 13) return false; // Min length

    // [DEV] Bypass for common test cards (Asaas SandBox often uses 4444...)
    if (/^4+$/.test(s) || /^1+$/.test(s)) return true;

    let sum = 0;
    let shouldDouble = false;
    for (let i = s.length - 1; i >= 0; i--) {
        let digit = parseInt(s.charAt(i));
        if (shouldDouble) {
            if ((digit *= 2) > 9) digit -= 9;
        }
        sum += digit;
        shouldDouble = !shouldDouble;
    }
    return (sum % 10) === 0;
};

export default function ClientSchedule() {
    const navigate = useNavigate();
    const { loading: loadingData, profile, calculateProtocol } = useClientData() as any;
    const { toast } = useToast();

    // Payment State
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [paymentData, setPaymentData] = useState<any>(null);
    const [paymentMethod, setPaymentMethod] = useState<'PIX' | 'CREDIT_CARD'>('PIX');
    const [cardData, setCardData] = useState({
        holderName: '',
        number: '',
        expiry: '', // Combined MM/YY
        ccv: '',
        cpf: '' // Added CPF for holder info if needed
    });
    const [cardErrors, setCardErrors] = useState({
        number: '',
        expiry: '',
        ccv: '',
        holderName: ''
    });

    // Eligibility State
    type EligibilityData = {
        is_free: boolean;
        days_remaining: number;
        price: number;
        message: string;
        last_appointment_date?: string;
        active_appointment?: {
            id: number;
            date: string;
            time: string;
        };
    } | null;
    const [eligibility, setEligibility] = useState<EligibilityData>(null);
    const [loadingEligibility, setLoadingEligibility] = useState(false);
    const [showEligibilityModal, setShowEligibilityModal] = useState(false);

    // State para Agendamento
    const [date, setDate] = useState<Date | undefined>(new Date());
    const [slots, setSlots] = useState<string[]>([]);
    const [loadingSlots, setLoadingSlots] = useState(false);
    const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
    const [isBooking, setIsBooking] = useState(false);
    const [bookingSuccess, setBookingSuccess] = useState(false);

    const [conflictData, setConflictData] = useState<any>(null);

    // State para Lista de Consultas
    const [myAppointments, setMyAppointments] = useState<Appointment[]>([]);
    const [loadingAppts, setLoadingAppts] = useState(false);
    const [cancelApptId, setCancelApptId] = useState<number | null>(null);
    const [isCancelling, setIsCancelling] = useState(false);

    const handleCancelAppointment = async () => {
        if (!cancelApptId) return;
        setIsCancelling(true);
        try {
            const res = await api.post(`/medical/appointments/${cancelApptId}/cancel/`);
            toast({
                title: "Consulta Cancelada",
                description: res.data.message || "A consulta foi cancelada com sucesso.",
                className: "bg-green-600 text-white"
            });
            fetchAppointments();
            setCancelApptId(null);
        } catch (error: any) {
            toast({
                title: "Erro ao cancelar",
                description: error.response?.data?.error || "Ocorreu um erro ao cancelar.",
                variant: "destructive"
            });
        } finally {
            setIsCancelling(false);
        }
    };

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

    // Check Eligibility when slot is selected
    const handleSlotSelect = async (slot: string) => {
        setSelectedSlot(slot);
        if (!selectedDoctorId) return;

        setLoadingEligibility(true);
        try {
            const res = await api.get(`/medical/appointments/check-eligibility/?doctor_id=${selectedDoctorId}`);
            setEligibility(res.data);
            setShowEligibilityModal(true);
        } catch (error) {
            console.error("Erro ao verificar elegibilidade", error);
            // Fallback: Proceed without eligibility info (backend will handle)
            setEligibility(null);
            setShowEligibilityModal(true);
        } finally {
            setLoadingEligibility(false);
        }
    };

    const handleBook = async () => {
        if (!date || !selectedSlot) return;

        // Validation for Credit Card
        if (paymentMethod === 'CREDIT_CARD') {
            const errors: any = {};
            const cleanNumber = cardData.number.replace(/\D/g, "");
            console.log(`🔍 Validating Card: ${cleanNumber.substring(0, 4)}... (Length: ${cleanNumber.length})`);

            if (!validateCard(cardData.number)) {
                console.error("❌ Luhn Validation Failed for:", cleanNumber);
                errors.number = "Número de cartão inválido.";
            }
            if (cardData.holderName.length < 3) errors.holderName = "Nome inválido.";
            if (cardData.ccv.length < 3) errors.ccv = "CVV inválido.";
            if (cardData.expiry.length !== 5) errors.expiry = "Validade inválida.";

            if (Object.keys(errors).length > 0) {
                console.error("🔴 Validation Errors:", errors);
                toast({
                    title: "Erro na Validação",
                    description: Object.values(errors).join("\n"),
                    variant: "destructive"
                });
                setCardErrors(errors);
                return;
            }
        }

        setIsBooking(true);
        // setShowEligibilityModal(false); // Removed to keep modal open for success/error feedback

        try {
            const dateStr = date.toISOString().split('T')[0];

            const payload: any = {
                date: dateStr,
                time: selectedSlot,
                doctor_id: selectedDoctorId,
                payment_method: paymentMethod,
                idempotency_key: crypto.randomUUID()
            };

            if (paymentMethod === 'CREDIT_CARD') {
                const [month, year] = cardData.expiry.split('/');
                payload.cardData = {
                    ...cardData,
                    number: cardData.number.replace(/\D/g, ""),
                    expiryMonth: month,
                    expiryYear: year,
                    holderInfo: {
                        name: cardData.holderName,
                        email: profile?.email || "cliente@email.com",
                        cpfCnpj: cardData.cpf || "00000000000",
                        postalCode: "22775040",
                        addressNumber: "100",
                        phone: profile?.phone || "21999999999"
                    }
                };
            }

            const response = await api.post('/medical/appointments/', payload);

            if (response.data.success) {
                toast({
                    title: "Agendamento Realizado!",
                    description: response.data.message || "Sua consulta foi agendada.",
                    className: "bg-green-600 text-white"
                });
                fetchAppointments();
                setBookingSuccess(true);
                setSlots(prev => prev.filter(s => s !== selectedSlot));
            }
            else if (response.data.payment_required) {
                if (response.data.pix_data) {
                    setPaymentData(response.data.pix_data);
                    setIsPaymentModalOpen(true);
                    toast({
                        title: "Aguardando Pagamento Pix",
                        description: "Utilize o QR Code para pagar.",
                    });
                } else {
                    // Credit Card - Processing
                    toast({
                        title: "Processando Pagamento",
                        description: response.data.message || "Aguardando confirmação da operadora.",
                        className: "bg-blue-600 text-white"
                    });
                    setBookingSuccess(true);
                }
            } else {
                throw new Error(response.data.error || "Erro desconhecido.");
            }

        } catch (error: any) {
            console.error("Erro no agendamento:", error);
            const errorMsg = error.response?.data?.error || error.message || "Erro ao agendar.";

            if (errorMsg.includes("concorrência")) {
                setCardErrors(prev => ({ ...prev, general: "Horário disputado! Tente novamente em alguns segundos." }));
            } else {
                setCardErrors(prev => ({ ...prev, general: errorMsg }));
            }

            toast({
                variant: "destructive",
                title: "Falha no Agendamento",
                description: errorMsg,
            });
        } finally {
            setIsBooking(false);
        }
    };

    const handleReschedule = async () => {
        if (!date || !selectedSlot) return;

        // Fix: Use eligibility data instead of deprecated conflictData
        const existingId = eligibility?.active_appointment?.id;

        if (!existingId) {
            toast({
                title: "Erro",
                description: "Agendamento original não encontrado.",
                variant: "destructive"
            });
            return;
        }

        setIsBooking(true);
        try {
            const dateStr = date.toISOString().split('T')[0];
            await api.post(`/medical/appointments/${existingId}/reschedule/`, {
                date: dateStr,
                time: selectedSlot
            });

            toast({
                title: "Reagendamento Confirmado!",
                description: `Sua consulta foi alterada para dia ${date.toLocaleDateString()} às ${selectedSlot}.`,
                className: "bg-green-600 text-white"
            });

            setSelectedSlot(null);
            // setConflictData(null); // Deprecated
            setEligibility(null); // Clear eligibility
            fetchAppointments();
            setSlots(prev => prev.filter(s => s !== selectedSlot));
            setShowEligibilityModal(false); // Close modal
        } catch (error: any) {
            console.error("Erro reschedule:", error);
            toast({
                title: "Erro ao reagendar",
                description: error.response?.data?.error || "Não foi possível realizar a troca.",
                variant: "destructive"
            });
        } finally {
            setIsBooking(false);
        }
    };

    // Check if reschedule is allowed for a given appointment date
    const canReschedule = (apptDateStr: string, apptTimeStr: string) => {
        const apptDate = new Date(`${apptDateStr}T${apptTimeStr}:00`);
        const now = new Date();
        const diffHours = (apptDate.getTime() - now.getTime()) / (1000 * 60 * 60);
        return diffHours >= 24;
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

                {/* Dialog de Cancelamento */}
                <Dialog open={!!cancelApptId} onOpenChange={(open) => !open && setCancelApptId(null)}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Cancelar Consulta</DialogTitle>
                            <DialogDescription>
                                Tem certeza que deseja cancelar esta consulta?
                                Caso exista um pagamento confirmado atrelado, o estorno será solicitado automaticamente à sua operadora de cartão de crédito ou conta Pix.
                                Esse processo pode levar de alguns minutos a algumas faturas.
                            </DialogDescription>
                        </DialogHeader>
                        <DialogFooter className="mt-4 gap-2 sm:gap-0">
                            <Button variant="outline" onClick={() => setCancelApptId(null)} disabled={isCancelling}>
                                Voltar
                            </Button>
                            <Button variant="destructive" onClick={handleCancelAppointment} disabled={isCancelling}>
                                {isCancelling ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                Sim, Cancelar Consulta
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Dialog de Pix Payment */}
                <Dialog open={isPaymentModalOpen} onOpenChange={setIsPaymentModalOpen}>
                    <DialogContent className="sm:max-w-[400px]">
                        <DialogHeader>
                            <DialogTitle>Pagamento via Pix</DialogTitle>
                            <DialogDescription>
                                Realize o pagamento de <strong>R$ {paymentData?.price?.toFixed(2)}</strong> para confirmar seu agendamento.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="flex flex-col items-center gap-4 py-4">
                            {paymentData?.qr_code_base64 && (
                                <img
                                    src={`data:image/jpeg;base64,${paymentData.qr_code_base64}`}
                                    alt="Pix QR Code"
                                    className="w-48 h-48 sm:w-56 sm:h-56 border rounded-lg"
                                />
                            )}

                            <div className="w-full space-y-2">
                                <Label className="text-sm font-medium">Pix Copia e Cola</Label>
                                <div className="flex gap-2">
                                    <Input
                                        readOnly
                                        value={paymentData?.qr_code || ''}
                                        className="font-mono text-xs h-9 bg-gray-50"
                                    />
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        className="shrink-0"
                                        onClick={() => {
                                            navigator.clipboard.writeText(paymentData?.qr_code || '');
                                            toast({ title: "Copiado!", duration: 2000 });
                                        }}
                                    >
                                        <Copy className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        </div>

                        <DialogFooter>
                            <Button
                                className="w-full bg-green-600 hover:bg-green-700 text-white"
                                onClick={() => {
                                    setIsPaymentModalOpen(false);
                                    fetchAppointments();
                                    toast({
                                        title: "Pagamento em processamento",
                                        description: "Assim que confirmado, sua consulta aparecerá como 'Agendado'."
                                    });
                                }}
                            >
                                Já realizei o pagamento
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

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
                                                onClick={() => handleSlotSelect(slot)}
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

                    {/* Smart Eligibility Dialog */}
                    <Dialog open={!!selectedSlot && showEligibilityModal && !conflictData} onOpenChange={(open) => {
                        if (!open) {
                            setShowEligibilityModal(false);
                            setSelectedSlot(null);
                        }
                    }}>
                        <DialogContent className="sm:max-w-[500px]">
                            <DialogHeader>
                                <DialogTitle className="flex items-center gap-2">
                                    {bookingSuccess ? (
                                        <span className="text-green-600 flex items-center gap-2">
                                            <CheckCircle className="w-6 h-6" />
                                            Agendamento Confirmado!
                                        </span>
                                    ) : eligibility?.is_free ? (
                                        <span className="text-green-600 flex items-center gap-2">
                                            <CheckCircle className="w-6 h-6" />
                                            Confirmação de Agendamento
                                        </span>
                                    ) : (
                                        <span className="text-blue-600 flex items-center gap-2">
                                            <ShoppingBag className="w-6 h-6" />
                                            Confirmação de Pagamento
                                        </span>
                                    )}
                                </DialogTitle>
                                <DialogDescription className="pt-2 text-base">
                                    {bookingSuccess
                                        ? "Sua consulta foi agendada com sucesso. Você receberá os detalhes por e-mail."
                                        : eligibility?.message}
                                </DialogDescription>
                            </DialogHeader>

                            {bookingSuccess ? (
                                <div className="py-8 flex flex-col items-center justify-center space-y-4 animate-in fade-in zoom-in duration-300">
                                    <div className="bg-green-100 p-4 rounded-full">
                                        <CheckCircle className="w-12 h-12 text-green-600" />
                                    </div>
                                    <p className="text-center text-slate-600 max-w-xs">
                                        Obrigado! Sua consulta está confirmada para <strong>{date?.toLocaleDateString('pt-BR')} às {selectedSlot}</strong>.
                                    </p>
                                    <Button onClick={() => {
                                        setBookingSuccess(false);
                                        setSelectedSlot(null);
                                        setPaymentMethod('PIX');
                                        setCardData({ ...cardData, number: '', holderName: '', ccv: '' }); // Clear sensitive data
                                    }} className="w-full bg-green-600 hover:bg-green-700 mt-4">
                                        Entendido, fechar
                                    </Button>
                                </div>
                            ) : (
                                <>

                                    {/* Active Appointment Alert */}
                                    {eligibility?.active_appointment?.id && (
                                        <div className="bg-white p-4 rounded-md border border-yellow-200 shadow-sm mb-2">
                                            <div className="flex items-start gap-3">
                                                <div className="bg-yellow-100 p-2 rounded-full">
                                                    <CalendarIcon className="w-5 h-5 text-yellow-700" />
                                                </div>
                                                <div className="flex-1">
                                                    <h4 className="font-semibold text-slate-800 text-sm">Você já tem uma consulta agendada</h4>
                                                    <p className="text-sm text-slate-500 mt-1">
                                                        Dia <strong>{new Date(eligibility.active_appointment.date + 'T00:00:00').toLocaleDateString('pt-BR')} às {eligibility.active_appointment.time}</strong>
                                                    </p>

                                                    {(() => {
                                                        const canResched = canReschedule(eligibility.active_appointment.date, eligibility.active_appointment.time);
                                                        return (
                                                            <>
                                                                {!canResched && (
                                                                    <div className="mt-2 p-2 bg-red-50 border border-red-100 rounded text-xs text-red-600 flex items-start gap-2">
                                                                        <div className="mt-0.5">⚠️</div>
                                                                        <span>
                                                                            Faltam menos de 24h para sua consulta.
                                                                            Para reagendar, entre em contato diretamente com o suporte.
                                                                        </span>
                                                                    </div>
                                                                )}

                                                                <Button
                                                                    variant="outline"
                                                                    className={`w-full mt-3 border-yellow-500 text-yellow-700 hover:bg-yellow-50 ${!canResched ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                                    onClick={handleReschedule}
                                                                    disabled={isBooking || !canResched}
                                                                >
                                                                    {isBooking ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Clock className="w-4 h-4 mr-2" />}
                                                                    Reagendar para {date?.toLocaleDateString('pt-BR')} às {selectedSlot}
                                                                </Button>
                                                            </>
                                                        );
                                                    })()}
                                                </div>
                                            </div>
                                            <div className="relative mt-4">
                                                <div className="absolute inset-0 flex items-center">
                                                    <span className="w-full border-t" />
                                                </div>
                                                <div className="relative flex justify-center text-xs uppercase">
                                                    <span className="bg-white px-2 text-muted-foreground">Ou agende uma nova</span>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    <div className="py-4 bg-slate-50 rounded-lg p-4 space-y-4">
                                        <div className="flex justify-between items-center border-b pb-2">
                                            <span className="text-sm text-muted-foreground">Especialista</span>
                                            <span className="font-medium text-slate-800">
                                                {profile?.medical_team?.trichologist?.id && String(selectedDoctorId) === String(profile.medical_team.trichologist.id) ? "Tricologia" : "Nutrição"}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center border-b pb-2">
                                            <span className="text-sm text-muted-foreground">Data e Hora</span>
                                            <span className="font-medium text-slate-800">{date?.toLocaleDateString('pt-BR')} às {selectedSlot}</span>
                                        </div>
                                        <div className="flex justify-between items-center pb-2">
                                            <span className="text-sm text-muted-foreground">Valor da Consulta</span>
                                            {eligibility?.is_free ? (
                                                <span className="font-bold text-green-600 text-lg">GRÁTIS</span>
                                            ) : (
                                                <span className="font-bold text-slate-800 text-lg">R$ {eligibility?.price?.toFixed(2)}</span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Payment Section for Paid Appointments */}
                                    {!eligibility?.is_free && (
                                        <div className="space-y-4 pt-2">
                                            <div className="flex items-center gap-2 justify-center">
                                                <Badge variant="outline" className={`cursor-pointer px-4 py-2 hover:bg-slate-100 ${paymentMethod === 'PIX' ? 'border-green-500 bg-green-50' : ''}`} onClick={() => setPaymentMethod('PIX')}>
                                                    <div className={`w-3 h-3 rounded-full mr-2 ${paymentMethod === 'PIX' ? 'bg-green-500' : 'bg-slate-300'}`} />
                                                    Pix
                                                </Badge>
                                                <Badge variant="outline" className={`cursor-pointer px-4 py-2 hover:bg-slate-100 ${paymentMethod === 'CREDIT_CARD' ? 'border-blue-500 bg-blue-50' : ''}`} onClick={() => setPaymentMethod('CREDIT_CARD')}>
                                                    <div className={`w-3 h-3 rounded-full mr-2 ${paymentMethod === 'CREDIT_CARD' ? 'bg-blue-500' : 'bg-slate-300'}`} />
                                                    Cartão de Crédito
                                                </Badge>
                                            </div>

                                            {paymentMethod === 'CREDIT_CARD' && (
                                                <div className="space-y-4 p-4 border rounded-lg bg-slate-50 animate-in slide-in-from-top-2">

                                                    {/* Card Holder */}
                                                    <div className="space-y-1">
                                                        <Label className="text-xs font-semibold text-slate-500 uppercase">Nome no Cartão</Label>
                                                        <Input
                                                            placeholder="COMO ESTA NO CARTAO"
                                                            value={cardData.holderName}
                                                            onChange={e => {
                                                                setCardData({ ...cardData, holderName: e.target.value.toUpperCase() });
                                                                setCardErrors({ ...cardErrors, holderName: '' });
                                                            }}
                                                            className={cardErrors.holderName ? "border-red-500 bg-red-50" : "bg-white"}
                                                        />
                                                        {cardErrors.holderName && <span className="text-xs text-red-500">{cardErrors.holderName}</span>}
                                                    </div>

                                                    {/* CPF Holder */}
                                                    <div className="space-y-1">
                                                        <Label className="text-xs font-semibold text-slate-500 uppercase">CPF do Titular</Label>
                                                        <Input
                                                            placeholder="000.000.000-00"
                                                            value={cardData.cpf || ''}
                                                            maxLength={14}
                                                            onChange={e => {
                                                                const formatted = formatCPF(e.target.value);
                                                                setCardData({ ...cardData, cpf: formatted });
                                                            }}
                                                            className="bg-white"
                                                        />
                                                    </div>

                                                    {/* Card Number */}
                                                    <div className="space-y-1">
                                                        <Label className="text-xs font-semibold text-slate-500 uppercase">Número do Cartão</Label>
                                                        <div className="relative">
                                                            <div className="absolute left-3 top-2.5">
                                                                <CreditCardIcon className="h-4 w-4 text-slate-400" />
                                                            </div>
                                                            <Input
                                                                placeholder="0000 0000 0000 0000"
                                                                value={cardData.number}
                                                                maxLength={19}
                                                                onChange={e => {
                                                                    const formatted = formatCardNumber(e.target.value);
                                                                    setCardData({ ...cardData, number: formatted });
                                                                    setCardErrors({ ...cardErrors, number: '' });
                                                                }}
                                                                className={`pl-9 bg-white font-mono ${cardErrors.number ? "border-red-500 bg-red-50" : ""}`}
                                                            />
                                                        </div>
                                                        {cardErrors.number && <span className="text-xs text-red-500">{cardErrors.number}</span>}
                                                    </div>

                                                    <div className="grid grid-cols-2 gap-4">
                                                        {/* Expiry */}
                                                        <div className="space-y-1">
                                                            <Label className="text-xs font-semibold text-slate-500 uppercase">Validade</Label>
                                                            <Input
                                                                placeholder="MM/AA"
                                                                value={cardData.expiry}
                                                                maxLength={5}
                                                                onChange={e => {
                                                                    const formatted = formatExpiry(e.target.value);
                                                                    setCardData({ ...cardData, expiry: formatted });
                                                                    setCardErrors({ ...cardErrors, expiry: '' });
                                                                }}
                                                                className={`bg-white text-center ${cardErrors.expiry ? "border-red-500 bg-red-50" : ""}`}
                                                            />
                                                            {cardErrors.expiry && <span className="text-xs text-red-500">{cardErrors.expiry}</span>}
                                                        </div>

                                                        {/* CVV */}
                                                        <div className="space-y-1">
                                                            <Label className="text-xs font-semibold text-slate-500 uppercase">CVV</Label>
                                                            <div className="relative">
                                                                <Input
                                                                    type="password"
                                                                    placeholder="123"
                                                                    maxLength={4}
                                                                    value={cardData.ccv}
                                                                    onChange={e => {
                                                                        const v = e.target.value.replace(/\D/g, "");
                                                                        setCardData({ ...cardData, ccv: v });
                                                                        setCardErrors({ ...cardErrors, ccv: '' });
                                                                    }}
                                                                    className={`bg-white text-center ${cardErrors.ccv ? "border-red-500 bg-red-50" : ""}`}
                                                                />
                                                                <div className="absolute right-3 top-2.5 text-slate-400 group-hover:text-slate-600 cursor-help" title="Código de segurança de 3 ou 4 dígitos no verso do cartão.">
                                                                    <div className="w-4 h-4 rounded-full border border-current flex items-center justify-center text-[10px] font-bold">?</div>
                                                                </div>
                                                            </div>
                                                            {cardErrors.ccv && <span className="text-xs text-red-500">{cardErrors.ccv}</span>}
                                                        </div>
                                                    </div>

                                                    <div className="pt-2 flex items-center gap-2 text-xs text-slate-400 justify-center">
                                                        <Lock className="w-3 h-3" />
                                                        Pagamento processado com segurança via Asaas
                                                    </div>
                                                </div>
                                            )}

                                        </div>
                                    )}

                                    <DialogFooter className="mt-4 gap-2 sm:gap-0">
                                        <Button variant="ghost" onClick={() => { setShowEligibilityModal(false); setSelectedSlot(null); }}>Cancelar</Button>
                                        <Button onClick={handleBook} disabled={isBooking} className={eligibility?.is_free ? "bg-green-600 hover:bg-green-700" : "bg-blue-600 hover:bg-blue-700"}>
                                            {isBooking && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                            {eligibility?.is_free ? "Confirmar Agendamento" : `Pagar e Confirmar`}
                                        </Button>
                                    </DialogFooter>
                                </>
                            )}
                        </DialogContent>
                    </Dialog>

                    {/* Dialog de Conflito Mensal (Reagendamento Lógico) */}
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
                                    <br />
                                    <span className="text-xs text-muted-foreground block mt-2">
                                        * Reagendamentos permitidos apenas com 24h de antecedência.
                                    </span>
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
                    <div className="rounded-md bg-blue-50 p-4 mb-4 flex gap-3 text-sm text-blue-700 border border-blue-100">
                        <Clock className="w-5 h-5 shrink-0" />
                        <p>
                            Reagendamentos e cancelamentos são permitidos apenas com <strong>24 horas de antecedência</strong>.
                            Em caso de imprevistos de última hora, entre em contato com o suporte.
                        </p>
                    </div>

                    <ScrollArea className="h-[500px]">
                        <div className="space-y-4">
                            {myAppointments.length === 0 ? (
                                <p className="text-muted-foreground p-4">Você ainda não tem consultas agendadas.</p>
                            ) : (() => {
                                const now = new Date();
                                const active: typeof myAppointments = [];
                                const inactive: typeof myAppointments = [];

                                myAppointments.forEach(appt => {
                                    const apptDate = new Date(`${appt.date}T${appt.time}:00`);
                                    const isPast = apptDate < now;

                                    if (!isPast && (appt.status === 'scheduled' || appt.status === 'waiting_payment')) {
                                        active.push(appt);
                                    } else {
                                        inactive.push(appt);
                                    }
                                });

                                // Ativas: crescentes (mais próxima primeiro)
                                active.sort((a, b) => new Date(`${a.date}T${a.time}:00`).getTime() - new Date(`${b.date}T${b.time}:00`).getTime());
                                // Inativas: decrescentes (mais recentes que passaram primeiro)
                                inactive.sort((a, b) => new Date(`${b.date}T${b.time}:00`).getTime() - new Date(`${a.date}T${a.time}:00`).getTime());

                                return [...active, ...inactive].map(appt => (
                                    <Card key={appt.id} className={`border-l-4 ${active.includes(appt) ? 'border-l-primary' : 'border-l-slate-300 opacity-75'}`}>
                                        <CardContent className="p-4 flex items-center justify-between">
                                            <div className="flex gap-4 items-center">
                                                <div className="bg-primary/10 p-3 rounded-full hidden sm:block">
                                                    <CalendarIcon className="w-6 h-6 text-primary" />
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <Avatar className="h-10 w-10 border border-slate-200">
                                                        <AvatarImage src={appt.doctor_photo} />
                                                        <AvatarFallback className="bg-slate-100 text-slate-500">DR</AvatarFallback>
                                                    </Avatar>
                                                    <div>
                                                        <div className="flex flex-col gap-0.5">
                                                            <h4 className="font-bold text-lg leading-tight text-slate-900">
                                                                {new Date(appt.date + 'T00:00:00').toLocaleDateString('pt-BR')} <span className="text-muted-foreground font-normal text-sm">às</span> {appt.time}
                                                            </h4>

                                                            {/* Status Badge Logic */}
                                                            <div className="flex flex-wrap items-center gap-2 mt-1">
                                                                {(() => {
                                                                    const apptDate = new Date(`${appt.date}T${appt.time}:00`);
                                                                    const now = new Date();
                                                                    const isPast = apptDate < now;

                                                                    let label: string = appt.status;
                                                                    let style = "bg-slate-100 text-slate-700";

                                                                    if (appt.status === 'scheduled') {
                                                                        if (isPast) {
                                                                            label = 'Realizada'; // Or 'Expirada' depending on business rule
                                                                            style = "bg-blue-100 text-blue-700 border border-blue-200";
                                                                        } else {
                                                                            label = 'Agendado';
                                                                            style = "bg-green-100 text-green-700 border border-green-200";
                                                                        }
                                                                    } else if (appt.status === 'waiting_payment') {
                                                                        if (isPast) {
                                                                            label = 'Expirada';
                                                                            style = "bg-slate-100 text-slate-500 border border-slate-200 line-through";
                                                                        } else {
                                                                            label = 'Aguardando Pagamento';
                                                                            style = "bg-yellow-100 text-yellow-800 border border-yellow-200";
                                                                        }
                                                                    } else if (appt.status === 'cancelled') {
                                                                        label = 'Cancelado';
                                                                        style = "bg-red-50 text-red-700 border border-red-100";
                                                                    } else if (appt.status === 'completed') {
                                                                        label = 'Realizada';
                                                                        style = "bg-blue-100 text-blue-700 border border-blue-200";
                                                                    }

                                                                    return (
                                                                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${style}`}>
                                                                            {label}
                                                                        </span>
                                                                    );
                                                                })()}

                                                                <span className="text-xs text-muted-foreground hidden sm:inline">•</span>
                                                                <span className="text-xs text-muted-foreground">{appt.doctor_specialty || "Especialista"}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex flex-col gap-2 items-end">
                                                {appt.meeting_link && appt.status === 'scheduled' && (
                                                    <Button className="bg-green-600 hover:bg-green-700 w-full md:w-auto" asChild>
                                                        <a href={appt.meeting_link} target="_blank" rel="noreferrer">
                                                            <Video className="mr-2 h-4 w-4" /> Entrar na Sala
                                                        </a>
                                                    </Button>
                                                )}
                                                {(() => {
                                                    const apptDate = new Date(`${appt.date}T${appt.time}:00`);
                                                    const now = new Date();
                                                    const canCancel = (apptDate.getTime() - now.getTime()) >= 24 * 3600 * 1000;

                                                    if ((appt.status === 'scheduled' || appt.status === 'waiting_payment') && canCancel) {
                                                        return (
                                                            <Button
                                                                variant="outline"
                                                                className="w-full md:w-auto border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                                                                onClick={() => setCancelApptId(appt.id)}
                                                            >
                                                                Cancelar
                                                            </Button>
                                                        );
                                                    }
                                                    return null;
                                                })()}
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))
                            })()}
                        </div>
                    </ScrollArea>
                </TabsContent>
            </Tabs>
        </div>
    );
}
