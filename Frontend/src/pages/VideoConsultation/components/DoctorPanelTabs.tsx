import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FileText, ClipboardList, Pill, Microscope, Loader2, Save } from 'lucide-react';
import { PrescriptionDragAndDrop } from './PrescriptionDragAndDrop';
import { ExamRequestForm } from './ExamRequestForm';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';

const formSchema = z.object({
    evolution: z.string().min(10, {
        message: "O prontuário deve conter no mínimo 10 caracteres.",
    }),
});

export function DoctorPanelTabs() {
    const { toast } = useToast();
    const [isSaving, setIsSaving] = useState(false);

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            evolution: "",
        },
    });

    async function onSubmit(values: z.infer<typeof formSchema>) {
        setIsSaving(true);
        // Simulating API call
        await new Promise((resolve) => setTimeout(resolve, 1500));
        console.log(values);
        setIsSaving(false);

        toast({
            title: "Prontuário salvo!",
            description: "A evolução clínica foi registrada com sucesso no histórico do paciente.",
            variant: "default", // or "success" if configured in the project's shadcn theme
        });
    }

    return (
        <div className="flex flex-col h-full">
            <Tabs defaultValue="prontuario" className="w-full flex-1 flex flex-col">
                <div className="px-6 py-4 border-b">
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

                <ScrollArea className="flex-1 w-full bg-slate-50/50">
                    <div className="p-6 h-full">
                        <TabsContent value="historico" className="mt-0 h-full">
                            <div className="flex flex-col gap-4">
                                <h2 className="text-lg font-semibold text-slate-800">Histórico do Paciente</h2>
                                <div className="text-sm text-slate-500 italic">Nenhum prontuário anterior encontrado.</div>
                                {/* Aqui entrará uma lista de cards com resumo das consultas */}
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
                                                            Salvar Prontuário
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
                                <PrescriptionDragAndDrop />
                            </div>
                        </TabsContent>

                        <TabsContent value="exames" className="mt-0 h-full">
                            <div className="flex flex-col gap-4 h-full">
                                <h2 className="text-lg font-semibold text-slate-800">Pedido de Exames</h2>
                                <ExamRequestForm />
                            </div>
                        </TabsContent>
                    </div>
                </ScrollArea>
            </Tabs>
        </div>
    );
}
