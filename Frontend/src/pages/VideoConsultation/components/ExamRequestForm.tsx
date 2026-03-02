import React, { useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Microscope, Printer } from 'lucide-react';
import { useReactToPrint } from 'react-to-print';
import { PrintableExamRequest } from './PrintableExamRequest';

const examSchema = z.object({
    clinicalIndication: z.string().min(3, {
        message: "A indicação clínica é obrigatória.",
    }),
    requestedExams: z.string().min(3, {
        message: "Especifique ao menos um exame.",
    }),
});

type ExamFormValues = z.infer<typeof examSchema>;

export function ExamRequestForm() {
    const printRef = useRef<HTMLDivElement>(null);

    const form = useForm<ExamFormValues>({
        resolver: zodResolver(examSchema),
        defaultValues: {
            clinicalIndication: "",
            requestedExams: "",
        },
    });

    const values = form.watch();

    const handlePrint = useReactToPrint({
        contentRef: printRef,
        documentTitle: `Pedido_Exame`,
        fonts: [
            {
                family: 'Inter',
                source: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap'
            }
        ]
    });

    // We do not need a traditional submit, since it just prints a PDF
    function onSubmit(data: ExamFormValues) {
        if (handlePrint) {
            handlePrint();
        }
    }

    // Trigger Print without form validation block if they want to print empty (optional, but requestedExams min 3 forces it)
    const onGeneratePDFClick = () => {
        form.handleSubmit(onSubmit)();
    };

    return (
        <div className="flex flex-col h-full bg-white border border-slate-200 shadow-sm rounded-lg relative overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center gap-2">
                <Microscope className="w-5 h-5 text-primary" />
                <h3 className="font-semibold text-slate-800">Formulário de Solicitação</h3>
            </div>

            <div className="p-6 flex-1 overflow-y-auto">
                <Form {...form}>
                    <form className="flex flex-col gap-6">
                        <FormField
                            control={form.control}
                            name="clinicalIndication"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-slate-700 font-semibold">Indicação Clínica</FormLabel>
                                    <FormControl>
                                        <Textarea
                                            placeholder="Descreva a hipótese diagnóstica ou justificativa para os exames..."
                                            className="resize-none min-h-[80px]"
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="requestedExams"
                            render={({ field }) => (
                                <FormItem className="flex-1 flex flex-col">
                                    <FormLabel className="text-slate-700 font-semibold">Exames Solicitados</FormLabel>
                                    <FormControl>
                                        <Textarea
                                            placeholder="Ex: Hemograma completo, Glicemia em Jejum..."
                                            className="resize-none flex-1 min-h-[200px]"
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </form>
                </Form>
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end">
                <Button onClick={onGeneratePDFClick} className="shadow-sm">
                    <Printer className="w-4 h-4 mr-2" />
                    Gerar Pedido PDF
                </Button>
            </div>

            {/* Print Container (Hidden) */}
            <div className="hidden">
                <PrintableExamRequest
                    ref={printRef}
                    clinicalIndication={values.clinicalIndication}
                    requestedExams={values.requestedExams}
                // Se houvesse o nome real do paciente no estado do VideoConsultation poderíamos injetar. 
                // O boilerplate da prop opcional usa uma linha em branco.
                />
            </div>
        </div>
    );
}
