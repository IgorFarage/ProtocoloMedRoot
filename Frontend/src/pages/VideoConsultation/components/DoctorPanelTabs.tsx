import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FileText, ClipboardList, Pill, Microscope, Loader2, Save, Calendar, Activity } from 'lucide-react';
import { PrescriptionDragAndDrop } from './PrescriptionDragAndDrop';
import { ExamRequestForm } from './ExamRequestForm';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { useState, useEffect } from 'react';
import { medicalService, PatientDetails } from '@/services/medicalService';
import { Badge } from '@/components/ui/badge';

const formSchema = z.object({
    evolution: z.string().min(10, {
        message: "O prontuário deve conter no mínimo 10 caracteres.",
    }),
});

interface DoctorPanelTabsProps {
    patientId?: string;
    appointmentId?: string;
    doctorName?: string;
    doctorCrm?: string;
}

export function DoctorPanelTabs({ patientId, appointmentId, doctorName, doctorCrm }: DoctorPanelTabsProps) {
    const { toast } = useToast();
    const [isSaving, setIsSaving] = useState(false);
    const [hasSavedNotes, setHasSavedNotes] = useState(false);

    // Medical History State
    const [patientData, setPatientData] = useState<PatientDetails | null>(null);
    const [isLoadingHistory, setIsLoadingHistory] = useState(false);

    useEffect(() => {
        if (!patientId) return;

        const fetchHistory = async () => {
            setIsLoadingHistory(true);
            try {
                const data = await medicalService.getPatientDetails(patientId);
                setPatientData(data);
            } catch (error) {
                console.error("Erro ao buscar histórico do paciente:", error);
                toast({
                    title: "Erro no Histórico",
                    description: "Não foi possível carregar os dados anteriores do paciente.",
                    variant: "destructive",
                });
            } finally {
                setIsLoadingHistory(false);
            }
        };

        fetchHistory();
    }, [patientId, toast]);

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            evolution: "",
        },
    });

    async function onSubmit(values: z.infer<typeof formSchema>) {
        if (!appointmentId) {
            toast({
                title: "Erro ao salvar",
                description: "Não foi possível identificar a consulta atual. Tente recarregar a página.",
                variant: "destructive",
            });
            return;
        }

        setIsSaving(true);
        try {
            await medicalService.saveClinicalNotes(appointmentId, values.evolution);
            setHasSavedNotes(true);
            toast({
                title: hasSavedNotes ? "Prontuário atualizado!" : "Prontuário salvo!",
                description: "A evolução clínica foi registrada com sucesso nesta consulta.",
            });
        } catch (error: any) {
            console.error("Erro ao salvar prontuário", error);
            toast({
                title: "Erro",
                description: "Ocorreu um erro ao salvar o prontuário. Tente novamente.",
                variant: "destructive",
            });
        } finally {
            setIsSaving(false);
        }
    }

    return (
        <div className="flex flex-col h-full overflow-hidden">
            <Tabs defaultValue="prontuario" className="w-full flex-1 flex flex-col h-full overflow-hidden">
                <div className="px-6 py-4 border-b shrink-0">
                    <TabsList className="w-full justify-start gap-2 bg-transparent h-auto p-0 border-b border-transparent">
                        <TabsTrigger
                            value="historico"
                            className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary border border-transparent data-[state=active]:border-primary/20 rounded-md px-4 py-2 flex gap-2 items-center"
                        >
                            <ClipboardList className="w-4 h-4" /> Histórico
                        </TabsTrigger>
                        <TabsTrigger
                            value="prontuario"
                            className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary border border-transparent data-[state=active]:border-primary/20 rounded-md px-4 py-2 flex gap-2 items-center"
                        >
                            <FileText className="w-4 h-4" /> Prontuário Atual
                        </TabsTrigger>
                        <TabsTrigger
                            value="receituario"
                            className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary border border-transparent data-[state=active]:border-primary/20 rounded-md px-4 py-2 flex gap-2 items-center"
                        >
                            <Pill className="w-4 h-4" /> Receituário
                        </TabsTrigger>
                        <TabsTrigger
                            value="exames"
                            className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary border border-transparent data-[state=active]:border-primary/20 rounded-md px-4 py-2 flex gap-2 items-center"
                        >
                            <Microscope className="w-4 h-4" /> Exames
                        </TabsTrigger>
                    </TabsList>
                </div>

                <div className="flex-1 overflow-y-auto bg-slate-50/50">
                    <div className="p-6">
                        <TabsContent value="historico" className="mt-0 outline-none">
                            <div className="flex flex-col gap-6">

                                {/* Current Protocol / Medications Section */}
                                <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
                                    <h3 className="font-semibold text-slate-800 flex items-center gap-2 mb-3">
                                        <Activity className="w-4 h-4 text-blue-500" />
                                        Protocolo Ativo
                                    </h3>

                                    {isLoadingHistory ? (
                                        <div className="flex gap-2 animate-pulse">
                                            <div className="h-6 w-24 bg-slate-200 rounded-full"></div>
                                            <div className="h-6 w-32 bg-slate-200 rounded-full"></div>
                                        </div>
                                    ) : patientData ? (
                                        <div className="flex flex-col gap-2">
                                            <p className="text-sm font-medium text-slate-600">
                                                {patientData.currentProtocol.name || "Nenhum protocolo identificado"}
                                            </p>
                                            <div className="flex flex-wrap gap-2">
                                                {patientData.currentProtocol.medications.length > 0 ? (
                                                    patientData.currentProtocol.medications.map((med, idx) => (
                                                        <Badge key={idx} variant="secondary" className="bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200">
                                                            {med}
                                                        </Badge>
                                                    ))
                                                ) : (
                                                    <span className="text-sm text-slate-400 italic">Sem medicamentos listados.</span>
                                                )}
                                            </div>
                                        </div>
                                    ) : (
                                        <p className="text-sm text-slate-500">Dados não disponíveis.</p>
                                    )}
                                </div>

                                {/* Past Appointments Section */}
                                <div>
                                    <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                                        <Calendar className="w-5 h-5 text-slate-500" />
                                        Consultas Anteriores
                                    </h3>

                                    {isLoadingHistory ? (
                                        <div className="flex flex-col gap-3">
                                            {[1, 2].map(i => (
                                                <div key={i} className="h-32 bg-slate-200 animate-pulse rounded-lg"></div>
                                            ))}
                                        </div>
                                    ) : patientData?.past_appointments && patientData.past_appointments.length > 0 ? (
                                        <div className="flex flex-col gap-4">
                                            {patientData.past_appointments.map(appt => (
                                                <div key={appt.id} className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm flex flex-col gap-3">
                                                    <div className="flex justify-between items-start border-b pb-2">
                                                        <div>
                                                            <p className="font-semibold text-slate-800">{appt.date}</p>
                                                            <p className="text-xs text-slate-500">Com Dr(a). {appt.doctor_name}</p>
                                                        </div>
                                                        <Badge variant="outline" className="text-slate-500">Finalizada</Badge>
                                                    </div>

                                                    <div className="text-sm text-slate-600">
                                                        <span className="font-medium text-slate-700 block mb-1">Evolução:</span>
                                                        {appt.clinical_notes ? (
                                                            <p className="whitespace-pre-wrap">{appt.clinical_notes}</p>
                                                        ) : (
                                                            <p className="italic text-slate-400">Sem anotações clínicas registradas.</p>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-sm text-slate-500 italic p-4 bg-slate-50 rounded border border-dashed text-center">
                                            Nenhum prontuário anterior encontrado para este paciente.
                                        </div>
                                    )}
                                </div>
                            </div>
                        </TabsContent>

                        <TabsContent value="prontuario" className="mt-0 h-full">
                            <div className="flex flex-col gap-4 h-full">
                                <div className="flex items-center justify-between">
                                    <h2 className="text-lg font-semibold text-slate-800">Evolução Clínica</h2>
                                </div>
                                <div className="flex-1 flex flex-col border border-slate-200 rounded-md bg-white p-4 shadow-sm">
                                    <Form {...form}>
                                        <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col h-full gap-4">
                                            <FormField
                                                control={form.control}
                                                name="evolution"
                                                render={({ field }) => (
                                                    <FormItem className="flex-1 flex flex-col">
                                                        <FormControl>
                                                            <Textarea
                                                                placeholder="Digite a evolução clínica do paciente detalhadamente..."
                                                                className="flex-1 resize-none border-0 focus-visible:ring-0 p-0 text-base"
                                                                {...field}
                                                            />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                            <div className="flex justify-end border-t pt-4">
                                                <Button type="submit" disabled={isSaving}>
                                                    {isSaving ? (
                                                        <>
                                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                            Salvando...
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Save className="mr-2 h-4 w-4" />
                                                            {hasSavedNotes ? "Atualizar Prontuário" : "Salvar Prontuário"}
                                                        </>
                                                    )}
                                                </Button>
                                            </div>
                                        </form>
                                    </Form>
                                </div>
                            </div>
                        </TabsContent>

                        <TabsContent value="receituario" className="mt-0 h-full">
                            <div className="flex flex-col gap-4 h-full">
                                <h2 className="text-lg font-semibold text-slate-800">Prescrição Médica</h2>
                                <PrescriptionDragAndDrop
                                    appointmentId={appointmentId}
                                    patientName={patientData?.name}
                                    doctorName={doctorName}
                                    doctorCrm={doctorCrm}
                                />
                            </div>
                        </TabsContent>

                        <TabsContent value="exames" className="mt-0 h-full">
                            <div className="flex flex-col gap-4 h-full">
                                <h2 className="text-lg font-semibold text-slate-800">Pedido de Exames</h2>
                                <ExamRequestForm
                                    appointmentId={appointmentId}
                                    patientName={patientData?.name}
                                    doctorName={doctorName}
                                    doctorCrm={doctorCrm}
                                />
                            </div>
                        </TabsContent>
                    </div>
                </div>
            </Tabs>
        </div>
    );
}
