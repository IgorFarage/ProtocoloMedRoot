import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Clock, Save, Loader2, Plus, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import api from "@/lib/api";

interface AvailabilityRule {
    day_of_week: number;
    start_time: string;
    end_time: string;
    is_active: boolean; // Not strictly used per-interval in UI, but kept for model compatibility if needed. ideally active determined by existence in list
}

// Helper: Group rules by day
interface DaySchedule {
    dayOfWeek: number;
    isActive: boolean; // main switch for the day
    intervals: { start: string; end: string }[];
}

const DAYS = ["Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado", "Domingo"];

const DEFAULT_SCHEDULE: DaySchedule[] = DAYS.map((_, i) => ({
    dayOfWeek: i,
    isActive: i < 5, // Mon-Fri default active
    intervals: i < 5 ? [{ start: "09:00", end: "17:00" }] : []
}));

export default function DoctorAvailability() {
    const navigate = useNavigate();
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // State is now based on DaySchedule (UI friendly) rather than raw rules
    const [schedule, setSchedule] = useState<DaySchedule[]>(DEFAULT_SCHEDULE);

    useEffect(() => {
        const fetchAvailability = async () => {
            try {
                const res = await api.get('/medical/doctor/availability/');
                const data: AvailabilityRule[] = res.data;

                if (data && data.length > 0) {
                    // Transform backend rules (flat list) to UI schedule (grouped by day)
                    const newSchedule = DAYS.map((_, dayIndex) => {
                        const dayRules = data.filter(r => r.day_of_week === dayIndex && r.is_active);

                        // Sort by start time
                        dayRules.sort((a, b) => a.start_time.localeCompare(b.start_time));

                        return {
                            dayOfWeek: dayIndex,
                            isActive: dayRules.length > 0,
                            intervals: dayRules.length > 0
                                ? dayRules.map(r => ({
                                    start: r.start_time.substring(0, 5),
                                    end: r.end_time.substring(0, 5)
                                }))
                                : []
                        };
                    });
                    setSchedule(newSchedule);
                }
            } catch (error) {
                console.error("Erro ao carregar disponibilidade", error);
            } finally {
                setLoading(false);
            }
        };
        fetchAvailability();
    }, []);

    const handleToggleDay = (dayIndex: number) => {
        setSchedule(prev => prev.map((day, i) => {
            if (i !== dayIndex) return day;
            const newActive = !day.isActive;
            return {
                ...day,
                isActive: newActive,
                // If activating and no intervals, add default
                intervals: newActive && day.intervals.length === 0 ? [{ start: "09:00", end: "17:00" }] : day.intervals
            };
        }));
    };

    const handleAddInterval = (dayIndex: number) => {
        setSchedule(prev => prev.map((day, i) => {
            if (i !== dayIndex) return day;
            return {
                ...day,
                intervals: [...day.intervals, { start: "14:00", end: "18:00" }] // Default new interval
            };
        }));
    };

    const handleRemoveInterval = (dayIndex: number, intervalIndex: number) => {
        setSchedule(prev => prev.map((day, i) => {
            if (i !== dayIndex) return day;
            const newIntervals = day.intervals.filter((_, idx) => idx !== intervalIndex);
            return {
                ...day,
                intervals: newIntervals,
                isActive: newIntervals.length > 0 // Auto deactivate if no intervals? Or keep active but empty? Let's allow empty active (translates to no slots)
            };
        }));
    };

    const handleChangeTime = (dayIndex: number, intervalIndex: number, field: 'start' | 'end', value: string) => {
        setSchedule(prev => prev.map((day, i) => {
            if (i !== dayIndex) return day;
            const newIntervals = [...day.intervals];
            newIntervals[intervalIndex] = { ...newIntervals[intervalIndex], [field]: value };
            return { ...day, intervals: newIntervals };
        }));
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            // Flatten UI schedule back to API rules
            const payload: any[] = [];

            schedule.forEach(day => {
                if (day.isActive) {
                    day.intervals.forEach(interval => {
                        payload.push({
                            day_of_week: day.dayOfWeek,
                            start_time: interval.start + ":00",
                            end_time: interval.end + ":00",
                            is_active: true
                        });
                    });
                }
            });

            // Note: Backend handles "replace all" if we send a list. 
            // If day is inactive or has no intervals, no rules are sent for that day, effectively clearing it.

            await api.post('/medical/doctor/availability/', payload);

            toast({
                title: "Salvo com sucesso!",
                description: "Sua disponibilidade foi atualizada."
            });
        } catch (error) {
            console.error(error);
            toast({
                variant: "destructive",
                title: "Erro ao salvar",
                description: "Não foi possível atualizar sua agenda."
            });
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return <div className="flex justify-center p-12"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>;
    }

    return (
        <div className="container mx-auto px-4 py-8 max-w-4xl">
            <div className="flex items-center gap-4 mb-8">
                <Button variant="ghost" size="icon" onClick={() => navigate("/DoctorDashboard")}>
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                <div>
                    <h1 className="text-3xl font-bold">Gerenciar Disponibilidade</h1>
                    <p className="text-muted-foreground">Defina seus turnos de atendimento para cada dia.</p>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Clock className="h-5 w-5 text-primary" />
                        Horários de Atendimento
                    </CardTitle>
                    <CardDescription>
                        Adicione múltiplos intervalos (ex: Manhã e Tarde) para um gerenciamento preciso.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {schedule.map((day, dayIndex) => (
                        <div key={dayIndex} className="p-4 border rounded-lg bg-card transition-all">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-4">
                                    <Switch
                                        checked={day.isActive}
                                        onCheckedChange={() => handleToggleDay(dayIndex)}
                                    />
                                    <Label className={`text-base font-semibold w-32 ${day.isActive ? 'text-foreground' : 'text-muted-foreground'}`}>
                                        {DAYS[day.dayOfWeek]}
                                    </Label>
                                </div>
                                {day.isActive && (
                                    <Button variant="ghost" size="sm" onClick={() => handleAddInterval(dayIndex)} className="text-primary hover:text-primary/80">
                                        <Plus className="h-4 w-4 mr-1" /> Adicionar Turno
                                    </Button>
                                )}
                            </div>

                            {day.isActive ? (
                                <div className="space-y-3 pl-0 sm:pl-14">
                                    {day.intervals.length === 0 && (
                                        <p className="text-sm text-yellow-600 italic">Nenhum horário definido (Dia ficará sem vagas)</p>
                                    )}
                                    {day.intervals.map((interval, intervalIndex) => (
                                        <div key={intervalIndex} className="flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
                                            <div className="flex items-center gap-2">
                                                <Input
                                                    type="time"
                                                    value={interval.start}
                                                    onChange={(e) => handleChangeTime(dayIndex, intervalIndex, 'start', e.target.value)}
                                                    className="w-28"
                                                />
                                                <span className="text-muted-foreground">-</span>
                                                <Input
                                                    type="time"
                                                    value={interval.end}
                                                    onChange={(e) => handleChangeTime(dayIndex, intervalIndex, 'end', e.target.value)}
                                                    className="w-28"
                                                />
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="text-muted-foreground hover:text-destructive h-9 w-9"
                                                onClick={() => handleRemoveInterval(dayIndex, intervalIndex)}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="pl-14 text-sm text-muted-foreground italic">
                                    Não atende neste dia
                                </div>
                            )}
                        </div>
                    ))}
                </CardContent>
            </Card>

            <div className="flex justify-end mt-6 pb-20">
                <Button size="lg" onClick={handleSave} disabled={saving} className="gap-2">
                    {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                    <Save className="h-4 w-4" />
                    Salvar alterações
                </Button>
            </div>
        </div>
    );
}
